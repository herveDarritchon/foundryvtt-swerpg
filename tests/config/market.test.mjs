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
  MARKET_TYPES,
  DEFAULT_MARKET_TYPE,
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

    test('each status has rarityRules with required shape', () => {
      for (const status of Object.values(AVAILABILITY_STATUS)) {
        expect(status).toHaveProperty('rarityRules')
        const { rarityRules } = status
        expect(rarityRules).toHaveProperty('obtainmentProbability')
        expect(rarityRules).toHaveProperty('supplyDelay')
        expect(rarityRules).toHaveProperty('narrativeReasonKey')
        expect(typeof rarityRules.obtainmentProbability).toBe('number')
        expect(rarityRules.obtainmentProbability).toBeGreaterThanOrEqual(0)
        expect(rarityRules.obtainmentProbability).toBeLessThanOrEqual(100)
        expect(typeof rarityRules.narrativeReasonKey).toBe('string')
        expect(rarityRules.narrativeReasonKey.length).toBeGreaterThan(0)
        expect(rarityRules.supplyDelay).toHaveProperty('days')
        expect(typeof rarityRules.supplyDelay.days).toBe('number')
        expect(rarityRules.supplyDelay.days).toBeGreaterThanOrEqual(0)
      }
    })

    test('rarityRules is frozen on each status', () => {
      for (const status of Object.values(AVAILABILITY_STATUS)) {
        expect(Object.isFrozen(status.rarityRules)).toBe(true)
        expect(Object.isFrozen(status.rarityRules.supplyDelay)).toBe(true)
      }
    })

    test('available and common have obtainmentProbability=100 (always immediate)', () => {
      expect(AVAILABILITY_STATUS.available.rarityRules.obtainmentProbability).toBe(100)
      expect(AVAILABILITY_STATUS.common.rarityRules.obtainmentProbability).toBe(100)
    })

    test('blackMarket has obtainmentProbability < 100 (never immediate)', () => {
      expect(AVAILABILITY_STATUS.blackMarket.rarityRules.obtainmentProbability).toBeLessThan(100)
    })

    test('unavailable has obtainmentProbability=0', () => {
      expect(AVAILABILITY_STATUS.unavailable.rarityRules.obtainmentProbability).toBe(0)
    })

    test('narrativeReasonKey uses MARKET.Rarity.Reason namespace', () => {
      for (const status of Object.values(AVAILABILITY_STATUS)) {
        expect(status.rarityRules.narrativeReasonKey.startsWith('MARKET.Rarity.Reason.')).toBe(true)
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

/* -------------------------------------------- */

describe('MARKET_TYPES — V1 registry', () => {
  test('is frozen (immutable)', () => {
    expect(Object.isFrozen(MARKET_TYPES)).toBe(true)
  })

  test('contains standard, local, specialized, black-market', () => {
    expect(MARKET_TYPES).toHaveProperty('standard')
    expect(MARKET_TYPES).toHaveProperty('local')
    expect(MARKET_TYPES).toHaveProperty('specialized')
    expect(MARKET_TYPES).toHaveProperty('black-market')
  })

  test('each market type has required shape fields', () => {
    for (const [key, def] of Object.entries(MARKET_TYPES)) {
      expect(def).toHaveProperty('id')
      expect(def).toHaveProperty('label')
      expect(def).toHaveProperty('description')
      expect(def).toHaveProperty('allowedItemTypes')
      expect(def).toHaveProperty('allowedAvailability')
      expect(def).toHaveProperty('priceModifier')
      expect(def).toHaveProperty('uiVariant')
      expect(def).toHaveProperty('negotiationAllowed')
      expect(typeof def.id).toBe('string')
      expect(typeof def.label).toBe('string')
      expect(typeof def.description).toBe('string')
      expect(Array.isArray(def.allowedItemTypes)).toBe(true)
      expect(Array.isArray(def.allowedAvailability)).toBe(true)
      expect(typeof def.priceModifier).toBe('number')
      expect(typeof def.uiVariant).toBe('string')
      expect(typeof def.negotiationAllowed).toBe('boolean')
      // Each definition id must match its registry key
      expect(def.id).toBe(key)
    }
  })

  test('all market types allow negotiation', () => {
    for (const def of Object.values(MARKET_TYPES)) {
      expect(def.negotiationAllowed).toBe(true)
    }
  })

  test('standard allows negotiation', () => {
    expect(MARKET_TYPES.standard.negotiationAllowed).toBe(true)
  })

  test('black-market allows negotiation', () => {
    expect(MARKET_TYPES['black-market'].negotiationAllowed).toBe(true)
  })

  test('each market type definition is frozen', () => {
    for (const def of Object.values(MARKET_TYPES)) {
      expect(Object.isFrozen(def)).toBe(true)
    }
  })

  test('standard has priceModifier=0', () => {
    expect(MARKET_TYPES.standard.priceModifier).toBe(0)
  })

  test('local has priceModifier=-0.1 (discount)', () => {
    expect(MARKET_TYPES.local.priceModifier).toBe(-0.1)
  })

  test('specialized has priceModifier=0.25 (premium)', () => {
    expect(MARKET_TYPES.specialized.priceModifier).toBe(0.25)
  })

  test('black-market has priceModifier=0.5 (steep premium)', () => {
    expect(MARKET_TYPES['black-market'].priceModifier).toBe(0.5)
  })

  test('standard does not allow veryRare or restricted items', () => {
    const { allowedAvailability } = MARKET_TYPES.standard
    expect(allowedAvailability.includes('veryRare')).toBe(false)
    expect(allowedAvailability.includes('restricted')).toBe(false)
  })

  test('local only allows available and common items', () => {
    const { allowedAvailability } = MARKET_TYPES.local
    expect(allowedAvailability).toContain('available')
    expect(allowedAvailability).toContain('common')
    expect(allowedAvailability.includes('rare')).toBe(false)
    expect(allowedAvailability.includes('veryRare')).toBe(false)
    expect(allowedAvailability.includes('restricted')).toBe(false)
  })

  test('specialized unlocks veryRare items', () => {
    const { allowedAvailability } = MARKET_TYPES.specialized
    expect(allowedAvailability).toContain('veryRare')
    expect(allowedAvailability.includes('restricted')).toBe(false)
    expect(allowedAvailability.includes('blackMarket')).toBe(false)
  })

  test('black-market allows restricted and blackMarket availability', () => {
    const { allowedAvailability } = MARKET_TYPES['black-market']
    expect(allowedAvailability).toContain('restricted')
    expect(allowedAvailability).toContain('blackMarket')
  })

  test('black-market does not allow unavailable items', () => {
    const { allowedAvailability } = MARKET_TYPES['black-market']
    expect(allowedAvailability.includes('unavailable')).toBe(false)
  })

  test('label keys use MARKET.MarketType namespace', () => {
    for (const def of Object.values(MARKET_TYPES)) {
      expect(def.label.startsWith('MARKET.MarketType.')).toBe(true)
    }
  })

  test('description keys use MARKET.MarketType namespace', () => {
    for (const def of Object.values(MARKET_TYPES)) {
      expect(def.description.startsWith('MARKET.MarketType.')).toBe(true)
    }
  })
})

/* -------------------------------------------- */

describe('DEFAULT_MARKET_TYPE', () => {
  test('is a key of MARKET_TYPES', () => {
    expect(DEFAULT_MARKET_TYPE in MARKET_TYPES).toBe(true)
  })

  test('equals "standard"', () => {
    expect(DEFAULT_MARKET_TYPE).toBe('standard')
  })

  test('is a non-empty string', () => {
    expect(typeof DEFAULT_MARKET_TYPE).toBe('string')
    expect(DEFAULT_MARKET_TYPE.length).toBeGreaterThan(0)
  })
})
