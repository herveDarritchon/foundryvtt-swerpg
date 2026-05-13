import { logger } from '../../utils/logger.mjs'
import { resolveSpecializationTree } from './talent-tree-resolver.mjs'
import { getNodeState, NODE_STATE, REASON_CODE } from './talent-node-state.mjs'
import { recordTalentNodePurchase } from '../../utils/audit-log.mjs'

/**
 * @typedef {Object} PurchaseResult
 * @property {boolean} ok - Whether the purchase succeeded.
 * @property {string} [reason] - Human-readable failure description (only when ok === false).
 * @property {string} [reasonCode] - Machine-readable failure reason code (only when ok === false).
 * @property {Object} [purchase] - Purchase data (only when ok === true).
 * @property {string} purchase.treeId
 * @property {string} purchase.nodeId
 * @property {string} purchase.talentId
 * @property {string} purchase.specializationId
 * @property {number} purchase.cost
 */

/**
 * Purchase a talent node for an actor.
 * Validates using the canonical state engine, persists the purchase and XP atomically,
 * then records an audit entry (non-blocking).
 *
 * @param {object} actor - The actor document instance.
 * @param {string} specializationId - The specialization identifier.
 * @param {string} nodeId - The node identifier within the specialization tree.
 * @returns {Promise<PurchaseResult>}
 */
export async function purchaseTalentNode(actor, specializationId, nodeId) {
  if (!actor) {
    return { ok: false, reason: 'Missing actor', reasonCode: REASON_CODE.NODE_INVALID }
  }

  if (!specializationId || !nodeId) {
    return { ok: false, reason: 'Missing specializationId or nodeId', reasonCode: REASON_CODE.NODE_INVALID }
  }

  const specializationData = findSpecialization(actor, specializationId)
  if (!specializationData) {
    return {
      ok: false,
      reason: `Specialization "${specializationId}" is not owned`,
      reasonCode: REASON_CODE.SPECIALIZATION_NOT_OWNED,
    }
  }

  const resolved = resolveSpecializationTree(specializationData)
  if (!resolved.tree) {
    const reasonCode = resolved.state === 'unresolved' ? REASON_CODE.TREE_NOT_FOUND : REASON_CODE.TREE_INCOMPLETE
    return { ok: false, reason: `Tree ${resolved.state} for specialization "${specializationId}"`, reasonCode }
  }

  const tree = resolved.tree
  const node = findNodeInTree(tree, nodeId)
  if (!node) {
    return { ok: false, reason: `Node "${nodeId}" not found in tree`, reasonCode: REASON_CODE.NODE_NOT_FOUND }
  }

  const state = getNodeState(actor, specializationId, tree, nodeId)
  if (state.state !== NODE_STATE.AVAILABLE) {
    return { ok: false, reason: state.reason, reasonCode: state.reasonCode }
  }

  const treeId = tree.id ?? tree._id
  const purchase = {
    treeId,
    nodeId: node.nodeId,
    talentId: node.talentId,
    specializationId,
  }

  const currentSpent = actor.system?.progression?.experience?.spent ?? 0
  const currentPurchases = Array.isArray(actor.system?.progression?.talentPurchases)
    ? actor.system.progression.talentPurchases
    : []
  const newSpent = currentSpent + node.cost

  await actor.update({
    'system.progression.talentPurchases': [...currentPurchases, purchase],
    'system.progression.experience.spent': newSpent,
  })

  try {
    await recordTalentNodePurchase(actor, {
      specializationId,
      treeId,
      nodeId: node.nodeId,
      talentId: node.talentId,
      cost: node.cost,
      previousXp: currentSpent,
      nextXp: newSpent,
    })
  } catch (err) {
    logger.warn('[TalentNodePurchase] Audit log write failed (non-blocking)', {
      actorId: actor.id,
      nodeId,
      error: err.message,
    })
  }

  return {
    ok: true,
    purchase: { ...purchase, cost: node.cost },
  }
}

function findSpecialization(actor, specializationId) {
  const specs = actor?.system?.details?.specializations
  if (!specs) return null
  for (const spec of specs) {
    if (spec?.specializationId === specializationId) return spec
  }
  return null
}

function findNodeInTree(tree, nodeId) {
  const nodes = tree?.system?.nodes
  if (!Array.isArray(nodes)) return null
  return nodes.find(n => n?.nodeId === nodeId) ?? null
}
