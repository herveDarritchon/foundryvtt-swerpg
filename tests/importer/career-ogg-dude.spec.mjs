import { describe, it, expect } from 'vitest'
// Minimal SYSTEM mock must precede imports that rely on SYSTEM
if (globalThis.SYSTEM === undefined) {
  globalThis.SYSTEM = {
    SKILLS: {
      // General Skills
      cool: { id: 'cool' },
      discipline: { id: 'discipline' },
      negotiation: { id: 'negotiation' },
      perception: { id: 'perception' },
      vigilance: { id: 'vigilance' },
      astrogation: { id: 'astrogation' },
      athletics: { id: 'athletics' },
      charm: { id: 'charm' },
      coercion: { id: 'coercion' },
      computers: { id: 'computers' },
      coordination: { id: 'coordination' },
      deception: { id: 'deception' },
      leadership: { id: 'leadership' },
      mechanics: { id: 'mechanics' },
      medicine: { id: 'medicine' },
      pilotingplanetary: { id: 'pilotingplanetary' },
      pilotingspace: { id: 'pilotingspace' },
      resilience: { id: 'resilience' },
      skulduggery: { id: 'skulduggery' },
      stealth: { id: 'stealth' },
      streetwise: { id: 'streetwise' },
      survival: { id: 'survival' },
      // Combat Skills
      brawl: { id: 'brawl' },
      melee: { id: 'melee' },
      rangedlight: { id: 'rangedlight' },
      rangedheavy: { id: 'rangedheavy' },
      gunnery: { id: 'gunnery' },
      // Knowledge Skills
      coreworlds: { id: 'coreworlds' },
      lore: { id: 'lore' },
      outerrim: { id: 'outerrim' },
      underworld: { id: 'underworld' },
      xenology: { id: 'xenology' },
      education: { id: 'education' },
      // Legacy skills (for backward compatibility tests)
      awareness: { id: 'awareness' },
      science: { id: 'science' },
      wilderness: { id: 'wilderness' },
      arcana: { id: 'arcana' },
      diplomacy: { id: 'diplomacy' },
      intimidation: { id: 'intimidation' },
      performance: { id: 'performance' },
      society: { id: 'society' },
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
  it('mappe les nouveaux codes Star Wars Edge (COMP, CORE, SKUL, STEAL)', () => {
    const result = mapCareerSkills(['COMP', 'CORE', 'PERC', 'SKUL', 'STEAL'])
    expect(result).toEqual([
      { id: 'computers' },
      { id: 'coreworlds' },
      { id: 'perception' },
      { id: 'skulduggery' },
      { id: 'stealth' },
    ])
  })
  it('mappe les synonymes (STEAL vs STEALTH)', () => {
    const resultSteal = mapCareerSkills(['STEAL'])
    const resultStealth = mapCareerSkills(['STEALTH'])
    expect(resultSteal).toEqual(resultStealth)
    expect(resultSteal).toEqual([{ id: 'stealth' }])
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
    expect(mapped.system.description).toBe('<p>Description soldier</p>')
    expect(mapped.flags.swerpg).toEqual({ oggdudeKey: 'soldier' })
    const stats = getCareerImportStats()
    expect(stats.total).toBe(1)
    expect(stats.imported).toBe(1)
    expect(stats.rejected).toBe(0)
    expect(stats.skillCount).toBe(3)
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
  it('convertit les balises OggDude et enregistre la source en flags', () => {
    const input = [
      {
        Name: 'Ace',
        Key: 'THEACE',
        Description: '[H4]Ace [h4]\n[B]Pilote hors pair[/b]',
        CareerSkills: ['ATHL'],
        Source: { _: 'Age of Rebellion Core Rulebook', $: { Page: '64' } },
      },
    ]
    const [mapped] = careerMapper(input)
    expect(mapped.system.description).toBe('<h4>Ace</h4>\n<p><strong>Pilote hors pair</strong></p>\n<p><strong>Source:</strong> Age of Rebellion Core Rulebook, p.64</p>')
    expect(mapped.flags.swerpg).toEqual({ oggdudeKey: 'THEACE', oggdudeSource: 'Age of Rebellion Core Rulebook', oggdudeSourcePage: 64 })
  })
  it('mappe la carrière Sentinel avec les nouveaux codes (COMP, CORE, SKUL, STEAL)', () => {
    const input = [
      {
        Name: 'Sentinel',
        Key: 'SENTINEL',
        Description: '[H4]Sentinel[h4]\nPlease see page 90 of the Force and Destiny Core Rulebook for details.',
        CareerSkills: { Key: ['COMP', 'CORE', 'DECEP', 'PERC', 'SKUL', 'STEAL'] },
        FreeRanks: '3',
        Source: { _: 'Force and Destiny Core Rulebook', $: { Page: '90' } },
      },
    ]
    resetCareerImportStats()
    const [mapped] = careerMapper(input)
    expect(mapped.name).toBe('Sentinel')
    expect(mapped.system.freeSkillRank).toBe(3)
    expect(mapped.system.careerSkills).toEqual([
      { id: 'computers' },
      { id: 'coreworlds' },
      { id: 'deception' },
      { id: 'perception' },
      { id: 'skulduggery' },
      { id: 'stealth' },
    ])
    expect(mapped.system.careerSkills.length).toBe(6)
  })
  it('mappe la carrière Ace avec les nouveaux codes de combat et pilotage', () => {
    const input = [
      {
        Name: 'Ace',
        Key: 'ACE',
        Description: '[H4]Ace[h4]\nHotshot pilots of the Rebel Alliance.',
        CareerSkills: { Key: ['ASTRO', 'COOL', 'GUNN', 'PILOTPL', 'PILOTSP', 'RANGLT'] },
        FreeRanks: '4',
        Source: { _: 'Age of Rebellion Core Rulebook', $: { Page: '64' } },
      },
    ]
    resetCareerImportStats()
    const [mapped] = careerMapper(input)
    expect(mapped.name).toBe('Ace')
    expect(mapped.system.freeSkillRank).toBe(4)
    expect(mapped.system.careerSkills).toEqual([
      { id: 'astrogation' },
      { id: 'cool' },
      { id: 'gunnery' },
      { id: 'pilotingplanetary' },
      { id: 'pilotingspace' },
      { id: 'rangedlight' },
    ])
    expect(mapped.system.careerSkills.length).toBe(6)
  })
})
