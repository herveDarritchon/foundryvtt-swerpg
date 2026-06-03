import { describe, test, expect } from 'vitest'
import { deriveAvailability, createMarketEntry, resolveMarketCatalogVisibility } from '../../../module/lib/market/market-entry.mjs'
import { DEFAULT_SOURCE_TYPE, AVAILABILITY_DERIVATION_THRESHOLDS } from '../../../module/config/market.mjs'

/**
 * Build a minimal valid raw item.
 * Note: `availability` is intentionally absent — it is always derived from rarity + restrictionLevel.
 * @param {object} [overrides]
 */
function makeRawItem(overrides = {}) {
  return {
    uuid: 'Item.abc123',
    name: 'Test Blaster',
    img: 'icons/weapons/gun.webp',
    type: 'weapon',
    basePrice: 100,
    rarity: 2,
    quality: 'standard',
    restrictionLevel: 'none',
    ...overrides,
  }
}

const validSourceInfo = { sourceType: 'compendium', sourceId: 'swerpg.weapons' }

/* -------------------------------------------- */

describe('deriveAvailability', () => {
  describe('legal items (restrictionLevel="none") — rarity bands', () => {
    test('rarity below COMMON threshold → "available"', () => {
      expect(deriveAvailability(0, 'none')).toBe('available')
      expect(deriveAvailability(AVAILABILITY_DERIVATION_THRESHOLDS.COMMON - 1, 'none')).toBe('available')
    })

    test('rarity at COMMON threshold → "common"', () => {
      expect(deriveAvailability(AVAILABILITY_DERIVATION_THRESHOLDS.COMMON, 'none')).toBe('common')
    })

    test('rarity between COMMON and RARE thresholds → "common"', () => {
      expect(deriveAvailability(AVAILABILITY_DERIVATION_THRESHOLDS.RARE - 1, 'none')).toBe('common')
    })

    test('rarity at RARE threshold → "rare"', () => {
      expect(deriveAvailability(AVAILABILITY_DERIVATION_THRESHOLDS.RARE, 'none')).toBe('rare')
    })

    test('rarity between RARE and VERY_RARE thresholds → "rare"', () => {
      expect(deriveAvailability(AVAILABILITY_DERIVATION_THRESHOLDS.VERY_RARE - 1, 'none')).toBe('rare')
    })

    test('rarity at VERY_RARE threshold → "veryRare"', () => {
      expect(deriveAvailability(AVAILABILITY_DERIVATION_THRESHOLDS.VERY_RARE, 'none')).toBe('veryRare')
    })

    test('rarity above VERY_RARE threshold → "veryRare"', () => {
      expect(deriveAvailability(10, 'none')).toBe('veryRare')
    })
  })

  describe('restricted items — restrictionLevel overrides rarity', () => {
    test('"restricted" → "restricted" regardless of rarity', () => {
      expect(deriveAvailability(0, 'restricted')).toBe('restricted')
      expect(deriveAvailability(10, 'restricted')).toBe('restricted')
    })

    test('"military" → "restricted" regardless of rarity', () => {
      expect(deriveAvailability(0, 'military')).toBe('restricted')
      expect(deriveAvailability(10, 'military')).toBe('restricted')
    })

    test('"illegal" → "blackMarket" regardless of rarity', () => {
      expect(deriveAvailability(0, 'illegal')).toBe('blackMarket')
      expect(deriveAvailability(10, 'illegal')).toBe('blackMarket')
    })
  })

  describe('edge cases', () => {
    test('non-finite rarity treated as 0 → "available" for legal item', () => {
      expect(deriveAvailability(NaN, 'none')).toBe('available')
      expect(deriveAvailability(Infinity, 'none')).toBe('available')
    })

    test('unknown restrictionLevel falls through to rarity band logic', () => {
      // Unknown restriction levels are not in the named checks; they fall through to rarity logic
      expect(deriveAvailability(0, 'unknown-level')).toBe('available')
      expect(deriveAvailability(AVAILABILITY_DERIVATION_THRESHOLDS.VERY_RARE, 'unknown-level')).toBe('veryRare')
    })

    test('deterministic — same inputs always produce same output', () => {
      expect(deriveAvailability(5, 'none')).toBe(deriveAvailability(5, 'none'))
      expect(deriveAvailability(0, 'illegal')).toBe(deriveAvailability(0, 'illegal'))
    })
  })

  describe('contractual — result is always a valid AVAILABILITY_STATUS key', () => {
    const cases = [
      [0, 'none'],
      [2, 'none'],
      [3, 'none'],
      [5, 'none'],
      [7, 'none'],
      [10, 'none'],
      [0, 'restricted'],
      [0, 'military'],
      [0, 'illegal'],
    ]
    const validKeys = ['available', 'common', 'rare', 'veryRare', 'restricted', 'blackMarket', 'unavailable']

    test.each(cases)('deriveAvailability(%i, %s) returns a valid AVAILABILITY_STATUS key', (rarity, restrictionLevel) => {
      const result = deriveAvailability(rarity, restrictionLevel)
      expect(validKeys).toContain(result)
    })
  })
})

/* -------------------------------------------- */

describe('createMarketEntry', () => {
  describe('valid item', () => {
    test('returns a complete MarketEntry with all fields', () => {
      // rarity=2, restrictionLevel='none' → availability derived as 'available'
      const entry = createMarketEntry(makeRawItem(), validSourceInfo)
      expect(entry).toMatchObject({
        uuid: 'Item.abc123',
        name: 'Test Blaster',
        img: 'icons/weapons/gun.webp',
        itemType: 'weapon',
        sourceType: 'compendium',
        sourceId: 'swerpg.weapons',
        basePrice: 100,
        rarity: 2,
        quality: 'standard',
        restrictionLevel: 'none',
        availability: 'available',
        eligible: true,
        ineligibilityReason: null,
      })
    })

    test('eligible=true for a valid item', () => {
      const entry = createMarketEntry(makeRawItem(), validSourceInfo)
      expect(entry.eligible).toBe(true)
      expect(entry.ineligibilityReason).toBeNull()
    })

    test('exposes priceResult with basePrice, finalPrice, and modifiers', () => {
      // rarity=0, restrictionLevel='none' → availability='available', no modifier
      const entry = createMarketEntry(makeRawItem({ basePrice: 100, rarity: 0, restrictionLevel: 'none' }), validSourceInfo)
      expect(entry.priceResult).toBeDefined()
      expect(entry.priceResult.basePrice).toBe(100)
      expect(entry.priceResult.finalPrice).toBe(100)
      expect(Array.isArray(entry.priceResult.modifiers)).toBe(true)
    })

    test('priceResult.finalPrice reflects rarity modifier', () => {
      // rarity=5 → 10% * 5 = 50% → 100 * 1.5 = 150
      // rarity=5 also derives availability='rare' (+25%), so total modifier: 0.5 + 0.25 = 0.75 → 175
      const entry = createMarketEntry(makeRawItem({ basePrice: 100, rarity: 5, restrictionLevel: 'none' }), validSourceInfo)
      expect(entry.priceResult.finalPrice).toBe(175)
    })

    test('priceResult.finalPrice reflects derived availability modifier for restricted items', () => {
      // restrictionLevel='restricted' → availability='restricted' (+100%) → 100 * 2.0 = 200
      const entry = createMarketEntry(makeRawItem({ basePrice: 100, rarity: 0, restrictionLevel: 'restricted' }), validSourceInfo)
      expect(entry.priceResult.finalPrice).toBe(200)
    })

    test('priceResult.finalPrice reflects manualModifier from marketContext', () => {
      // rarity=0, restrictionLevel='none' → availability='available', +50% manual → 100 * 1.5 = 150
      const entry = createMarketEntry(makeRawItem({ basePrice: 100, rarity: 0, restrictionLevel: 'none' }), validSourceInfo, { manualModifier: 50 })
      expect(entry.priceResult.finalPrice).toBe(150)
    })

    test('priceResult is deterministic for the same inputs', () => {
      const raw = makeRawItem()
      const a = createMarketEntry(raw, validSourceInfo)
      const b = createMarketEntry(raw, validSourceInfo)
      expect(a.priceResult.finalPrice).toBe(b.priceResult.finalPrice)
    })
  })

  describe('name normalization', () => {
    test('preserves valid name', () => {
      const entry = createMarketEntry(makeRawItem({ name: 'Vibroblade' }), validSourceInfo)
      expect(entry.name).toBe('Vibroblade')
    })

    test('falls back to "unknown" when name is empty', () => {
      const entry = createMarketEntry(makeRawItem({ name: '' }), validSourceInfo)
      expect(entry.name).toBe('unknown')
    })

    test('falls back to "unknown" when name is whitespace', () => {
      const entry = createMarketEntry(makeRawItem({ name: '   ' }), validSourceInfo)
      expect(entry.name).toBe('unknown')
    })

    test('falls back to "unknown" when name is absent', () => {
      const raw = makeRawItem()
      delete raw.name
      const entry = createMarketEntry(raw, validSourceInfo)
      expect(entry.name).toBe('unknown')
    })
  })

  describe('basePrice normalization', () => {
    test('preserves valid basePrice', () => {
      const entry = createMarketEntry(makeRawItem({ basePrice: 500 }), validSourceInfo)
      expect(entry.basePrice).toBe(500)
    })

    test('normalizes NaN to 0', () => {
      const entry = createMarketEntry(makeRawItem({ basePrice: NaN }), validSourceInfo)
      expect(entry.basePrice).toBe(0)
    })

    test('normalizes negative price to 0', () => {
      const entry = createMarketEntry(makeRawItem({ basePrice: -10 }), validSourceInfo)
      expect(entry.basePrice).toBe(0)
    })

    test('normalizes undefined to 0', () => {
      const entry = createMarketEntry(makeRawItem({ basePrice: undefined }), validSourceInfo)
      expect(entry.basePrice).toBe(0)
    })

    test('accepts 0 as valid price', () => {
      const entry = createMarketEntry(makeRawItem({ basePrice: 0 }), validSourceInfo)
      expect(entry.basePrice).toBe(0)
    })
  })

  describe('sourceInfo defaults', () => {
    test('defaults sourceType to DEFAULT_SOURCE_TYPE when sourceInfo is absent', () => {
      const entry = createMarketEntry(makeRawItem(), null)
      expect(entry.sourceType).toBe(DEFAULT_SOURCE_TYPE)
    })

    test('defaults sourceId to empty string when absent', () => {
      const entry = createMarketEntry(makeRawItem(), null)
      expect(entry.sourceId).toBe('')
    })
  })

  describe('availability derivation', () => {
    test('derives "available" for rarity=0, restrictionLevel="none"', () => {
      const entry = createMarketEntry(makeRawItem({ rarity: 0, restrictionLevel: 'none' }), validSourceInfo)
      expect(entry.availability).toBe('available')
    })

    test('derives "rare" for rarity=5, restrictionLevel="none"', () => {
      const entry = createMarketEntry(makeRawItem({ rarity: 5, restrictionLevel: 'none' }), validSourceInfo)
      expect(entry.availability).toBe('rare')
    })

    test('derives "veryRare" for rarity=7, restrictionLevel="none"', () => {
      const entry = createMarketEntry(makeRawItem({ rarity: 7, restrictionLevel: 'none' }), validSourceInfo)
      expect(entry.availability).toBe('veryRare')
    })

    test('derives "restricted" for restrictionLevel="restricted" regardless of rarity', () => {
      const entry = createMarketEntry(makeRawItem({ rarity: 0, restrictionLevel: 'restricted' }), validSourceInfo)
      expect(entry.availability).toBe('restricted')
    })

    test('derives "restricted" for restrictionLevel="military" regardless of rarity', () => {
      const entry = createMarketEntry(makeRawItem({ rarity: 0, restrictionLevel: 'military' }), validSourceInfo)
      expect(entry.availability).toBe('restricted')
    })

    test('derives "blackMarket" for restrictionLevel="illegal" regardless of rarity', () => {
      const entry = createMarketEntry(makeRawItem({ rarity: 0, restrictionLevel: 'illegal' }), validSourceInfo)
      expect(entry.availability).toBe('blackMarket')
    })

    test('availability is always derived — rawItem.availability field is ignored', () => {
      // Even if a caller mistakenly passes an availability field, it must not affect the derived value
      const rawWithAvailability = { ...makeRawItem({ rarity: 0, restrictionLevel: 'none' }), availability: 'blackMarket' }
      const entry = createMarketEntry(rawWithAvailability, validSourceInfo)
      expect(entry.availability).toBe('available')
    })
  })

  describe('type normalization', () => {
    test('reads itemType from rawItem.type', () => {
      const entry = createMarketEntry(makeRawItem({ type: 'armor' }), validSourceInfo)
      expect(entry.itemType).toBe('armor')
    })

    test('reads itemType from rawItem.itemType when type is absent', () => {
      const raw = makeRawItem()
      delete raw.type
      raw.itemType = 'gear'
      const entry = createMarketEntry(raw, validSourceInfo)
      expect(entry.itemType).toBe('gear')
    })
  })

  describe('throws for invalid itemType', () => {
    test('throws TypeError for talent type', () => {
      expect(() => createMarketEntry(makeRawItem({ type: 'talent' }), validSourceInfo)).toThrow(TypeError)
    })

    test('throws TypeError for empty type', () => {
      expect(() => createMarketEntry(makeRawItem({ type: '' }), validSourceInfo)).toThrow(TypeError)
    })

    test('throws TypeError for unknown type', () => {
      expect(() => createMarketEntry(makeRawItem({ type: 'starship' }), validSourceInfo)).toThrow(TypeError)
    })
  })

  describe('ineligible items', () => {
    test('normalizes empty name to "unknown" and remains eligible (name guard is in eligibility.mjs layer)', () => {
      // createMarketEntry normalizes empty name to 'unknown' before calling evaluateEligibility,
      // so the entry is still eligible. The missing-name rule fires when evaluateEligibility is
      // called directly with an empty name, not through the factory.
      const entry = createMarketEntry(makeRawItem({ name: '' }), validSourceInfo)
      expect(entry.name).toBe('unknown')
      expect(entry.eligible).toBe(true)
    })

    test('marks entry as ineligible when nonPurchasable=true', () => {
      const entry = createMarketEntry(makeRawItem({ nonPurchasable: true }), validSourceInfo)
      expect(entry.eligible).toBe(false)
      expect(entry.ineligibilityReason).toBe('explicitly-excluded')
    })

    test('marks entry as ineligible when broken=true', () => {
      const entry = createMarketEntry(makeRawItem({ broken: true }), validSourceInfo)
      expect(entry.eligible).toBe(false)
      expect(entry.ineligibilityReason).toBe('item-broken')
    })

    test('marks entry as ineligible for untrusted source', () => {
      const importSource = { sourceType: 'import', sourceId: 'some-import' }
      const entry = createMarketEntry(makeRawItem(), importSource)
      expect(entry.eligible).toBe(false)
      expect(entry.ineligibilityReason).toBe('untrusted-source')
    })
  })

  describe('determinism invariant', () => {
    test('same inputs always produce same eligible result', () => {
      const raw = makeRawItem()
      const source = { sourceType: 'compendium', sourceId: 'swerpg.weapons' }
      const a = createMarketEntry(raw, source)
      const b = createMarketEntry(raw, source)
      expect(a.eligible).toBe(b.eligible)
      expect(a.ineligibilityReason).toBe(b.ineligibilityReason)
    })
  })
})

/* -------------------------------------------- */

/**
 * Build a minimal MarketEntry-shaped plain object for visibility tests.
 * @param {object} [overrides]
 */
function makeEntry(overrides = {}) {
  return {
    uuid: 'Item.test',
    name: 'Test Item',
    itemType: 'weapon',
    sourceType: 'compendium',
    availability: overrides.availability ?? 'available',
    ...overrides,
  }
}

describe('resolveMarketCatalogVisibility', () => {
  describe('standard market', () => {
    test('available item is visible in standard market', () => {
      const { visible, blocked, reason } = resolveMarketCatalogVisibility(makeEntry({ availability: 'available' }), 'standard')
      expect(visible).toBe(true)
      expect(blocked).toBe(false)
      expect(reason).toBeNull()
    })

    test('common item is visible in standard market', () => {
      const { visible } = resolveMarketCatalogVisibility(makeEntry({ availability: 'common' }), 'standard')
      expect(visible).toBe(true)
    })

    test('rare item is visible in standard market', () => {
      const { visible } = resolveMarketCatalogVisibility(makeEntry({ availability: 'rare' }), 'standard')
      expect(visible).toBe(true)
    })

    test('veryRare item is NOT visible in standard market', () => {
      const { visible, blocked, reason } = resolveMarketCatalogVisibility(makeEntry({ availability: 'veryRare' }), 'standard')
      expect(visible).toBe(false)
      expect(blocked).toBe(true)
      expect(reason).toBe('availability-not-allowed')
    })

    test('restricted item is NOT visible in standard market', () => {
      const { visible, blocked } = resolveMarketCatalogVisibility(makeEntry({ availability: 'restricted' }), 'standard')
      expect(visible).toBe(false)
      expect(blocked).toBe(true)
    })

    test('blackMarket item is NOT visible in standard market', () => {
      const { visible } = resolveMarketCatalogVisibility(makeEntry({ availability: 'blackMarket' }), 'standard')
      expect(visible).toBe(false)
    })
  })

  describe('local market', () => {
    test('available item is visible in local market', () => {
      const { visible } = resolveMarketCatalogVisibility(makeEntry({ availability: 'available' }), 'local')
      expect(visible).toBe(true)
    })

    test('common item is visible in local market', () => {
      const { visible } = resolveMarketCatalogVisibility(makeEntry({ availability: 'common' }), 'local')
      expect(visible).toBe(true)
    })

    test('rare item is NOT visible in local market', () => {
      const { visible, blocked } = resolveMarketCatalogVisibility(makeEntry({ availability: 'rare' }), 'local')
      expect(visible).toBe(false)
      expect(blocked).toBe(true)
    })

    test('veryRare item is NOT visible in local market', () => {
      const { visible } = resolveMarketCatalogVisibility(makeEntry({ availability: 'veryRare' }), 'local')
      expect(visible).toBe(false)
    })
  })

  describe('specialized market', () => {
    test('available item is visible in specialized market', () => {
      const { visible } = resolveMarketCatalogVisibility(makeEntry({ availability: 'available' }), 'specialized')
      expect(visible).toBe(true)
    })

    test('veryRare item is visible in specialized market', () => {
      const { visible } = resolveMarketCatalogVisibility(makeEntry({ availability: 'veryRare' }), 'specialized')
      expect(visible).toBe(true)
    })

    test('restricted item IS visible in specialized market (derived from restrictionLevel=restricted|military)', () => {
      // 'restricted' is now in specialized.allowedAvailability (aligned with derivation from restrictionLevel)
      const { visible, blocked } = resolveMarketCatalogVisibility(makeEntry({ availability: 'restricted' }), 'specialized')
      expect(visible).toBe(true)
      expect(blocked).toBe(false)
    })

    test('blackMarket item is NOT visible in specialized market', () => {
      const { visible, blocked } = resolveMarketCatalogVisibility(makeEntry({ availability: 'blackMarket' }), 'specialized')
      expect(visible).toBe(false)
      expect(blocked).toBe(true)
    })

    test('blackMarket item is NOT visible in specialized market', () => {
      const { visible } = resolveMarketCatalogVisibility(makeEntry({ availability: 'blackMarket' }), 'specialized')
      expect(visible).toBe(false)
    })
  })

  describe('black-market', () => {
    test('available item is visible in black-market', () => {
      const { visible } = resolveMarketCatalogVisibility(makeEntry({ availability: 'available' }), 'black-market')
      expect(visible).toBe(true)
    })

    test('restricted item is visible in black-market', () => {
      const { visible } = resolveMarketCatalogVisibility(makeEntry({ availability: 'restricted' }), 'black-market')
      expect(visible).toBe(true)
    })

    test('blackMarket item is visible in black-market', () => {
      const { visible } = resolveMarketCatalogVisibility(makeEntry({ availability: 'blackMarket' }), 'black-market')
      expect(visible).toBe(true)
    })

    test('unavailable item is NOT visible even in black-market', () => {
      const { visible, blocked, reason } = resolveMarketCatalogVisibility(makeEntry({ availability: 'unavailable' }), 'black-market')
      expect(visible).toBe(false)
      expect(blocked).toBe(true)
      expect(reason).toBe('availability-not-allowed')
    })
  })

  describe('unknown market type (permissive fallback)', () => {
    test('any item is visible when market type is unknown', () => {
      const { visible, blocked, reason } = resolveMarketCatalogVisibility(makeEntry({ availability: 'restricted' }), 'unknown-market')
      expect(visible).toBe(true)
      expect(blocked).toBe(false)
      expect(reason).toBeNull()
    })
  })

  describe('default market type fallback', () => {
    test('uses standard market when no market type is provided', () => {
      // veryRare is blocked in standard market
      const { visible } = resolveMarketCatalogVisibility(makeEntry({ availability: 'veryRare' }))
      expect(visible).toBe(false)
    })
  })

  describe('determinism', () => {
    test('same inputs always produce the same visibility result', () => {
      const entry = makeEntry({ availability: 'restricted' })
      const a = resolveMarketCatalogVisibility(entry, 'black-market')
      const b = resolveMarketCatalogVisibility(entry, 'black-market')
      expect(a.visible).toBe(b.visible)
      expect(a.blocked).toBe(b.blocked)
      expect(a.reason).toBe(b.reason)
    })
  })
})
