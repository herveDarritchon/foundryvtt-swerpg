import { describe, test, expect } from 'vitest'
import { DEFAULT_CATEGORY, CATEGORIES } from '../../module/config/armor.mjs'
import { SYSTEM } from '../../module/config/system.mjs'

describe('armor config — ADR-0018 contractual constants', () => {
  describe('DEFAULT_CATEGORY', () => {
    test('is a key of CATEGORIES', () => {
      expect(DEFAULT_CATEGORY in CATEGORIES).toBe(true)
    })

    test('equals "medium"', () => {
      expect(DEFAULT_CATEGORY).toBe('medium')
    })

    test('is exposed on SYSTEM.ARMOR.DEFAULT_CATEGORY', () => {
      expect(SYSTEM.ARMOR.DEFAULT_CATEGORY).toBe(DEFAULT_CATEGORY)
    })

    test('is a non-empty string', () => {
      expect(typeof DEFAULT_CATEGORY).toBe('string')
      expect(DEFAULT_CATEGORY.length).toBeGreaterThan(0)
    })
  })
})
