import { filterByActiveConfig, filterDuplicates } from './source-resolver.mjs'
import { createMarketEntry } from './market-entry.mjs'

/**
 * Load the complete Market catalogue from world and compendium sources.
 *
 * Deep domain function: pure logic, no Foundry dependencies.
 * Handles eligibility, deduplication, and price calculation.
 *
 * Pipeline:
 *  1. Tag each raw item with its source type (_sourceType).
 *  2. Filter out manually excluded items (by UUID in excludedIds).
 *  3. Create a MarketEntry per item via createMarketEntry (throws for non-purchasable types → skip).
 *  4. Filter to eligible entries only.
 *  5. Apply active config (enabledSources, allowedItemTypes).
 *  6. Deduplicate by strategy.
 *
 * @param {Object} options
 * @param {Array<import('./market-entry.mjs').RawItem>} options.worldItems         Raw items from game.items or fallback
 * @param {Array<import('./market-entry.mjs').RawItem>} options.compendiumItems    Raw items from game.packs, with _sourceId
 * @param {import('../../config/market.mjs').MarketConfig} options.config          Market runtime config
 * @param {Partial<import('../../config/market.mjs').MarketContext>} options.marketContext  Price context
 * @param {string[]} [options.excludedIds]  Array of item UUIDs manually excluded by the GM
 * @returns {import('./market-entry.mjs').MarketEntry[]}  Eligible, deduplicated, priced entries
 */
export function loadMarketCatalog({ worldItems, compendiumItems, config, marketContext, excludedIds = [] }) {
  const excludedSet = new Set(excludedIds)

  // 1. Merge sources with proper source type tagging
  const allRawItems = [
    ...worldItems.map((item) => ({ ...item, _sourceType: 'world' })),
    ...compendiumItems.map((item) => ({ ...item, _sourceType: 'compendium' })),
  ].filter((item) => !excludedSet.has(item.uuid))

  // 2. Create market entries — skip items whose type is not purchasable
  const entries = allRawItems
    .map((rawItem) => {
      try {
        // For world items, uuid is the source identifier; for compendium items, _sourceId (pack collection) is used.
        const sourceId = rawItem._sourceType === 'compendium' ? (rawItem._sourceId ?? '') : (rawItem.uuid ?? '')
        return createMarketEntry(rawItem, { sourceType: rawItem._sourceType, sourceId }, marketContext)
      } catch {
        // createMarketEntry throws TypeError for non-purchasable item types — skip silently
        return null
      }
    })
    .filter(Boolean)

  // 3. Filter to eligible entries only
  const eligible = entries.filter((entry) => entry.eligible)

  // 4. Filter by active config (enabledSources, allowedItemTypes)
  const filtered = filterByActiveConfig(eligible, config.enabledSources, config.allowedItemTypes)

  // 5. Deduplicate per strategy
  return filterDuplicates(filtered, config.dedupStrategy)
}
