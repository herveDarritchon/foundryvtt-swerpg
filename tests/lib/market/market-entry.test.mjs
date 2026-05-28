import { describe, test, expect } from 'vitest'
import { createMarketEntry } from '../../../module/lib/market/market-entry.mjs'
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
