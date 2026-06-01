import { describe, test, expect } from 'vitest'
import { ABILITY_REQUIREMENT_OFFSET, NODE_COLOR_MIX_FACTOR, MAX_SIGNATURES_PER_TIER } from '../../module/config/talent-tree.mjs'

// Note: talent-tree.mjs imports SYSTEM and therefore cannot be re-exported
// via SYSTEM (circular dependency). Constants are consumed via direct named imports.

describe('talent-tree config — ADR-0018 contractual constants', () => {
  describe('ABILITY_REQUIREMENT_OFFSET', () => {
    test('equals 3', () => {
      expect(ABILITY_REQUIREMENT_OFFSET).toBe(3)
    })

    test('is a positive integer', () => {
      expect(typeof ABILITY_REQUIREMENT_OFFSET).toBe('number')
      expect(Number.isInteger(ABILITY_REQUIREMENT_OFFSET)).toBe(true)
      expect(ABILITY_REQUIREMENT_OFFSET).toBeGreaterThan(0)
    })
  })

  describe('NODE_COLOR_MIX_FACTOR', () => {
    test('equals 0.5', () => {
      expect(NODE_COLOR_MIX_FACTOR).toBe(0.5)
    })

    test('is a value between 0 and 1 inclusive', () => {
      expect(typeof NODE_COLOR_MIX_FACTOR).toBe('number')
      expect(NODE_COLOR_MIX_FACTOR).toBeGreaterThan(0)
      expect(NODE_COLOR_MIX_FACTOR).toBeLessThanOrEqual(1)
    })
  })

  describe('MAX_SIGNATURES_PER_TIER', () => {
    test('equals 2', () => {
      expect(MAX_SIGNATURES_PER_TIER).toBe(2)
    })

    test('is a positive integer', () => {
      expect(typeof MAX_SIGNATURES_PER_TIER).toBe('number')
      expect(Number.isInteger(MAX_SIGNATURES_PER_TIER)).toBe(true)
      expect(MAX_SIGNATURES_PER_TIER).toBeGreaterThan(0)
    })
  })
})
