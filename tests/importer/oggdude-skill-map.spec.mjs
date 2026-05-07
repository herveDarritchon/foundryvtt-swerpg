import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mapOggDudeSkillCode, mapOggDudeSkillCodes, OGG_DUDE_SKILL_MAP } from '../../module/importer/mappings/oggdude-skill-map.mjs'
import { mapSpecializationSkills } from '../../module/importer/items/specialization-ogg-dude.mjs'
import { SYSTEM } from '../../module/config/system.mjs'
import { CHARACTERISTICS } from '../../module/config/attributes.mjs'

describe('OggDude Skill Mapping', () => {
  describe('TEST-002: Validation mappings spécifiques', () => {
    it('devrait mapper correctement les codes critiques', () => {
      // General Skills
      expect(mapOggDudeSkillCode('COOL')).toBe('cool')
      expect(mapOggDudeSkillCode('COORD')).toBe('coordination')
      expect(mapOggDudeSkillCode('DISC')).toBe('discipline')
      expect(mapOggDudeSkillCode('LEAD')).toBe('leadership')
      expect(mapOggDudeSkillCode('NEG')).toBe('negotiation')
      expect(mapOggDudeSkillCode('COERC')).toBe('coercion')
      expect(mapOggDudeSkillCode('VIGIL')).toBe('vigilance')
      expect(mapOggDudeSkillCode('RESIL')).toBe('resilience')
      expect(mapOggDudeSkillCode('SW')).toBe('streetwise')
      expect(mapOggDudeSkillCode('SURV')).toBe('survival')

      // Pilotage et mécanique
      expect(mapOggDudeSkillCode('ASTRO')).toBe('astrogation')
      expect(mapOggDudeSkillCode('PILOTPL')).toBe('pilotingplanetary')
      expect(mapOggDudeSkillCode('PILOTSP')).toBe('pilotingspace')
      expect(mapOggDudeSkillCode('MECH')).toBe('mechanics')
      expect(mapOggDudeSkillCode('MED')).toBe('medicine')

      // Combat Skills
      expect(mapOggDudeSkillCode('BRAWL')).toBe('brawl')
      expect(mapOggDudeSkillCode('MELEE')).toBe('melee')
      expect(mapOggDudeSkillCode('RANGLT')).toBe('rangedlight')
      expect(mapOggDudeSkillCode('RANGHVY')).toBe('rangedheavy')
      expect(mapOggDudeSkillCode('GUNN')).toBe('gunnery')

      // Knowledge Skills
      expect(mapOggDudeSkillCode('LORE')).toBe('lore')
      expect(mapOggDudeSkillCode('OUT')).toBe('outerrim')
      expect(mapOggDudeSkillCode('XEN')).toBe('xenology')
      expect(mapOggDudeSkillCode('EDU')).toBe('education')
    })

    it('devrait corriger le mapping CORE vers coreworlds', () => {
      expect(mapOggDudeSkillCode('CORE')).toBe('coreworlds')
      expect(mapOggDudeSkillCode('CORE')).not.toBe('coordination')
    })

    it('devrait mapper les codes existants sans régression', () => {
      expect(mapOggDudeSkillCode('ATHL')).toBe('athletics')
      expect(mapOggDudeSkillCode('PERC')).toBe('perception')
      expect(mapOggDudeSkillCode('DECEP')).toBe('deception')
      expect(mapOggDudeSkillCode('CHARM')).toBe('charm')
      expect(mapOggDudeSkillCode('STEA')).toBe('stealth')
      expect(mapOggDudeSkillCode('STEAL')).toBe('stealth')
      expect(mapOggDudeSkillCode('COMP')).toBe('computers')
      expect(mapOggDudeSkillCode('SKUL')).toBe('skulduggery')
    })
  })

  describe('TEST-005: Codes non mappables', () => {
    let consoleWarnSpy

    beforeEach(() => {
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    it('devrait mapper LTSABER vers lightsaber sans warning', () => {
      const result = mapOggDudeSkillCode('LTSABER')
      expect(result).toBe('lightsaber')
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('devrait mapper WARF vers warfare sans warning', () => {
      const result = mapOggDudeSkillCode('WARF')
      expect(result).toBe('warfare')
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('devrait mapper UND vers underworld sans warning', () => {
      const result = mapOggDudeSkillCode('UND')
      expect(result).toBe('underworld')
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('devrait retourner null pour codes inconnus sans warning si warnOnUnknown=false', () => {
      const result1 = mapOggDudeSkillCode('UNKNOWN_CODE_XYZ', { warnOnUnknown: false })
      expect(result1).toBeNull()
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('devrait retourner null pour code complètement inconnu', () => {
      const result = mapOggDudeSkillCode('UNKNOWN_CODE_XYZ')
      expect(result).toBeNull()
      expect(consoleWarnSpy).toHaveBeenCalled()
    })
  })

  describe('TEST-006: Synonymes', () => {
    it('devrait mapper tous les synonymes vers la même compétence', () => {
      // Astrogation
      expect(mapOggDudeSkillCode('ASTRO')).toBe('astrogation')
      expect(mapOggDudeSkillCode('ASTROGATION')).toBe('astrogation')

      // Coordination
      expect(mapOggDudeSkillCode('COORD')).toBe('coordination')
      expect(mapOggDudeSkillCode('COORDINATION')).toBe('coordination')

      // Athletics
      expect(mapOggDudeSkillCode('ATHL')).toBe('athletics')
      expect(mapOggDudeSkillCode('ATHLETICS')).toBe('athletics')

      // Stealth
      expect(mapOggDudeSkillCode('STEA')).toBe('stealth')
      expect(mapOggDudeSkillCode('STEAL')).toBe('stealth')
      expect(mapOggDudeSkillCode('STEALTH')).toBe('stealth')

      // Computers
      expect(mapOggDudeSkillCode('COMP')).toBe('computers')
      expect(mapOggDudeSkillCode('COMPUTERS')).toBe('computers')

      // Medicine
      expect(mapOggDudeSkillCode('MED')).toBe('medicine')
      expect(mapOggDudeSkillCode('MEDICINE')).toBe('medicine')

      // Gunnery
      expect(mapOggDudeSkillCode('GUNN')).toBe('gunnery')
      expect(mapOggDudeSkillCode('GUNNERY')).toBe('gunnery')

      // Ranged Light
      expect(mapOggDudeSkillCode('RANGLT')).toBe('rangedlight')
      expect(mapOggDudeSkillCode('RANGEDLIGHT')).toBe('rangedlight')

      // Ranged Heavy
      expect(mapOggDudeSkillCode('RANGHVY')).toBe('rangedheavy')
      expect(mapOggDudeSkillCode('RANGEDHEAVY')).toBe('rangedheavy')

      // Core Worlds
      expect(mapOggDudeSkillCode('CORE')).toBe('coreworlds')
      expect(mapOggDudeSkillCode('COREWORLDS')).toBe('coreworlds')

      // Outer Rim
      expect(mapOggDudeSkillCode('OUT')).toBe('outerrim')
      expect(mapOggDudeSkillCode('OUTERRIM')).toBe('outerrim')

      // Xenology
      expect(mapOggDudeSkillCode('XEN')).toBe('xenology')
      expect(mapOggDudeSkillCode('XENOLOGY')).toBe('xenology')

      // Education
      expect(mapOggDudeSkillCode('EDU')).toBe('education')
      expect(mapOggDudeSkillCode('EDUCATION')).toBe('education')
    })
  })

  describe('TEST-007: Case-insensitivity', () => {
    it('devrait mapper les codes indépendamment de la casse', () => {
      expect(mapOggDudeSkillCode('cool')).toBe('cool')
      expect(mapOggDudeSkillCode('COOL')).toBe('cool')
      expect(mapOggDudeSkillCode('Cool')).toBe('cool')

      expect(mapOggDudeSkillCode('coord')).toBe('coordination')
      expect(mapOggDudeSkillCode('COORD')).toBe('coordination')
      expect(mapOggDudeSkillCode('Coord')).toBe('coordination')

      expect(mapOggDudeSkillCode('perc')).toBe('perception')
      expect(mapOggDudeSkillCode('PERC')).toBe('perception')
      expect(mapOggDudeSkillCode('Perc')).toBe('perception')
    })

    it('devrait gérer les espaces en début/fin', () => {
      expect(mapOggDudeSkillCode('  COOL  ')).toBe('cool')
      expect(mapOggDudeSkillCode(' coord ')).toBe('coordination')
      expect(mapOggDudeSkillCode('\tPERC\n')).toBe('perception')
    })
  })

  describe('TEST-001: Validation mappings complets', () => {
    it('tous les codes mappés devraient pointer vers des compétences valides dans SYSTEM.SKILLS', () => {
      const invalidMappings = []

      for (const [code, skillId] of Object.entries(OGG_DUDE_SKILL_MAP)) {
        // Ignorer les compétences legacy qui n'existent pas dans SWERPG SKILLS
        const legacySkills = ['wilderness', 'arcana', 'science', 'society', 'diplomacy', 'intimidation', 'performance']
        if (legacySkills.includes(skillId)) {
          continue
        }

        if (!SYSTEM.SKILLS[skillId]) {
          invalidMappings.push({ code, skillId })
        }
      }

      if (invalidMappings.length > 0) {
        console.error('Mappings invalides trouvés:', invalidMappings)
      }
      expect(invalidMappings).toHaveLength(0)
    })

    it('tous les codes Star Wars Edge couramment utilisés devraient être mappés', () => {
      // Liste des codes identifiés dans les 20 fichiers XML de carrières
      const commonCodes = [
        'ASTRO',
        'ATHL',
        'BRAWL',
        'CHARM',
        'COERC',
        'COMP',
        'COOL',
        'COORD',
        'CORE',
        'DECEP',
        'DISC',
        'EDU',
        'GUNN',
        'LEAD',
        'LORE',
        'MECH',
        'MED',
        'MELEE',
        'NEG',
        'OUT',
        'PERC',
        'PILOTPL',
        'PILOTSP',
        'RANGHVY',
        'RANGLT',
        'RESIL',
        'SKUL',
        'STEA',
        'STEAL',
        'SURV',
        'SW',
        'VIGIL',
        'XEN',
        'WARF',
        'UND',
        'LTSABER',
      ]

      const unmappedCodes = []
      for (const code of commonCodes) {
        const mapped = mapOggDudeSkillCode(code, { warnOnUnknown: false })
        if (!mapped) {
          unmappedCodes.push(code)
        }
      }

      if (unmappedCodes.length > 0) {
        console.error('Codes courants non mappés:', unmappedCodes)
      }
      expect(unmappedCodes).toHaveLength(0)
    })

    it('les codes WARF, UND, LTSABER devraient être mappés vers les bonnes compétences', () => {
      expect(OGG_DUDE_SKILL_MAP.WARF).toBe('warfare')
      expect(OGG_DUDE_SKILL_MAP.UND).toBe('underworld')
      expect(OGG_DUDE_SKILL_MAP.LTSABER).toBe('lightsaber')
    })
  })

  describe('mapOggDudeSkillCodes (array mapping)', () => {
    it('devrait mapper un tableau de codes en filtrant les inconnus', () => {
      const codes = ['COOL', 'COORD', 'UNKNOWN_XYZ', 'PERC', 'LTSABER']
      const result = mapOggDudeSkillCodes(codes)

      expect(result).toContain('cool')
      expect(result).toContain('coordination')
      expect(result).toContain('perception')
      expect(result).not.toContain('unknown_xyz')
      expect(result).not.toContain(null)
    })

    it('devrait dédupliquer les codes qui mappent vers la même compétence', () => {
      const codes = ['STEA', 'STEAL', 'STEALTH']
      const result = mapOggDudeSkillCodes(codes)

      expect(result).toEqual(['stealth'])
    })

    it('devrait retourner un tableau vide pour un tableau vide', () => {
      expect(mapOggDudeSkillCodes([])).toEqual([])
      expect(mapOggDudeSkillCodes()).toEqual([])
    })

    it("devrait préserver l'ordre d'apparition", () => {
      const codes = ['PERC', 'COOL', 'COORD', 'DECEP']
      const result = mapOggDudeSkillCodes(codes)

      expect(result).toEqual(['perception', 'cool', 'coordination', 'deception'])
    })
  })

  describe('Validation edge cases', () => {
    it('devrait gérer les entrées invalides', () => {
      expect(mapOggDudeSkillCode(null, { warnOnUnknown: false })).toBeNull()
      expect(mapOggDudeSkillCode(undefined, { warnOnUnknown: false })).toBeNull()
      expect(mapOggDudeSkillCode('', { warnOnUnknown: false })).toBeNull()
      expect(mapOggDudeSkillCode(123, { warnOnUnknown: false })).toBeNull()
      expect(mapOggDudeSkillCode({}, { warnOnUnknown: false })).toBeNull()
    })

    it('devrait gérer les codes avec caractères spéciaux', () => {
      expect(mapOggDudeSkillCode('COOL!', { warnOnUnknown: false })).toBeNull()
      expect(mapOggDudeSkillCode('CO-OL', { warnOnUnknown: false })).toBeNull()
      expect(mapOggDudeSkillCode('CO_OL', { warnOnUnknown: false })).toBeNull()
    })
  })

  describe('Additional Skills Validation', () => {
    it('devrait avoir warfare dans SYSTEM.SKILLS avec les bonnes propriétés', () => {
      expect(SYSTEM.SKILLS.warfare).toBeDefined()
      expect(SYSTEM.SKILLS.warfare.id).toBe('warfare')
      expect(SYSTEM.SKILLS.warfare.type.id).toBe('knowledge')
      expect(SYSTEM.SKILLS.warfare.characteristics).toBeDefined()
      expect(SYSTEM.SKILLS.warfare.characteristics).toBe(CHARACTERISTICS.intellect)
    })

    it('devrait avoir lightsaber dans SYSTEM.SKILLS avec les bonnes propriétés', () => {
      expect(SYSTEM.SKILLS.lightsaber).toBeDefined()
      expect(SYSTEM.SKILLS.lightsaber.id).toBe('lightsaber')
      expect(SYSTEM.SKILLS.lightsaber.type.id).toBe('combat')
      expect(SYSTEM.SKILLS.lightsaber.characteristics).toBeDefined()
      expect(SYSTEM.SKILLS.lightsaber.characteristics).toBe(CHARACTERISTICS.brawn)
    })

    it('underworld devrait être présent dans SYSTEM.SKILLS', () => {
      expect(SYSTEM.SKILLS.underworld).toBeDefined()
      expect(SYSTEM.SKILLS.underworld.type.id).toBe('knowledge')
      expect(SYSTEM.SKILLS.underworld.characteristics).toBeDefined()
      expect(SYSTEM.SKILLS.underworld.characteristics).toBe(CHARACTERISTICS.intellect)
    })
  })

  describe('Specialization Import with New Skills', () => {
    it('devrait mapper une spécialisation avec le code WARF', () => {
      const xmlData = [
        {
          Key: 'STRATEGIST',
          Name: 'Strategist',
          CareerSkills: { Key: ['WARF', 'DISC', 'LEAD', 'NEG'] },
        },
      ]
      const result = mapSpecializationSkills(['WARF', 'DISC', 'LEAD', 'NEG'])
      expect(result).toContainEqual({ id: 'warfare' })
      expect(result).toContainEqual({ id: 'discipline' })
      expect(result).toContainEqual({ id: 'leadership' })
      expect(result).toContainEqual({ id: 'negotiation' })
    })

    it('devrait mapper une spécialisation avec les codes UND', () => {
      const result = mapSpecializationSkills(['UND', 'SKUL', 'STEA', 'DECEP'])
      expect(result).toContainEqual({ id: 'underworld' })
      expect(result).toContainEqual({ id: 'skulduggery' })
      expect(result).toContainEqual({ id: 'stealth' })
      expect(result).toContainEqual({ id: 'deception' })
    })

    it('devrait mapper une spécialisation avec le code LTSABER', () => {
      const result = mapSpecializationSkills(['LTSABER', 'MELEE', 'BRAWL'])
      expect(result).toContainEqual({ id: 'lightsaber' })
      expect(result).toContainEqual({ id: 'melee' })
      expect(result).toContainEqual({ id: 'brawl' })
    })

    it('devrait dédupliquer les codes mappant vers la même compétence', () => {
      const result = mapSpecializationSkills(['UND', 'UND', 'WARF'])
      expect(result.filter((item) => item.id === 'underworld')).toHaveLength(1)
      expect(result.filter((item) => item.id === 'warfare')).toHaveLength(1)
    })
  })

  describe('Regression: Affected Specializations', () => {
    const affectedSpecs = [
      { key: 'REPNAVYOFF', name: 'Republic Navy Officer', oggDudeCode: 'WARF', expectedSkill: 'warfare' },
      { key: 'SAPPER', name: 'Sapper', oggDudeCode: 'WARF', expectedSkill: 'warfare' },
      { key: 'SEPARATISTCOMMANDER', name: 'Separatist Commander', oggDudeCode: 'WARF', expectedSkill: 'warfare' },
      { key: 'STRATEGIST', name: 'Strategist', oggDudeCode: 'WARF', expectedSkill: 'warfare' },
      { key: 'RIGGER', name: 'Rigger', oggDudeCode: 'UND', expectedSkill: 'underworld' },
      { key: 'SCHOLAR', name: 'Scholar', oggDudeCode: 'UND', expectedSkill: 'underworld' },
      { key: 'SHADOW', name: 'Shadow', oggDudeCode: 'UND', expectedSkill: 'underworld' },
      { key: 'SKIPTRACER', name: 'Skip Tracer', oggDudeCode: 'UND', expectedSkill: 'underworld' },
      { key: 'SLICER', name: 'Slicer', oggDudeCode: 'UND', expectedSkill: 'underworld' },
      { key: 'TRADER', name: 'Trader', oggDudeCode: 'UND', expectedSkill: 'underworld' },
      { key: 'WARDEN', name: 'Warden', oggDudeCode: 'UND', expectedSkill: 'underworld' },
      { key: 'SENTRY', name: 'Sentry', oggDudeCode: 'LTSABER', expectedSkill: 'lightsaber' },
      { key: 'SHIEN', name: 'Shien Expert', oggDudeCode: 'LTSABER', expectedSkill: 'lightsaber' },
      { key: 'SHIICHO', name: 'Shii-Cho Knight', oggDudeCode: 'LTSABER', expectedSkill: 'lightsaber' },
      { key: 'SORESU', name: 'Soresu Defender', oggDudeCode: 'LTSABER', expectedSkill: 'lightsaber' },
    ]

    affectedSpecs.forEach(({ key, name, oggDudeCode, expectedSkill }) => {
      it(`devrait mapper correctement ${name} (${key}) avec ${expectedSkill}`, () => {
        const result = mapSpecializationSkills([oggDudeCode])
        expect(result).toContainEqual({ id: expectedSkill })
      })
    })

    it('devrait limiter à 8 compétences maximum', () => {
      const manySkills = ['WARF', 'UND', 'LTSABER', 'COOL', 'COORD', 'DISC', 'LEAD', 'NEG', 'PERC', 'VIGIL']
      const result = mapSpecializationSkills(manySkills)
      expect(result).toHaveLength(8)
    })
  })
})
