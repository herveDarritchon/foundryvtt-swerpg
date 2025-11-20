import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mapOggDudeSkillCode, mapOggDudeSkillCodes, OGG_DUDE_SKILL_MAP } from '../../module/importer/mappings/oggdude-skill-map.mjs'
import { SYSTEM } from '../../module/config/system.mjs'

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

    it('devrait retourner null pour LTSABER avec warning', () => {
      const result = mapOggDudeSkillCode('LTSABER')
      expect(result).toBeNull()
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    it('devrait retourner null pour WARF avec warning', () => {
      const result = mapOggDudeSkillCode('WARF')
      expect(result).toBeNull()
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    it('devrait retourner null pour codes inconnus sans warning si warnOnUnknown=false', () => {
      const result1 = mapOggDudeSkillCode('LTSABER', { warnOnUnknown: false })
      const result2 = mapOggDudeSkillCode('WARF', { warnOnUnknown: false })
      expect(result1).toBeNull()
      expect(result2).toBeNull()
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
        'ASTRO', 'ATHL', 'BRAWL', 'CHARM', 'COERC', 'COMP', 'COOL', 'COORD',
        'CORE', 'DECEP', 'DISC', 'EDU', 'GUNN', 'LEAD', 'LORE', 'MECH',
        'MED', 'MELEE', 'NEG', 'OUT', 'PERC', 'PILOTPL', 'PILOTSP',
        'RANGHVY', 'RANGLT', 'RESIL', 'SKUL', 'STEA', 'STEAL', 'SURV',
        'SW', 'VIGIL', 'XEN',
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

    it('les codes non mappables connus devraient être documentés', () => {
      // LTSABER et WARF ne doivent pas être dans la table (compétences absentes de SKILLS)
      expect(OGG_DUDE_SKILL_MAP.LTSABER).toBeUndefined()
      expect(OGG_DUDE_SKILL_MAP.WARF).toBeUndefined()
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

    it('devrait préserver l\'ordre d\'apparition', () => {
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
})
