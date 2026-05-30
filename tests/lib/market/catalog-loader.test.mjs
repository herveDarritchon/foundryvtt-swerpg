import { describe, expect, test } from 'vitest'

import { DEFAULT_MARKET_CONFIG, DEFAULT_MARKET_CONTEXT } from '../../../module/config/market.mjs'
import { loadMarketCatalog } from '../../../module/lib/market/catalog-loader.mjs'

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

/**
 * Minimal world RawItem fixture.
 * @param {object} [overrides]
 */
function makeWorldItem(overrides = {}) {
  return {
    uuid: overrides.uuid ?? 'world.test-1',
    name: overrides.name ?? 'Test Blaster',
    type: overrides.type ?? 'weapon',
    basePrice: overrides.basePrice ?? 500,
    rarity: overrides.rarity ?? 0,
    availability: overrides.availability ?? 'available',
    nonPurchasable: overrides.nonPurchasable ?? false,
    broken: overrides.broken ?? false,
    ...overrides,
  }
}

/**
 * Minimal compendium RawItem fixture.
 * @param {object} [overrides]
 */
function makeCompendiumItem(overrides = {}) {
  return {
    uuid: overrides.uuid ?? 'pack.test-1',
    name: overrides.name ?? 'Test Rifle',
    type: overrides.type ?? 'weapon',
    basePrice: overrides.basePrice ?? 1000,
    rarity: overrides.rarity ?? 1,
    availability: overrides.availability ?? 'available',
    nonPurchasable: overrides.nonPurchasable ?? false,
    broken: overrides.broken ?? false,
    _sourceId: overrides._sourceId ?? 'swerpg.weapons',
    ...overrides,
  }
}

/* -------------------------------------------- */
/*  Tests                                       */
/* -------------------------------------------- */

describe('loadMarketCatalog', () => {
  test('merges world and compendium items into a single catalogue', () => {
    const worldItems = [makeWorldItem({ uuid: 'world.1', name: 'Blaster', type: 'weapon', basePrice: 500 })]
    const compendiumItems = [makeCompendiumItem({ uuid: 'pack.1', name: 'Rifle', type: 'weapon', basePrice: 1000, _sourceId: 'swerpg.weapons' })]

    const result = loadMarketCatalog({
      worldItems,
      compendiumItems,
      config: DEFAULT_MARKET_CONFIG,
      marketContext: DEFAULT_MARKET_CONTEXT,
    })

    expect(result).toHaveLength(2)
    const names = result.map((e) => e.name)
    expect(names).toContain('Blaster')
    expect(names).toContain('Rifle')
  })

  test('tags world items with sourceType="world"', () => {
    const worldItems = [makeWorldItem({ uuid: 'world.1', name: 'Blaster' })]

    const result = loadMarketCatalog({
      worldItems,
      compendiumItems: [],
      config: DEFAULT_MARKET_CONFIG,
      marketContext: DEFAULT_MARKET_CONTEXT,
    })

    expect(result).toHaveLength(1)
    expect(result[0].sourceType).toBe('world')
  })

  test('tags compendium items with sourceType="compendium"', () => {
    const compendiumItems = [makeCompendiumItem({ uuid: 'pack.1', name: 'Rifle' })]

    const result = loadMarketCatalog({
      worldItems: [],
      compendiumItems,
      config: DEFAULT_MARKET_CONFIG,
      marketContext: DEFAULT_MARKET_CONTEXT,
    })

    expect(result).toHaveLength(1)
    expect(result[0].sourceType).toBe('compendium')
  })

  test('skips items with non-purchasable types silently', () => {
    const worldItems = [
      makeWorldItem({ type: 'talent', name: 'Force Sensitive', basePrice: 0 }),
      makeWorldItem({ type: 'weapon', name: 'Blaster', basePrice: 500 }),
    ]

    const result = loadMarketCatalog({
      worldItems,
      compendiumItems: [],
      config: DEFAULT_MARKET_CONFIG,
      marketContext: DEFAULT_MARKET_CONTEXT,
    })

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Blaster')
  })

  test('skips ineligible items (broken=true)', () => {
    const worldItems = [makeWorldItem({ name: 'Broken Blaster', type: 'weapon', basePrice: 100, broken: true })]

    const result = loadMarketCatalog({
      worldItems,
      compendiumItems: [],
      config: DEFAULT_MARKET_CONFIG,
      marketContext: DEFAULT_MARKET_CONTEXT,
    })

    expect(result).toHaveLength(0)
  })

  test('skips ineligible items (nonPurchasable=true)', () => {
    const worldItems = [makeWorldItem({ name: 'Excluded Item', type: 'weapon', basePrice: 100, nonPurchasable: true })]

    const result = loadMarketCatalog({
      worldItems,
      compendiumItems: [],
      config: DEFAULT_MARKET_CONFIG,
      marketContext: DEFAULT_MARKET_CONTEXT,
    })

    expect(result).toHaveLength(0)
  })

  test('filters by enabledSources config (only compendium)', () => {
    const config = { ...DEFAULT_MARKET_CONFIG, enabledSources: ['compendium'] }
    const worldItems = [makeWorldItem({ uuid: 'world.1', name: 'Blaster', type: 'weapon', basePrice: 500 })]
    const compendiumItems = [makeCompendiumItem({ uuid: 'pack.1', name: 'Rifle', type: 'weapon', basePrice: 1000, _sourceId: 'swerpg.weapons' })]

    const result = loadMarketCatalog({
      worldItems,
      compendiumItems,
      config,
      marketContext: DEFAULT_MARKET_CONTEXT,
    })

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Rifle')
    expect(result[0].sourceType).toBe('compendium')
  })

  test('filters by enabledSources config (only world)', () => {
    const config = { ...DEFAULT_MARKET_CONFIG, enabledSources: ['world'] }
    const worldItems = [makeWorldItem({ uuid: 'world.1', name: 'Blaster', type: 'weapon', basePrice: 500 })]
    const compendiumItems = [makeCompendiumItem({ uuid: 'pack.1', name: 'Rifle', type: 'weapon', basePrice: 1000, _sourceId: 'swerpg.weapons' })]

    const result = loadMarketCatalog({
      worldItems,
      compendiumItems,
      config,
      marketContext: DEFAULT_MARKET_CONTEXT,
    })

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Blaster')
    expect(result[0].sourceType).toBe('world')
  })

  test('filters by allowedItemTypes config (only armor)', () => {
    const config = { ...DEFAULT_MARKET_CONFIG, allowedItemTypes: ['armor'] }
    const worldItems = [
      makeWorldItem({ uuid: 'world.1', name: 'Blaster', type: 'weapon', basePrice: 500 }),
      makeWorldItem({ uuid: 'world.2', name: 'Light Armor', type: 'armor', basePrice: 300 }),
    ]

    const result = loadMarketCatalog({
      worldItems,
      compendiumItems: [],
      config,
      marketContext: DEFAULT_MARKET_CONTEXT,
    })

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Light Armor')
    expect(result[0].itemType).toBe('armor')
  })

  test('deduplicates by prefer-compendium strategy (compendium entry wins)', () => {
    // Same name+type in world and compendium
    const worldItems = [makeWorldItem({ uuid: 'world.1', name: 'Blaster', type: 'weapon', basePrice: 500 })]
    const compendiumItems = [makeCompendiumItem({ uuid: 'pack.1', name: 'Blaster', type: 'weapon', basePrice: 500, _sourceId: 'swerpg.weapons' })]

    const result = loadMarketCatalog({
      worldItems,
      compendiumItems,
      config: DEFAULT_MARKET_CONFIG,
      marketContext: DEFAULT_MARKET_CONTEXT,
    })

    expect(result).toHaveLength(1)
    expect(result[0].sourceType).toBe('compendium')
  })

  test('keep-all strategy retains both duplicates', () => {
    const config = { ...DEFAULT_MARKET_CONFIG, dedupStrategy: 'keep-all' }
    const worldItems = [makeWorldItem({ uuid: 'world.1', name: 'Blaster', type: 'weapon', basePrice: 500 })]
    const compendiumItems = [makeCompendiumItem({ uuid: 'pack.1', name: 'Blaster', type: 'weapon', basePrice: 500, _sourceId: 'swerpg.weapons' })]

    const result = loadMarketCatalog({
      worldItems,
      compendiumItems,
      config,
      marketContext: DEFAULT_MARKET_CONTEXT,
    })

    expect(result).toHaveLength(2)
  })

  test('returns empty array when both sources are empty', () => {
    const result = loadMarketCatalog({
      worldItems: [],
      compendiumItems: [],
      config: DEFAULT_MARKET_CONFIG,
      marketContext: DEFAULT_MARKET_CONTEXT,
    })

    expect(result).toHaveLength(0)
  })

  test('sets sourceId from _sourceId on compendium items', () => {
    const compendiumItems = [makeCompendiumItem({ uuid: 'pack.1', name: 'Rifle', _sourceId: 'swerpg.weapons' })]

    const result = loadMarketCatalog({
      worldItems: [],
      compendiumItems,
      config: DEFAULT_MARKET_CONFIG,
      marketContext: DEFAULT_MARKET_CONTEXT,
    })

    expect(result[0].sourceId).toBe('swerpg.weapons')
  })

  test('all items from both sources are included when no duplicates and config allows all', () => {
    const worldItems = [
      makeWorldItem({ uuid: 'world.1', name: 'Blaster', type: 'weapon', basePrice: 100 }),
      makeWorldItem({ uuid: 'world.2', name: 'Light Armor', type: 'armor', basePrice: 200 }),
    ]
    const compendiumItems = [
      makeCompendiumItem({ uuid: 'pack.1', name: 'Vibro Knife', type: 'weapon', basePrice: 150, _sourceId: 'swerpg.weapons' }),
      makeCompendiumItem({ uuid: 'pack.2', name: 'Medpac', type: 'gear', basePrice: 25, _sourceId: 'swerpg.gear' }),
    ]

    const result = loadMarketCatalog({
      worldItems,
      compendiumItems,
      config: DEFAULT_MARKET_CONFIG,
      marketContext: DEFAULT_MARKET_CONTEXT,
    })

    expect(result).toHaveLength(4)
  })

  test('excludes items whose UUID is in excludedIds', () => {
    const worldItems = [
      makeWorldItem({ uuid: 'world.1', name: 'Blaster', type: 'weapon', basePrice: 500 }),
      makeWorldItem({ uuid: 'world.2', name: 'Light Armor', type: 'armor', basePrice: 300 }),
    ]

    const result = loadMarketCatalog({
      worldItems,
      compendiumItems: [],
      config: DEFAULT_MARKET_CONFIG,
      marketContext: DEFAULT_MARKET_CONTEXT,
      excludedIds: ['world.1'],
    })

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Light Armor')
  })

  test('excludes compendium items by UUID', () => {
    const compendiumItems = [
      makeCompendiumItem({ uuid: 'pack.1', name: 'Rifle', type: 'weapon', basePrice: 1000, _sourceId: 'swerpg.weapons' }),
      makeCompendiumItem({ uuid: 'pack.2', name: 'Medpac', type: 'gear', basePrice: 25, _sourceId: 'swerpg.gear' }),
    ]

    const result = loadMarketCatalog({
      worldItems: [],
      compendiumItems,
      config: DEFAULT_MARKET_CONFIG,
      marketContext: DEFAULT_MARKET_CONTEXT,
      excludedIds: ['pack.1'],
    })

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Medpac')
  })

  test('excludes no items when excludedIds is empty', () => {
    const worldItems = [makeWorldItem({ uuid: 'world.1', name: 'Blaster', type: 'weapon', basePrice: 500 })]

    const result = loadMarketCatalog({
      worldItems,
      compendiumItems: [],
      config: DEFAULT_MARKET_CONFIG,
      marketContext: DEFAULT_MARKET_CONTEXT,
      excludedIds: [],
    })

    expect(result).toHaveLength(1)
  })

  test('excludes all items when all UUIDs are in excludedIds', () => {
    const worldItems = [
      makeWorldItem({ uuid: 'world.1', name: 'Blaster', type: 'weapon', basePrice: 500 }),
      makeWorldItem({ uuid: 'world.2', name: 'Light Armor', type: 'armor', basePrice: 300 }),
    ]

    const result = loadMarketCatalog({
      worldItems,
      compendiumItems: [],
      config: DEFAULT_MARKET_CONFIG,
      marketContext: DEFAULT_MARKET_CONTEXT,
      excludedIds: ['world.1', 'world.2'],
    })

    expect(result).toHaveLength(0)
  })

  test('ignores UUIDs in excludedIds that do not match any item', () => {
    const worldItems = [makeWorldItem({ uuid: 'world.1', name: 'Blaster', type: 'weapon', basePrice: 500 })]

    const result = loadMarketCatalog({
      worldItems,
      compendiumItems: [],
      config: DEFAULT_MARKET_CONFIG,
      marketContext: DEFAULT_MARKET_CONTEXT,
      excludedIds: ['nonexistent.uuid'],
    })

    expect(result).toHaveLength(1)
  })
})
