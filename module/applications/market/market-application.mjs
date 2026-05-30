import { createMarketEntry, resolveMarketCatalogVisibility } from '../../lib/market/market-entry.mjs'
import { loadMarketCatalog } from '../../lib/market/catalog-loader.mjs'
import { validatePurchase } from '../../lib/market/purchase.mjs'
import { readMarketConfig } from '../../lib/market/market-settings.mjs'
import { evaluateObtainability } from '../../lib/market/rarity-engine.mjs'
import { CONSEQUENCE_TYPES, evaluateMarketConsequences } from '../../lib/market/consequences.mjs'
import { serializeConsequence } from '../../lib/market/consequence-persistence.mjs'
import { PURCHASABLE_ITEM_TYPES, SOURCE_TYPES, DEFAULT_MARKET_CONTEXT, MARKET_TYPES, DEFAULT_MARKET_TYPE } from '../../config/market.mjs'
import { RESTRICTED_RESTRICTION_LEVELS, BLACK_MARKET_AVAILABILITY_KEYS } from '../../lib/market/consequences.mjs'
import { loadCompendiumItems } from './compendium-source-adapter.mjs'
import NegotiationDialog from './negotiation-dialog.mjs'
import ConsequencesDialog from './consequences-dialog.mjs'
import { buildPurchaseChatData } from './market-chat.mjs'
import { logger } from '../../utils/logger.mjs'

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
 * @property {string} activeMarketType   Active market type key (key of MARKET_TYPES)
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
      buyItem: MarketApplicationV2.#onBuyItem,
      negotiateItem: MarketApplicationV2.#onNegotiateItem,
      changeMarket: MarketApplicationV2.#onChangeMarket,
    },
  }

  /** @override */
  static PARTS = {
    catalog: {
      template: 'systems/swerpg/templates/market/market.hbs',
      scrollable: ['.market-catalog'],
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
    if (partId === 'catalog') {
      const buyer = this._buyerActor
      const buyerCredits = buyer?.system?.creditBudget?.availableCredits ?? buyer?.system?.credits ?? null

      context.catalog = await this.#prepareCatalog(buyer, buyerCredits)
      context.viewState = { ...this._viewState }
      context.sortOptions = this.#buildSortOptions()
      context.typeFilterOptions = this.#buildTypeFilterOptions()
      context.sourceFilterOptions = this.#buildSourceFilterOptions()
      context.restrictionFilterOptions = this.#buildRestrictionFilterOptions()
      context.marketTypeOptions = this.#buildMarketTypeOptions()
      context.buyer = buyer
        ? {
            id: buyer.id,
            name: buyer.name,
            credits: buyerCredits,
          }
        : null
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
   * Build the list of restriction level filter options.
   * First entry is the "all restrictions" placeholder.
   * @returns {Array<{value: string, label: string}>}
   */
  #buildRestrictionFilterOptions() {
    const allOption = { value: '', label: 'MARKET.Toolbar.Filter.AllRestrictions' }
    const restrictionOptions = [
      { value: 'restricted', label: 'MARKET.Restriction.Restricted' },
      { value: 'illegal', label: 'MARKET.Restriction.Illegal' },
      { value: 'licensed', label: 'MARKET.Restriction.Licensed' },
    ]
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

    // 1. Load world items
    const worldItems = Array.from(game.items).map((item) => itemToRawItem(item))

    // 2. Load compendium items (async)
    let compendiumItems = []
    try {
      compendiumItems = await loadCompendiumItems()
    } catch (err) {
      logger.warn('[Market] Could not load compendium items', err)
    }

    // 3. Delegate to domain loader (handles eligibility, config filtering, dedup)
    let allEntries
    try {
      allEntries = loadMarketCatalog({
        worldItems,
        compendiumItems,
        config: marketConfig,
        marketContext,
      })
    } catch (err) {
      logger.error('[Market] Catalog loading failed', err)
      allEntries = []
    }

    // 4. Apply market-type visibility rules (hide items whose availability is not allowed in this market)
    const visibleEntries = allEntries.filter((entry) => {
      const { visible } = resolveMarketCatalogVisibility(entry, activeMarketType)
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
    const annotated = sorted.map((entry) => {
      const validation = validatePurchase({ actor: buyer, entry })
      const obtainability = evaluateObtainability({ rarity: entry.rarity, marketType: activeMarketType })
      const marketDef = MARKET_TYPES[activeMarketType]
      const isNegotiable = marketDef?.negotiationAllowed === true
      const isImperialSuspicion = RESTRICTED_RESTRICTION_LEVELS.includes(entry.restrictionLevel ?? '')
      const isBlackMarket = activeMarketType === 'black-market' || BLACK_MARKET_AVAILABILITY_KEYS.includes(entry.availability ?? '')
      return {
        ...entry,
        canBuy: buyer !== null && validation.canPurchase,
        buyBlockedReason: buyer !== null && !validation.canPurchase ? validation.reason : null,
        obtainability,
        isNegotiable,
        isImperialSuspicion,
        isBlackMarket,
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

      // Phase 7b: Produce a ChatMessage documenting the purchase
      await MarketApplicationV2.#sendPurchaseChatMessage({
        buyer,
        entry,
        negotiationOutcome: null,
        consequencesAccepted: consequencesResult.acceptedTypes,
        finalPrice: finalValidation.finalPrice,
      })

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

  /**
   * Create a ChatMessage documenting a completed market purchase.
   * Errors are logged as warnings — a chat failure must never block the purchase.
   *
   * @param {object}   params
   * @param {Actor}    params.buyer                  The buyer actor.
   * @param {import('../../lib/market/market-entry.mjs').MarketEntry} params.entry  The purchased entry.
   * @param {object|null} params.negotiationOutcome  NegotiationResult if negotiation was used.
   * @param {string[]} params.consequencesAccepted   Accepted consequence type keys.
   * @param {number}   params.finalPrice             Price paid.
   * @returns {Promise<void>}
   */
  static async #sendPurchaseChatMessage({ buyer, entry, negotiationOutcome, consequencesAccepted, finalPrice }) {
    try {
      const data = await buildPurchaseChatData({
        buyer,
        entry,
        outcome: negotiationOutcome,
        consequencesAccepted,
        negotiatedPrice: finalPrice,
      })
      if (data) {
        await ChatMessage.create(data)
        logger.debug('[Market] Purchase chat message created', { actorId: buyer.id, itemName: entry.name })
      }
    } catch (err) {
      logger.warn('[Market] Could not create purchase chat message', err)
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
  }
}
