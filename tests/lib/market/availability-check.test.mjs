import { describe, expect, it } from 'vitest'

import {
  isAvailabilityCheckRequired,
  resolveAvailabilityCheck,
  AVAILABILITY_CHECK_RARITY_THRESHOLD,
  AVAILABILITY_CHECK_RESTRICTED_LEVELS,
  AVAILABILITY_CHECK_SKILLS,
} from '../../../module/lib/market/availability-check.mjs'

/* -------------------------------------------- */
/*  Constants                                   */
/* -------------------------------------------- */

describe('AVAILABILITY_CHECK_RARITY_THRESHOLD', () => {
  it('is 4', () => {
    expect(AVAILABILITY_CHECK_RARITY_THRESHOLD).toBe(4)
  })
})

describe('AVAILABILITY_CHECK_RESTRICTED_LEVELS', () => {
  it('includes restricted, military, and illegal', () => {
    expect(AVAILABILITY_CHECK_RESTRICTED_LEVELS).toContain('restricted')
    expect(AVAILABILITY_CHECK_RESTRICTED_LEVELS).toContain('military')
    expect(AVAILABILITY_CHECK_RESTRICTED_LEVELS).toContain('illegal')
  })

  it('does not include none', () => {
    expect(AVAILABILITY_CHECK_RESTRICTED_LEVELS).not.toContain('none')
  })
})

describe('AVAILABILITY_CHECK_SKILLS', () => {
  it('maps restriction to streetwise', () => {
    expect(AVAILABILITY_CHECK_SKILLS.restriction).toBe('streetwise')
  })

  it('maps rarity to negotiation', () => {
    expect(AVAILABILITY_CHECK_SKILLS.rarity).toBe('negotiation')
  })
})

/* -------------------------------------------- */
/*  isAvailabilityCheckRequired                 */
/* -------------------------------------------- */

describe('isAvailabilityCheckRequired', () => {
  describe('legal items (restrictionLevel === "none")', () => {
    it('returns false when rarity is below threshold', () => {
      expect(isAvailabilityCheckRequired({ rarity: 0, restrictionLevel: 'none' })).toBe(false)
      expect(isAvailabilityCheckRequired({ rarity: 1, restrictionLevel: 'none' })).toBe(false)
      expect(isAvailabilityCheckRequired({ rarity: 3, restrictionLevel: 'none' })).toBe(false)
    })

    it('returns false when rarity is exactly one below threshold', () => {
      expect(isAvailabilityCheckRequired({ rarity: AVAILABILITY_CHECK_RARITY_THRESHOLD - 1, restrictionLevel: 'none' })).toBe(false)
    })

    it('returns true when rarity is exactly at threshold', () => {
      expect(isAvailabilityCheckRequired({ rarity: AVAILABILITY_CHECK_RARITY_THRESHOLD, restrictionLevel: 'none' })).toBe(true)
    })

    it('returns true when rarity is above threshold', () => {
      expect(isAvailabilityCheckRequired({ rarity: 5, restrictionLevel: 'none' })).toBe(true)
      expect(isAvailabilityCheckRequired({ rarity: 10, restrictionLevel: 'none' })).toBe(true)
    })
  })

  describe('restricted items', () => {
    it('returns true for restriction level "restricted"', () => {
      expect(isAvailabilityCheckRequired({ rarity: 0, restrictionLevel: 'restricted' })).toBe(true)
      expect(isAvailabilityCheckRequired({ rarity: 1, restrictionLevel: 'restricted' })).toBe(true)
    })

    it('returns true for restriction level "military"', () => {
      expect(isAvailabilityCheckRequired({ rarity: 0, restrictionLevel: 'military' })).toBe(true)
    })

    it('returns true for restriction level "illegal"', () => {
      expect(isAvailabilityCheckRequired({ rarity: 0, restrictionLevel: 'illegal' })).toBe(true)
    })

    it('returns true even when rarity is below threshold for restricted items', () => {
      expect(isAvailabilityCheckRequired({ rarity: 1, restrictionLevel: 'illegal' })).toBe(true)
    })
  })
})

/* -------------------------------------------- */
/*  resolveAvailabilityCheck                    */
/* -------------------------------------------- */

describe('resolveAvailabilityCheck', () => {
  describe('when no check is required', () => {
    it('returns { required: false } for low rarity legal item', () => {
      const result = resolveAvailabilityCheck({ rarity: 2, restrictionLevel: 'none' })
      expect(result).toEqual({ required: false })
    })

    it('returns { required: false } for rarity just below threshold', () => {
      const result = resolveAvailabilityCheck({ rarity: AVAILABILITY_CHECK_RARITY_THRESHOLD - 1, restrictionLevel: 'none' })
      expect(result).toEqual({ required: false })
    })
  })

  describe('legal items with high rarity (negotiation path)', () => {
    it('returns required: true with skillKey "negotiation"', () => {
      const result = resolveAvailabilityCheck({ rarity: 4, restrictionLevel: 'none' })
      expect(result.required).toBe(true)
      expect(result.skillKey).toBe('negotiation')
    })

    it('returns difficulty based on rarity', () => {
      // rarity 4 → band 3-4 → difficulty 2
      const result = resolveAvailabilityCheck({ rarity: 4, restrictionLevel: 'none' })
      expect(result.difficulty).toBe(2)
    })

    it('returns descriptionKey for rarity path', () => {
      const result = resolveAvailabilityCheck({ rarity: 5, restrictionLevel: 'none' })
      expect(result.descriptionKey).toBe('MARKET.AvailabilityCheck.Description.Rarity')
    })

    it('includes rarity and restrictionLevel in result', () => {
      const result = resolveAvailabilityCheck({ rarity: 6, restrictionLevel: 'none' })
      expect(result.rarity).toBe(6)
      expect(result.restrictionLevel).toBe('none')
    })
  })

  describe('restricted items (streetwise path)', () => {
    it('returns required: true with skillKey "streetwise" for "restricted"', () => {
      const result = resolveAvailabilityCheck({ rarity: 1, restrictionLevel: 'restricted' })
      expect(result.required).toBe(true)
      expect(result.skillKey).toBe('streetwise')
    })

    it('returns required: true with skillKey "streetwise" for "military"', () => {
      const result = resolveAvailabilityCheck({ rarity: 1, restrictionLevel: 'military' })
      expect(result.required).toBe(true)
      expect(result.skillKey).toBe('streetwise')
    })

    it('returns required: true with skillKey "streetwise" for "illegal"', () => {
      const result = resolveAvailabilityCheck({ rarity: 1, restrictionLevel: 'illegal' })
      expect(result.required).toBe(true)
      expect(result.skillKey).toBe('streetwise')
    })

    it('returns descriptionKey with capitalized restriction level for "restricted"', () => {
      const result = resolveAvailabilityCheck({ rarity: 2, restrictionLevel: 'restricted' })
      expect(result.descriptionKey).toBe('MARKET.AvailabilityCheck.Description.Restricted')
    })

    it('returns descriptionKey with capitalized restriction level for "military"', () => {
      const result = resolveAvailabilityCheck({ rarity: 2, restrictionLevel: 'military' })
      expect(result.descriptionKey).toBe('MARKET.AvailabilityCheck.Description.Military')
    })

    it('returns descriptionKey with capitalized restriction level for "illegal"', () => {
      const result = resolveAvailabilityCheck({ rarity: 2, restrictionLevel: 'illegal' })
      expect(result.descriptionKey).toBe('MARKET.AvailabilityCheck.Description.Illegal')
    })

    it('calculates difficulty from rarity via rarityToDifficulty', () => {
      // rarity 7-8 → difficulty 4
      const result = resolveAvailabilityCheck({ rarity: 7, restrictionLevel: 'restricted' })
      expect(result.difficulty).toBe(4)
    })
  })

  describe('effectiveRarity slot (post-#477 compatibility)', () => {
    it('uses effectiveRarity over rarity when provided', () => {
      // rarity 2 would normally not require a check; effectiveRarity 5 triggers it
      const result = resolveAvailabilityCheck({ rarity: 2, restrictionLevel: 'none', effectiveRarity: 5 })
      expect(result.required).toBe(true)
      expect(result.rarity).toBe(5)
    })

    it('falls back to rarity when effectiveRarity is null', () => {
      const result = resolveAvailabilityCheck({ rarity: 2, restrictionLevel: 'none', effectiveRarity: null })
      expect(result.required).toBe(false)
    })
  })
})
