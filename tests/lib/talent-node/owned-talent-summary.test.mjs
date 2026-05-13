import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../module/utils/logger.mjs', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../../module/lib/talent-node/talent-tree-resolver.mjs', () => ({
  resolveSpecializationTree: vi.fn(),
}))

import { resolveSpecializationTree } from '../../../module/lib/talent-node/talent-tree-resolver.mjs'
import { buildOwnedTalentSummary } from '../../../module/lib/talent-node/owned-talent-summary.mjs'

function buildActor({ specializations, talentPurchases } = {}) {
  return {
    system: {
      details: {
        specializations: specializations ?? [],
      },
      progression: {
        talentPurchases: talentPurchases ?? [],
      },
    },
  }
}

function buildSpec(overrides = {}) {
  return { specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard', ...overrides }
}

function buildPurchase(overrides = {}) {
  return {
    treeId: 'tree-bodyguard',
    nodeId: 'r1c1',
    talentId: 'talent-parry',
    specializationId: 'spec-bodyguard',
    ...overrides,
  }
}

function buildResolvedTree(overrides = {}) {
  return {
    tree: {
      id: 'tree-bodyguard',
      name: 'Bodyguard',
      type: 'specialization-tree',
      system: {
        specializationId: 'spec-bodyguard',
        nodes: [
          { nodeId: 'r1c1', talentId: 'talent-parry', row: 1, column: 1, cost: 5 },
          { nodeId: 'r2c1', talentId: 'talent-deflect', row: 2, column: 1, cost: 10 },
        ],
        connections: [{ from: 'r1c1', to: 'r2c1' }],
      },
    },
    state: 'available',
    ...overrides,
  }
}

function buildTalentDefinition(overrides = {}) {
  return { name: 'Parer', activation: 'active', isRanked: true, ...overrides }
}

describe('OwnedTalentSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('buildOwnedTalentSummary', () => {
    it('returns empty array when there are no talentPurchases', () => {
      const actor = buildActor({ talentPurchases: [] })

      const result = buildOwnedTalentSummary(actor)

      expect(result).toEqual([])
    })

    it('returns empty array when talentPurchases is missing', () => {
      const actor = { system: { details: { specializations: [] }, progression: {} } }

      const result = buildOwnedTalentSummary(actor)

      expect(result).toEqual([])
    })

    it('returns a single entry for a non-ranked talent purchased once', () => {
      const actor = buildActor({
        specializations: [buildSpec()],
        talentPurchases: [buildPurchase({ talentId: 'talent-toughness' })],
      })
      resolveSpecializationTree.mockReturnValue(buildResolvedTree())
      const definitions = new Map([['talent-toughness', buildTalentDefinition({ isRanked: false, name: 'Toughness', activation: 'passive' })]])

      const result = buildOwnedTalentSummary(actor, definitions)

      expect(result).toHaveLength(1)
      expect(result[0].talentId).toBe('talent-toughness')
      expect(result[0].name).toBe('Toughness')
      expect(result[0].activation).toBe('passive')
      expect(result[0].isRanked).toBe(false)
      expect(result[0].rank).toBeNull()
    })

    it('groups ranked talent purchases into a single entry with consolidated rank', () => {
      const actor = buildActor({
        specializations: [buildSpec(), buildSpec({ specializationId: 'spec-merc', name: 'Mercenary Soldier' })],
        talentPurchases: [
          buildPurchase({ nodeId: 'r1c1', talentId: 'talent-parry', specializationId: 'spec-bodyguard' }),
          buildPurchase({ nodeId: 'r1c1', talentId: 'talent-parry', specializationId: 'spec-merc' }),
        ],
      })
      resolveSpecializationTree.mockImplementation((spec) => {
        if (spec.specializationId === 'spec-bodyguard') return buildResolvedTree({ tree: { id: 'tree-bodyguard', name: 'Bodyguard', type: 'specialization-tree', system: { specializationId: 'spec-bodyguard', nodes: [{ nodeId: 'r1c1', talentId: 'talent-parry', row: 1, column: 1, cost: 5 }], connections: [{ from: 'r1c1', to: 'r2c1' }] } } })
        return buildResolvedTree({ tree: { id: 'tree-merc', name: 'Mercenary Soldier', type: 'specialization-tree', system: { specializationId: 'spec-merc', nodes: [{ nodeId: 'r1c1', talentId: 'talent-parry', row: 1, column: 1, cost: 10 }], connections: [{ from: 'r1c1', to: 'r2c1' }] } } })
      })
      const definitions = new Map([['talent-parry', buildTalentDefinition({ name: 'Parer', isRanked: true })]])
      const result = buildOwnedTalentSummary(actor, definitions)

      expect(result).toHaveLength(1)
      expect(result[0].talentId).toBe('talent-parry')
      expect(result[0].name).toBe('Parer')
      expect(result[0].isRanked).toBe(true)
      expect(result[0].rank).toBe(2)
    })

    it('deduplicates non-ranked talents from multiple trees into a single entry', () => {
      const actor = buildActor({
        specializations: [buildSpec(), buildSpec({ specializationId: 'spec-pilot', name: 'Pilot' })],
        talentPurchases: [
          buildPurchase({ nodeId: 'r1c1', talentId: 'talent-grit', specializationId: 'spec-bodyguard' }),
          buildPurchase({ nodeId: 'r2c1', talentId: 'talent-grit', specializationId: 'spec-pilot' }),
        ],
      })
      resolveSpecializationTree.mockImplementation((spec) => {
        if (spec.specializationId === 'spec-bodyguard') return buildResolvedTree({ tree: { id: 'tree-bodyguard', name: 'Bodyguard', type: 'specialization-tree', system: { specializationId: 'spec-bodyguard', nodes: [{ nodeId: 'r1c1', talentId: 'talent-grit', row: 1, column: 1, cost: 5 }, { nodeId: 'r2c1', talentId: 'talent-grit', row: 2, column: 1, cost: 10 }], connections: [{ from: 'r1c1', to: 'r2c1' }] } } })
        return buildResolvedTree({ tree: { id: 'tree-pilot', name: 'Pilot', type: 'specialization-tree', system: { specializationId: 'spec-pilot', nodes: [{ nodeId: 'r2c1', talentId: 'talent-grit', row: 2, column: 1, cost: 10 }], connections: [{ from: 'r1c1', to: 'r2c1' }] } } })
      })
      const definitions = new Map([['talent-grit', buildTalentDefinition({ name: 'Grit', isRanked: false, activation: 'passive' })]])
      const result = buildOwnedTalentSummary(actor, definitions)

      expect(result).toHaveLength(1)
      expect(result[0].talentId).toBe('talent-grit')
      expect(result[0].isRanked).toBe(false)
      expect(result[0].rank).toBeNull()
    })

    it('lists multiple sources for a talent purchased across different specializations', () => {
      const actor = buildActor({
        specializations: [buildSpec(), buildSpec({ specializationId: 'spec-merc', name: 'Mercenary Soldier' })],
        talentPurchases: [
          buildPurchase({ nodeId: 'r1c1', talentId: 'talent-parry', specializationId: 'spec-bodyguard' }),
          buildPurchase({ nodeId: 'r1c1', talentId: 'talent-parry', specializationId: 'spec-merc' }),
        ],
      })
      resolveSpecializationTree.mockImplementation((spec) => {
        if (spec.specializationId === 'spec-bodyguard') return buildResolvedTree({ tree: { id: 'tree-bodyguard', name: 'Bodyguard', type: 'specialization-tree', system: { specializationId: 'spec-bodyguard', nodes: [{ nodeId: 'r1c1', talentId: 'talent-parry', row: 1, column: 1, cost: 5 }], connections: [{ from: 'r1c1', to: 'r2c1' }] } } })
        return buildResolvedTree({ tree: { id: 'tree-merc', name: 'Mercenary Soldier', type: 'specialization-tree', system: { specializationId: 'spec-merc', nodes: [{ nodeId: 'r1c1', talentId: 'talent-parry', row: 1, column: 1, cost: 10 }], connections: [{ from: 'r1c1', to: 'r2c1' }] } } })
      })
      const definitions = new Map([['talent-parry', buildTalentDefinition({ isRanked: true })]])
      const result = buildOwnedTalentSummary(actor, definitions)

      expect(result).toHaveLength(1)
      const sources = result[0].sources
      expect(sources).toHaveLength(2)
      const sourceIds = sources.map(s => s.specializationId)
      expect(sourceIds).toEqual(expect.arrayContaining(['spec-bodyguard', 'spec-merc']))
      const sourceNames = sources.map(s => s.specializationName)
      expect(sourceNames).toEqual(expect.arrayContaining(['Bodyguard', 'Mercenary Soldier']))
    })

    it('marks source as unresolved when specialization tree cannot be resolved', () => {
      const actor = buildActor({
        specializations: [buildSpec()],
        talentPurchases: [buildPurchase()],
      })
      resolveSpecializationTree.mockReturnValue({ tree: null, state: 'unresolved' })
      const definitions = new Map([['talent-parry', buildTalentDefinition()]])
      const result = buildOwnedTalentSummary(actor, definitions)

      expect(result).toHaveLength(1)
      expect(result[0].sources[0].resolutionState).toBe('tree-unresolved')
      expect(result[0].sources[0].treeName).toBeNull()
    })

    it('marks source as tree-incomplete when tree is structurally incomplete', () => {
      const actor = buildActor({
        specializations: [buildSpec()],
        talentPurchases: [buildPurchase()],
      })
      resolveSpecializationTree.mockReturnValue({ tree: null, state: 'incomplete' })
      const definitions = new Map([['talent-parry', buildTalentDefinition()]])
      const result = buildOwnedTalentSummary(actor, definitions)

      expect(result).toHaveLength(1)
      expect(result[0].sources[0].resolutionState).toBe('tree-incomplete')
    })

    it('marks source as node-missing when the purchased node is not in the resolved tree', () => {
      const actor = buildActor({
        specializations: [buildSpec()],
        talentPurchases: [buildPurchase({ nodeId: 'r3c1' })],
      })
      const resolvedTree = buildResolvedTree()
      resolvedTree.tree.system.nodes = [
        { nodeId: 'r1c1', talentId: 'talent-parry', row: 1, column: 1, cost: 5 },
      ]
      resolveSpecializationTree.mockReturnValue(resolvedTree)
      const definitions = new Map([['talent-parry', buildTalentDefinition()]])
      const result = buildOwnedTalentSummary(actor, definitions)

      expect(result).toHaveLength(1)
      expect(result[0].sources[0].resolutionState).toBe('node-missing')
    })

    it('produces degraded entry when talent definition is missing', () => {
      const actor = buildActor({
        specializations: [buildSpec()],
        talentPurchases: [buildPurchase({ talentId: 'talent-unknown' })],
      })
      resolveSpecializationTree.mockReturnValue(buildResolvedTree())
      const result = buildOwnedTalentSummary(actor, new Map())

      expect(result).toHaveLength(1)
      expect(result[0].talentId).toBe('talent-unknown')
      expect(result[0].name).toBeNull()
      expect(result[0].activation).toBeNull()
      expect(result[0].isRanked).toBeNull()
      expect(result[0].rank).toBeNull()
      expect(result[0].sources).toHaveLength(1)
    })

    it('marks source as specialization-not-found when specialization is not owned', () => {
      const actor = buildActor({
        specializations: [buildSpec({ specializationId: 'spec-other' })],
        talentPurchases: [buildPurchase({ specializationId: 'spec-bodyguard' })],
      })
      const definitions = new Map([['talent-parry', buildTalentDefinition()]])
      const result = buildOwnedTalentSummary(actor, definitions)

      expect(result).toHaveLength(1)
      expect(result[0].sources[0].resolutionState).toBe('specialization-not-found')
      expect(result[0].sources[0].specializationName).toBeNull()
    })

    it('handles mixed ranked and non-ranked talents correctly', () => {
      const actor = buildActor({
        specializations: [buildSpec()],
        talentPurchases: [
          buildPurchase({ nodeId: 'r1c1', talentId: 'talent-parry' }),
          buildPurchase({ nodeId: 'r2c1', talentId: 'talent-toughness' }),
        ],
      })
      resolveSpecializationTree.mockReturnValue(buildResolvedTree())
      const definitions = new Map([
        ['talent-parry', buildTalentDefinition({ name: 'Parer', isRanked: true })],
        ['talent-toughness', buildTalentDefinition({ name: 'Toughness', isRanked: false, activation: 'passive' })],
      ])
      const result = buildOwnedTalentSummary(actor, definitions)
      const parryEntry = result.find(e => e.talentId === 'talent-parry')
      const toughnessEntry = result.find(e => e.talentId === 'talent-toughness')

      expect(parryEntry.isRanked).toBe(true)
      expect(parryEntry.rank).toBe(1)
      expect(toughnessEntry.isRanked).toBe(false)
      expect(toughnessEntry.rank).toBeNull()
    })

    it('returns multiple entries for different talentIds', () => {
      const actor = buildActor({
        specializations: [buildSpec()],
        talentPurchases: [
          buildPurchase({ nodeId: 'r1c1', talentId: 'talent-parry' }),
          buildPurchase({ nodeId: 'r2c1', talentId: 'talent-deflect' }),
        ],
      })
      resolveSpecializationTree.mockReturnValue(buildResolvedTree())
      const definitions = new Map([
        ['talent-parry', buildTalentDefinition({ name: 'Parer', isRanked: true })],
        ['talent-deflect', buildTalentDefinition({ name: 'Deflect', isRanked: false })],
      ])
      const result = buildOwnedTalentSummary(actor, definitions)
      const talentIds = result.map(e => e.talentId)

      expect(talentIds).toEqual(['talent-parry', 'talent-deflect'])
    })

    it('handles resolveSpecializationTree throwing without crashing', () => {
      const actor = buildActor({
        specializations: [buildSpec()],
        talentPurchases: [buildPurchase()],
      })
      resolveSpecializationTree.mockImplementation(() => { throw new Error('Unexpected error') })
      const definitions = new Map([['talent-parry', buildTalentDefinition()]])
      const result = buildOwnedTalentSummary(actor, definitions)

      expect(result).toHaveLength(1)
      expect(result[0].sources[0].resolutionState).toBe('tree-unresolved')
    })

    it('uses tree name from resolved tree as treeName in source', () => {
      const actor = buildActor({
        specializations: [buildSpec()],
        talentPurchases: [buildPurchase()],
      })
      resolveSpecializationTree.mockReturnValue(buildResolvedTree({ tree: { id: 'tree-bodyguard', name: 'Bodyguard Tree', type: 'specialization-tree', system: { specializationId: 'spec-bodyguard', nodes: [{ nodeId: 'r1c1', talentId: 'talent-parry', row: 1, column: 1, cost: 5 }], connections: [{ from: 'r1c1', to: 'r2c1' }] } } }))
      const definitions = new Map([['talent-parry', buildTalentDefinition()]])
      const result = buildOwnedTalentSummary(actor, definitions)

      expect(result[0].sources[0].treeName).toBe('Bodyguard Tree')
      expect(result[0].sources[0].resolutionState).toBe('ok')
    })
  })
})
