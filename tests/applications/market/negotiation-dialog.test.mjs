import { describe, expect, it } from 'vitest'

import { mapOutcomeToSale, TRIUMPH_THRESHOLD } from '../../../module/applications/market/negotiation-dialog.mjs'
import { computeResalePrice } from '../../../module/lib/market/sell-valuation.mjs'

/* -------------------------------------------- */
/*  TRIUMPH_THRESHOLD                           */
/* -------------------------------------------- */

describe('TRIUMPH_THRESHOLD', () => {
  it('is defined and equals 4', () => {
    expect(TRIUMPH_THRESHOLD).toBe(4)
  })
})

/* -------------------------------------------- */
/*  mapOutcomeToSale                            */
/* -------------------------------------------- */

describe('mapOutcomeToSale', () => {
  /* -------------------------------------------- */
  /*  Failure outcome                             */
  /* -------------------------------------------- */

  describe('failure', () => {
    it('returns "failure" when successRanks is 0 and isDisaster is false', () => {
      expect(mapOutcomeToSale({ successRanks: 0, isDisaster: false })).toBe('failure')
    })

    it('returns "failure" when called without isDisaster (defaults to undefined → falsy)', () => {
      expect(mapOutcomeToSale({ successRanks: 0 })).toBe('failure')
    })
  })

  /* -------------------------------------------- */
  /*  Success outcome                             */
  /* -------------------------------------------- */

  describe('success', () => {
    it('returns "success" when successRanks is between 1 and TRIUMPH_THRESHOLD-1', () => {
      expect(mapOutcomeToSale({ successRanks: 1, isDisaster: false })).toBe('success')
      expect(mapOutcomeToSale({ successRanks: 2, isDisaster: false })).toBe('success')
      expect(mapOutcomeToSale({ successRanks: 3, isDisaster: false })).toBe('success')
    })
  })

  /* -------------------------------------------- */
  /*  Triumph outcome                             */
  /* -------------------------------------------- */

  describe('triumph', () => {
    it('returns "triumph" when successRanks equals TRIUMPH_THRESHOLD', () => {
      const result = mapOutcomeToSale({ successRanks: TRIUMPH_THRESHOLD, isDisaster: false })
      expect(result).toBe('triumph')
    })

    it('returns "triumph" when successRanks exceeds TRIUMPH_THRESHOLD', () => {
      expect(mapOutcomeToSale({ successRanks: 5, isDisaster: false })).toBe('triumph')
      expect(mapOutcomeToSale({ successRanks: 10, isDisaster: false })).toBe('triumph')
    })
  })

  /* -------------------------------------------- */
  /*  Disaster outcome                            */
  /* -------------------------------------------- */

  describe('disaster', () => {
    it('returns "disaster" when isDisaster is true regardless of successRanks', () => {
      expect(mapOutcomeToSale({ successRanks: 0, isDisaster: true })).toBe('disaster')
      expect(mapOutcomeToSale({ successRanks: 4, isDisaster: true })).toBe('disaster')
      expect(mapOutcomeToSale({ successRanks: 10, isDisaster: true })).toBe('disaster')
    })
  })
})

/* -------------------------------------------- */
/*  Combined flow: mapOutcomeToSale → computeResalePrice */
/* -------------------------------------------- */

describe('sale price computation via mapOutcomeToSale + computeResalePrice', () => {
  const BASE_PRICE = 100

  it('failure → fraction 25% → finalPrice = 25', () => {
    const outcome = mapOutcomeToSale({ successRanks: 0, isDisaster: false })
    const result = computeResalePrice({ basePrice: BASE_PRICE, negotiationOutcome: outcome })
    expect(result.outcome).toBe('failure')
    expect(result.fraction).toBe(0.25)
    expect(result.resalePrice).toBe(25)
  })

  it('success → fraction 50% → finalPrice = 50', () => {
    const outcome = mapOutcomeToSale({ successRanks: 2, isDisaster: false })
    const result = computeResalePrice({ basePrice: BASE_PRICE, negotiationOutcome: outcome })
    expect(result.outcome).toBe('success')
    expect(result.fraction).toBe(0.5)
    expect(result.resalePrice).toBe(50)
  })

  it('triumph → fraction 75% → finalPrice = 75', () => {
    const outcome = mapOutcomeToSale({ successRanks: 4, isDisaster: false })
    const result = computeResalePrice({ basePrice: BASE_PRICE, negotiationOutcome: outcome })
    expect(result.outcome).toBe('triumph')
    expect(result.fraction).toBe(0.75)
    expect(result.resalePrice).toBe(75)
  })

  it('disaster → fraction 10% → finalPrice = 10', () => {
    const outcome = mapOutcomeToSale({ successRanks: 1, isDisaster: true })
    const result = computeResalePrice({ basePrice: BASE_PRICE, negotiationOutcome: outcome })
    expect(result.outcome).toBe('disaster')
    expect(result.fraction).toBe(0.1)
    expect(result.resalePrice).toBe(10)
  })
})
