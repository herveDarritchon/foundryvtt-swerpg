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
    expect(weapon.system.qualities).toEqual(['blast', 'burn'])
    expect(weapon.flags.swerpg.oggdudeQualities).toEqual([
      { id: 'blast', count: 2 },
      { id: 'burn', count: 3 },
    ])

    const tags = weapon.flags.swerpg.oggdudeTags
    expect(tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'type', value: 'Blasters' }),
        expect.objectContaining({ type: 'type', value: 'Heavy' }),
        expect.objectContaining({ type: 'category', value: 'Ranged' }),
        expect.objectContaining({ type: 'category', value: 'Starship' }),
        expect.objectContaining({ type: 'status', value: 'restricted' }),
      ]),
    )

    expect(weapon.flags.swerpg.oggdude.sizeHigh).toBe(2.5)
    expect(weapon.flags.swerpg.oggdude.source).toEqual({ name: 'Core Rulebook', page: 123 })
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

    expect(weapon.system.qualities).toEqual(['accurate', 'blast'])
    expect(weapon.flags.swerpg.oggdudeQualities).toEqual([
      { id: 'accurate', count: 1 },
      { id: 'blast', count: 3 },
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
  })

  it('exposes oggdude tags through weapon getTags()', () => {
    const weapon = {
      damage: { weapon: 6 },
      range: 'medium',
      qualities: new Set(['blast']),
      flags: {
        swerpg: {
          oggdudeTags: [
            { type: 'type', value: 'Explosive', label: 'Type: Explosive' },
            { type: 'category', value: 'Ranged', label: 'Category: Ranged' },
            { type: 'status', value: 'restricted', label: 'Restricted' },
          ],
        },
      },
      system: { restricted: true },
      defense: { block: 0, parry: 0 },
      schema: { fields: { broken: { label: 'Broken' } } },
      broken: false,
    }

    const tags = SwerpgWeapon.prototype.getTags.call(weapon, 'full')
    expect(tags['type-explosive']).toBe('Type: Explosive')
    expect(tags['category-ranged']).toBe('Category: Ranged')
    expect(tags.restricted).toBe('Restricted')
  })
})
