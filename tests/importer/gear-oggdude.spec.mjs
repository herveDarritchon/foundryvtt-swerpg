import { describe, it, expect } from 'vitest'
import { gearMapper } from '../../module/importer/items/gear-ogg-dude.mjs'

describe('gearMapper', () => {
  it('should map basic gear with all standard fields', () => {
    const xmlGears = [
      {
        Name: 'Test Gear',
        Key: 'testGear',
        Description: 'A test gear item',
        Type: 'utility',
        Price: 100,
        Encumbrance: 2,
        Rarity: 3,
        Restricted: false,
      },
    ]

    const result = gearMapper(xmlGears)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      name: 'Test Gear',
      type: 'gear',
      system: {
        category: 'utility',
        quantity: 1,
        price: 100,
        quality: 'standard',
        encumbrance: 2,
        rarity: 3,
        broken: false,
        description: {
          public: 'A test gear item',
          secret: '',
        },
        actions: [],
      },
      flags: {
        swerpg: {
          oggdude: {
            type: 'utility',
          },
          oggdudeKey: 'testGear',
          originalType: 'utility',
        },
      },
    })
  })

  it('should normalize negative numeric values to defaults', () => {
    const xmlGears = [
      {
        Name: 'Test Gear',
        Key: 'testGear',
        Price: -50,
        Encumbrance: -1,
        Rarity: -2,
      },
    ]

    const result = gearMapper(xmlGears)

    expect(result[0].system.price).toBe(0)
    expect(result[0].system.encumbrance).toBe(1)
    expect(result[0].system.rarity).toBe(1)
  })

  it('should handle non-numeric values gracefully', () => {
    const xmlGears = [
      {
        Name: 'Test Gear',
        Key: 'testGear',
        Price: 'invalid',
        Encumbrance: 'not-a-number',
        Rarity: null,
      },
    ]

    const result = gearMapper(xmlGears)

    expect(result[0].system.price).toBe(0)
    expect(result[0].system.encumbrance).toBe(1)
    expect(result[0].system.rarity).toBe(1)
  })

  it('should validate boolean restricted field properly', () => {
    const testCases = [
      { input: true, expected: false }, // broken field not used currently
      { input: false, expected: false },
      { input: 'true', expected: false },
      { input: undefined, expected: false },
      { input: null, expected: false },
    ]

    testCases.forEach(({ input, expected }) => {
      const xmlGears = [
        {
          Name: 'Test Gear',
          Key: 'testGear',
          Restricted: input,
        },
      ]

      const result = gearMapper(xmlGears)
      expect(result[0].system.broken).toBe(expected)
    })
  })

  it('should exclude unsupported fields from result', () => {
    const xmlGears = [
      {
        Name: 'Test Gear',
        Key: 'testGear',
        Sources: [{ _: 'Test Source', Page: 42 }],
        Categories: ['category1', 'category2'],
        BaseMods: [{ Name: 'TestMod' }],
        WeaponModifiers: [{ Name: 'TestWeaponMod' }],
        EraPricing: [{ Name: 'TestEra', Price: 200 }],
      },
    ]

    const result = gearMapper(xmlGears)

    // These fields should not exist in the result
    expect(result[0]).not.toHaveProperty('sources')
    expect(result[0]).not.toHaveProperty('categories')
    expect(result[0]).not.toHaveProperty('mods')
    expect(result[0]).not.toHaveProperty('weaponModifiers')
    expect(result[0]).not.toHaveProperty('eraPricing')

    // Only valid schema fields should be present in system
    const systemKeys = Object.keys(result[0].system)
    const expectedKeys = ['category', 'quantity', 'price', 'quality', 'encumbrance', 'rarity', 'broken', 'description', 'actions']
    expect(systemKeys).toEqual(expect.arrayContaining(expectedKeys))
    expect(systemKeys).toHaveLength(expectedKeys.length)
  })

  it('should handle empty or undefined description', () => {
    const xmlGears = [
      {
        Name: 'Test Gear',
        Key: 'testGear',
        Description: undefined,
      },
    ]

    const result = gearMapper(xmlGears)

    expect(result[0].system.description.public).toBe('')
    expect(result[0].system.description.secret).toBe('')
  })

  it('should use default category when type is missing', () => {
    const xmlGears = [
      {
        Name: 'Test Gear',
        Key: 'testGear',
        // No Type field
      },
    ]

    const result = gearMapper(xmlGears)

    expect(result[0].system.category).toBe('general')
    expect(result[0].flags.swerpg.originalType).toBeUndefined()
  })

  it('should preserve flags.swerpg metadata', () => {
    const xmlGears = [
      {
        Name: 'Test Gear',
        Key: 'uniqueKey',
        Type: 'special',
      },
    ]

    const result = gearMapper(xmlGears)

    expect(result[0].flags.swerpg.oggdudeKey).toBe('uniqueKey')
    expect(result[0].flags.swerpg.originalType).toBe('special')
  })

  it('should handle malformed gear object gracefully', () => {
    const xmlGears = [
      {
        // Missing required Name and Key fields
        Description: 'Incomplete gear',
      },
    ]

    // Should not throw, but use fallback values
    expect(() => gearMapper(xmlGears)).not.toThrow()
  })
})
