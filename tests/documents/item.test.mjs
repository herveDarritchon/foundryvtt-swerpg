import { describe, test, expect, beforeEach, vi } from 'vitest'
import { setupFoundryMock } from '../helpers/mock-foundry.mjs'
import SwerpgItem from '../../module/documents/item.mjs'

// Mock dependencies
vi.mock('../../module/lib/talents/talent-factory.mjs', () => ({
  default: {
    build: vi.fn()
  }
}))

vi.mock('../../module/utils/logger.mjs', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('../../module/lib/talents/error-talent.mjs', () => ({
  default: class ErrorTalent {
    constructor(options) {
      this.options = options
    }
  }
}))

describe('SwerpgItem Document', () => {
  let mockItem
  let mockActor
  let mockSystem

  beforeEach(() => {
    setupFoundryMock()
    
    // Setup global SYSTEM mock
    globalThis.SYSTEM = {
      skills: {
        skills: {
          testSkill: {
            name: 'Test Skill',
            icon: 'test-icon.png',
            category: 'general',
            abilities: ['intellect'],
            ranks: [
              { rank: 0, purchased: false },
              { rank: 1, purchased: false },
              { rank: 2, purchased: false }
            ],
            paths: [
              { id: 'path1', active: false },
              { id: 'path2', active: false }
            ]
          }
        }
      }
    }

    mockSystem = {
      config: {
        name: 'Test Config',
        type: 'test'
      },
      actions: [],
      currentRank: { rank: 1, cost: 5 },
      skill: 'testSkill',
      isRanked: true,
      rank: { idx: 1, cost: 10 },
      getTags: vi.fn().mockReturnValue({ tag1: 'value1', tag2: 'value2' })
    }

    mockActor = {
      type: 'character',
      system: {
        applyAncestry: vi.fn(),
        applyArchetype: vi.fn(), 
        applyBackground: vi.fn(),
        applyOrigin: vi.fn(),
        applyTaxonomy: vi.fn()
      },
      canLearnIconicSpell: vi.fn(),
      getActiveTokens: vi.fn().mockReturnValue([])
    }

    // Create a mock SwerpgItem that extends our base
    mockItem = Object.create(SwerpgItem.prototype)
    mockItem.type = 'talent'
    mockItem.system = mockSystem
    mockItem.parent = mockActor
    mockItem.actor = mockActor
    mockItem.isOwned = true
    mockItem.id = 'test-item-id'
    mockItem.name = 'Test Item'
    mockItem.img = 'test-image.png'
  })

  describe('Item Attributes Getters', () => {
    test('config getter should return system config', () => {
      expect(mockItem.config).toBe(mockSystem.config)
    })

    test('actions getter should return system actions', () => {
      expect(mockItem.actions).toBe(mockSystem.actions)
    })

    test('rank getter should return system currentRank', () => {
      expect(mockItem.rank).toBe(mockSystem.currentRank)
    })
  })

  describe('prepareBaseData', () => {
    test('should configure skill items correctly', () => {
      mockItem.type = 'skill'
      mockItem.system.skill = 'testSkill'
      
      // Mock the super method
      const superPrepareBaseData = vi.fn()
      mockItem.__proto__.__proto__ = { prepareBaseData: superPrepareBaseData }
      
      SwerpgItem.prototype.prepareBaseData.call(mockItem)
      
      expect(mockItem.system.config).toEqual(globalThis.SYSTEM.skills.skills.testSkill)
      expect(superPrepareBaseData).toHaveBeenCalled()
    })

    test('should handle unknown skill gracefully', () => {
      mockItem.type = 'skill'
      mockItem.system.skill = 'unknownSkill'
      
      const superPrepareBaseData = vi.fn()
      mockItem.__proto__.__proto__ = { prepareBaseData: superPrepareBaseData }
      
      SwerpgItem.prototype.prepareBaseData.call(mockItem)
      
      expect(mockItem.system.config).toEqual({})
      expect(superPrepareBaseData).toHaveBeenCalled()
    })

    test('should call super for non-skill items', () => {
      mockItem.type = 'weapon'
      
      const superPrepareBaseData = vi.fn()
      mockItem.__proto__.__proto__ = { prepareBaseData: superPrepareBaseData }
      
      SwerpgItem.prototype.prepareBaseData.call(mockItem)
      
      expect(superPrepareBaseData).toHaveBeenCalled()
    })
  })

  describe('prepareDerivedData', () => {
    test('should call _prepareSkillData for skill items', () => {
      mockItem.type = 'skill'
      const prepareSkillDataSpy = vi.spyOn(SwerpgItem.prototype, '_prepareSkillData')
      
      SwerpgItem.prototype.prepareDerivedData.call(mockItem)
      
      expect(prepareSkillDataSpy).toHaveBeenCalled()
    })

    test('should not call _prepareSkillData for non-skill items', () => {
      mockItem.type = 'weapon'
      const prepareSkillDataSpy = vi.spyOn(SwerpgItem.prototype, '_prepareSkillData')
      
      SwerpgItem.prototype.prepareDerivedData.call(mockItem)
      
      expect(prepareSkillDataSpy).not.toHaveBeenCalled()
    })
  })

  describe('_prepareSkillData', () => {
    beforeEach(() => {
      mockItem.type = 'skill'
      mockItem.config = globalThis.SYSTEM.skills.skills.testSkill
      mockItem.rank = 1
      mockItem.path = 'path1'
      
      // Mock foundry.utils.deepClone
      globalThis.foundry.utils.deepClone = vi.fn().mockImplementation(obj => JSON.parse(JSON.stringify(obj)))
    })

    test('should set basic skill properties', () => {
      SwerpgItem.prototype._prepareSkillData.call(mockItem)
      
      expect(mockItem.name).toBe('Test Skill')
      expect(mockItem.img).toBe('test-icon.png')
      expect(mockItem.category).toBe('general')
      expect(mockItem.abilities).toEqual(['intellect'])
    })

    test('should process ranks correctly', () => {
      SwerpgItem.prototype._prepareSkillData.call(mockItem)
      
      expect(mockItem.ranks).toHaveLength(3)
      expect(mockItem.ranks[1].purchased).toBe(true) // rank 1 should be purchased
      expect(mockItem.ranks[0].purchased).toBe(false) // rank 0 should not be purchased
      expect(mockItem.currentRank).toEqual(mockItem.ranks[1])
      expect(mockItem.nextRank).toEqual(mockItem.ranks[2])
    })

    test('should process paths correctly', () => {
      SwerpgItem.prototype._prepareSkillData.call(mockItem)
      
      expect(mockItem.paths).toHaveLength(2)
      expect(mockItem.paths[0].active).toBe(true) // path1 should be active
      expect(mockItem.paths[1].active).toBe(false) // path2 should not be active
      expect(mockItem.path).toEqual(mockItem.paths[0])
    })

    test('should handle missing config gracefully', () => {
      mockItem.config = {}
      
      expect(() => {
        SwerpgItem.prototype._prepareSkillData.call(mockItem)
      }).not.toThrow()
    })
  })

  describe('getTags', () => {
    test('should return system getTags result when available', () => {
      const result = SwerpgItem.prototype.getTags.call(mockItem, 'full')
      
      expect(mockSystem.getTags).toHaveBeenCalledWith('full')
      expect(result).toEqual({ tag1: 'value1', tag2: 'value2' })
    })

    test('should use default scope when not provided', () => {
      SwerpgItem.prototype.getTags.call(mockItem)
      
      expect(mockSystem.getTags).toHaveBeenCalledWith('full')
    })

    test('should return empty object when system.getTags is not available', () => {
      mockItem.system.getTags = undefined
      
      const result = SwerpgItem.prototype.getTags.call(mockItem)
      
      expect(result).toEqual({})
    })
  })

  describe('_preCreate workflow', () => {
    let mockData, mockOptions, mockUser

    beforeEach(() => {
      mockData = { type: 'talent' }
      mockOptions = {}
      mockUser = { id: 'user-id' }
      
      // Mock super method
      const superPreCreate = vi.fn().mockResolvedValue(true)
      mockItem.__proto__.__proto__ = { _preCreate: superPreCreate }
    })

    test('should handle ancestry type for character', async () => {
      mockData.type = 'ancestry'
      mockActor.type = 'character'
      
      const result = await SwerpgItem.prototype._preCreate.call(mockItem, mockData, mockOptions, mockUser)
      
      expect(mockActor.system.applyAncestry).toHaveBeenCalledWith(mockItem)
      expect(result).toBe(false) // Should prevent creation
    })

    test('should handle archetype type for adversary', async () => {
      mockData.type = 'archetype'
      mockActor.type = 'adversary'
      
      const result = await SwerpgItem.prototype._preCreate.call(mockItem, mockData, mockOptions, mockUser)
      
      expect(mockActor.system.applyArchetype).toHaveBeenCalledWith(mockItem)
      expect(result).toBe(false) // Should prevent creation
    })

    test('should handle background type for character', async () => {
      mockData.type = 'background'
      mockActor.type = 'character'
      
      const result = await SwerpgItem.prototype._preCreate.call(mockItem, mockData, mockOptions, mockUser)
      
      expect(mockActor.system.applyBackground).toHaveBeenCalledWith(mockItem)
      expect(result).toBe(false) // Should prevent creation
    })

    test('should handle origin type for character', async () => {
      mockData.type = 'origin'
      mockActor.type = 'character'
      
      const result = await SwerpgItem.prototype._preCreate.call(mockItem, mockData, mockOptions, mockUser)
      
      expect(mockActor.system.applyOrigin).toHaveBeenCalledWith(mockItem)
      expect(result).toBe(false) // Should prevent creation
    })

    test('should handle spell type with successful validation', async () => {
      mockData.type = 'spell'
      mockActor.canLearnIconicSpell.mockImplementation(() => {}) // No error
      
      await SwerpgItem.prototype._preCreate.call(mockItem, mockData, mockOptions, mockUser)
      
      expect(mockActor.canLearnIconicSpell).toHaveBeenCalledWith(mockItem)
      expect(mockOptions.keepId).toBe(true)
    })

    test('should handle spell type with validation error', async () => {
      mockData.type = 'spell'
      mockActor.canLearnIconicSpell.mockImplementation(() => { 
        throw new Error('Cannot learn spell') 
      })
      
      const result = await SwerpgItem.prototype._preCreate.call(mockItem, mockData, mockOptions, mockUser)
      
      expect(mockActor.canLearnIconicSpell).toHaveBeenCalledWith(mockItem)
      expect(result).toBe(false) // Should prevent creation
    })

    test('should handle talent type', async () => {
      mockData.type = 'talent'
      
      await SwerpgItem.prototype._preCreate.call(mockItem, mockData, mockOptions, mockUser)
      
      expect(mockOptions.keepId).toBe(true)
      expect(mockOptions.keepEmbeddedIds).toBe(true)
    })

    test('should handle taxonomy type for adversary', async () => {
      mockData.type = 'taxonomy'
      mockActor.type = 'adversary'
      
      const result = await SwerpgItem.prototype._preCreate.call(mockItem, mockData, mockOptions, mockUser)
      
      expect(mockActor.system.applyTaxonomy).toHaveBeenCalledWith(mockItem)
      expect(result).toBe(false) // Should prevent creation
    })
  })

  describe('_onUpdate', () => {
    beforeEach(() => {
      // Mock super method
      const superOnUpdate = vi.fn().mockReturnValue(true)
      mockItem.__proto__.__proto__ = { _onUpdate: superOnUpdate }
      
      // Mock _displayScrollingStatus
      mockItem._displayScrollingStatus = vi.fn()
    })

    test('should call _displayScrollingStatus and super', () => {
      const data = { system: { equipped: true } }
      const options = {}
      const userId = 'user-id'
      
      SwerpgItem.prototype._onUpdate.call(mockItem, data, options, userId)
      
      expect(mockItem._displayScrollingStatus).toHaveBeenCalledWith(data)
    })
  })

  describe('_displayScrollingStatus', () => {
    beforeEach(() => {
      // Mock canvas
      globalThis.canvas = {
        interface: {
          createScrollingText: vi.fn()
        }
      }
      
      globalThis.CONST = {
        TEXT_ANCHOR_POINTS: {
          CENTER: 0,
          TOP: 1,
          BOTTOM: 2
        }
      }
      
      mockActor.getActiveTokens.mockReturnValue([
        { center: { x: 100, y: 100 } },
        { center: { x: 200, y: 200 } }
      ])
      
      mockItem.name = 'Test Weapon'
    })

    test('should not display for unowned items', () => {
      mockItem.isOwned = false
      
      SwerpgItem.prototype._displayScrollingStatus.call(mockItem, { system: { equipped: true } })
      
      expect(canvas.interface.createScrollingText).not.toHaveBeenCalled()
    })

    test('should not display for non-equipment items', () => {
      mockItem.type = 'talent'
      
      SwerpgItem.prototype._displayScrollingStatus.call(mockItem, { system: { equipped: true } })
      
      expect(canvas.interface.createScrollingText).not.toHaveBeenCalled()
    })

    test('should display equipped status for armor', () => {
      mockItem.type = 'armor'
      const changed = { system: { equipped: true } }
      
      SwerpgItem.prototype._displayScrollingStatus.call(mockItem, changed)
      
      expect(canvas.interface.createScrollingText).toHaveBeenCalledTimes(2) // One per token
      expect(canvas.interface.createScrollingText).toHaveBeenCalledWith(
        { x: 100, y: 100 },
        '+(Test Weapon)',
        expect.objectContaining({
          anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
          direction: CONST.TEXT_ANCHOR_POINTS.TOP
        })
      )
    })

    test('should display unequipped status for weapon', () => {
      mockItem.type = 'weapon'
      const changed = { system: { equipped: false } }
      
      SwerpgItem.prototype._displayScrollingStatus.call(mockItem, changed)
      
      expect(canvas.interface.createScrollingText).toHaveBeenCalledTimes(2) // One per token
      expect(canvas.interface.createScrollingText).toHaveBeenCalledWith(
        { x: 100, y: 100 },
        '-(Test Weapon)',
        expect.objectContaining({
          anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
          direction: CONST.TEXT_ANCHOR_POINTS.BOTTOM
        })
      )
    })

    test('should not display if equipped status unchanged', () => {
      mockItem.type = 'weapon'
      const changed = { system: { damage: 10 } } // No equipped change
      
      SwerpgItem.prototype._displayScrollingStatus.call(mockItem, changed)
      
      expect(canvas.interface.createScrollingText).not.toHaveBeenCalled()
    })
  })
})