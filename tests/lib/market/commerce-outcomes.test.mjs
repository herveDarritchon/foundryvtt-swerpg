import { describe, expect, it } from 'vitest'

import {
  computeCommerceOutcome,
  COMMERCE_OUTCOMES,
  COMMERCE_CONSEQUENCE_TYPES,
  COMMERCE_OUTCOME_PRICE_ADVANTAGE,
  COMMERCE_OUTCOME_PRICE_THREAT,
  COMMERCE_OUTCOME_PRICE_DISASTER,
} from '../../../module/lib/market/commerce-outcomes.mjs'

/* -------------------------------------------- */
/*  Constants                                   */
/* -------------------------------------------- */

describe('COMMERCE_OUTCOMES', () => {
  it('defines all five outcome labels', () => {
    expect(COMMERCE_OUTCOMES.SUCCESS).toBe('success')
    expect(COMMERCE_OUTCOMES.ADVANTAGE).toBe('advantage')
    expect(COMMERCE_OUTCOMES.THREAT).toBe('threat')
    expect(COMMERCE_OUTCOMES.TRIUMPH).toBe('triumph')
    expect(COMMERCE_OUTCOMES.DISASTER).toBe('disaster')
  })

  it('is frozen', () => {
    expect(Object.isFrozen(COMMERCE_OUTCOMES)).toBe(true)
  })
})

describe('COMMERCE_CONSEQUENCE_TYPES', () => {
  it('defines contact and tracked', () => {
    expect(COMMERCE_CONSEQUENCE_TYPES.CONTACT).toBe('contact')
    expect(COMMERCE_CONSEQUENCE_TYPES.TRACKED).toBe('tracked')
  })

  it('is frozen', () => {
    expect(Object.isFrozen(COMMERCE_CONSEQUENCE_TYPES)).toBe(true)
  })
})

describe('price modifier constants', () => {
  it('ADVANTAGE modifier is −0.1', () => {
    expect(COMMERCE_OUTCOME_PRICE_ADVANTAGE).toBe(-0.1)
  })

  it('THREAT modifier is +0.1', () => {
    expect(COMMERCE_OUTCOME_PRICE_THREAT).toBe(0.1)
  })

  it('DISASTER modifier is +0.1', () => {
    expect(COMMERCE_OUTCOME_PRICE_DISASTER).toBe(0.1)
  })
})

/* -------------------------------------------- */
/*  computeCommerceOutcome                      */
/* -------------------------------------------- */

describe('computeCommerceOutcome', () => {
  describe('success (neutral)', () => {
    it('returns success for all-zero input', () => {
      const result = computeCommerceOutcome({ netAdvantage: 0, netThreat: 0, hasTriumph: false, hasDespair: false })
      expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.SUCCESS)
      expect(result.priceModifier).toBe(0)
      expect(result.narrativeKeys).toEqual([])
      expect(result.consequenceType).toBeNull()
    })

    it('returns success when called with no argument (defaults to success)', () => {
      const result = computeCommerceOutcome()
      expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.SUCCESS)
      expect(result.priceModifier).toBe(0)
    })

    it('returns success when called with empty object', () => {
      const result = computeCommerceOutcome({})
      expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.SUCCESS)
      expect(result.narrativeKeys).toEqual([])
    })
  })

  describe('advantage', () => {
    it('returns advantage for positive netAdvantage', () => {
      const result = computeCommerceOutcome({ netAdvantage: 2, netThreat: 0, hasTriumph: false, hasDespair: false })
      expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.ADVANTAGE)
      expect(result.priceModifier).toBe(COMMERCE_OUTCOME_PRICE_ADVANTAGE)
      expect(result.consequenceType).toBeNull()
    })

    it('narrativeKeys contain Discount and GoodCondition', () => {
      const result = computeCommerceOutcome({ netAdvantage: 1 })
      expect(result.narrativeKeys).toContain('MARKET.CommerceOutcome.Advantage.Discount')
      expect(result.narrativeKeys).toContain('MARKET.CommerceOutcome.Advantage.GoodCondition')
    })

    it('applies −10% price modifier', () => {
      const result = computeCommerceOutcome({ netAdvantage: 3 })
      expect(result.priceModifier).toBe(-0.1)
    })
  })

  describe('threat', () => {
    it('returns threat for positive netThreat', () => {
      const result = computeCommerceOutcome({ netAdvantage: 0, netThreat: 1, hasTriumph: false, hasDespair: false })
      expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.THREAT)
      expect(result.priceModifier).toBe(COMMERCE_OUTCOME_PRICE_THREAT)
      expect(result.consequenceType).toBeNull()
    })

    it('narrativeKeys contain all four threat keys', () => {
      const result = computeCommerceOutcome({ netThreat: 2 })
      expect(result.narrativeKeys).toContain('MARKET.CommerceOutcome.Threat.PriceIncrease')
      expect(result.narrativeKeys).toContain('MARKET.CommerceOutcome.Threat.Delay')
      expect(result.narrativeKeys).toContain('MARKET.CommerceOutcome.Threat.VendorTalkative')
      expect(result.narrativeKeys).toContain('MARKET.CommerceOutcome.Threat.Surveillance')
    })

    it('applies +10% price modifier', () => {
      const result = computeCommerceOutcome({ netThreat: 1 })
      expect(result.priceModifier).toBe(0.1)
    })

    it('returns threat when netThreat dominates (netThreat > netAdvantage both positive)', () => {
      const result = computeCommerceOutcome({ netAdvantage: 1, netThreat: 2 })
      expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.THREAT)
    })
  })

  describe('triumph', () => {
    it('returns triumph when hasTriumph is true', () => {
      const result = computeCommerceOutcome({ netAdvantage: 5, netThreat: 0, hasTriumph: true, hasDespair: false })
      expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.TRIUMPH)
      expect(result.priceModifier).toBe(0)
      expect(result.consequenceType).toBe(COMMERCE_CONSEQUENCE_TYPES.CONTACT)
    })

    it('narrativeKeys contain all three triumph keys', () => {
      const result = computeCommerceOutcome({ hasTriumph: true })
      expect(result.narrativeKeys).toContain('MARKET.CommerceOutcome.Triumph.LastingContact')
      expect(result.narrativeKeys).toContain('MARKET.CommerceOutcome.Triumph.SuperiorItem')
      expect(result.narrativeKeys).toContain('MARKET.CommerceOutcome.Triumph.BonusInfo')
    })

    it('triumph does not modify the price', () => {
      const result = computeCommerceOutcome({ hasTriumph: true })
      expect(result.priceModifier).toBe(0)
    })

    it('triumph sets consequenceType to contact', () => {
      const result = computeCommerceOutcome({ hasTriumph: true })
      expect(result.consequenceType).toBe('contact')
    })
  })

  describe('disaster', () => {
    it('returns disaster when hasDespair is true', () => {
      const result = computeCommerceOutcome({ netAdvantage: 0, netThreat: 0, hasTriumph: false, hasDespair: true })
      expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.DISASTER)
      expect(result.priceModifier).toBe(COMMERCE_OUTCOME_PRICE_DISASTER)
      expect(result.consequenceType).toBe(COMMERCE_CONSEQUENCE_TYPES.TRACKED)
    })

    it('narrativeKeys contain all four disaster keys', () => {
      const result = computeCommerceOutcome({ hasDespair: true })
      expect(result.narrativeKeys).toContain('MARKET.CommerceOutcome.Disaster.Scam')
      expect(result.narrativeKeys).toContain('MARKET.CommerceOutcome.Disaster.Ambush')
      expect(result.narrativeKeys).toContain('MARKET.CommerceOutcome.Disaster.TrackedItem')
      expect(result.narrativeKeys).toContain('MARKET.CommerceOutcome.Disaster.ImperialIntervention')
    })

    it('applies +10% price modifier (scam)', () => {
      const result = computeCommerceOutcome({ hasDespair: true })
      expect(result.priceModifier).toBe(0.1)
    })
  })

  describe('priority resolution', () => {
    it('Despair beats Triumph when both are present', () => {
      const result = computeCommerceOutcome({ hasTriumph: true, hasDespair: true })
      expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.DISASTER)
    })

    it('Triumph beats netThreat when both are present', () => {
      const result = computeCommerceOutcome({ netThreat: 3, hasTriumph: true })
      expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.TRIUMPH)
    })

    it('Triumph beats netAdvantage when both are present', () => {
      const result = computeCommerceOutcome({ netAdvantage: 5, hasTriumph: true })
      expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.TRIUMPH)
    })

    it('Despair beats netAdvantage when both are present', () => {
      const result = computeCommerceOutcome({ netAdvantage: 10, hasDespair: true })
      expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.DISASTER)
    })

    it('netThreat beats netAdvantage when netThreat > 0', () => {
      const result = computeCommerceOutcome({ netAdvantage: 5, netThreat: 1 })
      expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.THREAT)
    })
  })

  describe('edge cases', () => {
    it('netAdvantage of 0 with netThreat of 0 gives success', () => {
      const result = computeCommerceOutcome({ netAdvantage: 0, netThreat: 0 })
      expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.SUCCESS)
    })

    it('large netAdvantage still returns advantage', () => {
      const result = computeCommerceOutcome({ netAdvantage: 100 })
      expect(result.outcomeLabel).toBe(COMMERCE_OUTCOMES.ADVANTAGE)
    })

    it('all outcomes return a non-null outcomeLabel', () => {
      const inputs = [{}, { netAdvantage: 1 }, { netThreat: 1 }, { hasTriumph: true }, { hasDespair: true }]
      for (const input of inputs) {
        const result = computeCommerceOutcome(input)
        expect(result.outcomeLabel).toBeTruthy()
      }
    })

    it('all outcomes return an array for narrativeKeys', () => {
      const inputs = [{}, { netAdvantage: 1 }, { netThreat: 1 }, { hasTriumph: true }, { hasDespair: true }]
      for (const input of inputs) {
        const result = computeCommerceOutcome(input)
        expect(Array.isArray(result.narrativeKeys)).toBe(true)
      }
    })
  })
})
