import { logger } from '../../utils/logger.mjs'

export const NODE_STATE = Object.freeze({
  PURCHASED: 'purchased',
  AVAILABLE: 'available',
  LOCKED: 'locked',
  INVALID: 'invalid',
})

export const REASON_CODE = Object.freeze({
  ALREADY_PURCHASED: 'already-purchased',
  SPECIALIZATION_NOT_OWNED: 'specialization-not-owned',
  TREE_NOT_FOUND: 'tree-not-found',
  TREE_INCOMPLETE: 'tree-incomplete',
  NODE_NOT_FOUND: 'node-not-found',
  NODE_INVALID: 'node-invalid',
  NODE_LOCKED: 'node-locked',
  NOT_ENOUGH_XP: 'not-enough-xp',
  NODE_NOT_PURCHASED: 'node-not-purchased',
  NODE_HAS_DEPENDENTS: 'node-has-dependents',
})

/**
 * Build a structured node state result object.
 * @param {string} state
 * @param {string} reasonCode
 * @param {object} details
 */
function makeResult(state, reasonCode, details = {}) {
  return { state, reasonCode, details }
}

/**
 * Return true if the actor currently owns the specialization identified by specializationId.
 * @param {object} actor
 * @param {string} specializationId
 */
function isSpecializationOwned(actor, specializationId) {
  const specs = actor?.system?.details?.specializations
  if (!specs) return false
  for (const spec of specs) {
    if (spec?.specializationId === specializationId) return true
  }
  return false
}

/**
 * Find and return the node with the given nodeId within the tree's nodes array, or undefined if not found.
 * @param {object} tree
 * @param {string} nodeId
 */
function findNode(tree, nodeId) {
  const nodes = tree?.system?.nodes
  if (!Array.isArray(nodes)) return undefined
  return nodes.find((n) => n?.nodeId === nodeId)
}

/**
 * Return true if the actor has a recorded purchase matching the given tree, node, talent, and specialization.
 * @param {object} actor
 * @param {string} treeId
 * @param {string} nodeId
 * @param {string} talentId
 * @param {string} specializationId
 * @param {object} root0
 * @param {string|undefined} root0.treeUuid
 * @param {string|undefined} root0.talentUuid
 */
function hasPurchase(actor, treeId, nodeId, talentId, specializationId, { treeUuid, talentUuid } = {}) {
  const purchases = actor?.system?.progression?.talentPurchases
  if (!Array.isArray(purchases)) return false
  return purchases.some(
    (p) =>
      p.nodeId === nodeId &&
      p.specializationId === specializationId &&
      (treeUuid && p.treeUuid ? p.treeUuid === treeUuid : p.treeId === treeId) &&
      (talentUuid && p.talentUuid ? p.talentUuid === talentUuid : p.talentId === talentId),
  )
}

/**
 * Return true if the node has all mandatory fields populated with valid values.
 * @param {object} node
 */
function hasValidFields(node) {
  if (!node.nodeId || !node.talentId) return false
  if (node.row == null || node.cost == null) return false
  if (typeof node.talentId === 'string' && node.talentId.startsWith('unknown:')) return false
  return true
}

/**
 * Return the list of mandatory field names that are absent or null on the node.
 * @param {object} node
 */
function missingFields(node) {
  const fields = []
  if (!node.nodeId) fields.push('nodeId')
  if (!node.talentId) fields.push('talentId')
  if (node.row == null) fields.push('row')
  if (node.cost == null) fields.push('cost')
  return fields
}

/**
 * Return true if the tree has non-empty nodes and connections arrays and carries no unresolved import flags.
 * @param {object} tree
 */
function isCompleteTree(tree) {
  const nodes = tree?.system?.nodes
  const connections = tree?.system?.connections
  const importFlags = tree?.flags?.swerpg?.import

  if (importFlags?.unresolved || importFlags?.status === 'incomplete' || importFlags?.status === 'invalid') {
    return false
  }

  return Array.isArray(nodes) && nodes.length > 0 && Array.isArray(connections) && connections.length > 0
}

/**
 * Return true if the node is accessible: either it is on row 1, or at least one predecessor node is purchased.
 * @param {object} actor
 * @param {object} tree
 * @param {object} node
 */
function isAccessible(actor, tree, node) {
  if (node.row === 1) return true

  const connections = tree?.system?.connections
  if (!Array.isArray(connections)) return false

  const treeId = tree.id ?? tree._id
  const treeUuid = tree.uuid
  const nodes = tree.system.nodes
  const specializationId = tree.system?.specializationId

  for (const conn of connections) {
    if (conn.to !== node.nodeId) continue
    const sourceNode = nodes.find((n) => n.nodeId === conn.from)
    if (!sourceNode) continue
    if (hasPurchase(actor, treeId, sourceNode.nodeId, sourceNode.talentId, specializationId, { treeUuid, talentUuid: sourceNode.talentUuid })) {
      return true
    }
  }
  return false
}

/**
 * Return the actor's available XP from the progression data, computing it from gained minus spent when not directly stored.
 * @param {object} actor
 */
function getAvailableXp(actor) {
  const exp = actor?.system?.progression?.experience
  if (!exp) return 0
  if (exp.available != null) return exp.available
  return (exp.gained ?? 0) - (exp.spent ?? 0)
}

/**
 * Return the computed state of a single talent node for the given actor and specialization context.
 * @param {object} actor
 * @param {string} specializationId
 * @param {object} tree
 * @param {string} nodeId
 */
export function getNodeState(actor, specializationId, tree, nodeId) {
  if (!actor) {
    logger.warn('[TalentNodeState] getNodeState called without actor')
    return makeResult(NODE_STATE.INVALID, REASON_CODE.NODE_INVALID, { reason: 'missing actor' })
  }

  if (!specializationId) {
    logger.warn('[TalentNodeState] getNodeState called without specializationId')
    return makeResult(NODE_STATE.INVALID, REASON_CODE.NODE_INVALID, { reason: 'missing specializationId' })
  }

  if (!isSpecializationOwned(actor, specializationId)) {
    return makeResult(NODE_STATE.INVALID, REASON_CODE.SPECIALIZATION_NOT_OWNED, { specializationId })
  }

  if (!tree) {
    return makeResult(NODE_STATE.INVALID, REASON_CODE.TREE_NOT_FOUND, { specializationId })
  }

  if (!isCompleteTree(tree)) {
    return makeResult(NODE_STATE.INVALID, REASON_CODE.TREE_INCOMPLETE, {
      specializationId,
      hasNodes: Array.isArray(tree?.system?.nodes) && tree.system.nodes.length > 0,
      hasConnections: Array.isArray(tree?.system?.connections) && tree.system.connections.length > 0,
    })
  }

  const node = findNode(tree, nodeId)
  if (!node) {
    return makeResult(NODE_STATE.INVALID, REASON_CODE.NODE_NOT_FOUND, { nodeId, specializationId })
  }

  if (!hasValidFields(node)) {
    return makeResult(NODE_STATE.INVALID, REASON_CODE.NODE_INVALID, {
      nodeId,
      specializationId,
      missingFields: missingFields(node),
    })
  }

  const treeId = tree.id ?? tree._id
  const treeUuid = tree.uuid
  if (hasPurchase(actor, treeId, node.nodeId, node.talentId, specializationId, { treeUuid, talentUuid: node.talentUuid })) {
    return makeResult(NODE_STATE.PURCHASED, REASON_CODE.ALREADY_PURCHASED, { nodeId, specializationId })
  }

  if (!isAccessible(actor, tree, node)) {
    return makeResult(NODE_STATE.LOCKED, REASON_CODE.NODE_LOCKED, {
      nodeId,
      specializationId,
      row: node.row,
    })
  }

  const availableXp = getAvailableXp(actor)
  if (availableXp < node.cost) {
    return makeResult(NODE_STATE.LOCKED, REASON_CODE.NOT_ENOUGH_XP, {
      nodeId,
      specializationId,
      requiredXp: node.cost,
      availableXp,
    })
  }

  return makeResult(NODE_STATE.AVAILABLE, '', { nodeId, specializationId, cost: node.cost })
}

/**
 * Compute the state of every node in the tree for the given actor and specialization, returning a map keyed by nodeId.
 * @param {object} actor
 * @param {string} specializationId
 * @param {object} tree
 */
export function getTreeNodesStates(actor, specializationId, tree) {
  const map = new Map()
  if (!tree?.system?.nodes) return map
  for (const node of tree.system.nodes) {
    map.set(node.nodeId, getNodeState(actor, specializationId, tree, node.nodeId))
  }
  return map
}
