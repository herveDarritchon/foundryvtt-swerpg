/**
 * @module module/applications/specialization-tree/render-view-model
 * @description Pure builder for the specialization tree rendering view-model.
 *
 * This module is part of the extraction of PIXI-facing data preparation from
 * the application layer into a pure, isolated, testable function. It produces
 * a normalized view-model of nodes and connections that the PIXI renderer
 * (US16.4) consumes, without any dependency on `game`, `ui`, `canvas`, or PIXI.
 */

/** @import { RenderViewModel } from './types.mjs' */

/**
 * Build a pure render view-model from a resolved specialization tree.
 *
 * @param {object|null|undefined} currentTree - The resolved tree data (Item or plain object
 * with `system.nodes`, `system.connections`, `name`, `id`/`_id`).
 * @param {Function|null|undefined} talentLookup - Callback invoked for each tree node:
 * `(node: object) => {{ name: string, uuid: string, isRanked: boolean } | null}`.
 * Return `null` when the talent cannot be resolved → node marked `unresolved`.
 * @returns {RenderViewModel} Normalized view-model for PIXI rendering.
 */
export function buildRenderViewModel(currentTree, talentLookup) {
  const nodes = Array.isArray(currentTree?.system?.nodes) ? currentTree.system.nodes : []
  const connections = Array.isArray(currentTree?.system?.connections) ? currentTree.system.connections : []
  const treeName = currentTree?.name ?? ''
  const treeId = currentTree?.id ?? currentTree?._id ?? ''

  /* ── Normalise nodes ─────────────────────────────────────────── */
  const viewNodes = nodes.map((node) => {
    const resolved = typeof talentLookup === 'function' ? talentLookup(node) : null

    const isUnresolved = !resolved || !resolved.name
    const talent = isUnresolved
      ? { name: '', uuid: 'unknown', description: null }
      : { name: resolved.name, uuid: resolved.uuid ?? node.talentUuid ?? '', description: resolved.description ?? null }
    const state = isUnresolved ? 'unresolved' : 'available'
    const label = talent.name

    return {
      nodeId: node.nodeId,
      talentId: node.talentId,
      talent,
      cost: node.cost ?? 0,
      row: node.row,
      column: node.column,
      state,
      displayMeta: {
        label,
        isPurchased: false,
        isAvailable: !isUnresolved,
        isLocked: false,
        isUnresolved,
      },
      /** Extra field – consumed by the app enrichment layer */
      isRanked: resolved?.isRanked ?? false,
      isActive: resolved?.isActive ?? false,
    }
  })

  /* ── Build nodeId index for connection filtering ─────────────── */
  const nodeIdSet = new Set()
  for (const n of viewNodes) {
    nodeIdSet.add(n.nodeId)
  }

  /* ── Normalise connections ───────────────────────────────────── */
  const viewConnections = []
  for (const conn of connections) {
    if (!conn.from || !conn.to) continue
    /* Drop connections whose source or target node is absent */
    if (!nodeIdSet.has(conn.from)) continue
    if (!nodeIdSet.has(conn.to)) continue

    const type = conn.type === 'straight' || conn.type === 'angled' ? conn.type : 'straight'

    viewConnections.push({
      fromNodeId: conn.from,
      toNodeId: conn.to,
      type,
      /* isActive is populated by the state-mapping layer (US16.3) */
      isActive: false,
    })
  }

  /* ── Assemble view-model ─────────────────────────────────────── */
  return {
    nodes: viewNodes,
    connections: viewConnections,
    metadata: {
      treeName,
      treeId,
      totalNodes: viewNodes.length,
      totalConnections: viewConnections.length,
    },
  }
}
