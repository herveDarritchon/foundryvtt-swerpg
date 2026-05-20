import { describe, expect, it } from 'vitest'

import { buildRenderViewModel } from '../../../module/applications/specialization-tree/render-view-model.mjs'

function mockTree(overrides = {}) {
  return {
    id: 'tree-1',
    name: 'Jedi Sentinel',
    system: {
      nodes: [
        { nodeId: 'n1', talentId: 'talent-parry', cost: 5, row: 1, column: 1 },
        { nodeId: 'n2', talentId: 'talent-grit', cost: 10, row: 1, column: 2 },
      ],
      connections: [
        { from: 'n1', to: 'n2', type: 'straight' },
      ],
    },
    ...overrides,
  }
}

function mockTalentLookup(node) {
  const talents = {
    'talent-parry': { name: 'Parry', uuid: 'Item.talent-parry-uuid', isRanked: true },
    'talent-grit': { name: 'Grit', uuid: 'Item.talent-grit-uuid', isRanked: false },
  }
  return talents[node.talentId] ?? null
}

describe('buildRenderViewModel', () => {
  it('returns empty view-model for null currentTree', () => {
    const result = buildRenderViewModel(null, mockTalentLookup)

    expect(result.nodes).toEqual([])
    expect(result.connections).toEqual([])
    expect(result.metadata.totalNodes).toBe(0)
    expect(result.metadata.totalConnections).toBe(0)
  })

  it('returns empty view-model for undefined currentTree', () => {
    const result = buildRenderViewModel(undefined, mockTalentLookup)

    expect(result.nodes).toEqual([])
    expect(result.connections).toEqual([])
  })

  it('returns empty view-model for tree without nodes', () => {
    const tree = { id: 'empty', name: 'Empty', system: { nodes: [], connections: [] } }
    const result = buildRenderViewModel(tree, mockTalentLookup)

    expect(result.nodes).toEqual([])
    expect(result.connections).toEqual([])
    expect(result.metadata.treeName).toBe('Empty')
    expect(result.metadata.treeId).toBe('empty')
  })

  it('normalises all nodes and connections for a nominal tree', () => {
    const tree = mockTree()
    const result = buildRenderViewModel(tree, mockTalentLookup)

    expect(result.nodes).toHaveLength(2)
    expect(result.connections).toHaveLength(1)

    expect(result.nodes[0].nodeId).toBe('n1')
    expect(result.nodes[0].talent.name).toBe('Parry')
    expect(result.nodes[0].talent.uuid).toBe('Item.talent-parry-uuid')
    expect(result.nodes[0].cost).toBe(5)
    expect(result.nodes[0].row).toBe(1)
    expect(result.nodes[0].column).toBe(1)
    expect(result.nodes[0].state).toBe('available')
    expect(result.nodes[0].displayMeta.isAvailable).toBe(true)
    expect(result.nodes[0].displayMeta.isUnresolved).toBe(false)
    expect(result.nodes[0].isRanked).toBe(true)

    expect(result.nodes[1].nodeId).toBe('n2')
    expect(result.nodes[1].talent.name).toBe('Grit')
    expect(result.nodes[1].isRanked).toBe(false)

    expect(result.connections[0].fromNodeId).toBe('n1')
    expect(result.connections[0].toNodeId).toBe('n2')
    expect(result.connections[0].type).toBe('straight')
    expect(result.connections[0].isActive).toBe(false)
  })

  it('marks node as unresolved when talentLookup returns null', () => {
    const tree = mockTree()
    const result = buildRenderViewModel(tree, () => null)

    expect(result.nodes).toHaveLength(2)
    for (const node of result.nodes) {
      expect(node.state).toBe('unresolved')
      expect(node.talent.name).toBe('')
      expect(node.talent.uuid).toBe('unknown')
      expect(node.displayMeta.isUnresolved).toBe(true)
      expect(node.displayMeta.isAvailable).toBe(false)
    }
  })

  it('marks node as unresolved when talentLookup returns empty name', () => {
    const tree = mockTree()
    const result = buildRenderViewModel(tree, () => ({ name: '', uuid: '', isRanked: false }))

    expect(result.nodes[0].state).toBe('unresolved')
    expect(result.nodes[0].talent.name).toBe('')
    expect(result.nodes[0].talent.uuid).toBe('unknown')
  })

  it('fallback to unresolved when talentLookup is not a function', () => {
    const tree = mockTree()
    const result = buildRenderViewModel(tree, null)

    for (const node of result.nodes) {
      expect(node.state).toBe('unresolved')
      expect(node.talent.uuid).toBe('unknown')
    }
  })

  it('filters connections whose source or target node is absent', () => {
    const tree = mockTree()
    tree.system.connections.push(
      { from: 'n1', to: 'n-missing', type: 'straight' },
      { from: 'n-missing', to: 'n2', type: 'straight' },
      { from: 'n-missing', to: 'n-other-missing', type: 'straight' },
    )
    const result = buildRenderViewModel(tree, mockTalentLookup)

    expect(result.connections).toHaveLength(1)
    expect(result.connections[0].fromNodeId).toBe('n1')
    expect(result.connections[0].toNodeId).toBe('n2')
  })

  it('skips connections with missing from or to fields', () => {
    const tree = mockTree()
    tree.system.connections.push(
      { from: 'n1', type: 'straight' },
      { to: 'n2', type: 'straight' },
      {},
    )
    const result = buildRenderViewModel(tree, mockTalentLookup)

    expect(result.connections).toHaveLength(1)
  })

  it('defaults non-standard connection types to straight', () => {
    const tree = mockTree()
    tree.system.connections[0].type = 'curved'
    const result = buildRenderViewModel(tree, mockTalentLookup)

    expect(result.connections[0].type).toBe('straight')
  })

  it('preserves straight and angled connection types', () => {
    const tree = mockTree()
    tree.system.connections = [
      { from: 'n1', to: 'n2', type: 'straight' },
    ]
    let result = buildRenderViewModel(tree, mockTalentLookup)
    expect(result.connections[0].type).toBe('straight')

    tree.system.connections[0].type = 'angled'
    result = buildRenderViewModel(tree, mockTalentLookup)
    expect(result.connections[0].type).toBe('angled')
  })

  it('sets metadata correctly', () => {
    const tree = mockTree({ id: 'tree-42', name: 'Jedi Consular' })
    const result = buildRenderViewModel(tree, mockTalentLookup)

    expect(result.metadata.treeName).toBe('Jedi Consular')
    expect(result.metadata.treeId).toBe('tree-42')
    expect(result.metadata.totalNodes).toBe(2)
    expect(result.metadata.totalConnections).toBe(1)
  })

  it('handles tree with _id fallback for treeId', () => {
    const tree = mockTree({ _id: 'fallback-id', id: undefined })
    delete tree.id
    const result = buildRenderViewModel(tree, mockTalentLookup)

    expect(result.metadata.treeId).toBe('fallback-id')
  })

  it('does not mutate the input tree', () => {
    const tree = mockTree()
    const originalNodes = tree.system.nodes.length
    const originalConns = tree.system.connections.length

    buildRenderViewModel(tree, mockTalentLookup)

    expect(tree.system.nodes).toHaveLength(originalNodes)
    expect(tree.system.connections).toHaveLength(originalConns)
  })

  it('uses node.talentUuid for fallback uuid when resolved talent has no uuid', () => {
    const tree = mockTree()
    tree.system.nodes[0].talentUuid = 'Item.parry-direct-uuid'
    const result = buildRenderViewModel(tree, (node) => ({
      name: 'Parry',
      isRanked: true,
    }))

    expect(result.nodes[0].talent.uuid).toBe('Item.parry-direct-uuid')
  })

  it('sets cost to 0 when node has no cost field', () => {
    const tree = mockTree()
    tree.system.nodes[0].cost = undefined
    const result = buildRenderViewModel(tree, mockTalentLookup)

    expect(result.nodes[0].cost).toBe(0)
  })
})
