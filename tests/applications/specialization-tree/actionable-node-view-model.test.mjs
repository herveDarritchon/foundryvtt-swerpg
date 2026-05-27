import { describe, expect, it, vi } from 'vitest'

import { actionableNodeViewModel } from '../../../module/applications/specialization-tree/actionable-node-view-model.mjs'
import { NODE_STATE, REASON_CODE } from '../../../module/lib/talent-node/talent-node-state.mjs'

vi.mock('../../../module/lib/talent-node/talent-node-progression.mjs', () => {
  const actual = vi.importActual('../../../module/lib/talent-node/talent-node-progression.mjs')
  return {
    ...actual,
    processTalentNodeProgression: vi.fn(),
  }
})

import { processTalentNodeProgression } from '../../../module/lib/talent-node/talent-node-progression.mjs'

const localize = (key) => `[${key}]`

/**
 *
 * @param overrides
 */
function buildRenderNode(overrides = {}) {
  return {
    nodeId: 'r1c1',
    talentId: 'Item.talent-grit',
    talentName: 'Grit',
    isRanked: true,
    xpCost: 10,
    row: 1,
    column: 1,
    x: 20,
    y: 20,
    nodeState: NODE_STATE.AVAILABLE,
    reasonCode: null,
    nodeStateLabel: '[Available]',
    reasonLabel: null,
    variant: {},
    ...overrides,
  }
}

/**
 *
 * @param overrides
 */
function buildTree(overrides = {}) {
  return {
    id: 'tree-1',
    uuid: 'Item.tree-1',
    system: {
      nodes: [
        { nodeId: 'r1c1', talentId: 'Item.talent-grit', talentUuid: 'Item.talent-grit', row: 1, column: 1, cost: 10 },
        { nodeId: 'r2c1', talentId: 'Item.talent-tough', talentUuid: 'Item.talent-tough', row: 2, column: 1, cost: 15 },
      ],
      connections: [{ from: 'r1c1', to: 'r2c1' }],
    },
    ...overrides,
  }
}

/**
 *
 * @param overrides
 */
function buildActor(overrides = {}) {
  return {
    id: 'actor-1',
    name: 'Test',
    system: {
      details: {
        specializations: [{ specializationId: 'spec-bodyguard', name: 'Bodyguard' }],
      },
      progression: {
        talentPurchases: [],
        experience: { gained: 100, spent: 0, available: 100 },
      },
    },
    ...overrides,
  }
}

describe('actionableNodeViewModel', () => {
  describe('AVAILABLE node', () => {
    it('sets canPurchase true and primaryAction purchase', () => {
      const renderNode = buildRenderNode({ nodeState: NODE_STATE.AVAILABLE })
      const result = actionableNodeViewModel({ renderNode, actor: buildActor(), specializationId: 'spec', tree: buildTree(), localize })

      expect(result.canPurchase).toBe(true)
      expect(result.canForget).toBe(false)
      expect(result.primaryAction).toBe('purchase')
      expect(result.actionLabel).toBe('[SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.PURCHASE]')
      expect(result.blockedReasonCode).toBeNull()
      expect(result.blockedReasonLabel).toBeNull()
      expect(result.blockingDependents).toEqual([])
    })
  })

  describe('PURCHASED node — forgettable', () => {
    it('sets canForget true and primaryAction forget when no blocking dependents', () => {
      processTalentNodeProgression.mockReturnValue({
        ok: true,
        action: 'forget',
        payload: {
          specializationId: 'spec-bodyguard',
          treeId: 'tree-1',
          treeUuid: 'Item.tree-1',
          nodeId: 'r1c1',
          talentId: 'Item.talent-grit',
          talentUuid: 'Item.talent-grit',
          cost: 10,
          updatedPurchases: [],
          updatedSpent: 0,
        },
      })

      const renderNode = buildRenderNode({ nodeState: NODE_STATE.PURCHASED, reasonCode: REASON_CODE.ALREADY_PURCHASED })

      const result = actionableNodeViewModel({
        renderNode,
        actor: buildActor(),
        specializationId: 'spec-bodyguard',
        tree: buildTree(),
        localize,
      })

      expect(result.canForget).toBe(true)
      expect(result.canPurchase).toBe(false)
      expect(result.primaryAction).toBe('forget')
      expect(result.actionLabel).toBe('[SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.FORGET]')
      expect(result.blockedReasonCode).toBeNull()
      expect(result.blockingDependents).toEqual([])
    })
  })

  describe('PURCHASED node — blocked by dependents', () => {
    it('sets canForget false, primaryAction null, and lists blocking dependents', () => {
      processTalentNodeProgression.mockReturnValue({
        ok: false,
        action: 'forget',
        reason: 'Node "r1c1" cannot be forgotten: dependent nodes are still purchased',
        reasonCode: REASON_CODE.NODE_HAS_DEPENDENTS,
        dependents: ['r2c1'],
      })

      const renderNode = buildRenderNode({ nodeState: NODE_STATE.PURCHASED, reasonCode: REASON_CODE.ALREADY_PURCHASED })

      const result = actionableNodeViewModel({
        renderNode,
        actor: buildActor(),
        specializationId: 'spec-bodyguard',
        tree: buildTree(),
        localize,
      })

      expect(result.canForget).toBe(false)
      expect(result.canPurchase).toBe(false)
      expect(result.primaryAction).toBeNull()
      expect(result.actionLabel).toBeNull()
      expect(result.blockedReasonCode).toBe(REASON_CODE.NODE_HAS_DEPENDENTS)
      expect(result.blockedReasonLabel).toBe('[SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_HAS_DEPENDENTS]')
      expect(result.blockingDependents).toEqual(['r2c1'])
    })
  })

  describe('LOCKED node', () => {
    it('sets no primary action and exposes blockedReasonCode', () => {
      const renderNode = buildRenderNode({
        nodeState: NODE_STATE.LOCKED,
        reasonCode: REASON_CODE.NOT_ENOUGH_XP,
      })

      const result = actionableNodeViewModel({ renderNode, actor: buildActor(), specializationId: 'spec', tree: buildTree(), localize })

      expect(result.canPurchase).toBe(false)
      expect(result.canForget).toBe(false)
      expect(result.primaryAction).toBeNull()
      expect(result.actionLabel).toBeNull()
      expect(result.blockedReasonCode).toBe(REASON_CODE.NOT_ENOUGH_XP)
      expect(result.blockedReasonLabel).toBe('[SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NOT_ENOUGH_XP]')
      expect(result.blockingDependents).toEqual([])
    })

    it('handles node-locked reason code (prerequisites)', () => {
      const renderNode = buildRenderNode({
        nodeState: NODE_STATE.LOCKED,
        reasonCode: REASON_CODE.NODE_LOCKED,
      })

      const result = actionableNodeViewModel({ renderNode, actor: buildActor(), specializationId: 'spec', tree: buildTree(), localize })

      expect(result.primaryAction).toBeNull()
      expect(result.blockedReasonCode).toBe(REASON_CODE.NODE_LOCKED)
    })
  })

  describe('INVALID node', () => {
    it('sets no primary action and exposes blockedReasonCode', () => {
      const invalidReasons = [
        REASON_CODE.SPECIALIZATION_NOT_OWNED,
        REASON_CODE.TREE_NOT_FOUND,
        REASON_CODE.TREE_INCOMPLETE,
        REASON_CODE.NODE_NOT_FOUND,
        REASON_CODE.NODE_INVALID,
      ]

      for (const reasonCode of invalidReasons) {
        const renderNode = buildRenderNode({
          nodeState: NODE_STATE.INVALID,
          reasonCode,
        })

        const result = actionableNodeViewModel({ renderNode, actor: buildActor(), specializationId: 'spec', tree: buildTree(), localize })

        expect(result.canPurchase).toBe(false)
        expect(result.canForget).toBe(false)
        expect(result.primaryAction).toBeNull()
        expect(result.blockedReasonCode).toBe(reasonCode)
        expect(result.blockingDependents).toEqual([])
      }
    })
  })

  describe('actionRef', () => {
    it('builds a stable action reference from the render node and tree', () => {
      const renderNode = buildRenderNode({ nodeState: NODE_STATE.AVAILABLE })
      const tree = buildTree()

      const result = actionableNodeViewModel({
        renderNode,
        actor: buildActor(),
        specializationId: 'spec-bodyguard',
        tree,
        localize,
      })

      expect(result.actionRef).toEqual({
        specializationId: 'spec-bodyguard',
        treeId: 'tree-1',
        treeUuid: 'Item.tree-1',
        nodeId: 'r1c1',
        talentId: 'Item.talent-grit',
        talentUuid: 'Item.talent-grit',
        cost: 10,
      })
    })

    it('resolves talentUuid from the tree node when available', () => {
      const renderNode = buildRenderNode({ nodeState: NODE_STATE.AVAILABLE })
      const tree = buildTree()

      const result = actionableNodeViewModel({
        renderNode,
        actor: buildActor(),
        specializationId: 'spec-bodyguard',
        tree,
        localize,
      })

      expect(result.actionRef.talentUuid).toBe('Item.talent-grit')
    })

    it('sets treeId and treeUuid to null when no tree provided', () => {
      const renderNode = buildRenderNode({ nodeState: NODE_STATE.AVAILABLE })

      const result = actionableNodeViewModel({
        renderNode,
        actor: buildActor(),
        specializationId: 'spec',
        tree: null,
        localize,
      })

      expect(result.actionRef.treeId).toBeNull()
      expect(result.actionRef.treeUuid).toBeNull()
      expect(result.actionRef.talentUuid).toBeNull()
    })
  })
})
