import { describe, expect, it } from 'vitest'

import { aggravateObligation, computeEffectiveValue, reduceObligation, transformObligation } from '../../../module/lib/obligations/obligation-evolution.mjs'

/**
 * Helpers for building minimal plain-object obligation snapshots for tests.
 */
function makeObligation({ value = 10, campaignDelta = 0, campaignNote = null, transformedTo = null } = {}) {
  return { value, campaignDelta, campaignNote, transformedTo }
}

// ─────────────────────────────────────────────────────────────────────────────
// computeEffectiveValue
// ─────────────────────────────────────────────────────────────────────────────

describe('computeEffectiveValue', () => {
  it('returns the base value when no campaign delta is set', () => {
    expect(computeEffectiveValue(makeObligation({ value: 10 }))).toBe(10)
  })

  it('adds a positive campaign delta to the base value', () => {
    expect(computeEffectiveValue(makeObligation({ value: 10, campaignDelta: 5 }))).toBe(15)
  })

  it('subtracts a negative campaign delta from the base value', () => {
    expect(computeEffectiveValue(makeObligation({ value: 10, campaignDelta: -5 }))).toBe(5)
  })

  it('clamps to 0 when the delta exceeds the base value', () => {
    expect(computeEffectiveValue(makeObligation({ value: 10, campaignDelta: -15 }))).toBe(0)
  })

  it('returns 0 for a fully cancelled obligation', () => {
    expect(computeEffectiveValue(makeObligation({ value: 10, campaignDelta: -10 }))).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// reduceObligation
// ─────────────────────────────────────────────────────────────────────────────

describe('reduceObligation', () => {
  it('returns a new delta reduced by the given amount', () => {
    const result = reduceObligation(makeObligation({ value: 10 }), 3)
    expect(result.campaignDelta).toBe(-3)
  })

  it('accumulates reductions on top of an existing delta', () => {
    const result = reduceObligation(makeObligation({ value: 10, campaignDelta: -3 }), 2)
    expect(result.campaignDelta).toBe(-5)
  })

  it('clamps the delta so the effective value never falls below 0', () => {
    const result = reduceObligation(makeObligation({ value: 10 }), 20)
    expect(result.campaignDelta).toBe(-10)
    expect(computeEffectiveValue({ value: 10, campaignDelta: result.campaignDelta })).toBe(0)
  })

  it('records the supplied note', () => {
    const result = reduceObligation(makeObligation(), 5, 'Debt repaid after rescue mission')
    expect(result.campaignNote).toBe('Debt repaid after rescue mission')
  })

  it('preserves the existing note when none is supplied', () => {
    const obl = makeObligation({ campaignNote: 'previous note' })
    const result = reduceObligation(obl, 2)
    expect(result.campaignNote).toBe('previous note')
  })

  it('preserves the existing transformedTo value', () => {
    const obl = makeObligation({ transformedTo: 'Family Debt' })
    const result = reduceObligation(obl, 2)
    expect(result.transformedTo).toBe('Family Debt')
  })

  it('throws RangeError for amount = 0', () => {
    expect(() => reduceObligation(makeObligation(), 0)).toThrow(RangeError)
  })

  it('throws RangeError for a negative amount', () => {
    expect(() => reduceObligation(makeObligation(), -5)).toThrow(RangeError)
  })

  it('throws RangeError for a non-integer amount', () => {
    expect(() => reduceObligation(makeObligation(), 2.5)).toThrow(RangeError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// aggravateObligation
// ─────────────────────────────────────────────────────────────────────────────

describe('aggravateObligation', () => {
  it('increases the delta by the given amount', () => {
    const result = aggravateObligation(makeObligation({ value: 10 }), 5)
    expect(result.campaignDelta).toBe(5)
  })

  it('accumulates aggravations on top of an existing delta', () => {
    const result = aggravateObligation(makeObligation({ value: 10, campaignDelta: 5 }), 3)
    expect(result.campaignDelta).toBe(8)
  })

  it('can aggravate an already-reduced obligation', () => {
    const result = aggravateObligation(makeObligation({ value: 10, campaignDelta: -5 }), 2)
    expect(result.campaignDelta).toBe(-3)
  })

  it('records the supplied note', () => {
    const result = aggravateObligation(makeObligation(), 5, 'New debt contracted after Imperial raid')
    expect(result.campaignNote).toBe('New debt contracted after Imperial raid')
  })

  it('preserves the existing note when none is supplied', () => {
    const obl = makeObligation({ campaignNote: 'old note' })
    const result = aggravateObligation(obl, 3)
    expect(result.campaignNote).toBe('old note')
  })

  it('preserves the existing transformedTo value', () => {
    const obl = makeObligation({ transformedTo: 'Gang Debt' })
    const result = aggravateObligation(obl, 3)
    expect(result.transformedTo).toBe('Gang Debt')
  })

  it('throws RangeError for amount = 0', () => {
    expect(() => aggravateObligation(makeObligation(), 0)).toThrow(RangeError)
  })

  it('throws RangeError for a negative amount', () => {
    expect(() => aggravateObligation(makeObligation(), -3)).toThrow(RangeError)
  })

  it('throws RangeError for a non-integer amount', () => {
    expect(() => aggravateObligation(makeObligation(), 1.5)).toThrow(RangeError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// transformObligation
// ─────────────────────────────────────────────────────────────────────────────

describe('transformObligation', () => {
  it('sets transformedTo to the given non-empty label', () => {
    const result = transformObligation(makeObligation(), 'Imperial Bounty')
    expect(result.transformedTo).toBe('Imperial Bounty')
  })

  it('trims whitespace from the label', () => {
    const result = transformObligation(makeObligation(), '  Debt  ')
    expect(result.transformedTo).toBe('Debt')
  })

  it('does not change the campaignDelta', () => {
    const obl = makeObligation({ campaignDelta: -3 })
    const result = transformObligation(obl, 'New Nature')
    expect(result.campaignDelta).toBe(-3)
  })

  it('records the supplied note', () => {
    const result = transformObligation(makeObligation(), 'Smuggler Debt', 'Original crime lord defeated; debt passed to the Pykes')
    expect(result.campaignNote).toBe('Original crime lord defeated; debt passed to the Pykes')
  })

  it('preserves the existing note when none is supplied', () => {
    const obl = makeObligation({ campaignNote: 'prior note' })
    const result = transformObligation(obl, 'New Nature')
    expect(result.campaignNote).toBe('prior note')
  })

  it('throws TypeError for an empty string', () => {
    expect(() => transformObligation(makeObligation(), '')).toThrow(TypeError)
  })

  it('throws TypeError for a blank string', () => {
    expect(() => transformObligation(makeObligation(), '   ')).toThrow(TypeError)
  })

  it('throws TypeError for a non-string value', () => {
    expect(() => transformObligation(makeObligation(), null)).toThrow(TypeError)
    expect(() => transformObligation(makeObligation(), 42)).toThrow(TypeError)
  })
})
