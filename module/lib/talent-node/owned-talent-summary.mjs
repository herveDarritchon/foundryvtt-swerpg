import { logger } from '../../utils/logger.mjs'
import { resolveSpecializationTree } from './talent-tree-resolver.mjs'

/**
 * @typedef {Object} OwnedTalentSource
 * @property {string} specializationId
 * @property {string|null} specializationName
 * @property {string} treeId
 * @property {string|null} treeName
 * @property {string} nodeId
 * @property {string} resolutionState - 'ok' | 'specialization-not-found' | 'tree-unresolved' | 'tree-incomplete' | 'node-missing'
 */

/**
 * @typedef {Object} OwnedTalentSummaryEntry
 * @property {string} talentId
 * @property {string|null} name
 * @property {string|null} activation
 * @property {boolean|null} isRanked
 * @property {number|null} rank
 * @property {OwnedTalentSource[]} sources
 */

/**
 * Build a consolidated summary of talents owned by an actor from talentPurchases.
 *
 * The summary is derived, not persisted. It groups purchases by talentId,
 * resolves source specialization/tree/node information, and enriches each
 * entry with talent definition metadata when available.
 *
 * @param {object} actor - Actor with system.progression.talentPurchases and system.details.specializations.
 * @param {Map<string, {name?: string, activation?: string, isRanked?: boolean}>} [talentDefinitions] - Map of talentId -> definition.
 * @returns {OwnedTalentSummaryEntry[]}
 */
export function buildOwnedTalentSummary(actor, talentDefinitions = new Map()) {
  const purchases = actor?.system?.progression?.talentPurchases
  if (!Array.isArray(purchases) || purchases.length === 0) return []

  const specMap = buildSpecializationMap(actor)
  const resolvedCache = new Map()
  const grouped = groupByTalentId(purchases)
  const entries = []

  for (const [talentId, group] of grouped) {
    const definition = talentDefinitions.get(talentId) ?? null
    const isRanked = definition?.isRanked ?? null

    const sources = group.map(p => resolveSource(p, specMap, resolvedCache))

    entries.push({
      talentId,
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
 * Group purchases by talentId.
 * @param {Array} purchases
 * @returns {Map<string, Array>}
 */
function groupByTalentId(purchases) {
  return purchases.reduce((acc, p) => {
    const key = p.talentId
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
  const node = tree.system?.nodes?.find(n => n.nodeId === purchase.nodeId)

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
