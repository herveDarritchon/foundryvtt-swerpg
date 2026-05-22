/**
 * @module module/applications/specialization-tree/layout
 * @description Minimal layout module for the specialization tree renderer.
 *
 * Provides stable, deterministic pixel coordinates derived from logical
 * row/column grid positions. This module is pure — it has no dependency
 * on `game`, `ui`, `canvas`, PIXI, or any Foundry runtime.
 *
 * Contract:
 * - Constants are frozen and may be imported by other modules.
 * - `computeNodePosition(row, column)` maps grid → pixel space.
 * - `computeNodeCenter(node)` returns the center of a positioned node.
 * - `buildConnectionAnchors(renderNodes, connections)` builds anchor
 *   points for connection lines from already-positioned nodes.
 */

/** Width of a single talent node in pixels. */
export const NODE_WIDTH = 120

/** Height of a single talent node in pixels. */
export const NODE_HEIGHT = 48

/** Horizontal gap between nodes in pixels. */
export const H_GAP = 24

/** Vertical gap between nodes in pixels. */
export const V_GAP = 24

/** Padding from the top-left origin in pixels. */
export const PADDING = 20

/**
 * Compute the pixel position of a node from its logical row and column.
 *
 * @param {number} row Logical row (1-based or 0-based grid row).
 * @param {number} column Logical column (1-based or 0-based grid column).
 * @returns {{ x: number, y: number }} Top-left pixel coordinates.
 */
export function computeNodePosition(row, column) {
  return {
    x: column * (NODE_WIDTH + H_GAP) + PADDING,
    y: row * (NODE_HEIGHT + V_GAP) + PADDING,
  }
}

/**
 * Compute the center point of a positioned node's bounding box.
 *
 * @param {{ x: number, y: number }} node A positioned node with `x` and `y`.
 * @returns {{ centerX: number, centerY: number }} Center coordinates in pixels.
 */
export function computeNodeCenter(node) {
  return {
    centerX: node.x + NODE_WIDTH / 2,
    centerY: node.y + NODE_HEIGHT / 2,
  }
}

/**
 * Build connection anchor points from positioned render nodes and connection
 * definitions.
 *
 * @param {Array<{ nodeId: string, x: number, y: number }>} renderNodes Nodes already positioned with `x`, `y`.
 * @param {Array<{ fromNodeId: string, toNodeId: string, type?: string }>} connections Connection descriptors.
 * @returns {Array<{ fromNodeId: string, toNodeId: string, fromX: number, fromY: number, toX: number, toY: number, type: string|null }>}
 *   Connection anchor points. Missing nodes yield `(0, 0)` anchors.
 */
export function buildConnectionAnchors(renderNodes, connections) {
  const nodePositionMap = new Map()

  for (const node of renderNodes) {
    const center = computeNodeCenter(node)
    nodePositionMap.set(node.nodeId, center)
  }

  return connections.map((viewConn) => {
    const fromPos = nodePositionMap.get(viewConn.fromNodeId) ?? { centerX: 0, centerY: 0 }
    const toPos = nodePositionMap.get(viewConn.toNodeId) ?? { centerX: 0, centerY: 0 }

    return {
      fromNodeId: viewConn.fromNodeId,
      toNodeId: viewConn.toNodeId,
      fromX: fromPos.centerX,
      fromY: fromPos.centerY,
      toX: toPos.centerX,
      toY: toPos.centerY,
      type: viewConn.type ?? null,
    }
  })
}
