import { describe, test, expect } from 'vitest'
import { getItemsOf } from '../../module/utils/items.mjs'

describe('Items Utils', () => {
  describe('getItemsOf function', () => {
    describe('Basic functionality', () => {
      test('should return items matching the specified type', () => {
        const items = [
          { type: 'weapon', name: 'Lightsaber' },
          { type: 'armor', name: 'Padded Armor' },
          { type: 'weapon', name: 'Blaster Pistol' },
          { type: 'gear', name: 'Comlink' }
        ]

        const weapons = getItemsOf(items, 'weapon')
        expect(weapons).toHaveLength(2)
        expect(weapons[0]).toEqual({ type: 'weapon', name: 'Lightsaber' })
        expect(weapons[1]).toEqual({ type: 'weapon', name: 'Blaster Pistol' })
      })

      test('should return empty array when no items match the type', () => {
        const items = [
          { type: 'weapon', name: 'Lightsaber' },
          { type: 'armor', name: 'Padded Armor' }
        ]

        const talents = getItemsOf(items, 'talent')
        expect(talents).toEqual([])
        expect(talents).toHaveLength(0)
      })

      test('should return all items when all items match the type', () => {
        const items = [
          { type: 'weapon', name: 'Lightsaber' },
          { type: 'weapon', name: 'Blaster Pistol' },
          { type: 'weapon', name: 'Vibrosword' }
        ]

        const weapons = getItemsOf(items, 'weapon')
        expect(weapons).toHaveLength(3)
        expect(weapons).toEqual(items)
      })
    })

    describe('Edge cases and type variations', () => {
      test('should handle case-sensitive type matching', () => {
        const items = [
          { type: 'weapon', name: 'Lightsaber' },
          { type: 'Weapon', name: 'Blaster Pistol' },
          { type: 'WEAPON', name: 'Vibrosword' }
        ]

        const lowerCaseWeapons = getItemsOf(items, 'weapon')
        expect(lowerCaseWeapons).toHaveLength(1)
        expect(lowerCaseWeapons[0].name).toBe('Lightsaber')

        const upperCaseWeapons = getItemsOf(items, 'Weapon')
        expect(upperCaseWeapons).toHaveLength(1)
        expect(upperCaseWeapons[0].name).toBe('Blaster Pistol')
      })

      test('should handle numeric and non-string types', () => {
        const items = [
          { type: 1, name: 'Item 1' },
          { type: '1', name: 'Item 2' },
          { type: true, name: 'Item 3' },
          { type: 'true', name: 'Item 4' }
        ]

        expect(getItemsOf(items, 1)).toHaveLength(1)
        expect(getItemsOf(items, '1')).toHaveLength(1)
        expect(getItemsOf(items, true)).toHaveLength(1)
        expect(getItemsOf(items, 'true')).toHaveLength(1)
      })

      test('should handle objects with missing type property', () => {
        const items = [
          { type: 'weapon', name: 'Lightsaber' },
          { name: 'Item without type' },
          { type: undefined, name: 'Item with undefined type' },
          { type: null, name: 'Item with null type' },
          { type: 'armor', name: 'Padded Armor' }
        ]

        const weapons = getItemsOf(items, 'weapon')
        expect(weapons).toHaveLength(1)
        expect(weapons[0].name).toBe('Lightsaber')

        const undefinedItems = getItemsOf(items, undefined)
        expect(undefinedItems).toHaveLength(2)
        
        const itemNames = undefinedItems.map(item => item.name)
        expect(itemNames).toContain('Item with undefined type')
        expect(itemNames).toContain('Item without type')

        const nullItems = getItemsOf(items, null)
        expect(nullItems).toHaveLength(1)
        expect(nullItems[0].name).toBe('Item with null type')
      })
    })

    describe('Empty and null inputs', () => {
      test('should return empty array when items array is empty', () => {
        const result = getItemsOf([], 'weapon')
        expect(result).toEqual([])
        expect(result).toHaveLength(0)
      })

      test('should return empty array when items is null', () => {
        const result = getItemsOf(null, 'weapon')
        expect(result).toEqual([])
        expect(result).toHaveLength(0)
      })

      test('should return empty array when items is undefined', () => {
        const result = getItemsOf(undefined, 'weapon')
        expect(result).toEqual([])
        expect(result).toHaveLength(0)
      })

      test('should throw error for non-array items parameter', () => {
        expect(() => getItemsOf(false, 'weapon')).toThrow()
        expect(() => getItemsOf(0, 'weapon')).toThrow()
        expect(() => getItemsOf('', 'weapon')).toThrow()
        expect(() => getItemsOf(Number.NaN, 'weapon')).toThrow()
      })
    })

    describe('Complex object structures', () => {
      test('should work with complex item objects', () => {
        const items = [
          {
            type: 'weapon',
            name: 'Lightsaber',
            stats: { damage: 10, crit: 2 },
            properties: ['Deadly', 'Superior']
          },
          {
            type: 'armor',
            name: 'Padded Armor',
            stats: { defense: 1, encumbrance: 2 },
            properties: ['Lightweight']
          },
          {
            type: 'weapon',
            name: 'Blaster Pistol',
            stats: { damage: 6, crit: 3 },
            properties: ['Ranged', 'Stun Setting']
          }
        ]

        const weapons = getItemsOf(items, 'weapon')
        expect(weapons).toHaveLength(2)
        expect(weapons[0].stats.damage).toBe(10)
        expect(weapons[1].properties).toContain('Ranged')
      })

      test('should preserve object references', () => {
        const originalItem = { type: 'weapon', name: 'Lightsaber' }
        const items = [originalItem, { type: 'armor', name: 'Armor' }]

        const weapons = getItemsOf(items, 'weapon')
        expect(weapons[0]).toBe(originalItem) // Same reference
      })
    })

    describe('Array-like objects and edge cases', () => {
      test('should handle array-like objects that have filter method', () => {
        // Create array-like object with filter method
        const arrayLike = {
          0: { type: 'weapon', name: 'Sword' },
          1: { type: 'armor', name: 'Shield' },
          2: { type: 'weapon', name: 'Bow' },
          length: 3,
          filter: Array.prototype.filter
        }

        const weapons = getItemsOf(arrayLike, 'weapon')
        expect(weapons).toHaveLength(2)
        expect(weapons[0].name).toBe('Sword')
        expect(weapons[1].name).toBe('Bow')
      })

      test('should handle items without filter method gracefully', () => {
        const notAnArray = {
          0: { type: 'weapon', name: 'Sword' },
          length: 1
        }

        // Should throw error for non-array input
        expect(() => getItemsOf(notAnArray, 'weapon')).toThrow()
      })
    })

    describe('Performance and large datasets', () => {
      test('should handle performance with large arrays efficiently', () => {
        // Create test data outside of nested function
        const largeItems = []
        for (let index = 0; index < 10000; index++) {
          largeItems.push({
            type: index % 2 === 0 ? 'weapon' : 'armor',
            name: `Item ${index}`
          })
        }

        const start = performance.now()
        const weapons = getItemsOf(largeItems, 'weapon')
        const end = performance.now()

        expect(weapons).toHaveLength(5000)
        expect(end - start).toBeLessThan(100) // Should complete within 100ms
      })
    })

    describe('Type coercion and strict equality', () => {
      test('should use strict equality for type matching', () => {
        const items = [
          { type: 1, name: 'Numeric 1' },
          { type: '1', name: 'String 1' },
          { type: true, name: 'Boolean true' },
          { type: 'true', name: 'String true' }
        ]

        // Should not match different types even if they coerce to the same value
        expect(getItemsOf(items, 1)).toHaveLength(1)
        expect(getItemsOf(items, '1')).toHaveLength(1)
        expect(getItemsOf(items, 1)[0].name).toBe('Numeric 1')
        expect(getItemsOf(items, '1')[0].name).toBe('String 1')
      })
    })

    describe('Real-world SweRPG item types', () => {
      test('should work with typical SweRPG item types', () => {
        const items = [
          { type: 'talent', name: 'Adversary', system: { isRanked: true } },
          { type: 'weapon', name: 'Lightsaber', system: { damage: { base: 6 } } },
          { type: 'armor', name: 'Padded Armor', system: { defense: { melee: 0, ranged: 1 } } },
          { type: 'gear', name: 'Comlink', system: { encumbrance: 0 } },
          { type: 'skill', name: 'Lightsaber', system: { characteristic: 'Brawn' } },
          { type: 'talent', name: 'Lethal Blows', system: { isRanked: true } }
        ]

        expect(getItemsOf(items, 'talent')).toHaveLength(2)
        expect(getItemsOf(items, 'weapon')).toHaveLength(1)
        expect(getItemsOf(items, 'armor')).toHaveLength(1)
        expect(getItemsOf(items, 'gear')).toHaveLength(1)
        expect(getItemsOf(items, 'skill')).toHaveLength(1)
      })
    })
  })
})