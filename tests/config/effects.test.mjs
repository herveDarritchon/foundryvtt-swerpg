import { describe, test, expect } from 'vitest'
import { EFFECT_ID_LENGTH, HALF_ABILITY_DIVISOR } from '../../module/config/effects.mjs'
import { SYSTEM } from '../../module/config/system.mjs'

describe('effects config — ADR-0018 contractual constants', () => {
  describe('EFFECT_ID_LENGTH', () => {
    test('equals 16', () => {
      expect(EFFECT_ID_LENGTH).toBe(16)
    })

    test('is a positive integer', () => {
      expect(typeof EFFECT_ID_LENGTH).toBe('number')
      expect(Number.isInteger(EFFECT_ID_LENGTH)).toBe(true)
      expect(EFFECT_ID_LENGTH).toBeGreaterThan(0)
    })

    test('is exposed on SYSTEM.EFFECTS.EFFECT_ID_LENGTH', () => {
      expect(SYSTEM.EFFECTS.EFFECT_ID_LENGTH).toBe(EFFECT_ID_LENGTH)
    })
  })

  describe('HALF_ABILITY_DIVISOR', () => {
    test('equals 2', () => {
      expect(HALF_ABILITY_DIVISOR).toBe(2)
    })

    test('is a positive number', () => {
      expect(typeof HALF_ABILITY_DIVISOR).toBe('number')
      expect(HALF_ABILITY_DIVISOR).toBeGreaterThan(0)
    })

    test('is exposed on SYSTEM.EFFECTS.HALF_ABILITY_DIVISOR', () => {
      expect(SYSTEM.EFFECTS.HALF_ABILITY_DIVISOR).toBe(HALF_ABILITY_DIVISOR)
    })
  })
})
