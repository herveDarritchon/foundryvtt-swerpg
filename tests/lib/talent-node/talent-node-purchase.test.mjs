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
  recordTalentNodePurchase: vi.fn(),
}))

vi.mock('../../../module/lib/talent-node/talent-tree-resolver.mjs', () => ({
  resolveSpecializationTree: vi.fn(),
}))

import { logger } from '../../../module/utils/logger.mjs'
import { recordTalentNodePurchase } from '../../../module/utils/audit-log.mjs'
import { resolveSpecializationTree } from '../../../module/lib/talent-node/talent-tree-resolver.mjs'
import { purchaseTalentNode } from '../../../module/lib/talent-node/talent-node-purchase.mjs'
import { REASON_CODE } from '../../../module/lib/talent-node/talent-node-state.mjs'

function buildActor(overrides = {}) {
  return {
    id: 'actor-001',
    system: {
      details: {
        specializations: [
          { specializationId: 'spec-1', name: 'Bodyguard' },
        ],
      },
      progression: {
        talentPurchases: [],
        experience: { gained: 100, spent: 0 },
      },
    },
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function buildSpecializationData(overrides = {}) {
  return {
    specializationId: 'spec-1',
    treeUuid: 'Item.tree-uuid',
    name: 'Bodyguard',
    ...overrides,
  }
}

function buildResolvedTree(overrides = {}) {
  return {
    tree: {
      id: 'tree-1',
      system: {
        specializationId: 'spec-1',
        nodes: [
          { nodeId: 'r1c1', talentId: 'talent-parry', row: 1, column: 1, cost: 5 },
        ],
        connections: [{ from: 'r1c1', to: 'r2c1' }],
      },
      ...overrides.tree,
    },
    state: 'available',
  }
}

describe('TalentNodePurchase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('purchaseTalentNode', () => {
    it('purchases an available root node successfully', async () => {
      const actor = buildActor()
      const treeData = buildResolvedTree()
      resolveSpecializationTree.mockReturnValue(treeData)

      const result = await purchaseTalentNode(actor, 'spec-1', 'r1c1')

      expect(result.ok).toBe(true)
      expect(result.purchase).toMatchObject({
        treeId: 'tree-1',
        nodeId: 'r1c1',
        talentId: 'talent-parry',
        specializationId: 'spec-1',
        cost: 5,
      })
      expect(actor.update).toHaveBeenCalledWith({
        'system.progression.talentPurchases': [
          { treeId: 'tree-1', nodeId: 'r1c1', talentId: 'talent-parry', specializationId: 'spec-1' },
        ],
        'system.progression.experience.spent': 5,
      })
    })

    it('returns error when actor is null', async () => {
      const result = await purchaseTalentNode(null, 'spec-1', 'r1c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.NODE_INVALID)
      expect(result.reason).toContain('Missing actor')
    })

    it('returns error when specializationId is missing', async () => {
      const result = await purchaseTalentNode(buildActor(), '', 'r1c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.NODE_INVALID)
      expect(result.reason).toContain('Missing specializationId')
    })

    it('returns error when nodeId is missing', async () => {
      const result = await purchaseTalentNode(buildActor(), 'spec-1', '')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.NODE_INVALID)
      expect(result.reason).toContain('Missing specializationId')
    })

    it('returns error when specialization is not owned', async () => {
      const actor = buildActor()
      actor.system.details.specializations = []

      const result = await purchaseTalentNode(actor, 'spec-unknown', 'r1c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.SPECIALIZATION_NOT_OWNED)
      expect(result.reason).toContain('spec-unknown')
    })

    it('returns error when tree is unresolved', async () => {
      const actor = buildActor()
      resolveSpecializationTree.mockReturnValue({ tree: null, state: 'unresolved' })

      const result = await purchaseTalentNode(actor, 'spec-1', 'r1c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.TREE_NOT_FOUND)
      expect(result.reason).toContain('unresolved')
    })

    it('returns error when tree is incomplete', async () => {
      const actor = buildActor()
      resolveSpecializationTree.mockReturnValue({ tree: null, state: 'incomplete' })

      const result = await purchaseTalentNode(actor, 'spec-1', 'r1c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.TREE_INCOMPLETE)
      expect(result.reason).toContain('incomplete')
    })

    it('returns error when node is not found in tree', async () => {
      const actor = buildActor()
      const treeData = buildResolvedTree()
      resolveSpecializationTree.mockReturnValue(treeData)

      const result = await purchaseTalentNode(actor, 'spec-1', 'nonexistent')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.NODE_NOT_FOUND)
    })

    it('returns error when node is already purchased', async () => {
      const actor = buildActor({
        system: {
          details: {
            specializations: [{ specializationId: 'spec-1' }],
          },
          progression: {
            talentPurchases: [
              { treeId: 'tree-1', nodeId: 'r1c1', talentId: 'talent-parry', specializationId: 'spec-1' },
            ],
            experience: { gained: 100, spent: 5 },
          },
        },
      })
      const treeData = buildResolvedTree()
      resolveSpecializationTree.mockReturnValue(treeData)

      const result = await purchaseTalentNode(actor, 'spec-1', 'r1c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.ALREADY_PURCHASED)
    })

    it('returns error when node is locked', async () => {
      const actor = buildActor()
      const treeData = buildResolvedTree({
        tree: {
          id: 'tree-1',
          system: {
            specializationId: 'spec-1',
            nodes: [
              { nodeId: 'r1c1', talentId: 'talent-parry', row: 1, column: 1, cost: 5 },
              { nodeId: 'r2c1', talentId: 'talent-deflect', row: 2, column: 1, cost: 10 },
            ],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        },
      })
      resolveSpecializationTree.mockReturnValue(treeData)

      const result = await purchaseTalentNode(actor, 'spec-1', 'r2c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.NODE_LOCKED)
    })

    it('returns error when XP is insufficient', async () => {
      const actor = buildActor({
        system: {
          details: {
            specializations: [{ specializationId: 'spec-1' }],
          },
          progression: {
            talentPurchases: [],
            experience: { gained: 100, spent: 98 },
          },
        },
      })
      const treeData = buildResolvedTree()
      resolveSpecializationTree.mockReturnValue(treeData)

      const result = await purchaseTalentNode(actor, 'spec-1', 'r1c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.NOT_ENOUGH_XP)
    })

    it('calls recordTalentNodePurchase on success', async () => {
      const actor = buildActor()
      const treeData = buildResolvedTree()
      resolveSpecializationTree.mockReturnValue(treeData)

      await purchaseTalentNode(actor, 'spec-1', 'r1c1')

      expect(recordTalentNodePurchase).toHaveBeenCalledTimes(1)
      expect(recordTalentNodePurchase).toHaveBeenCalledWith(actor, expect.objectContaining({
        specializationId: 'spec-1',
        treeId: 'tree-1',
        nodeId: 'r1c1',
        talentId: 'talent-parry',
        cost: 5,
        previousXp: 0,
        nextXp: 5,
      }))
    })

    it('succeeds even when audit log write fails (non-blocking)', async () => {
      const actor = buildActor()
      const treeData = buildResolvedTree()
      resolveSpecializationTree.mockReturnValue(treeData)
      recordTalentNodePurchase.mockRejectedValue(new Error('Audit write failed'))

      const result = await purchaseTalentNode(actor, 'spec-1', 'r1c1')

      expect(result.ok).toBe(true)
      expect(logger.warn).toHaveBeenCalledWith(
        '[TalentNodePurchase] Audit log write failed (non-blocking)',
        expect.objectContaining({ actorId: 'actor-001', nodeId: 'r1c1' }),
      )
    })

    it('handles missing progression fields gracefully (fails with no XP available)', async () => {
      const actor = {
        id: 'actor-001',
        system: {
          details: {
            specializations: [{ specializationId: 'spec-1' }],
          },
        },
        update: vi.fn().mockResolvedValue(undefined),
      }
      const treeData = buildResolvedTree()
      resolveSpecializationTree.mockReturnValue(treeData)

      const result = await purchaseTalentNode(actor, 'spec-1', 'r1c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.NOT_ENOUGH_XP)
      expect(actor.update).not.toHaveBeenCalled()
    })

    it('handles actor without specializations field gracefully', async () => {
      const actor = { id: 'actor-001', system: {}, update: vi.fn().mockResolvedValue(undefined) }

      const result = await purchaseTalentNode(actor, 'spec-1', 'r1c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.SPECIALIZATION_NOT_OWNED)
    })
  })
})
