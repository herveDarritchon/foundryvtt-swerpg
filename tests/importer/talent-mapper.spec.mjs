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
  buildTalentImportDiagnostics: (warnings = [], unresolved = false) => ({
    status: unresolved || warnings.length > 0 ? 'incomplete' : 'valid',
    warnings,
    unresolved,
  }),
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
    it('devrait produire une définition générique sans coût XP ni nœud', () => {
      const context = {
        key: 'force_sensitive',
        name: 'Force Sensitive',
        description: 'Force sensitive talent',
        sourceText: 'Source: Core Rulebook p.100',
        dieModifiers: [],
        source: 'Test Source',
        activation: 'passive',
        node: null,
        isRanked: false,
        rank: { idx: 1, cost: 5 },
        tier: 1,
        prerequisites: {},
        custom: false,
      }

      const result = OggDudeTalentMapper.transform(context)

      expect(result.name).toBe('Force Sensitive')
      expect(result.type).toBe('talent')
      expect(result.system.activation).toBe('passive')
      expect(result.system.isRanked).toBe(false)
      expect(result.system.description).toContain('Force sensitive talent')
      expect(result.system.id).toBe('force_sensitive')
      expect(result.flags.swerpg.oggdudeKey).toBe('force_sensitive')
      expect(result.flags.swerpg.import).toBeDefined()
      expect(result.flags.swerpg.import.source).toBe('Test Source')
      expect(result.flags.swerpg.import.sourceText).toBe('Source: Core Rulebook p.100')
      expect(result.flags.swerpg.import.status).toBe('valid')
      expect(result.flags.swerpg.import.warnings).toEqual([])
      expect(result.flags.swerpg.import.raw).toEqual({
        key: 'force_sensitive',
        activation: undefined,
        source: undefined,
      })

      // Vérifier l'absence de champs legacy
      expect(result.system.rank).toBeUndefined()
      expect(result.system.importMeta).toBeUndefined()
      expect(result.system.node).toBeUndefined()
      expect(result.system.actions).toBeUndefined()
      expect(result.system.trees).toBeUndefined()
      expect(result.system.row).toBeUndefined()
    })

    it('devrait stocker dieModifiers dans flags.swerpg.import et enrichir la description', () => {
      const context = {
        key: 'secret_lore',
        name: 'Secret Lore',
        description: 'Please see page 33 of the Unlimited Power Sourcebook for details.',
        sourceText: 'Source: Unlimited Power p.33',
        dieModifiers: [
          {
            skillKey: 'LORE',
            setbackCount: 1,
          },
        ],
        source: 'OggDude Import',
        activation: 'passive',
        node: null,
        isRanked: true,
        rank: { idx: 1, cost: 5 },
        tier: 1,
        prerequisites: {},
        custom: false,
      }

      const result = OggDudeTalentMapper.transform(context)

      expect(result.flags.swerpg.oggdudeKey).toBe('secret_lore')
      expect(result.flags.swerpg.import.dieModifiers).toHaveLength(1)
      expect(result.flags.swerpg.import.dieModifiers[0].skillKey).toBe('LORE')
      expect(result.flags.swerpg.import.dieModifiers[0].setbackCount).toBe(1)
      expect(result.flags.swerpg.import.status).toBe('valid')

      expect(result.system.isRanked).toBe(true)

      expect(result.system.description).toContain('Please see page 33')
      expect(result.system.description).toContain('Source: Unlimited Power p.33')
      expect(result.system.description).toContain('Die Modifiers:')
      expect(result.system.description).toContain('Skill LORE')
    })

    it('devrait gérer les talents sans DieModifiers', () => {
      const context = {
        key: 'simple_talent',
        name: 'Simple Talent',
        description: 'A simple talent',
        sourceText: 'Source: Core Rulebook p.50',
        dieModifiers: [],
        source: 'OggDude Import',
        activation: 'active',
        node: null,
        isRanked: false,
        rank: { idx: 1, cost: 5 },
        tier: 1,
        prerequisites: {},
        custom: false,
      }

      const result = OggDudeTalentMapper.transform(context)

      expect(result.flags.swerpg.import.dieModifiers).toEqual([])
      expect(result.system.description).toContain('A simple talent')
      expect(result.system.description).toContain('Source: Core Rulebook p.50')
      expect(result.system.description).not.toContain('Die Modifiers:')
    })

    it('devrait utiliser unspecified comme activation par défaut', () => {
      const context = {
        key: 'test_talent',
        name: 'Test Talent',
        description: 'Test description',
        dieModifiers: [],
        source: 'Test',
        activation: undefined,
        isRanked: false,
        tier: 1,
        prerequisites: {},
      }

      const result = OggDudeTalentMapper.transform(context)
      expect(result.system.activation).toBe('unspecified')
      expect(result.flags.swerpg.import.status).toBe('valid')
      expect(result.flags.swerpg.import.warnings).toEqual([])
    })

    it('devrait exposer un warning quand l activation source est inconnue', () => {
      const context = {
        key: 'odd_talent',
        name: 'Odd Talent',
        description: 'Test description',
        dieModifiers: [],
        source: 'Test',
        activation: 'unspecified',
        hasUnknownActivation: true,
        isRanked: false,
        tier: 1,
        prerequisites: {},
        originalData: {
          Activation: 'WeirdAction',
          Source: 'Edge of the Empire',
        },
      }

      const result = OggDudeTalentMapper.transform(context)

      expect(result.flags.swerpg.import.status).toBe('incomplete')
      expect(result.flags.swerpg.import.warnings).toEqual(['unknown-activation'])
      expect(result.flags.swerpg.import.raw).toEqual({
        key: 'odd_talent',
        activation: 'WeirdAction',
        source: 'Edge of the Empire',
      })
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
