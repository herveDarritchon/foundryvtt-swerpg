import { NODE_STATE, REASON_CODE } from '../../lib/talent-node/talent-node-state.mjs'
import { processTalentNodeProgression } from '../../lib/talent-node/talent-node-progression.mjs'
import { getReasonLabelKey } from './node-ui-state.mjs'

const ACTION_LABEL_KEYS = Object.freeze({
  purchase: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.PURCHASE',
  forget: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.FORGET',
})

/**
 * Build an actionable sub-view-model for a single tree node.
 *
 * This function is ***pure*** with respect to Foundry globals: it takes
 * a `localize` callback rather than accessing `game.i18n` directly.
 * Business validation is delegated to `processTalentNodeProgression()`.
 *
 * @param {object} options
 * @param {object} options.renderNode   - Enriched render node (must carry `nodeState`,
 *        `reasonCode`, `nodeId`, `talentId`, `xpCost` from `enrichNode`).
 * @param {object} options.actor        - The actor document instance.
 * @param {string} options.specializationId - Active specialization/tree key.
 * @param {object|null} options.tree    - The resolved specialization tree item.
 * @param {(key: string) => string} options.localize - i18n localize callback.
 * @returns {import('./types.mjs').ActionableNodeViewModel}
 */
export function actionableNodeViewModel({ renderNode, actor, specializationId, tree, localize }) {
  const state = renderNode.nodeState
  const reasonCode = renderNode.reasonCode

  let canPurchase = false
  let canForget = false
  let primaryAction = null
  let blockingDependents = []

  if (state === NODE_STATE.AVAILABLE) {
    canPurchase = true
    primaryAction = 'purchase'
  } else if (state === NODE_STATE.PURCHASED) {
    const progression = processTalentNodeProgression(actor, specializationId, renderNode.nodeId, 'forget')
    if (progression.ok) {
      canForget = true
      primaryAction = 'forget'
    } else if (progression.reasonCode === REASON_CODE.NODE_HAS_DEPENDENTS) {
      blockingDependents = progression.dependents ?? []
    }
  }

  const actionLabel = primaryAction ? localize(ACTION_LABEL_KEYS[primaryAction]) : null

  let blockedReasonCode = null
  if (state === NODE_STATE.PURCHASED && !canForget && blockingDependents.length > 0) {
    blockedReasonCode = REASON_CODE.NODE_HAS_DEPENDENTS
  } else if (state !== NODE_STATE.AVAILABLE && state !== NODE_STATE.PURCHASED) {
    blockedReasonCode = reasonCode || null
  }

  const blockedReasonLabel = blockedReasonCode ? localize(getReasonLabelKey(blockedReasonCode)) : null

  const actionRef = buildActionRef(specializationId, tree, renderNode)

  return {
    canPurchase,
    canForget,
    primaryAction,
    actionLabel,
    blockedReasonCode,
    blockedReasonLabel,
    blockingDependents,
    actionRef,
  }
}

/**
 * @param {string} specializationId
 * @param {object|null} tree
 * @param {object} renderNode
 * @returns {import('./types.mjs').ActionRef}
 */
function buildActionRef(specializationId, tree, renderNode) {
  const treeId = tree?.id ?? tree?._id ?? null
  const treeUuid = tree?.uuid ?? null
  const treeNode = tree?.system?.nodes?.find((n) => n.nodeId === renderNode.nodeId)
  const talentUuid = treeNode?.talentUuid ?? null

  return {
    specializationId,
    treeId,
    treeUuid,
    nodeId: renderNode.nodeId,
    talentId: renderNode.talentId,
    talentUuid,
    cost: renderNode.xpCost,
  }
}
