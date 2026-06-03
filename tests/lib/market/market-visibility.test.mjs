import { describe, expect, it } from 'vitest'
import { isItemVisibleForMarket } from '../../../module/lib/market/market-visibility.mjs'

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

/**
 * Build a minimal MarketEntry-shaped plain object.
 * @param {object} [overrides]
 * @returns {object}
 */
function makeEntry(overrides = {}) {
  return {
    uuid: 'Item.test',
    name: 'Test Item',
    availability: 'available',
    restrictionLevel: 'none',
    ...overrides,
  }
}

/* -------------------------------------------- */
/*  Tests                                       */
/* -------------------------------------------- */

describe('isItemVisibleForMarket', () => {
  /* -------------------------------------------- */
  /*  Standard market                             */
  /* -------------------------------------------- */

  describe('standard market', () => {
    it('shows legal (none) items with available availability', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'available', restrictionLevel: 'none' }), 'standard')
      expect(result.visible).toBe(true)
      expect(result.reason).toBeNull()
    })

    it('shows legal (none) items with common availability', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'common', restrictionLevel: 'none' }), 'standard')
      expect(result.visible).toBe(true)
    })

    it('shows legal (none) items with rare availability', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'rare', restrictionLevel: 'none' }), 'standard')
      expect(result.visible).toBe(true)
    })

    it('hides restricted items (availability ok)', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'available', restrictionLevel: 'restricted' }), 'standard')
      expect(result.visible).toBe(false)
      expect(result.reason).toBe('restriction-not-allowed')
    })

    it('hides military items (availability ok)', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'available', restrictionLevel: 'military' }), 'standard')
      expect(result.visible).toBe(false)
      expect(result.reason).toBe('restriction-not-allowed')
    })

    it('hides illegal items (availability ok)', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'available', restrictionLevel: 'illegal' }), 'standard')
      expect(result.visible).toBe(false)
      expect(result.reason).toBe('restriction-not-allowed')
    })

    it('hides veryRare items (availability blocked)', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'veryRare', restrictionLevel: 'none' }), 'standard')
      expect(result.visible).toBe(false)
      expect(result.reason).toBe('availability-not-allowed')
    })
  })

  /* -------------------------------------------- */
  /*  Local market                                */
  /* -------------------------------------------- */

  describe('local market', () => {
    it('shows legal items with available availability', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'available', restrictionLevel: 'none' }), 'local')
      expect(result.visible).toBe(true)
    })

    it('shows legal items with common availability', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'common', restrictionLevel: 'none' }), 'local')
      expect(result.visible).toBe(true)
    })

    it('hides rare items (availability blocked)', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'rare', restrictionLevel: 'none' }), 'local')
      expect(result.visible).toBe(false)
      expect(result.reason).toBe('availability-not-allowed')
    })

    it('hides restricted items (availability ok, restriction blocked)', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'available', restrictionLevel: 'restricted' }), 'local')
      expect(result.visible).toBe(false)
      expect(result.reason).toBe('restriction-not-allowed')
    })

    it('hides military items', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'available', restrictionLevel: 'military' }), 'local')
      expect(result.visible).toBe(false)
      expect(result.reason).toBe('restriction-not-allowed')
    })

    it('hides illegal items', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'available', restrictionLevel: 'illegal' }), 'local')
      expect(result.visible).toBe(false)
      expect(result.reason).toBe('restriction-not-allowed')
    })
  })

  /* -------------------------------------------- */
  /*  Specialized market                          */
  /* -------------------------------------------- */

  describe('specialized market', () => {
    it('shows legal items with available availability', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'available', restrictionLevel: 'none' }), 'specialized')
      expect(result.visible).toBe(true)
    })

    it('shows restricted items with available availability', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'available', restrictionLevel: 'restricted' }), 'specialized')
      expect(result.visible).toBe(true)
    })

    it('shows military items with available availability', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'available', restrictionLevel: 'military' }), 'specialized')
      expect(result.visible).toBe(true)
    })

    it('shows restricted items with veryRare availability', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'veryRare', restrictionLevel: 'restricted' }), 'specialized')
      expect(result.visible).toBe(true)
    })

    it('hides illegal items', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'available', restrictionLevel: 'illegal' }), 'specialized')
      expect(result.visible).toBe(false)
      expect(result.reason).toBe('restriction-not-allowed')
    })

    it('shows items with "restricted" availability (derived from restrictionLevel=restricted|military)', () => {
      // With derivation, availability='restricted' comes from restrictionLevel='restricted'/'military'.
      // Specialized market allows these items (both allowedAvailability and allowedRestrictionLevels include 'restricted').
      const result = isItemVisibleForMarket(makeEntry({ availability: 'restricted', restrictionLevel: 'restricted' }), 'specialized')
      expect(result.visible).toBe(true)
    })

    it('hides items whose availability is "blackMarket" (illegal items — not in allowedAvailability)', () => {
      // blackMarket availability is not in specialized allowedAvailability; only black-market allows it
      const result = isItemVisibleForMarket(makeEntry({ availability: 'blackMarket', restrictionLevel: 'illegal' }), 'specialized')
      expect(result.visible).toBe(false)
      expect(result.reason).toBe('availability-not-allowed')
    })
  })

  /* -------------------------------------------- */
  /*  Black market                                */
  /* -------------------------------------------- */

  describe('black-market', () => {
    it('shows legal items', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'available', restrictionLevel: 'none' }), 'black-market')
      expect(result.visible).toBe(true)
    })

    it('shows restricted items', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'available', restrictionLevel: 'restricted' }), 'black-market')
      expect(result.visible).toBe(true)
    })

    it('shows military items', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'available', restrictionLevel: 'military' }), 'black-market')
      expect(result.visible).toBe(true)
    })

    it('shows illegal items', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'available', restrictionLevel: 'illegal' }), 'black-market')
      expect(result.visible).toBe(true)
    })

    it('shows all restriction levels with restricted availability', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'restricted', restrictionLevel: 'illegal' }), 'black-market')
      expect(result.visible).toBe(true)
    })

    it('respects wildcard (*) for all restriction levels', () => {
      // Wildcard means any restriction level passes — direct test of the mechanism
      for (const rl of ['none', 'restricted', 'military', 'illegal']) {
        const result = isItemVisibleForMarket(makeEntry({ availability: 'available', restrictionLevel: rl }), 'black-market')
        expect(result.visible).toBe(true)
      }
    })
  })

  /* -------------------------------------------- */
  /*  AND logic: availability × restriction       */
  /* -------------------------------------------- */

  describe('AND logic (both axes must pass)', () => {
    it('hides restricted+availabilityBlocked item: availability blocks first', () => {
      // Item availability not allowed in standard → hidden even though restrictionLevel='none'
      const result = isItemVisibleForMarket(makeEntry({ availability: 'veryRare', restrictionLevel: 'none' }), 'standard')
      expect(result.visible).toBe(false)
      expect(result.reason).toBe('availability-not-allowed')
    })

    it('hides item whose availability passes but restriction fails', () => {
      const result = isItemVisibleForMarket(makeEntry({ availability: 'available', restrictionLevel: 'illegal' }), 'standard')
      expect(result.visible).toBe(false)
      expect(result.reason).toBe('restriction-not-allowed')
    })

    it('hides item when both axes fail (availability checked first)', () => {
      // veryRare availability blocked in standard → returns availability-not-allowed (short-circuit)
      const result = isItemVisibleForMarket(makeEntry({ availability: 'veryRare', restrictionLevel: 'illegal' }), 'standard')
      expect(result.visible).toBe(false)
      expect(result.reason).toBe('availability-not-allowed')
    })
  })

  /* -------------------------------------------- */
  /*  Fallback / edge cases                       */
  /* -------------------------------------------- */

  describe('fallback and edge cases', () => {
    it('unknown market type → permissive fallback (visible=true)', () => {
      const result = isItemVisibleForMarket(makeEntry(), 'unknown-market-xyz')
      expect(result.visible).toBe(true)
      expect(result.reason).toBeNull()
    })

    it('defaults to standard market type when none provided', () => {
      // 'illegal' restriction is hidden in standard market
      const result = isItemVisibleForMarket(makeEntry({ restrictionLevel: 'illegal' }))
      expect(result.visible).toBe(false)
    })

    it('treats missing restrictionLevel as "none" (legal fallback)', () => {
      const entry = makeEntry()
      delete entry.restrictionLevel
      const result = isItemVisibleForMarket(entry, 'standard')
      expect(result.visible).toBe(true)
    })

    it('treats null restrictionLevel as "none" (legal fallback)', () => {
      const result = isItemVisibleForMarket(makeEntry({ restrictionLevel: null }), 'standard')
      expect(result.visible).toBe(true)
    })

    it('is deterministic: same inputs always produce same output', () => {
      const entry = makeEntry({ availability: 'available', restrictionLevel: 'restricted' })
      const r1 = isItemVisibleForMarket(entry, 'standard')
      const r2 = isItemVisibleForMarket(entry, 'standard')
      expect(r1).toEqual(r2)
    })

    it('does not mutate the entry object', () => {
      const entry = Object.freeze(makeEntry({ availability: 'available', restrictionLevel: 'none' }))
      expect(() => isItemVisibleForMarket(entry, 'standard')).not.toThrow()
    })
  })
})
