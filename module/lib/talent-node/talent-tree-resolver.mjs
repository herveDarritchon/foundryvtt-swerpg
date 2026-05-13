import { logger } from '../../utils/logger.mjs'

/**
 * Determine whether a specialization tree is structurally usable.
 * @param {Item|object|null} tree - The specialization-tree item to inspect.
 * @returns {'available'|'incomplete'}
 */
export function getSpecializationTreeResolutionState(tree) {
  const nodes = Array.isArray(tree?.system?.nodes) ? tree.system.nodes : []
  const connections = Array.isArray(tree?.system?.connections) ? tree.system.connections : []

  return nodes.length > 0 && connections.length > 0 ? 'available' : 'incomplete'
}

/**
 * Resolve a single owned specialization to its reference tree.
 * @param {object} specializationData - An entry from actor.system.details.specializations.
 * @returns {{ tree: Item|object|null, state: 'available'|'unresolved'|'incomplete' }}
 */
export function resolveSpecializationTree(specializationData = {}) {
  if (game?.ready === false) {
    logger.debug('[TalentTreeResolver] Game not ready; specialization tree resolution skipped', {
      specializationId: specializationData?.specializationId,
      treeUuid: specializationData?.treeUuid,
    })
    return { tree: null, state: 'unresolved' }
  }

  const { specializationId, treeUuid } = specializationData

  if (treeUuid) {
    try {
      const tree = fromUuidSync(treeUuid)
      if (tree?.type === 'specialization-tree') {
        return { tree, state: getSpecializationTreeResolutionState(tree) }
      }
    } catch (error) {
      logger.warn('[TalentTreeResolver] Failed to resolve specialization tree UUID', {
        specializationId,
        treeUuid,
        error,
      })
    }
  }

  if (specializationId && game?.items?.find) {
    const tree = game.items.find((item) => item?.type === 'specialization-tree' && item?.system?.specializationId === specializationId)
    if (tree) {
      return { tree, state: getSpecializationTreeResolutionState(tree) }
    }
  }

  if (!specializationId && !treeUuid) {
    logger.warn('[TalentTreeResolver] Owned specialization is missing specializationId and treeUuid', {
      specializationData,
    })
  }

  return { tree: null, state: 'unresolved' }
}

/**
 * Resolve all owned specializations for an actor.
 * @param {Actor|object} actor - The actor owning specializations.
 * @returns {Map<string, { tree: Item|object|null, state: 'available'|'unresolved'|'incomplete' }>}
 */
export function resolveActorSpecializationTrees(actor) {
  const specializations = Array.from(actor?.system?.details?.specializations || [])

  return new Map(
    specializations.map((specialization, index) => {
      const key = specialization?.specializationId || specialization?.treeUuid || specialization?.name || `specialization-${index}`
      return [key, resolveSpecializationTree(specialization)]
    }),
  )
}
