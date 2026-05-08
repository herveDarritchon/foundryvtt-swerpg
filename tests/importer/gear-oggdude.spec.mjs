import { describe, it, expect } from 'vitest'
import { gearMapper } from '../../module/importer/items/gear-ogg-dude.mjs'

describe('gearMapper', () => {
  it('should map basic gear with all standard fields and default restrictionLevel', () => {
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
    expect(result[0]).toMatchObject({
      name: 'Test Gear',
      type: 'gear',
      system: {
        category: 'utility',
        quantity: 1,
        price: 100,
        quality: 'standard',
        restrictionLevel: 'none',
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
          oggdudeKey: 'testGear',
          originalType: 'utility',
          oggdude: {
            type: 'utility',
          },
        },
      },
    })
    expect(result[0].flags.swerpg).not.toHaveProperty('oggdudeSource')
  })

  it('should use restrictionLevel restricted when Restricted is true and preserve raw value in flags', () => {
    const xmlGears = [
      {
        Name: 'Restricted Gear',
        Key: 'restrictedGear',
        Description: 'A restricted gear item',
        Type: 'weapon_part',
        Price: 500,
        Encumbrance: 1,
        Rarity: 8,
        Restricted: true,
      },
    ]

    const result = gearMapper(xmlGears)

    expect(result[0].system.restrictionLevel).toBe('restricted')
    expect(result[0].flags.swerpg.oggdude.restricted).toBe(true)
  })

  it('should handle string Restricted values correctly', () => {
    const xmlGears = [
      {
        Name: 'String Restricted Gear',
        Key: 'stringRestrictedGear',
        Restricted: 'true',
      },
    ]

    const result = gearMapper(xmlGears)

    expect(result[0].system.restrictionLevel).toBe('restricted')
    expect(result[0].flags.swerpg.oggdude.restricted).toBe('true')
  })

  it('should default to none when Restricted is absent', () => {
    const xmlGears = [
      {
        Name: 'No Restricted Gear',
        Key: 'noRestrictedGear',
      },
    ]

    const result = gearMapper(xmlGears)

    expect(result[0].system.restrictionLevel).toBe('none')
    expect(result[0].flags.swerpg.oggdude).toBeUndefined()
  })

  it('should not store restricted in flags when Restricted is absent', () => {
    const xmlGears = [
      {
        Name: 'Gear Without Restricted',
        Key: 'gearNoRestricted',
        Type: 'tool',
      },
    ]

    const result = gearMapper(xmlGears)

    expect(result[0].system.restrictionLevel).toBe('none')
    if (result[0].flags.swerpg.oggdude) {
      expect(result[0].flags.swerpg.oggdude).not.toHaveProperty('restricted')
    }
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

  it('should exclude unsupported fields from result', () => {
    const xmlGears = [
      {
        Name: 'Test Gear',
        Key: 'testGear',
        Description: 'Includes <script>bad()</script> content.',
        Source: { _: 'Test Source', $: { Page: '42' } },
        Categories: ['category1', 'category2'],
        BaseMods: [{ MiscDesc: 'Provides utility.' }],
        WeaponModifiers: {
          WeaponModifier: {
            SkillKey: 'MELEE',
            Damage: '1',
            Crit: '3',
            RangeValue: 'wrEngaged',
            Qualities: { Quality: { Key: 'CUMBERSOME', Count: '1' } },
          },
        },
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
    const expectedKeys = ['category', 'quantity', 'price', 'quality', 'restrictionLevel', 'encumbrance', 'rarity', 'broken', 'description', 'actions']
    expect(systemKeys).toEqual(expect.arrayContaining(expectedKeys))
    expect(systemKeys).toHaveLength(expectedKeys.length)

    // Sanitization & structured flags should be applied
    expect(result[0].system.description.public).not.toContain('<script>')
    expect(result[0].system.description.public).toContain('&lt;script')
    expect(result[0].system.description.public).toContain('Source: Test Source, p.42')
    expect(result[0].system.description.public).toContain('Base Mods:')
    expect(result[0].system.description.public).toContain('Weapon Use:')
    expect(result[0].flags.swerpg.oggdude.baseMods).toHaveLength(1)
    expect(result[0].flags.swerpg.oggdude.weaponProfile).toMatchObject({
      skillKey: 'MELEE',
      crit: 3,
      rangeValue: 'engaged',
    })
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
        Source: { _: 'Data Vault' },
      },
    ]

    const result = gearMapper(xmlGears)

    expect(result[0].flags.swerpg.oggdudeKey).toBe('uniqueKey')
    expect(result[0].flags.swerpg.originalType).toBe('special')
    expect(result[0].flags.swerpg.oggdudeSource).toBe('Data Vault')
    expect(result[0].flags.swerpg.oggdude).toEqual({ type: 'special' })
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
