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
