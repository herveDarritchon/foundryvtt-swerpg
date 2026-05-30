import { describe, expect, it } from 'vitest'

import {
  computeNegotiatedPrice,
  rarityToDifficulty,
  NEGOTIATION_DISCOUNT_PER_SUCCESS,
  NEGOTIATION_MAX_DISCOUNT,
  NEGOTIATION_DISASTER_PENALTY,
  NEGOTIATION_RARITY_TO_DIFFICULTY,
} from '../../../module/lib/market/negotiation.mjs'

/* -------------------------------------------- */
/*  computeNegotiatedPrice                      */
/* -------------------------------------------- */

describe('computeNegotiatedPrice', () => {
  /* -------------------------------------------- */
  /*  Success path                                */
  /* -------------------------------------------- */

  describe('success — positive success ranks', () => {
    it('applies a 5% discount per success rank', () => {
      const result = computeNegotiatedPrice({ originalPrice: 100, successRanks: 1, isDisaster: false })
      expect(result.outcome).toBe('success')
      expect(result.finalPrice).toBe(Math.floor(100 * (1 - NEGOTIATION_DISCOUNT_PER_SUCCESS)))
    })

    it('applies 2 ranks → 10% discount', () => {
      const result = computeNegotiatedPrice({ originalPrice: 100, successRanks: 2, isDisaster: false })
      expect(result.finalPrice).toBe(90)
    })

    it('applies 3 ranks → 15% discount', () => {
      const result = computeNegotiatedPrice({ originalPrice: 100, successRanks: 3, isDisaster: false })
      expect(result.finalPrice).toBe(85)
    })

    it('caps discount at 30% (6+ ranks)', () => {
      const result = computeNegotiatedPrice({ originalPrice: 100, successRanks: 6, isDisaster: false })
      expect(result.outcome).toBe('success')
      expect(result.finalPrice).toBe(Math.floor(100 * (1 - NEGOTIATION_MAX_DISCOUNT)))
    })

    it('caps discount at 30% (10 ranks)', () => {
      const result = computeNegotiatedPrice({ originalPrice: 100, successRanks: 10, isDisaster: false })
      expect(result.finalPrice).toBe(70)
    })

    it('final price is always a non-negative integer', () => {
      const result = computeNegotiatedPrice({ originalPrice: 1, successRanks: 100, isDisaster: false })
      expect(result.finalPrice).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(result.finalPrice)).toBe(true)
    })

    it('includes discountFraction as a negative number on success', () => {
      const result = computeNegotiatedPrice({ originalPrice: 100, successRanks: 2, isDisaster: false })
      expect(result.discountFraction).toBeLessThan(0)
    })

    it('returns successRanks used', () => {
      const result = computeNegotiatedPrice({ originalPrice: 100, successRanks: 3, isDisaster: false })
      expect(result.successRanks).toBe(3)
    })
  })

  /* -------------------------------------------- */
  /*  Failure path (zero success ranks)           */
  /* -------------------------------------------- */

  describe('failure — zero success ranks', () => {
    it('returns outcome=failure when successRanks=0', () => {
      const result = computeNegotiatedPrice({ originalPrice: 100, successRanks: 0, isDisaster: false })
      expect(result.outcome).toBe('failure')
    })

    it('price is unchanged on failure', () => {
      const result = computeNegotiatedPrice({ originalPrice: 250, successRanks: 0, isDisaster: false })
      expect(result.finalPrice).toBe(250)
      expect(result.discountFraction).toBe(0)
    })
  })

  /* -------------------------------------------- */
  /*  Disaster path                               */
  /* -------------------------------------------- */

  describe('disaster', () => {
    it('returns outcome=disaster when isDisaster=true', () => {
      const result = computeNegotiatedPrice({ originalPrice: 100, successRanks: 0, isDisaster: true })
      expect(result.outcome).toBe('disaster')
    })

    it('price increases by 10% on disaster', () => {
      const result = computeNegotiatedPrice({ originalPrice: 100, successRanks: 0, isDisaster: true })
      expect(result.finalPrice).toBe(Math.floor(100 * (1 + NEGOTIATION_DISASTER_PENALTY)))
      expect(result.finalPrice).toBe(110)
    })

    it('disaster takes precedence over positive success ranks', () => {
      const result = computeNegotiatedPrice({ originalPrice: 100, successRanks: 5, isDisaster: true })
      expect(result.outcome).toBe('disaster')
      expect(result.finalPrice).toBe(110)
    })

    it('discountFraction is the penalty (positive) on disaster', () => {
      const result = computeNegotiatedPrice({ originalPrice: 100, successRanks: 0, isDisaster: true })
      expect(result.discountFraction).toBe(NEGOTIATION_DISASTER_PENALTY)
    })

    it('successRanks is 0 in disaster result regardless of input', () => {
      const result = computeNegotiatedPrice({ originalPrice: 100, successRanks: 4, isDisaster: true })
      expect(result.successRanks).toBe(0)
    })
  })

  /* -------------------------------------------- */
  /*  Free items (price = 0)                      */
  /* -------------------------------------------- */

  describe('free items', () => {
    it('free item stays free on success', () => {
      const result = computeNegotiatedPrice({ originalPrice: 0, successRanks: 3, isDisaster: false })
      expect(result.finalPrice).toBe(0)
    })

    it('free item stays free on disaster (0 * 1.1 = 0)', () => {
      const result = computeNegotiatedPrice({ originalPrice: 0, successRanks: 0, isDisaster: true })
      expect(result.finalPrice).toBe(0)
    })
  })

  /* -------------------------------------------- */
  /*  Input validation                            */
  /* -------------------------------------------- */

  describe('input validation', () => {
    it('throws TypeError for negative originalPrice', () => {
      expect(() => computeNegotiatedPrice({ originalPrice: -1, successRanks: 0, isDisaster: false })).toThrow(TypeError)
    })

    it('throws TypeError for non-finite originalPrice', () => {
      expect(() => computeNegotiatedPrice({ originalPrice: NaN, successRanks: 0, isDisaster: false })).toThrow(TypeError)
    })

    it('throws TypeError for negative successRanks', () => {
      expect(() => computeNegotiatedPrice({ originalPrice: 100, successRanks: -1, isDisaster: false })).toThrow(TypeError)
    })
  })

  /* -------------------------------------------- */
  /*  Immutability                                */
  /* -------------------------------------------- */

  describe('immutability', () => {
    it('does not mutate input params', () => {
      const params = { originalPrice: 100, successRanks: 2, isDisaster: false }
      const before = JSON.stringify(params)
      computeNegotiatedPrice(params)
      expect(JSON.stringify(params)).toBe(before)
    })
  })
})

/* -------------------------------------------- */
/*  rarityToDifficulty                          */
/* -------------------------------------------- */

describe('rarityToDifficulty', () => {
  it('rarity 0 → difficulty 1', () => {
    expect(rarityToDifficulty(0)).toBe(1)
  })

  it('rarity 2 → difficulty 1', () => {
    expect(rarityToDifficulty(2)).toBe(1)
  })

  it('rarity 3 → difficulty 2', () => {
    expect(rarityToDifficulty(3)).toBe(2)
  })

  it('rarity 5 → difficulty 3', () => {
    expect(rarityToDifficulty(5)).toBe(3)
  })

  it('rarity 7 → difficulty 4', () => {
    expect(rarityToDifficulty(7)).toBe(4)
  })

  it('rarity 9 → difficulty 5', () => {
    expect(rarityToDifficulty(9)).toBe(5)
  })

  it('rarity 10 → difficulty 5', () => {
    expect(rarityToDifficulty(10)).toBe(5)
  })

  it('clamps rarity above 10 to 10 (difficulty 5)', () => {
    expect(rarityToDifficulty(15)).toBe(5)
  })

  it('clamps rarity below 0 to 0 (difficulty 1)', () => {
    expect(rarityToDifficulty(-5)).toBe(1)
  })

  it('covers all bands in NEGOTIATION_RARITY_TO_DIFFICULTY', () => {
    for (const band of NEGOTIATION_RARITY_TO_DIFFICULTY) {
      const result = rarityToDifficulty(band.minRarity)
      expect(result).toBe(band.difficulty)
    }
  })
})
