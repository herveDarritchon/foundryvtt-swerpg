import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../module/utils/logger.mjs', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { logger } from '../../../module/utils/logger.mjs'
import {
  getNodeState,
  getTreeNodesStates,
  NODE_STATE,
  REASON_CODE,
} from '../../../module/lib/talent-node/talent-node-state.mjs'

function buildActor({ specializations, talentPurchases, experience } = {}) {
  return {
    system: {
      details: {
        specializations: specializations ?? [],
      },
      progression: {
        talentPurchases: talentPurchases ?? [],
        experience: experience ?? { gained: 100, spent: 0 },
      },
    },
  }
}

function buildTree({ id, specializationId, nodes, connections } = {}) {
  return {
    id: id ?? 'tree-1',
    system: {
      specializationId: specializationId ?? 'spec-1',
      nodes: nodes ?? [],
      connections: connections ?? [],
    },
  }
}

function buildNode({ nodeId, talentId, row, column, cost } = {}) {
  return {
    nodeId: nodeId ?? 'r1c1',
    talentId: talentId ?? 'talent-parry',
    row: row ?? 1,
    column: column ?? 1,
    cost: cost ?? 5,
  }
}

describe('TalentNodeState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getNodeState', () => {
    it('returns purchased when a matching purchase exists', () => {
      const actor = buildActor({
        specializations: [{ specializationId: 'spec-1' }],
        talentPurchases: [
          { treeId: 'tree-1', nodeId: 'r1c1', talentId: 'talent-parry', specializationId: 'spec-1' },
        ],
      })
      const tree = buildTree({
        id: 'tree-1',
        specializationId: 'spec-1',
        nodes: [buildNode({ nodeId: 'r1c1', row: 1, cost: 5 })],
        connections: [{ from: 'r1c1', to: 'r2c1' }],
      })

      const result = getNodeState(actor, 'spec-1', tree, 'r1c1')

      expect(result.state, 'purchased when entry matches').toBe(NODE_STATE.PURCHASED)
      expect(result.reasonCode).toBe(REASON_CODE.ALREADY_PURCHASED)
    })

    it('returns available for root node with enough XP', () => {
      const actor = buildActor({
        specializations: [{ specializationId: 'spec-1' }],
        talentPurchases: [],
        experience: { gained: 100, spent: 0 },
      })
      const tree = buildTree({
        id: 'tree-1',
        specializationId: 'spec-1',
        nodes: [buildNode({ nodeId: 'r1c1', row: 1, cost: 5 })],
        connections: [{ from: 'r1c1', to: 'r2c1' }],
      })

      const result = getNodeState(actor, 'spec-1', tree, 'r1c1')

      expect(result.state, 'available when root and XP sufficient').toBe(NODE_STATE.AVAILABLE)
      expect(result.details.cost).toBe(5)
    })

    it('returns available for node unlocked by a purchased connection', () => {
      const actor = buildActor({
        specializations: [{ specializationId: 'spec-1' }],
        talentPurchases: [
          { treeId: 'tree-1', nodeId: 'r1c1', talentId: 'talent-parry', specializationId: 'spec-1' },
        ],
        experience: { gained: 100, spent: 5 },
      })
      const tree = buildTree({
        id: 'tree-1',
        specializationId: 'spec-1',
        nodes: [
          buildNode({ nodeId: 'r1c1', row: 1, cost: 5 }),
          buildNode({ nodeId: 'r2c1', row: 2, cost: 10 }),
        ],
        connections: [{ from: 'r1c1', to: 'r2c1' }],
      })

      const result = getNodeState(actor, 'spec-1', tree, 'r2c1')

      expect(result.state, 'available when connected to purchased').toBe(NODE_STATE.AVAILABLE)
    })

    it('returns locked for non-root node without a purchased connection', () => {
      const actor = buildActor({
        specializations: [{ specializationId: 'spec-1' }],
        talentPurchases: [],
        experience: { gained: 100, spent: 0 },
      })
      const tree = buildTree({
        id: 'tree-1',
        specializationId: 'spec-1',
        nodes: [
          buildNode({ nodeId: 'r1c1', row: 1, cost: 5 }),
          buildNode({ nodeId: 'r2c1', row: 2, cost: 10 }),
        ],
        connections: [{ from: 'r1c1', to: 'r2c1' }],
      })

      const result = getNodeState(actor, 'spec-1', tree, 'r2c1')

      expect(result.state, 'locked when no purchased predecessor').toBe(NODE_STATE.LOCKED)
      expect(result.reasonCode).toBe(REASON_CODE.NODE_LOCKED)
    })

    it('returns locked when XP is insufficient', () => {
      const actor = buildActor({
        specializations: [{ specializationId: 'spec-1' }],
        talentPurchases: [],
        experience: { gained: 100, spent: 98 },
      })
      const tree = buildTree({
        id: 'tree-1',
        specializationId: 'spec-1',
        nodes: [buildNode({ nodeId: 'r1c1', row: 1, cost: 5 })],
        connections: [{ from: 'r1c1', to: 'r2c1' }],
      })

      const result = getNodeState(actor, 'spec-1', tree, 'r1c1')

      expect(result.state, 'locked when XP insufficient').toBe(NODE_STATE.LOCKED)
      expect(result.reasonCode).toBe(REASON_CODE.NOT_ENOUGH_XP)
      expect(result.details.requiredXp).toBe(5)
      expect(result.details.availableXp).toBe(2)
    })

    it('returns invalid when specialization is not owned', () => {
      const actor = buildActor({ specializations: [] })
      const tree = buildTree({
        specializationId: 'spec-1',
        nodes: [buildNode()],
        connections: [{ from: 'r1c1', to: 'r2c1' }],
      })

      const result = getNodeState(actor, 'spec-unknown', tree, 'r1c1')

      expect(result.state).toBe(NODE_STATE.INVALID)
      expect(result.reasonCode).toBe(REASON_CODE.SPECIALIZATION_NOT_OWNED)
    })

    it('returns invalid when tree is null', () => {
      const actor = buildActor({ specializations: [{ specializationId: 'spec-1' }] })

      const result = getNodeState(actor, 'spec-1', null, 'r1c1')

      expect(result.state).toBe(NODE_STATE.INVALID)
      expect(result.reasonCode).toBe(REASON_CODE.TREE_NOT_FOUND)
    })

    it('returns invalid when tree has no nodes', () => {
      const actor = buildActor({ specializations: [{ specializationId: 'spec-1' }] })
      const tree = buildTree({
        specializationId: 'spec-1',
        nodes: [],
        connections: [{ from: 'r1c1', to: 'r2c1' }],
      })

      const result = getNodeState(actor, 'spec-1', tree, 'r1c1')

      expect(result.state).toBe(NODE_STATE.INVALID)
      expect(result.reasonCode).toBe(REASON_CODE.TREE_INCOMPLETE)
    })

    it('returns invalid when tree has no connections', () => {
      const actor = buildActor({ specializations: [{ specializationId: 'spec-1' }] })
      const tree = buildTree({
        specializationId: 'spec-1',
        nodes: [buildNode()],
        connections: [],
      })

      const result = getNodeState(actor, 'spec-1', tree, 'r1c1')

      expect(result.state).toBe(NODE_STATE.INVALID)
      expect(result.reasonCode).toBe(REASON_CODE.TREE_INCOMPLETE)
    })

    it('returns invalid when node is not found in tree', () => {
      const actor = buildActor({ specializations: [{ specializationId: 'spec-1' }] })
      const tree = buildTree({
        specializationId: 'spec-1',
        nodes: [buildNode({ nodeId: 'r1c1' })],
        connections: [{ from: 'r1c1', to: 'r2c1' }],
      })

      const result = getNodeState(actor, 'spec-1', tree, 'nonexistent')

      expect(result.state).toBe(NODE_STATE.INVALID)
      expect(result.reasonCode).toBe(REASON_CODE.NODE_NOT_FOUND)
    })

    it('returns invalid when node has no row', () => {
      const actor = buildActor({ specializations: [{ specializationId: 'spec-1' }] })
      const tree = buildTree({
        specializationId: 'spec-1',
        nodes: [{ nodeId: 'r1c1', talentId: 'talent-parry', cost: 5 }],
        connections: [{ from: 'r1c1', to: 'r2c1' }],
      })

      const result = getNodeState(actor, 'spec-1', tree, 'r1c1')

      expect(result.state).toBe(NODE_STATE.INVALID)
      expect(result.reasonCode).toBe(REASON_CODE.NODE_INVALID)
    })

    it('returns invalid when node has no cost', () => {
      const actor = buildActor({ specializations: [{ specializationId: 'spec-1' }] })
      const tree = buildTree({
        specializationId: 'spec-1',
        nodes: [{ nodeId: 'r1c1', talentId: 'talent-parry', row: 1 }],
        connections: [{ from: 'r1c1', to: 'r2c1' }],
      })

      const result = getNodeState(actor, 'spec-1', tree, 'r1c1')

      expect(result.state).toBe(NODE_STATE.INVALID)
      expect(result.reasonCode).toBe(REASON_CODE.NODE_INVALID)
    })

    it('returns invalid when node uses an unresolved unknown placeholder talent id', () => {
      const actor = buildActor({ specializations: [{ specializationId: 'spec-1' }] })
      const tree = buildTree({
        specializationId: 'spec-1',
        nodes: [{ nodeId: 'r1c1', talentId: 'unknown:spec-1:r1c1', row: 1, cost: 5 }],
        connections: [{ from: 'r1c1', to: 'r2c1' }],
      })

      const result = getNodeState(actor, 'spec-1', tree, 'r1c1')

      expect(result.state).toBe(NODE_STATE.INVALID)
      expect(result.reasonCode).toBe(REASON_CODE.NODE_INVALID)
    })

    it('returns invalid when tree import flags mark the tree as incomplete', () => {
      const actor = buildActor({ specializations: [{ specializationId: 'spec-1' }] })
      const tree = {
        ...buildTree({
          specializationId: 'spec-1',
          nodes: [buildNode()],
          connections: [{ from: 'r1c1', to: 'r2c1' }],
        }),
        flags: {
          swerpg: {
            import: {
              status: 'incomplete',
              unresolved: true,
            },
          },
        },
      }

      const result = getNodeState(actor, 'spec-1', tree, 'r1c1')

      expect(result.state).toBe(NODE_STATE.INVALID)
      expect(result.reasonCode).toBe(REASON_CODE.TREE_INCOMPLETE)
    })

    it('handles actor without talentPurchases gracefully', () => {
      const actor = {
        system: {
          details: {
            specializations: [{ specializationId: 'spec-1' }],
          },
          progression: {
            experience: { gained: 100, spent: 0 },
          },
        },
      }
      const tree = buildTree({
        specializationId: 'spec-1',
        nodes: [buildNode({ nodeId: 'r1c1', row: 1 })],
        connections: [{ from: 'r1c1', to: 'r2c1' }],
      })

      const result = getNodeState(actor, 'spec-1', tree, 'r1c1')

      expect(result.state, 'available even without talentPurchases field').toBe(NODE_STATE.AVAILABLE)
    })

    it('warns and returns invalid when actor is null', () => {
      const result = getNodeState(null, 'spec-1', null, 'r1c1')

      expect(result.state).toBe(NODE_STATE.INVALID)
      expect(logger.warn).toHaveBeenCalled()
    })

    it('warns and returns invalid when specializationId is missing', () => {
      const actor = buildActor()
      const tree = buildTree()

      const result = getNodeState(actor, '', tree, 'r1c1')

      expect(result.state).toBe(NODE_STATE.INVALID)
      expect(logger.warn).toHaveBeenCalled()
    })
  })

  describe('getTreeNodesStates', () => {
    it('returns a map with all nodes in the tree', () => {
      const actor = buildActor({
        specializations: [{ specializationId: 'spec-1' }],
        talentPurchases: [
          { treeId: 'tree-1', nodeId: 'r1c1', talentId: 'talent-parry', specializationId: 'spec-1' },
        ],
        experience: { gained: 100, spent: 5 },
      })
      const tree = buildTree({
        id: 'tree-1',
        specializationId: 'spec-1',
        nodes: [
          buildNode({ nodeId: 'r1c1', row: 1, cost: 5 }),
          buildNode({ nodeId: 'r2c1', row: 2, cost: 10 }),
        ],
        connections: [{ from: 'r1c1', to: 'r2c1' }],
      })

      const map = getTreeNodesStates(actor, 'spec-1', tree)

      expect(map).toBeInstanceOf(Map)
      expect(map.size).toBe(2)
      expect(map.get('r1c1').state).toBe(NODE_STATE.PURCHASED)
      expect(map.get('r2c1').state).toBe(NODE_STATE.AVAILABLE)
    })

    it('returns empty map for tree without nodes', () => {
      const map = getTreeNodesStates(null, 'spec-1', { system: {} })

      expect(map).toBeInstanceOf(Map)
      expect(map.size).toBe(0)
    })
  })
})
