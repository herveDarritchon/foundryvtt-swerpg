import { describe, expect, it } from 'vitest'

import SwerpgObligation from '../../module/models/obligation.mjs'

/**
 * Tests for SwerpgObligation data model contract.
 *
 * The model is tested against the mock TypeDataModel provided by vitest-setup.js.
 * These tests lock the schema contract (field names and presence), the localization
 * prefix, and the documented no-op status of validateJoint.
 */
describe('SwerpgObligation — schema contract', () => {
  it('defineSchema returns an object with the expected fields', () => {
    const schema = SwerpgObligation.defineSchema()

    expect(schema).toHaveProperty('description')
    expect(schema).toHaveProperty('value')
    expect(schema).toHaveProperty('isExtra')
    expect(schema).toHaveProperty('extraXp')
    expect(schema).toHaveProperty('extraCredits')
  })

  it('defines exactly five fields — no accidental field added or removed', () => {
    const schema = SwerpgObligation.defineSchema()
    expect(Object.keys(schema)).toHaveLength(5)
  })

  it('LOCALIZATION_PREFIXES includes OBLIGATION', () => {
    expect(SwerpgObligation.LOCALIZATION_PREFIXES).toContain('OBLIGATION')
  })
})

describe('SwerpgObligation — validateJoint', () => {
  it('is a static method (no-op by design)', () => {
    expect(typeof SwerpgObligation.validateJoint).toBe('function')
  })

  it('does not throw for valid data', () => {
    expect(() =>
      SwerpgObligation.validateJoint({
        value: 10,
        isExtra: false,
        extraXp: 0,
        extraCredits: 0,
      }),
    ).not.toThrow()
  })

  it('does not throw for extra obligation data', () => {
    expect(() =>
      SwerpgObligation.validateJoint({
        value: 15,
        isExtra: true,
        extraXp: 5,
        extraCredits: 1000,
      }),
    ).not.toThrow()
  })

  it('returns undefined (documented no-op)', () => {
    const result = SwerpgObligation.validateJoint({ value: 10, isExtra: false, extraXp: 0, extraCredits: 0 })
    expect(result).toBeUndefined()
  })
})
