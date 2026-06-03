import { PURCHASABLE_ITEM_TYPES } from '../../config/market.mjs'
import { logger } from '../../utils/logger.mjs'

/**
 * Load all purchasable items from Foundry compendium packs.
 *
 * Iterates game.packs, filters Item-type packs, loads the index via getIndex(),
 * and converts each matching document to a RawItem with sourceType='compendium'
 * and sourceId=<pack-collection>.
 *
 * No eligibility checks here — that is done by the domain layer (catalog-loader).
 *
 * @returns {Promise<Array<import('../../lib/market/market-entry.mjs').RawItem>>}
 *   Array of raw items from packs, ready for domain processing
 */
export async function loadCompendiumItems() {
  const compendiumItems = []
  const purchasableTypes = Object.keys(PURCHASABLE_ITEM_TYPES)

  for (const pack of game.packs.values()) {
    // 1. Filter to Item packs only
    if (pack.documentName !== 'Item') continue

    // 2. Load via index (cheaper than getDocuments for large packs)
    let indexEntries = []
    try {
      const index = await pack.getIndex({
        fields: ['name', 'img', 'type', 'system.price', 'system.rarity', 'system.restrictionLevel', 'system.quality'],
      })
      indexEntries = Array.from(index.values())
    } catch (err) {
      logger.warn(`[Market] Could not load index from pack "${pack.collection}": ${err.message}`)
      continue
    }

    // 3. Filter by purchasable type and normalize to RawItem shape
    for (const doc of indexEntries) {
      if (!purchasableTypes.includes(doc.type)) continue

      compendiumItems.push({
        uuid: doc.uuid ?? '',
        name: doc.name ?? '',
        img: doc.img ?? '',
        type: doc.type,
        basePrice: doc.system?.price ?? 0,
        rarity: doc.system?.rarity ?? 0,
        quality: doc.system?.quality ?? '',
        restrictionLevel: doc.system?.restrictionLevel ?? '',
        nonPurchasable: false,
        broken: false,
        _sourceId: pack.collection,
      })
    }
  }

  logger.debug('[Market] Loaded compendium items', { count: compendiumItems.length })
  return compendiumItems
}
