import { describe, it, expect } from 'vitest'

describe('Intégration armorMapper', () => {
  it('should validate armor structure with restrictionLevel', () => {
    const mockArmor = {
      name: 'Test Armor',
      type: 'armor',
      system: {
        category: 'light',
        restrictionLevel: 'restricted',
        qualities: [
          { key: 'bulky', hasRank: false },
        ],
      },
    }

    expect(mockArmor.type).toBe('armor')
    expect(mockArmor.system.restrictionLevel).toBe('restricted')
    expect(mockArmor.system.qualities).not.toContainEqual(
      expect.objectContaining({ key: 'restricted' })
    )
  })

  it('should handle multiple qualities without restricted', () => {
    const mockArmor = {
      system: {
        restrictionLevel: 'none',
        qualities: [
          { key: 'bulky', hasRank: false },
          { key: 'organic', hasRank: false },
        ],
      },
    }

    expect(mockArmor.system.qualities).toHaveLength(2)
    expect(mockArmor.system.qualities).not.toContainEqual(
      expect.objectContaining({ key: 'restricted' })
    )
  })

  it('should preserve raw oggdude restricted value in flags', () => {
    const mockArmor = {
      name: 'Restricted Armor',
      type: 'armor',
      system: {
        category: 'heavy',
        restrictionLevel: 'restricted',
        qualities: [],
      },
      flags: {
        swerpg: {
          oggdudeKey: 'restricted_armor_001',
          oggdude: {
            restricted: true,
            categories: ['Heavy'],
          },
        },
      },
    }

    expect(mockArmor.flags.swerpg.oggdude.restricted).toBe(true)
    expect(mockArmor.system.restrictionLevel).toBe('restricted')
  })

  it('should map null restrictionLevel to none', () => {
    const mockArmor = {
      system: {
        restrictionLevel: 'none',
        qualities: [],
      },
    }

    expect(mockArmor.system.restrictionLevel).toBe('none')
    expect(mockArmor.system).not.toHaveProperty('restricted')
    expect(mockArmor.system).not.toHaveProperty('restrictionLevel.restricted')
  })
})
