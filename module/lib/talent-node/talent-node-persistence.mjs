import { logger } from '../../utils/logger.mjs'

/**
 * @typedef {Object} PersistenceResult
 * @property {boolean} ok - Whether the persistence succeeded.
 * @property {string} [reason] - Human-readable failure description (only when ok === false).
 * @property {string} [reasonCode] - Machine-readable failure reason code (only when ok === false).
 * @property {Object} [purchase] - The purchase entry that was added or removed (only when ok === true).
 * @property {string} purchase.treeId
 * @property {string|null} purchase.treeUuid
 * @property {string} purchase.nodeId
 * @property {string} purchase.talentId
 * @property {string|null} purchase.talentUuid
 * @property {string} purchase.specializationId
 * @property {number} purchase.cost
 */

/**
 * Apply a validated talent node progression payload as a single atomic actor update.
 *
 * This helper centralises the Foundry persistence step so that both purchase and
 * forget flows emit an identical `actor.update()` structure.  It must only be
 * called after `processTalentNodeProgression()` has returned `ok: true`.
 *
 * The minimum persisted shape of a purchase entry is:
 *   { treeId, treeUuid, nodeId, talentId, talentUuid, specializationId }
 *
 * @param {object} actor - The actor document instance.
 * @param {object} payload - The validated payload from processTalentNodeProgression.
 * @param {string} payload.specializationId
 * @param {string} payload.treeId
 * @param {string|null} payload.treeUuid
 * @param {string} payload.nodeId
 * @param {string} payload.talentId
 * @param {string|null} payload.talentUuid
 * @param {number} payload.cost
 * @param {Array} payload.updatedPurchases - New talentPurchases array to persist.
 * @param {number} payload.updatedSpent - New experience.spent value to persist.
 * @param {'purchase'|'forget'} action - The action that produced this payload.
 * @returns {Promise<PersistenceResult>}
 */
export async function applyTalentNodePatch(actor, payload, action) {
  if (!actor) {
    logger.warn('[TalentNodePersistence] applyTalentNodePatch called without actor')
    return { ok: false, reason: 'Missing actor', reasonCode: 'node-invalid' }
  }

  if (!payload) {
    logger.warn('[TalentNodePersistence] applyTalentNodePatch called without payload')
    return { ok: false, reason: 'Missing payload', reasonCode: 'node-invalid' }
  }

  await actor.update({
    'system.progression.talentPurchases': payload.updatedPurchases,
    'system.progression.experience.spent': payload.updatedSpent,
  })

  const purchaseEntry = {
    treeId: payload.treeId,
    treeUuid: payload.treeUuid,
    nodeId: payload.nodeId,
    talentId: payload.talentId,
    talentUuid: payload.talentUuid,
    specializationId: payload.specializationId,
    cost: payload.cost,
  }

  logger.debug('[TalentNodePersistence] Patch applied', {
    action,
    actorId: actor.id,
    nodeId: payload.nodeId,
    specializationId: payload.specializationId,
    updatedSpent: payload.updatedSpent,
  })

  return { ok: true, purchase: purchaseEntry }
}
