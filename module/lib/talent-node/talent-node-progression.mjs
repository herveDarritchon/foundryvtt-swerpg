import { resolveSpecializationTree } from './talent-tree-resolver.mjs'
import { getNodeState, NODE_STATE, REASON_CODE } from './talent-node-state.mjs'

/**
 * @typedef {'purchase'|'forget'} NodeAction
 */

/**
 * @typedef {Object} ProgressionResult
 * @property {boolean} ok - Whether the action succeeded in validation.
 * @property {NodeAction} action - The action that was requested.
 * @property {string} [reason] - Human-readable failure description (only when ok === false).
 * @property {string} [reasonCode] - Machine-readable failure reason code (only when ok === false).
 * @property {Object} [payload] - Action payload (only when ok === true).
 * @property {string} payload.specializationId
 * @property {string} payload.treeId
 * @property {string|null} payload.treeUuid
 * @property {string} payload.nodeId
 * @property {string} payload.talentId
 * @property {string|null} payload.talentUuid
 * @property {number} payload.cost
 * @property {Array} payload.updatedPurchases - New talentPurchases array to persist.
 * @property {number} payload.updatedSpent - New experience.spent value to persist.
 */

/**
 * Central business service for talent node progression.
 * Validates and computes the result of a purchase or forget action without
 * any Foundry persistence or UI side-effects.
 *
 * The caller is responsible for persisting the payload via actor.update().
 *
 * @param {object} actor The actor document instance.
 * @param {string} specializationId The specialization identifier.
 * @param {string} nodeId The node identifier within the specialization tree.
 * @param {NodeAction} action Either 'purchase' or 'forget'.
 * @returns {ProgressionResult}
 */
export function processTalentNodeProgression(actor, specializationId, nodeId, action) {
  if (!actor) {
    return { ok: false, action, reason: 'Missing actor', reasonCode: REASON_CODE.NODE_INVALID }
  }

  if (!specializationId || !nodeId) {
    return { ok: false, action, reason: 'Missing specializationId or nodeId', reasonCode: REASON_CODE.NODE_INVALID }
  }

  if (action !== 'purchase' && action !== 'forget') {
    return { ok: false, action, reason: `Unknown action "${action}"`, reasonCode: REASON_CODE.NODE_INVALID }
  }

  const specializationData = findSpecialization(actor, specializationId)
  if (!specializationData) {
    return {
      ok: false,
      action,
      reason: `Specialization "${specializationId}" is not owned`,
      reasonCode: REASON_CODE.SPECIALIZATION_NOT_OWNED,
    }
  }

  const resolved = resolveSpecializationTree(specializationData)
  if (!resolved.tree) {
    const reasonCode = resolved.state === 'unresolved' ? REASON_CODE.TREE_NOT_FOUND : REASON_CODE.TREE_INCOMPLETE
    return { ok: false, action, reason: `Tree ${resolved.state} for specialization "${specializationId}"`, reasonCode }
  }

  const tree = resolved.tree
  const node = findNodeInTree(tree, nodeId)
  if (!node) {
    return { ok: false, action, reason: `Node "${nodeId}" not found in tree`, reasonCode: REASON_CODE.NODE_NOT_FOUND }
  }

  if (action === 'purchase') {
    return validatePurchase(actor, specializationId, tree, node, action)
  }

  return validateForget(actor, specializationId, tree, node, action)
}

// ---------------------------------------------------------------------------
// Purchase validation
// ---------------------------------------------------------------------------

/**
 *
 * @param {object} actor
 * @param {string} specializationId
 * @param {object} tree
 * @param {object} node
 * @param {NodeAction} action
 */
function validatePurchase(actor, specializationId, tree, node, action) {
  const state = getNodeState(actor, specializationId, tree, node.nodeId)
  if (state.state !== NODE_STATE.AVAILABLE) {
    return { ok: false, action, reason: state.details?.reason ?? state.reasonCode, reasonCode: state.reasonCode }
  }

  return buildSuccessResult(actor, specializationId, tree, node, action, +1)
}

// ---------------------------------------------------------------------------
// Forget validation
// ---------------------------------------------------------------------------

/**
 *
 * @param {object} actor
 * @param {string} specializationId
 * @param {object} tree
 * @param {object} node
 * @param {NodeAction} action
 */
function validateForget(actor, specializationId, tree, node, action) {
  const treeId = tree.id ?? tree._id
  const treeUuid = tree.uuid ?? null

  if (!isPurchased(actor, treeId, treeUuid, node, specializationId)) {
    return { ok: false, action, reason: `Node "${node.nodeId}" is not purchased`, reasonCode: REASON_CODE.NODE_NOT_PURCHASED }
  }

  const blockingDependents = findBlockingDependents(actor, tree, node.nodeId, specializationId)
  if (blockingDependents.length > 0) {
    return {
      ok: false,
      action,
      reason: `Node "${node.nodeId}" cannot be forgotten: dependent nodes are still purchased`,
      reasonCode: REASON_CODE.NODE_HAS_DEPENDENTS,
      dependents: blockingDependents,
    }
  }

  return buildSuccessResult(actor, specializationId, tree, node, action, -1)
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 *
 * @param {object} actor
 * @param {string} specializationId
 * @param {object} tree
 * @param {object} node
 * @param {NodeAction} action
 * @param {number} costSign
 */
function buildSuccessResult(actor, specializationId, tree, node, action, costSign) {
  const treeId = tree.id ?? tree._id
  const treeUuid = tree.uuid ?? null

  const currentSpent = actor.system?.progression?.experience?.spent ?? 0
  const currentPurchases = Array.isArray(actor.system?.progression?.talentPurchases) ? actor.system.progression.talentPurchases : []

  let updatedPurchases
  if (action === 'purchase') {
    const entry = {
      treeId,
      treeUuid,
      nodeId: node.nodeId,
      talentId: node.talentId,
      talentUuid: node.talentUuid ?? null,
      specializationId,
    }
    updatedPurchases = [...currentPurchases, entry]
  } else {
    updatedPurchases = currentPurchases.filter((p) => !matchesPurchase(p, treeId, treeUuid, node, specializationId))
  }

  const updatedSpent = currentSpent + costSign * node.cost

  return {
    ok: true,
    action,
    payload: {
      specializationId,
      treeId,
      treeUuid,
      nodeId: node.nodeId,
      talentId: node.talentId,
      talentUuid: node.talentUuid ?? null,
      cost: node.cost,
      updatedPurchases,
      updatedSpent,
    },
  }
}

/**
 * Determine whether a node is currently purchased by the actor.
 * @param {object} actor
 * @param {string} treeId
 * @param {string|null} treeUuid
 * @param {object} node
 * @param {string} specializationId
 */
function isPurchased(actor, treeId, treeUuid, node, specializationId) {
  const purchases = actor?.system?.progression?.talentPurchases
  if (!Array.isArray(purchases)) return false
  return purchases.some((p) => matchesPurchase(p, treeId, treeUuid, node, specializationId))
}

/**
 * Match a purchase record against a node identity.
 * Prefers UUID-based matching when both sides carry a UUID.
 * @param {object} p
 * @param {string} treeId
 * @param {string|null} treeUuid
 * @param {object} node
 * @param {string} specializationId
 */
function matchesPurchase(p, treeId, treeUuid, node, specializationId) {
  const treeMatch = treeUuid && p.treeUuid ? p.treeUuid === treeUuid : p.treeId === treeId
  const talentMatch = node.talentUuid && p.talentUuid ? p.talentUuid === node.talentUuid : p.talentId === node.talentId
  return p.nodeId === node.nodeId && p.specializationId === specializationId && treeMatch && talentMatch
}

/**
 * Return the nodeIds of downstream nodes that are currently purchased and
 * depend on targetNodeId as a direct prerequisite.
 *
 * A node is a blocking dependent if there is a connection from targetNodeId
 * to that node AND the node is currently purchased.
 * @param {object} actor
 * @param {object} tree
 * @param {string} targetNodeId
 * @param {string} specializationId
 */
function findBlockingDependents(actor, tree, targetNodeId, specializationId) {
  const connections = tree?.system?.connections
  if (!Array.isArray(connections)) return []

  const treeId = tree.id ?? tree._id
  const treeUuid = tree.uuid ?? null
  const nodes = tree.system?.nodes ?? []

  const blockingNodeIds = []

  for (const conn of connections) {
    if (conn.from !== targetNodeId) continue
    const dependentNode = nodes.find((n) => n.nodeId === conn.to)
    if (!dependentNode) continue
    if (isPurchased(actor, treeId, treeUuid, dependentNode, specializationId)) {
      blockingNodeIds.push(conn.to)
    }
  }

  return blockingNodeIds
}

/**
 *
 * @param {object} actor
 * @param {string} specializationId
 */
function findSpecialization(actor, specializationId) {
  const specs = actor?.system?.details?.specializations
  if (!specs) return null
  for (const spec of specs) {
    if (spec?.specializationId === specializationId) return spec
  }
  return null
}

/**
 *
 * @param {object} tree
 * @param {string} nodeId
 */
function findNodeInTree(tree, nodeId) {
  const nodes = tree?.system?.nodes
  if (!Array.isArray(nodes)) return null
  return nodes.find((n) => n?.nodeId === nodeId) ?? null
}
