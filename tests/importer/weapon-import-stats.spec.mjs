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

describe('weaponMapper - stats and fallbacks', () => {
  beforeEach(() => {
    resetWeaponImportStats()
  })

  it('records unknown skills and falls back to default skill', () => {
    const xmlWeapons = [
      {
        Name: 'Unknown Skill Blaster',
        Key: 'unknown-skill',
        SkillKey: 'UNKNOWN_SKILL',
        Range: 'Short',
        Damage: 3,
        Crit: 2,
        Qualities: {
          Quality: { Key: 'Accurate', Count: 1 },
        },
      },
    ]

    const result = weaponMapper(xmlWeapons)
    expect(result).toHaveLength(1)
    expect(result[0].system.skill).toBe('rangedLight')

    const stats = getWeaponImportStats()
    expect(stats.unknownSkills).toBe(1)
    expect(stats.skillDetails).toContain('UNKNOWN_SKILL')
  })

  it('records unknown qualities and excludes them from mapped set', () => {
    const xmlWeapons = [
      {
        Name: 'Unknown Quality Saber',
        Key: 'unknown-quality',
        SkillKey: 'Melee',
        Range: 'Engaged',
        Damage: 3,
        Crit: 1,
        Qualities: {
          Quality: [
            { Key: 'UnknownQ', Count: 2 },
            { Key: 'Breach', Count: 1 },
          ],
        },
      },
    ]

    const result = weaponMapper(xmlWeapons)
    expect(result[0].system.qualities).toEqual(['breach'])
    expect(result[0].flags.swerpg.oggdudeQualities).toEqual([{ id: 'breach', count: 1 }])

    const stats = getWeaponImportStats()
    expect(stats.unknownQualities).toBe(1)
    expect(stats.qualityDetails).toContain('UnknownQ')
  })

  it('falls back to medium range when code is unknown', () => {
    const xmlWeapons = [
      {
        Name: 'Unknown Range Prototype',
        Key: 'unknown-range',
        SkillKey: 'RangedHeavy',
        RangeValue: 'wrOrbit',
        Damage: 2,
        Crit: 2,
        Qualities: {
          Quality: { Key: 'Accurate', Count: 1 },
        },
      },
    ]

    const result = weaponMapper(xmlWeapons)
    expect(result[0].system.range).toBe('medium')
  })

  it('aggregates duplicate qualities into flag counts', () => {
    const xmlWeapons = [
      {
        Name: 'Duplicate Quality Test',
        Key: 'dup-quality',
        SkillKey: 'RangedLight',
        Range: 'Short',
        Damage: 3,
        Crit: 2,
        Qualities: {
          Quality: [
            { Key: 'BLAST', Count: 1 },
            { Key: 'Blast', Count: 2 },
            { Key: 'blast', Count: '3' },
          ],
        },
      },
    ]

    const result = weaponMapper(xmlWeapons)
    expect(result[0].flags.swerpg.oggdudeQualities).toEqual([{ id: 'blast', count: 6 }])
  })
})
