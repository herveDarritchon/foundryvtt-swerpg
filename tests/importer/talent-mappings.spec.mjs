/**
 * Tests pour les mappings de talents OggDude
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resolveTalentActivation } from '../../module/importer/mappings/oggdude-talent-activation-map.mjs'
import { transformTalentPrerequisites, validateTalentPrerequisites } from '../../module/importer/mappings/oggdude-talent-prerequisite-map.mjs'
import { transformTalentRank, extractTalentTier, extractIsRanked } from '../../module/importer/mappings/oggdude-talent-rank-map.mjs'
import { transformTalentActions, createDefaultTalentAction, validateTalentActions } from '../../module/importer/mappings/oggdude-talent-actions-map.mjs'

// Mock des dépendances
import { vi } from 'vitest'

vi.mock('../../module/config/system.mjs', () => ({
  SYSTEM: {
    TALENT_ACTIVATION: {
      passive: 'passive',
      incidental: 'incidental',
      maneuver: 'maneuver',
      action: 'action',
      reaction: 'reaction',
    },
  },
}))

describe('Talent Mappings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('resolveTalentActivation', () => {
    it('devrait résoudre les activations connues', () => {
      expect(resolveTalentActivation('Passive')).toBe('passive')
      expect(resolveTalentActivation('Action')).toBe('action')
      expect(resolveTalentActivation('Incidental')).toBe('incidental')
      expect(resolveTalentActivation('Maneuver')).toBe('maneuver')
      expect(resolveTalentActivation('Reaction')).toBe('reaction')
    })

    it('devrait être insensible à la casse', () => {
      expect(resolveTalentActivation('passive')).toBe('passive')
      expect(resolveTalentActivation('PASSIVE')).toBe('passive')
      expect(resolveTalentActivation('PaSSiVe')).toBe('passive')
    })

    it('devrait retourner passive pour les activations inconnues', () => {
      expect(resolveTalentActivation('Unknown')).toBe('passive')
      expect(resolveTalentActivation('Custom')).toBe('passive')
      expect(resolveTalentActivation('')).toBe('passive')
      expect(resolveTalentActivation(null)).toBe('passive')
      expect(resolveTalentActivation(undefined)).toBe('passive')
    })
  })

  describe('transformTalentPrerequisites', () => {
    it('devrait transformer des prérequis vides', () => {
      expect(transformTalentPrerequisites(null)).toEqual({})
      expect(transformTalentPrerequisites(undefined)).toEqual({})
      expect(transformTalentPrerequisites({})).toEqual({})
    })

    it('devrait transformer des prérequis de caractéristiques', () => {
      const oggDudePrereqs = {
        CharacteristicRequirements: {
          CharacteristicRequirement: {
            CharacteristicKey: 'Brawn',
            MinValue: '3',
          },
        },
      }

      const result = transformTalentPrerequisites(oggDudePrereqs)
      expect(result.characteristics).toBeDefined()
      expect(result.characteristics.brawn).toBe(3)
    })

    it('devrait transformer des prérequis de compétences', () => {
      const oggDudePrereqs = {
        SkillRequirements: {
          SkillRequirement: {
            SkillKey: 'Lightsaber',
            MinValue: '2',
          },
        },
      }

      const result = transformTalentPrerequisites(oggDudePrereqs)
      expect(result.skills).toBeDefined()
      expect(result.skills.lightsaber).toBe(2)
    })

    it('devrait valider les prérequis transformés', () => {
      const validPrereqs = { characteristics: { brawn: 3 }, skills: { lightsaber: 2 } }
      expect(validateTalentPrerequisites(validPrereqs)).toBe(true)

      const invalidPrereqs = { characteristics: { brawn: 'invalid' } }
      expect(validateTalentPrerequisites(invalidPrereqs)).toBe(false)
    })
  })

  describe('transformTalentRank', () => {
    it('devrait transformer des données de rang simples', () => {
      const talentData = { Tier: '2', Cost: '10' }
      const result = transformTalentRank(talentData)

      expect(result.idx).toBe(1)
      expect(result.cost).toBe(10)
    })

    it('devrait utiliser des valeurs par défaut', () => {
      const result = transformTalentRank({})

      expect(result.idx).toBe(1)
      expect(result.cost).toBe(5)
    })

    it('devrait extraire correctement le tier', () => {
      expect(extractTalentTier({ Tier: '1' })).toBe(1)
      expect(extractTalentTier({ Tier: '5' })).toBe(5)
      expect(extractTalentTier({})).toBe(1)
      expect(extractTalentTier({ Tier: 'invalid' })).toBe(1)
    })

    it('devrait détecter si un talent est classé', () => {
      expect(extractIsRanked({ IsRanked: 'true' })).toBe(true)
      expect(extractIsRanked({ IsRanked: 'false' })).toBe(false)
      expect(extractIsRanked({ Ranked: 'yes' })).toBe(true)
      expect(extractIsRanked({})).toBe(false)
    })

    it('devrait gérer les variantes de Ranked', () => {
      // Test avec <Ranked>true</Ranked>
      expect(extractIsRanked({ Ranked: true })).toBe(true)
      expect(extractIsRanked({ Ranked: 'true' })).toBe(true)
      expect(extractIsRanked({ Ranked: 'TRUE' })).toBe(true)

      // Test avec <Ranked>false</Ranked>
      expect(extractIsRanked({ Ranked: false })).toBe(false)
      expect(extractIsRanked({ Ranked: 'false' })).toBe(false)
      expect(extractIsRanked({ Ranked: 'FALSE' })).toBe(false)

      // Test avec <IsRanked>
      expect(extractIsRanked({ IsRanked: true })).toBe(true)
      expect(extractIsRanked({ IsRanked: 'true' })).toBe(true)
    })
  })

  describe('Talent avec Ranked=true et Activation=Passive', () => {
    it('devrait créer un talent avec isRanked=true et activation=passive', () => {
      const talentData = {
        Ranked: 'true',
        Activation: 'Passive',
        Tier: '2',
      }

      const isRanked = extractIsRanked(talentData)
      const activation = resolveTalentActivation(talentData.Activation)
      const rank = transformTalentRank(talentData)

      expect(isRanked).toBe(true)
      expect(activation).toBe('passive')
      expect(rank.idx).toBe(1) // Tier 2 -> idx 1
    })
  })

  describe('transformTalentActions', () => {
    it('devrait retourner un tableau vide pour les actions nulles', () => {
      expect(transformTalentActions(null)).toEqual([])
      expect(transformTalentActions(undefined)).toEqual([])
      expect(transformTalentActions([])).toEqual([])
    })

    it('devrait créer une action par défaut', () => {
      const context = { name: 'Test Talent', description: 'Test description' }
      const action = createDefaultTalentAction(context)

      expect(action).toBeDefined()
      expect(action.name).toBe('Test Talent')
      expect(action.activation.type).toBe('passive')
    })

    it('devrait valider les actions', () => {
      const validAction = createDefaultTalentAction({ name: 'Test' })
      expect(validateTalentActions([validAction])).toBe(true)

      expect(validateTalentActions(null)).toBe(false)
      expect(validateTalentActions('not an array')).toBe(false)
      expect(validateTalentActions([{ name: null }])).toBe(false)
    })
  })
})
