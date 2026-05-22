/**
 * @module module/applications/specialization-tree/tree-context-builder
 * @description Pure builder for the specialization tree application context.
 *
 * Composes existing pure modules (render-view-model, node-ui-state,
 * actionable-node-view-model, layout) and injected callbacks to produce
 * the full render context consumed by `SpecializationTreeApp`.
 *
 * This module has zero direct dependency on `game`, `ui`, `canvas`, PIXI,
 * or Foundry globals. Foundry-dependent operations (tree resolution, talent
 * lookup, i18n) are injected as callbacks.
 */

import { buildRenderViewModel } from './render-view-model.mjs'
import { enrichNode, NODE_STATE } from './node-ui-state.mjs'
import { actionableNodeViewModel } from './actionable-node-view-model.mjs'
import { buildConnectionAnchors, computeNodePosition } from './layout.mjs'
import { selectDefaultTreeKey } from '../../lib/specialization-tree/default-tree-selector.mjs'
import { getTreeNodesStates } from '../../lib/talent-node/talent-node-state.mjs'

/**
 * i18n label keys for specialization tree state labels.
 * @type {Readonly<Record<string, string>>}
 */
const SPECIALIZATION_TREE_STATE_LABELS = Object.freeze({
  available: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.AVAILABLE',
  unresolved: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.UNRESOLVED',
  incomplete: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.INCOMPLETE',
})

/**
 * Build the full render context for the specialization tree application.
 *
 * Pure function — all Foundry dependencies (tree resolution, talent lookup,
 * i18n) must be injected via `deps`.
 *
 * @param {object|null|undefined} actor - The actor document (or null).
 * @param {string|null} selectedKey - Optional tree key to select.
 * @param {object} deps - Injected dependencies.
 * @param {Map<string, { tree: object|null, state: string }>} deps.resolutions
 *        Resolved specialization trees (from `resolveActorSpecializationTrees`).
 * @param {(key: string) => string} deps.localize - i18n localize function.
 * @param {(key: string, data: object) => string} deps.format - i18n format function.
 * @param {(node: object) => object|null|undefined} deps.talentLookup
 *        Talent lookup callback for `buildRenderViewModel`.
 * @returns {object} Display-ready render context (plain object, no Foundry refs).
 */
export function buildSpecializationTreeContext(actor, selectedKey, deps) {
  const { resolutions, localize, format, talentLookup } = deps

  if (!actor) {
    const title = format('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TITLE', {
      actor: localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.UNKNOWN_ACTOR'),
    })

    return {
      title,
      subtitle: localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUBTITLE'),
      hasActor: false,
      hasSpecializations: false,
      hasResolvedTrees: false,
      showViewport: false,
      specializations: [],
      currentTreeId: null,
      currentTreeName: null,
      currentTreeSummary: null,
      currentTreeData: null,
      renderNodes: [],
      renderConnections: [],
      emptyStateTitle: localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_ACTOR_TITLE'),
      emptyStateDescription: localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_ACTOR_DESCRIPTION'),
      viewportAriaLabel: localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.VIEWPORT_ARIA_LABEL'),
    }
  }

  const title = format('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TITLE', {
    actor: actor?.name ?? localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.UNKNOWN_ACTOR'),
  })

  const specializations = Array.from(actor?.system?.details?.specializations || [])

  const specializationEntries = buildSpecializationEntries(specializations, resolutions, localize)
  const hasResolvedTrees = specializationEntries.some((entry) => entry.isAvailable)

  let currentTreeId = null
  let currentTreeName = null
  let currentTreeSummary = null
  let currentTreeData = null
  let renderNodes = []
  let renderConnections = []

  const activeKey = selectDefaultTreeKey(specializationEntries, selectedKey)

  for (const entry of specializationEntries) {
    entry.isSelected = entry.key === activeKey
  }

  if (activeKey) {
    currentTreeId = activeKey
    const entry = specializationEntries.find((e) => e.key === activeKey)
    currentTreeName = entry?.treeName ?? null
    const resolution = resolutions.get(activeKey)
    currentTreeData = resolution?.tree ?? null

    const result = buildRenderNodesAndConnections(currentTreeData, actor, currentTreeId, {
      localize,
      talentLookup,
    })

    renderNodes = result.renderNodes
    renderConnections = result.renderConnections

    const availableXp = actor?.system?.progression?.experience?.available
    currentTreeSummary = buildCurrentTreeSummary(currentTreeName, renderNodes, localize, availableXp)
  }

  return {
    title,
    subtitle: localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUBTITLE'),
    hasActor: true,
    hasSpecializations: specializationEntries.length > 0,
    hasResolvedTrees,
    showViewport: hasResolvedTrees,
    specializations: specializationEntries,
    currentTreeId,
    currentTreeName,
    currentTreeSummary,
    currentTreeData,
    renderNodes,
    renderConnections,
    emptyStateTitle:
      specializationEntries.length === 0
        ? localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_SPECIALIZATIONS_TITLE')
        : localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_AVAILABLE_TREE_TITLE'),
    emptyStateDescription:
      specializationEntries.length === 0
        ? localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_SPECIALIZATIONS_DESCRIPTION')
        : localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_AVAILABLE_TREE_DESCRIPTION'),
    viewportAriaLabel: localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.VIEWPORT_ARIA_LABEL'),
  }
}

/**
 * Build specialization entries from actor specializations and their resolved states.
 *
 * @param {Array<object>} specializations - Actor specialization entries.
 * @param {Map<string, { tree: object|null, state: string }>} resolutions
 * @param {(key: string) => string} localize
 * @returns {Array<object>} Specialization entries with state, label, and metadata.
 */
export function buildSpecializationEntries(specializations, resolutions, localize) {
  return specializations.map((specialization, index) => {
    const key =
      specialization?.specializationId ||
      specialization?.treeUuid ||
      specialization?.name ||
      `specialization-${index}`
    const resolution = resolutions.get(key) ?? { tree: null, state: 'unresolved' }
    const state = resolution.state ?? 'unresolved'

    return {
      key,
      specializationId: specialization?.specializationId ?? null,
      name:
        specialization?.name ||
        localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.UNKNOWN_SPECIALIZATION'),
      treeName: resolution.tree?.name ?? null,
      state,
      stateLabel: localize(
        SPECIALIZATION_TREE_STATE_LABELS[state] ?? SPECIALIZATION_TREE_STATE_LABELS.unresolved
      ),
      isAvailable: state === 'available',
    }
  })
}

/**
 * Build render nodes and connections for the active specialization tree.
 *
 * @param {object|null} currentTreeData - The resolved specialization tree item.
 * @param {object} actor - The actor document.
 * @param {string} currentTreeId - The active tree key.
 * @param {{ localize: (key: string) => string, talentLookup: (node: object) => object|null }} deps
 * @returns {{ renderNodes: Array<object>, renderConnections: Array<object> }}
 */
export function buildRenderNodesAndConnections(currentTreeData, actor, currentTreeId, deps) {
  const { localize, talentLookup } = deps

  if (!currentTreeData) {
    return { renderNodes: [], renderConnections: [] }
  }

  const viewModel = buildRenderViewModel(currentTreeData, talentLookup)

  const positionedNodes = viewModel.nodes.map((viewNode) => {
    const pos = computeNodePosition(viewNode.row, viewNode.column)
    return {
      nodeId: viewNode.nodeId,
      talentId: viewNode.talentId,
      talentName: viewNode.talent.name,
      talentDescription: viewNode.talent.description ?? null,
      isRanked: viewNode.isRanked,
      isActive: viewNode.isActive,
      xpCost: viewNode.cost,
      row: viewNode.row,
      column: viewNode.column,
      x: pos.x,
      y: pos.y,
    }
  })

  const nodeStates = getTreeNodesStates(actor, currentTreeId, currentTreeData)

  const renderNodes = positionedNodes.map((node) => {
    const stateResult = nodeStates.get(node.nodeId) ?? { state: NODE_STATE.INVALID }
    const enriched = enrichNode(node, stateResult, localize)
    return {
      ...enriched,
      actionable: actionableNodeViewModel({
        renderNode: enriched,
        actor,
        specializationId: currentTreeId,
        tree: currentTreeData,
        localize,
      }),
    }
  })

  const renderConnections = buildConnectionAnchors(renderNodes, viewModel.connections)

  return { renderNodes, renderConnections }
}

/**
 * Build a tree summary from rendered nodes and available XP.
 *
 * @param {string|null} currentTreeName - Name of the currently active tree.
 * @param {Array<object>} renderNodes - Enriched render nodes.
 * @param {(key: string) => string} localize
 * @param {number|null|undefined} [availableXp] - Actor's available XP.
 * @returns {object|null} Summary object or null if no tree is active.
 */
export function buildCurrentTreeSummary(currentTreeName, renderNodes, localize, availableXp) {
  if (!currentTreeName || !renderNodes.length) {
    return null
  }

  const stateCounts = renderNodes.reduce(
    (counts, node) => {
      counts[node.nodeState] = (counts[node.nodeState] ?? 0) + 1
      return counts
    },
    {
      [NODE_STATE.PURCHASED]: 0,
      [NODE_STATE.AVAILABLE]: 0,
      [NODE_STATE.LOCKED]: 0,
    }
  )

  const purchasedCount = stateCounts[NODE_STATE.PURCHASED] ?? 0
  const totalCount = renderNodes.length
  const hasAvailableXp = Number.isFinite(availableXp)

  return {
    treeName: currentTreeName,
    purchasedCount,
    totalCount,
    availableCount: stateCounts[NODE_STATE.AVAILABLE] ?? 0,
    lockedCount: stateCounts[NODE_STATE.LOCKED] ?? 0,
    availableXp: hasAvailableXp ? availableXp : null,
    progressValue: `${purchasedCount}/${totalCount}`,
    stats: [
      {
        key: 'available',
        label: localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUMMARY.ACTIONABLE'),
        value: stateCounts[NODE_STATE.AVAILABLE] ?? 0,
      },
      {
        key: 'locked',
        label: localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUMMARY.LOCKED'),
        value: stateCounts[NODE_STATE.LOCKED] ?? 0,
      },
      hasAvailableXp
        ? {
            key: 'xp',
            label: localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUMMARY.AVAILABLE_XP'),
            value: availableXp,
          }
        : null,
    ].filter(Boolean),
  }
}
