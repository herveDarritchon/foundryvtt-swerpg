import { describe, test, expect } from 'vitest'
import { DEFAULT_QUALITY, DEFAULT_RESTRICTION_LEVEL, QUALITY_TIERS } from '../../module/config/items.mjs'
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
})