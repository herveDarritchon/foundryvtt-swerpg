/**
 * @typedef {Object} MarketSourceConfig
 * @property {string}   id            Unique source identifier
 * @property {string}   sourceType    Key of SOURCE_TYPES
 * @property {string}   label         Display label
 * @property {boolean}  enabled       Whether this source is active
 * @property {string[]} allowedTypes  Item types this source provides, or ['*'] for all
 */

/**
 * @typedef {Object} MarketSource
 * @property {string} id          Source identifier
 * @property {string} sourceType  Key of SOURCE_TYPES
 * @property {string} label       Display label
 * @property {boolean} enabled    Whether active
 */

/* -------------------------------------------- */

/**
 * Deduplication strategies for Market entries.
 * @enum {string}
 */
export const DEDUP_STRATEGIES = Object.freeze({
  PREFER_COMPENDIUM: 'prefer-compendium',
  PREFER_NEWEST: 'prefer-newest',
  KEEP_ALL: 'keep-all',
})

/* -------------------------------------------- */

/**
 * Resolve the active Market sources from a list of source configurations.
 *
 * Filters out disabled sources and returns the enabled ones matching the
 * available source pool. If `allSources` is not provided, all enabled
 * `sourceConfigs` are returned as-is.
 *
 * No Foundry dependencies — accepts plain objects only.
 *
 * @param {MarketSourceConfig[]} sourceConfigs  Configured sources (from settings or static config)
 * @param {MarketSource[]}       [allSources]   Full pool of available sources to match against
 * @returns {MarketSourceConfig[]} Active, enabled sources
 */
export function resolveMarketSources(sourceConfigs, allSources) {
  if (!Array.isArray(sourceConfigs)) {
    return []
  }

  const enabled = sourceConfigs.filter((s) => s.enabled === true)

  if (!Array.isArray(allSources)) {
    return enabled
  }

  const availableIds = new Set(allSources.map((s) => s.id))
  return enabled.filter((s) => availableIds.has(s.id))
}

/* -------------------------------------------- */

/**
 * Filter a list of Market entries to only those whose `sourceType` is in the
 * active enabled-sources list and whose `itemType` is in the allowed-types list.
 *
 * - An empty `enabledSources` array means no source is active — all entries are removed.
 * - An empty `allowedItemTypes` array means no type is allowed — all entries are removed.
 *
 * No Foundry dependencies — accepts plain objects only.
 *
 * @template {object} T
 * @param {T[]}      entries           List of entries with at least `{ sourceType, itemType }` shape
 * @param {string[]} enabledSources    List of allowed source type keys
 * @param {string[]} allowedItemTypes  List of allowed item type keys
 * @returns {T[]} Filtered entries
 */
export function filterByActiveConfig(entries, enabledSources, allowedItemTypes) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return []
  }

  const sourceSet = new Set(Array.isArray(enabledSources) ? enabledSources : [])
  const typeSet = new Set(Array.isArray(allowedItemTypes) ? allowedItemTypes : [])

  return entries.filter((entry) => sourceSet.has(entry.sourceType) && typeSet.has(entry.itemType))
}

/* -------------------------------------------- */

/**
 * @typedef {Object} DedupEntry
 * @property {string} name        Display name used as dedup key (case-insensitive)
 * @property {string} itemType    Item type used as dedup key
 * @property {string} sourceType  Source type (used by prefer-compendium strategy)
 * @property {number} [createdAt] Timestamp (used by prefer-newest strategy)
 */

/**
 * Filter duplicate Market entries using the given deduplication strategy.
 *
 * Strategies:
 * - `'prefer-compendium'`  If two entries share the same name+type, keep the compendium version.
 * - `'prefer-newest'`      Keep the entry with the highest `createdAt` timestamp.
 * - `'keep-all'`           No deduplication — return the input as-is.
 *
 * Comparison key: `name.toLowerCase() + ':' + itemType`
 *
 * No Foundry dependencies — accepts plain objects only.
 *
 * @template {DedupEntry} T
 * @param {T[]}   entries   List of Market entries to deduplicate
 * @param {string} [strategy='prefer-compendium']  One of DEDUP_STRATEGIES values
 * @returns {T[]} Deduplicated list in the same order as input (first-seen wins on tie)
 */
export function filterDuplicates(entries, strategy = DEDUP_STRATEGIES.PREFER_COMPENDIUM) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return []
  }

  if (strategy === DEDUP_STRATEGIES.KEEP_ALL) {
    return [...entries]
  }

  /** @type {Map<string, T>} */
  const seen = new Map()

  for (const entry of entries) {
    const key = `${entry.name?.toLowerCase() ?? ''}:${entry.itemType ?? ''}`

    if (!seen.has(key)) {
      seen.set(key, entry)
      continue
    }

    if (strategy === DEDUP_STRATEGIES.PREFER_COMPENDIUM) {
      const existing = seen.get(key)
      if (entry.sourceType === 'compendium' && existing.sourceType !== 'compendium') {
        seen.set(key, entry)
      }
    } else if (strategy === DEDUP_STRATEGIES.PREFER_NEWEST) {
      const existing = seen.get(key)
      const existingTs = existing.createdAt ?? 0
      const entryTs = entry.createdAt ?? 0
      if (entryTs > existingTs) {
        seen.set(key, entry)
      }
    }
  }

  return [...seen.values()]
}
