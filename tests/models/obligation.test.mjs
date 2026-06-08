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
    // Campaign evolution fields
    expect(schema).toHaveProperty('campaignDelta')
    expect(schema).toHaveProperty('campaignNote')
    expect(schema).toHaveProperty('transformedTo')
  })

  it('defines exactly eight fields — no accidental field added or removed', () => {
    const schema = SwerpgObligation.defineSchema()
    expect(Object.keys(schema)).toHaveLength(8)
  })

  it('campaignDelta defaults to 0', () => {
    const schema = SwerpgObligation.defineSchema()
    expect(schema.campaignDelta.config.initial).toBe(0)
  })

  it('campaignNote defaults to null', () => {
    const schema = SwerpgObligation.defineSchema()
    expect(schema.campaignNote.config.initial).toBeNull()
  })

  it('transformedTo defaults to null', () => {
    const schema = SwerpgObligation.defineSchema()
    expect(schema.transformedTo.config.initial).toBeNull()
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
