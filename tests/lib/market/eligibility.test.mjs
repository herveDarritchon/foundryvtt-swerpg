import { describe, test, expect } from 'vitest'
import { evaluateEligibility, ELIGIBILITY_REASONS } from '../../../module/lib/market/eligibility.mjs'
import { SOURCE_TYPES } from '../../../module/config/market.mjs'

/**
 * Build a minimal valid item for eligibility tests.
 * @param {object} [overrides]
 */
function makeValidItem(overrides = {}) {
  return {
    itemType: 'weapon',
    name: 'Test Blaster',
    basePrice: 100,
    sourceType: 'compendium',
    ...overrides,
  }
}

describe('evaluateEligibility', () => {
  describe('eligible item', () => {
    test('returns eligible=true and reason=null for a fully valid item', () => {
      const result = evaluateEligibility(makeValidItem())
      expect(result).toEqual({ eligible: true, reason: null })
    })

    test('accepts gear type', () => {
      const result = evaluateEligibility(makeValidItem({ itemType: 'gear' }))
      expect(result.eligible).toBe(true)
    })

    test('accepts armor type', () => {
      const result = evaluateEligibility(makeValidItem({ itemType: 'armor' }))
      expect(result.eligible).toBe(true)
    })

    test('accepts world source type', () => {
      const result = evaluateEligibility(makeValidItem({ sourceType: 'world' }))
      expect(result.eligible).toBe(true)
    })

    test('accepts basePrice of 0', () => {
      const result = evaluateEligibility(makeValidItem({ basePrice: 0 }))
      expect(result.eligible).toBe(true)
    })
  })

  describe('type-not-purchasable', () => {
    test('returns ineligible for talent type', () => {
      const result = evaluateEligibility(makeValidItem({ itemType: 'talent' }))
      expect(result).toEqual({ eligible: false, reason: ELIGIBILITY_REASONS.TYPE_NOT_PURCHASABLE })
    })

    test('returns ineligible for career type', () => {
      const result = evaluateEligibility(makeValidItem({ itemType: 'career' }))
      expect(result).toEqual({ eligible: false, reason: ELIGIBILITY_REASONS.TYPE_NOT_PURCHASABLE })
    })

    test('returns ineligible for unknown type', () => {
      const result = evaluateEligibility(makeValidItem({ itemType: 'unknown-future-type' }))
      expect(result).toEqual({ eligible: false, reason: ELIGIBILITY_REASONS.TYPE_NOT_PURCHASABLE })
    })

    test('returns ineligible for empty type', () => {
      const result = evaluateEligibility(makeValidItem({ itemType: '' }))
      expect(result).toEqual({ eligible: false, reason: ELIGIBILITY_REASONS.TYPE_NOT_PURCHASABLE })
    })
  })

  describe('missing-name', () => {
    test('returns ineligible when name is empty string', () => {
      const result = evaluateEligibility(makeValidItem({ name: '' }))
      expect(result).toEqual({ eligible: false, reason: ELIGIBILITY_REASONS.MISSING_NAME })
    })

    test('returns ineligible when name is whitespace only', () => {
      const result = evaluateEligibility(makeValidItem({ name: '   ' }))
      expect(result).toEqual({ eligible: false, reason: ELIGIBILITY_REASONS.MISSING_NAME })
    })

    test('returns ineligible when name is null', () => {
      const result = evaluateEligibility(makeValidItem({ name: null }))
      expect(result).toEqual({ eligible: false, reason: ELIGIBILITY_REASONS.MISSING_NAME })
    })

    test('returns ineligible when name is undefined', () => {
      const item = makeValidItem()
      delete item.name
      const result = evaluateEligibility(item)
      expect(result).toEqual({ eligible: false, reason: ELIGIBILITY_REASONS.MISSING_NAME })
    })
  })

  describe('missing-price', () => {
    test('returns ineligible when basePrice is null', () => {
      const result = evaluateEligibility(makeValidItem({ basePrice: null }))
      expect(result).toEqual({ eligible: false, reason: ELIGIBILITY_REASONS.MISSING_PRICE })
    })

    test('returns ineligible when basePrice is undefined', () => {
      const result = evaluateEligibility(makeValidItem({ basePrice: undefined }))
      expect(result).toEqual({ eligible: false, reason: ELIGIBILITY_REASONS.MISSING_PRICE })
    })

    test('returns ineligible when basePrice is NaN', () => {
      const result = evaluateEligibility(makeValidItem({ basePrice: NaN }))
      expect(result).toEqual({ eligible: false, reason: ELIGIBILITY_REASONS.MISSING_PRICE })
    })

    test('returns ineligible when basePrice is Infinity', () => {
      const result = evaluateEligibility(makeValidItem({ basePrice: Infinity }))
      expect(result).toEqual({ eligible: false, reason: ELIGIBILITY_REASONS.MISSING_PRICE })
    })
  })

  describe('untrusted-source', () => {
    test('returns ineligible for import source by default', () => {
      const result = evaluateEligibility(makeValidItem({ sourceType: 'import' }))
      expect(result).toEqual({ eligible: false, reason: ELIGIBILITY_REASONS.UNTRUSTED_SOURCE })
    })

    test('returns ineligible for unknown source type', () => {
      const result = evaluateEligibility(makeValidItem({ sourceType: 'unknown-source' }))
      expect(result).toEqual({ eligible: false, reason: ELIGIBILITY_REASONS.UNTRUSTED_SOURCE })
    })

    test('allows import source when allowUntrustedSources override is true', () => {
      const result = evaluateEligibility(makeValidItem({ sourceType: 'import' }), { allowUntrustedSources: true })
      expect(result.eligible).toBe(true)
    })
  })

  describe('explicitly-excluded', () => {
    test('returns ineligible when nonPurchasable is true', () => {
      const result = evaluateEligibility(makeValidItem({ nonPurchasable: true }))
      expect(result).toEqual({ eligible: false, reason: ELIGIBILITY_REASONS.EXPLICITLY_EXCLUDED })
    })

    test('does not exclude when nonPurchasable is false', () => {
      const result = evaluateEligibility(makeValidItem({ nonPurchasable: false }))
      expect(result.eligible).toBe(true)
    })
  })

  describe('item-broken', () => {
    test('returns ineligible when broken is true', () => {
      const result = evaluateEligibility(makeValidItem({ broken: true }))
      expect(result).toEqual({ eligible: false, reason: ELIGIBILITY_REASONS.ITEM_BROKEN })
    })

    test('does not exclude when broken is false', () => {
      const result = evaluateEligibility(makeValidItem({ broken: false }))
      expect(result.eligible).toBe(true)
    })
  })

  describe('decision priority (first failing rule wins)', () => {
    test('type check has higher priority than name check', () => {
      const result = evaluateEligibility(makeValidItem({ itemType: 'talent', name: '' }))
      expect(result.reason).toBe(ELIGIBILITY_REASONS.TYPE_NOT_PURCHASABLE)
    })

    test('name check has higher priority than price check', () => {
      const result = evaluateEligibility(makeValidItem({ name: '', basePrice: null }))
      expect(result.reason).toBe(ELIGIBILITY_REASONS.MISSING_NAME)
    })
  })

  describe('custom config override', () => {
    test('respects custom purchasableItemTypes', () => {
      const customTypes = { vehicle: { id: 'vehicle', label: 'Vehicle', icon: 'fa-car' } }
      const result = evaluateEligibility(
        { itemType: 'vehicle', name: 'Speeder', basePrice: 500, sourceType: 'compendium' },
        { purchasableItemTypes: customTypes, sourceTypes: SOURCE_TYPES },
      )
      expect(result.eligible).toBe(true)
    })
  })

  describe('ELIGIBILITY_REASONS constants', () => {
    test('all reason constants are non-empty strings', () => {
      for (const reason of Object.values(ELIGIBILITY_REASONS)) {
        expect(typeof reason).toBe('string')
        expect(reason.length).toBeGreaterThan(0)
      }
    })

    test('is frozen', () => {
      expect(Object.isFrozen(ELIGIBILITY_REASONS)).toBe(true)
    })
  })
})
