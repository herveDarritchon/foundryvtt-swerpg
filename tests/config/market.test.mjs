import { describe, test, expect } from 'vitest'
import {
  PURCHASABLE_ITEM_TYPES,
  EXCLUDED_ITEM_TYPES,
  AVAILABILITY_STATUS,
  SOURCE_TYPES,
  DEFAULT_AVAILABILITY,
  DEFAULT_SOURCE_TYPE,
  MIN_PRICE_FOR_ELIGIBILITY,
  DEFAULT_MARKET_CONFIG,
  MARKET_FLAG_NAMESPACE,
  MARKET_EXCLUDED_FLAG,
} from '../../module/config/market.mjs'
import { SYSTEM } from '../../module/config/system.mjs'

describe('market config — ADR-0018 contractual constants', () => {
  describe('PURCHASABLE_ITEM_TYPES', () => {
    test('contains at least weapon, armor, gear', () => {
      expect(PURCHASABLE_ITEM_TYPES).toHaveProperty('weapon')
      expect(PURCHASABLE_ITEM_TYPES).toHaveProperty('armor')
      expect(PURCHASABLE_ITEM_TYPES).toHaveProperty('gear')
    })

    test('each type has id, label, icon', () => {
      for (const type of Object.values(PURCHASABLE_ITEM_TYPES)) {
        expect(type).toHaveProperty('id')
        expect(type).toHaveProperty('label')
        expect(type).toHaveProperty('icon')
        expect(typeof type.id).toBe('string')
        expect(typeof type.label).toBe('string')
        expect(typeof type.icon).toBe('string')
      }
    })

    test('each type id matches its registry key', () => {
      for (const [key, type] of Object.entries(PURCHASABLE_ITEM_TYPES)) {
        expect(type.id).toBe(key)
      }
    })

    test('is frozen (immutable)', () => {
      expect(Object.isFrozen(PURCHASABLE_ITEM_TYPES)).toBe(true)
    })

    test('is exposed on SYSTEM.MARKET.PURCHASABLE_ITEM_TYPES', () => {
      expect(SYSTEM.MARKET.PURCHASABLE_ITEM_TYPES).toBe(PURCHASABLE_ITEM_TYPES)
    })
  })

  describe('EXCLUDED_ITEM_TYPES', () => {
    test('each excluded type has id and reason', () => {
      for (const excluded of Object.values(EXCLUDED_ITEM_TYPES)) {
        expect(excluded).toHaveProperty('id')
        expect(excluded).toHaveProperty('reason')
        expect(typeof excluded.id).toBe('string')
        expect(typeof excluded.reason).toBe('string')
        expect(excluded.reason.length).toBeGreaterThan(0)
      }
    })

    test('excluded type id matches its registry key', () => {
      for (const [key, excluded] of Object.entries(EXCLUDED_ITEM_TYPES)) {
        expect(excluded.id).toBe(key)
      }
    })

    test('contains talent, career, species', () => {
      expect(EXCLUDED_ITEM_TYPES).toHaveProperty('talent')
      expect(EXCLUDED_ITEM_TYPES).toHaveProperty('career')
      expect(EXCLUDED_ITEM_TYPES).toHaveProperty('species')
    })

    test('is frozen (immutable)', () => {
      expect(Object.isFrozen(EXCLUDED_ITEM_TYPES)).toBe(true)
    })

    test('no overlap with PURCHASABLE_ITEM_TYPES', () => {
      const purchasableKeys = new Set(Object.keys(PURCHASABLE_ITEM_TYPES))
      for (const key of Object.keys(EXCLUDED_ITEM_TYPES)) {
        expect(purchasableKeys.has(key)).toBe(false)
      }
    })
  })

  describe('AVAILABILITY_STATUS', () => {
    test('contains available, common, rare, veryRare, restricted, blackMarket, unavailable', () => {
      const expected = ['available', 'common', 'rare', 'veryRare', 'restricted', 'blackMarket', 'unavailable']
      for (const key of expected) {
        expect(AVAILABILITY_STATUS).toHaveProperty(key)
      }
    })

    test('each status has id, label, purchasable, priceModifier', () => {
      for (const status of Object.values(AVAILABILITY_STATUS)) {
        expect(status).toHaveProperty('id')
        expect(status).toHaveProperty('label')
        expect(status).toHaveProperty('purchasable')
        expect(status).toHaveProperty('priceModifier')
        expect(typeof status.id).toBe('string')
        expect(typeof status.label).toBe('string')
        expect(typeof status.purchasable).toBe('boolean')
      }
    })

    test('each status id matches its registry key', () => {
      for (const [key, status] of Object.entries(AVAILABILITY_STATUS)) {
        expect(status.id).toBe(key)
      }
    })

    test('unavailable has priceModifier null', () => {
      expect(AVAILABILITY_STATUS.unavailable.priceModifier).toBeNull()
    })

    test('available and common are purchasable', () => {
      expect(AVAILABILITY_STATUS.available.purchasable).toBe(true)
      expect(AVAILABILITY_STATUS.common.purchasable).toBe(true)
    })

    test('restricted, blackMarket, unavailable are not purchasable', () => {
      expect(AVAILABILITY_STATUS.restricted.purchasable).toBe(false)
      expect(AVAILABILITY_STATUS.blackMarket.purchasable).toBe(false)
      expect(AVAILABILITY_STATUS.unavailable.purchasable).toBe(false)
    })

    test('is frozen (immutable)', () => {
      expect(Object.isFrozen(AVAILABILITY_STATUS)).toBe(true)
    })
  })

  describe('SOURCE_TYPES', () => {
    test('contains compendium, world, import', () => {
      expect(SOURCE_TYPES).toHaveProperty('compendium')
      expect(SOURCE_TYPES).toHaveProperty('world')
      expect(SOURCE_TYPES).toHaveProperty('import')
    })

    test('each source type has id, label, trusted', () => {
      for (const sourceType of Object.values(SOURCE_TYPES)) {
        expect(sourceType).toHaveProperty('id')
        expect(sourceType).toHaveProperty('label')
        expect(sourceType).toHaveProperty('trusted')
        expect(typeof sourceType.id).toBe('string')
        expect(typeof sourceType.label).toBe('string')
        expect(typeof sourceType.trusted).toBe('boolean')
      }
    })

    test('each source type id matches its registry key', () => {
      for (const [key, sourceType] of Object.entries(SOURCE_TYPES)) {
        expect(sourceType.id).toBe(key)
      }
    })

    test('compendium and world are trusted', () => {
      expect(SOURCE_TYPES.compendium.trusted).toBe(true)
      expect(SOURCE_TYPES.world.trusted).toBe(true)
    })

    test('import is not trusted', () => {
      expect(SOURCE_TYPES.import.trusted).toBe(false)
    })

    test('is frozen (immutable)', () => {
      expect(Object.isFrozen(SOURCE_TYPES)).toBe(true)
    })
  })

  describe('DEFAULT_AVAILABILITY', () => {
    test('is a key of AVAILABILITY_STATUS', () => {
      expect(DEFAULT_AVAILABILITY in AVAILABILITY_STATUS).toBe(true)
    })

    test('equals "available"', () => {
      expect(DEFAULT_AVAILABILITY).toBe('available')
    })

    test('is exposed on SYSTEM.MARKET.DEFAULT_AVAILABILITY', () => {
      expect(SYSTEM.MARKET.DEFAULT_AVAILABILITY).toBe(DEFAULT_AVAILABILITY)
    })
  })

  describe('DEFAULT_SOURCE_TYPE', () => {
    test('is a key of SOURCE_TYPES', () => {
      expect(DEFAULT_SOURCE_TYPE in SOURCE_TYPES).toBe(true)
    })

    test('equals "compendium"', () => {
      expect(DEFAULT_SOURCE_TYPE).toBe('compendium')
    })
  })

  describe('MIN_PRICE_FOR_ELIGIBILITY', () => {
    test('is a number', () => {
      expect(typeof MIN_PRICE_FOR_ELIGIBILITY).toBe('number')
    })

    test('equals 0', () => {
      expect(MIN_PRICE_FOR_ELIGIBILITY).toBe(0)
    })
  })

  describe('SYSTEM.MARKET exposure', () => {
    test('SYSTEM.MARKET is defined', () => {
      expect(SYSTEM.MARKET).toBeDefined()
    })

    test('SYSTEM.MARKET.PURCHASABLE_ITEM_TYPES is the canonical object', () => {
      expect(SYSTEM.MARKET.PURCHASABLE_ITEM_TYPES).toBe(PURCHASABLE_ITEM_TYPES)
    })

    test('SYSTEM.MARKET.AVAILABILITY_STATUS is the canonical object', () => {
      expect(SYSTEM.MARKET.AVAILABILITY_STATUS).toBe(AVAILABILITY_STATUS)
    })

    test('SYSTEM.MARKET.SOURCE_TYPES is the canonical object', () => {
      expect(SYSTEM.MARKET.SOURCE_TYPES).toBe(SOURCE_TYPES)
    })

    test('SYSTEM.MARKET.EXCLUDED_ITEM_TYPES is the canonical object', () => {
      expect(SYSTEM.MARKET.EXCLUDED_ITEM_TYPES).toBe(EXCLUDED_ITEM_TYPES)
    })
  })
})

/* -------------------------------------------- */

describe('DEFAULT_MARKET_CONFIG', () => {
  test('is defined and frozen', () => {
    expect(DEFAULT_MARKET_CONFIG).toBeDefined()
    expect(Object.isFrozen(DEFAULT_MARKET_CONFIG)).toBe(true)
  })

  test('enabledSources contains all SOURCE_TYPES keys by default', () => {
    const sourceKeys = Object.keys(SOURCE_TYPES)
    expect(DEFAULT_MARKET_CONFIG.enabledSources).toEqual(expect.arrayContaining(sourceKeys))
    expect(DEFAULT_MARKET_CONFIG.enabledSources).toHaveLength(sourceKeys.length)
  })

  test('allowedItemTypes contains all PURCHASABLE_ITEM_TYPES keys by default', () => {
    const typeKeys = Object.keys(PURCHASABLE_ITEM_TYPES)
    expect(DEFAULT_MARKET_CONFIG.allowedItemTypes).toEqual(expect.arrayContaining(typeKeys))
    expect(DEFAULT_MARKET_CONFIG.allowedItemTypes).toHaveLength(typeKeys.length)
  })

  test('dedupStrategy equals "prefer-compendium"', () => {
    expect(DEFAULT_MARKET_CONFIG.dedupStrategy).toBe('prefer-compendium')
  })

  test('enabledSources is a frozen array', () => {
    expect(Array.isArray(DEFAULT_MARKET_CONFIG.enabledSources)).toBe(true)
    expect(Object.isFrozen(DEFAULT_MARKET_CONFIG.enabledSources)).toBe(true)
  })

  test('allowedItemTypes is a frozen array', () => {
    expect(Array.isArray(DEFAULT_MARKET_CONFIG.allowedItemTypes)).toBe(true)
    expect(Object.isFrozen(DEFAULT_MARKET_CONFIG.allowedItemTypes)).toBe(true)
  })

  test('enabledSources keys are all valid SOURCE_TYPES keys', () => {
    for (const key of DEFAULT_MARKET_CONFIG.enabledSources) {
      expect(SOURCE_TYPES).toHaveProperty(key)
    }
  })

  test('allowedItemTypes keys are all valid PURCHASABLE_ITEM_TYPES keys', () => {
    for (const key of DEFAULT_MARKET_CONFIG.allowedItemTypes) {
      expect(PURCHASABLE_ITEM_TYPES).toHaveProperty(key)
    }
  })
})

/* -------------------------------------------- */

describe('MARKET_FLAG_NAMESPACE and MARKET_EXCLUDED_FLAG', () => {
  test('MARKET_FLAG_NAMESPACE is "swerpg"', () => {
    expect(MARKET_FLAG_NAMESPACE).toBe('swerpg')
  })

  test('MARKET_EXCLUDED_FLAG is "marketExcluded"', () => {
    expect(MARKET_EXCLUDED_FLAG).toBe('marketExcluded')
  })

  test('MARKET_FLAG_NAMESPACE is a non-empty string', () => {
    expect(typeof MARKET_FLAG_NAMESPACE).toBe('string')
    expect(MARKET_FLAG_NAMESPACE.length).toBeGreaterThan(0)
  })

  test('MARKET_EXCLUDED_FLAG is a non-empty string', () => {
    expect(typeof MARKET_EXCLUDED_FLAG).toBe('string')
    expect(MARKET_EXCLUDED_FLAG.length).toBeGreaterThan(0)
  })
})
