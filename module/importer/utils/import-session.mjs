import { logger } from '../../utils/logger.mjs'

/**
 * @typedef {object} PipelineDescriptor
 * @property {string} id - Unique pipeline identifier
 * @property {string} domain - User-facing domain name
 * @property {string} type - Foundry item type produced
 * @property {Function} contextBuilder - Async function that builds the import context
 * @property {string[]} dependsOn - Mandatory dependencies (must complete before this pipeline)
 * @property {string[]} softDependsOn - Optional dependencies (preferred ordering, not blocking)
 * @property {string[]} producesReferences - Reference types published to the session index
 */

/**
 * @typedef {object} ImportSession
 * @property {Map<string, object[]>} createdByPipeline - Documents created per pipeline id
 * @property {object} referenceIndex - Indexed references for cross-pipeline resolution
 * @property {Array<{domain: string, key: string, reason: string}>} unresolvedReferences - References that could not be resolved
 * @property {string[]} executionOrder - Effective pipeline execution order
 */

/**
 * Create a fresh import session object.
 * @returns {ImportSession}
 */
export function createImportSession() {
  return {
    createdByPipeline: new Map(),
    referenceIndex: {
      talent: {
        byOggdudeKey: new Map(),
        bySystemId: new Map(),
      },
      specializationTree: {
        bySpecializationId: new Map(),
      },
    },
    unresolvedReferences: [],
    executionOrder: [],
  }
}

/**
 * Publish created talent documents into the session reference index.
 * Called after each talent pipeline completes its storage step.
 *
 * @param {ImportSession} session
 * @param {object[]} createdDocuments - Array of Foundry-like document objects with uuid, flags, system
 */
export function publishTalentReferences(session, createdDocuments) {
  if (!Array.isArray(createdDocuments)) return
  for (const doc of createdDocuments) {
    if (!doc) continue
    const uuid = doc.uuid ?? doc._id
    if (!uuid) continue

    const oggdudeKey = doc.flags?.swerpg?.oggdudeKey
    if (oggdudeKey) {
      session.referenceIndex.talent.byOggdudeKey.set(oggdudeKey, uuid)
    }

    const systemId = doc.system?.id
    if (systemId && typeof systemId === 'string') {
      session.referenceIndex.talent.bySystemId.set(systemId.toLowerCase().trim(), uuid)
    }
  }
}

/**
 * Resolve a list of OggDude talent keys to UUIDs using the session index,
 * then game.items as fallback, then game.packs as final fallback.
 *
 * @param {ImportSession} session
 * @param {string[]} keys - OggDude talent keys to resolve
 * @param {string} ownerKey - Source entity key (for diagnostics)
 * @returns {{ resolvedUUIDs: string[], unresolvedKeys: string[] }}
 */
export function resolveTalentKeysFromSession(session, keys, ownerKey = '') {
  if (!Array.isArray(keys)) return { resolvedUUIDs: [], unresolvedKeys: [] }

  const resolvedUUIDs = []
  const unresolvedKeys = []

  for (const key of keys) {
    if (!key) continue

    // 1. Session index (from current batch)
    const sessionUUID = session.referenceIndex.talent.byOggdudeKey.get(key)
    if (sessionUUID) {
      resolvedUUIDs.push(sessionUUID)
      logger.debug('[ImportSession] Talent resolved via session index', { key, uuid: sessionUUID })
      continue
    }

    // 2. game.items fallback
    if (typeof game !== 'undefined' && game.items) {
      const worldItem = game.items.find((i) => i.type === 'talent' && (i.getFlag?.('swerpg', 'oggdudeKey') === key || i.system?.key === key || i.name === key))
      if (worldItem) {
        resolvedUUIDs.push(worldItem.uuid)
        logger.debug('[ImportSession] Talent resolved via game.items', { key, uuid: worldItem.uuid })
        continue
      }
    }

    // 3. game.packs fallback
    if (typeof game !== 'undefined' && game.packs) {
      const packMatch = [...(game.packs.values?.() || [])]
        .filter((p) => p.documentName === 'Item' && /talent/i.test(p.title))
        .find((p) => p.index?.find((e) => e.type === 'talent' && (e.flags?.swerpg?.oggdudeKey === key || e.name === key)))

      if (packMatch) {
        const idx = packMatch.index.find((e) => e.type === 'talent' && (e.flags?.swerpg?.oggdudeKey === key || e.name === key))
        if (idx) {
          const uuid = `Compendium.${packMatch.collection}.${idx._id}`
          resolvedUUIDs.push(uuid)
          logger.debug('[ImportSession] Talent resolved via game.packs', { key, uuid })
          continue
        }
      }
    }

    // 4. Unresolved — record for later reconciliation
    unresolvedKeys.push(key)
    session.unresolvedReferences.push({ domain: 'species', key, reason: 'talent-key-not-found', ownerKey })
    logger.debug('[ImportSession] Talent key unresolved', { key, ownerKey })
  }

  return { resolvedUUIDs, unresolvedKeys }
}

/**
 * Resolve a talent by its system.id (used by specialization-tree) from the session index,
 * then world, then compendium.
 *
 * @param {ImportSession} session
 * @param {string} talentId - The talent system.id or oggdudeKey
 * @returns {string|null} UUID if found, null otherwise
 */
export function resolveTalentIdFromSession(session, talentId) {
  if (!talentId) return null
  const key = talentId.toLowerCase().trim()

  // 1. Session index by systemId
  const bySystemId = session.referenceIndex.talent.bySystemId.get(key)
  if (bySystemId) {
    logger.debug('[ImportSession] TalentId resolved via session bySystemId', { talentId, uuid: bySystemId })
    return bySystemId
  }

  // 2. Session index by oggdudeKey (case-insensitive)
  for (const [objKey, uuid] of session.referenceIndex.talent.byOggdudeKey.entries()) {
    if (objKey.toLowerCase() === key) {
      logger.debug('[ImportSession] TalentId resolved via session byOggdudeKey', { talentId, uuid })
      return uuid
    }
  }

  return null
}

/**
 * Perform a topological sort of pipeline descriptors based on their `dependsOn` field.
 * Independent pipelines retain stable relative order from the input array.
 * Soft dependencies are used only for preferred ordering when no hard constraint exists.
 *
 * @param {PipelineDescriptor[]} pipelines - The list of pipeline descriptors to sort
 * @returns {{ sorted: PipelineDescriptor[], hasCycle: boolean, cycleDetails: string[] }}
 */
export function topologicalSort(pipelines) {
  const byId = new Map(pipelines.map((p) => [p.id, p]))
  const sorted = []
  const visiting = new Set()
  const visited = new Set()
  const cycleDetails = []

  function visit(id) {
    if (visited.has(id)) return true
    if (visiting.has(id)) {
      cycleDetails.push(`Cycle detected at: ${id}`)
      return false // cycle
    }

    visiting.add(id)
    const pipeline = byId.get(id)
    if (!pipeline) {
      // Unknown dependency — treat as satisfied (not in selected set)
      visiting.delete(id)
      visited.add(id)
      return true
    }

    for (const dep of pipeline.dependsOn ?? []) {
      if (!byId.has(dep)) continue // dependency not in selected set, skip
      const ok = visit(dep)
      if (!ok) {
        cycleDetails.push(`  required by: ${id}`)
        return false
      }
    }

    visiting.delete(id)
    visited.add(id)
    sorted.push(pipeline)
    return true
  }

  for (const pipeline of pipelines) {
    if (!visited.has(pipeline.id)) {
      const ok = visit(pipeline.id)
      if (!ok) {
        return { sorted: pipelines, hasCycle: true, cycleDetails }
      }
    }
  }

  return { sorted, hasCycle: false, cycleDetails: [] }
}

/**
 * Build the sorted execution list from a set of selected domain ids and the full pipeline registry.
 * Applies topological sort on hard dependencies, preserves stable order for independent pipelines.
 *
 * @param {string[]} selectedDomainIds - The domain IDs checked by the user
 * @param {Map<string, PipelineDescriptor[]>} registry - The full pipeline registry
 * @returns {PipelineDescriptor[]} Sorted pipeline descriptors to execute
 */
export function buildExecutionPlan(selectedDomainIds, registry) {
  const allDescriptors = []

  for (const domainId of selectedDomainIds) {
    const pipelines = registry.get(domainId)
    if (!Array.isArray(pipelines)) continue
    for (const pipeline of pipelines) {
      if (!allDescriptors.find((p) => p.id === pipeline.id)) {
        allDescriptors.push(pipeline)
      }
    }
  }

  const { sorted, hasCycle, cycleDetails } = topologicalSort(allDescriptors)

  if (hasCycle) {
    logger.error('[ImportSession] Dependency cycle detected — falling back to original order', { cycleDetails })
  } else {
    logger.info('[ImportSession] Execution plan computed', {
      order: sorted.map((p) => p.id),
    })
  }

  return sorted
}
