import { describe, test, expect, beforeEach, vi } from 'vitest'
import { setupFoundryMock } from '../helpers/mock-foundry.mjs'

// Mock en amont des imports pour que StandardCheck utilise bien les versions mockées
vi.mock('../../module/dice/standard-check-dialog.mjs', () => ({
  default: class MockStandardCheckDialog {},
}))

vi.mock('../../module/utils/logger.mjs', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Import après définition des mocks
import StandardCheck from '../../module/dice/standard-check.mjs'

describe('StandardCheck', () => {
  beforeEach(() => {
    setupFoundryMock()

    // Mock global SYSTEM
    globalThis.SYSTEM = {
      dice: {
        MAX_BOONS: 6,
      },
    }

    // Mock global Roll class
    globalThis.Roll = class MockRoll {
      constructor(formula, data) {
        this.formula = formula
        this.data = data
        this._evaluated = false
        this.total = 0
      }
    }

    // Mock Number.isNumeric
    globalThis.Number.isNumeric = vi.fn((value) => {
      return !isNaN(value) && !isNaN(parseFloat(value))
    })
  })

  describe('Constructor', () => {
    test('should handle formula as object parameter', () => {
      const data = { actorId: 'actor1', dc: 15 }
      const check = new StandardCheck(data)

      expect(check.data).toEqual(data)
      expect(check.formula).toBe('')
    })

    test('should handle string formula with data parameter', () => {
      const formula = '3d8'
      const data = { actorId: 'actor1', dc: 15 }
      const check = new StandardCheck(formula, data)

      expect(check.formula).toBe(formula)
      expect(check.data).toEqual(data)
    })
  })

  describe('Default Data', () => {
    test('should have correct default values', () => {
      expect(StandardCheck.defaultData).toEqual({
        actorId: null,
        ability: 0,
        banes: {},
        boons: {},
        dc: 20,
        enchantment: 0,
        skill: 0,
        type: 'general',
        criticalSuccessThreshold: undefined,
        criticalFailureThreshold: undefined,
        rollMode: undefined,
      })
    })
  })

  describe('Result Getters', () => {
    let check

    beforeEach(() => {
      check = new StandardCheck({ dc: 15 })
      check._evaluated = true
    })

    describe('isSuccess', () => {
      test('should return true when total exceeds DC', () => {
        check.total = 16
        expect(check.isSuccess).toBe(true)
      })

      test('should return false when total equals DC', () => {
        check.total = 15
        expect(check.isSuccess).toBe(false)
      })

      test('should return false when total is less than DC', () => {
        check.total = 14
        expect(check.isSuccess).toBe(false)
      })

      test('should return undefined when not evaluated', () => {
        check._evaluated = false
        expect(check.isSuccess).toBeUndefined()
      })
    })

    describe('isCriticalSuccess', () => {
      test('should return true when total exceeds DC + threshold', () => {
        check.data.criticalSuccessThreshold = 6
        check.total = 22 // 15 + 6 + 1
        expect(check.isCriticalSuccess).toBe(true)
      })

      test('should use default threshold of 6 when not specified', () => {
        check.total = 22 // 15 + 6 + 1
        expect(check.isCriticalSuccess).toBe(true)
      })

      test('should return false when total equals DC + threshold', () => {
        check.data.criticalSuccessThreshold = 6
        check.total = 21 // 15 + 6
        expect(check.isCriticalSuccess).toBe(false)
      })

      test('should return undefined when not evaluated', () => {
        check._evaluated = false
        expect(check.isCriticalSuccess).toBeUndefined()
      })
    })

    describe('isFailure', () => {
      test('should return true when total equals DC', () => {
        check.total = 15
        expect(check.isFailure).toBe(true)
      })

      test('should return true when total is less than DC', () => {
        check.total = 14
        expect(check.isFailure).toBe(true)
      })

      test('should return false when total exceeds DC', () => {
        check.total = 16
        expect(check.isFailure).toBe(false)
      })

      test('should return undefined when not evaluated', () => {
        check._evaluated = false
        expect(check.isFailure).toBeUndefined()
      })
    })

    describe('isCriticalFailure', () => {
      test('should return true when total is less than DC - threshold', () => {
        check.data.criticalFailureThreshold = 6
        check.total = 8 // 15 - 6 - 1
        expect(check.isCriticalFailure).toBe(true)
      })

      test('should use default threshold of 6 when not specified', () => {
        check.total = 8 // 15 - 6 - 1
        expect(check.isCriticalFailure).toBe(true)
      })

      test('should return false when total equals DC - threshold', () => {
        check.data.criticalFailureThreshold = 6
        check.total = 9 // 15 - 6
        expect(check.isCriticalFailure).toBe(false)
      })

      test('should return undefined when not evaluated', () => {
        check._evaluated = false
        expect(check.isCriticalFailure).toBeUndefined()
      })
    })
  })

  describe('Data Preparation', () => {
    let check

    beforeEach(() => {
      check = new StandardCheck({})

      // Mock foundry utils
      globalThis.foundry.utils.deepClone = vi.fn((obj) => JSON.parse(JSON.stringify(obj)))
      globalThis.foundry.utils.mergeObject = vi.fn((original, other, options) => ({ ...original, ...other }))
    })

    describe('_prepareData', () => {
      test('should convert numeric boons to object format', () => {
        const data = { boons: 3 }

        const result = check._prepareData(data)
        expect(result.boons).toEqual({
          special: { label: 'Special', number: 3 },
        })
      })

      test('should convert numeric banes to object format', () => {
        const data = { banes: 2 }

        const result = check._prepareData(data)
        expect(result.banes).toEqual({
          special: { label: 'Special', number: 2 },
        })
      })

      test('should handle non-numeric boons gracefully', () => {
        const data = { boons: 'invalid' }
        globalThis.Number.isNumeric.mockReturnValue(false)

        const result = check._prepareData(data)

        expect(result.boons).toEqual({
          special: { label: 'Special', number: 0 },
        })
      })

      test('should preserve object format for boons and banes', () => {
        const data = {
          boons: { talent: { label: 'Talent Bonus', number: 2 } },
          banes: { condition: { label: 'Wounded', number: 1 } },
        }

        const result = check._prepareData(data)

        expect(result.boons).toEqual(data.boons)
        expect(result.banes).toEqual(data.banes)
      })

      test('should remove undefined values', () => {
        const data = { ability: 5, skill: undefined, enchantment: 2 }

        check._prepareData(data)

        // Verify undefined values are filtered out before merge
        expect('skill' in data).toBe(false)
      })

      test('should merge with existing data', () => {
        check.data = { ability: 3, dc: 18 }
        const data = { skill: 5 }

        const result = check._prepareData(data)

        expect(foundry.utils.mergeObject).toHaveBeenCalledWith(check.data, data, { insertKeys: false })
      })
    })

    describe('Data Configuration', () => {
      test('should clamp ability score between 0 and 12', () => {
        const testCases = [
          { input: -5, expected: 0 },
          { input: 0, expected: 0 },
          { input: 6, expected: 6 },
          { input: 12, expected: 12 },
          { input: 15, expected: 12 },
        ]

        for (const { input, expected } of testCases) {
          const data = { ability: input }
          const result = check._prepareData(data)
          expect(result.ability).toBe(expected)
        }
      })

      test('should clamp skill between -4 and 12', () => {
        const testCases = [
          { input: -6, expected: -4 },
          { input: -4, expected: -4 },
          { input: 0, expected: 0 },
          { input: 8, expected: 8 },
          { input: 12, expected: 12 },
          { input: 15, expected: 12 },
        ]

        for (const { input, expected } of testCases) {
          const data = { skill: input }
          const result = check._prepareData(data)
          expect(result.skill).toBe(expected)
        }
      })

      test('should clamp enchantment between 0 and 6', () => {
        const testCases = [
          { input: -2, expected: 0 },
          { input: 0, expected: 0 },
          { input: 3, expected: 3 },
          { input: 6, expected: 6 },
          { input: 10, expected: 6 },
        ]

        for (const { input, expected } of testCases) {
          const data = { enchantment: input }
          const result = check._prepareData(data)
          expect(result.enchantment).toBe(expected)
        }
      })

      test('should ensure DC is at least 0', () => {
        const testCases = [
          { input: -5, expected: 0 },
          { input: 0, expected: 0 },
          { input: 15, expected: 15 },
          { input: 25, expected: 25 },
        ]

        for (const { input, expected } of testCases) {
          const data = { dc: input }
          const result = check._prepareData(data)
          expect(result.dc).toBe(expected)
        }
      })

      test('should calculate total boons correctly', () => {
        const data = {
          boons: {
            talent: { label: 'Talent', number: 2 },
            equipment: { label: 'Equipment', number: 1 },
            condition: { label: 'Condition', number: 3 },
          },
        }

        const result = check._prepareData(data)

        expect(result.totalBoons).toBe(6) // 2 + 1 + 3
      })

      test('should limit boons to maximum allowed', () => {
        const data = {
          boons: {
            talent: { label: 'Talent', number: 4 },
            equipment: { label: 'Equipment', number: 3 }, // Should be clamped to 2
            condition: { label: 'Condition', number: 2 }, // Should be clamped to 0
          },
        }

        const result = check._prepareData(data)

        expect(result.totalBoons).toBe(6) // Maximum allowed
        expect(result.boons.talent.number).toBe(4)
        expect(result.boons.equipment.number).toBe(2) // Clamped
        expect(result.boons.condition.number).toBe(0) // Clamped
      })

      test('should assign IDs to boons and set default number', () => {
        const data = {
          boons: {
            talent: { label: 'Talent' }, // No number provided
            equipment: { label: 'Equipment', number: 2 },
          },
        }

        const result = check._prepareData(data)

        expect(result.boons.talent.id).toBe('talent')
        expect(result.boons.talent.number).toBe(1) // Default value
        expect(result.boons.equipment.id).toBe('equipment')
        expect(result.boons.equipment.number).toBe(2) // Preserved
      })
    })
  })

  describe('Static Properties', () => {
    test('should have correct dialog class', () => {
      expect(StandardCheck.dialogClass).toBeDefined()
    })

    test('should have correct chat template', () => {
      expect(StandardCheck.CHAT_TEMPLATE).toBe('systems/swerpg/templates/dice/standard-check-chat.hbs')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty data object', () => {
      const check = new StandardCheck({})
      expect(() => check._prepareData({})).not.toThrow()
    })

    test('should handle null data gracefully', () => {
      const check = new StandardCheck({})
      expect(() => check._prepareData(null)).not.toThrow()
    })

    test('should handle missing boons/banes objects', () => {
      const data = { ability: 5 }
      const check = new StandardCheck({})
      const result = check._prepareData(data)

      expect(result.totalBoons).toBe(0)
      expect(result.totalBanes).toBe(0)
    })

    test('should handle empty boons/banes objects', () => {
      const data = { boons: {}, banes: {} }
      const check = new StandardCheck({})
      const result = check._prepareData(data)

      expect(result.totalBoons).toBe(0)
      expect(result.totalBanes).toBe(0)
    })
  })

  describe('Integration Tests', () => {
    test('should create functional StandardCheck with realistic data', () => {
      const data = {
        actorId: 'actor123',
        dc: 15,
        ability: 3,
        skill: 2,
        enchantment: 1,
        boons: {
          talent: { label: 'Combat Expertise', number: 1 },
          equipment: { label: 'Masterwork Weapon', number: 1 },
        },
        banes: {
          condition: { label: 'Wounded', number: 1 },
        },
        type: 'attack',
      }

      const check = new StandardCheck(data)
      const result = check._prepareData(data)

      expect(result.actorId).toBe('actor123')
      expect(result.dc).toBe(15)
      expect(result.ability).toBe(3)
      expect(result.skill).toBe(2)
      expect(result.enchantment).toBe(1)
      expect(result.totalBoons).toBe(2)
      expect(result.totalBanes).toBe(1)
      expect(result.type).toBe('attack')
    })
  })
})
