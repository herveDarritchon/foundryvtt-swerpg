import { describe, test, expect } from 'vitest'
import { DEFAULT_THREAT, TAXONOMY_CATEGORIES } from '../../module/config/adversaries.mjs'
import { SYSTEM } from '../../module/config/system.mjs'

describe('adversaries config — ADR-0018 contractual constants', () => {
  describe('DEFAULT_THREAT', () => {
    test('equals "normal"', () => {
      expect(DEFAULT_THREAT).toBe('normal')
    })

    test('is a key of SYSTEM.THREAT_LEVELS', () => {
      expect(DEFAULT_THREAT in SYSTEM.THREAT_LEVELS).toBe(true)
    })

    test('is a non-empty string', () => {
      expect(typeof DEFAULT_THREAT).toBe('string')
      expect(DEFAULT_THREAT.length).toBeGreaterThan(0)
    })

    test('is exposed on SYSTEM.ADVERSARY.DEFAULT_THREAT', () => {
      expect(SYSTEM.ADVERSARY.DEFAULT_THREAT).toBe(DEFAULT_THREAT)
    })
  })

  describe('TAXONOMY_CATEGORIES', () => {
    test('defines expected categories', () => {
      const expected = ['beast', 'elemental', 'giant', 'humanoid', 'outsider', 'undead']
      for (const key of expected) {
        expect(TAXONOMY_CATEGORIES).toHaveProperty(key)
      }
    })
  })
})