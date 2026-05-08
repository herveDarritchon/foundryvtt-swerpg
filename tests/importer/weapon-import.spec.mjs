import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../module/utils/logger.mjs', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}))

import { weaponMapper, getWeaponImportStats, resetWeaponImportStats } from '../../module/importer/items/weapon-ogg-dude.mjs'
import SwerpgWeapon from '../../module/models/weapon.mjs'
import { SYSTEM } from '../../module/config/system.mjs'

describe('weaponMapper - mapping', () => {
  beforeEach(() => {
    resetWeaponImportStats()
  })

  it('map weapon with extended metadata and flags', () => {
    const xmlWeapons = [
      {
        Name: 'DL-44',
        Key: 'dl44',
        SkillKey: 'RangedLight',
        RangeValue: 'wrShort',
        Damage: 5,
        DamageAdd: 1,
        Crit: 3,
        Qualities: {
          Quality: [
            { Key: 'BLAST', Count: 2 },
            { Key: 'Burn', Count: '3' },
          ],
        },
        Hands: 'TWO_HAND',
        Rarity: 4,
        Price: 1200,
        Encumbrance: 2,
        HP: 3,
        Restricted: 'true',
        Type: 'Blasters/Heavy',
        Categories: {
          Category: ['Ranged', 'Starship'],
        },
        Description: '[H3]DL-44[/H3][BR]Famous blaster.',
        Source: {
          _: 'Core Rulebook',
          $: {
            Page: '123',
          },
        },
        SizeHigh: '2.5',
      },
    ]

    const result = weaponMapper(xmlWeapons)
    expect(result).toHaveLength(1)

    const weapon = result[0]
    expect(weapon.system.range).toBe('short')
    expect(weapon.system.skill).toBe('rangedLight')
    expect(weapon.system.category).toBe('ranged')
    expect(weapon.system.weaponType).toBe('heavy-blaster')
    expect(weapon.system.qualities).toEqual([
      { key: 'blast', rank: 2, hasRank: true, active: true, source: 'oggdude' },
      { key: 'burn', rank: 3, hasRank: true, active: true, source: 'oggdude' },
    ])

    // Structured flags (no more flat oggdudeTags)
    expect(weapon.flags.swerpg.oggdudeTags).toBeUndefined()
    expect(weapon.flags.swerpg.oggdude.type).toBe('Blasters/Heavy')
    expect(weapon.flags.swerpg.oggdude.categories).toEqual(['Ranged', 'Starship'])
    expect(weapon.flags.swerpg.oggdude.sizeHigh).toBe(2.5)
    expect(weapon.flags.swerpg.oggdude.source).toEqual({ name: 'Core Rulebook', page: 123 })
    expect(weapon.system.restrictionLevel).toBe('restricted')
    expect(weapon.flags.swerpg.oggdude.restricted).toBe('true')
    expect(weapon.system.description.public).toBe('DL-44\nFamous blaster.\n\nSource: Core Rulebook, p.123')
    expect(weapon.system.description.secret).toBe('')
    expect(weapon.system.actions).toEqual([])
  })

  it('sanitizes description and prevents script injection', () => {
    const xmlWeapons = [
      {
        Name: 'Scripted Saber',
        Key: 'scripted',
        SkillKey: 'Melee',
        Range: 'Engaged',
        Damage: 3,
        Crit: 2,
        Qualities: {
          Quality: { Key: 'Breach', Count: 1 },
        },
        Description: '<script>alert("boom")</script>Dangerous.',
      },
    ]

    const result = weaponMapper(xmlWeapons)
    expect(result).toHaveLength(1)

    const weapon = result[0]
    expect(weapon.system.description.public).toContain('&lt;script')
    expect(weapon.system.description.public).toContain('Dangerous.')
  })

  it('sorts qualities alphabetically and aggregates duplicate counts', () => {
    const xmlWeapons = [
      {
        Name: 'Aggregator',
        Key: 'aggregator',
        SkillKey: 'RangedHeavy',
        Range: 'Long',
        Damage: 4,
        Crit: 3,
        Qualities: {
          Quality: [
            { Key: 'Accurate', Count: 1 },
            { Key: 'BLAST', Count: 1 },
            { Key: 'Blast', Count: 2 },
          ],
        },
      },
    ]

    const result = weaponMapper(xmlWeapons)
    const weapon = result[0]

    expect(weapon.system.qualities).toEqual([
      { key: 'accurate', rank: null, hasRank: false, active: true, source: 'oggdude' },
      { key: 'blast', rank: 3, hasRank: true, active: true, source: 'oggdude' },
    ])
  })

  it('processes large imports without throwing and preserves item count', () => {
    const xmlWeapons = Array.from({ length: 200 }, (_, index) => ({
      Name: `Weapon ${index + 1}`,
      Key: `weapon-${index + 1}`,
      SkillKey: 'RangedLight',
      Range: 'Short',
      Damage: 2,
      Crit: 2,
      Qualities: {
        Quality: { Key: 'Accurate', Count: 1 },
      },
    }))

    const result = weaponMapper(xmlWeapons)
    expect(result).toHaveLength(200)
    expect(getWeaponImportStats().total).toBe(200)
    // Vérifier que le format est correct pour le premier élément
    expect(result[0].system.qualities[0]).toMatchObject({
      key: 'accurate',
      rank: null,
      hasRank: false,
      active: true,
      source: 'oggdude',
    })
  })

  it('exposes category and weapon-type tags through getTags()', () => {
    const weapon = {
      damage: { weapon: 6 },
      range: 'medium',
      weaponType: 'heavy-blaster',
      restrictionLevel: 'restricted',
      qualities: [{ key: 'blast', rank: 2, hasRank: true, active: true, source: 'base' }],
      flags: {},
      system: { restrictionLevel: 'restricted' },
      defense: { block: 0, parry: 0 },
      schema: { fields: { broken: { label: 'Broken' } } },
      config: {
        category: { label: 'Ranged' },
      },
      broken: false,
    }

    const tags = SwerpgWeapon.prototype.getTags.call(weapon, 'full')
    expect(tags.category).toBe('Ranged')
    expect(tags['weapon-type']).toBe('Heavy Blaster')
    expect(tags.restricted).toBe(game.i18n.localize('ITEM.RESTRICTION_LEVEL.RESTRICTED'))
    expect(tags['blast']).toBe(game.i18n.localize('WEAPON.QUALITIES.Blast') + ' 2')
  })

  it('short scope excludes qualities and range', () => {
    const weapon = {
      damage: { weapon: 6 },
      range: 'medium',
      weaponType: 'lightsaber',
      restrictionLevel: 'none',
      qualities: [],
      flags: {},
      system: {},
      defense: { block: 0, parry: 0 },
      config: {
        category: { label: 'Melee', reload: false },
      },
      broken: false,
    }
    const tags = SwerpgWeapon.prototype.getTags.call(weapon, 'short')
    expect(tags.damage).toBe('6 Damage')
    expect(tags.category).toBe('Melee')
    expect(tags['weapon-type']).toBe('Lightsaber')
    expect(tags.reload).toBeUndefined()
    expect(tags.range).toBeUndefined()
  })

  it('reload tag present only when category.reload is true', () => {
    const noReload = SwerpgWeapon.prototype.getTags.call(
      {
        damage: { weapon: 4 },
        weaponType: 'melee',
        qualities: [],
        flags: {},
        system: {},
        defense: { block: 0, parry: 0 },
        config: { category: { label: 'Melee', reload: false } },
        broken: false,
      },
      'short',
    )
    expect(noReload.reload).toBeUndefined()

    const withReload = SwerpgWeapon.prototype.getTags.call(
      {
        damage: { weapon: 6 },
        weaponType: 'heavy-blaster',
        qualities: [],
        flags: {},
        system: {},
        defense: { block: 0, parry: 0 },
        config: { category: { label: 'Ranged', reload: true } },
        broken: false,
      },
      'short',
    )
    expect(withReload.reload).toBe('Reload')
  })
})

describe('SwerpgWeapon - schema taxonomy', () => {
  it('declares ITEM_CATEGORIES as the canonical weapon taxonomy', () => {
    expect(SwerpgWeapon.ITEM_CATEGORIES).toBe(SYSTEM.WEAPON.CATEGORIES)
    expect(SwerpgWeapon.ITEM_CATEGORIES).toHaveProperty('melee')
    expect(SwerpgWeapon.ITEM_CATEGORIES).toHaveProperty('ranged')
    expect(SwerpgWeapon.ITEM_CATEGORIES).toHaveProperty('gunnery')
    expect(SwerpgWeapon.ITEM_CATEGORIES).toHaveProperty('explosive')
    expect(SwerpgWeapon.ITEM_CATEGORIES).toHaveProperty('thrown')
    expect(SwerpgWeapon.ITEM_CATEGORIES).toHaveProperty('vehicle')
    expect(SwerpgWeapon.ITEM_CATEGORIES).toHaveProperty('natural')
  })

  it('uses ranged as DEFAULT_CATEGORY', () => {
    expect(SwerpgWeapon.DEFAULT_CATEGORY).toBe('ranged')
  })

  it('defines system.weaponType in the schema', () => {
    if (globalThis.foundry?.data?.fields) {
      if (!globalThis.foundry.data.fields.EmbeddedDataField) {
        globalThis.foundry.data.fields.EmbeddedDataField = class EmbeddedDataField {
          constructor(type) {
            this.type = type
          }
        }
      }
      if (!globalThis.foundry.data.fields.HTMLField) {
        globalThis.foundry.data.fields.HTMLField = class extends globalThis.foundry.data.fields.StringField {}
      }
    }
    const weaponSchema = SwerpgWeapon.defineSchema()
    expect(weaponSchema.weaponType).toBeDefined()
    expect(weaponSchema.weaponType.config.required).toBe(false)
    expect(weaponSchema.weaponType.config.initial).toBe('')
  })

  it('category fallback uses DEFAULT_CATEGORY when value is invalid', () => {
    const categories = SYSTEM.WEAPON.CATEGORIES
    // Simulate the same lookup prepareBaseData does
    const invalidCategory = 'nonexistent'
    const resolved = invalidCategory in categories ? categories[invalidCategory] : categories[SwerpgWeapon.DEFAULT_CATEGORY]
    expect(resolved).toBeDefined()
    expect(resolved.id).toBe(SwerpgWeapon.DEFAULT_CATEGORY)
  })

  it('every category entry has required runtime metadata', () => {
    const categories = SYSTEM.WEAPON.CATEGORIES
    for (const [key, cat] of Object.entries(categories)) {
      expect(cat.id).toBe(key)
      expect(cat.label).toBeTruthy()
      expect(typeof cat.ranged).toBe('boolean')
      expect(typeof cat.reload).toBe('boolean')
      expect(typeof cat.hands).toBe('number')
      expect(Array.isArray(cat.scaling)).toBe(true)
      expect(cat.rangeCategory).toBeDefined()
    }
  })

  it('inherits restrictionLevel from SwerpgPhysicalItem schema', () => {
    if (globalThis.foundry?.data?.fields) {
      if (!globalThis.foundry.data.fields.EmbeddedDataField) {
        globalThis.foundry.data.fields.EmbeddedDataField = class EmbeddedDataField {
          constructor(type) {
            this.type = type
          }
        }
      }
      if (!globalThis.foundry.data.fields.HTMLField) {
        globalThis.foundry.data.fields.HTMLField = class extends globalThis.foundry.data.fields.StringField {}
      }
    }
    const weaponSchema = SwerpgWeapon.defineSchema()
    expect(weaponSchema.restrictionLevel).toBeDefined()
    expect(weaponSchema.restrictionLevel.config.required).toBe(true)
    expect(weaponSchema.restrictionLevel.config.initial).toBe('none')
    expect(weaponSchema.restrictionLevel.config.choices).toBe(SYSTEM.RESTRICTION_LEVELS)

    const { none, restricted, military, illegal } = SYSTEM.RESTRICTION_LEVELS

    expect(none.id).toBe('none')
    expect(restricted.id).toBe('restricted')
    expect(military.id).toBe('military')
    expect(illegal.id).toBe('illegal')
  })
})
