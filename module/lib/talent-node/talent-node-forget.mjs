import { processTalentNodeProgression } from './talent-node-progression.mjs'
import { applyTalentNodePatch } from './talent-node-persistence.mjs'

/**
 * @typedef {Object} ForgetResult
 * @property {boolean} ok - Whether the forget operation succeeded.
 * @property {string} [reason] - Human-readable failure description (only when ok === false).
 * @property {string} [reasonCode] - Machine-readable failure reason code (only when ok === false).
 * @property {string[]} [dependents] - Blocking dependent node IDs (only when reasonCode is NODE_HAS_DEPENDENTS).
 * @property {Object} [purchase] - The removed purchase entry (only when ok === true).
 * @property {string} purchase.treeId
 * @property {string|null} purchase.treeUuid
 * @property {string} purchase.nodeId
 * @property {string} purchase.talentId
 * @property {string|null} purchase.talentUuid
 * @property {string} purchase.specializationId
 * @property {number} purchase.cost
 */

/**
 * Forget a previously purchased talent node for an actor.
 * Delegates business validation to the central progression service,
 * then persists the removal and XP refund atomically via the shared
 * persistence helper.
 *
 * XP convention: oubli autorisé decrements experience.spent by the node cost,
 * symmetric to the purchase increment.
 *
 * @param {object} actor - The actor document instance.
 * @param {string} specializationId - The specialization identifier.
 * @param {string} nodeId - The node identifier within the specialization tree.
 * @returns {Promise<ForgetResult>}
 */
export async function forgetTalentNode(actor, specializationId, nodeId) {
  const result = processTalentNodeProgression(actor, specializationId, nodeId, 'forget')

  if (!result.ok) {
    const forgetResult = { ok: false, reason: result.reason, reasonCode: result.reasonCode }
    if (result.dependents) {
      forgetResult.dependents = result.dependents
    }
    return forgetResult
  }

  const { payload } = result
  return applyTalentNodePatch(actor, payload, 'forget')
}