import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../module/lib/talent-node/talent-tree-resolver.mjs', () => ({
  resolveSpecializationTree: vi.fn(),
}))

import { resolveSpecializationTree } from '../../../module/lib/talent-node/talent-tree-resolver.mjs'
import { processTalentNodeProgression } from '../../../module/lib/talent-node/talent-node-progression.mjs'
import { REASON_CODE } from '../../../module/lib/talent-node/talent-node-state.mjs'

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function buildActor(overrides = {}) {
  return {
    id: 'actor-001',
    system: {
      details: {
        specializations: [{ specializationId: 'spec-1', name: 'Bodyguard' }],
      },
      progression: {
        talentPurchases: [],
        experience: { gained: 100, spent: 0 },
      },
    },
    ...overrides,
  }
}

function buildTree(nodeOverrides = [], connectionOverrides = []) {
  return {
    id: 'tree-1',
    system: {
      specializationId: 'spec-1',
      nodes: [
        { nodeId: 'r1c1', talentId: 'talent-parry', row: 1, column: 1, cost: 5 },
        { nodeId: 'r2c1', talentId: 'talent-deflect', row: 2, column: 1, cost: 10 },
        { nodeId: 'r3c1', talentId: 'talent-reflect', row: 3, column: 1, cost: 15 },
        ...nodeOverrides,
      ],
      connections: [{ from: 'r1c1', to: 'r2c1' }, { from: 'r2c1', to: 'r3c1' }, ...connectionOverrides],
    },
  }
}

function resolvedTree(tree = buildTree()) {
  return { tree, state: 'available' }
}

// ---------------------------------------------------------------------------
// processTalentNodeProgression — common guards
// ---------------------------------------------------------------------------

describe('processTalentNodeProgression — guard clauses', () => {
  it('returns NODE_INVALID when actor is null', () => {
    const result = processTalentNodeProgression(null, 'spec-1', 'r1c1', 'purchase')
    expect(result.ok).toBe(false)
    expect(result.reasonCode).toBe(REASON_CODE.NODE_INVALID)
    expect(result.action).toBe('purchase')
  })

  it('returns NODE_INVALID when specializationId is missing', () => {
    const result = processTalentNodeProgression(buildActor(), '', 'r1c1', 'purchase')
    expect(result.ok).toBe(false)
    expect(result.reasonCode).toBe(REASON_CODE.NODE_INVALID)
  })

  it('returns NODE_INVALID when nodeId is missing', () => {
    const result = processTalentNodeProgression(buildActor(), 'spec-1', '', 'purchase')
    expect(result.ok).toBe(false)
    expect(result.reasonCode).toBe(REASON_CODE.NODE_INVALID)
  })

  it('returns NODE_INVALID for unknown action', () => {
    resolveSpecializationTree.mockReturnValue(resolvedTree())
    const result = processTalentNodeProgression(buildActor(), 'spec-1', 'r1c1', 'unknown')
    expect(result.ok).toBe(false)
    expect(result.reasonCode).toBe(REASON_CODE.NODE_INVALID)
  })

  it('returns SPECIALIZATION_NOT_OWNED when specialization is missing', () => {
    const actor = buildActor()
    actor.system.details.specializations = []
    const result = processTalentNodeProgression(actor, 'spec-unknown', 'r1c1', 'purchase')
    expect(result.ok).toBe(false)
    expect(result.reasonCode).toBe(REASON_CODE.SPECIALIZATION_NOT_OWNED)
  })

  it('returns TREE_NOT_FOUND when tree is unresolved', () => {
    resolveSpecializationTree.mockReturnValue({ tree: null, state: 'unresolved' })
    const result = processTalentNodeProgression(buildActor(), 'spec-1', 'r1c1', 'purchase')
    expect(result.ok).toBe(false)
    expect(result.reasonCode).toBe(REASON_CODE.TREE_NOT_FOUND)
  })

  it('returns TREE_INCOMPLETE when tree is incomplete', () => {
    resolveSpecializationTree.mockReturnValue({ tree: null, state: 'incomplete' })
    const result = processTalentNodeProgression(buildActor(), 'spec-1', 'r1c1', 'purchase')
    expect(result.ok).toBe(false)
    expect(result.reasonCode).toBe(REASON_CODE.TREE_INCOMPLETE)
  })

  it('returns NODE_NOT_FOUND when node does not exist in tree', () => {
    resolveSpecializationTree.mockReturnValue(resolvedTree())
    const result = processTalentNodeProgression(buildActor(), 'spec-1', 'nonexistent', 'purchase')
    expect(result.ok).toBe(false)
    expect(result.reasonCode).toBe(REASON_CODE.NODE_NOT_FOUND)
  })
})

// ---------------------------------------------------------------------------
// processTalentNodeProgression — purchase action
// ---------------------------------------------------------------------------

describe('processTalentNodeProgression — purchase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns ok=true with correct payload for a root node', () => {
    resolveSpecializationTree.mockReturnValue(resolvedTree())
    const actor = buildActor()

    const result = processTalentNodeProgression(actor, 'spec-1', 'r1c1', 'purchase')

    expect(result.ok).toBe(true)
    expect(result.action).toBe('purchase')
    expect(result.payload).toMatchObject({
      specializationId: 'spec-1',
      treeId: 'tree-1',
      nodeId: 'r1c1',
      talentId: 'talent-parry',
      cost: 5,
      updatedSpent: 5,
    })
    expect(result.payload.updatedPurchases).toHaveLength(1)
    expect(result.payload.updatedPurchases[0]).toMatchObject({
      treeId: 'tree-1',
      nodeId: 'r1c1',
      talentId: 'talent-parry',
      specializationId: 'spec-1',
    })
  })

  it('appends to existing purchases without mutating the original array', () => {
    resolveSpecializationTree.mockReturnValue(resolvedTree())
    const actor = buildActor()
    actor.system.progression.talentPurchases = [{ treeId: 'tree-1', nodeId: 'r1c1', talentId: 'talent-parry', specializationId: 'spec-1' }]
    actor.system.progression.experience.spent = 5

    // r2c1 requires r1c1 to be purchased (row 2 with connection from r1c1)
    const result = processTalentNodeProgression(actor, 'spec-1', 'r2c1', 'purchase')

    expect(result.ok).toBe(true)
    expect(result.payload.updatedPurchases).toHaveLength(2)
    expect(result.payload.updatedSpent).toBe(15)
    // Original array untouched
    expect(actor.system.progression.talentPurchases).toHaveLength(1)
  })

  it('returns ALREADY_PURCHASED when node was already purchased', () => {
    resolveSpecializationTree.mockReturnValue(resolvedTree())
    const actor = buildActor()
    actor.system.progression.talentPurchases = [{ treeId: 'tree-1', nodeId: 'r1c1', talentId: 'talent-parry', specializationId: 'spec-1' }]

    const result = processTalentNodeProgression(actor, 'spec-1', 'r1c1', 'purchase')

    expect(result.ok).toBe(false)
    expect(result.reasonCode).toBe(REASON_CODE.ALREADY_PURCHASED)
  })

  it('returns NODE_LOCKED when prerequisites are not met', () => {
    resolveSpecializationTree.mockReturnValue(resolvedTree())
    const actor = buildActor()

    const result = processTalentNodeProgression(actor, 'spec-1', 'r2c1', 'purchase')

    expect(result.ok).toBe(false)
    expect(result.reasonCode).toBe(REASON_CODE.NODE_LOCKED)
  })

  it('returns NOT_ENOUGH_XP when actor XP is insufficient', () => {
    resolveSpecializationTree.mockReturnValue(resolvedTree())
    const actor = buildActor()
    actor.system.progression.experience = { gained: 100, spent: 98 }

    const result = processTalentNodeProgression(actor, 'spec-1', 'r1c1', 'purchase')

    expect(result.ok).toBe(false)
    expect(result.reasonCode).toBe(REASON_CODE.NOT_ENOUGH_XP)
  })
})

// ---------------------------------------------------------------------------
// processTalentNodeProgression — forget action
// ---------------------------------------------------------------------------

describe('processTalentNodeProgression — forget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns ok=true with correct payload when forgetting a leaf node', () => {
    const tree = buildTree()
    resolveSpecializationTree.mockReturnValue(resolvedTree(tree))

    const actor = buildActor()
    actor.system.progression.talentPurchases = [
      { treeId: 'tree-1', treeUuid: null, nodeId: 'r1c1', talentId: 'talent-parry', talentUuid: null, specializationId: 'spec-1' },
    ]
    actor.system.progression.experience.spent = 5

    const result = processTalentNodeProgression(actor, 'spec-1', 'r1c1', 'forget')

    expect(result.ok).toBe(true)
    expect(result.action).toBe('forget')
    expect(result.payload.updatedPurchases).toHaveLength(0)
    expect(result.payload.updatedSpent).toBe(0) // 5 - 5 refunded
    expect(result.payload.cost).toBe(5)
  })

  it('removes only the forgotten node, keeping other purchases intact', () => {
    const tree = buildTree()
    resolveSpecializationTree.mockReturnValue(resolvedTree(tree))

    const actor = buildActor()
    actor.system.progression.talentPurchases = [
      { treeId: 'tree-1', treeUuid: null, nodeId: 'r1c1', talentId: 'talent-parry', talentUuid: null, specializationId: 'spec-1' },
      { treeId: 'tree-1', treeUuid: null, nodeId: 'r2c1', talentId: 'talent-deflect', talentUuid: null, specializationId: 'spec-1' },
    ]
    actor.system.progression.experience.spent = 15

    // Can forget r2c1 (leaf) even though r1c1 points to it, because r3c1 is not purchased
    const result = processTalentNodeProgression(actor, 'spec-1', 'r2c1', 'forget')

    expect(result.ok).toBe(true)
    expect(result.payload.updatedPurchases).toHaveLength(1)
    expect(result.payload.updatedPurchases[0].nodeId).toBe('r1c1')
    expect(result.payload.updatedSpent).toBe(5) // 15 - 10 refunded
    // Original array untouched
    expect(actor.system.progression.talentPurchases).toHaveLength(2)
  })

  it('returns NODE_NOT_PURCHASED when node is not in actor purchases', () => {
    resolveSpecializationTree.mockReturnValue(resolvedTree())
    const actor = buildActor()
    actor.system.progression.talentPurchases = []

    const result = processTalentNodeProgression(actor, 'spec-1', 'r1c1', 'forget')

    expect(result.ok).toBe(false)
    expect(result.reasonCode).toBe(REASON_CODE.NODE_NOT_PURCHASED)
  })

  it('returns NODE_HAS_DEPENDENTS when a downstream node is purchased', () => {
    const tree = buildTree()
    resolveSpecializationTree.mockReturnValue(resolvedTree(tree))

    const actor = buildActor()
    actor.system.progression.talentPurchases = [
      { treeId: 'tree-1', treeUuid: null, nodeId: 'r1c1', talentId: 'talent-parry', talentUuid: null, specializationId: 'spec-1' },
      { treeId: 'tree-1', treeUuid: null, nodeId: 'r2c1', talentId: 'talent-deflect', talentUuid: null, specializationId: 'spec-1' },
    ]
    actor.system.progression.experience.spent = 15

    // r1c1 has r2c1 as dependent (via connection r1c1→r2c1), r2c1 is purchased → blocked
    const result = processTalentNodeProgression(actor, 'spec-1', 'r1c1', 'forget')

    expect(result.ok).toBe(false)
    expect(result.reasonCode).toBe(REASON_CODE.NODE_HAS_DEPENDENTS)
    expect(result.dependents).toContain('r2c1')
  })

  it('returns NODE_HAS_DEPENDENTS listing all purchased dependents', () => {
    const tree = buildTree([{ nodeId: 'r2c2', talentId: 'talent-dodge', row: 2, column: 2, cost: 10 }], [{ from: 'r1c1', to: 'r2c2' }])
    resolveSpecializationTree.mockReturnValue(resolvedTree(tree))

    const actor = buildActor()
    actor.system.progression.talentPurchases = [
      { treeId: 'tree-1', treeUuid: null, nodeId: 'r1c1', talentId: 'talent-parry', talentUuid: null, specializationId: 'spec-1' },
      { treeId: 'tree-1', treeUuid: null, nodeId: 'r2c1', talentId: 'talent-deflect', talentUuid: null, specializationId: 'spec-1' },
      { treeId: 'tree-1', treeUuid: null, nodeId: 'r2c2', talentId: 'talent-dodge', talentUuid: null, specializationId: 'spec-1' },
    ]
    actor.system.progression.experience.spent = 25

    const result = processTalentNodeProgression(actor, 'spec-1', 'r1c1', 'forget')

    expect(result.ok).toBe(false)
    expect(result.reasonCode).toBe(REASON_CODE.NODE_HAS_DEPENDENTS)
    expect(result.dependents).toHaveLength(2)
    expect(result.dependents).toContain('r2c1')
    expect(result.dependents).toContain('r2c2')
  })

  it('does not block forget when downstream node is not purchased', () => {
    const tree = buildTree()
    resolveSpecializationTree.mockReturnValue(resolvedTree(tree))

    const actor = buildActor()
    // Only r1c1 purchased; r2c1 is not purchased so r1c1 is a safe leaf
    actor.system.progression.talentPurchases = [
      { treeId: 'tree-1', treeUuid: null, nodeId: 'r1c1', talentId: 'talent-parry', talentUuid: null, specializationId: 'spec-1' },
    ]
    actor.system.progression.experience.spent = 5

    const result = processTalentNodeProgression(actor, 'spec-1', 'r1c1', 'forget')

    expect(result.ok).toBe(true)
    expect(result.payload.updatedSpent).toBe(0)
  })

  it('handles actor with no purchases field gracefully', () => {
    resolveSpecializationTree.mockReturnValue(resolvedTree())
    const actor = buildActor()
    actor.system.progression = {}

    const result = processTalentNodeProgression(actor, 'spec-1', 'r1c1', 'forget')

    expect(result.ok).toBe(false)
    expect(result.reasonCode).toBe(REASON_CODE.NODE_NOT_PURCHASED)
  })
})
