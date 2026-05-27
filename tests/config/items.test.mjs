import { describe, test, expect } from 'vitest'
import { DEFAULT_QUALITY, DEFAULT_RESTRICTION_LEVEL, QUALITY_TIERS, ENCHANTMENT_TIERS } from '../../module/config/items.mjs'
import { SYSTEM } from '../../module/config/system.mjs'

describe('items config — ADR-0018 contractual constants', () => {
  describe('DEFAULT_QUALITY', () => {
    test('is a key of QUALITY_TIERS', () => {
      expect(DEFAULT_QUALITY in QUALITY_TIERS).toBe(true)
    })

    test('equals "standard"', () => {
      expect(DEFAULT_QUALITY).toBe('standard')
    })

    test('is exposed on SYSTEM.DEFAULT_QUALITY', () => {
      expect(SYSTEM.DEFAULT_QUALITY).toBe(DEFAULT_QUALITY)
    })
  })

  describe('DEFAULT_RESTRICTION_LEVEL', () => {
    test('equals "none"', () => {
      expect(DEFAULT_RESTRICTION_LEVEL).toBe('none')
    })

    test('is a non-empty string', () => {
      expect(typeof DEFAULT_RESTRICTION_LEVEL).toBe('string')
      expect(DEFAULT_RESTRICTION_LEVEL.length).toBeGreaterThan(0)
    })

    test('is exposed on SYSTEM.DEFAULT_RESTRICTION_LEVEL', () => {
      expect(SYSTEM.DEFAULT_RESTRICTION_LEVEL).toBe(DEFAULT_RESTRICTION_LEVEL)
    })
  })

  describe('QUALITY_TIERS', () => {
    test('defines shoddy, standard, fine, superior, masterwork', () => {
      const expected = ['shoddy', 'standard', 'fine', 'superior', 'masterwork']
      for (const key of expected) {
        expect(QUALITY_TIERS).toHaveProperty(key)
      }
    })

    test('each tier has id, label, bonus, rarity', () => {
      for (const tier of Object.values(QUALITY_TIERS)) {
        expect(tier).toHaveProperty('id')
        expect(tier).toHaveProperty('label')
        expect(tier).toHaveProperty('bonus')
        expect(tier).toHaveProperty('rarity')
      }
    })

    test('each tier id matches its registry key', () => {
      for (const [key, tier] of Object.entries(QUALITY_TIERS)) {
        expect(tier.id).toBe(key)
      }
    })

    test('is exposed on SYSTEM.QUALITY_TIERS', () => {
      expect(SYSTEM.QUALITY_TIERS).toBe(QUALITY_TIERS)
    })
  })

  describe('ENCHANTMENT_TIERS', () => {
    test('defines mundane, minor, major, legendary', () => {
      const expected = ['mundane', 'minor', 'major', 'legendary']
      for (const key of expected) {
        expect(ENCHANTMENT_TIERS).toHaveProperty(key)
      }
    })

    test('each tier has id, label, bonus, rarity', () => {
      for (const tier of Object.values(ENCHANTMENT_TIERS)) {
        expect(tier).toHaveProperty('id')
        expect(tier).toHaveProperty('label')
        expect(tier).toHaveProperty('bonus')
        expect(tier).toHaveProperty('rarity')
      }
    })

    test('each tier id matches its registry key', () => {
      for (const [key, tier] of Object.entries(ENCHANTMENT_TIERS)) {
        expect(tier.id).toBe(key)
      }
    })

    test('is exposed on SYSTEM.ENCHANTMENT_TIERS', () => {
      expect(SYSTEM.ENCHANTMENT_TIERS).toBe(ENCHANTMENT_TIERS)
    })
  })
})
