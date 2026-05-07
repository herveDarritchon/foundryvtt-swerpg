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
    expect(result[0].system.qualities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'breach', hasRank: false }),
      ])
    )

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
    const blastQuality = result[0].system.qualities.find(q => q.key === 'blast')
    expect(blastQuality).toMatchObject({ key: 'blast', rank: 6, hasRank: true })
  })

  it('records unknown weapon types and falls back to slugified weaponType', () => {
    const xmlWeapons = [
      {
        Name: 'Mysterious Blaster',
        Key: 'mysterious',
        SkillKey: 'RangedLight',
        Range: 'Short',
        Damage: 3,
        Crit: 2,
        Type: 'Quantum/Plasma',
        Qualities: {
          Quality: { Key: 'Accurate', Count: 1 },
        },
      },
    ]

    const result = weaponMapper(xmlWeapons)
    expect(result).toHaveLength(1)

    // Unknown type → slugified
    expect(result[0].system.weaponType).toBe('quantum-plasma')
    // Raw type preserved in flags
    expect(result[0].flags.swerpg.oggdude.type).toBe('Quantum/Plasma')

    const stats = getWeaponImportStats()
    expect(stats.unknownTypes).toBe(1)
    expect(stats.typeDetails).toContain('Quantum/Plasma')
  })

  it('falls back category from SkillKey when no Categories match', () => {
    const xmlWeapons = [
      {
        Name: 'Mystery Melee',
        Key: 'mystery-melee',
        SkillKey: 'Melee',
        Range: 'Engaged',
        Damage: 3,
        Crit: 2,
        Qualities: {
          Quality: { Key: 'Breach', Count: 1 },
        },
      },
    ]

    const result = weaponMapper(xmlWeapons)
    expect(result[0].system.category).toBe('melee')

    const stats = getWeaponImportStats()
    expect(stats.categoryFallbacks).toBeGreaterThan(0)
  })

  it('uses default category when both Categories and SkillKey are absent', () => {
    const xmlWeapons = [
      {
        Name: 'No Hints',
        Key: 'no-hints',
        SkillKey: 'UNDEFINED_SKILL',
        Range: 'UNDEFINED_RANGE',
        Damage: 1,
        Crit: 1,
        Qualities: {
          Quality: { Key: 'Accurate', Count: 1 },
        },
      },
    ]

    const result = weaponMapper(xmlWeapons)
    expect(result[0].system.category).toBe('ranged')
  })

  it('records unknown category values', () => {
    const xmlWeapons = [
      {
        Name: 'Weird Category',
        Key: 'weird-cat',
        SkillKey: 'RangedLight',
        Range: 'Short',
        Damage: 2,
        Crit: 2,
        Categories: {
          Category: ['TotallyUnknownCategory'],
        },
        Qualities: {
          Quality: { Key: 'Accurate', Count: 1 },
        },
      },
    ]

    const result = weaponMapper(xmlWeapons)
    expect(result).toHaveLength(1)

    const stats = getWeaponImportStats()
    expect(stats.unknownCategories).toBe(1)
    expect(stats.categoryDetails).toContain('TotallyUnknownCategory')
  })
})
