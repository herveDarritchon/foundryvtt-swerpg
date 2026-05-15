import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../../module/utils/logger.mjs', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../module/lib/skills/skill-factory.mjs', () => ({ default: {} }))
vi.mock('../../../module/lib/talents/talent-factory.mjs', () => ({ default: {} }))
vi.mock('../../../module/lib/jauges/jauge-factory.mjs', () => ({
  default: { build: vi.fn(() => ({ create: vi.fn(() => ({})) })) },
}))
vi.mock('../../../module/lib/featured-equipment.mjs', () => ({
  computeFeaturedEquipment: vi.fn(() => []),
}))

vi.mock('../../../module/lib/talent-node/owned-talent-summary.mjs', () => ({
  buildOwnedTalentSummary: vi.fn(),
}))

import { buildOwnedTalentSummary } from '../../../module/lib/talent-node/owned-talent-summary.mjs'

describe('CharacterSheet talent consolidation (US12)', () => {
  let CharacterSheet
  let SwerpgBaseActorSheet

  beforeEach(async () => {
    vi.clearAllMocks()

    if (!globalThis.game.system.tree) globalThis.game.system.tree = {}
    globalThis.game.system.tree.actor = null
    delete globalThis.game.items

    SwerpgBaseActorSheet = (await import('../../../module/applications/sheets/base-actor-sheet.mjs')).default
    CharacterSheet = (await import('../../../module/applications/sheets/character-sheet.mjs')).default
  })

  function buildBaseContext(actor) {
    return {
      actor,
      source: actor.toObject(),
      incomplete: {},
      progression: {
        experience: actor.system.progression.experience,
        freeSkillRanks: {
          career: { ...actor.system.progression.freeSkillRanks.career },
          specialization: { ...actor.system.progression.freeSkillRanks.specialization },
        },
      },
      tabs: [{ id: 'talents', group: 'sheet' }],
      skillCategories: {},
    }
  }

  function buildMockActor(overrides = {}) {
    const actor = {
      items: [],
      system: {
        skills: {},
        progression: {
          freeSkillRanks: {
            career: { spent: 0, gained: 4, available: 4 },
            specialization: { spent: 0, gained: 0, available: 0 },
          },
          experience: { available: 0, spent: 0, gained: 0, total: 0 },
        },
        characteristics: {
          brawn: { rank: { value: 2 } },
        },
        details: {
          career: null,
          specializations: new Set(),
          species: { name: 'Test Species' },
        },
        resources: {
          wounds: { value: 0, threshold: 10 },
          strain: { value: 0, threshold: 10 },
          encumbrance: { value: 0, threshold: 10 },
        },
        points: {},
      },
      hasFreeSkillsAvailable: vi.fn(() => false),
      openSpecializationTreeApp: vi.fn(),
      closeSpecializationTreeApp: vi.fn(),
      ...overrides,
    }
    actor.toObject = () => JSON.parse(JSON.stringify(actor))
    return actor
  }

  async function getContext(actor) {
    vi.spyOn(SwerpgBaseActorSheet.prototype, '_prepareContext').mockResolvedValue(buildBaseContext(actor))
    const sheet = new CharacterSheet({ document: actor })
    sheet.actor = actor
    sheet.document = actor
    return await sheet._prepareContext({})
  }

  it('produces empty talents array when buildOwnedTalentSummary returns empty', async () => {
    buildOwnedTalentSummary.mockReturnValue([])
    const actor = buildMockActor()
    const context = await getContext(actor)

    expect(context.talents).toEqual([])
  })

  it('exposes a localized specialization tree CTA label in context', async () => {
    buildOwnedTalentSummary.mockReturnValue([])
    const actor = buildMockActor()

    const context = await getContext(actor)

    expect(context.specializationTreeButtonLabel).toBe('SWERPG.TALENT.VIEW_SPECIALIZATION_TREES')
  })

  it('builds consolidated talent entry with tags, rank, and source labels', async () => {
    buildOwnedTalentSummary.mockReturnValue([
      {
        talentId: 'talent-parry',
        name: 'Parry',
        activation: 'active',
        isRanked: true,
        rank: 2,
        sources: [
          { specializationName: 'Bodyguard', treeName: null, resolutionState: 'ok' },
          { specializationName: 'Mercenary Soldier', treeName: null, resolutionState: 'ok' },
        ],
      },
    ])
    const actor = buildMockActor()
    const context = await getContext(actor)

    expect(context.talents).toHaveLength(1)
    const entry = context.talents[0]
    expect(entry.talentId).toBe('talent-parry')
    expect(entry.name).toBe('Parry')
    expect(entry.isRanked).toBe(true)
    expect(entry.rank).toBe(2)
    expect(entry.sourceLabels).toEqual(['Bodyguard', 'Mercenary Soldier'])
    expect(entry.sources).toEqual([
      { label: 'Bodyguard', cssClass: 'talent-source--resolved', isDegraded: false },
      { label: 'Mercenary Soldier', cssClass: 'talent-source--resolved', isDegraded: false },
    ])
    expect(entry.hasDegradedSources).toBe(false)
    expect(entry.tags).toEqual([
      { label: 'SWERPG.TALENT.ACTIVE', cssClass: 'tag-active' },
      { label: 'SWERPG.TALENT.RANKED', cssClass: 'tag-ranked' },
    ])
  })

  it('builds non-ranked talent entry without rank value', async () => {
    buildOwnedTalentSummary.mockReturnValue([
      {
        talentId: 'talent-toughness',
        name: 'Toughness',
        activation: 'passive',
        isRanked: false,
        rank: null,
        sources: [
          { specializationName: 'Bodyguard', resolutionState: 'ok' },
        ],
      },
    ])
    const actor = buildMockActor()
    const context = await getContext(actor)

    const entry = context.talents[0]
    expect(entry.isRanked).toBe(false)
    expect(entry.rank).toBeNull()
    expect(entry.tags).toEqual([
      { label: 'SWERPG.TALENT.PASSIVE', cssClass: 'tag-passive' },
      { label: 'SWERPG.TALENT.NON_RANKED', cssClass: 'tag-neutral' },
    ])
  })

  it('uses localized unknown name when definition is missing', async () => {
    buildOwnedTalentSummary.mockReturnValue([
      {
        talentId: 'talent-unknown',
        name: null,
        activation: null,
        isRanked: null,
        rank: null,
        sources: [
          { specializationName: null, resolutionState: 'specialization-not-found' },
        ],
      },
    ])
    const actor = buildMockActor()
    const context = await getContext(actor)

    const entry = context.talents[0]
    expect(entry.name).toBe('SWERPG.TALENT.UNKNOWN')
    expect(entry.tags).toEqual([
      { label: 'SWERPG.TALENT.UNSPECIFIED', cssClass: 'tag-neutral' },
    ])
    expect(entry.rank).toBeNull()
  })

  it('maps unresolved tree state to specialization without available tree label', async () => {
    buildOwnedTalentSummary.mockReturnValue([
      {
        talentId: 'talent-parry',
        name: 'Parry',
        activation: 'active',
        isRanked: true,
        rank: 1,
        sources: [
          { specializationName: null, treeName: null, resolutionState: 'tree-unresolved' },
        ],
      },
    ])
    const actor = buildMockActor()
    const context = await getContext(actor)

    const entry = context.talents[0]
    expect(entry.sourceLabels).toEqual(['SWERPG.TALENT.SOURCE_SPECIALIZATION_WITHOUT_TREE'])
    expect(entry.sources).toEqual([
      {
        label: 'SWERPG.TALENT.SOURCE_SPECIALIZATION_WITHOUT_TREE',
        cssClass: 'talent-source--degraded',
        isDegraded: true,
      },
    ])
    expect(entry.hasDegradedSources).toBe(true)
  })

  it('deduplicates same talentId into single entry with consolidated sources', async () => {
    buildOwnedTalentSummary.mockReturnValue([
      {
        talentId: 'talent-parry',
        name: 'Parry',
        activation: 'active',
        isRanked: true,
        rank: 2,
        sources: [
          { specializationName: 'Bodyguard', resolutionState: 'ok' },
          { specializationName: 'Mercenary Soldier', resolutionState: 'ok' },
          { specializationName: 'Bodyguard', resolutionState: 'ok' },
        ],
      },
    ])
    const actor = buildMockActor()
    const context = await getContext(actor)

    expect(context.talents).toHaveLength(1)
    const entry = context.talents[0]
    expect(entry.sourceLabels).toHaveLength(2)
    expect(entry.sourceLabels).toEqual(['Bodyguard', 'Mercenary Soldier'])
  })

  it('keeps distinct degraded labels alongside resolved sources', async () => {
    buildOwnedTalentSummary.mockReturnValue([
      {
        talentId: 'talent-parry',
        name: 'Parry',
        activation: 'active',
        isRanked: true,
        rank: 2,
        sources: [
          { specializationName: 'Bodyguard', resolutionState: 'ok' },
          { specializationName: null, treeName: null, resolutionState: 'tree-incomplete' },
          { specializationName: null, treeName: null, resolutionState: 'tree-unresolved' },
        ],
      },
    ])

    const actor = buildMockActor()
    const context = await getContext(actor)

    expect(context.talents[0].sourceLabels).toEqual([
      'Bodyguard',
      'SWERPG.TALENT.SOURCE_SPECIALIZATION_WITHOUT_TREE',
    ])
  })

  it('maps missing node state to incomplete source label', async () => {
    buildOwnedTalentSummary.mockReturnValue([
      {
        talentId: 'talent-parry',
        name: 'Parry',
        activation: 'active',
        isRanked: true,
        rank: 1,
        sources: [
          { specializationName: 'Bodyguard', treeName: 'Bodyguard Tree', resolutionState: 'node-missing' },
        ],
      },
    ])

    const actor = buildMockActor()
    const context = await getContext(actor)

    expect(context.talents[0].sourceLabels).toEqual(['SWERPG.TALENT.SOURCE_INCOMPLETE'])
  })

  it('sorts consolidated entries by display name then talent id', async () => {
    buildOwnedTalentSummary.mockReturnValue([
      {
        talentId: 'talent-zeta',
        name: 'Zeta',
        activation: 'passive',
        isRanked: false,
        rank: null,
        sources: [{ specializationName: 'Bodyguard', resolutionState: 'ok' }],
      },
      {
        talentId: 'talent-alpha-b',
        name: 'Alpha',
        activation: 'active',
        isRanked: true,
        rank: 1,
        sources: [{ specializationName: 'Pilot', resolutionState: 'ok' }],
      },
      {
        talentId: 'talent-alpha-a',
        name: 'Alpha',
        activation: 'passive',
        isRanked: false,
        rank: null,
        sources: [{ specializationName: 'Explorer', resolutionState: 'ok' }],
      },
    ])

    const actor = buildMockActor()
    const context = await getContext(actor)

    expect(context.talents.map((entry) => entry.talentId)).toEqual([
      'talent-alpha-a',
      'talent-alpha-b',
      'talent-zeta',
    ])
  })

  it('keeps rendering other talents when one entry has degraded sources', async () => {
    buildOwnedTalentSummary.mockReturnValue([
      {
        talentId: 'talent-degraded',
        name: 'Broken Source',
        activation: 'passive',
        isRanked: false,
        rank: null,
        sources: [{ specializationName: null, treeName: null, resolutionState: 'tree-unresolved' }],
      },
      {
        talentId: 'talent-resolved',
        name: 'Parry',
        activation: 'active',
        isRanked: true,
        rank: 2,
        sources: [{ specializationName: 'Bodyguard', resolutionState: 'ok' }],
      },
    ])

    const actor = buildMockActor()
    const context = await getContext(actor)

    expect(context.talents.map((entry) => entry.talentId)).toEqual(['talent-degraded', 'talent-resolved'])
    expect(context.talents[0].sourceLabels).toEqual(['SWERPG.TALENT.SOURCE_SPECIALIZATION_WITHOUT_TREE'])
    expect(context.talents[1].sourceLabels).toEqual(['Bodyguard'])
  })

  it('resolves talent definitions by system.id with fallback to item.id', async () => {
    const talentWithSystemId = {
      id: 'Item.abc123',
      name: 'Grit',
      type: 'talent',
      system: { id: 'grit', activation: 'passive', isRanked: true },
    }
    const talentWithoutSystemId = {
      id: 'Item.def456',
      name: 'Old Talent',
      type: 'talent',
      system: { activation: 'active', isRanked: false },
    }
    const talentWithEmptySystemId = {
      id: 'Item.ghi789',
      name: 'Willpower',
      type: 'talent',
      system: { id: '', activation: 'passive', isRanked: true },
    }

    globalThis.game.items = [
      talentWithSystemId,
      talentWithoutSystemId,
      talentWithEmptySystemId,
    ]

    let capturedDefinitions
    buildOwnedTalentSummary.mockImplementationOnce((_actor, definitions) => {
      capturedDefinitions = definitions
      return []
    })

    const actor = buildMockActor()
    await getContext(actor)

    expect(capturedDefinitions.get('grit')).toEqual({
      name: 'Grit',
      activation: 'passive',
      isRanked: true,
    })
    expect(capturedDefinitions.get('Item.def456')).toEqual({
      name: 'Old Talent',
      activation: 'active',
      isRanked: false,
    })
    expect(capturedDefinitions.get('Item.ghi789')).toEqual({
      name: 'Willpower',
      activation: 'passive',
      isRanked: true,
    })
    expect(capturedDefinitions.size).toBe(3)
  })

  it('opens the specialization tree app from the talents action handler', async () => {
    const actor = buildMockActor()
    const sheet = new CharacterSheet({ document: actor })
    sheet.actor = actor
    sheet.document = actor

    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    }
    const target = {
      dataset: { action: 'talentTree' },
    }

    await sheet._onClickAction(event, target)

    expect(actor.openSpecializationTreeApp, 'talentTree action should delegate to the actor bridge').toHaveBeenCalledTimes(1)
  })
})
