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
})

function makeResult(state, reasonCode, details = {}) {
  return { state, reasonCode, details }
}

function isSpecializationOwned(actor, specializationId) {
  const specs = actor?.system?.details?.specializations
  if (!specs) return false
  for (const spec of specs) {
    if (spec?.specializationId === specializationId) return true
  }
  return false
}

function findNode(tree, nodeId) {
  const nodes = tree?.system?.nodes
  if (!Array.isArray(nodes)) return undefined
  return nodes.find(n => n?.nodeId === nodeId)
}

function hasPurchase(actor, treeId, nodeId, talentId, specializationId) {
  const purchases = actor?.system?.progression?.talentPurchases
  if (!Array.isArray(purchases)) return false
  return purchases.some(p =>
    p.treeId === treeId
    && p.nodeId === nodeId
    && p.talentId === talentId
    && p.specializationId === specializationId
  )
}

function hasValidFields(node) {
  if (!node.nodeId || !node.talentId) return false
  if (node.row == null || node.cost == null) return false
  if (typeof node.talentId === 'string' && node.talentId.startsWith('unknown:')) return false
  return true
}

function missingFields(node) {
  const fields = []
  if (!node.nodeId) fields.push('nodeId')
  if (!node.talentId) fields.push('talentId')
  if (node.row == null) fields.push('row')
  if (node.cost == null) fields.push('cost')
  return fields
}

function isCompleteTree(tree) {
  const nodes = tree?.system?.nodes
  const connections = tree?.system?.connections
  const importFlags = tree?.flags?.swerpg?.import

  if (importFlags?.unresolved || importFlags?.status === 'incomplete' || importFlags?.status === 'invalid') {
    return false
  }

  return Array.isArray(nodes) && nodes.length > 0
    && Array.isArray(connections) && connections.length > 0
}

function isAccessible(actor, tree, node) {
  if (node.row === 1) return true

  const connections = tree?.system?.connections
  if (!Array.isArray(connections)) return false

  const treeId = tree.id ?? tree._id
  const nodes = tree.system.nodes
  const specializationId = tree.system?.specializationId

  for (const conn of connections) {
    if (conn.to !== node.nodeId) continue
    const sourceNode = nodes.find(n => n.nodeId === conn.from)
    if (!sourceNode) continue
    if (hasPurchase(actor, treeId, sourceNode.nodeId, sourceNode.talentId, specializationId)) {
      return true
    }
  }
  return false
}

function getAvailableXp(actor) {
  const exp = actor?.system?.progression?.experience
  if (!exp) return 0
  if (exp.available != null) return exp.available
  return (exp.gained ?? 0) - (exp.spent ?? 0)
}

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
  if (hasPurchase(actor, treeId, node.nodeId, node.talentId, specializationId)) {
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

export function getTreeNodesStates(actor, specializationId, tree) {
  const map = new Map()
  if (!tree?.system?.nodes) return map
  for (const node of tree.system.nodes) {
    map.set(node.nodeId, getNodeState(actor, specializationId, tree, node.nodeId))
  }
  return map
}
