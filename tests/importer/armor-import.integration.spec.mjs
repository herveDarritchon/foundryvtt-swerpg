import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../module/utils/logger.mjs', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}))

import { armorMapper, getArmorImportStats, resetArmorImportStats } from '../../module/importer/items/armor-ogg-dude.mjs'
import SwerpgArmor from '../../module/models/armor.mjs'
import { SYSTEM } from '../../module/config/system.mjs'

describe('armorMapper - ADR-0008 alignment', () => {
  beforeEach(() => {
    resetArmorImportStats()
  })

  it('maps basic Light armor with Bulky property', () => {
    const xmlArmors = [
      {
        Name: 'Combat Armor',
        Key: 'combat_armor',
        Soak: 5,
        Defense: 2,
        Categories: { Category: ['Light', 'Bulky'] },
      },
    ]

    const result = armorMapper(xmlArmors)
    expect(result).toHaveLength(1)

    const armor = result[0]
    expect(armor.system.category).toBe('light')
    expect(armor.system.qualities).toEqual([
      { key: 'bulky', rank: null, hasRank: false, active: true, source: 'oggdude' },
    ])
    expect(armor.flags.swerpg.oggdude.categories).toEqual(['Light', 'Bulky'])
    expect(armor.flags.swerpg.oggdude.ignoredCategories).toBeUndefined()
    expect(armor.flags.swerpg.oggdude.unknownProperties).toBeUndefined()
  })

  it('handles mixed tags: category, property, ignored, unknown', () => {
    const xmlArmors = [
      {
        Name: 'Mixed Tags Armor',
        Key: 'mixed_tags',
        Soak: 8,
        Defense: 14,
        Categories: { Category: ['Heavy', 'Bulky', 'full body', 'MysteryTag'] },
      },
    ]

    const result = armorMapper(xmlArmors)
    expect(result).toHaveLength(1)

    const armor = result[0]
    expect(armor.system.category).toBe('heavy')
    expect(armor.system.qualities).toEqual([
      { key: 'bulky', rank: null, hasRank: false, active: true, source: 'oggdude' },
    ])
    expect(armor.flags.swerpg.oggdude.categories).toEqual(['Heavy', 'Bulky', 'full body', 'MysteryTag'])
    expect(armor.flags.swerpg.oggdude.ignoredCategories).toEqual(['full body'])
    expect(armor.flags.swerpg.oggdude.unknownProperties).toEqual(['MysteryTag'])
  })

  it('preserves categories when no properties, ignored, or unknown', () => {
    const xmlArmors = [
      {
        Name: 'Plain Light',
        Key: 'plain_light',
        Soak: 7,
        Defense: 2,
        Categories: { Category: ['Light'] },
      },
    ]

    const result = armorMapper(xmlArmors)
    expect(result).toHaveLength(1)

    const armor = result[0]
    expect(armor.system.category).toBe('light')
    expect(armor.system.qualities).toEqual([])
    expect(armor.flags.swerpg.oggdude.categories).toEqual(['Light'])
    expect(armor.flags.swerpg.oggdude.ignoredCategories).toBeUndefined()
    expect(armor.flags.swerpg.oggdude.unknownProperties).toBeUndefined()
  })

  it('does not map ADR-ignored tags to qualities', () => {
    const xmlArmors = [
      {
        Name: 'Sealed Armor Copy',
        Key: 'sealed_copy',
        Soak: 5,
        Defense: 2,
        Categories: { Category: ['Medium', 'sealable', 'powered'] },
      },
    ]

    const result = armorMapper(xmlArmors)
    expect(result).toHaveLength(1)

    const armor = result[0]
    expect(armor.system.category).toBe('medium')
    expect(armor.system.qualities).toEqual([])
    expect(armor.flags.swerpg.oggdude.ignoredCategories).toContain('sealable')
    expect(armor.flags.swerpg.oggdude.ignoredCategories).toContain('powered')
  })

  it('coexists with baseMods without namespace overwrite', () => {
    const xmlArmors = [
      {
        Name: 'Armor With Mods',
        Key: 'with_mods',
        Soak: 4,
        Defense: 10,
        Categories: { Category: ['Medium', 'Organic'] },
        BaseMods: {
          Mod: [
            { MiscDesc: 'Reinforced Plating' },
          ],
        },
      },
    ]

    const result = armorMapper(xmlArmors)
    expect(result).toHaveLength(1)

    const armor = result[0]
    expect(armor.flags.swerpg.oggdude.categories).toBeDefined()
    expect(armor.flags.swerpg.oggdude.baseMods).toBeDefined()
    expect(armor.flags.swerpg.oggdude.baseMods).toHaveLength(1)
    expect(armor.flags.swerpg.oggdude.baseMods[0].text).toBe('Reinforced Plating')
  })

  it('detects unknown properties and increments stats', () => {
    const xmlArmors = [
      {
        Name: 'Unknown Props',
        Key: 'unknown_props',
        Soak: 5,
        Defense: 2,
        Categories: { Category: ['Light', 'Glowing', 'Sonic'] },
      },
    ]

    const result = armorMapper(xmlArmors)
    expect(result).toHaveLength(1)

    const armor = result[0]
    expect(armor.flags.swerpg.oggdude.unknownProperties).toEqual(['Glowing', 'Sonic'])

    const stats = getArmorImportStats()
    expect(stats.unknownProperties).toBe(2)
  })

  it('handles organic armor with Natural and Leather properties', () => {
    const xmlArmors = [
      {
        Name: 'Bone Armor',
        Key: 'bone_armor',
        Soak: 8,
        Defense: 6,
        Categories: { Category: ['Medium', 'Natural', 'Leather'] },
      },
    ]

    const result = armorMapper(xmlArmors)
    expect(result).toHaveLength(1)

    const armor = result[0]
    expect(armor.system.category).toBe('medium')
    expect(armor.system.qualities).toEqual([
      { key: 'organic', rank: null, hasRank: false, active: true, source: 'oggdude' },
    ])
  })

  it('deduplicates raw categories in flags', () => {
    const xmlArmors = [
      {
        Name: 'Dedup Armor',
        Key: 'dedup',
        Soak: 5,
        Defense: 2,
        Categories: { Category: ['Light', 'Bulky', 'Light'] },
      },
    ]

    const result = armorMapper(xmlArmors)
    expect(result).toHaveLength(1)

    const armor = result[0]
    expect(armor.flags.swerpg.oggdude.categories).toEqual(['Light', 'Bulky'])
  })

  it('maps Restricted true to restrictionLevel restricted and preserves raw value in flags', () => {
    const xmlArmors = [
      {
        Name: 'Restricted Armor',
        Key: 'restricted_armor',
        Soak: 5,
        Defense: 2,
        Categories: { Category: ['Light'] },
        Restricted: 'true',
      },
    ]

    const result = armorMapper(xmlArmors)
    expect(result).toHaveLength(1)

    const armor = result[0]
    expect(armor.system.restrictionLevel).toBe('restricted')
    expect(armor.flags.swerpg.oggdude.restricted).toBe('true')
  })

  it('maps Restricted false to restrictionLevel none', () => {
    const xmlArmors = [
      {
        Name: 'Unrestricted Armor',
        Key: 'unrestricted_armor',
        Soak: 5,
        Defense: 2,
        Categories: { Category: ['Light'] },
        Restricted: false,
      },
    ]

    const result = armorMapper(xmlArmors)
    expect(result).toHaveLength(1)

    const armor = result[0]
    expect(armor.system.restrictionLevel).toBe('none')
    expect(armor.flags.swerpg.oggdude.restricted).toBe(false)
  })

  it('defaults restrictionLevel to none when Restricted is absent', () => {
    const xmlArmors = [
      {
        Name: 'No Restricted Armor',
        Key: 'no_restricted_armor',
        Soak: 5,
        Defense: 2,
        Categories: { Category: ['Light'] },
      },
    ]

    const result = armorMapper(xmlArmors)
    expect(result).toHaveLength(1)

    const armor = result[0]
    expect(armor.system.restrictionLevel).toBe('none')
    expect(armor.flags.swerpg.oggdude?.restricted).toBeUndefined()
  })
})

describe('SwerpgArmor - getTags restrictionLevel', () => {
  function makeArmor(restrictionLevel) {
    return {
      restrictionLevel,
      qualities: [],
      config: { category: { label: 'Medium' } },
      defense: { base: 4, bonus: 0 },
      soak: { base: 5, start: 2 },
      parent: { parent: null },
    }
  }

  it('includes restricted tag for restricted level', () => {
    const tags = SwerpgArmor.prototype.getTags.call(makeArmor('restricted'), 'full')
    expect(tags.restricted).toBe(game.i18n.localize('ITEM.RESTRICTION_LEVEL.RESTRICTED'))
  })

  it('includes restricted tag for military level', () => {
    const tags = SwerpgArmor.prototype.getTags.call(makeArmor('military'), 'full')
    expect(tags.restricted).toBe(game.i18n.localize('ITEM.RESTRICTION_LEVEL.MILITARY'))
  })

  it('includes restricted tag for illegal level', () => {
    const tags = SwerpgArmor.prototype.getTags.call(makeArmor('illegal'), 'full')
    expect(tags.restricted).toBe(game.i18n.localize('ITEM.RESTRICTION_LEVEL.ILLEGAL'))
  })

  it('omits restricted tag when level is none', () => {
    const tags = SwerpgArmor.prototype.getTags.call(makeArmor('none'), 'full')
    expect(tags.restricted).toBeUndefined()
  })

  it('preserves category and defense tags alongside restriction', () => {
    const tags = SwerpgArmor.prototype.getTags.call(makeArmor('restricted'), 'full')
    expect(tags.category).toBe('Medium')
    expect(tags.defense).toBe('4 Armor')
    expect(tags.restricted).toBe(game.i18n.localize('ITEM.RESTRICTION_LEVEL.RESTRICTED'))
  })

  it('localizes raw armor category labels when building tags', () => {
    const localizeSpy = vi.spyOn(game.i18n, 'localize').mockImplementation((key) => {
      if (key === 'ARMOR.CATEGORIES.MEDIUM') return 'Medium Armor'
      return key
    })

    const armor = makeArmor('restricted')
    armor.config.category.label = 'ARMOR.CATEGORIES.MEDIUM'

    const tags = SwerpgArmor.prototype.getTags.call(armor, 'full')

    expect(tags.category).toBe('Medium Armor')
    expect(localizeSpy).toHaveBeenCalledWith('ARMOR.CATEGORIES.MEDIUM')
  })
})
