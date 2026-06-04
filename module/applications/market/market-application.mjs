import { createMarketEntry } from '../../lib/market/market-entry.mjs'
import { isItemVisibleForMarket } from '../../lib/market/market-visibility.mjs'
import { loadMarketCatalog } from '../../lib/market/catalog-loader.mjs'
import { validatePurchase } from '../../lib/market/purchase.mjs'
import {
  readMarketConfig,
  readMarketExcludedItems,
  readMarketGlobalPriceModifier,
  readMarketTypeModifiers,
  readMarketAllowBrokenItemSale,
  readMarketBrokenItemSaleMultiplier,
} from '../../lib/market/market-settings.mjs'
import { evaluateObtainability } from '../../lib/market/rarity-engine.mjs'
import { CONSEQUENCE_TYPES, evaluateMarketConsequences } from '../../lib/market/consequences.mjs'
import { serializeConsequence } from '../../lib/market/consequence-persistence.mjs'
import { PURCHASABLE_ITEM_TYPES, SOURCE_TYPES, DEFAULT_MARKET_CONTEXT, MARKET_TYPES, DEFAULT_MARKET_TYPE } from '../../config/market.mjs'
import { RESTRICTION_LEVELS } from '../../config/system.mjs'
import { RESTRICTED_RESTRICTION_LEVELS, BLACK_MARKET_AVAILABILITY_KEYS } from '../../lib/market/consequences.mjs'
import { loadCompendiumItems } from './compendium-source-adapter.mjs'
import NegotiationDialog from './negotiation-dialog.mjs'
import ConsequencesDialog from './consequences-dialog.mjs'
import AvailabilityCheckDialog from './availability-check-dialog.mjs'
import { resolveAvailabilityCheck } from '../../lib/market/availability-check.mjs'
import { computeCommerceOutcome } from '../../lib/market/commerce-outcomes.mjs'
import { logger } from '../../utils/logger.mjs'
import { validateSale } from '../../lib/market/sell-validation.mjs'
import { computeResalePrice } from '../../lib/market/sell-valuation.mjs'

const { api } = foundry.applications

/* -------------------------------------------- */

/**
 * @typedef {Object} MarketViewState
 * @property {string} search             Text search query (matches item name)
 * @property {string} filterType         Item type filter key, or '' for all types
 * @property {string} filterSource       Source type filter key, or '' for all sources
 * @property {string} filterRestriction  Restriction level filter key, or '' for all
 * @property {boolean} affordableOnly    When true, only items the buyer can afford are shown
 * @property {string} sortBy             Sort field key: 'name' | 'price' | 'rarity'
 * @property {'asc'|'desc'} sortDirection  Sort direction
 * @property {string} activeMarketType        Active market type key (key of MARKET_TYPES)
 * @property {'buy'|'sell'} mode              Current market mode: buy catalogue or sell inventory
 * @property {string} inventorySearch         Text search query for sell-mode inventory
 * @property {string} inventorySortBy         Sort field key for inventory: 'name' | 'basePrice' | 'resaleEstimate'
 * @property {'asc'|'desc'} inventorySortDirection  Sort direction for inventory
 */

/**
 * Canonical sort field keys for the Market catalogue.
 * @enum {string}
 */
const MARKET_SORT_FIELDS = Object.freeze({
  name: 'name',
  price: 'price',
  rarity: 'rarity',
})

/**
 * Canonical sort field keys for the sell-mode inventory.
 * Limited to fields meaningful for a seller's own inventory.
 * @enum {string}
 */
const INVENTORY_SORT_FIELDS = Object.freeze({
  name: 'name',
  basePrice: 'basePrice',
  resaleEstimate: 'resaleEstimate',
})

/**
 * Default view state for the Market catalogue.
 * @type {Readonly<MarketViewState>}
 */
const DEFAULT_VIEW_STATE = Object.freeze({
  search: '',
  filterType: '',
  filterSource: '',
  filterRestriction: '',
  affordableOnly: false,
  sortBy: MARKET_SORT_FIELDS.name,
  sortDirection: 'asc',
  activeMarketType: DEFAULT_MARKET_TYPE,
  mode: 'buy',
  inventorySearch: '',
  inventorySortBy: INVENTORY_SORT_FIELDS.name,
  inventorySortDirection: 'asc',
})

/* -------------------------------------------- */

/**
 * Extract the RawItem-shaped plain object from a Foundry Item document.
 * Maps Foundry document paths (item.system.*) to the shape expected by createMarketEntry.
 *
 * @param {Item} item  A Foundry Item document
 * @returns {import('../../lib/market/market-entry.mjs').RawItem}
 */
function itemToRawItem(item) {
  const system = item.system ?? {}
  return {
    uuid: item.uuid ?? '',
    name: item.name ?? '',
    img: item.img ?? '',
    type: item.type ?? '',
    // Read the schema source price (before prepareDerivedData overrides) so the Market engine
    // always receives the raw base price, not the post-derivation value.
    // This mirrors the pattern used by _prepareCredits() in character.mjs.
    basePrice: system._source?.price ?? system.price ?? 0,
    // Read the schema source rarity (same canonical fallback as price) so that world items and
    // compendium index entries (which expose the persisted value directly) are treated identically.
    // A world item with a prepareDerivedData override on rarity would otherwise diverge from the
    // compendium path, causing inconsistent sort, pips, availability and pricing.
    rarity: system._source?.rarity ?? system.rarity ?? 0,
    quality: system.quality ?? '',
    restrictionLevel: system.restrictionLevel ?? '',
    nonPurchasable: system.nonPurchasable === true,
    broken: system.broken === true,
  }
}

/* -------------------------------------------- */

/**
 * Apply text search to a list of MarketEntry items.
 * Case-insensitive match on the entry name.
 * @param {import('../../lib/market/market-entry.mjs').MarketEntry[]} entries
 * @param {string} search
 * @returns {import('../../lib/market/market-entry.mjs').MarketEntry[]}
 */
function filterBySearch(entries, search) {
  if (!search) return entries
  const needle = search.trim().toLowerCase()
  if (!needle) return entries
  return entries.filter((e) => e.name.toLowerCase().includes(needle))
}

/**
 * Apply filter criteria to a list of MarketEntry items.
 * Empty string for any criterion means "no filter on that field".
 * @param {import('../../lib/market/market-entry.mjs').MarketEntry[]} entries
 * @param {{ filterType: string, filterSource: string, filterRestriction: string }} filters
 * @returns {import('../../lib/market/market-entry.mjs').MarketEntry[]}
 */
function filterByFilters(entries, { filterType, filterSource, filterRestriction }) {
  return entries.filter((e) => {
    if (filterType && e.itemType !== filterType) return false
    if (filterSource && e.sourceType !== filterSource) return false
    if (filterRestriction && e.restrictionLevel !== filterRestriction) return false
    return true
  })
}

/**
 * Sort a list of MarketEntry items by the given field and direction.
 * Produces a new array — does not mutate the input.
 * @param {import('../../lib/market/market-entry.mjs').MarketEntry[]} entries
 * @param {string} sortBy        One of MARKET_SORT_FIELDS keys
 * @param {'asc'|'desc'} direction
 * @returns {import('../../lib/market/market-entry.mjs').MarketEntry[]}
 */
function sortEntries(entries, sortBy, direction) {
  const multiplier = direction === 'desc' ? -1 : 1
  return [...entries].sort((a, b) => {
    let cmp = 0
    if (sortBy === MARKET_SORT_FIELDS.name) {
      cmp = a.name.localeCompare(b.name)
    } else if (sortBy === MARKET_SORT_FIELDS.price) {
      cmp = a.priceResult.finalPrice - b.priceResult.finalPrice
    } else if (sortBy === MARKET_SORT_FIELDS.rarity) {
      cmp = a.rarity - b.rarity
    }
    return cmp * multiplier
  })
}

/* -------------------------------------------- */

/**
 * The Market application presents a read-only catalogue of World Items that are eligible for purchase.
 * Items are displayed as a single flat list sorted globally. Type, source, and restriction filters
 * allow navigation within the unified list.
 * The catalogue supports text search, type/source/restriction filters, and name/price/rarity sort.
 */
export default class MarketApplicationV2 extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    id: 'market',
    classes: ['swerpg', 'application', 'market'],
    tag: 'aside',
    window: {
      title: 'MARKET.Title',
      minimizable: true,
      resizable: true,
    },
    position: {
      width: 740,
      height: 600,
    },
    form: {
      // Market controls are UI-only view state — no document persistence needed.
      // submitOnChange=false keeps the default AppV2 form handling while still
      // routing form change events through _onChangeForm.
      submitOnChange: false,
    },
    actions: {
      openItem: MarketApplicationV2.#onOpenItem,
      resetCatalog: MarketApplicationV2.#onResetCatalog,
      resetInventory: MarketApplicationV2.#onResetInventory,
      buyItem: MarketApplicationV2.#onBuyItem,
      negotiateItem: MarketApplicationV2.#onNegotiateItem,
      toggleMode: MarketApplicationV2.#onToggleMode,
      sellItem: MarketApplicationV2.#onSellItem,
    },
  }

  /** @override */
  static PARTS = {
    catalog: {
      template: 'systems/swerpg/templates/market/market.hbs',
      scrollable: ['.market-catalog', '.market-inventory'],
    },
  }

  /* -------------------------------------------- */

  /**
   * Current UI view state: search query, active filters, sort field and direction.
   * Client-side only — not persisted.
   * @type {MarketViewState}
   */
  _viewState = { ...DEFAULT_VIEW_STATE }

  /**
   * Active buyer actor for this Market session. May be null when the Market
   * is opened without a specific buyer (catalogue-only / GM consultation).
   * @type {Actor|null}
   */
  _buyerActor = null

  /**
   * Local cache for the expensive base catalogue pipeline (world items + compendiums + loadMarketCatalog + visibility filter).
   * Keyed by activeMarketType. Null when the cache is cold or has been explicitly invalidated.
   * The light phase (search, filters, sort, canBuy annotation) always runs on every render and
   * never reads from this cache directly — it consumes `_catalogCache.entries`.
   * @type {{ marketType: string, entries: import('../../lib/market/market-entry.mjs').MarketEntry[] }|null}
   */
  _catalogCache = null

  /**
   * Debounced version of this.render() used for the search input to avoid firing a full render
   * on every keystroke. Initialised once per instance; delay matches other applications in the project.
   * @type {Function}
   */
  _debouncedRender = foundry.utils.debounce(() => this.render(), 250)

  /* -------------------------------------------- */

  /**
   * Set the active buyer actor for this Market session and re-render if already displayed.
   * Called by the system `openMarket(actor)` API entry point.
   * @param {Actor|null} actor
   */
  setBuyerActor(actor) {
    this._buyerActor = actor ?? null
    logger.debug('[Market] Buyer actor set', { actorId: actor?.id ?? null, actorName: actor?.name ?? null })
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    return context
  }

  /* -------------------------------------------- */

  /** @override */
  async _preparePartContext(partId, context) {
    const buyer = this._buyerActor
    const buyerCredits = buyer?.system?.creditBudget?.availableCredits ?? buyer?.system?.credits ?? null
    const mode = this._viewState.mode ?? 'buy'

    context.viewState = { ...this._viewState }
    context.mode = mode
    context.buyer = buyer
      ? {
          id: buyer.id,
          name: buyer.name,
          credits: buyerCredits,
          formattedCredits: buyerCredits !== null ? buyerCredits.toLocaleString() : '—',
        }
      : null

    if (partId === 'catalog') {
      if (mode === 'sell') {
        // Sell mode: only prepare the inventory branch — catalogue pipeline is not needed.
        context.catalog = null
        context.inventory = buyer ? this.#prepareInventory(buyer) : { items: [], isEmpty: true, isFilteredEmpty: false }
        context.inventorySortOptions = this.#buildInventorySortOptions()
      } else {
        // Buy mode (default): only prepare the catalogue branch — inventory is not needed.
        context.catalog = await this.#prepareCatalog(buyer, buyerCredits)
        context.sortOptions = this.#buildSortOptions()
        context.typeFilterOptions = this.#buildTypeFilterOptions()
        context.sourceFilterOptions = this.#buildSourceFilterOptions()
        context.restrictionFilterOptions = this.#buildRestrictionFilterOptions()
        context.marketTypeOptions = this.#buildMarketTypeOptions()
        context.inventory = null
        context.toolbarState = this.#buildToolbarState(buyer)
      }
    }

    return context
  }

  /* -------------------------------------------- */

  /**
   * Build the toolbar active-state view-model for the buy-mode toolbar.
   * Each property reflects whether the corresponding control deviates from its default value,
   * so the template can apply `.is-active` without inline logic.
   *
   * @param {Actor|null} buyer  The buyer actor (needed to determine affordableOnly activation).
   * @returns {{
   *   isSearchActive: boolean,
   *   isFilterTypeActive: boolean,
   *   isFilterSourceActive: boolean,
   *   isFilterRestrictionActive: boolean,
   *   isAffordableActive: boolean,
   *   isSortNonDefault: boolean,
   *   hasActiveFilters: boolean
   * }}
   */
  #buildToolbarState(buyer = null) {
    const { search, filterType, filterSource, filterRestriction, affordableOnly, sortBy, sortDirection } = this._viewState

    const isSearchActive = !!(search && search.trim())
    const isFilterTypeActive = !!filterType
    const isFilterSourceActive = !!filterSource
    const isFilterRestrictionActive = !!filterRestriction
    const isAffordableActive = affordableOnly === true && buyer !== null
    const isSortNonDefault = sortBy !== DEFAULT_VIEW_STATE.sortBy || sortDirection !== DEFAULT_VIEW_STATE.sortDirection

    const hasActiveFilters = isSearchActive || isFilterTypeActive || isFilterSourceActive || isFilterRestrictionActive || isAffordableActive

    return {
      isSearchActive,
      isFilterTypeActive,
      isFilterSourceActive,
      isFilterRestrictionActive,
      isAffordableActive,
      isSortNonDefault,
      hasActiveFilters,
    }
  }

  /* -------------------------------------------- */

  /**
   * Build the list of available sort options for the toolbar selector.
   * @returns {Array<{value: string, label: string}>}
   */
  #buildSortOptions() {
    return [
      { value: MARKET_SORT_FIELDS.name, label: 'MARKET.Toolbar.Sort.Name' },
      { value: MARKET_SORT_FIELDS.price, label: 'MARKET.Toolbar.Sort.Price' },
      { value: MARKET_SORT_FIELDS.rarity, label: 'MARKET.Toolbar.Sort.Rarity' },
    ]
  }

  /**
   * Build the list of available type filter options from PURCHASABLE_ITEM_TYPES.
   * First entry is the "all types" placeholder.
   * @returns {Array<{value: string, label: string}>}
   */
  #buildTypeFilterOptions() {
    const allOption = { value: '', label: 'MARKET.Toolbar.Filter.AllTypes' }
    const typeOptions = Object.entries(PURCHASABLE_ITEM_TYPES).map(([key, cfg]) => ({
      value: key,
      label: cfg.label,
    }))
    return [allOption, ...typeOptions]
  }

  /**
   * Build the list of available source filter options from SOURCE_TYPES.
   * First entry is the "all sources" placeholder.
   * @returns {Array<{value: string, label: string}>}
   */
  #buildSourceFilterOptions() {
    const allOption = { value: '', label: 'MARKET.Toolbar.Filter.AllSources' }
    const sourceOptions = Object.entries(SOURCE_TYPES).map(([key, cfg]) => ({
      value: key,
      label: cfg.label,
    }))
    return [allOption, ...sourceOptions]
  }

  /**
   * Build the list of restriction level filter options, adapted to the active market type.
   *
   * - standard/local: only the "All restrictions" option (all restricted items are hidden automatically)
   * - specialized: "All", "Legal only", "Restricted", "Military"
   * - black-market: "All", "Legal only", "Restricted", "Military", "Illegal"
   *
   * @returns {Array<{value: string, label: string}>}
   */
  #buildRestrictionFilterOptions() {
    const marketDef = MARKET_TYPES[this._viewState.activeMarketType] ?? MARKET_TYPES[DEFAULT_MARKET_TYPE]
    const allowedRestrictionLevels = marketDef.allowedRestrictionLevels ?? []

    const allOption = { value: '', label: 'MARKET.Toolbar.Filter.AllRestrictions' }

    // Standard/local: only 'none' is allowed — return just the "All" option since restricted items
    // are hidden automatically; the dropdown would be meaningless with only one filter choice.
    if (allowedRestrictionLevels.length === 1 && allowedRestrictionLevels[0] === 'none') {
      return [allOption]
    }

    // Wildcard ('*') means all restriction levels are allowed — expand to all known levels
    const levelsToShow = allowedRestrictionLevels.includes('*')
      ? Object.keys(RESTRICTION_LEVELS).filter((rl) => rl !== 'none')
      : allowedRestrictionLevels.filter((rl) => rl !== 'none' && rl !== '*')

    // Build restriction-level-specific options
    const restrictionOptions = levelsToShow.map((rl) => ({
      value: rl,
      label: RESTRICTION_LEVELS[rl]?.label ?? `MARKET.Restriction.${rl}`,
    }))

    // Prepend "Legal only" option when any restricted level is visible
    if (restrictionOptions.length > 0) {
      restrictionOptions.unshift({ value: 'none', label: 'MARKET.Restriction.LegalOnly' })
    }

    return [allOption, ...restrictionOptions]
  }

  /**
   * Build the list of market type selector options from MARKET_TYPES.
   * @returns {Array<{value: string, label: string, description: string, uiVariant: string}>}
   */
  #buildMarketTypeOptions() {
    return Object.entries(MARKET_TYPES).map(([key, def]) => ({
      value: key,
      label: def.label,
      description: def.description,
      uiVariant: def.uiVariant,
    }))
  }

  /**
   * Build the list of available sort options for the sell-mode inventory toolbar.
   * Limited to fields relevant to the seller's inventory: name, base price, resale estimate.
   * @returns {Array<{value: string, label: string}>}
   */
  #buildInventorySortOptions() {
    return [
      { value: INVENTORY_SORT_FIELDS.name, label: 'MARKET.Toolbar.Sort.Name' },
      { value: INVENTORY_SORT_FIELDS.basePrice, label: 'MARKET.Inventory.Toolbar.Sort.BasePrice' },
      { value: INVENTORY_SORT_FIELDS.resaleEstimate, label: 'MARKET.Inventory.Toolbar.Sort.ResaleEstimate' },
    ]
  }

  /* -------------------------------------------- */

  /**
   * Invalidate the local catalogue base cache.
   * Must be called whenever the content source changes: market type switch, explicit reset,
   * or any hook that modifies world items or compendium packs.
   */
  #invalidateCatalogCache() {
    this._catalogCache = null
    logger.debug('[Market] Catalog cache invalidated')
  }

  /**
   * Load the expensive base of the catalogue: world items, compendium items, domain loader,
   * and market-type visibility filter.
   * The result is cached per active market type so subsequent renders caused by search/filter/sort
   * changes do not re-read compendium indexes.
   *
   * @param {string} activeMarketType  The active market type key.
   * @returns {Promise<import('../../lib/market/market-entry.mjs').MarketEntry[]>}
   *   Visibility-filtered entries, ready for the light phase.
   */
  async #loadCatalogBase(activeMarketType) {
    // Return cached entries when the market type has not changed
    if (this._catalogCache !== null && this._catalogCache.marketType === activeMarketType) {
      logger.debug('[Market] Catalog cache hit', { marketType: activeMarketType })
      return this._catalogCache.entries
    }

    logger.debug('[Market] Catalog cache miss — loading base', { marketType: activeMarketType })

    const marketContext = { ...DEFAULT_MARKET_CONTEXT, marketType: activeMarketType }
    const marketConfig = readMarketConfig('swerpg')
    const excludedIds = readMarketExcludedItems('swerpg')
    const globalModifier = readMarketGlobalPriceModifier('swerpg')
    const typeModifiers = readMarketTypeModifiers('swerpg')
    const priceOptions = { globalModifier, typeModifiers }

    // 1. Load world items
    const worldItems = Array.from(game.items).map((item) => itemToRawItem(item))

    // 2. Load compendium items (async) — the costly operation avoided on repeated light-phase calls
    let compendiumItems = []
    try {
      compendiumItems = await loadCompendiumItems()
    } catch (err) {
      logger.warn('[Market] Could not load compendium items', err)
    }

    // 3. Delegate to domain loader (handles eligibility, config filtering, dedup, exclusions)
    let allEntries
    try {
      allEntries = loadMarketCatalog({
        worldItems,
        compendiumItems,
        config: marketConfig,
        marketContext,
        excludedIds,
        priceOptions,
      })
    } catch (err) {
      logger.error('[Market] Catalog loading failed', err)
      allEntries = []
    }

    // 4. Apply market-type visibility rules (hide items whose availability or restriction level is not
    //    allowed in this market). isItemVisibleForMarket combines both availability and restriction axes.
    const visibleEntries = allEntries.filter((entry) => {
      const { visible } = isItemVisibleForMarket(entry, activeMarketType)
      return visible
    })

    // Store in cache keyed by market type
    this._catalogCache = { marketType: activeMarketType, entries: visibleEntries }
    logger.debug('[Market] Catalog cache populated', { marketType: activeMarketType, count: visibleEntries.length })

    return visibleEntries
  }

  /**
   * Build the filtered, sorted catalogue from World and Compendium Items as a flat list.
   * Pipeline (heavy, cached): load world+compendium items → domain catalog loader (eligibility, dedup, config)
   *                           → apply market-type visibility
   * Pipeline (light, always runs): apply search → apply filters → sort → annotate with canBuy.
   * @param {Actor|null} buyer        The buyer actor, or null when browsing without a character context.
   * @param {number|null} buyerCredits  The buyer's current credit balance (null when no buyer).
   * @returns {Promise<{
   *   items: import('../../lib/market/market-entry.mjs').MarketEntry[],
   *   isEmpty: boolean,
   *   isFilteredEmpty: boolean,
   *   totalCount: number,
   *   filteredCount: number,
   *   activeMarketType: string,
   *   activeMarketDef: import('../../config/market.mjs').MarketTypeDefinition|null
   * }>}
   */
  async #prepareCatalog(buyer = null, buyerCredits = null) {
    const activeMarketType = this._viewState.activeMarketType ?? DEFAULT_MARKET_TYPE

    // 1. Heavy phase — load and cache the base catalogue (world items + compendiums + domain loader + visibility filter)
    const visibleEntries = await this.#loadCatalogBase(activeMarketType)

    const totalCount = visibleEntries.length

    // 2. Light phase — apply text search and field filters
    const { search, filterType, filterSource, filterRestriction, affordableOnly, sortBy, sortDirection } = this._viewState
    let filtered = filterBySearch(visibleEntries, search)
    filtered = filterByFilters(filtered, { filterType, filterSource, filterRestriction })

    // 3. Sort
    const sorted = sortEntries(filtered, sortBy, sortDirection)

    // 4. Annotate each entry with canBuy, obtainability, and narrative badges
    const hasBuyer = buyer !== null
    const annotated = sorted.map((entry) => {
      const validation = validatePurchase({ actor: buyer, entry })
      const obtainability = evaluateObtainability({ rarity: entry.rarity, marketType: activeMarketType })
      const marketDef = MARKET_TYPES[activeMarketType]
      const isNegotiable = marketDef?.negotiationAllowed === true
      const isImperialSuspicion = RESTRICTED_RESTRICTION_LEVELS.includes(entry.restrictionLevel ?? '')
      const isBlackMarket = activeMarketType === 'black-market' || BLACK_MARKET_AVAILABILITY_KEYS.includes(entry.availability ?? '')
      const restrictionLevel = entry.restrictionLevel ?? 'none'
      const isRestricted = restrictionLevel !== 'none'
      const restrictionLabel = RESTRICTION_LEVELS[restrictionLevel]?.label ?? null

      // Rarity display: build an array of pip flags for visual rendering.
      // Each element is { filled: boolean } — filled pips represent the item's rarity value.
      // A rarity of 0 produces an empty array (no pips displayed).
      const rarityValue = entry.rarity ?? 0
      const MAX_RARITY_PIPS = 10
      const rarityPips = Array.from({ length: Math.min(rarityValue, MAX_RARITY_PIPS) }, () => ({ filled: true }))

      // Price variation view-model: expose pre-computed state so the template stays purely presentational.
      // isModified: true when at least one modifier has changed the base price.
      // priceTrend: 'discount' | 'premium' | 'none' — direction of the modification.
      // priceStateClass: CSS modifier class to apply on the price cell.
      // priceIndicator: visual arrow character ('↓' / '↑' / null) for the trend indicator.
      const isModified = (entry.priceResult.modifiers?.length ?? 0) > 0
      const finalPriceVal = entry.priceResult.finalPrice ?? 0
      const basePriceVal = entry.priceResult.basePrice ?? 0
      let priceTrend = 'none'
      if (isModified) {
        priceTrend = finalPriceVal < basePriceVal ? 'discount' : 'premium'
      }
      const priceStateClass = isModified ? `market-price--${priceTrend}` : ''
      const priceIndicator = priceTrend === 'discount' ? '↓' : priceTrend === 'premium' ? '↑' : null
      const priceTrendAriaKey = priceTrend !== 'none' ? `MARKET.Price.Trend.${priceTrend}` : null

      // Badge view-model: encode deduplication rules so the template stays purely presentational.
      // Rule 1 — black-market badge: suppress when restrictionLevel === 'illegal', because the
      //           restriction badge already displays the skull icon for that level.
      // Rule 2 — negotiable badge: suppress when the buyer is present, because the negotiate CTA
      //           button in the buy column already signals negotiability on the same row.
      const badges = {
        showImperialSuspicion: isImperialSuspicion,
        showBlackMarket: isBlackMarket && restrictionLevel !== 'illegal',
        showNegotiable: isNegotiable && !hasBuyer,
        showImmediateAccess: obtainability.immediate,
        showSupplyDelay: !obtainability.immediate,
      }

      // Out-of-budget flag: true when a buyer is present, the item cannot be purchased,
      // and the specific reason is insufficient credits.
      // This is distinct from canBuy=false caused by other block reasons (broken, nonPurchasable, etc.)
      // so the template can apply a visual attenuation specifically for budget-blocked rows.
      const isOutOfBudget = hasBuyer && !validation.canPurchase && validation.reason === 'insufficient-credits'

      return {
        ...entry,
        canBuy: hasBuyer && validation.canPurchase,
        buyBlockedReason: hasBuyer && !validation.canPurchase ? validation.reason : null,
        isOutOfBudget,
        obtainability,
        isNegotiable,
        isImperialSuspicion,
        isBlackMarket,
        isRestricted,
        restrictionLabel,
        rarityPips,
        badges,
        isModified,
        priceTrend,
        priceStateClass,
        priceIndicator,
        priceTrendAriaKey,
      }
    })

    // 5. Apply affordableOnly filter after canBuy annotation (buyer must be present for this filter to take effect)
    const items = affordableOnly && buyer !== null ? annotated.filter((entry) => entry.canBuy) : annotated

    const filteredCount = items.length
    const hasActiveFilter = !!(search || filterType || filterSource || filterRestriction || (affordableOnly && buyer !== null))

    return {
      items,
      isEmpty: totalCount === 0,
      isFilteredEmpty: totalCount > 0 && filteredCount === 0 && hasActiveFilter,
      totalCount,
      filteredCount,
      activeMarketType,
      activeMarketDef: MARKET_TYPES[activeMarketType] ?? null,
    }
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  /**
   * Open the item sheet for the clicked market entry.
   * @this {MarketApplicationV2}
   * @param {PointerEvent} event     The initiating click event
   * @param {HTMLElement}  target    The element bearing data-action="openItem"
   * @returns {Promise<void>}
   */
  static async #onOpenItem(event, target) {
    const row = target.closest('[data-uuid]')
    const uuid = row?.dataset?.uuid
    if (!uuid) {
      logger.warn('[Market] openItem action triggered without a data-uuid attribute')
      return
    }

    let item
    try {
      item = await fromUuid(uuid)
    } catch (err) {
      logger.warn(`[Market] Could not resolve UUID "${uuid}": ${err.message}`)
      return
    }

    if (!item) {
      logger.warn(`[Market] Item with UUID "${uuid}" no longer exists (deleted or moved).`)
      return
    }

    await item.sheet.render(true)
  }

  /**
   * Reset all catalog filters and search to the default view state, then re-render.
   * @this {MarketApplicationV2}
   * @param {PointerEvent} _event   The initiating click event
   * @param {HTMLElement}  _target  The element bearing data-action="resetCatalog"
   * @returns {Promise<void>}
   */
  static async #onResetCatalog(_event, _target) {
    this._viewState = { ...DEFAULT_VIEW_STATE }
    this.#invalidateCatalogCache()
    await this.render()
  }

  /**
   * Reset the sell-mode inventory search and sort to their defaults, then re-render.
   * Does not change the mode or the buy-mode filters.
   * @this {MarketApplicationV2}
   * @param {PointerEvent} _event   The initiating click event
   * @param {HTMLElement}  _target  The element bearing data-action="resetInventory"
   * @returns {Promise<void>}
   */
  static async #onResetInventory(_event, _target) {
    this._viewState = {
      ...this._viewState,
      inventorySearch: DEFAULT_VIEW_STATE.inventorySearch,
      inventorySortBy: DEFAULT_VIEW_STATE.inventorySortBy,
      inventorySortDirection: DEFAULT_VIEW_STATE.inventorySortDirection,
    }
    logger.debug('[Market] Inventory search/sort reset')
    await this.render()
  }

  /**
   * Initiate the negotiation flow for a market entry.
   * Shows the negotiation dialog, then proceeds to the standard buy flow with the negotiated price.
   *
   * @this {MarketApplicationV2}
   * @param {PointerEvent} _event   The initiating click event
   * @param {HTMLElement}  target   The element bearing data-action="negotiateItem"
   * @returns {Promise<void>}
   */
  static async #onNegotiateItem(_event, target) {
    const row = target.closest('[data-uuid]')
    const uuid = row?.dataset?.uuid
    if (!uuid) {
      logger.warn('[Market] negotiateItem action triggered without a data-uuid attribute')
      return
    }

    const buyer = this._buyerActor
    if (!buyer) {
      ui.notifications.warn(game.i18n.localize('MARKET.Purchase.Error.MissingActor'))
      return
    }

    let item
    try {
      item = await fromUuid(uuid)
    } catch (err) {
      logger.warn(`[Market] Could not resolve UUID "${uuid}" for negotiation: ${err.message}`)
      ui.notifications.error(game.i18n.localize('MARKET.Purchase.Error.ItemNotFound'))
      return
    }

    if (!item) {
      logger.warn(`[Market] Item with UUID "${uuid}" no longer exists (negotiation).`)
      ui.notifications.error(game.i18n.localize('MARKET.Purchase.Error.ItemNotFound'))
      return
    }

    let entry
    try {
      const rawItem = itemToRawItem(item)
      const activeMarketType = this._viewState.activeMarketType ?? DEFAULT_MARKET_TYPE
      const globalModifier = readMarketGlobalPriceModifier('swerpg')
      const typeModifiers = readMarketTypeModifiers('swerpg')
      entry = createMarketEntry(
        rawItem,
        { sourceType: 'world', sourceId: item.uuid ?? '' },
        { ...DEFAULT_MARKET_CONTEXT, marketType: activeMarketType },
        { globalModifier, typeModifiers },
      )
    } catch (err) {
      logger.warn(`[Market] Could not build market entry for "${uuid}" (negotiation): ${err.message}`)
      ui.notifications.error(game.i18n.localize('MARKET.Purchase.Error.ItemNotFound'))
      return
    }

    // Availability check: run before opening the negotiation dialog.
    // Rare/restricted items require a successful skill test; if the check is cancelled or fails,
    // the negotiation is blocked entirely (anti-bypass enforcement).
    // Commerce outcome price modifier is NOT applied here — the negotiated price is determined
    // later in the negotiation step and supersedes any pre-negotiation modifier.
    const availabilityPassedEntry = await MarketApplicationV2.#runAvailabilityCheck.call(this, { entry, buyer, uuid, applyCommerceOutcome: false })
    if (availabilityPassedEntry === null) return

    const negotiationResult = await NegotiationDialog.prompt({ entry, buyer })
    if (!negotiationResult?.confirmed) {
      logger.debug('[Market] Negotiation cancelled by user', { uuid })
      return
    }

    // Build a negotiated entry with the adjusted price
    const negotiatedEntry = {
      ...entry,
      priceResult: {
        ...entry.priceResult,
        finalPrice: negotiationResult.finalPrice,
      },
    }

    // Show outcome notification
    const i18n = game.i18n
    if (negotiationResult.outcome === 'success') {
      ui.notifications.info(i18n.format('MARKET.Negotiation.Outcome.SuccessNotification', { price: negotiationResult.finalPrice }))
    } else if (negotiationResult.outcome === 'disaster') {
      ui.notifications.warn(i18n.localize('MARKET.Negotiation.Outcome.DisasterNotification'))
    }

    // Read quantity from the sibling input within the same row
    const negotiateRow = target.closest('[data-uuid]')
    const negotiateQtyInput = negotiateRow?.querySelector('.market-item__quantity-input')
    const negotiateQuantity = negotiateQtyInput ? Math.max(1, parseInt(negotiateQtyInput.value, 10) || 1) : 1

    await MarketApplicationV2.#executePurchase.call(this, { item, entry: negotiatedEntry, buyer, quantity: negotiateQuantity })
  }

  /**
   * Initiate the purchase flow for a market entry.
   * Validates solvability, shows a consequences dialog (if any), shows a confirmation dialog,
   * then executes the purchase.
   *
   * @this {MarketApplicationV2}
   * @param {PointerEvent} _event   The initiating click event
   * @param {HTMLElement}  target   The element bearing data-action="buyItem"
   * @returns {Promise<void>}
   */
  static async #onBuyItem(_event, target) {
    const row = target.closest('[data-uuid]')
    const uuid = row?.dataset?.uuid
    if (!uuid) {
      logger.warn('[Market] buyItem action triggered without a data-uuid attribute')
      return
    }

    const buyer = this._buyerActor
    if (!buyer) {
      ui.notifications.warn(game.i18n.localize('MARKET.Purchase.Error.MissingActor'))
      return
    }

    // Re-resolve the item source at purchase time to detect deleted items.
    let item
    try {
      item = await fromUuid(uuid)
    } catch (err) {
      logger.warn(`[Market] Could not resolve UUID "${uuid}" at purchase time: ${err.message}`)
      ui.notifications.error(game.i18n.localize('MARKET.Purchase.Error.ItemNotFound'))
      return
    }

    if (!item) {
      logger.warn(`[Market] Item with UUID "${uuid}" no longer exists.`)
      ui.notifications.error(game.i18n.localize('MARKET.Purchase.Error.ItemNotFound'))
      return
    }

    // Rebuild a market entry from the live item to get the canonical price.
    let entry
    try {
      const rawItem = itemToRawItem(item)
      const activeMarketType = this._viewState.activeMarketType ?? DEFAULT_MARKET_TYPE
      const globalModifier = readMarketGlobalPriceModifier('swerpg')
      const typeModifiers = readMarketTypeModifiers('swerpg')
      entry = createMarketEntry(
        rawItem,
        { sourceType: 'world', sourceId: item.uuid ?? '' },
        { ...DEFAULT_MARKET_CONTEXT, marketType: activeMarketType },
        { globalModifier, typeModifiers },
      )
    } catch (err) {
      logger.warn(`[Market] Could not build market entry for "${uuid}": ${err.message}`)
      ui.notifications.error(game.i18n.localize('MARKET.Purchase.Error.ItemNotFound'))
      return
    }

    const checkedEntry = await MarketApplicationV2.#runAvailabilityCheck.call(this, { entry, buyer, uuid })
    if (checkedEntry === null) return

    // Read quantity from the quantity input within the same row (row already declared above)
    const quantityInput = row?.querySelector('.market-item__quantity-input')
    const quantity = quantityInput ? Math.max(1, parseInt(quantityInput.value, 10) || 1) : 1

    await MarketApplicationV2.#executePurchase.call(this, { item, entry: checkedEntry, buyer, quantity })
  }

  /**
   * Run the availability check gate shared by the buy and negotiate flows.
   *
   * Resolves the check spec, shows `AvailabilityCheckDialog` when required, and applies the
   * commerce outcome modifier to the entry price (buy flow only — the negotiate flow receives
   * the same pre-negotiation check but the price modifier is intentionally omitted because the
   * negotiation price is determined afterwards).
   *
   * Returns the (possibly price-modified) entry when the check passes or is not required.
   * Returns `null` when the check is required but the user cancelled or the roll failed,
   * signalling the caller to abort the flow.
   *
   * @this {MarketApplicationV2}
   * @param {object} params
   * @param {import('../../lib/market/market-entry.mjs').MarketEntry} params.entry  The market entry to check.
   * @param {Actor}  params.buyer   The buyer actor.
   * @param {string} params.uuid    Item UUID — used only for debug logging.
   * @param {boolean} [params.applyCommerceOutcome=true]  When false, skip the price-modifier step (negotiate flow).
   * @returns {Promise<import('../../lib/market/market-entry.mjs').MarketEntry|null>}
   */
  static async #runAvailabilityCheck({ entry, buyer, uuid, applyCommerceOutcome = true }) {
    const checkSpec = resolveAvailabilityCheck({
      rarity: entry.rarity,
      restrictionLevel: entry.restrictionLevel,
    })

    if (!checkSpec.required) return entry

    const checkResult = await AvailabilityCheckDialog.prompt({ entry, buyer, checkSpec })

    if (!checkResult?.passed) {
      logger.debug('[Market] Availability check not passed — flow aborted', { uuid, checkSpec })
      const skillName = SYSTEM.SKILLS[checkSpec.skillKey]?.name ?? checkSpec.skillKey
      ui.notifications.warn(
        game.i18n.format('MARKET.AvailabilityCheck.FailedNotification', {
          skill: skillName,
          item: entry.name,
        }),
      )
      return null
    }

    logger.info('[Market] Availability check passed', { uuid, skillKey: checkSpec.skillKey })

    if (!applyCommerceOutcome) return entry

    // Apply commerce outcome if the check result carries narrative dice data (Tranche 2).
    // Non-blocking: if testResult is absent or malformed, the purchase proceeds unchanged.
    const testResult = checkResult?.testResult ?? null
    if (!testResult) return entry

    try {
      const commerceOutcome = computeCommerceOutcome(testResult)
      const basePrice = entry.priceResult.finalPrice
      const modifiedPrice = Math.max(0, Math.floor(basePrice * (1 + commerceOutcome.priceModifier)))
      const modifiedEntry = {
        ...entry,
        priceResult: {
          ...entry.priceResult,
          finalPrice: modifiedPrice,
          appliedOutcome: commerceOutcome,
        },
      }
      logger.info('[Market] Commerce outcome applied', {
        uuid,
        outcomeLabel: commerceOutcome.outcomeLabel,
        priceModifier: commerceOutcome.priceModifier,
        basePrice,
        modifiedPrice,
      })
      return modifiedEntry
    } catch (outcomeErr) {
      logger.warn('[Market] Could not apply commerce outcome — proceeding with base price', outcomeErr)
      return entry
    }
  }

  /**
   * Shared purchase execution logic used by both buyItem and negotiateItem.
   * Shows consequences dialog, confirmation dialog, then mutates the actor inventory.
   *
   * @this {MarketApplicationV2}
   * @param {object} params
   * @param {Item}   params.item       The resolved Foundry Item document.
   * @param {import('../../lib/market/market-entry.mjs').MarketEntry} params.entry  The market entry (may have negotiated price).
   * @param {Actor}  params.buyer      The buyer actor.
   * @param {number} [params.quantity=1]  Number of units to purchase.
   * @returns {Promise<void>}
   */
  static async #executePurchase({ item, entry, buyer, quantity = 1 }) {
    const qty = Number.isInteger(quantity) && quantity >= 1 ? quantity : 1
    const validation = validatePurchase({ actor: buyer, entry, quantity: qty })
    if (!validation.canPurchase) {
      const msgKey = validation.messageKey ?? 'MARKET.Purchase.Error.InsufficientCredits'
      ui.notifications.warn(game.i18n.localize(msgKey))
      return
    }

    // Show consequences dialog if there are narrative consequences
    const activeMarketType = this._viewState.activeMarketType ?? DEFAULT_MARKET_TYPE
    const consequencesResult = await ConsequencesDialog.prompt({ entry, marketType: activeMarketType, buyer })
    if (!consequencesResult?.confirmed) {
      logger.debug('[Market] Purchase aborted via consequences dialog', { uuid: entry.uuid })
      return
    }

    // Confirmation dialog — show unit price and total when qty > 1
    const i18n = game.i18n
    const currentCredits = buyer.system?.creditBudget?.availableCredits ?? buyer.system?.credits ?? 0
    const confirmContent =
      qty > 1
        ? i18n.format('MARKET.Purchase.Confirm.ContentMultiple', {
            name: entry.name,
            quantity: qty,
            unitPrice: validation.finalPrice,
            total: validation.totalPrice,
            credits: currentCredits,
            remaining: validation.creditsAfter,
          })
        : i18n.format('MARKET.Purchase.Confirm.Content', {
            name: entry.name,
            price: validation.finalPrice,
            credits: currentCredits,
            remaining: validation.creditsAfter,
          })

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: i18n.format('MARKET.Purchase.Confirm.Title', { name: entry.name }),
      },
      content: `<p>${confirmContent}</p>`,
      yes: {
        label: i18n.format('MARKET.Purchase.Confirm.Buy', { price: validation.totalPrice }),
        icon: 'fa-solid fa-coins',
      },
      no: {
        label: i18n.localize('MARKET.Purchase.Confirm.Cancel'),
        icon: 'fa-solid fa-xmark',
      },
    })

    if (!confirmed) return

    // Re-validate at mutation time (credits might have changed since dialog opened)
    const finalValidation = validatePurchase({ actor: buyer, entry, quantity: qty })
    if (!finalValidation.canPurchase) {
      ui.notifications.warn(game.i18n.localize(finalValidation.messageKey ?? 'MARKET.Purchase.Error.InsufficientCredits'))
      return
    }

    try {
      // Add a copy of the item to the buyer's inventory with the requested quantity.
      // Credit deduction is derived automatically via _prepareCredits() when the item
      // is added — no direct update of system.credits is needed.
      const itemData = item.toObject()
      itemData.system = { ...itemData.system, quantity: qty }
      await buyer.createEmbeddedDocuments('Item', [itemData])

      // Phase 7a: Store all accepted consequences as actor flags (generalised from blackMarketDebt only)
      // Re-evaluate consequences to get full objects for serialization.
      const allConsequences = evaluateMarketConsequences({ entry, marketType: activeMarketType, actor: buyer })
      for (const acceptedType of consequencesResult.acceptedTypes) {
        const consequence = allConsequences.find((c) => c.type === acceptedType)
        if (consequence) {
          await MarketApplicationV2.#storeMarketConsequence({ buyer, consequence, finalPrice: finalValidation.totalPrice })
        }
      }

      // Record item purchase in audit log (non-blocking)
      try {
        const { recordItemPurchase } = await import('../../utils/audit-log.mjs')
        await recordItemPurchase(buyer, {
          itemName: entry.name,
          itemType: item.type,
          price: finalValidation.finalPrice,
          quantity: qty,
          creditsAfter: finalValidation.creditsAfter,
          itemId: item.id,
          outcome: entry.priceResult?.appliedOutcome ?? null,
        })
      } catch (auditErr) {
        logger.warn('[Market] Could not record item purchase audit entry', auditErr)
      }

      ui.notifications.info(
        i18n.format('MARKET.Purchase.Success', {
          name: entry.name,
          price: finalValidation.totalPrice,
          remaining: finalValidation.creditsAfter,
        }),
      )

      logger.info('[Market] Purchase completed', {
        actorId: buyer.id,
        actorName: buyer.name,
        itemUuid: entry.uuid,
        itemName: entry.name,
        unitPrice: finalValidation.finalPrice,
        quantity: qty,
        totalPrice: finalValidation.totalPrice,
        creditsAfter: finalValidation.creditsAfter,
        acceptedConsequences: consequencesResult.acceptedTypes,
      })

      await this.render()
    } catch (err) {
      logger.error('[Market] Purchase failed during mutation', err)
      ui.notifications.error(game.i18n.localize('MARKET.Purchase.Error.WriteFailed'))
    }
  }

  /**
   * Store a single accepted market consequence as an actor flag (Phase 7a).
   * Uses `flags.swerpg.marketConsequences` (array) to accumulate all consequence types.
   * Supersedes the former `#storeMarketDebt` which only handled blackMarketDebt.
   *
   * @param {object} params
   * @param {Actor}  params.buyer         The buyer actor.
   * @param {import('../../lib/market/consequences.mjs').MarketConsequence} params.consequence  The accepted consequence.
   * @param {number} params.finalPrice    The price paid (stored in metadata for debt-type consequences).
   * @returns {Promise<void>}
   */
  static async #storeMarketConsequence({ buyer, consequence, finalPrice }) {
    try {
      const existing = buyer.getFlag('swerpg', 'marketConsequences') ?? []
      const serialized = serializeConsequence(
        {
          ...consequence,
          metadata: {
            ...consequence.metadata,
            ...(consequence.type === CONSEQUENCE_TYPES.blackMarketDebt ? { amount: finalPrice } : {}),
          },
        },
        { actorId: buyer.id },
      )
      await buyer.setFlag('swerpg', 'marketConsequences', [...existing, serialized])
      logger.info('[Market] Consequence stored', { actorId: buyer.id, consequenceType: consequence.type })
    } catch (err) {
      logger.warn('[Market] Could not store market consequence flag', err)
    }
  }

  /* -------------------------------------------- */
  /*  Inventory helpers                           */
  /* -------------------------------------------- */

  /**
   * Build the inventory context for the sell mode.
   * Pipeline: collect sellable items → normalise fields → filter by text search → sort.
   * Search and sort are driven by the inventory-specific fields in `_viewState`.
   *
   * @param {Actor} actor  The seller actor.
   * @returns {{ items: Array<object>, isEmpty: boolean, isFilteredEmpty: boolean }}
   */
  #prepareInventory(actor) {
    // Read broken item policy once for the whole inventory build
    const allowBrokenItemSale = readMarketAllowBrokenItemSale('swerpg')
    const brokenItemSaleMultiplier = readMarketBrokenItemSaleMultiplier('swerpg')

    // 1. Collect all sellable items and normalise fields
    const allItems = []

    for (const item of actor.items ?? []) {
      if (!(item.type in PURCHASABLE_ITEM_TYPES)) continue
      const basePrice = item.system?._source?.price ?? item.system?.price ?? 0
      const isBroken = item.system?.broken === true
      // Items that cannot be sold (broken + policy = deny) show a resale estimate of 0.
      const brokenBlocked = isBroken && !allowBrokenItemSale
      const brokenMultiplier = isBroken && allowBrokenItemSale ? brokenItemSaleMultiplier : null
      const valuation = brokenBlocked ? { resalePrice: 0, fraction: 0 } : computeResalePrice({ basePrice, negotiationOutcome: 'failure', brokenMultiplier })
      const typeConfig = PURCHASABLE_ITEM_TYPES[item.type]

      const quantity = item.system?.quantity ?? 1

      allItems.push({
        id: item.id,
        name: item.name,
        img: item.img ?? '',
        type: item.type,
        typeLabel: typeConfig?.label ?? item.type,
        basePrice,
        resaleEstimate: valuation.resalePrice,
        resaleFraction: Math.round(valuation.fraction * 100),
        quantity,
        isBroken,
        brokenBlocked,
      })
    }

    const totalCount = allItems.length

    // 2. Apply text search on item name (case-insensitive)
    const { inventorySearch, inventorySortBy, inventorySortDirection } = this._viewState
    let filtered = allItems
    if (inventorySearch) {
      const needle = inventorySearch.trim().toLowerCase()
      if (needle) {
        filtered = allItems.filter((entry) => entry.name.toLowerCase().includes(needle))
      }
    }

    // 3. Sort by selected field and direction
    const multiplier = inventorySortDirection === 'desc' ? -1 : 1
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0
      if (inventorySortBy === INVENTORY_SORT_FIELDS.name) {
        cmp = a.name.localeCompare(b.name)
      } else if (inventorySortBy === INVENTORY_SORT_FIELDS.basePrice) {
        cmp = a.basePrice - b.basePrice
      } else if (inventorySortBy === INVENTORY_SORT_FIELDS.resaleEstimate) {
        cmp = a.resaleEstimate - b.resaleEstimate
      } else {
        cmp = a.name.localeCompare(b.name)
      }
      return cmp * multiplier
    })

    const filteredCount = sorted.length
    const hasActiveFilter = !!inventorySearch?.trim()

    return {
      items: sorted,
      isEmpty: totalCount === 0,
      isFilteredEmpty: totalCount > 0 && filteredCount === 0 && hasActiveFilter,
    }
  }

  /* -------------------------------------------- */
  /*  Actions (sell mode)                         */
  /* -------------------------------------------- */

  /**
   * Toggle the market between buy and sell mode and re-render.
   *
   * @this {MarketApplicationV2}
   * @param {PointerEvent} _event   The initiating click event
   * @param {HTMLElement}  target   The element bearing data-action="toggleMode"
   * @returns {Promise<void>}
   */
  static async #onToggleMode(_event, target) {
    const nextMode = target.dataset?.mode ?? (this._viewState.mode === 'buy' ? 'sell' : 'buy')
    if (nextMode !== 'buy' && nextMode !== 'sell') {
      logger.warn('[Market] toggleMode received unknown mode', { mode: nextMode })
      return
    }
    this._viewState = { ...this._viewState, mode: nextMode }
    logger.debug('[Market] Mode toggled', { mode: nextMode })
    await this.render()
  }

  /**
   * Execute the sale flow for an item in the seller's inventory.
   * Pipeline: validate → confirm dialog → optional negotiation → delete item + credit actor → audit log.
   *
   * @this {MarketApplicationV2}
   * @param {PointerEvent} _event   The initiating click event
   * @param {HTMLElement}  target   The element bearing data-action="sellItem" and data-item-id
   * @returns {Promise<void>}
   */
  static async #onSellItem(_event, target) {
    const seller = this._buyerActor
    if (!seller) {
      ui.notifications.warn(game.i18n.localize('MARKET.Purchase.Error.MissingActor'))
      return
    }

    const itemId = target.dataset?.itemId
    if (!itemId) {
      logger.warn('[Market] sellItem action triggered without a data-item-id attribute')
      return
    }

    const item = seller.items.get(itemId)
    if (!item) {
      ui.notifications.error(game.i18n.localize('MARKET.Sale.Error.ItemNotFound'))
      return
    }

    // Read broken item sale policy from settings
    const allowBrokenItemSale = readMarketAllowBrokenItemSale('swerpg')
    const brokenItemSaleMultiplier = readMarketBrokenItemSaleMultiplier('swerpg')
    const isBroken = item.system?.broken === true

    // Validate sale eligibility — also resolves maxQuantity from system.quantity
    const validation = validateSale({ actor: seller, item, policy: { allowBrokenItemSale } })
    if (!validation.canSell) {
      ui.notifications.warn(game.i18n.localize(validation.messageKey))
      return
    }

    // Read quantity from the sibling input within the same row
    const sellRow = target.closest('[data-item-id]')
    const sellQtyInput = sellRow?.querySelector('.market-item__quantity-input')
    const rawQty = sellQtyInput ? parseInt(sellQtyInput.value, 10) : 1
    const maxQuantity = validation.maxQuantity ?? 1
    const sellQuantity = Math.min(Math.max(1, isNaN(rawQty) ? 1 : rawQty), maxQuantity)

    // Compute base resale estimate (25% — may be improved by negotiation).
    // When the item is broken and broken sale is allowed, apply the broken multiplier.
    // resalePrice here is the per-unit resale price; total = resalePrice × sellQuantity
    const brokenMultiplierForValuation = isBroken && allowBrokenItemSale ? brokenItemSaleMultiplier : null
    const baseValuation = computeResalePrice({ basePrice: validation.basePrice, negotiationOutcome: 'failure', brokenMultiplier: brokenMultiplierForValuation })
    const baseResaleTotal = baseValuation.resalePrice * sellQuantity

    // Confirmation dialog
    const i18n = game.i18n
    const currentCredits = seller.system?.creditBudget?.availableCredits ?? seller.system?.credits ?? 0
    const creditsAfterBase = currentCredits + baseResaleTotal

    const confirmContent =
      sellQuantity > 1
        ? i18n.format('MARKET.Sell.Confirm.ContentMultiple', {
            name: item.name,
            quantity: sellQuantity,
            unitPrice: baseValuation.resalePrice,
            total: baseResaleTotal,
            credits: currentCredits,
            remaining: creditsAfterBase,
          })
        : i18n.format('MARKET.Sell.Confirm.Content', {
            name: item.name,
            price: baseResaleTotal,
            credits: currentCredits,
            remaining: creditsAfterBase,
          })

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: i18n.format('MARKET.Sell.Confirm.Title', { name: item.name }),
      },
      content: `<p>${confirmContent}</p>`,
      yes: {
        label: i18n.format('MARKET.Sell.Confirm.Sell', { price: baseResaleTotal }),
        icon: 'fa-solid fa-coins',
      },
      no: {
        label: i18n.localize('MARKET.Sell.Confirm.Cancel'),
        icon: 'fa-solid fa-xmark',
      },
    })

    if (!confirmed) return

    // Optional negotiation
    const offerNegotiation = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: i18n.localize('MARKET.Sell.Negotiate.Title'),
      },
      content: `<p>${i18n.localize('MARKET.Sell.Negotiate.Offer')}</p>`,
      yes: {
        label: i18n.localize('MARKET.Sell.Negotiate.Accept'),
        icon: 'fa-solid fa-handshake',
      },
      no: {
        label: i18n.localize('MARKET.Sell.Negotiate.Skip'),
        icon: 'fa-solid fa-xmark',
      },
    })

    let finalUnitValuation = baseValuation
    if (offerNegotiation) {
      const negotiationResult = await NegotiationDialog.prompt({ entry: { name: item.name, rarity: item.system?.rarity ?? 0 }, buyer: seller, forSale: true })

      if (negotiationResult?.confirmed) {
        finalUnitValuation = computeResalePrice({
          basePrice: validation.basePrice,
          negotiationOutcome: negotiationResult.outcome,
          brokenMultiplier: brokenMultiplierForValuation,
        })
      }
    }

    const resaleTotalPrice = finalUnitValuation.resalePrice * sellQuantity
    const isFullSale = sellQuantity >= maxQuantity

    // Execute sale:
    // - Full sale (sellQuantity === maxQuantity): delete the item.
    //   When the item is deleted, totalSpent drops by basePrice × maxQuantity (via _prepareCredits),
    //   which would inflate availableCredits by that amount. To compensate, we write:
    //   system.credits = manualAdjustmentBefore + resaleTotalPrice - (basePrice × sellQuantity)
    //   so that availableCredits after = manualAdjustmentBefore + resaleTotalPrice - totalSpent  ✓
    //
    // - Partial sale (sellQuantity < maxQuantity): decrement system.quantity; do NOT delete.
    //   The item stays in totalSpent, but at a reduced quantity:
    //   system.credits = manualAdjustmentBefore + resaleTotalPrice
    //   (totalSpent decreases by basePrice × sellQuantity via _prepareCredits, so no further adjustment needed)
    const manualAdjustmentBefore = seller.system?._source?.credits ?? seller.system?.credits ?? 0
    const availableCreditsAfter = currentCredits + resaleTotalPrice

    let newManualAdjustment
    if (isFullSale) {
      newManualAdjustment = manualAdjustmentBefore + resaleTotalPrice - validation.basePrice * sellQuantity
    } else {
      newManualAdjustment = manualAdjustmentBefore + resaleTotalPrice
    }

    try {
      if (isFullSale) {
        await seller.deleteEmbeddedDocuments('Item', [item.id])
      } else {
        await item.update({ 'system.quantity': maxQuantity - sellQuantity })
      }
      await seller.update({ 'system.credits': newManualAdjustment })

      // Record in audit log (non-blocking)
      try {
        const { recordItemSale } = await import('../../utils/audit-log.mjs')
        await recordItemSale(seller, {
          itemName: item.name,
          itemType: item.type,
          basePrice: validation.basePrice,
          resalePrice: resaleTotalPrice,
          fraction: finalUnitValuation.fraction,
          quantity: sellQuantity,
          negotiationOutcome: finalUnitValuation.outcome,
          creditsAfter: availableCreditsAfter,
          itemId: item.id,
        })
      } catch (auditErr) {
        logger.warn('[Market] Could not record item sale audit entry', auditErr)
      }

      ui.notifications.info(
        i18n.format('MARKET.Sale.Success', {
          name: item.name,
          price: resaleTotalPrice,
          remaining: availableCreditsAfter,
        }),
      )

      logger.info('[Market] Item sale completed', {
        actorId: seller.id,
        actorName: seller.name,
        itemId: item.id,
        itemName: item.name,
        basePrice: validation.basePrice,
        quantity: sellQuantity,
        resaleTotalPrice,
        isFullSale,
        creditsAfter: availableCreditsAfter,
      })

      await this.render()
    } catch (err) {
      logger.error('[Market] Sale failed', err)
      ui.notifications.error(game.i18n.localize('MARKET.Sale.Error.WriteFailed'))
    }
  }

  /* -------------------------------------------- */
  /*  Form Change Handler (AppV2 idiom)           */
  /* -------------------------------------------- */

  /**
   * Handle form field changes for all Market view-state controls.
   *
   * This single handler replaces the per-element `addEventListener` wiring that was
   * previously spread across `_onRender`. Each field is identified by its `name`
   * attribute; the handler dispatches the appropriate `_viewState` mutation and then
   * triggers a re-render (immediate or debounced depending on the field).
   *
   * Contracts:
   * - `name="market-type"` → updates `activeMarketType`; **invalidates the catalogue
   *    cache** because a market-type switch changes the visible item set.
   * - `name="market-search"` → updates `search`; render is **debounced** (250 ms) to
   *    avoid firing a full pipeline on every keystroke.
   * - `name="market-filter-type"` → updates `filterType`; immediate render.
   * - `name="market-filter-source"` → updates `filterSource`; immediate render.
   * - `name="market-filter-restriction"` → updates `filterRestriction`; immediate render.
   * - `name="market-affordable-only"` → updates `affordableOnly` (checkbox); immediate render.
   * - `name="market-sort-by"` → updates `sortBy`; immediate render.
   * - `name="market-sort-direction"` → updates `sortDirection`; immediate render.
   * - `name="market-inventory-search"` → updates `inventorySearch`; render is **debounced**.
   * - `name="market-inventory-sort-by"` → updates `inventorySortBy`; immediate render.
   * - `name="market-inventory-sort-direction"` → updates `inventorySortDirection`; immediate render.
   *
   * @override
   * @param {object} formConfig   The form configuration object (from `DEFAULT_OPTIONS.form`).
   * @param {Event}  event        The raw DOM change or input event.
   */
  _onChangeForm(formConfig, event) {
    const target = event.target
    if (!target?.name) return

    const value = target.type === 'checkbox' ? target.checked : (target.value ?? '')

    switch (target.name) {
      case 'market-type': {
        const marketType = value
        if (!(marketType in MARKET_TYPES)) {
          logger.warn('[Market] _onChangeForm: unknown market type, ignoring', { marketType })
          return
        }
        this._viewState = { ...this._viewState, activeMarketType: marketType }
        this.#invalidateCatalogCache()
        logger.debug('[Market] Market type changed via form', { marketType })
        this.render()
        break
      }
      case 'market-search':
        this._viewState = { ...this._viewState, search: value }
        this._debouncedRender()
        break
      case 'market-filter-type':
        this._viewState = { ...this._viewState, filterType: value }
        this.render()
        break
      case 'market-filter-source':
        this._viewState = { ...this._viewState, filterSource: value }
        this.render()
        break
      case 'market-filter-restriction':
        this._viewState = { ...this._viewState, filterRestriction: value }
        this.render()
        break
      case 'market-affordable-only':
        this._viewState = { ...this._viewState, affordableOnly: value }
        this.render()
        break
      case 'market-sort-by':
        this._viewState = { ...this._viewState, sortBy: value || MARKET_SORT_FIELDS.name }
        this.render()
        break
      case 'market-sort-direction':
        this._viewState = { ...this._viewState, sortDirection: value === 'desc' ? 'desc' : 'asc' }
        this.render()
        break
      case 'market-inventory-search':
        this._viewState = { ...this._viewState, inventorySearch: value }
        this._debouncedRender()
        break
      case 'market-inventory-sort-by':
        this._viewState = { ...this._viewState, inventorySortBy: value || INVENTORY_SORT_FIELDS.name }
        this.render()
        break
      case 'market-inventory-sort-direction':
        this._viewState = { ...this._viewState, inventorySortDirection: value === 'desc' ? 'desc' : 'asc' }
        this.render()
        break
      default:
        // Unrecognised field — no _viewState mutation, no render.
        break
    }
  }
}
