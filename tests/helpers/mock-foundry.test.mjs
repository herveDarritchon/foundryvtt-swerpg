import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { setupFoundryMock, teardownFoundryMock, extendFoundryMock, setCombatMock, addPacksMock } from './mock-foundry.mjs'

describe('Mock Foundry Helpers', () => {
  let originalGlobals

  beforeEach(() => {
    // Preserve any existing globals
    originalGlobals = {
      foundry: globalThis.foundry,
      game: globalThis.game,
      ui: globalThis.ui,
    }
  })

  afterEach(() => {
    // Clean up and restore original globals
    teardownFoundryMock()

    if (originalGlobals.foundry === undefined) {
      delete globalThis.foundry
    } else {
      globalThis.foundry = originalGlobals.foundry
    }

    if (originalGlobals.game === undefined) {
      delete globalThis.game
    } else {
      globalThis.game = originalGlobals.game
    }

    if (originalGlobals.ui === undefined) {
      delete globalThis.ui
    } else {
      globalThis.ui = originalGlobals.ui
    }

    // Clean up additional mock globals
    delete globalThis.Color
    delete globalThis.Roll
    delete globalThis.Item
    delete globalThis.DialogV2
    delete globalThis.$
  })

  describe('setupFoundryMock', () => {
    test('should setup basic Foundry globals', () => {
      setupFoundryMock()

      expect(globalThis.foundry).toBeDefined()
      expect(globalThis.game).toBeDefined()
      expect(globalThis.ui).toBeDefined()
    })

    test('should setup foundry.utils with essential methods', () => {
      setupFoundryMock()

      expect(globalThis.foundry.utils).toBeDefined()
      expect(globalThis.foundry.utils.deepClone).toBeTypeOf('function')
      expect(globalThis.foundry.utils.getProperty).toBeTypeOf('function')
      expect(globalThis.foundry.utils.mergeObject).toBeTypeOf('function')
    })

    test('should setup foundry.applications with Handlebars mixin', () => {
      setupFoundryMock()

      expect(globalThis.foundry.applications.api.HandlebarsApplicationMixin).toBeTypeOf('function')

      // Test that mixin returns the base class
      const BaseClass = class {}
      const MixedClass = globalThis.foundry.applications.api.HandlebarsApplicationMixin(BaseClass)
      expect(MixedClass).toBe(BaseClass)
    })

    test('should setup game object with i18n', () => {
      setupFoundryMock()

      expect(globalThis.game.i18n.localize).toBeTypeOf('function')
      expect(globalThis.game.system).toBeDefined()
      expect(globalThis.game.packs).toBeInstanceOf(Map)
    })

    test('should setup ui.notifications', () => {
      setupFoundryMock()

      expect(globalThis.ui.notifications.error).toBeTypeOf('function')
      expect(globalThis.ui.notifications.warn).toBeTypeOf('function')
      expect(globalThis.ui.notifications.info).toBeTypeOf('function')
    })

    test('should use default translations', () => {
      setupFoundryMock()

      const result = globalThis.game.i18n.localize('SWERPG.ERRORS.InvalidEvent')
      expect(result).toBe('Invalid event: Unable to process the UI interaction.')
    })

    test('should merge custom translations', () => {
      const customTranslations = {
        'CUSTOM.KEY': 'Custom Value',
        'SWERPG.ERRORS.InvalidEvent': 'Override Message',
      }

      setupFoundryMock({ translations: customTranslations })

      expect(globalThis.game.i18n.localize('CUSTOM.KEY')).toBe('Custom Value')
      expect(globalThis.game.i18n.localize('SWERPG.ERRORS.InvalidEvent')).toBe('Override Message')
    })

    test('should return unknown key for missing translations', () => {
      setupFoundryMock()

      const result = globalThis.game.i18n.localize('UNKNOWN.KEY')
      expect(result).toBe('UNKNOWN.KEY')
    })

    test('should apply foundry patches', () => {
      const patch = {
        custom: {
          feature: 'test-value',
        },
      }

      setupFoundryMock({ foundryPatch: patch })

      expect(globalThis.foundry.custom.feature).toBe('test-value')
    })

    test('should setup ActorSheetV2 mock', () => {
      setupFoundryMock()

      const MockSheet = globalThis.foundry.applications.sheets.ActorSheetV2
      const sheet = new MockSheet({ test: 'option' })

      expect(sheet.options.test).toBe('option')
      expect(() => sheet.render()).not.toThrow()
    })
  })

  describe('teardownFoundryMock', () => {
    test('should restore previous globals', () => {
      const previousFoundry = globalThis.foundry

      setupFoundryMock()
      expect(globalThis.foundry).not.toBe(previousFoundry)

      teardownFoundryMock()
      expect(globalThis.foundry).toBe(previousFoundry)
    })

    test('should clear all mocks', () => {
      setupFoundryMock()
      const mockFn = vi.fn()
      globalThis.game.i18n.localize = mockFn

      teardownFoundryMock()

      expect(vi.isMockFunction(mockFn)).toBe(true)
      // vi.clearAllMocks should have been called
    })
  })

  describe('extendFoundryMock', () => {
    beforeEach(() => {
      setupFoundryMock()
    })

    test('should extend existing foundry mock', () => {
      const extension = {
        custom: {
          newFeature: 'extended',
        },
      }

      extendFoundryMock(extension)

      expect(globalThis.foundry.custom.newFeature).toBe('extended')
    })

    test('should merge deeply with existing properties', () => {
      globalThis.foundry.existing = { prop: 'original' }

      const extension = {
        existing: {
          newProp: 'added',
        },
      }

      extendFoundryMock(extension)

      expect(globalThis.foundry.existing.prop).toBe('original')
      expect(globalThis.foundry.existing.newProp).toBe('added')
    })
  })

  describe('setCombatMock', () => {
    beforeEach(() => {
      setupFoundryMock()
    })

    test('should setup combat mock', () => {
      setCombatMock()

      expect(globalThis.game.combat).toBeDefined()
      expect(globalThis.game.combats).toBeInstanceOf(Map)
    })

    test('should setup combat with combatants collection', () => {
      setCombatMock()

      expect(globalThis.game.combat.combatants).toBeDefined()
      expect(globalThis.game.combat.combatants.contents).toBeInstanceOf(Array)
    })

    test('should support current combatant', () => {
      setCombatMock()

      expect(globalThis.game.combat.combatant).toBeNull()

      // Test setting current combatant
      const mockCombatant = { id: 'test-combatant' }
      globalThis.game.combat.combatant = mockCombatant
      expect(globalThis.game.combat.combatant).toBe(mockCombatant)
    })
  })

  describe('addPacksMock', () => {
    beforeEach(() => {
      setupFoundryMock()
    })

    test('should add packs to game.packs', () => {
      const packDefinitions = {
        'swerpg.talents': {
          name: 'Talents',
          type: 'Item',
        },
        'swerpg.skills': {
          name: 'Skills',
          type: 'Item',
        },
      }

      addPacksMock(packDefinitions)

      expect(globalThis.game.packs.get('swerpg.talents')).toBeDefined()
      expect(globalThis.game.packs.get('swerpg.skills')).toBeDefined()
    })

    test('should create pack with correct structure', () => {
      const packDefinitions = {
        'swerpg.test': {
          name: 'Test Pack',
          type: 'Actor',
        },
      }

      addPacksMock(packDefinitions)

      const pack = globalThis.game.packs.get('swerpg.test')
      expect(pack.metadata.name).toBe('Test Pack')
      expect(pack.metadata.type).toBe('Actor')
      expect(pack.contents).toBeInstanceOf(Array)
      expect(typeof pack.getDocument).toBe('function')
    })

    test('should return undefined for non-existent document', async () => {
      const packDefinitions = {
        'swerpg.test': { name: 'Test', type: 'Item' },
      }

      addPacksMock(packDefinitions)

      const pack = globalThis.game.packs.get('swerpg.test')
      const result = await pack.getDocument('non-existent')

      expect(result).toBeUndefined()
    })

    test('should set documentName default to Item', () => {
      const packDefinitions = {
        'swerpg.test': { name: 'Test' },
      }

      addPacksMock(packDefinitions)

      const pack = globalThis.game.packs.get('swerpg.test')
      expect(pack.documentName).toBe('Item')
    })

    test('should set collection default to pack id', () => {
      const packDefinitions = {
        'swerpg.test': { name: 'Test' },
      }

      addPacksMock(packDefinitions)

      const pack = globalThis.game.packs.get('swerpg.test')
      expect(pack.collection).toBe('swerpg.test')
    })

    test('should keep index as a Map with proper entries', () => {
      const packDefinitions = {
        'swerpg.talents': {
          name: 'Talents',
          type: 'Item',
          documentName: 'Item',
          collection: 'swerpg.talents',
          documents: [
            { id: 'talent-grit', name: 'Grit', type: 'talent', system: { id: 'grit', isRanked: true } },
          ],
        },
      }

      addPacksMock(packDefinitions)

      const pack = globalThis.game.packs.get('swerpg.talents')
      expect(pack.index).toBeInstanceOf(Map)
      expect(pack.index.size).toBe(1)
      expect(pack.index.has('talent-grit')).toBe(true)

      const entry = pack.index.get('talent-grit')
      expect(entry._id).toBe('talent-grit')
      expect(entry.name).toBe('Grit')
      expect(entry.type).toBe('talent')
      expect(entry.system.id).toBe('grit')
      expect(entry.system.isRanked).toBe(true)
    })

    test('should carry flags in index entries when provided', () => {
      const packDefinitions = {
        'swerpg.talents': {
          documents: [
            { id: 'talent-1', name: 'Talent 1', type: 'talent', flags: { swerpg: { oggdudeKey: 'TALENT_1' } } },
          ],
        },
      }

      addPacksMock(packDefinitions)

      const pack = globalThis.game.packs.get('swerpg.talents')
      const entry = pack.index.get('talent-1')
      expect(entry.flags.swerpg.oggdudeKey).toBe('TALENT_1')
    })
  })

  describe('foundry.utils methods', () => {
    beforeEach(() => {
      setupFoundryMock()
    })

    test('deepClone should clone objects deeply', () => {
      const original = {
        level1: {
          level2: {
            value: 'test',
          },
          array: [1, 2, 3],
        },
      }

      const cloned = globalThis.foundry.utils.deepClone(original)

      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original)
      expect(cloned.level1).not.toBe(original.level1)
      expect(cloned.level1.level2).not.toBe(original.level1.level2)
      expect(cloned.level1.array).not.toBe(original.level1.array)
    })

    test('getProperty should retrieve nested properties', () => {
      const obj = {
        system: {
          attributes: {
            health: {
              value: 10,
            },
          },
        },
      }

      expect(globalThis.foundry.utils.getProperty(obj, 'system.attributes.health.value')).toBe(10)
      expect(globalThis.foundry.utils.getProperty(obj, 'system.nonexistent')).toBeUndefined()
    })

    test('mergeObject should merge objects correctly', () => {
      const original = {
        a: 1,
        b: {
          c: 2,
        },
      }

      const update = {
        b: {
          d: 3,
        },
        e: 4,
      }

      const result = globalThis.foundry.utils.mergeObject(original, update)

      expect(result).toEqual({
        a: 1,
        b: {
          c: 2,
          d: 3,
        },
        e: 4,
      })
    })

    test('mergeObject should handle insertKeys option', () => {
      const original = { a: 1 }
      const update = { b: 2 }

      // With insertKeys: false, new keys should not be added
      const result1 = globalThis.foundry.utils.mergeObject(original, update, { insertKeys: false })
      expect(result1).toEqual({ a: 1 })

      // With insertKeys: true (default), new keys should be added
      const result2 = globalThis.foundry.utils.mergeObject(original, update, { insertKeys: true })
      expect(result2).toEqual({ a: 1, b: 2 })
    })
  })

  describe('Error handling and edge cases', () => {
    test('should handle setupFoundryMock called multiple times', () => {
      setupFoundryMock()
      const firstFoundry = globalThis.foundry

      setupFoundryMock()
      const secondFoundry = globalThis.foundry

      // Should have replaced the first mock
      expect(secondFoundry).not.toBe(firstFoundry)
      expect(secondFoundry).toBeDefined()
    })

    test('should handle empty options', () => {
      expect(() => setupFoundryMock()).not.toThrow()
      expect(() => setupFoundryMock({})).not.toThrow()
      expect(() => setupFoundryMock(null)).not.toThrow()
      expect(() => setupFoundryMock(undefined)).not.toThrow()
    })

    test('should handle invalid pack definitions', () => {
      setupFoundryMock()

      expect(() => addPacksMock({})).not.toThrow()
      expect(() => addPacksMock(null)).not.toThrow()
      expect(() => addPacksMock(undefined)).not.toThrow()
    })
  })

  describe('Integration with actual test patterns', () => {
    test('should support typical test setup pattern', () => {
      setupFoundryMock({
        translations: {
          'TEST.Message': 'Test successful',
        },
      })

      // Simulate typical test usage
      expect(globalThis.game.i18n.localize('TEST.Message')).toBe('Test successful')
      expect(() => globalThis.ui.notifications.info('Test')).not.toThrow()

      const obj = { nested: { value: 42 } }
      const cloned = globalThis.foundry.utils.deepClone(obj)
      expect(cloned.nested.value).toBe(42)
      expect(cloned).not.toBe(obj)
    })
  })
})
