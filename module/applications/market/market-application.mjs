import { createMarketEntry } from '../../lib/market/market-entry.mjs'
import { isItemVisibleForMarket } from '../../lib/market/market-visibility.mjs'
import { loadMarketCatalog } from '../../lib/market/catalog-loader.mjs'
import { validatePurchase } from '../../lib/market/purchase.mjs'
import { readMarketConfig, readMarketExcludedItems } from '../../lib/market/market-settings.mjs'
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
    rarity: system.rarity ?? 0,
    quality: system.quality ?? '',
    restrictionLevel: system.restrictionLevel ?? '',
    availability: system.availability ?? undefined,
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
    actions: {
      openItem: MarketApplicationV2.#onOpenItem,
      resetCatalog: MarketApplicationV2.#onResetCatalog,
      resetInventory: MarketApplicationV2.#onResetInventory,
      buyItem: MarketApplicationV2.#onBuyItem,
      negotiateItem: MarketApplicationV2.#onNegotiateItem,
      changeMarket: MarketApplicationV2.#onChangeMarket,
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
      context.catalog = await this.#prepareCatalog(buyer, buyerCredits)
      context.sortOptions = this.#buildSortOptions()
      context.typeFilterOptions = this.#buildTypeFilterOptions()
      context.sourceFilterOptions = this.#buildSourceFilterOptions()
      context.restrictionFilterOptions = this.#buildRestrictionFilterOptions()
      context.marketTypeOptions = this.#buildMarketTypeOptions()
      context.inventorySortOptions = this.#buildInventorySortOptions()
      context.inventory = buyer ? this.#prepareInventory(buyer) : { items: [], isEmpty: true, isFilteredEmpty: false }
    }

    return context
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
   * Build the filtered, sorted catalogue from World and Compendium Items as a flat list.
   * Pipeline: load world+compendium items → domain catalog loader (eligibility, dedup, config)
   *           → apply market-type visibility → apply search → apply filters → sort → annotate with canBuy.
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
    const marketContext = { ...DEFAULT_MARKET_CONTEXT, marketType: activeMarketType }
    const marketConfig = readMarketConfig('swerpg')
    const excludedIds = readMarketExcludedItems('swerpg')

    // 1. Load world items
    const worldItems = Array.from(game.items).map((item) => itemToRawItem(item))

    // 2. Load compendium items (async)
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

    const totalCount = visibleEntries.length

    // 3. Apply search and filters
    const { search, filterType, filterSource, filterRestriction, affordableOnly, sortBy, sortDirection } = this._viewState
    let filtered = filterBySearch(visibleEntries, search)
    filtered = filterByFilters(filtered, { filterType, filterSource, filterRestriction })

    // 4. Sort globally across all types
    const sorted = sortEntries(filtered, sortBy, sortDirection)

    // 5. Annotate each entry with canBuy, obtainability, and narrative badges
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

      return {
        ...entry,
        canBuy: hasBuyer && validation.canPurchase,
        buyBlockedReason: hasBuyer && !validation.canPurchase ? validation.reason : null,
        obtainability,
        isNegotiable,
        isImperialSuspicion,
        isBlackMarket,
        isRestricted,
        restrictionLabel,
        rarityPips,
        badges,
      }
    })

    // 6. Apply affordableOnly filter after canBuy annotation (buyer must be present for this filter to take effect)
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
   * Change the active market type and re-render the catalogue.
   * Validates that the requested type key is in MARKET_TYPES before applying.
   *
   * @this {MarketApplicationV2}
   * @param {PointerEvent} _event   The initiating event
   * @param {HTMLElement}  target   The element bearing data-action="changeMarket" and data-market-type
   * @returns {Promise<void>}
   */
  static async #onChangeMarket(_event, target) {
    const marketType = target.dataset?.marketType
    if (!marketType || !(marketType in MARKET_TYPES)) {
      logger.warn(`[Market] changeMarket action received unknown market type "${marketType}"`)
      return
    }
    this._viewState = { ...this._viewState, activeMarketType: marketType }
    logger.debug('[Market] Active market type changed', { marketType })
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
      entry = createMarketEntry(rawItem, { sourceType: 'world', sourceId: item.uuid ?? '' }, { ...DEFAULT_MARKET_CONTEXT, marketType: activeMarketType })
    } catch (err) {
      logger.warn(`[Market] Could not build market entry for "${uuid}" (negotiation): ${err.message}`)
      ui.notifications.error(game.i18n.localize('MARKET.Purchase.Error.ItemNotFound'))
      return
    }

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

    await MarketApplicationV2.#executePurchase.call(this, { item, entry: negotiatedEntry, buyer })
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
      entry = createMarketEntry(rawItem, { sourceType: 'world', sourceId: item.uuid ?? '' }, { ...DEFAULT_MARKET_CONTEXT, marketType: activeMarketType })
    } catch (err) {
      logger.warn(`[Market] Could not build market entry for "${uuid}": ${err.message}`)
      ui.notifications.error(game.i18n.localize('MARKET.Purchase.Error.ItemNotFound'))
      return
    }

    // Availability check: items with high rarity or restricted status require a skill test before purchase.
    const checkSpec = resolveAvailabilityCheck({
      rarity: entry.rarity,
      restrictionLevel: entry.restrictionLevel,
    })

    if (checkSpec.required) {
      const checkResult = await AvailabilityCheckDialog.prompt({ entry, buyer, checkSpec })

      if (!checkResult?.passed) {
        logger.debug('[Market] Availability check not passed — purchase aborted', { uuid, checkSpec })
        const skillName = SYSTEM.SKILLS[checkSpec.skillKey]?.name ?? checkSpec.skillKey
        ui.notifications.warn(
          game.i18n.format('MARKET.AvailabilityCheck.FailedNotification', {
            skill: skillName,
            item: entry.name,
          }),
        )
        return
      }

      logger.info('[Market] Availability check passed — proceeding with purchase', { uuid, skillKey: checkSpec.skillKey })

      // Apply commerce outcome if the check result carries narrative dice data (Tranche 2).
      // Non-blocking: if testResult is absent or malformed, the purchase proceeds unchanged.
      const testResult = checkResult?.testResult ?? null
      if (testResult) {
        try {
          const commerceOutcome = computeCommerceOutcome(testResult)
          const basePrice = entry.priceResult.finalPrice
          const modifiedPrice = Math.max(0, Math.floor(basePrice * (1 + commerceOutcome.priceModifier)))
          entry = {
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
        } catch (outcomeErr) {
          logger.warn('[Market] Could not apply commerce outcome — proceeding with base price', outcomeErr)
        }
      }
    }

    await MarketApplicationV2.#executePurchase.call(this, { item, entry, buyer })
  }

  /**
   * Shared purchase execution logic used by both buyItem and negotiateItem.
   * Shows consequences dialog, confirmation dialog, then mutates the actor inventory.
   *
   * @this {MarketApplicationV2}
   * @param {object} params
   * @param {Item}   params.item     The resolved Foundry Item document.
   * @param {import('../../lib/market/market-entry.mjs').MarketEntry} params.entry  The market entry (may have negotiated price).
   * @param {Actor}  params.buyer    The buyer actor.
   * @returns {Promise<void>}
   */
  static async #executePurchase({ item, entry, buyer }) {
    const validation = validatePurchase({ actor: buyer, entry })
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

    // Confirmation dialog
    const i18n = game.i18n
    const currentCredits = buyer.system?.creditBudget?.availableCredits ?? buyer.system?.credits ?? 0
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: i18n.format('MARKET.Purchase.Confirm.Title', { name: entry.name }),
      },
      content: `<p>${i18n.format('MARKET.Purchase.Confirm.Content', {
        name: entry.name,
        price: validation.finalPrice,
        credits: currentCredits,
        remaining: validation.creditsAfter,
      })}</p>`,
      yes: {
        label: i18n.format('MARKET.Purchase.Confirm.Buy', { price: validation.finalPrice }),
        icon: 'fa-solid fa-coins',
      },
      no: {
        label: i18n.localize('MARKET.Purchase.Confirm.Cancel'),
        icon: 'fa-solid fa-xmark',
      },
    })

    if (!confirmed) return

    // Re-validate at mutation time (credits might have changed since dialog opened)
    const finalValidation = validatePurchase({ actor: buyer, entry })
    if (!finalValidation.canPurchase) {
      ui.notifications.warn(game.i18n.localize(finalValidation.messageKey ?? 'MARKET.Purchase.Error.InsufficientCredits'))
      return
    }

    try {
      // Add a copy of the item to the buyer's inventory.
      // Credit deduction is now derived automatically via _prepareCredits() when the item
      // is added — no direct update of system.credits is needed.
      const itemData = item.toObject()
      await buyer.createEmbeddedDocuments('Item', [itemData])

      // Phase 7a: Store all accepted consequences as actor flags (generalised from blackMarketDebt only)
      // Re-evaluate consequences to get full objects for serialization.
      const allConsequences = evaluateMarketConsequences({ entry, marketType: activeMarketType, actor: buyer })
      for (const acceptedType of consequencesResult.acceptedTypes) {
        const consequence = allConsequences.find((c) => c.type === acceptedType)
        if (consequence) {
          await MarketApplicationV2.#storeMarketConsequence({ buyer, consequence, finalPrice: finalValidation.finalPrice })
        }
      }

      // Record item purchase in audit log (non-blocking)
      try {
        const { recordItemPurchase } = await import('../../utils/audit-log.mjs')
        await recordItemPurchase(buyer, {
          itemName: entry.name,
          itemType: item.type,
          price: finalValidation.finalPrice,
          quantity: 1,
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
          price: finalValidation.finalPrice,
          remaining: finalValidation.creditsAfter,
        }),
      )

      logger.info('[Market] Purchase completed', {
        actorId: buyer.id,
        actorName: buyer.name,
        itemUuid: entry.uuid,
        itemName: entry.name,
        price: finalValidation.finalPrice,
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
    // 1. Collect all sellable items and normalise fields
    const allItems = []

    for (const item of actor.items ?? []) {
      if (!(item.type in PURCHASABLE_ITEM_TYPES)) continue
      const basePrice = item.system?._source?.price ?? item.system?.price ?? 0
      const valuation = computeResalePrice({ basePrice, negotiationOutcome: 'failure' })
      const typeConfig = PURCHASABLE_ITEM_TYPES[item.type]

      allItems.push({
        id: item.id,
        name: item.name,
        img: item.img ?? '',
        type: item.type,
        typeLabel: typeConfig?.label ?? item.type,
        basePrice,
        resaleEstimate: valuation.resalePrice,
        resaleFraction: Math.round(valuation.fraction * 100),
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

    // Validate sale eligibility
    const validation = validateSale({ actor: seller, item })
    if (!validation.canSell) {
      ui.notifications.warn(game.i18n.localize(validation.messageKey))
      return
    }

    // Compute base resale estimate (25% — may be improved by negotiation)
    const baseValuation = computeResalePrice({ basePrice: validation.basePrice, negotiationOutcome: 'failure' })

    // Confirmation dialog
    const i18n = game.i18n
    const currentCredits = seller.system?.creditBudget?.availableCredits ?? seller.system?.credits ?? 0
    const creditsAfterBase = currentCredits + baseValuation.resalePrice

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: i18n.format('MARKET.Sell.Confirm.Title', { name: item.name }),
      },
      content: `<p>${i18n.format('MARKET.Sell.Confirm.Content', {
        name: item.name,
        price: baseValuation.resalePrice,
        credits: currentCredits,
        remaining: creditsAfterBase,
      })}</p>`,
      yes: {
        label: i18n.format('MARKET.Sell.Confirm.Sell', { price: baseValuation.resalePrice }),
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

    let finalValuation = baseValuation
    if (offerNegotiation) {
      const negotiationResult = await NegotiationDialog.prompt({ entry: { name: item.name, rarity: item.system?.rarity ?? 0 }, buyer: seller, forSale: true })

      if (negotiationResult?.confirmed) {
        finalValuation = computeResalePrice({
          basePrice: validation.basePrice,
          negotiationOutcome: negotiationResult.outcome,
        })
      }
    }

    // Execute sale: delete item then credit actor
    try {
      await seller.deleteEmbeddedDocuments('Item', [item.id])
      const newCredits = currentCredits + finalValuation.resalePrice
      await seller.update({ 'system.credits': newCredits })

      // Record in audit log (non-blocking)
      try {
        const { recordItemSale } = await import('../../utils/audit-log.mjs')
        await recordItemSale(seller, {
          itemName: item.name,
          itemType: item.type,
          basePrice: validation.basePrice,
          resalePrice: finalValuation.resalePrice,
          fraction: finalValuation.fraction,
          negotiationOutcome: finalValuation.outcome,
          creditsAfter: newCredits,
          itemId: item.id,
        })
      } catch (auditErr) {
        logger.warn('[Market] Could not record item sale audit entry', auditErr)
      }

      ui.notifications.info(
        i18n.format('MARKET.Sale.Success', {
          name: item.name,
          price: finalValuation.resalePrice,
          remaining: newCredits,
        }),
      )

      logger.info('[Market] Item sale completed', {
        actorId: seller.id,
        actorName: seller.name,
        itemId: item.id,
        itemName: item.name,
        basePrice: validation.basePrice,
        resalePrice: finalValuation.resalePrice,
        creditsAfter: newCredits,
      })

      await this.render()
    } catch (err) {
      logger.error('[Market] Sale failed', err)
      ui.notifications.error(game.i18n.localize('MARKET.Sale.Error.WriteFailed'))
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners                             */
  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options)
    const html = this.element
    if (!html) return

    // Market type selector — updates activeMarketType and re-renders catalogue
    const marketTypeSelect = html.querySelector('.market-selector__select')
    if (marketTypeSelect) {
      marketTypeSelect.addEventListener('change', (event) => {
        const marketType = event.currentTarget.value ?? DEFAULT_MARKET_TYPE
        if (!(marketType in MARKET_TYPES)) return
        this._viewState = { ...this._viewState, activeMarketType: marketType }
        logger.debug('[Market] Market type changed via selector', { marketType })
        this.render()
      })
    }

    // Search input — update on every keystroke
    const searchInput = html.querySelector('.market-toolbar__search')
    if (searchInput) {
      searchInput.addEventListener('input', (event) => {
        this._viewState = { ...this._viewState, search: event.currentTarget.value ?? '' }
        this.render()
      })
    }

    // Filter selects — update on change
    const typeSelect = html.querySelector('.market-toolbar__filter--type')
    if (typeSelect) {
      typeSelect.addEventListener('change', (event) => {
        this._viewState = { ...this._viewState, filterType: event.currentTarget.value ?? '' }
        this.render()
      })
    }

    const sourceSelect = html.querySelector('.market-toolbar__filter--source')
    if (sourceSelect) {
      sourceSelect.addEventListener('change', (event) => {
        this._viewState = { ...this._viewState, filterSource: event.currentTarget.value ?? '' }
        this.render()
      })
    }

    const restrictionSelect = html.querySelector('.market-toolbar__filter--restriction')
    if (restrictionSelect) {
      restrictionSelect.addEventListener('change', (event) => {
        this._viewState = { ...this._viewState, filterRestriction: event.currentTarget.value ?? '' }
        this.render()
      })
    }

    // Affordable only checkbox — only active when a buyer is set
    const affordableOnlyCheckbox = html.querySelector('.market-toolbar__filter--affordable-only')
    if (affordableOnlyCheckbox) {
      affordableOnlyCheckbox.addEventListener('change', (event) => {
        this._viewState = { ...this._viewState, affordableOnly: event.currentTarget.checked }
        this.render()
      })
    }

    // Sort field select
    const sortBySelect = html.querySelector('.market-toolbar__sort--field')
    if (sortBySelect) {
      sortBySelect.addEventListener('change', (event) => {
        this._viewState = { ...this._viewState, sortBy: event.currentTarget.value ?? MARKET_SORT_FIELDS.name }
        this.render()
      })
    }

    // Sort direction toggle
    const sortDirSelect = html.querySelector('.market-toolbar__sort--direction')
    if (sortDirSelect) {
      sortDirSelect.addEventListener('change', (event) => {
        this._viewState = { ...this._viewState, sortDirection: event.currentTarget.value === 'desc' ? 'desc' : 'asc' }
        this.render()
      })
    }

    // Sell-mode toolbar: inventory search input
    const inventorySearchInput = html.querySelector('.market-inventory-toolbar__search')
    if (inventorySearchInput) {
      inventorySearchInput.addEventListener('input', (event) => {
        this._viewState = { ...this._viewState, inventorySearch: event.currentTarget.value ?? '' }
        this.render()
      })
    }

    // Sell-mode toolbar: inventory sort field
    const inventorySortBySelect = html.querySelector('.market-inventory-toolbar__sort--field')
    if (inventorySortBySelect) {
      inventorySortBySelect.addEventListener('change', (event) => {
        this._viewState = { ...this._viewState, inventorySortBy: event.currentTarget.value ?? INVENTORY_SORT_FIELDS.name }
        this.render()
      })
    }

    // Sell-mode toolbar: inventory sort direction
    const inventorySortDirSelect = html.querySelector('.market-inventory-toolbar__sort--direction')
    if (inventorySortDirSelect) {
      inventorySortDirSelect.addEventListener('change', (event) => {
        this._viewState = { ...this._viewState, inventorySortDirection: event.currentTarget.value === 'desc' ? 'desc' : 'asc' }
        this.render()
      })
    }
  }
}
