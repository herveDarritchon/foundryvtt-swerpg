import { createMarketEntry } from '../../lib/market/market-entry.mjs'
import { PURCHASABLE_ITEM_TYPES, SOURCE_TYPES } from '../../config/market.mjs'
import { logger } from '../../utils/logger.mjs'

const { api } = foundry.applications

/* -------------------------------------------- */

/**
 * @typedef {Object} MarketViewState
 * @property {string} search         Text search query (matches item name)
 * @property {string} filterType     Item type filter key, or '' for all types
 * @property {string} filterSource   Source type filter key, or '' for all sources
 * @property {string} filterRestriction  Restriction level filter key, or '' for all
 * @property {string} sortBy         Sort field key: 'name' | 'price' | 'rarity'
 * @property {'asc'|'desc'} sortDirection  Sort direction
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
  sortBy: MARKET_SORT_FIELDS.name,
  sortDirection: 'asc',
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
    basePrice: system.price ?? 0,
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
      cmp = a.basePrice - b.basePrice
    } else if (sortBy === MARKET_SORT_FIELDS.rarity) {
      cmp = a.rarity - b.rarity
    }
    return cmp * multiplier
  })
}

/* -------------------------------------------- */

/**
 * The Market application presents a read-only catalogue of World Items that are eligible for purchase.
 * Items are grouped by purchasable type (weapon, armor, gear).
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
      context.catalog = this.#prepareCatalog()
      context.viewState = { ...this._viewState }
      context.sortOptions = this.#buildSortOptions()
      context.typeFilterOptions = this.#buildTypeFilterOptions()
      context.sourceFilterOptions = this.#buildSourceFilterOptions()
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

  /* -------------------------------------------- */

  /**
   * Build the filtered, sorted, and grouped catalogue from World Items.
   * Pipeline: build all eligible entries → apply search → apply filters → sort → group.
   * @returns {{
   *   groups: Array<{typeKey: string, label: string, icon: string, items: MarketEntry[]}>,
   *   isEmpty: boolean,
   *   isFilteredEmpty: boolean,
   *   totalCount: number,
   *   filteredCount: number
   * }}
   */
  #prepareCatalog() {
    // 1. Build all eligible entries from game.items
    const allEntries = []
    for (const item of game.items) {
      try {
        const rawItem = itemToRawItem(item)
        const entry = createMarketEntry(rawItem, { sourceType: 'world', sourceId: item.uuid ?? '' })
        if (!entry.eligible) continue
        allEntries.push(entry)
      } catch (err) {
        // createMarketEntry throws TypeError for non-purchasable item types — skip silently
        logger.debug(`[Market] Skipping item "${item.name}" (type="${item.type}"): ${err.message}`)
      }
    }

    const totalCount = allEntries.length

    // 2. Apply search and filters
    const { search, filterType, filterSource, filterRestriction, sortBy, sortDirection } = this._viewState
    let filtered = filterBySearch(allEntries, search)
    filtered = filterByFilters(filtered, { filterType, filterSource, filterRestriction })

    // 3. Sort
    const sorted = sortEntries(filtered, sortBy, sortDirection)
    const filteredCount = sorted.length

    // 4. Group by item type
    /** @type {Map<string, import('../../lib/market/market-entry.mjs').MarketEntry[]>} */
    const grouped = new Map()
    for (const typeKey of Object.keys(PURCHASABLE_ITEM_TYPES)) {
      grouped.set(typeKey, [])
    }
    for (const entry of sorted) {
      const bucket = grouped.get(entry.itemType)
      if (bucket) bucket.push(entry)
    }

    const groups = Object.entries(PURCHASABLE_ITEM_TYPES)
      .map(([typeKey, typeCfg]) => ({
        typeKey,
        label: typeCfg.label,
        icon: typeCfg.icon,
        items: grouped.get(typeKey) ?? [],
      }))
      .filter((group) => group.items.length > 0)

    const hasActiveFilter = !!(search || filterType || filterSource || filterRestriction)

    return {
      groups,
      isEmpty: totalCount === 0,
      isFilteredEmpty: totalCount > 0 && filteredCount === 0 && hasActiveFilter,
      totalCount,
      filteredCount,
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

  /* -------------------------------------------- */
  /*  Event Listeners                             */
  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options)
    const html = this.element
    if (!html) return

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
