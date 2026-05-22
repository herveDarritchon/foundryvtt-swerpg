/**
 * @module module/applications/specialization-tree/node-tooltip-view-model
 * @description Pure view-model builder for the specialization tree node tooltip.
 *
 * Generates the display content for a node tooltip from a render node's data,
 * without any dependency on `game`, `ui`, `canvas`, PIXI, or DOM APIs.
 *
 * The `localize` callback must be injected at call site.
 * Returns a plain object that the DOM layer renders into the tooltip element.
 */

/**
 * Build the tooltip view-model for a specialization tree node.
 *
 * @param {object} node - The enriched render node (must carry `talentName`,
 *        `xpCost`, `isRanked`, `nodeStateLabel`, and optionally `reasonLabel`).
 * @param {(key: string) => string} localize - i18n localize function.
 * @returns {{ header: string, lines: string[] }} Tooltip content.
 */
export function buildNodeTooltipViewModel(node, localize) {
  const typeLabel = node.isRanked
    ? localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.RANKED')
    : localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.NON_RANKED')

  const lines = [
    `${localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.XP_COST')}: ${node.xpCost} XP`,
    `${localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.TYPE')}: ${typeLabel}`,
    `${localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.STATE')}: ${node.nodeStateLabel}`,
  ]

  if (node.reasonLabel) {
    lines.push(
      `${localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.REASON')}: ${node.reasonLabel}`
    )
  }

  return {
    header: node.talentName,
    lines,
  }
}
