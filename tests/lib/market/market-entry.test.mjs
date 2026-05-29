import { describe, test, expect } from 'vitest'
import { createMarketEntry, resolveMarketCatalogVisibility } from '../../../module/lib/market/market-entry.mjs'
import { DEFAULT_AVAILABILITY, DEFAULT_SOURCE_TYPE } from '../../../module/config/market.mjs'

/**
 * Build a minimal valid raw item.
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
    availability: 'available',
    ...overrides,
  }
}

const validSourceInfo = { sourceType: 'compendium', sourceId: 'swerpg.weapons' }

describe('createMarketEntry', () => {
  describe('valid item', () => {
    test('returns a complete MarketEntry with all fields', () => {
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
      const entry = createMarketEntry(makeRawItem({ basePrice: 100, rarity: 0, availability: 'available' }), validSourceInfo)
      expect(entry.priceResult).toBeDefined()
      expect(entry.priceResult.basePrice).toBe(100)
      expect(entry.priceResult.finalPrice).toBe(100)
      expect(Array.isArray(entry.priceResult.modifiers)).toBe(true)
    })

    test('priceResult.finalPrice reflects rarity modifier', () => {
      // rarity=5 → 10% * 5 = 50% → 100 * 1.5 = 150
      const entry = createMarketEntry(makeRawItem({ basePrice: 100, rarity: 5, availability: 'available' }), validSourceInfo)
      expect(entry.priceResult.finalPrice).toBe(150)
    })

    test('priceResult.finalPrice reflects availability modifier', () => {
      // availability=rare → +25% → 100 * 1.25 = 125
      const entry = createMarketEntry(makeRawItem({ basePrice: 100, rarity: 0, availability: 'rare' }), validSourceInfo)
      expect(entry.priceResult.finalPrice).toBe(125)
    })

    test('priceResult.finalPrice reflects manualModifier from marketContext', () => {
      // manualModifier=+50 → 100 * 1.5 = 150
      const entry = createMarketEntry(makeRawItem({ basePrice: 100, rarity: 0, availability: 'available' }), validSourceInfo, { manualModifier: 50 })
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

  describe('availability default', () => {
    test('uses DEFAULT_AVAILABILITY when availability is absent', () => {
      const raw = makeRawItem()
      delete raw.availability
      const entry = createMarketEntry(raw, validSourceInfo)
      expect(entry.availability).toBe(DEFAULT_AVAILABILITY)
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

    test('restricted item is NOT visible in specialized market', () => {
      const { visible, blocked } = resolveMarketCatalogVisibility(makeEntry({ availability: 'restricted' }), 'specialized')
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
