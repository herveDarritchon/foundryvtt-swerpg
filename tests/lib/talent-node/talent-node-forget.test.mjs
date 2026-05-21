import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../module/utils/logger.mjs', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../../module/utils/audit-log.mjs', () => ({
  recordTalentNodeOperation: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../module/lib/talent-node/talent-tree-resolver.mjs', () => ({
  resolveSpecializationTree: vi.fn(),
}))

import { logger } from '../../../module/utils/logger.mjs'
import { recordTalentNodeOperation } from '../../../module/utils/audit-log.mjs'
import { resolveSpecializationTree } from '../../../module/lib/talent-node/talent-tree-resolver.mjs'
import { forgetTalentNode } from '../../../module/lib/talent-node/talent-node-forget.mjs'
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
        talentPurchases: [
          { treeId: 'tree-1', treeUuid: null, nodeId: 'r1c1', talentId: 'talent-parry', talentUuid: null, specializationId: 'spec-1' },
        ],
        experience: { gained: 100, spent: 5 },
      },
    },
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function buildResolvedTree(nodeOverrides = [], connectionOverrides = []) {
  return {
    tree: {
      id: 'tree-1',
      system: {
        specializationId: 'spec-1',
        nodes: [
          { nodeId: 'r1c1', talentId: 'talent-parry', row: 1, column: 1, cost: 5 },
          { nodeId: 'r2c1', talentId: 'talent-deflect', row: 2, column: 1, cost: 10 },
          ...nodeOverrides,
        ],
        connections: [{ from: 'r1c1', to: 'r2c1' }, ...connectionOverrides],
      },
    },
    state: 'available',
  }
}

// ---------------------------------------------------------------------------
// forgetTalentNode — nominal flows
// ---------------------------------------------------------------------------

describe('forgetTalentNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('nominal forget flow', () => {
    it('forgets a purchased leaf node and refunds XP atomically', async () => {
      const actor = buildActor()
      resolveSpecializationTree.mockReturnValue(buildResolvedTree())

      const result = await forgetTalentNode(actor, 'spec-1', 'r1c1')

      expect(result.ok).toBe(true)
      expect(result.purchase).toMatchObject({
        treeId: 'tree-1',
        treeUuid: null,
        nodeId: 'r1c1',
        talentId: 'talent-parry',
        talentUuid: null,
        specializationId: 'spec-1',
        cost: 5,
      })
    })

    it('calls actor.update exactly once with both talentPurchases and experience.spent', async () => {
      const actor = buildActor()
      resolveSpecializationTree.mockReturnValue(buildResolvedTree())

      await forgetTalentNode(actor, 'spec-1', 'r1c1')

      expect(actor.update).toHaveBeenCalledTimes(1)
      expect(actor.update).toHaveBeenCalledWith({
        'system.progression.talentPurchases': [],
        'system.progression.experience.spent': 0,
      })
    })

    it('removes only the forgotten node, keeping other purchases intact', async () => {
      const actor = buildActor({
        system: {
          details: { specializations: [{ specializationId: 'spec-1' }] },
          progression: {
            talentPurchases: [
              { treeId: 'tree-1', treeUuid: null, nodeId: 'r1c1', talentId: 'talent-parry', talentUuid: null, specializationId: 'spec-1' },
              { treeId: 'tree-1', treeUuid: null, nodeId: 'r2c1', talentId: 'talent-deflect', talentUuid: null, specializationId: 'spec-1' },
            ],
            experience: { gained: 100, spent: 15 },
          },
        },
      })
      resolveSpecializationTree.mockReturnValue(buildResolvedTree())

      // r2c1 is a leaf (no node after it), so forgetting it is allowed
      const result = await forgetTalentNode(actor, 'spec-1', 'r2c1')

      expect(result.ok).toBe(true)
      expect(actor.update).toHaveBeenCalledWith({
        'system.progression.talentPurchases': [
          { treeId: 'tree-1', treeUuid: null, nodeId: 'r1c1', talentId: 'talent-parry', talentUuid: null, specializationId: 'spec-1' },
        ],
        'system.progression.experience.spent': 5,
      })
    })

    it('XP refund is symmetric to the purchase cost', async () => {
      const actor = buildActor({
        system: {
          details: { specializations: [{ specializationId: 'spec-1' }] },
          progression: {
            talentPurchases: [
              { treeId: 'tree-1', treeUuid: null, nodeId: 'r2c1', talentId: 'talent-deflect', talentUuid: null, specializationId: 'spec-1' },
            ],
            // Simulating that r2c1 (cost 10) was purchased, r1c1 is not a dependency we care about here
            experience: { gained: 100, spent: 10 },
          },
        },
      })
      // Patch tree so r2c1 is a root (row 1) to avoid lock logic complications
      const treeWithR2Root = {
        tree: {
          id: 'tree-1',
          system: {
            specializationId: 'spec-1',
            nodes: [{ nodeId: 'r2c1', talentId: 'talent-deflect', row: 1, column: 1, cost: 10 }],
            connections: [],
          },
        },
        state: 'available',
      }
      resolveSpecializationTree.mockReturnValue(treeWithR2Root)

      const result = await forgetTalentNode(actor, 'spec-1', 'r2c1')

      expect(result.ok).toBe(true)
      const [patchArg] = actor.update.mock.calls[0]
      expect(patchArg['system.progression.experience.spent']).toBe(0) // 10 - 10
    })
  })

    it('emits a forget-succeeded audit event on success', async () => {
      const actor = buildActor()
      resolveSpecializationTree.mockReturnValue(buildResolvedTree())

      await forgetTalentNode(actor, 'spec-1', 'r1c1')

      expect(recordTalentNodeOperation).toHaveBeenCalledTimes(1)
      expect(recordTalentNodeOperation).toHaveBeenCalledWith(
        actor,
        'forget',
        'succeeded',
        expect.objectContaining({
          specializationId: 'spec-1',
          treeId: 'tree-1',
          nodeId: 'r1c1',
          talentId: 'talent-parry',
          cost: 5,
          previousXp: 5,
          nextXp: 0,
        }),
      )
    })

    it('succeeds even when audit log write fails (non-blocking)', async () => {
      const actor = buildActor()
      resolveSpecializationTree.mockReturnValue(buildResolvedTree())
      recordTalentNodeOperation.mockRejectedValue(new Error('Audit write failed'))

      const result = await forgetTalentNode(actor, 'spec-1', 'r1c1')

      expect(result.ok).toBe(true)
      expect(logger.warn).toHaveBeenCalledWith(
        '[TalentNodeForget] Audit log write failed (non-blocking)',
        expect.objectContaining({ actorId: 'actor-001', nodeId: 'r1c1' }),
      )
    })

  // ---------------------------------------------------------------------------
  // forgetTalentNode — rejection cases (no actor.update emitted)
  // ---------------------------------------------------------------------------

  describe('rejection — no actor.update emitted', () => {
    it('returns error when actor is null', async () => {
      const result = await forgetTalentNode(null, 'spec-1', 'r1c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.NODE_INVALID)
      expect(result.reason).toContain('Missing actor')
    })

    it('returns error when specializationId is missing', async () => {
      const actor = buildActor()
      const result = await forgetTalentNode(actor, '', 'r1c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.NODE_INVALID)
      expect(actor.update).not.toHaveBeenCalled()
    })

    it('returns error when nodeId is missing', async () => {
      const actor = buildActor()
      const result = await forgetTalentNode(actor, 'spec-1', '')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.NODE_INVALID)
      expect(actor.update).not.toHaveBeenCalled()
    })

    it('returns error when specialization is not owned', async () => {
      const actor = buildActor()
      actor.system.details.specializations = []

      const result = await forgetTalentNode(actor, 'spec-unknown', 'r1c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.SPECIALIZATION_NOT_OWNED)
      expect(actor.update).not.toHaveBeenCalled()
    })

    it('returns error when tree is unresolved', async () => {
      const actor = buildActor()
      resolveSpecializationTree.mockReturnValue({ tree: null, state: 'unresolved' })

      const result = await forgetTalentNode(actor, 'spec-1', 'r1c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.TREE_NOT_FOUND)
      expect(actor.update).not.toHaveBeenCalled()
    })

    it('returns error when tree is incomplete', async () => {
      const actor = buildActor()
      resolveSpecializationTree.mockReturnValue({ tree: null, state: 'incomplete' })

      const result = await forgetTalentNode(actor, 'spec-1', 'r1c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.TREE_INCOMPLETE)
      expect(actor.update).not.toHaveBeenCalled()
    })

    it('returns error when node is not found in tree', async () => {
      const actor = buildActor()
      resolveSpecializationTree.mockReturnValue(buildResolvedTree())

      const result = await forgetTalentNode(actor, 'spec-1', 'nonexistent')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.NODE_NOT_FOUND)
      expect(actor.update).not.toHaveBeenCalled()
    })

    it('returns error when node is not purchased', async () => {
      const actor = buildActor({
        system: {
          details: { specializations: [{ specializationId: 'spec-1' }] },
          progression: {
            talentPurchases: [],
            experience: { gained: 100, spent: 0 },
          },
        },
      })
      resolveSpecializationTree.mockReturnValue(buildResolvedTree())

      const result = await forgetTalentNode(actor, 'spec-1', 'r1c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.NODE_NOT_PURCHASED)
      expect(actor.update).not.toHaveBeenCalled()
    })

    it('returns NODE_HAS_DEPENDENTS with dependent list when a downstream node is still purchased', async () => {
      const actor = buildActor({
        system: {
          details: { specializations: [{ specializationId: 'spec-1' }] },
          progression: {
            talentPurchases: [
              { treeId: 'tree-1', treeUuid: null, nodeId: 'r1c1', talentId: 'talent-parry', talentUuid: null, specializationId: 'spec-1' },
              { treeId: 'tree-1', treeUuid: null, nodeId: 'r2c1', talentId: 'talent-deflect', talentUuid: null, specializationId: 'spec-1' },
            ],
            experience: { gained: 100, spent: 15 },
          },
        },
      })
      resolveSpecializationTree.mockReturnValue(buildResolvedTree())

      // r1c1 → r2c1 is connected; r2c1 is purchased, so r1c1 cannot be forgotten
      const result = await forgetTalentNode(actor, 'spec-1', 'r1c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.NODE_HAS_DEPENDENTS)
      expect(result.dependents).toContain('r2c1')
      expect(actor.update).not.toHaveBeenCalled()
    })

    it('emits a forget-failed audit event on business rejection', async () => {
      const actor = buildActor()
      resolveSpecializationTree.mockReturnValue(buildResolvedTree())
      actor.system.progression.talentPurchases = []

      const result = await forgetTalentNode(actor, 'spec-1', 'r1c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.NODE_NOT_PURCHASED)
      expect(recordTalentNodeOperation).toHaveBeenCalledTimes(1)
      expect(recordTalentNodeOperation).toHaveBeenCalledWith(
        actor,
        'forget',
        'failed',
        expect.objectContaining({
          specializationId: 'spec-1',
          nodeId: 'r1c1',
          reasonCode: REASON_CODE.NODE_NOT_PURCHASED,
        }),
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Persisted entry structure invariants
  // ---------------------------------------------------------------------------

  describe('persisted entry structure', () => {
    it('the purchase entry returned has the canonical shape with all 7 fields', async () => {
      const actor = buildActor()
      resolveSpecializationTree.mockReturnValue(buildResolvedTree())

      const result = await forgetTalentNode(actor, 'spec-1', 'r1c1')

      expect(result.ok).toBe(true)
      expect(Object.keys(result.purchase)).toEqual(
        expect.arrayContaining(['treeId', 'treeUuid', 'nodeId', 'talentId', 'talentUuid', 'specializationId', 'cost']),
      )
    })

    it('the patch contains both system.progression keys', async () => {
      const actor = buildActor()
      resolveSpecializationTree.mockReturnValue(buildResolvedTree())

      await forgetTalentNode(actor, 'spec-1', 'r1c1')

      const [patchArg] = actor.update.mock.calls[0]
      expect(patchArg).toHaveProperty('system.progression.talentPurchases')
      expect(patchArg).toHaveProperty('system.progression.experience.spent')
    })
  })
})