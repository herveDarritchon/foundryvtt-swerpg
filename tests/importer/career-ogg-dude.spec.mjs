import { describe, it, expect } from 'vitest'
// Minimal SYSTEM mock must precede imports that rely on SYSTEM
if (globalThis.SYSTEM === undefined) {
  globalThis.SYSTEM = {
    SKILLS: {
      athletics: { id: 'athletics' },
      perception: { id: 'perception' },
      deception: { id: 'deception' },
      science: { id: 'science' },
      stealth: { id: 'stealth' },
      wilderness: { id: 'wilderness' },
      arcana: { id: 'arcana' },
      diplomacy: { id: 'diplomacy' },
      intimidation: { id: 'intimidation' },
      performance: { id: 'performance' },
      society: { id: 'society' },
      charm: { id: 'charm' },
    },
  }
}

import { careerMapper, mapCareerSkills } from '../../module/importer/items/career-ogg-dude.mjs'
import { getCareerImportStats, resetCareerImportStats } from '../../module/importer/utils/career-import-utils.mjs'

describe('mapCareerSkills util', () => {
  it('retourne un tableau vide si aucun code', () => {
    expect(mapCareerSkills([])).toEqual([])
  })
  it('mappe et déduplique les codes', () => {
    const result = mapCareerSkills(['ATHL', 'ATHL', 'PERC'])
    expect(result).toEqual([{ id: 'athletics' }, { id: 'perception' }])
  })
  it('tronque à 8 entrées', () => {
    const many = ['ATHL', 'PERC', 'DECEP', 'SCI', 'STEALTH', 'WILD', 'ARCANA', 'DIPL', 'INTIM', 'PERFO']
    const result = mapCareerSkills(many)
    expect(result.length).toBe(8)
  })
})

describe('careerMapper', () => {
  it('mappe une carrière basique', () => {
    const input = [
      {
        Name: 'Soldier',
        Key: 'soldier',
        Description: 'Description soldier',
        CareerSkills: { CareerSkill: [{ Key: 'ATHL' }, { Key: 'PERC' }, { Key: 'DECEP' }] },
        FreeRanks: '3',
      },
    ]
    resetCareerImportStats()
    const [mapped] = careerMapper(input)
    expect(mapped.name).toBe('Soldier')
    expect(mapped.type).toBe('career')
    expect(mapped.system.freeSkillRank).toBe(3)
    expect(mapped.system.careerSkills).toEqual([{ id: 'athletics' }, { id: 'perception' }, { id: 'deception' }])
    expect(mapped.system.description).toBe('Description soldier')
    const stats = getCareerImportStats()
    expect(stats.total).toBe(1)
    expect(stats.imported).toBe(1)
    expect(stats.rejected).toBe(0)
  })
  it('applique la valeur par défaut freeSkillRank = 4 si invalide', () => {
    const input = [{ Name: 'Scientist', Key: 'scientist', Description: 'Desc', CareerSkills: ['SCI'], FreeRanks: 'invalid' }]
    const [mapped] = careerMapper(input)
    expect(mapped.system.freeSkillRank).toBe(4)
  })
  it('clamp freeSkillRank à 8 si > 8', () => {
    const input = [{ Name: 'General', Key: 'general', Description: 'Desc', CareerSkills: ['ATHL'], FreeRanks: '12' }]
    const [mapped] = careerMapper(input)
    expect(mapped.system.freeSkillRank).toBe(8)
  })
  it('exclut compétences inconnues', () => {
    const input = [{ Name: 'Spy', Key: 'spy', Description: 'Desc', CareerSkills: { CareerSkill: [{ Key: 'UNKNOWN' }, { Key: 'ATHL' }] }, FreeRanks: '2' }]
    const [mapped] = careerMapper(input)
    expect(mapped.system.careerSkills).toEqual([{ id: 'athletics' }])
  })
})
