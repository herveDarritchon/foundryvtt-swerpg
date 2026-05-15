import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../module/utils/logger.mjs', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
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
import { buildOwnedTalentSummary } from '../../../module/lib/talent-node/owned-talent-summary.mjs'
import { REASON_CODE } from '../../../module/lib/talent-node/talent-node-state.mjs'

describe('Talent purchase sync chain (US19)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function buildActor(overrides = {}) {
    return {
      id: 'actor-001',
      name: 'Vara Kesh',
      system: {
        details: {
          specializations: [
            { specializationId: 'spec-bodyguard', name: 'Bodyguard' },
          ],
        },
        progression: {
          talentPurchases: [],
          experience: { gained: 100, spent: 0 },
        },
        ...overrides.system,
      },
      update: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    }
  }

  function buildResolvedTree(overrides = {}) {
    return {
      tree: {
        id: 'tree-bodyguard',
        system: {
          specializationId: 'spec-bodyguard',
          nodes: [
            { nodeId: 'r1c1', talentId: 'grit', row: 1, column: 1, cost: 5 },
            { nodeId: 'r2c1', talentId: 'toughness', row: 2, column: 1, cost: 10 },
          ],
          connections: [{ from: 'r1c1', to: 'r2c1' }],
        },
        ...overrides.tree,
      },
      state: 'available',
    }
  }

  describe('purchase then consolidated view', () => {
    it('persists purchase via actor.update with correct data', async () => {
      const actor = buildActor()
      const treeData = buildResolvedTree()
      resolveSpecializationTree.mockReturnValue(treeData)

      const result = await purchaseTalentNode(actor, 'spec-bodyguard', 'r1c1')

      expect(result.ok).toBe(true)
      expect(result.purchase).toMatchObject({
        treeId: 'tree-bodyguard',
        nodeId: 'r1c1',
        talentId: 'grit',
        specializationId: 'spec-bodyguard',
        cost: 5,
      })
      expect(actor.update).toHaveBeenCalledTimes(1)
      expect(actor.update).toHaveBeenCalledWith({
        'system.progression.talentPurchases': [
          { treeId: 'tree-bodyguard', nodeId: 'r1c1', talentId: 'grit', specializationId: 'spec-bodyguard' },
        ],
        'system.progression.experience.spent': 5,
      })
    })

    it('consolidates purchase via buildOwnedTalentSummary with populated actor data', () => {
      const actor = buildActor({
        system: {
          details: {
            specializations: [
              { specializationId: 'spec-bodyguard', name: 'Bodyguard' },
            ],
          },
          progression: {
            talentPurchases: [
              { treeId: 'tree-bodyguard', nodeId: 'r1c1', talentId: 'grit', specializationId: 'spec-bodyguard' },
            ],
            experience: { gained: 100, spent: 5 },
          },
        },
      })

      const treeData = buildResolvedTree()
      resolveSpecializationTree.mockReturnValue(treeData)

      const definitions = new Map()
      definitions.set('grit', { name: 'Grit', activation: 'passive', isRanked: false })
      const summary = buildOwnedTalentSummary(actor, definitions)

      expect(summary).toHaveLength(1)
      expect(summary[0]).toMatchObject({
        talentId: 'grit',
        name: 'Grit',
        rank: null,
      })
    })

    it('accumulates multiple purchases correctly', async () => {
      const actor = buildActor()
      const treeData = buildResolvedTree()
      resolveSpecializationTree.mockReturnValue(treeData)

      await purchaseTalentNode(actor, 'spec-bodyguard', 'r1c1')

      actor.system.progression.talentPurchases = [
        { treeId: 'tree-bodyguard', nodeId: 'r1c1', talentId: 'grit', specializationId: 'spec-bodyguard' },
      ]
      actor.system.progression.experience.spent = 5

      resolveSpecializationTree.mockReturnValue(treeData)

      const result2 = await purchaseTalentNode(actor, 'spec-bodyguard', 'r2c1')

      expect(result2.ok).toBe(true)
      expect(actor.update).toHaveBeenLastCalledWith({
        'system.progression.talentPurchases': [
          { treeId: 'tree-bodyguard', nodeId: 'r1c1', talentId: 'grit', specializationId: 'spec-bodyguard' },
          { treeId: 'tree-bodyguard', nodeId: 'r2c1', talentId: 'toughness', specializationId: 'spec-bodyguard' },
        ],
        'system.progression.experience.spent': 15,
      })
    })
  })

  describe('audit bridge', () => {
    it('calls recordTalentNodePurchase on successful purchase', async () => {
      const actor = buildActor()
      const treeData = buildResolvedTree()
      resolveSpecializationTree.mockReturnValue(treeData)

      await purchaseTalentNode(actor, 'spec-bodyguard', 'r1c1')

      expect(recordTalentNodePurchase).toHaveBeenCalledTimes(1)
      expect(recordTalentNodePurchase).toHaveBeenCalledWith(actor, {
        specializationId: 'spec-bodyguard',
        treeId: 'tree-bodyguard',
        nodeId: 'r1c1',
        talentId: 'grit',
        cost: 5,
        previousXp: 0,
        nextXp: 5,
      })
    })

    it('does not block purchase when audit write fails', async () => {
      const actor = buildActor()
      const treeData = buildResolvedTree()
      resolveSpecializationTree.mockReturnValue(treeData)
      recordTalentNodePurchase.mockRejectedValue(new Error('Audit write failed'))

      const result = await purchaseTalentNode(actor, 'spec-bodyguard', 'r1c1')

      expect(result.ok).toBe(true)
      expect(actor.update).toHaveBeenCalledTimes(1)
      expect(logger.warn).toHaveBeenCalledWith(
        '[TalentNodePurchase] Audit log write failed (non-blocking)',
        expect.objectContaining({ actorId: 'actor-001', nodeId: 'r1c1' }),
      )
    })
  })

  describe('state recalculation after purchase', () => {
    it('rejects purchase of already-purchased node', async () => {
      const actor = buildActor({
        system: {
          details: {
            specializations: [{ specializationId: 'spec-bodyguard' }],
          },
          progression: {
            talentPurchases: [
              { treeId: 'tree-bodyguard', nodeId: 'r1c1', talentId: 'grit', specializationId: 'spec-bodyguard' },
            ],
            experience: { gained: 100, spent: 5 },
          },
        },
      })
      const treeData = buildResolvedTree()
      resolveSpecializationTree.mockReturnValue(treeData)

      const result = await purchaseTalentNode(actor, 'spec-bodyguard', 'r1c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.ALREADY_PURCHASED)
    })

    it('rejects purchase when XP is insufficient', async () => {
      const actor = buildActor({
        system: {
          details: {
            specializations: [{ specializationId: 'spec-bodyguard' }],
          },
          progression: {
            talentPurchases: [],
            experience: { gained: 100, spent: 98 },
          },
        },
      })
      const treeData = buildResolvedTree()
      resolveSpecializationTree.mockReturnValue(treeData)

      const result = await purchaseTalentNode(actor, 'spec-bodyguard', 'r1c1')

      expect(result.ok).toBe(false)
      expect(result.reasonCode).toBe(REASON_CODE.NOT_ENOUGH_XP)
    })
  })

  describe('view closed resilience', () => {
    it('succeeds even when no tree app is open', async () => {
      const actor = buildActor()
      const treeData = buildResolvedTree()
      resolveSpecializationTree.mockReturnValue(treeData)

      const result = await purchaseTalentNode(actor, 'spec-bodyguard', 'r1c1')

      expect(result.ok).toBe(true)
      expect(actor.update).toHaveBeenCalledTimes(1)
    })
  })

  describe('full chain: purchase -> consolidated -> audit (US22)', () => {
    it('chains ranked purchase in two trees, verifies consolidated rank and audit calls', async () => {
      const actor = {
        id: 'actor-001',
        name: 'Vara Kesh',
        system: {
          details: {
            specializations: [
              { specializationId: 'spec-bodyguard', name: 'Bodyguard' },
              { specializationId: 'spec-merc', name: 'Mercenary Soldier' },
            ],
          },
          progression: {
            talentPurchases: [],
            experience: { gained: 100, spent: 0 },
          },
        },
        update: vi.fn().mockResolvedValue(undefined),
      }

      resolveSpecializationTree.mockImplementation((spec) => {
        if (spec.specializationId === 'spec-bodyguard') {
          return {
            tree: {
              id: 'tree-bodyguard',
              system: {
                specializationId: 'spec-bodyguard',
                nodes: [{ nodeId: 'r1c1', talentId: 'grit', row: 1, column: 1, cost: 5 }],
                connections: [{ from: 'r1c1', to: 'r2c1' }],
              },
            },
            state: 'available',
          }
        }
        return {
          tree: {
            id: 'tree-merc',
            system: {
              specializationId: 'spec-merc',
              nodes: [{ nodeId: 'r1c1', talentId: 'grit', row: 1, column: 1, cost: 5 }],
              connections: [{ from: 'r1c1', to: 'r2c1' }],
            },
          },
          state: 'available',
        }
      })

      const definitions = new Map()
      definitions.set('grit', { name: 'Grit', activation: 'passive', isRanked: true })

      const result1 = await purchaseTalentNode(actor, 'spec-bodyguard', 'r1c1')
      expect(result1.ok).toBe(true)
      actor.system.progression.talentPurchases = [
        { treeId: 'tree-bodyguard', nodeId: 'r1c1', talentId: 'grit', specializationId: 'spec-bodyguard' },
      ]
      actor.system.progression.experience.spent = 5

      let summary = buildOwnedTalentSummary(actor, definitions)
      expect(summary).toHaveLength(1)
      expect(summary[0].rank).toBe(1)

      const result2 = await purchaseTalentNode(actor, 'spec-merc', 'r1c1')
      expect(result2.ok).toBe(true)
      actor.system.progression.talentPurchases = [
        { treeId: 'tree-bodyguard', nodeId: 'r1c1', talentId: 'grit', specializationId: 'spec-bodyguard' },
        { treeId: 'tree-merc', nodeId: 'r1c1', talentId: 'grit', specializationId: 'spec-merc' },
      ]
      actor.system.progression.experience.spent = 10

      summary = buildOwnedTalentSummary(actor, definitions)
      expect(summary).toHaveLength(1)
      expect(summary[0].rank).toBe(2)
      expect(summary[0].sources).toHaveLength(2)

      expect(recordTalentNodePurchase).toHaveBeenCalledTimes(2)
    })

    it('chains non-ranked purchase in two trees, verifies deduplication and audit calls', async () => {
      const actor = {
        id: 'actor-001',
        name: 'Vara Kesh',
        system: {
          details: {
            specializations: [
              { specializationId: 'spec-bodyguard', name: 'Bodyguard' },
              { specializationId: 'spec-merc', name: 'Mercenary Soldier' },
            ],
          },
          progression: {
            talentPurchases: [],
            experience: { gained: 100, spent: 0 },
          },
        },
        update: vi.fn().mockResolvedValue(undefined),
      }

      resolveSpecializationTree.mockImplementation((spec) => {
        if (spec.specializationId === 'spec-bodyguard') {
          return {
            tree: {
              id: 'tree-bodyguard',
              system: {
                specializationId: 'spec-bodyguard',
                nodes: [{ nodeId: 'r1c1', talentId: 'toughness', row: 1, column: 1, cost: 5 }],
                connections: [{ from: 'r1c1', to: 'r2c1' }],
              },
            },
            state: 'available',
          }
        }
        return {
          tree: {
            id: 'tree-merc',
            system: {
              specializationId: 'spec-merc',
              nodes: [{ nodeId: 'r1c1', talentId: 'toughness', row: 1, column: 1, cost: 5 }],
              connections: [{ from: 'r1c1', to: 'r2c1' }],
            },
          },
          state: 'available',
        }
      })

      const definitions = new Map()
      definitions.set('toughness', { name: 'Toughness', activation: 'passive', isRanked: false })

      await purchaseTalentNode(actor, 'spec-bodyguard', 'r1c1')
      actor.system.progression.talentPurchases = [
        { treeId: 'tree-bodyguard', nodeId: 'r1c1', talentId: 'toughness', specializationId: 'spec-bodyguard' },
      ]
      actor.system.progression.experience.spent = 5

      await purchaseTalentNode(actor, 'spec-merc', 'r1c1')
      actor.system.progression.talentPurchases = [
        { treeId: 'tree-bodyguard', nodeId: 'r1c1', talentId: 'toughness', specializationId: 'spec-bodyguard' },
        { treeId: 'tree-merc', nodeId: 'r1c1', talentId: 'toughness', specializationId: 'spec-merc' },
      ]
      actor.system.progression.experience.spent = 10

      const summary = buildOwnedTalentSummary(actor, definitions)

      expect(summary).toHaveLength(1)
      expect(summary[0].talentId).toBe('toughness')
      expect(summary[0].isRanked).toBe(false)
      expect(summary[0].rank).toBeNull()
      expect(summary[0].sources).toHaveLength(2)
      expect(recordTalentNodePurchase).toHaveBeenCalledTimes(2)
    })

    it('handles purchase when talentPurchases field is absent gracefully', async () => {
      const actor = {
        id: 'actor-001',
        name: 'Vara Kesh',
        system: {
          details: {
            specializations: [
              { specializationId: 'spec-bodyguard', name: 'Bodyguard' },
            ],
          },
          progression: {
            experience: { gained: 100, spent: 0 },
          },
        },
        update: vi.fn().mockResolvedValue(undefined),
      }

      const treeData = {
        tree: {
          id: 'tree-bodyguard',
          system: {
            specializationId: 'spec-bodyguard',
            nodes: [{ nodeId: 'r1c1', talentId: 'grit', row: 1, column: 1, cost: 5 }],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        },
        state: 'available',
      }
      resolveSpecializationTree.mockReturnValue(treeData)

      const result = await purchaseTalentNode(actor, 'spec-bodyguard', 'r1c1')

      expect(result.ok).toBe(true)
      expect(actor.update).toHaveBeenCalledTimes(1)
      expect(recordTalentNodePurchase).toHaveBeenCalledTimes(1)
    })
  })
})
