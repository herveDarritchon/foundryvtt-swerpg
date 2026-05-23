import { describe, it, expect, vi } from 'vitest'

import {
  buildSpecializationEntries,
  buildRenderNodesAndConnections,
  buildCurrentTreeSummary,
} from '../../../module/applications/specialization-tree/tree-context-builder.mjs'

describe('tree-context-builder (pure)', () => {
  it('builds specialization entries with labels and availability', () => {
    const specializations = [
      { specializationId: 'spec-a', name: 'A', treeUuid: 'Item.tree-a' },
      { specializationId: 'spec-b', name: 'B', treeUuid: 'Item.tree-b' },
    ]

    const resolutions = new Map([
      ['spec-a', { tree: { name: 'Tree A' }, state: 'available' }],
      ['spec-b', { tree: null, state: 'unresolved' }],
    ])

    const localize = (k) => k

    const entries = buildSpecializationEntries(specializations, resolutions, localize)

    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({ key: 'spec-a', treeName: 'Tree A', state: 'available', isAvailable: true })
    expect(entries[1]).toMatchObject({ key: 'spec-b', treeName: null, state: 'unresolved', isAvailable: false })
  })

  it('builds specialization entries with name fallback key when no ids exist', () => {
    const specializations = [
      { name: 'Spec One' },
    ]

    const resolutions = new Map([
      ['Spec One', { tree: { name: 'Tree One' }, state: 'available' }],
    ])

    const localize = (k) => k

    const entries = buildSpecializationEntries(specializations, resolutions, localize)

    expect(entries).toHaveLength(1)
    expect(entries[0].key).toBe('Spec One')
    expect(entries[0].isAvailable).toBe(true)
  })

  it('marks entries as unresolved when resolution is missing', () => {
    const specializations = [
      { specializationId: 'spec-missing', name: 'Ghost' },
    ]

    const resolutions = new Map()

    const localize = (k) => k

    const entries = buildSpecializationEntries(specializations, resolutions, localize)

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ key: 'spec-missing', treeName: null, state: 'unresolved', isAvailable: false })
  })

  it('builds render nodes and connections from tree data', () => {
    const currentTreeData = {
      system: {
        nodes: [
          { nodeId: 'n1', talentId: 'Item.t1', row: 1, column: 1, cost: 5 },
          { nodeId: 'n2', talentId: 'Item.t2', row: 1, column: 2, cost: 8 },
        ],
        connections: [{ from: 'n1', to: 'n2', type: 'straight' }],
      },
    }

    const actor = {
      system: {
        progression: { talentPurchases: [], experience: { available: 10 } },
        details: { specializations: [] },
      },
    }

    const localize = (k) => k
    const talentLookup = (node) => ({ name: node.talentId === 'Item.t1' ? 'T1' : 'T2' })

    const { renderNodes, renderConnections } = buildRenderNodesAndConnections(currentTreeData, actor, 'spec', {
      localize,
      talentLookup,
    })

    expect(renderNodes).toHaveLength(2)
    expect(renderNodes[0]).toHaveProperty('nodeId', 'n1')
    expect(typeof renderNodes[0].x).toBe('number')
    expect(typeof renderNodes[0].y).toBe('number')
    expect(renderConnections).toHaveLength(1)
    expect(renderConnections[0]).toMatchObject({ fromNodeId: 'n1', toNodeId: 'n2', type: 'straight' })
  })

  it('returns empty arrays when no tree data is given', () => {
    const actor = {
      system: {
        progression: { talentPurchases: [], experience: { available: 10 } },
        details: { specializations: [] },
      },
    }

    const localize = (k) => k
    const talentLookup = vi.fn()

    const { renderNodes, renderConnections } = buildRenderNodesAndConnections(null, actor, 'spec', {
      localize,
      talentLookup,
    })

    expect(renderNodes).toHaveLength(0)
    expect(renderConnections).toHaveLength(0)
  })

  it('enriches render nodes with actionable primaryAction and flags', () => {
    const currentTreeData = {
      system: {
        nodes: [
          { nodeId: 'n1', talentId: 'Item.t1', row: 1, column: 1, cost: 5 },
          { nodeId: 'n2', talentId: 'Item.t2', row: 2, column: 1, cost: 10 },
        ],
        connections: [{ from: 'n1', to: 'n2' }],
      },
    }

    const actor = {
      id: 'actor-1',
      system: {
        progression: {
          talentPurchases: [],
          experience: { available: 100 },
        },
        details: { specializations: [{ specializationId: 'spec', name: 'Spec', treeUuid: 'Item.tree' }] },
      },
    }

    const localize = (k) => k
    const talentLookup = (node) => ({
      name: node.talentId === 'Item.t1' ? 'Tough' : 'Grit',
      isRanked: node.talentId === 'Item.t1',
      isActive: false,
    })

    const { renderNodes } = buildRenderNodesAndConnections(currentTreeData, actor, 'spec', {
      localize,
      talentLookup,
    })

    expect(renderNodes).toHaveLength(2)
    expect(renderNodes[0]).toHaveProperty('actionable')
    expect(renderNodes[0].actionable.primaryAction).toBe('purchase')
    expect(renderNodes[0].actionable.canPurchase).toBe(true)
    expect(renderNodes[0].actionable.actionRef).toMatchObject({
      specializationId: 'spec',
      nodeId: 'n1',
      talentId: 'Item.t1',
      cost: 5,
    })
  })

  it('builds a current tree summary with XP when provided', () => {
    const renderNodes = [
      { nodeState: 'purchased' },
      { nodeState: 'available' },
      { nodeState: 'locked' },
    ]

    const localize = (k) => k

    const summary = buildCurrentTreeSummary('Tree X', renderNodes, localize, 42)

    expect(summary).toMatchObject({ treeName: 'Tree X', purchasedCount: 1, totalCount: 3, availableXp: 42 })
    expect(summary.stats.some((s) => s.key === 'xp' && s.value === 42)).toBe(true)
  })

  it('builds tree summary without XP when undefined', () => {
    const renderNodes = [
      { nodeState: 'purchased' },
      { nodeState: 'purchased' },
    ]

    const summary = buildCurrentTreeSummary('Tree Y', renderNodes, (k) => k, undefined)

    expect(summary).toMatchObject({ treeName: 'Tree Y', purchasedCount: 2, totalCount: 2 })
    expect(summary.stats.some((s) => s.key === 'xp')).toBe(false)
  })

  it('returns null summary when no tree name or nodes', () => {
    expect(buildCurrentTreeSummary(null, [], (k) => k, 0)).toBeNull()
    expect(buildCurrentTreeSummary('', [{ nodeState: 'available' }], (k) => k, 0)).toBeNull()
  })

  it('returns empty context when no actor', () => {
    // Note: this tests the pure builder directly via buildSpecializationEntries + edge
    // The full buildSpecializationTreeContext wrapper in app.mjs adds back actor fields
    const entries = buildSpecializationEntries([], new Map(), (k) => k)
    expect(entries).toHaveLength(0)
  })

  describe('canonicalSpecializationId', () => {
    it('buildSpecializationEntries includes canonicalSpecializationId from tree.system.specializationId', () => {
      const specializations = [{ specializationId: 'spec-a', name: 'A', treeUuid: 'Item.tree-a' }]

      const resolutions = new Map([
        ['spec-a', {
          tree: { name: 'Tree A', system: { specializationId: 'canonical-v1' } },
          state: 'available',
        }],
      ])

      const entries = buildSpecializationEntries(specializations, resolutions, () => 'x')

      expect(entries[0].canonicalSpecializationId).toBe('canonical-v1')
    })

    it('buildSpecializationEntries falls back to specialization.specializationId when tree has no specializationId', () => {
      const specializations = [{ specializationId: 'spec-b', name: 'B', treeUuid: 'Item.tree-b' }]

      const resolutions = new Map([
        ['spec-b', {
          tree: { name: 'Tree B', system: {} },
          state: 'available',
        }],
      ])

      const entries = buildSpecializationEntries(specializations, resolutions, () => 'x')

      expect(entries[0].canonicalSpecializationId).toBe('spec-b')
    })

    it('buildSpecializationEntries falls back to key when neither tree nor specialization has specializationId (legacy)', () => {
      const specializations = [{ name: 'Legacy Spec', treeUuid: 'Item.legacy' }]

      const resolutions = new Map([
        ['Item.legacy', {
          tree: { name: 'Legacy Tree', system: {} },
          state: 'available',
        }],
      ])

      const entries = buildSpecializationEntries(specializations, resolutions, () => 'x')

      expect(entries[0].canonicalSpecializationId).toBe('Item.legacy')
    })
  })
})
