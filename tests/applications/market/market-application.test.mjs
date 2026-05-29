import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setupFoundryMock, teardownFoundryMock } from '../../helpers/mock-foundry.mjs'

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

/**
 * Build a minimal Foundry Item mock suitable for market tests.
 * Uses item.system.price (the actual Foundry model field), not basePrice.
 * @param {object} [overrides]
 */
function makeItem(overrides = {}) {
  const systemOverrides = overrides.system ?? {}
  return {
    uuid: overrides.uuid ?? `Item.${Math.random().toString(36).slice(2, 8)}`,
    name: overrides.name ?? 'Test Item',
    img: overrides.img ?? 'icons/test.webp',
    type: overrides.type ?? 'weapon',
    system: {
      // Foundry physical item model uses `price`, not `basePrice`
      price: overrides.price ?? systemOverrides.price ?? 100,
      rarity: overrides.rarity ?? systemOverrides.rarity ?? 2,
      quality: overrides.quality ?? systemOverrides.quality ?? 'standard',
      restrictionLevel: overrides.restrictionLevel ?? systemOverrides.restrictionLevel ?? 'none',
      availability: overrides.availability ?? systemOverrides.availability ?? 'available',
      nonPurchasable: overrides.nonPurchasable ?? systemOverrides.nonPurchasable ?? false,
      broken: overrides.broken ?? systemOverrides.broken ?? false,
      ...systemOverrides,
    },
    sheet: {
      render: vi.fn(),
    },
  }
}

/**
 * Build a mock game.items collection from an array of items.
 * @param {object[]} items
 */
function makeItemsCollection(items) {
  return {
    [Symbol.iterator]() {
      return items[Symbol.iterator]()
    },
  }
}

/* -------------------------------------------- */
/*  Tests                                       */
/* -------------------------------------------- */

describe('MarketApplicationV2', () => {
  let MarketApplicationV2

  beforeEach(async () => {
    setupFoundryMock({
      translations: {
        'MARKET.Title': 'Market',
        'MARKET.Catalog.Empty': 'No items available in the market.',
        'MARKET.Catalog.EmptySearch': 'No items match your search or filters.',
        'MARKET.Catalog.OpenSheet': 'Open item sheet',
        'MARKET.Catalog.Column.Name': 'Name',
        'MARKET.Catalog.Column.Type': 'Type',
        'MARKET.Catalog.Column.Price': 'Price',
        'MARKET.Catalog.Column.Rarity': 'Rarity',
        'MARKET.Catalog.Column.Restriction': 'Restriction',
        'MARKET.Toolbar.Search.Label': 'Search items',
        'MARKET.Toolbar.Search.Placeholder': 'Search…',
        'MARKET.Toolbar.Filter.AllTypes': 'All types',
        'MARKET.Toolbar.Filter.AllSources': 'All sources',
        'MARKET.Toolbar.Sort.Name': 'Name',
        'MARKET.Toolbar.Sort.Price': 'Price',
        'MARKET.Toolbar.Sort.Rarity': 'Rarity',
        'MARKET.Toolbar.Reset.Label': 'Reset',
        'MARKET.Toolbar.Reset.Tooltip': 'Reset filters and search',
      },
    })
    ;({ default: MarketApplicationV2 } = await import('../../../module/applications/market/market-application.mjs'))
  })

  afterEach(() => {
    teardownFoundryMock()
    vi.resetModules()
  })

  /* -------------------------------------------- */
  /*  Constructor & static config                 */
  /* -------------------------------------------- */

  describe('static configuration', () => {
    it('has id "market"', () => {
      expect(MarketApplicationV2.DEFAULT_OPTIONS.id).toBe('market')
    })

    it('has a catalog PART', () => {
      expect(MarketApplicationV2.PARTS).toHaveProperty('catalog')
      expect(MarketApplicationV2.PARTS.catalog.template).toContain('market.hbs')
    })

    it('declares the openItem action', () => {
      expect(MarketApplicationV2.DEFAULT_OPTIONS.actions).toHaveProperty('openItem')
    })

    it('declares the resetCatalog action', () => {
      expect(MarketApplicationV2.DEFAULT_OPTIONS.actions).toHaveProperty('resetCatalog')
    })

    it('declares the buyItem action', () => {
      expect(MarketApplicationV2.DEFAULT_OPTIONS.actions).toHaveProperty('buyItem')
    })
  })

  /* -------------------------------------------- */
  /*  _viewState default                          */
  /* -------------------------------------------- */

  describe('_viewState default', () => {
    it('starts with empty search and no filters', () => {
      const app = new MarketApplicationV2()
      expect(app._viewState.search).toBe('')
      expect(app._viewState.filterType).toBe('')
      expect(app._viewState.filterSource).toBe('')
      expect(app._viewState.filterRestriction).toBe('')
    })

    it('starts sorted by name ascending', () => {
      const app = new MarketApplicationV2()
      expect(app._viewState.sortBy).toBe('name')
      expect(app._viewState.sortDirection).toBe('asc')
    })

    it('starts with activeMarketType set to "standard"', () => {
      const app = new MarketApplicationV2()
      expect(app._viewState.activeMarketType).toBe('standard')
    })
  })

  /* -------------------------------------------- */
  /*  Buyer actor management                      */
  /* -------------------------------------------- */

  describe('setBuyerActor', () => {
    it('starts with null buyer actor', () => {
      const app = new MarketApplicationV2()
      expect(app._buyerActor).toBeNull()
    })

    it('stores the actor passed to setBuyerActor', () => {
      const app = new MarketApplicationV2()
      const actor = { id: 'actor-1', name: 'Test Character', system: { credits: 500 } }
      app.setBuyerActor(actor)
      expect(app._buyerActor).toBe(actor)
    })

    it('clears the buyer actor when called with null', () => {
      const app = new MarketApplicationV2()
      app._buyerActor = { id: 'actor-1', name: 'Test' }
      app.setBuyerActor(null)
      expect(app._buyerActor).toBeNull()
    })
  })

  describe('buyer context in _preparePartContext', () => {
    it('exposes buyer as null when no buyer actor is set', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.buyer).toBeNull()
    })

    it('exposes buyer name and credits when buyer actor is set', async () => {
      globalThis.game.items = makeItemsCollection([])

      const actor = { id: 'actor-1', name: 'Vara Kesh', system: { credits: 750 } }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const context = await app._preparePartContext('catalog', {})

      expect(context.buyer).not.toBeNull()
      expect(context.buyer.id).toBe('actor-1')
      expect(context.buyer.name).toBe('Vara Kesh')
      expect(context.buyer.credits).toBe(750)
    })
  })

  describe('canBuy annotation on catalog entries', () => {
    it('sets canBuy=false on all entries when no buyer actor', async () => {
      const item = makeItem({ type: 'weapon', name: 'Blaster', price: 100 })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.items[0].canBuy).toBe(false)
    })

    it('sets canBuy=true when buyer has sufficient credits', async () => {
      const item = makeItem({ type: 'weapon', name: 'Blaster', price: 100 })
      globalThis.game.items = makeItemsCollection([item])

      const actor = { id: 'actor-1', name: 'Test', system: { credits: 500 } }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.items[0].canBuy).toBe(true)
    })

    it('sets canBuy=false when buyer has insufficient credits', async () => {
      const item = makeItem({ type: 'weapon', name: 'Blaster', price: 1000 })
      globalThis.game.items = makeItemsCollection([item])

      const actor = { id: 'actor-1', name: 'Test', system: { credits: 50 } }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.items[0].canBuy).toBe(false)
      expect(context.catalog.items[0].buyBlockedReason).toBe('insufficient-credits')
    })
  })

  /* -------------------------------------------- */
  /*  #prepareCatalog via _preparePartContext     */
  /* -------------------------------------------- */

  describe('_preparePartContext — catalog', () => {
    it('returns a flat item list with all types', async () => {
      const weaponItem = makeItem({ type: 'weapon', name: 'Blaster Pistol' })
      const armorItem = makeItem({ type: 'armor', name: 'Light Armor', basePrice: 200 })
      globalThis.game.items = makeItemsCollection([weaponItem, armorItem])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.isEmpty).toBe(false)
      expect(Array.isArray(context.catalog.items)).toBe(true)
      expect(context.catalog.items).toHaveLength(2)

      const names = context.catalog.items.map((e) => e.name)
      expect(names).toContain('Blaster Pistol')
      expect(names).toContain('Light Armor')
    })

    it('excludes items with non-purchasable types (e.g. talent)', async () => {
      const talentItem = makeItem({ type: 'talent', name: 'Force Sensitive' })
      globalThis.game.items = makeItemsCollection([talentItem])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.isEmpty).toBe(true)
      expect(context.catalog.items).toHaveLength(0)
    })

    it('excludes ineligible items (nonPurchasable=true)', async () => {
      const item = makeItem({ type: 'weapon', nonPurchasable: true })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.isEmpty).toBe(true)
    })

    it('excludes broken items', async () => {
      const item = makeItem({ type: 'armor', broken: true })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.isEmpty).toBe(true)
    })

    it('returns isEmpty=true when game.items is empty', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.isEmpty).toBe(true)
      expect(context.catalog.items).toHaveLength(0)
    })

    it('gear item with price 200 and rarity 1 should have non-zero basePrice and finalPrice', async () => {
      // Regression test: gear items were displaying price 0 in the Market because
      // itemToRawItem() was reading system.price (post-derivation, potentially NaN)
      // instead of system._source.price (schema source value).
      const gearItem = makeItem({
        type: 'gear',
        name: 'Medpac',
        price: 200,
        rarity: 1,
        availability: 'available',
      })
      // Simulate a Foundry Item document where _source holds the raw schema values
      gearItem.system._source = { price: 200, rarity: 1 }
      globalThis.game.items = makeItemsCollection([gearItem])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.items).toHaveLength(1)

      const entry = context.catalog.items[0]
      expect(entry.basePrice).toBeGreaterThan(0)
      expect(entry.priceResult.finalPrice).toBeGreaterThan(0)
    })

    it('uses item.uuid as sourceId in the market entry', async () => {
      const item = makeItem({ type: 'weapon', uuid: 'Item.myUuid' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.items[0]
      expect(entry.sourceId).toBe('Item.myUuid')
      expect(entry.sourceType).toBe('world')
    })

    it('exposes priceResult on each catalog entry', async () => {
      const item = makeItem({ type: 'weapon', price: 100, rarity: 0, availability: 'available' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.items[0]
      expect(entry.priceResult).toBeDefined()
      expect(typeof entry.priceResult.finalPrice).toBe('number')
      expect(typeof entry.priceResult.basePrice).toBe('number')
      expect(Array.isArray(entry.priceResult.modifiers)).toBe(true)
    })

    it('does not mutate context for non-catalog parts', async () => {
      const app = new MarketApplicationV2()
      const context = { someExistingKey: 'value' }
      const result = await app._preparePartContext('other', context)

      expect(result).not.toHaveProperty('catalog')
      expect(result.someExistingKey).toBe('value')
    })

    it('exposes viewState, sortOptions, and typeFilterOptions in catalog context', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.viewState).toBeDefined()
      expect(context.sortOptions).toBeDefined()
      expect(Array.isArray(context.sortOptions)).toBe(true)
      expect(context.typeFilterOptions).toBeDefined()
      expect(Array.isArray(context.typeFilterOptions)).toBe(true)
      expect(context.sourceFilterOptions).toBeDefined()
      expect(Array.isArray(context.sourceFilterOptions)).toBe(true)
    })

    it('exposes totalCount and filteredCount in catalog', async () => {
      const weapon = makeItem({ type: 'weapon', name: 'Blaster' })
      const armor = makeItem({ type: 'armor', name: 'Armor' })
      globalThis.game.items = makeItemsCollection([weapon, armor])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.totalCount).toBe(2)
      expect(context.catalog.filteredCount).toBe(2)
    })
  })

  /* -------------------------------------------- */
  /*  Text search                                 */
  /* -------------------------------------------- */

  describe('text search', () => {
    it('filters items by name (case-insensitive)', async () => {
      const blaster = makeItem({ type: 'weapon', name: 'Blaster Pistol' })
      const vibro = makeItem({ type: 'weapon', name: 'Vibro Knife' })
      globalThis.game.items = makeItemsCollection([blaster, vibro])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, search: 'blaster' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.items).toHaveLength(1)
      expect(context.catalog.items[0].name).toBe('Blaster Pistol')
    })

    it('is case-insensitive', async () => {
      const item = makeItem({ type: 'weapon', name: 'Blaster Pistol' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, search: 'BLASTER' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.filteredCount).toBe(1)
    })

    it('returns isFilteredEmpty=true when search matches nothing but items exist', async () => {
      const item = makeItem({ type: 'weapon', name: 'Vibro Knife' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, search: 'lightsaber' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.isEmpty).toBe(false)
      expect(context.catalog.isFilteredEmpty).toBe(true)
      expect(context.catalog.filteredCount).toBe(0)
      expect(context.catalog.totalCount).toBe(1)
    })

    it('empty search returns all eligible items', async () => {
      const item1 = makeItem({ type: 'weapon', name: 'Blaster' })
      const item2 = makeItem({ type: 'armor', name: 'Armor' })
      globalThis.game.items = makeItemsCollection([item1, item2])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, search: '' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.filteredCount).toBe(2)
    })
  })

  /* -------------------------------------------- */
  /*  Filters                                     */
  /* -------------------------------------------- */

  describe('type filter', () => {
    it('restricts visible items to the selected type', async () => {
      const weapon = makeItem({ type: 'weapon', name: 'Blaster' })
      const armor = makeItem({ type: 'armor', name: 'Armor' })
      globalThis.game.items = makeItemsCollection([weapon, armor])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, filterType: 'weapon' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.filteredCount).toBe(1)
      expect(context.catalog.items.every((e) => e.itemType === 'weapon')).toBe(true)
    })

    it('empty filterType shows all types', async () => {
      const weapon = makeItem({ type: 'weapon', name: 'Blaster' })
      const armor = makeItem({ type: 'armor', name: 'Armor' })
      globalThis.game.items = makeItemsCollection([weapon, armor])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, filterType: '' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.filteredCount).toBe(2)
    })
  })

  describe('source filter', () => {
    it('restricts visible items to the selected source', async () => {
      const weapon = makeItem({ type: 'weapon', name: 'Blaster' })
      globalThis.game.items = makeItemsCollection([weapon])

      const app = new MarketApplicationV2()
      // All items are sourceType='world' by default in the adapter
      app._viewState = { ...app._viewState, filterSource: 'world' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.filteredCount).toBe(1)
    })

    it('returns isFilteredEmpty when source filter excludes all items', async () => {
      const weapon = makeItem({ type: 'weapon', name: 'Blaster' })
      globalThis.game.items = makeItemsCollection([weapon])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, filterSource: 'compendium' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.isFilteredEmpty).toBe(true)
    })
  })

  describe('cumulative filters', () => {
    it('applies search and type filter together', async () => {
      const blasterW = makeItem({ type: 'weapon', name: 'Blaster Pistol' })
      const vibroW = makeItem({ type: 'weapon', name: 'Vibro Knife' })
      const blasterA = makeItem({ type: 'armor', name: 'Blaster Armor' })
      globalThis.game.items = makeItemsCollection([blasterW, vibroW, blasterA])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, search: 'blaster', filterType: 'weapon' }
      const context = await app._preparePartContext('catalog', {})

      // Only the weapon named "Blaster Pistol" — armor is excluded by type, vibro by search
      expect(context.catalog.filteredCount).toBe(1)
      expect(context.catalog.items[0].name).toBe('Blaster Pistol')
    })

    it('does not re-introduce items excluded by eligibility', async () => {
      const eligible = makeItem({ type: 'weapon', name: 'Blaster' })
      const nonPurchasable = makeItem({ type: 'weapon', name: 'Blaster Broken', nonPurchasable: true })
      globalThis.game.items = makeItemsCollection([eligible, nonPurchasable])

      const app = new MarketApplicationV2()
      // Search would match both names, but nonPurchasable is ineligible before filtering
      app._viewState = { ...app._viewState, search: 'blaster' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.filteredCount).toBe(1)
      expect(context.catalog.items[0].name).toBe('Blaster')
    })
  })

  /* -------------------------------------------- */
  /*  Sort                                        */
  /* -------------------------------------------- */

  describe('sort by name', () => {
    it('sorts ascending (A→Z)', async () => {
      const z = makeItem({ type: 'weapon', name: 'Z-6 Rotary Blaster' })
      const a = makeItem({ type: 'weapon', name: 'A-310 Rifle' })
      const m = makeItem({ type: 'weapon', name: 'Blaster Pistol' })
      globalThis.game.items = makeItemsCollection([z, a, m])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, sortBy: 'name', sortDirection: 'asc' }
      const context = await app._preparePartContext('catalog', {})

      const names = context.catalog.items.map((e) => e.name)
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
    })

    it('sorts descending (Z→A)', async () => {
      const z = makeItem({ type: 'weapon', name: 'Z-6 Rotary Blaster' })
      const a = makeItem({ type: 'weapon', name: 'A-310 Rifle' })
      globalThis.game.items = makeItemsCollection([z, a])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, sortBy: 'name', sortDirection: 'desc' }
      const context = await app._preparePartContext('catalog', {})

      const names = context.catalog.items.map((e) => e.name)
      expect(names[0]).toBe('Z-6 Rotary Blaster')
      expect(names[1]).toBe('A-310 Rifle')
    })
  })

  describe('sort by price', () => {
    it('sorts ascending (cheapest first)', async () => {
      const cheap = makeItem({ type: 'weapon', name: 'Cheap', price: 50 })
      const expensive = makeItem({ type: 'weapon', name: 'Expensive', price: 500 })
      globalThis.game.items = makeItemsCollection([expensive, cheap])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, sortBy: 'price', sortDirection: 'asc' }
      const context = await app._preparePartContext('catalog', {})

      const prices = context.catalog.items.map((e) => e.priceResult.finalPrice)
      expect(prices[0]).toBeLessThanOrEqual(prices[1])
    })

    it('sorts descending (most expensive first)', async () => {
      const cheap = makeItem({ type: 'weapon', name: 'Cheap', price: 50 })
      const expensive = makeItem({ type: 'weapon', name: 'Expensive', price: 500 })
      globalThis.game.items = makeItemsCollection([cheap, expensive])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, sortBy: 'price', sortDirection: 'desc' }
      const context = await app._preparePartContext('catalog', {})

      const prices = context.catalog.items.map((e) => e.priceResult.finalPrice)
      expect(prices[0]).toBeGreaterThanOrEqual(prices[1])
    })

    it('sort by price uses finalPrice (not basePrice) — rarity-modified items sort on computed price', async () => {
      // Item A: basePrice=100, rarity=0 → finalPrice=100
      // Item B: basePrice=80, rarity=5 → finalPrice=80*(1+0.5)=120
      const itemA = makeItem({ type: 'weapon', name: 'Item A', price: 100, rarity: 0 })
      const itemB = makeItem({ type: 'weapon', name: 'Item B', price: 80, rarity: 5 })
      globalThis.game.items = makeItemsCollection([itemA, itemB])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, sortBy: 'price', sortDirection: 'asc' }
      const context = await app._preparePartContext('catalog', {})

      const names = context.catalog.items.map((e) => e.name)
      // Item A (finalPrice=100) should come before Item B (finalPrice=120)
      expect(names[0]).toBe('Item A')
      expect(names[1]).toBe('Item B')
    })
  })

  describe('sort by rarity', () => {
    it('sorts ascending (most common first)', async () => {
      const common = makeItem({ type: 'weapon', name: 'Common', rarity: 1 })
      const rare = makeItem({ type: 'weapon', name: 'Rare', rarity: 7 })
      globalThis.game.items = makeItemsCollection([rare, common])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, sortBy: 'rarity', sortDirection: 'asc' }
      const context = await app._preparePartContext('catalog', {})

      const rarities = context.catalog.items.map((e) => e.rarity)
      expect(rarities[0]).toBeLessThanOrEqual(rarities[1])
    })
  })

  /* -------------------------------------------- */
  /*  Reset                                       */
  /* -------------------------------------------- */

  describe('resetCatalog action', () => {
    it('resets _viewState to defaults and calls render', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = {
        search: 'blaster',
        filterType: 'weapon',
        filterSource: 'world',
        filterRestriction: 'restricted',
        sortBy: 'price',
        sortDirection: 'desc',
        activeMarketType: 'black-market',
      }
      app.render = vi.fn().mockResolvedValue(undefined)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.resetCatalog
      await action.call(app, {}, {})

      expect(app._viewState.search).toBe('')
      expect(app._viewState.filterType).toBe('')
      expect(app._viewState.filterSource).toBe('')
      expect(app._viewState.filterRestriction).toBe('')
      expect(app._viewState.sortBy).toBe('name')
      expect(app._viewState.sortDirection).toBe('asc')
      expect(app._viewState.activeMarketType).toBe('standard')
      expect(app.render).toHaveBeenCalled()
    })
  })

  /* -------------------------------------------- */
  /*  Market type selector                        */
  /* -------------------------------------------- */

  describe('_preparePartContext — marketTypeOptions', () => {
    it('exposes marketTypeOptions array in catalog context', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.marketTypeOptions).toBeDefined()
      expect(Array.isArray(context.marketTypeOptions)).toBe(true)
      expect(context.marketTypeOptions.length).toBeGreaterThanOrEqual(4)
    })

    it('each market type option has value, label, description, uiVariant', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      for (const opt of context.marketTypeOptions) {
        expect(opt).toHaveProperty('value')
        expect(opt).toHaveProperty('label')
        expect(opt).toHaveProperty('description')
        expect(opt).toHaveProperty('uiVariant')
      }
    })

    it('exposes standard, local, specialized, black-market options', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      const values = context.marketTypeOptions.map((o) => o.value)
      expect(values).toContain('standard')
      expect(values).toContain('local')
      expect(values).toContain('specialized')
      expect(values).toContain('black-market')
    })

    it('exposes activeMarketType and activeMarketDef in catalog', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.activeMarketType).toBe('standard')
      expect(context.catalog.activeMarketDef).toBeDefined()
      expect(context.catalog.activeMarketDef.id).toBe('standard')
    })
  })

  describe('changeMarket action', () => {
    it('updates activeMarketType and calls render', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app.render = vi.fn().mockResolvedValue(undefined)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.changeMarket
      const target = { dataset: { marketType: 'black-market' } }

      await action.call(app, {}, target)

      expect(app._viewState.activeMarketType).toBe('black-market')
      expect(app.render).toHaveBeenCalled()
    })

    it('does not update state for unknown market type', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app.render = vi.fn().mockResolvedValue(undefined)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.changeMarket
      const target = { dataset: { marketType: 'unknown-market' } }

      await action.call(app, {}, target)

      expect(app._viewState.activeMarketType).toBe('standard')
      expect(app.render).not.toHaveBeenCalled()
    })

    it('does not update state when marketType is absent', async () => {
      const app = new MarketApplicationV2()
      app.render = vi.fn().mockResolvedValue(undefined)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.changeMarket
      const target = { dataset: {} }

      await action.call(app, {}, target)

      expect(app._viewState.activeMarketType).toBe('standard')
      expect(app.render).not.toHaveBeenCalled()
    })
  })

  /* -------------------------------------------- */
  /*  Market-type visibility filtering            */
  /* -------------------------------------------- */

  describe('market-type visibility filtering in catalog', () => {
    it('standard market excludes veryRare items', async () => {
      const veryRareItem = makeItem({ type: 'weapon', name: 'Very Rare Weapon', availability: 'veryRare' })
      const commonItem = makeItem({ type: 'weapon', name: 'Common Blaster', availability: 'available' })
      globalThis.game.items = makeItemsCollection([veryRareItem, commonItem])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'standard' }
      const context = await app._preparePartContext('catalog', {})

      // Only commonItem should be visible
      expect(context.catalog.totalCount).toBe(1)
      const names = context.catalog.items.map((e) => e.name)
      expect(names).toContain('Common Blaster')
      expect(names).not.toContain('Very Rare Weapon')
    })

    it('black-market includes restricted items invisible in standard market', async () => {
      const restrictedItem = makeItem({ type: 'weapon', name: 'Restricted Blaster', availability: 'restricted' })
      globalThis.game.items = makeItemsCollection([restrictedItem])

      const app = new MarketApplicationV2()

      // Standard market: item hidden
      app._viewState = { ...app._viewState, activeMarketType: 'standard' }
      const standardContext = await app._preparePartContext('catalog', {})
      expect(standardContext.catalog.totalCount).toBe(0)

      // Black market: item visible
      app._viewState = { ...app._viewState, activeMarketType: 'black-market' }
      const blackMarketContext = await app._preparePartContext('catalog', {})
      expect(blackMarketContext.catalog.totalCount).toBe(1)
      expect(blackMarketContext.catalog.items[0].name).toBe('Restricted Blaster')
    })

    it('local market excludes rare items', async () => {
      const rareItem = makeItem({ type: 'weapon', name: 'Rare Blaster', availability: 'rare' })
      const commonItem = makeItem({ type: 'armor', name: 'Common Armor', availability: 'common' })
      globalThis.game.items = makeItemsCollection([rareItem, commonItem])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'local' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.totalCount).toBe(1)
      const names = context.catalog.items.map((e) => e.name)
      expect(names).toContain('Common Armor')
      expect(names).not.toContain('Rare Blaster')
    })

    it('specialized market includes veryRare items not visible in standard market', async () => {
      const veryRareItem = makeItem({ type: 'weapon', name: 'Very Rare Blaster', availability: 'veryRare' })
      globalThis.game.items = makeItemsCollection([veryRareItem])

      const app = new MarketApplicationV2()

      // Standard: hidden
      app._viewState = { ...app._viewState, activeMarketType: 'standard' }
      const stdCtx = await app._preparePartContext('catalog', {})
      expect(stdCtx.catalog.totalCount).toBe(0)

      // Specialized: visible
      app._viewState = { ...app._viewState, activeMarketType: 'specialized' }
      const specCtx = await app._preparePartContext('catalog', {})
      expect(specCtx.catalog.totalCount).toBe(1)
      expect(specCtx.catalog.items[0].name).toBe('Very Rare Blaster')
    })

    it('black-market applies a price premium (+50%) compared to standard', async () => {
      // Item price=100, rarity=0, no availability modifier → standard=100, black-market=150
      const item = makeItem({ type: 'weapon', name: 'Blaster', price: 100, rarity: 0, availability: 'available' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()

      app._viewState = { ...app._viewState, activeMarketType: 'standard' }
      const stdCtx = await app._preparePartContext('catalog', {})
      const stdPrice = stdCtx.catalog.items[0].priceResult.finalPrice

      app._viewState = { ...app._viewState, activeMarketType: 'black-market' }
      const bmCtx = await app._preparePartContext('catalog', {})
      const bmPrice = bmCtx.catalog.items[0].priceResult.finalPrice

      expect(stdPrice).toBe(100)
      expect(bmPrice).toBe(150)
    })

    it('local market applies a -10% price discount compared to standard', async () => {
      // Item price=100, rarity=0 → standard=100, local=90
      const item = makeItem({ type: 'weapon', name: 'Blaster', price: 100, rarity: 0, availability: 'available' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()

      app._viewState = { ...app._viewState, activeMarketType: 'standard' }
      const stdCtx = await app._preparePartContext('catalog', {})
      const stdPrice = stdCtx.catalog.items[0].priceResult.finalPrice

      app._viewState = { ...app._viewState, activeMarketType: 'local' }
      const localCtx = await app._preparePartContext('catalog', {})
      const localPrice = localCtx.catalog.items[0].priceResult.finalPrice

      expect(stdPrice).toBe(100)
      expect(localPrice).toBe(90)
    })
  })

  /* -------------------------------------------- */
  /*  openItem action                             */
  /* -------------------------------------------- */

  describe('openItem action', () => {
    it('calls item.sheet.render(true) with the resolved item', async () => {
      const item = makeItem({ uuid: 'Item.openMe', type: 'weapon' })
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)

      const app = new MarketApplicationV2()

      // Simulate the action by calling the static method through the actions map
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.openItem
      const row = { dataset: { uuid: 'Item.openMe' }, closest: vi.fn(() => ({ dataset: { uuid: 'Item.openMe' } })) }
      // Build a minimal event and target matching the action signature
      const event = {}
      const target = { closest: vi.fn(() => row) }

      await action.call(app, event, target)

      expect(globalThis.fromUuid).toHaveBeenCalledWith('Item.openMe')
      expect(item.sheet.render).toHaveBeenCalledWith(true)

      delete globalThis.fromUuid
    })

    it('logs a warning when the UUID cannot be resolved (item deleted)', async () => {
      globalThis.fromUuid = vi.fn().mockResolvedValue(null)

      const app = new MarketApplicationV2()
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.openItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.gone' } })) }

      // Should not throw
      await expect(action.call(app, {}, target)).resolves.toBeUndefined()

      delete globalThis.fromUuid
    })

    it('logs a warning when fromUuid throws', async () => {
      globalThis.fromUuid = vi.fn().mockRejectedValue(new Error('Invalid UUID'))

      const app = new MarketApplicationV2()
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.openItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'bad-uuid' } })) }

      await expect(action.call(app, {}, target)).resolves.toBeUndefined()

      delete globalThis.fromUuid
    })

    it('logs a warning when no data-uuid is present', async () => {
      const app = new MarketApplicationV2()
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.openItem
      // closest returns element without uuid dataset
      const target = { closest: vi.fn(() => ({ dataset: {} })) }

      await expect(action.call(app, {}, target)).resolves.toBeUndefined()
    })
  })

  /* -------------------------------------------- */
  /*  buyItem action                              */
  /* -------------------------------------------- */

  describe('buyItem action', () => {
    it('logs a warning and returns when no data-uuid is present', async () => {
      const app = new MarketApplicationV2()
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.buyItem
      const target = { closest: vi.fn(() => ({ dataset: {} })) }

      await expect(action.call(app, {}, target)).resolves.toBeUndefined()
      expect(globalThis.ui.notifications.warn).not.toHaveBeenCalled()
      expect(globalThis.ui.notifications.error).not.toHaveBeenCalled()
    })

    it('shows a warn notification when no buyer actor is set', async () => {
      const app = new MarketApplicationV2()
      // No buyer actor set (_buyerActor is null by default)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.buyItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.abc' } })) }

      await action.call(app, {}, target)

      expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith('MARKET.Purchase.Error.MissingActor')
    })

    it('shows an error notification when UUID resolves to null (item deleted)', async () => {
      const actor = { id: 'actor-1', name: 'Test', system: { credits: 500 } }
      globalThis.fromUuid = vi.fn().mockResolvedValue(null)

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.buyItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.deleted' } })) }

      await action.call(app, {}, target)

      expect(globalThis.ui.notifications.error).toHaveBeenCalledWith('MARKET.Purchase.Error.ItemNotFound')

      delete globalThis.fromUuid
    })

    it('shows a warn notification when validation fails (canPurchase=false)', async () => {
      // Buyer has insufficient credits
      const actor = { id: 'actor-1', name: 'Test', system: { credits: 10 } }
      const item = makeItem({ uuid: 'Item.expensive', type: 'weapon', price: 1000 })
      item.toObject = vi.fn(() => ({ type: 'weapon', name: item.name, system: item.system }))
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.buyItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.expensive' } })) }

      await action.call(app, {}, target)

      expect(globalThis.ui.notifications.warn).toHaveBeenCalled()

      delete globalThis.fromUuid
    })

    it('calls createEmbeddedDocuments and shows success notification when confirmed', async () => {
      // Buyer has enough credits
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        createEmbeddedDocuments: vi.fn().mockResolvedValue([]),
      }
      const item = makeItem({ uuid: 'Item.cheap', type: 'weapon', price: 100, rarity: 0 })
      item.toObject = vi.fn(() => ({ type: 'weapon', name: item.name, system: item.system }))
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)

      // Confirm dialog returns true
      globalThis.foundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(true)

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.buyItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.cheap' } })) }

      await action.call(app, {}, target)

      expect(actor.createEmbeddedDocuments).toHaveBeenCalledWith('Item', expect.any(Array))
      expect(globalThis.ui.notifications.info).toHaveBeenCalled()

      delete globalThis.fromUuid
      delete globalThis.foundry.applications.api.DialogV2.confirm
    })

    it('calls render() on the instance after a successful purchase', async () => {
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        createEmbeddedDocuments: vi.fn().mockResolvedValue([]),
      }
      const item = makeItem({ uuid: 'Item.cheap', type: 'weapon', price: 100, rarity: 0 })
      item.toObject = vi.fn(() => ({ type: 'weapon', name: item.name, system: item.system }))
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)
      globalThis.foundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(true)

      const app = new MarketApplicationV2()
      app.render = vi.fn().mockResolvedValue(undefined)
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.buyItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.cheap' } })) }

      await action.call(app, {}, target)

      expect(app.render).toHaveBeenCalled()

      delete globalThis.fromUuid
      delete globalThis.foundry.applications.api.DialogV2.confirm
    })

    it('_preparePartContext exposes updated credits and canBuy=false after purchase reduces budget below item price', async () => {
      // Actor starts with 500 credits; after buying item at 100, mock reduces credits to 400.
      // Item priced at 500 should then be canBuy=false.
      const actorSystem = { credits: 400 }
      const actor = {
        id: 'actor-1',
        name: 'Test',
        get system() {
          return actorSystem
        },
      }

      const expensiveItem = makeItem({ type: 'weapon', name: 'Expensive Blaster', price: 500 })
      globalThis.game.items = makeItemsCollection([expensiveItem])

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)

      const context = await app._preparePartContext('catalog', {})

      expect(context.buyer.credits).toBe(400)
      const entry = context.catalog.items[0]
      expect(entry.canBuy).toBe(false)
      expect(entry.buyBlockedReason).toBe('insufficient-credits')
    })

    it('does not mutate actor when dialog is cancelled', async () => {
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        createEmbeddedDocuments: vi.fn().mockResolvedValue([]),
      }
      const item = makeItem({ uuid: 'Item.cheap', type: 'weapon', price: 100, rarity: 0 })
      item.toObject = vi.fn(() => ({ type: 'weapon', name: item.name, system: item.system }))
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)

      // Cancel dialog
      globalThis.foundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(false)

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.buyItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.cheap' } })) }

      await action.call(app, {}, target)

      expect(actor.createEmbeddedDocuments).not.toHaveBeenCalled()
      expect(globalThis.ui.notifications.info).not.toHaveBeenCalled()

      delete globalThis.fromUuid
      delete globalThis.foundry.applications.api.DialogV2.confirm
    })
  })
})
