import { describe, expect, it } from 'vitest'

import { deriveNegotiationRollState, mapOutcomeToSale, TRIUMPH_THRESHOLD } from '../../../module/applications/market/negotiation-dialog.mjs'
import { computeNegotiatedPrice } from '../../../module/lib/market/negotiation.mjs'
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

/* -------------------------------------------- */
/*  deriveNegotiationRollState                  */
/* -------------------------------------------- */

/**
 * Build a minimal StandardCheck-like result object for testing.
 * Only the fields consumed by deriveNegotiationRollState are needed.
 * @param {object} params
 * @param {number} params.total             Roll total.
 * @param {number} params.dc                Difficulty class.
 * @param {boolean} [params.criticalFailure] Whether to simulate a critical failure.
 */
function makeRollResult({ total, dc, criticalFailure = false }) {
  return {
    total,
    data: { dc },
    isCriticalFailure: criticalFailure,
  }
}

describe('deriveNegotiationRollState', () => {
  /* -------------------------------------------- */
  /*  successRanks derivation                     */
  /* -------------------------------------------- */

  describe('successRanks', () => {
    it('returns 0 successRanks when total equals dc (no margin)', () => {
      const roll = makeRollResult({ total: 14, dc: 14 })
      const { successRanks } = deriveNegotiationRollState(roll)
      expect(successRanks).toBe(0)
    })

    it('returns 0 successRanks when total is below dc (failure)', () => {
      const roll = makeRollResult({ total: 10, dc: 14 })
      const { successRanks } = deriveNegotiationRollState(roll)
      expect(successRanks).toBe(0)
    })

    it('returns positive successRanks equal to the positive margin above dc', () => {
      const roll = makeRollResult({ total: 17, dc: 14 })
      const { successRanks } = deriveNegotiationRollState(roll)
      expect(successRanks).toBe(3)
    })

    it('returns 1 successRank when total exceeds dc by 1', () => {
      const roll = makeRollResult({ total: 15, dc: 14 })
      const { successRanks } = deriveNegotiationRollState(roll)
      expect(successRanks).toBe(1)
    })

    it('returns high successRanks for large margin (e.g. triumph territory)', () => {
      const roll = makeRollResult({ total: 22, dc: 14 })
      const { successRanks } = deriveNegotiationRollState(roll)
      expect(successRanks).toBe(8)
    })
  })

  /* -------------------------------------------- */
  /*  isDisaster derivation                       */
  /* -------------------------------------------- */

  describe('isDisaster', () => {
    it('returns isDisaster=false when isCriticalFailure is false', () => {
      const roll = makeRollResult({ total: 8, dc: 14, criticalFailure: false })
      const { isDisaster } = deriveNegotiationRollState(roll)
      expect(isDisaster).toBe(false)
    })

    it('returns isDisaster=true when isCriticalFailure is true', () => {
      const roll = makeRollResult({ total: 3, dc: 14, criticalFailure: true })
      const { isDisaster } = deriveNegotiationRollState(roll)
      expect(isDisaster).toBe(true)
    })

    it('returns isDisaster=false for a normal failure (not critical)', () => {
      const roll = makeRollResult({ total: 12, dc: 14, criticalFailure: false })
      const { isDisaster } = deriveNegotiationRollState(roll)
      expect(isDisaster).toBe(false)
    })
  })
})

/* -------------------------------------------- */
/*  Full roll flow: deriveNegotiationRollState  */
/*  → mapOutcomeToSale/computeNegotiatedPrice   */
/* -------------------------------------------- */

describe('roll-derived negotiation flow — buy mode', () => {
  const BASE_PRICE = 100

  it('simple failure (total=dc) → outcome=failure, price unchanged', () => {
    const roll = makeRollResult({ total: 14, dc: 14 })
    const state = deriveNegotiationRollState(roll)
    const result = computeNegotiatedPrice({ originalPrice: BASE_PRICE, ...state })
    expect(result.outcome).toBe('failure')
    expect(result.finalPrice).toBe(100)
  })

  it('simple success (1 rank above dc) → outcome=success, price discounted 5%', () => {
    const roll = makeRollResult({ total: 15, dc: 14 })
    const state = deriveNegotiationRollState(roll)
    const result = computeNegotiatedPrice({ originalPrice: BASE_PRICE, ...state })
    expect(result.outcome).toBe('success')
    expect(result.finalPrice).toBe(95)
  })

  it('strong success (4 ranks above dc) → outcome=success, price discounted 20%', () => {
    const roll = makeRollResult({ total: 18, dc: 14 })
    const state = deriveNegotiationRollState(roll)
    const result = computeNegotiatedPrice({ originalPrice: BASE_PRICE, ...state })
    expect(result.outcome).toBe('success')
    expect(result.finalPrice).toBe(80)
  })

  it('disaster (critical failure) → outcome=disaster, price increased 10%', () => {
    const roll = makeRollResult({ total: 3, dc: 14, criticalFailure: true })
    const state = deriveNegotiationRollState(roll)
    const result = computeNegotiatedPrice({ originalPrice: BASE_PRICE, ...state })
    expect(result.outcome).toBe('disaster')
    expect(result.finalPrice).toBe(110)
  })
})

describe('roll-derived negotiation flow — sale mode', () => {
  const BASE_PRICE = 100

  it('simple failure → outcome=failure, resale 25%', () => {
    const roll = makeRollResult({ total: 10, dc: 14 })
    const state = deriveNegotiationRollState(roll)
    const outcome = mapOutcomeToSale(state)
    const result = computeResalePrice({ basePrice: BASE_PRICE, negotiationOutcome: outcome })
    expect(result.outcome).toBe('failure')
    expect(result.resalePrice).toBe(25)
  })

  it('simple success (1–3 ranks) → outcome=success, resale 50%', () => {
    const roll = makeRollResult({ total: 16, dc: 14 })
    const state = deriveNegotiationRollState(roll)
    const outcome = mapOutcomeToSale(state)
    const result = computeResalePrice({ basePrice: BASE_PRICE, negotiationOutcome: outcome })
    expect(result.outcome).toBe('success')
    expect(result.resalePrice).toBe(50)
  })

  it('triumph (≥4 ranks above dc) → outcome=triumph, resale 75%', () => {
    // total=18, dc=14 → margin=4 = TRIUMPH_THRESHOLD
    const roll = makeRollResult({ total: 18, dc: 14 })
    const state = deriveNegotiationRollState(roll)
    const outcome = mapOutcomeToSale(state)
    const result = computeResalePrice({ basePrice: BASE_PRICE, negotiationOutcome: outcome })
    expect(result.outcome).toBe('triumph')
    expect(result.resalePrice).toBe(75)
  })

  it('disaster (critical failure) → outcome=disaster, resale 10%', () => {
    const roll = makeRollResult({ total: 3, dc: 14, criticalFailure: true })
    const state = deriveNegotiationRollState(roll)
    const outcome = mapOutcomeToSale(state)
    const result = computeResalePrice({ basePrice: BASE_PRICE, negotiationOutcome: outcome })
    expect(result.outcome).toBe('disaster')
    expect(result.resalePrice).toBe(10)
  })
})
