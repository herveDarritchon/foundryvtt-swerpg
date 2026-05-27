/**
 * @module module/applications/specialization-tree/contextual-action-panel-view-model
 * @description Pure view-model builder for the specialization tree contextual action panel.
 *
 * Produces the display content for the detail panel from a render node's data,
 * including state, reason, description, and an optional primary action CTA.
 *
 * The `localize` callback must be injected at call site.
 * Returns a plain object consumed by the DOM layer.
 */

/**
 * Build the contextual action panel view-model for a specialization tree node.
 *
 * @param {object} node The enriched render node (must carry `talentName`,
 *        `xpCost`, `isRanked`, `talentDescription`, `nodeStateLabel`,
 *        and optionally `reasonLabel`, `actionable`).
 * @param {(key: string) => string} localize i18n localize function.
 * @returns {{
 *   talentName: string,
 *   xpCost: number,
 *   typeLabel: string,
 *   nodeStateLabel: string,
 *   reasonLabel: string|null,
 *   description: string|null,
 *   primaryAction: string|null,
 *   actionLabel: string|null,
 *   canAction: boolean,
 * }}
 */
export function buildContextualActionPanelViewModel(node, localize) {
  const typeLabel = node.isRanked
    ? localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.RANKED')
    : localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.NON_RANKED')

  const primaryAction = node.actionable?.primaryAction ?? null
  const canAction = !!(
    primaryAction &&
    ((primaryAction === 'purchase' && node.actionable?.canPurchase === true) || (primaryAction === 'forget' && node.actionable?.canForget === true))
  )

  return {
    talentName: node.talentName,
    xpCost: node.xpCost,
    typeLabel,
    nodeStateLabel: node.nodeStateLabel,
    reasonLabel: node.reasonLabel ?? node.actionable?.blockedReasonLabel ?? null,
    description: node.talentDescription ?? null,
    primaryAction,
    actionLabel: node.actionable?.actionLabel ?? null,
    canAction,
  }
}
