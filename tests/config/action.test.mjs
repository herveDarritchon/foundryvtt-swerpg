import { describe, test, expect } from 'vitest'
import { DEFAULT_DEFENSE_TYPE, DEFAULT_RESOURCE, DEFAULT_RESOURCE_MORALE } from '../../module/config/action.mjs'
import { SYSTEM } from '../../module/config/system.mjs'

describe('action config — ADR-0018 contractual constants', () => {
  describe('DEFAULT_DEFENSE_TYPE', () => {
    test('equals "physical"', () => {
      expect(DEFAULT_DEFENSE_TYPE).toBe('physical')
    })

    test('is a non-empty string', () => {
      expect(typeof DEFAULT_DEFENSE_TYPE).toBe('string')
      expect(DEFAULT_DEFENSE_TYPE.length).toBeGreaterThan(0)
    })

    test('is exposed on SYSTEM.ACTION.DEFAULT_DEFENSE_TYPE', () => {
      expect(SYSTEM.ACTION.DEFAULT_DEFENSE_TYPE).toBe(DEFAULT_DEFENSE_TYPE)
    })
  })

  describe('DEFAULT_RESOURCE', () => {
    test('equals "health"', () => {
      expect(DEFAULT_RESOURCE).toBe('health')
    })

    test('is a non-empty string', () => {
      expect(typeof DEFAULT_RESOURCE).toBe('string')
      expect(DEFAULT_RESOURCE.length).toBeGreaterThan(0)
    })

    test('is exposed on SYSTEM.ACTION.DEFAULT_RESOURCE', () => {
      expect(SYSTEM.ACTION.DEFAULT_RESOURCE).toBe(DEFAULT_RESOURCE)
    })
  })

  describe('DEFAULT_RESOURCE_MORALE', () => {
    test('equals "morale"', () => {
      expect(DEFAULT_RESOURCE_MORALE).toBe('morale')
    })

    test('is a non-empty string', () => {
      expect(typeof DEFAULT_RESOURCE_MORALE).toBe('string')
      expect(DEFAULT_RESOURCE_MORALE.length).toBeGreaterThan(0)
    })

    test('is exposed on SYSTEM.ACTION.DEFAULT_RESOURCE_MORALE', () => {
      expect(SYSTEM.ACTION.DEFAULT_RESOURCE_MORALE).toBe(DEFAULT_RESOURCE_MORALE)
    })
  })
})
