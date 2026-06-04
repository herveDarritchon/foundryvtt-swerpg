import { describe, expect, it } from 'vitest'

import {
  computeResalePrice,
  SELL_BASE_FRACTION,
  SELL_NEGOTIATED_FRACTION,
  SELL_MAX_FRACTION,
  SELL_DISASTER_FRACTION,
} from '../../../module/lib/market/sell-valuation.mjs'

/* -------------------------------------------- */
/*  Tests                                       */
/* -------------------------------------------- */

describe('computeResalePrice', () => {
  /* -------------------------------------------- */
  /*  Default (failure / no negotiation)          */
  /* -------------------------------------------- */

  describe('default outcome (failure)', () => {
    it('returns 25% of basePrice when no negotiation outcome is given', () => {
      const result = computeResalePrice({ basePrice: 100 })
      expect(result.resalePrice).toBe(25)
      expect(result.fraction).toBe(SELL_BASE_FRACTION)
    })

    it('returns 25% when negotiationOutcome is explicitly "failure"', () => {
      const result = computeResalePrice({ basePrice: 200, negotiationOutcome: 'failure' })
      expect(result.resalePrice).toBe(50)
      expect(result.fraction).toBe(SELL_BASE_FRACTION)
    })

    it('returns the base price, fraction, and outcome in the result', () => {
      const result = computeResalePrice({ basePrice: 80, negotiationOutcome: 'failure' })
      expect(result.basePrice).toBe(80)
      expect(result.outcome).toBe('failure')
    })
  })

  /* -------------------------------------------- */
  /*  Success (50%)                               */
  /* -------------------------------------------- */

  describe('outcome: success', () => {
    it('returns 50% of basePrice on success', () => {
      const result = computeResalePrice({ basePrice: 100, negotiationOutcome: 'success' })
      expect(result.resalePrice).toBe(50)
      expect(result.fraction).toBe(SELL_NEGOTIATED_FRACTION)
    })

    it('returns correct outcome label', () => {
      const result = computeResalePrice({ basePrice: 100, negotiationOutcome: 'success' })
      expect(result.outcome).toBe('success')
    })
  })

  /* -------------------------------------------- */
  /*  Triumph (75%)                               */
  /* -------------------------------------------- */

  describe('outcome: triumph', () => {
    it('returns 75% of basePrice on triumph', () => {
      const result = computeResalePrice({ basePrice: 100, negotiationOutcome: 'triumph' })
      expect(result.resalePrice).toBe(75)
      expect(result.fraction).toBe(SELL_MAX_FRACTION)
    })

    it('returns correct outcome label', () => {
      const result = computeResalePrice({ basePrice: 200, negotiationOutcome: 'triumph' })
      expect(result.outcome).toBe('triumph')
    })
  })

  /* -------------------------------------------- */
  /*  Disaster (10%)                              */
  /* -------------------------------------------- */

  describe('outcome: disaster', () => {
    it('returns 10% of basePrice on disaster', () => {
      const result = computeResalePrice({ basePrice: 100, negotiationOutcome: 'disaster' })
      expect(result.resalePrice).toBe(10)
      expect(result.fraction).toBe(SELL_DISASTER_FRACTION)
    })

    it('returns correct outcome label', () => {
      const result = computeResalePrice({ basePrice: 100, negotiationOutcome: 'disaster' })
      expect(result.outcome).toBe('disaster')
    })
  })

  /* -------------------------------------------- */
  /*  Edge cases                                  */
  /* -------------------------------------------- */

  describe('edge cases', () => {
    it('returns resalePrice = 0 when basePrice is 0', () => {
      const result = computeResalePrice({ basePrice: 0, negotiationOutcome: 'triumph' })
      expect(result.resalePrice).toBe(0)
    })

    it('always returns an integer (floors the result)', () => {
      // 100 * 0.25 = 25 (exact), 33 * 0.25 = 8.25 → 8
      const result = computeResalePrice({ basePrice: 33, negotiationOutcome: 'failure' })
      expect(Number.isInteger(result.resalePrice)).toBe(true)
      expect(result.resalePrice).toBe(8)
    })

    it('floors the result on success (50%)', () => {
      // 33 * 0.5 = 16.5 → 16
      const result = computeResalePrice({ basePrice: 33, negotiationOutcome: 'success' })
      expect(result.resalePrice).toBe(16)
      expect(Number.isInteger(result.resalePrice)).toBe(true)
    })

    it('floors the result on triumph (75%)', () => {
      // 33 * 0.75 = 24.75 → 24
      const result = computeResalePrice({ basePrice: 33, negotiationOutcome: 'triumph' })
      expect(result.resalePrice).toBe(24)
    })

    it('floors the result on disaster (10%)', () => {
      // 33 * 0.10 = 3.3 → 3
      const result = computeResalePrice({ basePrice: 33, negotiationOutcome: 'disaster' })
      expect(result.resalePrice).toBe(3)
    })
  })

  /* -------------------------------------------- */
  /*  Input validation                            */
  /* -------------------------------------------- */

  describe('input validation', () => {
    it('throws TypeError when basePrice is negative', () => {
      expect(() => computeResalePrice({ basePrice: -1 })).toThrow(TypeError)
    })

    it('throws TypeError when basePrice is NaN', () => {
      expect(() => computeResalePrice({ basePrice: NaN })).toThrow(TypeError)
    })

    it('throws TypeError when basePrice is Infinity', () => {
      expect(() => computeResalePrice({ basePrice: Infinity })).toThrow(TypeError)
    })

    it('throws TypeError when basePrice is undefined', () => {
      expect(() => computeResalePrice({})).toThrow(TypeError)
    })

    it('defaults to "failure" outcome for unknown outcome strings', () => {
      const result = computeResalePrice({ basePrice: 100, negotiationOutcome: 'unknown-outcome' })
      expect(result.fraction).toBe(SELL_BASE_FRACTION)
      expect(result.resalePrice).toBe(25)
    })
  })

  /* -------------------------------------------- */
  /*  Broken item multiplier                      */
  /* -------------------------------------------- */

  describe('brokenMultiplier', () => {
    it('applies brokenMultiplier=50 to the normal resale value (failure outcome)', () => {
      // basePrice=100, failure=25%, then 50% of 25 = 12 (floor)
      const result = computeResalePrice({ basePrice: 100, negotiationOutcome: 'failure', brokenMultiplier: 50 })
      expect(result.resalePrice).toBe(12)
      expect(result.brokenApplied).toBe(true)
    })

    it('applies brokenMultiplier=50 to success outcome resale value', () => {
      // basePrice=100, success=50%, then 50% of 50 = 25
      const result = computeResalePrice({ basePrice: 100, negotiationOutcome: 'success', brokenMultiplier: 50 })
      expect(result.resalePrice).toBe(25)
      expect(result.brokenApplied).toBe(true)
    })

    it('applies brokenMultiplier=100 leaves the resale price unchanged', () => {
      // 100% of the normal resale value = no reduction
      const result = computeResalePrice({ basePrice: 100, negotiationOutcome: 'failure', brokenMultiplier: 100 })
      expect(result.resalePrice).toBe(25)
      expect(result.brokenApplied).toBe(true)
    })

    it('applies brokenMultiplier=0 yields resale price of 0', () => {
      const result = computeResalePrice({ basePrice: 100, negotiationOutcome: 'success', brokenMultiplier: 0 })
      expect(result.resalePrice).toBe(0)
      expect(result.brokenApplied).toBe(true)
    })

    it('brokenApplied=false when brokenMultiplier is null (default)', () => {
      const result = computeResalePrice({ basePrice: 100 })
      expect(result.brokenApplied).toBe(false)
    })

    it('brokenApplied=false when brokenMultiplier is not provided', () => {
      const result = computeResalePrice({ basePrice: 100, negotiationOutcome: 'failure' })
      expect(result.brokenApplied).toBe(false)
    })

    it('floors the result after applying brokenMultiplier', () => {
      // basePrice=33, failure=25% → 8, then 50% of 8 = 4 (exact here, but test general floor)
      const result = computeResalePrice({ basePrice: 33, negotiationOutcome: 'failure', brokenMultiplier: 50 })
      expect(Number.isInteger(result.resalePrice)).toBe(true)
      expect(result.resalePrice).toBe(4)
    })

    it('applies custom multiplier (e.g. 75%)', () => {
      // basePrice=100, failure=25%, then 75% of 25 = 18 (floor 18.75)
      const result = computeResalePrice({ basePrice: 100, negotiationOutcome: 'failure', brokenMultiplier: 75 })
      expect(result.resalePrice).toBe(18)
      expect(result.brokenApplied).toBe(true)
    })
  })

  /* -------------------------------------------- */
  /*  Immutability                                */
  /* -------------------------------------------- */

  describe('immutability', () => {
    it('does not mutate the input object', () => {
      const params = { basePrice: 100, negotiationOutcome: 'success' }
      const before = JSON.stringify(params)
      computeResalePrice(params)
      expect(JSON.stringify(params)).toBe(before)
    })
  })
})
