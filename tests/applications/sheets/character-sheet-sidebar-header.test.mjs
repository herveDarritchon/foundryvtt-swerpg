import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../../module/utils/logger.mjs', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../module/lib/jauges/jauge-factory.mjs', () => ({
  default: { build: vi.fn(() => ({ create: vi.fn(() => ({})) })) },
}))
vi.mock('../../../module/lib/featured-equipment.mjs', () => ({
  computeFeaturedEquipment: vi.fn(() => []),
}))
vi.mock('../../../module/lib/skills/skill-factory.mjs', () => ({ default: {} }))
vi.mock('../../../module/lib/talents/talent-factory.mjs', () => ({ default: {} }))

describe('CharacterSheet sidebarHeader context', () => {
  let CharacterSheet
  let SwerpgBaseActorSheet

  beforeEach(async () => {
    vi.clearAllMocks()
    if (!globalThis.game.system.tree) globalThis.game.system.tree = {}
    globalThis.game.system.tree.actor = null
    CharacterSheet = (await import('../../../module/applications/sheets/character-sheet.mjs')).default
    SwerpgBaseActorSheet = (await import('../../../module/applications/sheets/base-actor-sheet.mjs')).default
  })

  function buildCharacterActor() {
    const actor = {
      name: 'Darth Maul',
      img: 'systems/swerpg/assets/portraits/darth-maul.webp',
      type: 'character',
      system: {
        skills: {},
        characteristics: {
          agility: { rank: { value: 3 } },
          brawn: { rank: { value: 2 } },
          intellect: { rank: { value: 3 } },
          cunning: { rank: { value: 2 } },
          presence: { rank: { value: 2 } },
          willpower: { rank: { value: 1 } },
        },
        progression: {
          experience: { available: 100, spent: 0, gained: 100, total: 100 },
          freeSkillRanks: { career: { spent: 0, gained: 4 }, specialization: { spent: 0, gained: 2 } },
        },
        details: {
          species: { name: 'Zabrak' },
          career: null,
          specializations: new Set(),
        },
        resources: {
          wounds: { value: 3, threshold: 12 },
          strain: { value: 2, threshold: 11 },
          encumbrance: { value: 0, threshold: 10 },
        },
        points: {},
      },
      items: [],
      hasFreeSkillsAvailable: () => false,
    }
    actor.toObject = () => ({
      name: actor.name,
      img: actor.img,
      system: {
        ...JSON.parse(JSON.stringify(actor.system)),
        details: {
          ...JSON.parse(JSON.stringify(actor.system.details)),
          specializations: Array.from(actor.system.details.specializations || []),
        },
      },
    })
    return actor
  }

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
      tabs: [{ id: 'attributes', group: 'sheet' }],
      skillCategories: {},
    }
  }

  it('exposes sidebarHeader with name and img for a character actor', async () => {
    const actor = buildCharacterActor()
    vi.spyOn(SwerpgBaseActorSheet.prototype, '_prepareContext').mockResolvedValue(buildBaseContext(actor))

    const sheet = new CharacterSheet({ document: actor })
    sheet.actor = actor
    sheet.document = actor

    const context = await sheet._prepareContext({})

    expect(context.sidebarHeader).toBeDefined()
    expect(context.sidebarHeader.name).toBe('Darth Maul')
    expect(context.sidebarHeader.img).toBe('systems/swerpg/assets/portraits/darth-maul.webp')
    expect(context.sidebarHeader.wounds).toEqual({ value: 3, threshold: 12 })
    expect(context.sidebarHeader.strain).toEqual({ value: 2, threshold: 11 })
  })

  it('exposes multi-specialization display data in the sheet context', async () => {
    const actor = buildCharacterActor()
    actor.system.details.specializations = new Set([{ name: 'Bodyguard' }, { name: 'Mercenary Soldier' }])
    vi.spyOn(SwerpgBaseActorSheet.prototype, '_prepareContext').mockResolvedValue(buildBaseContext(actor))

    const sheet = new CharacterSheet({ document: actor })
    sheet.actor = actor
    sheet.document = actor

    const context = await sheet._prepareContext({})

    expect(context.specializationName).toBe('Bodyguard')
    expect(context.specializationNames).toEqual(['Bodyguard', 'Mercenary Soldier'])
    expect(context.specializationCount).toBe(2)
    expect(context.specializationDisplayName).toBe('Bodyguard, Mercenary Soldier')
  })

  it('does not expose sidebarHeader from the base actor sheet context', async () => {
    const actor = buildCharacterActor()
    actor.type = 'adversary'
    actor.name = 'Stormtrooper'

    const context = buildBaseContext(actor)

    expect(context.sidebarHeader).toBeUndefined()
  })
})
