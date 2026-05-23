/**
 * Tests for the OggDude import dependency graph.
 * Covers:
 * - Pipeline registry structure (id, dependsOn, producesReferences)
 * - Topological order for talent -> species
 * - Topological order for talent -> specialization-tree
 * - Soft dependencies not blocking when absent
 * - Cycle detection falls back to original order
 * - Species mapper resolves talent UUID from importSession
 * - Species mapper preserves freeTalentKeys when resolution fails
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Pure imports — no Foundry globals needed for these tests
import { topologicalSort, buildExecutionPlan, createImportSession, publishTalentReferences } from '../../module/importer/utils/import-session.mjs'
import { speciesMapper } from '../../module/importer/items/species-ogg-dude.mjs'
import { resetSpeciesImportStats, getSpeciesImportStats } from '../../module/importer/utils/species-import-utils.mjs'

// Minimal SYSTEM mock
if (globalThis.SYSTEM === undefined) {
  globalThis.SYSTEM = {
    SKILLS: {
      athletics: { id: 'athletics' },
      perception: { id: 'perception' },
    },
  }
}

// ---- Helpers ----------------------------------------------------------------

function makePipeline(id, { dependsOn = [], softDependsOn = [], domain = id, type = id } = {}) {
  return { id, domain, type, contextBuilder: () => {}, dependsOn, softDependsOn, producesReferences: [] }
}

function buildMinimalRegistry() {
  return new Map([
    ['weapon', [makePipeline('weapon')]],
    ['armor', [makePipeline('armor')]],
    ['gear', [makePipeline('gear')]],
    ['talent', [makePipeline('talent', { producesReferences: ['talent.oggdudeKey'] })]],
    ['species', [makePipeline('species', { dependsOn: ['talent'] })]],
    ['career', [makePipeline('career')]],
    ['specialization', [makePipeline('specialization'), makePipeline('specialization-tree', { dependsOn: ['talent'], softDependsOn: ['career', 'specialization'] })]],
    ['motivation-category', [makePipeline('motivation-category')]],
    ['motivation', [makePipeline('motivation', { softDependsOn: ['motivation-category'] })]],
    ['duty', [makePipeline('duty')]],
  ])
}

// ---- Pipeline registry structure --------------------------------------------

describe('Pipeline registry — dependency declarations', () => {
  it('all known domains are registered in the registry', () => {
    const registry = buildMinimalRegistry()
    const expectedDomains = ['weapon', 'armor', 'gear', 'talent', 'species', 'career', 'specialization', 'motivation-category', 'motivation', 'duty']
    for (const domain of expectedDomains) {
      expect(registry.has(domain)).toBe(true)
    }
  })

  it('talent pipeline has no hard dependencies', () => {
    const registry = buildMinimalRegistry()
    const [talent] = registry.get('talent')
    expect(talent.dependsOn).toEqual([])
  })

  it('species pipeline declares hard dependency on talent', () => {
    const registry = buildMinimalRegistry()
    const [species] = registry.get('species')
    expect(species.dependsOn).toContain('talent')
  })

  it('specialization-tree pipeline declares hard dependency on talent', () => {
    const registry = buildMinimalRegistry()
    const specPipelines = registry.get('specialization')
    const tree = specPipelines.find((p) => p.id === 'specialization-tree')
    expect(tree).toBeDefined()
    expect(tree.dependsOn).toContain('talent')
  })

  it('specialization-tree pipeline declares soft dependency on career', () => {
    const registry = buildMinimalRegistry()
    const specPipelines = registry.get('specialization')
    const tree = specPipelines.find((p) => p.id === 'specialization-tree')
    expect(tree.softDependsOn).toContain('career')
  })
})

// ---- Topological sort — talent -> species -----------------------------------

describe('Topological sort — talent before species', () => {
  it('ensures talent is executed before species in the sorted plan', () => {
    const registry = buildMinimalRegistry()
    const plan = buildExecutionPlan(['talent', 'species'], registry)
    const ids = plan.map((p) => p.id)
    expect(ids.indexOf('talent')).toBeLessThan(ids.indexOf('species'))
  })

  it('ensures talent is executed before species even when species is first in selection', () => {
    const registry = buildMinimalRegistry()
    const plan = buildExecutionPlan(['species', 'talent'], registry)
    const ids = plan.map((p) => p.id)
    expect(ids.indexOf('talent')).toBeLessThan(ids.indexOf('species'))
  })
})

// ---- Topological sort — talent -> specialization-tree -----------------------

describe('Topological sort — talent before specialization-tree', () => {
  it('ensures talent is executed before specialization-tree', () => {
    const registry = buildMinimalRegistry()
    const plan = buildExecutionPlan(['talent', 'specialization'], registry)
    const ids = plan.map((p) => p.id)
    expect(ids.indexOf('talent')).toBeLessThan(ids.indexOf('specialization-tree'))
  })
})

// ---- Soft dependency: not blocking when absent ------------------------------

describe('Soft dependency — not blocking when absent', () => {
  it('specialization-tree imports successfully even when career is not selected', () => {
    const registry = buildMinimalRegistry()
    // Only talent + specialization selected, career absent
    const plan = buildExecutionPlan(['talent', 'specialization'], registry)
    const ids = plan.map((p) => p.id)
    expect(ids).toContain('specialization-tree')
    expect(ids).not.toContain('career')
  })

  it('motivation imports successfully when motivation-category is not selected', () => {
    const registry = buildMinimalRegistry()
    const plan = buildExecutionPlan(['motivation'], registry)
    const ids = plan.map((p) => p.id)
    expect(ids).toContain('motivation')
  })
})

// ---- Cycle detection --------------------------------------------------------

describe('Cycle detection', () => {
  it('detects a cycle on hard dependencies and returns hasCycle=true', () => {
    const pipelines = [
      makePipeline('A', { dependsOn: ['B'] }),
      makePipeline('B', { dependsOn: ['A'] }),
    ]
    const { hasCycle } = topologicalSort(pipelines)
    expect(hasCycle).toBe(true)
  })

  it('fallback order is returned intact when cycle is detected', () => {
    const pipelines = [
      makePipeline('A', { dependsOn: ['B'] }),
      makePipeline('B', { dependsOn: ['A'] }),
    ]
    const { sorted } = topologicalSort(pipelines)
    // Falls back to original pipelines array (same reference)
    expect(sorted).toEqual(pipelines)
  })
})

// ---- Session-based resolution: species -> talent ----------------------------

describe('speciesMapper — session-based resolution (Bothan -> CONV)', () => {
  beforeEach(() => {
    resetSpeciesImportStats()
    if (typeof globalThis.game !== 'undefined') delete globalThis.game
  })

  afterEach(() => {
    if (typeof globalThis.game !== 'undefined') delete globalThis.game
  })

  const bothanInput = [
    {
      Key: 'BOTH',
      Name: 'Bothan',
      Description: 'Bothans are...',
      StartingChars: { Brawn: '1', Agility: '2', Intellect: '2', Cunning: '3', Willpower: '2', Presence: '2' },
      StartingAttrs: { WoundThreshold: '10', StrainThreshold: '11', Experience: '100' },
      TalentModifiers: {
        TalentModifier: [{ Key: 'CONV', RankAdd: '1' }],
      },
    },
  ]

  it('resolves CONV from importSession.referenceIndex when talent was imported in the same batch', () => {
    const session = createImportSession()
    // Simulate talent pipeline having published CONV
    publishTalentReferences(session, [
      { uuid: 'Item.convincing-demeanor-uuid', flags: { swerpg: { oggdudeKey: 'CONV' } }, system: {} },
    ])

    const [mapped] = speciesMapper(bothanInput, session)

    // UUID should be resolved from the session index
    expect(mapped.system.freeTalents).toContain('Item.convincing-demeanor-uuid')
    // Source key still preserved in flags
    expect(mapped.flags.swerpg.oggdude.freeTalentKeys).toContain('CONV')
    // No unresolved references since session resolved it
    expect(session.unresolvedReferences).toHaveLength(0)
    // Stats: no unknown talents
    const stats = getSpeciesImportStats()
    expect(stats.unknownTalents).toBe(0)
  })

  it('preserves freeTalentKeys and records unresolved when session has no matching entry', () => {
    const session = createImportSession()
    // Session is empty — CONV not published yet

    const [mapped] = speciesMapper(bothanInput, session)

    expect(mapped.flags.swerpg.oggdude.freeTalentKeys).toContain('CONV')
    expect(mapped.system.freeTalents).toEqual([])
    expect(session.unresolvedReferences).toHaveLength(1)
    expect(session.unresolvedReferences[0]).toMatchObject({ domain: 'species', key: 'CONV' })
  })

  it('increments unknownTalents stat when CONV cannot be resolved', () => {
    const session = createImportSession()
    speciesMapper(bothanInput, session)
    const stats = getSpeciesImportStats()
    expect(stats.unknownTalents).toBeGreaterThanOrEqual(1)
    expect(stats.talentDetails).toContain('CONV')
  })

  it('falls back to game.items when key absent from session but present in world', () => {
    const session = createImportSession()
    globalThis.game = {
      items: {
        find: (fn) => {
          const fakeItem = {
            type: 'talent',
            uuid: 'Item.world-conv',
            getFlag: (s, k) => (s === 'swerpg' && k === 'oggdudeKey' ? 'CONV' : null),
            system: {},
            name: '',
          }
          return fn(fakeItem) ? fakeItem : undefined
        },
      },
      packs: { values: () => [] },
    }

    const [mapped] = speciesMapper(bothanInput, session)
    expect(mapped.system.freeTalents).toContain('Item.world-conv')
    expect(session.unresolvedReferences).toHaveLength(0)
  })

  it('works correctly without session (null) — legacy path', () => {
    // No session passed: original resolveTalentUUIDs path, no game → empty freeTalents
    const [mapped] = speciesMapper(bothanInput, null)
    expect(mapped.flags.swerpg.oggdude.freeTalentKeys).toContain('CONV')
    expect(mapped.system.freeTalents).toEqual([])
  })
})

// ---- Independent domains not impacted by dependency graph -------------------

describe('Independent domain pipelines — no regression', () => {
  it('weapon pipeline has no hard dependencies and is unaffected', () => {
    const registry = buildMinimalRegistry()
    const plan = buildExecutionPlan(['weapon'], registry)
    expect(plan).toHaveLength(1)
    expect(plan[0].id).toBe('weapon')
  })

  it('armor pipeline has no hard dependencies and is unaffected', () => {
    const registry = buildMinimalRegistry()
    const plan = buildExecutionPlan(['armor'], registry)
    expect(plan[0].id).toBe('armor')
  })

  it('species alone imports without hard dependency blocking when talent is absent (soft failure path)', () => {
    const registry = buildMinimalRegistry()
    // species depends on talent but talent is not selected
    // The plan still includes species — the dependency is not enforced to block execution (soft-skip)
    const plan = buildExecutionPlan(['species'], registry)
    // species should still be in the plan even without talent
    expect(plan.map((p) => p.id)).toContain('species')
  })
})