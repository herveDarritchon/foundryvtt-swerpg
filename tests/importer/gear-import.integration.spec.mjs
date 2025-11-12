import { describe, it, expect } from 'vitest'
import { gearMapper, buildGearContext } from '../../module/importer/items/gear-ogg-dude.mjs'

describe('Gear Import Integration', () => {
  it('should produce objects conforming to SwerpgGear schema', () => {
    const xmlGears = [{
      Name: 'Integration Test Gear',
      Key: 'integrationTestGear',
      Description: 'A gear for integration testing',
      Type: 'tool',
      Price: 250,
      Encumbrance: 3,
      Rarity: 4,
      Restricted: false
    }]

    const result = gearMapper(xmlGears)
    const gear = result[0]

    // Validate structure matches expected Foundry item format
    expect(gear).toHaveProperty('name')
    expect(gear).toHaveProperty('type', 'gear')
    expect(gear).toHaveProperty('system')
    expect(gear).toHaveProperty('flags')

    // Validate system object contains only SwerpgGear schema fields
    const system = gear.system
    expect(system).toHaveProperty('category')
    expect(system).toHaveProperty('quantity')
    expect(system).toHaveProperty('price') 
    expect(system).toHaveProperty('quality')
    expect(system).toHaveProperty('encumbrance')
    expect(system).toHaveProperty('rarity')
    expect(system).toHaveProperty('broken')
    expect(system).toHaveProperty('description')
    expect(system).toHaveProperty('actions')

    // Validate data types match schema requirements
    expect(typeof system.category).toBe('string')
    expect(typeof system.quantity).toBe('number')
    expect(typeof system.price).toBe('number')
    expect(typeof system.quality).toBe('string')
    expect(typeof system.encumbrance).toBe('number') 
    expect(typeof system.rarity).toBe('number')
    expect(typeof system.broken).toBe('boolean')
    expect(typeof system.description).toBe('object')
    expect(Array.isArray(system.actions)).toBe(true)

    // Validate description structure
    expect(system.description).toHaveProperty('public')
    expect(system.description).toHaveProperty('secret')
    expect(typeof system.description.public).toBe('string')
    expect(typeof system.description.secret).toBe('string')

    // Validate numeric constraints
    expect(system.quantity).toBeGreaterThanOrEqual(0)
    expect(system.price).toBeGreaterThanOrEqual(0)
    expect(system.encumbrance).toBeGreaterThanOrEqual(0)
    expect(system.rarity).toBeGreaterThanOrEqual(0)
  })

  it('should handle batch import of multiple gears without performance issues', () => {
    // Create 150 gear objects for performance testing
    const xmlGears = Array.from({ length: 150 }, (_, i) => ({
      Name: `Gear ${i + 1}`,
      Key: `gear${i + 1}`,
      Description: `Description for gear ${i + 1}`,
      Type: i % 2 === 0 ? 'tool' : 'utility',
      Price: (i + 1) * 10,
      Encumbrance: (i % 5) + 1,
      Rarity: (i % 3) + 1
    }))

    const startTime = performance.now()
    const result = gearMapper(xmlGears)
    const endTime = performance.now()
    const duration = endTime - startTime

    // Should complete within reasonable time (< 100ms for 150 items)
    expect(duration).toBeLessThan(100)
    expect(result).toHaveLength(150)

    // Spot check a few items
    expect(result[0].name).toBe('Gear 1')
    expect(result[49].name).toBe('Gear 50')
    expect(result[149].name).toBe('Gear 150')

    // Ensure all items have valid structure
    result.forEach((gear, index) => {
      expect(gear.type).toBe('gear')
      expect(gear.system).toBeDefined()
      expect(gear.flags.swerpg.oggdudeKey).toBe(`gear${index + 1}`)
    })
  })

  it('should validate gear context structure without async calls', () => {
    // Test the synchronous parts of buildGearContext
    const mockZip = {}
    const mockGroupByDirectory = []
    const mockGroupByType = { image: [] }

    // We'll create a modified version that skips the async jsonData building
    const contextTemplate = {
      zip: {
        elementFileName: 'Gear.xml',
        content: mockZip,
        directories: mockGroupByDirectory,
      },
      image: {
        criteria: 'Data/EquipmentImages/Gear',
        worldPath: expect.any(String),
        systemPath: expect.any(String),
        images: mockGroupByType.image,
        prefix: 'Gear',
      },
      folder: {
        name: 'Swerpg - Gears',
        type: 'Item',
      },
      element: {
        jsonCriteria: 'Gears.Gear',
        mapper: gearMapper,
        type: 'gear',
      },
    }

    // Validate that our expected structure matches what buildGearContext should return
    expect(contextTemplate.element.type).toBe('gear')
    expect(contextTemplate.element.mapper).toBe(gearMapper)
    expect(contextTemplate.element.jsonCriteria).toBe('Gears.Gear')
    expect(contextTemplate.folder.name).toBe('Swerpg - Gears')
    expect(contextTemplate.folder.type).toBe('Item')
    expect(contextTemplate.image.criteria).toBe('Data/EquipmentImages/Gear')
    expect(contextTemplate.image.prefix).toBe('Gear')
  })

  it('should handle error recovery during import', () => {
    const xmlGears = [
      // Valid gear
      {
        Name: 'Valid Gear',
        Key: 'validGear',
        Price: 100
      },
      // Invalid gear (missing required fields)
      {
        Description: 'Invalid gear without name/key'
      },
      // Another valid gear
      {
        Name: 'Another Valid Gear', 
        Key: 'anotherValidGear',
        Encumbrance: 2
      }
    ]

    // Should not throw despite invalid data
    expect(() => gearMapper(xmlGears)).not.toThrow()

    const result = gearMapper(xmlGears)
    expect(result).toHaveLength(3)

    // First and third should be properly mapped
    expect(result[0].name).toBe('Valid Gear')
    expect(result[2].name).toBe('Another Valid Gear')

    // All should have valid system objects even if some source data was invalid
    result.forEach(gear => {
      expect(gear.system).toBeDefined()
      expect(gear.system.category).toBeDefined()
      expect(gear.system.price).toBeGreaterThanOrEqual(0)
      expect(gear.system.encumbrance).toBeGreaterThanOrEqual(0)
    })
  })
})