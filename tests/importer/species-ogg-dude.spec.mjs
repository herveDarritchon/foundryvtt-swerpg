import { describe, it, expect, beforeEach } from 'vitest'
import { speciesMapper } from '../../module/importer/items/species-ogg-dude.mjs'
import { getSpeciesImportStats, resetSpeciesImportStats } from '../../module/importer/utils/species-import-utils.mjs'
import { mapOggDudeSkillCode, mapOggDudeSkillCodes } from '../../module/importer/mappings/oggdude-skill-map.mjs'

// Minimal SYSTEM mock if not provided (for isolated test execution)
if (globalThis.SYSTEM === undefined) {
  // Mock minimal SKILLS set with expected mapped ids for test context
  globalThis.SYSTEM = {
    SKILLS: {
      athletics: { id: 'athletics', label: 'Athletics' },
      perception: { id: 'perception', label: 'Perception' },
      deception: { id: 'deception', label: 'Deception' },
      science: { id: 'science', label: 'Science' },
      charm: { id: 'charm', label: 'Charm' },
      brawl: { id: 'brawl', label: 'Brawl' },
      streetwise: { id: 'streetwise', label: 'Streetwise' },
    },
  }
}

describe('OggDude skill mapping', () => {
  it("mappe chaque code attendu vers l'id système", () => {
    expect(mapOggDudeSkillCode('ATHL')).toBe('athletics')
    expect(mapOggDudeSkillCode('perc')).toBe('perception')
    expect(mapOggDudeSkillCode('DECEP')).toBe('deception')
    expect(mapOggDudeSkillCode('EDU')).toBe('education')
  })
  it('ignore code inconnu et renvoie null', () => {
    expect(mapOggDudeSkillCode('UNKNOWN', { warnOnUnknown: false })).toBeNull()
  })
  it('déduplique correctement', () => {
    const mapped = mapOggDudeSkillCodes(['ATHL', 'ATHL', 'PERC'])
    expect(mapped).toEqual(['athletics', 'perception'])
  })
})

describe('speciesMapper', () => {
  beforeEach(() => {
    resetSpeciesImportStats()
    // Ensure game is undefined (no Foundry runtime) for unit tests
    if (typeof globalThis.game !== 'undefined') {
      delete globalThis.game
    }
  })

  it('mappe une espèce basique vers le schéma attendu (nouvelle structure system/flags)', () => {
    const input = [
      {
        Key: 'human',
        Name: 'Humain',
        Description: 'Description',
        StartingChars: { Brawn: '2', Agility: '2', Intellect: '2', Cunning: '2', Willpower: '2', Presence: '2' },
        StartingAttrs: { WoundThreshold: '12', StrainThreshold: '10', Experience: '100' },
        SkillModifiers: {
          SkillModifier: [
            { Key: 'ATHL', RankStart: '1', RankAdd: '0', IsCareer: 'true' },
            { Key: 'ATHL', RankStart: '0', RankAdd: '1', IsCareer: 'false' },
            { Key: 'PERC', RankStart: '1', RankAdd: '0', IsCareer: 'false' },
          ],
        },
        TalentModifiers: { TalentModifier: [{ Key: 'Quick Draw' }] },
      },
    ]

    const [mapped] = speciesMapper(input)

    // Top-level identity fields
    expect(mapped.key).toBe('human')
    expect(mapped.name).toBe('Humain')

    // system holds TypeDataModel-validated fields
    expect(mapped.system).toBeDefined()
    expect(mapped.system.characteristics).toMatchObject({ brawn: 2, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 })
    expect(mapped.system.woundThreshold).toMatchObject({ modifier: 12, abilityKey: 'brawn' })
    expect(mapped.system.strainThreshold).toMatchObject({ modifier: 10, abilityKey: 'willpower' })
    expect(mapped.system.startingExperience).toBe(100)
    expect(mapped.system.freeSkills).toContain('athletics')
    expect(mapped.system.freeSkills).toContain('perception')
    expect(mapped.system.freeSkills.length).toBe(2)
    expect(Array.isArray(mapped.system.freeTalents)).toBe(true)

    // flags preserves OggDude source keys
    expect(mapped.flags).toBeDefined()
    expect(mapped.flags.swerpg.oggdudeKey).toBe('human')
    expect(mapped.flags.swerpg.oggdude.freeTalentKeys).toEqual(['Quick Draw'])

    const stats = getSpeciesImportStats()
    expect(stats.total).toBe(1)
    expect(stats.imported).toBe(1)
    expect(stats.rejected).toBe(0)
  })

  it('Bothan avec TalentModifier CONV — conserve la clé dans freeTalentKeys (regression non-regression)', () => {
    // Reproduit exactement le cas Bothan -> CONV -> Convincing Demeanor
    // Quand game n'est pas disponible (talents pas encore importés), CONV ne peut pas être résolu en UUID
    // mais la clé doit être préservée dans flags.swerpg.oggdude.freeTalentKeys
    const bothanInput = [
      {
        Key: 'BOTH',
        Name: 'Bothan',
        Description: 'Bothans are...',
        StartingChars: { Brawn: '1', Agility: '2', Intellect: '2', Cunning: '3', Willpower: '2', Presence: '2' },
        StartingAttrs: { WoundThreshold: '10', StrainThreshold: '11', Experience: '100' },
        SkillModifiers: {
          SkillModifier: [{ Key: 'SW', RankStart: '1', RankLimit: '2' }],
        },
        TalentModifiers: {
          TalentModifier: [{ Key: 'CONV', RankAdd: '1' }],
        },
      },
    ]

    const [mapped] = speciesMapper(bothanInput)

    expect(mapped.key).toBe('BOTH')
    expect(mapped.name).toBe('Bothan')

    // The OggDude key CONV must be preserved in flags regardless of resolution
    expect(mapped.flags.swerpg.oggdude.freeTalentKeys).toContain('CONV')
    expect(mapped.flags.swerpg.oggdude.freeTalentKeys).toHaveLength(1)

    // Without game context, freeTalents resolves to empty (no UUID available)
    expect(mapped.system.freeTalents).toEqual([])
  })

  it('Bothan CONV — incrément de unknownTalents quand le talent ne peut pas être résolu', () => {
    // Vérifie que la statistique unknownTalents est alimentée quand la résolution échoue
    const bothanInput = [
      {
        Key: 'BOTH',
        Name: 'Bothan',
        StartingChars: { Brawn: '1', Agility: '2', Intellect: '2', Cunning: '3', Willpower: '2', Presence: '2' },
        StartingAttrs: { WoundThreshold: '10', StrainThreshold: '11', Experience: '100' },
        TalentModifiers: { TalentModifier: [{ Key: 'CONV', RankAdd: '1' }] },
      },
    ]

    speciesMapper(bothanInput)

    const stats = getSpeciesImportStats()
    expect(stats.unknownTalents).toBe(1)
    // The detail set should contain the unresolved key
    expect(stats.talentDetails).toContain('CONV')
  })

  it('species sans TalentModifiers — freeTalentKeys vide, aucun unknownTalents', () => {
    const input = [
      {
        Key: 'HUMAN',
        Name: 'Human',
        StartingChars: { Brawn: '2', Agility: '2', Intellect: '2', Cunning: '2', Willpower: '2', Presence: '2' },
        StartingAttrs: { WoundThreshold: '12', StrainThreshold: '12', Experience: '110' },
      },
    ]

    const [mapped] = speciesMapper(input)

    expect(mapped.flags.swerpg.oggdude.freeTalentKeys).toEqual([])
    expect(mapped.system.freeTalents).toEqual([])

    const stats = getSpeciesImportStats()
    expect(stats.unknownTalents).toBe(0)
  })

  it('species avec talent résolu depuis game.items — UUID présent dans freeTalents, aucun unknownTalents', () => {
    // Simule un talent déjà importé dans game.items avec la clé OggDude correspondante
    globalThis.game = {
      items: {
        find: (fn) => {
          const fakeConvTalent = {
            type: 'talent',
            uuid: 'Item.fakeConvUUID',
            getFlag: (scope, key) => (scope === 'swerpg' && key === 'oggdudeKey' ? 'CONV' : null),
            system: { key: null },
            name: 'Convincing Demeanor',
          }
          return fn(fakeConvTalent) ? fakeConvTalent : undefined
        },
      },
      packs: { values: () => [] },
    }

    const bothanInput = [
      {
        Key: 'BOTH',
        Name: 'Bothan',
        StartingChars: { Brawn: '1', Agility: '2', Intellect: '2', Cunning: '3', Willpower: '2', Presence: '2' },
        StartingAttrs: { WoundThreshold: '10', StrainThreshold: '11', Experience: '100' },
        TalentModifiers: { TalentModifier: [{ Key: 'CONV', RankAdd: '1' }] },
      },
    ]

    const [mapped] = speciesMapper(bothanInput)

    // UUID résolu → présent dans freeTalents
    expect(mapped.system.freeTalents).toContain('Item.fakeConvUUID')
    // Clé source toujours préservée dans flags
    expect(mapped.flags.swerpg.oggdude.freeTalentKeys).toContain('CONV')
    // Résolution réussie → pas d'unknownTalents
    const stats = getSpeciesImportStats()
    expect(stats.unknownTalents).toBe(0)

    // Cleanup
    delete globalThis.game
  })
})
