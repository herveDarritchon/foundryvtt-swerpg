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

  /**
   * Build a minimal character actor mock for sheet-context tests.
   * @returns {object}
   */
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
        points: {
          ability: {},
          skill: {},
          talent: {},
        },
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

  /**
   * Build the mocked base sheet context consumed by CharacterSheet.
   * @param {object} actor
   * @returns {object}
   */
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

  /**
   * Render the CharacterSheet context with the mocked base actor sheet.
   * @param {object} actor
   * @returns {Promise<object>}
   */
  async function getContext(actor) {
    vi.spyOn(SwerpgBaseActorSheet.prototype, '_prepareContext').mockResolvedValue(buildBaseContext(actor))

    const sheet = new CharacterSheet({ document: actor })
    sheet.actor = actor
    sheet.document = actor

    return await sheet._prepareContext({})
  }

  it('exposes sidebarHeader with name and img for a character actor', async () => {
    const actor = buildCharacterActor()
    const context = await getContext(actor)

    expect(context.sidebarHeader).toBeDefined()
    expect(context.sidebarHeader.name).toBe('Darth Maul')
    expect(context.sidebarHeader.img).toBe('systems/swerpg/assets/portraits/darth-maul.webp')
    expect(context.sidebarHeader.wounds).toEqual({ value: 3, threshold: 12 })
    expect(context.sidebarHeader.strain).toEqual({ value: 2, threshold: 11 })
  })

  it('exposes multi-specialization display data in the sheet context', async () => {
    const actor = buildCharacterActor()
    actor.system.details.specializations = new Set([{ name: 'Bodyguard' }, { name: 'Mercenary Soldier' }])
    const context = await getContext(actor)

    expect(context.specializationName).toBe('Bodyguard')
    expect(context.specializationNames).toEqual(['Bodyguard', 'Mercenary Soldier'])
    expect(context.specializationCount).toBe(2)
    expect(context.specializationDisplayName).toBe('Bodyguard, Mercenary Soldier')
  })

  it('exposes specializationHeader with displayName fallback when no specializations', async () => {
    const actor = buildCharacterActor()
    actor.system.details.specializations = new Set()
    const context = await getContext(actor)

    expect(context.specializationHeader).toBeDefined()
    expect(context.specializationHeader.primaryName).toBeNull()
    expect(context.specializationHeader.extraCount).toBe(0)
    expect(context.specializationHeader.extraNames).toEqual([])
    expect(context.specializationHeader.hasExtraSpecializations).toBe(false)
    expect(context.specializationHeader.displayName).toBe('SPECIALIZATION.SHEET.NO_SPECIALIZATION')
    expect(context.specializationHeader.badgeLabel).toBeNull()
    expect(context.specializationHeader.tooltip).toBeNull()
  })

  it('exposes specializationHeader with single specialization when count is 1', async () => {
    const actor = buildCharacterActor()
    actor.system.details.specializations = new Set([{ name: 'Bodyguard' }])
    const context = await getContext(actor)

    expect(context.specializationHeader.primaryName).toBe('Bodyguard')
    expect(context.specializationHeader.extraCount).toBe(0)
    expect(context.specializationHeader.extraNames).toEqual([])
    expect(context.specializationHeader.hasExtraSpecializations).toBe(false)
    expect(context.specializationHeader.displayName).toBe('Bodyguard')
    expect(context.specializationHeader.badgeLabel).toBeNull()
    expect(context.specializationHeader.tooltip).toBeNull()
  })

  it('exposes specializationHeader with primary name and +N badge when count is 2', async () => {
    const actor = buildCharacterActor()
    actor.system.details.specializations = new Set([{ name: 'Bodyguard' }, { name: 'Mercenary Soldier' }])
    const context = await getContext(actor)

    expect(context.specializationHeader.primaryName).toBe('Bodyguard')
    expect(context.specializationHeader.extraCount).toBe(1)
    expect(context.specializationHeader.extraNames).toEqual(['Mercenary Soldier'])
    expect(context.specializationHeader.hasExtraSpecializations).toBe(true)
    expect(context.specializationHeader.displayName).toBe('Bodyguard')
    expect(context.specializationHeader.badgeLabel).toBe('+1')
    expect(context.specializationHeader.tooltip).toBe('Mercenary Soldier')
  })

  it('exposes specializationHeader with +2 badge and tooltip listing extras when count is 3', async () => {
    const actor = buildCharacterActor()
    actor.system.details.specializations = new Set([
      { name: 'Bodyguard' },
      { name: 'Mercenary Soldier' },
      { name: 'Infiltrator' },
    ])
    const context = await getContext(actor)

    expect(context.specializationHeader.primaryName).toBe('Bodyguard')
    expect(context.specializationHeader.extraCount).toBe(2)
    expect(context.specializationHeader.extraNames).toEqual(['Mercenary Soldier', 'Infiltrator'])
    expect(context.specializationHeader.hasExtraSpecializations).toBe(true)
    expect(context.specializationHeader.displayName).toBe('Bodyguard')
    expect(context.specializationHeader.badgeLabel).toBe('+2')
    expect(context.specializationHeader.tooltip).toBe('Mercenary Soldier, Infiltrator')
  })

  it('does not expose sidebarHeader from the base actor sheet context', async () => {
    const actor = buildCharacterActor()
    actor.type = 'adversary'
    actor.name = 'Stormtrooper'

    const context = buildBaseContext(actor)

    expect(context.sidebarHeader).toBeUndefined()
  })

  it('marks creation as complete for a V1 character when legacy creation counters are absent', async () => {
    const actor = buildCharacterActor()
    actor.system.details.career = { name: 'Assassin' }
    actor.system.details.specializations = new Set([{ name: 'Infiltrator' }])

    const context = await getContext(actor)

    expect(context.incomplete.characteristics).toBe(false)
    expect(context.incomplete.skills).toBe(false)
    expect(context.incomplete.talents).toBe(false)
    expect(context.incomplete.creation).toBe(false)
  })

  it('keeps creation incomplete when legacy creation counters still require input', async () => {
    const actor = buildCharacterActor()
    actor.system.details.career = { name: 'Assassin' }
    actor.system.details.specializations = new Set([{ name: 'Infiltrator' }])
    actor.system.points.ability.requireInput = true
    actor.system.points.skill.available = 2
    actor.system.points.talent.available = 1

    const context = await getContext(actor)

    expect(context.incomplete.characteristics).toBe(true)
    expect(context.incomplete.skills).toBe(true)
    expect(context.incomplete.talents).toBe(true)
    expect(context.incomplete.creation).toBe(true)
  })
})
