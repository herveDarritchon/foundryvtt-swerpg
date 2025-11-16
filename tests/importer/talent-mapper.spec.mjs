/**
 * Tests pour le mapper principal de talents OggDude
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OggDudeTalentMapper } from '../../module/importer/mappers/oggdude-talent-mapper.mjs'

// Mock des dépendances
vi.mock('../../module/utils/logger.mjs', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../module/importer/utils/talent-import-utils.mjs', () => ({
  incrementTalentImportStat: vi.fn(),
}))

describe('OggDudeTalentMapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('extractTalentsData', () => {
    it('devrait extraire les talents depuis différentes structures', () => {
      // Structure 1: oggDudeData.Talents.Talent
      const data1 = {
        Talents: {
          Talent: [
            { Name: 'Talent1', Key: 'talent1' },
            { Name: 'Talent2', Key: 'talent2' },
          ],
        },
      }

      const result1 = OggDudeTalentMapper.extractTalentsData(data1)
      expect(result1).toHaveLength(2)
      expect(result1[0].Name).toBe('Talent1')

      // Structure 2: oggDudeData.DataSet.Talents.Talent
      const data2 = {
        DataSet: {
          Talents: {
            Talent: { Name: 'SingleTalent', Key: 'single' },
          },
        },
      }

      const result2 = OggDudeTalentMapper.extractTalentsData(data2)
      expect(result2).toHaveLength(1)
      expect(result2[0].Name).toBe('SingleTalent')

      // Données vides
      expect(OggDudeTalentMapper.extractTalentsData({})).toEqual([])
      expect(OggDudeTalentMapper.extractTalentsData(null)).toEqual([])
    })
  })

  describe('generateTalentKey', () => {
    it('devrait générer une clé depuis différentes sources', () => {
      expect(OggDudeTalentMapper.generateTalentKey({ Key: 'explicit_key' })).toBe('explicit_key')
      expect(OggDudeTalentMapper.generateTalentKey({ TalentKey: 'talent_key' })).toBe('talent_key')
      expect(OggDudeTalentMapper.generateTalentKey({ Name: 'Talent Name' })).toBe('talent_name')
    })

    it('devrait nettoyer les noms pour créer des clés valides', () => {
      expect(OggDudeTalentMapper.sanitizeKey('Force & Destiny')).toBe('force_destiny')
      expect(OggDudeTalentMapper.sanitizeKey('Multi-Word Talent!')).toBe('multi_word_talent')
      expect(OggDudeTalentMapper.sanitizeKey('123ABC')).toBe('123abc')
    })

    it('devrait générer une clé fallback pour les données invalides', () => {
      const key = OggDudeTalentMapper.generateTalentKey({})
      expect(key).toMatch(/^talent_\d+_[a-z0-9]{5}$/)
    })
  })

  describe('extractDescription', () => {
    it('devrait extraire la description depuis différentes sources', () => {
      expect(OggDudeTalentMapper.extractDescription({ Description: 'Main desc' })).toBe('Main desc')
      expect(OggDudeTalentMapper.extractDescription({ Text: 'Text desc' })).toBe('Text desc')
      expect(OggDudeTalentMapper.extractDescription({ Summary: 'Summary desc' })).toBe('Summary desc')
      expect(OggDudeTalentMapper.extractDescription({})).toBe('')
    })

    it('devrait nettoyer et limiter la description', () => {
      const longText = 'a'.repeat(2500)
      const cleaned = OggDudeTalentMapper.extractDescription({ Description: longText })
      expect(cleaned.length).toBe(2000)

      const spacedText = '  Multiple   spaces  \n\n  text  '
      const result = OggDudeTalentMapper.extractDescription({ Description: spacedText })
      expect(result).toBe('Multiple spaces text')
    })
  })

  describe('validateTalentContext', () => {
    it('devrait valider un contexte correct', () => {
      const validContext = {
        key: 'talent_key',
        name: 'Talent Name',
        prerequisites: {},
        actions: [],
      }

      expect(OggDudeTalentMapper.validateTalentContext(validContext)).toBe(true)
    })

    it('devrait rejeter un contexte invalide', () => {
      expect(OggDudeTalentMapper.validateTalentContext({ key: '', name: 'Test' })).toBe(false)
      expect(OggDudeTalentMapper.validateTalentContext({ key: 'test', name: '' })).toBe(false)
      expect(OggDudeTalentMapper.validateTalentContext({ key: null, name: 'Test' })).toBe(false)
      expect(OggDudeTalentMapper.validateTalentContext({ key: 'test', name: null })).toBe(false)
    })
  })

  describe('transform', () => {
    it('devrait transformer un contexte en données SwerpgTalent', () => {
      const context = {
        key: 'force_sensitive',
        name: 'Force Sensitive',
        description: 'Force sensitive talent',
        source: 'Test Source',
        activation: 'passive',
        node: null,
        isRanked: false,
        rank: { idx: 1, cost: 5 },
        tier: 1,
        prerequisites: {},
        actions: [],
        custom: false,
      }

      const result = OggDudeTalentMapper.transform(context)

      expect(result.name).toBe('Force Sensitive')
      expect(result.type).toBe('talent')
      expect(result.system.activation).toBe('passive')
      expect(result.system.isRanked).toBe(false)
      expect(result.system.rank.cost).toBe(5)
      expect(result.system.importMeta.originalKey).toBe('force_sensitive')
    })

    it('devrait créer une action par défaut si aucune action fournie', () => {
      const context = {
        key: 'test_talent',
        name: 'Test Talent',
        description: 'Test description',
        source: 'Test',
        activation: 'passive',
        node: null,
        isRanked: false,
        rank: { idx: 1, cost: 5 },
        tier: 1,
        prerequisites: {},
        actions: null,
        custom: false,
      }

      const result = OggDudeTalentMapper.transform(context)
      expect(result.system.actions).toHaveLength(1)
    })
  })

  describe('buildContextMap', () => {
    it('devrait construire une map vide pour des données vides', () => {
      const result = OggDudeTalentMapper.buildContextMap({})
      expect(result.size).toBe(0)
    })

    it('devrait construire une map pour des données valides', () => {
      const oggDudeData = {
        Talents: {
          Talent: [
            {
              Name: 'Force Sensitive',
              Key: 'force_sensitive',
              Description: 'You are sensitive to the Force',
              Activation: 'Passive',
              Tier: '1',
            },
            {
              Name: 'Lightsaber Training',
              Key: 'lightsaber_training',
              Description: 'Training with lightsabers',
              Activation: 'Action',
              Tier: '2',
            },
          ],
        },
      }

      const result = OggDudeTalentMapper.buildContextMap(oggDudeData)
      expect(result.size).toBe(2)
      expect(result.has('force_sensitive')).toBe(true)
      expect(result.has('lightsaber_training')).toBe(true)

      const context = result.get('force_sensitive')
      expect(context.name).toBe('Force Sensitive')
      expect(context.activation).toBe('passive')
    })
  })
})
