import { createMarketEntry } from '../../lib/market/market-entry.mjs'
import { PURCHASABLE_ITEM_TYPES } from '../../config/market.mjs'
import { logger } from '../../utils/logger.mjs'

const { api } = foundry.applications

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

/**
 * The Market application presents a read-only catalogue of World Items that are eligible for purchase.
 * Items are grouped by purchasable type (weapon, armor, gear).
 * No purchase, no filter, no sort — scope is strictly consultatif for #453.
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
    }
    return context
  }

  /* -------------------------------------------- */

  /**
   * Build the grouped catalogue from World Items.
   * Iterates game.items, calls createMarketEntry for each item, skips ineligible and non-purchasable types.
   * @returns {{ groups: Array<{typeKey: string, label: string, icon: string, items: MarketEntry[]}>, isEmpty: boolean }}
   */
  #prepareCatalog() {
    /** @type {Map<string, import('../../lib/market/market-entry.mjs').MarketEntry[]>} */
    const grouped = new Map()

    // Initialize groups in declared order (weapon, armor, gear)
    for (const typeKey of Object.keys(PURCHASABLE_ITEM_TYPES)) {
      grouped.set(typeKey, [])
    }

    for (const item of game.items) {
      try {
        const rawItem = itemToRawItem(item)
        const entry = createMarketEntry(rawItem, { sourceType: 'world', sourceId: item.uuid ?? '' })
        if (!entry.eligible) continue
        const bucket = grouped.get(entry.itemType)
        if (bucket) bucket.push(entry)
      } catch (err) {
        // createMarketEntry throws TypeError for non-purchasable item types — skip silently
        logger.debug(`[Market] Skipping item "${item.name}" (type="${item.type}"): ${err.message}`)
      }
    }

    const groups = Object.entries(PURCHASABLE_ITEM_TYPES)
      .map(([typeKey, typeCfg]) => ({
        typeKey,
        label: typeCfg.label,
        icon: typeCfg.icon,
        items: grouped.get(typeKey) ?? [],
      }))
      .filter((group) => group.items.length > 0)

    return { groups, isEmpty: groups.length === 0 }
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
}
