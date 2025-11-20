import { describe, it, expect } from 'vitest'
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
  it('mappe une espèce basique vers le schéma attendu', () => {
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

    resetSpeciesImportStats()
    const [mapped] = speciesMapper(input)
    expect(mapped.key).toBe('human')
    expect(mapped.name).toBe('Humain')
    expect(mapped.characteristics).toMatchObject({ brawn: 2, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2 })
    expect(mapped.woundThreshold).toMatchObject({ modifier: 12, abilityKey: 'brawn' })
    expect(mapped.strainThreshold).toMatchObject({ modifier: 10, abilityKey: 'willpower' })
    expect(mapped.startingExperience).toBe(100)
    expect(mapped.freeSkills).toContain('athletics')
    expect(mapped.freeSkills).toContain('perception')
    expect(mapped.freeSkills.length).toBe(2)
    expect(Array.isArray(mapped.freeTalents)).toBe(true)
    const stats = getSpeciesImportStats()
    expect(stats.total).toBe(1)
    expect(stats.imported).toBe(1)
    expect(stats.rejected).toBe(0)
  })
})
