import { logger } from '../../utils/logger.mjs'
import { recordTalentNodePurchase } from '../../utils/audit-log.mjs'
import { processTalentNodeProgression } from './talent-node-progression.mjs'

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
 * Delegates business validation to the central progression service,
 * persists the purchase and XP atomically, then records an audit entry
 * (non-blocking).
 *
 * @param {object} actor - The actor document instance.
 * @param {string} specializationId - The specialization identifier.
 * @param {string} nodeId - The node identifier within the specialization tree.
 * @returns {Promise<PurchaseResult>}
 */
export async function purchaseTalentNode(actor, specializationId, nodeId) {
  const result = processTalentNodeProgression(actor, specializationId, nodeId, 'purchase')

  if (!result.ok) {
    return { ok: false, reason: result.reason, reasonCode: result.reasonCode }
  }

  const { payload } = result
  const currentSpent = actor.system?.progression?.experience?.spent ?? 0

  await actor.update({
    'system.progression.talentPurchases': payload.updatedPurchases,
    'system.progression.experience.spent': payload.updatedSpent,
  })

  try {
    await recordTalentNodePurchase(actor, {
      specializationId: payload.specializationId,
      treeId: payload.treeId,
      treeUuid: payload.treeUuid,
      nodeId: payload.nodeId,
      talentId: payload.talentId,
      talentUuid: payload.talentUuid,
      cost: payload.cost,
      previousXp: currentSpent,
      nextXp: payload.updatedSpent,
    })
  } catch (err) {
    logger.warn('[TalentNodePurchase] Audit log write failed (non-blocking)', {
      actorId: actor.id,
      nodeId,
      error: err.message,
    })
  }

  const purchaseEntry = payload.updatedPurchases[payload.updatedPurchases.length - 1]

  return {
    ok: true,
    purchase: { ...purchaseEntry, cost: payload.cost },
  }
}