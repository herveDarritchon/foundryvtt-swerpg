import { describe, expect, it } from 'vitest'

import {
  NODE_WIDTH,
  NODE_HEIGHT,
  H_GAP,
  V_GAP,
  PADDING,
  computeNodePosition,
  computeNodeCenter,
  buildConnectionAnchors,
} from '../../../module/applications/specialization-tree/layout.mjs'

describe('layout constants', () => {
  it('defines expected default values', () => {
    expect(NODE_WIDTH).toBe(120)
    expect(NODE_HEIGHT).toBe(48)
    expect(H_GAP).toBe(24)
    expect(V_GAP).toBe(24)
    expect(PADDING).toBe(20)
  })
})

describe('computeNodePosition', () => {
  it('computes x from column and y from row with gaps and padding', () => {
    const pos = computeNodePosition(1, 2)
    expect(pos.x).toBe(2 * (NODE_WIDTH + H_GAP) + PADDING)
    expect(pos.y).toBe(1 * (NODE_HEIGHT + V_GAP) + PADDING)
  })

  it('returns padding-only coordinates for (0, 0)', () => {
    const pos = computeNodePosition(0, 0)
    expect(pos.x).toBe(PADDING)
    expect(pos.y).toBe(PADDING)
  })

  it('handles negative row and column', () => {
    const pos = computeNodePosition(-1, -1)
    expect(pos.x).toBe(-1 * (NODE_WIDTH + H_GAP) + PADDING)
    expect(pos.y).toBe(-1 * (NODE_HEIGHT + V_GAP) + PADDING)
  })
})

describe('computeNodeCenter', () => {
  it('returns the center of a positioned node', () => {
    const node = { x: 40, y: 50 }
    const center = computeNodeCenter(node)
    expect(center.centerX).toBe(40 + NODE_WIDTH / 2)
    expect(center.centerY).toBe(50 + NODE_HEIGHT / 2)
  })

  it('handles node at origin', () => {
    const node = { x: 0, y: 0 }
    const center = computeNodeCenter(node)
    expect(center.centerX).toBe(NODE_WIDTH / 2)
    expect(center.centerY).toBe(NODE_HEIGHT / 2)
  })
})

describe('buildConnectionAnchors', () => {
  const positionedNodes = [
    { nodeId: 'n1', x: 20, y: 20 },
    { nodeId: 'n2', x: 164, y: 20 },
  ]

  it('builds anchors for a single connection between two nodes', () => {
    const connections = [{ fromNodeId: 'n1', toNodeId: 'n2', type: 'straight' }]

    const anchors = buildConnectionAnchors(positionedNodes, connections)

    expect(anchors).toHaveLength(1)
    expect(anchors[0].fromX).toBe(20 + NODE_WIDTH / 2)
    expect(anchors[0].fromY).toBe(20 + NODE_HEIGHT / 2)
    expect(anchors[0].toX).toBe(164 + NODE_WIDTH / 2)
    expect(anchors[0].toY).toBe(20 + NODE_HEIGHT / 2)
    expect(anchors[0].type).toBe('straight')
  })

  it('defaults type to null when not provided', () => {
    const connections = [{ fromNodeId: 'n1', toNodeId: 'n2' }]

    const anchors = buildConnectionAnchors(positionedNodes, connections)

    expect(anchors[0].type).toBeNull()
  })

  it('returns empty array when no connections given', () => {
    expect(buildConnectionAnchors(positionedNodes, [])).toEqual([])
  })

  it('returns empty array when nodes list is empty', () => {
    const connections = [{ fromNodeId: 'n1', toNodeId: 'n2', type: 'straight' }]
    expect(buildConnectionAnchors([], connections)).toHaveLength(1)
  })

  it('uses (0, 0) anchor when a referenced node is missing', () => {
    const connections = [{ fromNodeId: 'n1', toNodeId: 'missing', type: 'straight' }]

    const anchors = buildConnectionAnchors(positionedNodes, connections)

    expect(anchors[0].fromX).toBe(20 + NODE_WIDTH / 2)
    expect(anchors[0].fromY).toBe(20 + NODE_HEIGHT / 2)
    expect(anchors[0].toX).toBe(0)
    expect(anchors[0].toY).toBe(0)
  })

  it('handles multiple connections', () => {
    const nodes = [
      { nodeId: 'n1', x: 20, y: 20 },
      { nodeId: 'n2', x: 164, y: 20 },
      { nodeId: 'n3', x: 20, y: 92 },
    ]
    const connections = [
      { fromNodeId: 'n1', toNodeId: 'n2', type: 'straight' },
      { fromNodeId: 'n1', toNodeId: 'n3', type: 'angled' },
    ]

    const anchors = buildConnectionAnchors(nodes, connections)

    expect(anchors).toHaveLength(2)
    expect(anchors[0].type).toBe('straight')
    expect(anchors[1].type).toBe('angled')
  })

  it('preserves node positions and does not mutate inputs', () => {
    const nodes = [{ nodeId: 'n1', x: 20, y: 20 }]
    const connections = [{ fromNodeId: 'n1', toNodeId: 'n1', type: 'straight' }]
    const originalNodesX = nodes[0].x
    const originalNodesY = nodes[0].y

    buildConnectionAnchors(nodes, connections)

    expect(nodes[0].x).toBe(originalNodesX)
    expect(nodes[0].y).toBe(originalNodesY)
  })
})
