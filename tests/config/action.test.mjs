import { describe, test, expect } from 'vitest'
import {
  DEFAULT_DEFENSE_TYPE,
  DEFAULT_RESOURCE,
  DEFAULT_RESOURCE_MORALE,
  MOVEMENT_SLOWED_MULTIPLIER,
  MOVEMENT_HASTENED_DIVISOR,
  MOVEMENT_PRONE_PENALTY,
  SUMMON_LEVEL_DIVISOR,
} from '../../module/config/action.mjs'
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

  describe('MOVEMENT_SLOWED_MULTIPLIER', () => {
    test('equals 2', () => {
      expect(MOVEMENT_SLOWED_MULTIPLIER).toBe(2)
    })

    test('is a positive number', () => {
      expect(typeof MOVEMENT_SLOWED_MULTIPLIER).toBe('number')
      expect(MOVEMENT_SLOWED_MULTIPLIER).toBeGreaterThan(0)
    })

    test('is exposed on SYSTEM.ACTION.MOVEMENT_SLOWED_MULTIPLIER', () => {
      expect(SYSTEM.ACTION.MOVEMENT_SLOWED_MULTIPLIER).toBe(MOVEMENT_SLOWED_MULTIPLIER)
    })
  })

  describe('MOVEMENT_HASTENED_DIVISOR', () => {
    test('equals 2', () => {
      expect(MOVEMENT_HASTENED_DIVISOR).toBe(2)
    })

    test('is a positive number', () => {
      expect(typeof MOVEMENT_HASTENED_DIVISOR).toBe('number')
      expect(MOVEMENT_HASTENED_DIVISOR).toBeGreaterThan(0)
    })

    test('is exposed on SYSTEM.ACTION.MOVEMENT_HASTENED_DIVISOR', () => {
      expect(SYSTEM.ACTION.MOVEMENT_HASTENED_DIVISOR).toBe(MOVEMENT_HASTENED_DIVISOR)
    })
  })

  describe('MOVEMENT_PRONE_PENALTY', () => {
    test('equals 2', () => {
      expect(MOVEMENT_PRONE_PENALTY).toBe(2)
    })

    test('is a positive number', () => {
      expect(typeof MOVEMENT_PRONE_PENALTY).toBe('number')
      expect(MOVEMENT_PRONE_PENALTY).toBeGreaterThan(0)
    })

    test('is exposed on SYSTEM.ACTION.MOVEMENT_PRONE_PENALTY', () => {
      expect(SYSTEM.ACTION.MOVEMENT_PRONE_PENALTY).toBe(MOVEMENT_PRONE_PENALTY)
    })
  })

  describe('SUMMON_LEVEL_DIVISOR', () => {
    test('equals 2', () => {
      expect(SUMMON_LEVEL_DIVISOR).toBe(2)
    })

    test('is a positive number', () => {
      expect(typeof SUMMON_LEVEL_DIVISOR).toBe('number')
      expect(SUMMON_LEVEL_DIVISOR).toBeGreaterThan(0)
    })

    test('is exposed on SYSTEM.ACTION.SUMMON_LEVEL_DIVISOR', () => {
      expect(SYSTEM.ACTION.SUMMON_LEVEL_DIVISOR).toBe(SUMMON_LEVEL_DIVISOR)
    })
  })
})
