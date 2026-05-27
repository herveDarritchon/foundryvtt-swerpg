import { logger } from '../../utils/logger.mjs'
import { resolveSpecializationTree } from './talent-tree-resolver.mjs'

/**
 * @typedef {Object} OwnedTalentSource
 * @property {string} specializationId
 * @property {string|null} specializationName
 * @property {string} treeId
 * @property {string|null} treeName
 * @property {string} nodeId
 * @property {string} resolutionState - 'ok' | 'specialization-not-found' | 'tree-unresolved' | 'tree-incomplete' | 'node-missing' | 'species'
 * @property {string|null} [speciesName] - Present when resolutionState is 'species'
 */

/**
 * @typedef {Object} OwnedTalentSummaryEntry
 * @property {string} talentId
 * @property {string|null} talentUuid
 * @property {string|null} name
 * @property {string|null} activation
 * @property {boolean|null} isRanked
 * @property {number|null} rank
 * @property {OwnedTalentSource[]} sources
 */

/**
 * Build a consolidated summary of talents owned by an actor from talentPurchases
 * and free species talents embedded on the actor.
 *
 * The summary is derived, not persisted. It groups purchases by talentId,
 * resolves source specialization/tree/node information, and enriches each
 * entry with talent definition metadata when available.
 *
 * Free species talents (actor.items where type === 'talent' and system.isFree === true)
 * are merged into the result with a synthetic 'species' source. Their rank contribution
 * is counted alongside tree purchases for ranked talents.
 *
 * @param {object} actor Actor with system.progression.talentPurchases, system.details.specializations, system.details.species, and items.
 * @param {Map<string, {name?: string, activation?: string, isRanked?: boolean}>} [talentDefinitions] Map of talentId -> definition.
 * @returns {OwnedTalentSummaryEntry[]}
 */
export function buildOwnedTalentSummary(actor, talentDefinitions = new Map()) {
  const purchases = actor?.system?.progression?.talentPurchases ?? []
  const speciesName = actor?.system?.details?.species?.name ?? null

  const specMap = buildSpecializationMap(actor)
  const resolvedCache = new Map()

  // Group tree purchases by talentId key
  const grouped = Array.isArray(purchases) && purchases.length > 0 ? groupByTalentKey(purchases) : new Map()

  // Collect free species talents from embedded items
  const freeSpeciesTalents = collectFreeSpeciesTalents(actor, speciesName)

  if (grouped.size === 0 && freeSpeciesTalents.length === 0) return []

  // Merge free species talents into the grouped map using their talentId as key
  for (const freeEntry of freeSpeciesTalents) {
    const key = freeEntry.talentId
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key).push(freeEntry)
  }

  const entries = []

  for (const [, group] of grouped) {
    const first = group[0]
    const talentUuid = first.talentUuid ?? null
    const talentId = first.talentId

    // Prefer UUID-based definition lookup, fallback to business key
    const definition = talentUuid && talentDefinitions.has(talentUuid) ? talentDefinitions.get(talentUuid) : (talentDefinitions.get(talentId) ?? null)
    const isRanked = definition?.isRanked ?? null

    const sources = group.map((p) => {
      if (p._isFreeSpecies) {
        return buildSpeciesSource(p, speciesName)
      }
      return resolveSource(p, specMap, resolvedCache)
    })

    entries.push({
      talentId,
      talentUuid,
      name: definition?.name ?? null,
      activation: definition?.activation ?? null,
      isRanked,
      rank: isRanked === true ? sources.length : null,
      sources,
    })
  }

  return entries
}

/**
 * Collect free species talents from actor embedded items.
 * Returns synthetic purchase-like objects that carry a _isFreeSpecies flag.
 * @param {object} actor
 * @param {string|null} speciesName
 * @returns {Array<{talentId: string, talentUuid: string|null, _isFreeSpecies: true, speciesName: string|null}>}
 */
function collectFreeSpeciesTalents(actor, speciesName) {
  const items = actor?.items
  if (!items) return []

  // items may be a Map (Foundry Collection) or an array
  const itemList = typeof items[Symbol.iterator] === 'function' ? Array.from(items.values ? items.values() : items) : []

  return itemList
    .filter((item) => item?.type === 'talent' && item?.system?.isFree === true)
    .map((item) => ({
      talentId: item.system?.id || item.id,
      talentUuid: item.uuid ?? null,
      _isFreeSpecies: true,
      speciesName,
    }))
}

/**
 * Build a synthetic species source entry for a free talent.
 * @param {{ speciesName: string|null }} freeEntry
 * @param {string|null} speciesName
 * @returns {OwnedTalentSource}
 */
function buildSpeciesSource(freeEntry) {
  return {
    specializationId: null,
    specializationName: null,
    treeId: null,
    treeName: null,
    nodeId: null,
    resolutionState: 'species',
    speciesName: freeEntry.speciesName ?? null,
  }
}

/**
 * Build a Map from specializationId to specialization data for owned specializations.
 * @param {object} actor
 * @returns {Map<string, object>}
 */
function buildSpecializationMap(actor) {
  const specs = actor?.system?.details?.specializations
  if (!specs) return new Map()
  const map = new Map()
  for (const spec of specs) {
    if (spec?.specializationId) {
      map.set(spec.specializationId, spec)
    }
  }
  return map
}

/**
 * Group purchases by talentUuid ?? talentId for UUID-aware deduplication.
 * @param {Array} purchases
 * @returns {Map<string, Array>}
 */
function groupByTalentKey(purchases) {
  return purchases.reduce((acc, p) => {
    const key = p.talentUuid ?? p.talentId
    if (!acc.has(key)) acc.set(key, [])
    acc.get(key).push(p)
    return acc
  }, new Map())
}

/**
 * Resolve source information for a single purchase.
 * @param {object} purchase
 * @param {Map<string, object>} specMap
 * @param {Map<string, object>} resolvedTreeCache
 * @returns {OwnedTalentSource}
 */
function resolveSource(purchase, specMap, resolvedTreeCache) {
  const spec = specMap.get(purchase.specializationId)
  if (!spec) {
    return {
      specializationId: purchase.specializationId,
      specializationName: null,
      treeId: purchase.treeId,
      treeName: null,
      nodeId: purchase.nodeId,
      resolutionState: 'specialization-not-found',
    }
  }

  const resolved = resolveTreeCached(spec, resolvedTreeCache)
  if (!resolved.tree) {
    const stateName = resolved.state === 'incomplete' ? 'tree-incomplete' : 'tree-unresolved'
    return {
      specializationId: purchase.specializationId,
      specializationName: spec.name ?? null,
      treeId: purchase.treeId,
      treeName: null,
      nodeId: purchase.nodeId,
      resolutionState: stateName,
    }
  }

  const tree = resolved.tree
  const node = tree.system?.nodes?.find((n) => n.nodeId === purchase.nodeId)

  return {
    specializationId: purchase.specializationId,
    specializationName: spec.name ?? null,
    treeId: tree.id ?? tree._id,
    treeName: tree.name ?? null,
    nodeId: purchase.nodeId,
    resolutionState: node ? 'ok' : 'node-missing',
  }
}

/**
 * Resolve a specialization tree with per-specialization caching.
 * @param {object} specializationData
 * @param {Map<string, object>} cache
 * @returns {{ tree: object|null, state: string }}
 */
function resolveTreeCached(specializationData, cache) {
  const key = specializationData.specializationId
  if (!cache.has(key)) {
    try {
      cache.set(key, resolveSpecializationTree(specializationData))
    } catch (err) {
      logger.warn('[OwnedTalentSummary] resolveSpecializationTree threw unexpectedly', {
        specializationId: key,
        error: err.message,
      })
      cache.set(key, { tree: null, state: 'unresolved' })
    }
  }
  return cache.get(key)
}
