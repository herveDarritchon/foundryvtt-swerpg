import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setupFoundryMock, teardownFoundryMock } from '../../helpers/mock-foundry.mjs'

// Module-level mocks for dialogs — these intercept the dynamic import chain.
// The mock factories produce stable vi.fn() objects so they can be configured per-test.
vi.mock('../../../module/applications/market/negotiation-dialog.mjs', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('../../../module/applications/market/consequences-dialog.mjs', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('../../../module/applications/market/availability-check-dialog.mjs', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

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
      // NOTE: `availability` is NOT a field in the physical item schema.
      // Market availability is always derived from rarity + restrictionLevel via deriveAvailability().
      // Callers must NOT set `availability` here — use rarity/restrictionLevel to control derived availability.
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
  let NegotiationDialogMock
  let ConsequencesDialogMock
  let AvailabilityCheckDialogMock

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
        'MARKET.Mode.Buy': 'Buy',
        'MARKET.Mode.Sell': 'Sell',
        'MARKET.Inventory.Description': 'Select items from your inventory to sell.',
        'MARKET.Inventory.BasePrice': 'Base Price',
        'MARKET.Inventory.ResaleEstimate': 'Resale (25%)',
        'MARKET.Inventory.SellButton': 'Sell',
        'MARKET.Inventory.SellAriaLabel': 'Sell',
        'MARKET.Inventory.Empty': 'Your inventory contains no sellable items.',
        'MARKET.Sell.Confirm.Title': 'Sell {name}',
        'MARKET.Sell.Confirm.Content': 'Confirm sale of {name} for {price} credits. Current credits: {credits} → {remaining} after sale.',
        'MARKET.Sell.Confirm.Sell': 'Sell for {price} credits',
        'MARKET.Sell.Confirm.Cancel': 'Cancel',
        'MARKET.Sell.Negotiate.Title': 'Improve Resale Price',
        'MARKET.Sell.Negotiate.Offer': 'Attempt to negotiate a better resale price?',
        'MARKET.Sell.Negotiate.Accept': 'Attempt Negotiation',
        'MARKET.Sell.Negotiate.Skip': 'Keep Base Price (25%)',
        'MARKET.Sale.Success': 'Sold {name} for {price} credits. Credits remaining: {remaining}.',
        'MARKET.Sale.Error.ItemNotFound': 'Item was not found in your inventory.',
        'MARKET.Sale.Error.WriteFailed': 'Failed to complete the sale. Check the console for details.',
        'MARKET.Sale.Error.UnsellableType': 'This item type cannot be sold.',
        'MARKET.Sale.Error.InvalidPrice': 'Item has no valid base price.',
        'MARKET.Sale.Error.NotInInventory': 'Item is not in your inventory.',
        'MARKET.Sale.Error.MissingActor': 'No seller actor found.',
      },
    })
    ;({ default: MarketApplicationV2 } = await import('../../../module/applications/market/market-application.mjs'))
    ;({ default: NegotiationDialogMock } = await import('../../../module/applications/market/negotiation-dialog.mjs'))
    ;({ default: ConsequencesDialogMock } = await import('../../../module/applications/market/consequences-dialog.mjs'))
    ;({ default: AvailabilityCheckDialogMock } = await import('../../../module/applications/market/availability-check-dialog.mjs'))

    // Default: consequences dialog confirms with no consequences (no narrative risks).
    // Tests that need different behavior override this before calling the action.
    ConsequencesDialogMock.prompt.mockResolvedValue({ confirmed: true, acceptedTypes: [], rejectedTypes: [] })

    // Default: availability check passes (not required for low-rarity, non-restricted items).
    // Tests involving rare/restricted items override this to simulate specific check results.
    AvailabilityCheckDialogMock.prompt.mockResolvedValue({ passed: true, testResult: null })
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

    it('exposes buyer formattedCredits as a non-empty string when credits are set', async () => {
      globalThis.game.items = makeItemsCollection([])

      const actor = { id: 'actor-1', name: 'Vara Kesh', system: { credits: 1250 } }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const context = await app._preparePartContext('catalog', {})

      expect(context.buyer).not.toBeNull()
      expect(typeof context.buyer.formattedCredits).toBe('string')
      expect(context.buyer.formattedCredits).not.toBe('')
    })

    it('exposes buyer formattedCredits as "—" when credits are null', async () => {
      globalThis.game.items = makeItemsCollection([])

      // Actor with no credits field — resolves to null
      const actor = { id: 'actor-1', name: 'No Credits', system: {} }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const context = await app._preparePartContext('catalog', {})

      expect(context.buyer).not.toBeNull()
      expect(context.buyer.formattedCredits).toBe('—')
    })

    it('exposes formattedCredits derived from creditBudget.availableCredits when present', async () => {
      globalThis.game.items = makeItemsCollection([])

      const actor = {
        id: 'actor-2',
        name: 'Rich Character',
        system: { creditBudget: { availableCredits: 3000 }, credits: 0 },
      }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const context = await app._preparePartContext('catalog', {})

      expect(context.buyer).not.toBeNull()
      // formattedCredits must reflect creditBudget.availableCredits (3000), not system.credits (0)
      expect(context.buyer.credits).toBe(3000)
      expect(typeof context.buyer.formattedCredits).toBe('string')
      expect(context.buyer.formattedCredits).not.toBe('—')
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
  /*  Affordable-only filter                      */
  /* -------------------------------------------- */

  describe('affordableOnly filter', () => {
    it('_viewState starts with affordableOnly=false', () => {
      const app = new MarketApplicationV2()
      expect(app._viewState.affordableOnly).toBe(false)
    })

    it('with affordableOnly=false, shows all items regardless of buyer budget', async () => {
      const cheap = makeItem({ type: 'weapon', name: 'Cheap Blaster', price: 50 })
      const expensive = makeItem({ type: 'weapon', name: 'Expensive Blaster', price: 9999 })
      globalThis.game.items = makeItemsCollection([cheap, expensive])

      const actor = { id: 'actor-1', name: 'Test', system: { credits: 100 } }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      app._viewState = { ...app._viewState, affordableOnly: false }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.filteredCount).toBe(2)
    })

    it('with affordableOnly=true and a buyer, shows only items the buyer can afford', async () => {
      const cheap = makeItem({ type: 'weapon', name: 'Cheap Blaster', price: 50 })
      const expensive = makeItem({ type: 'weapon', name: 'Expensive Blaster', price: 9999 })
      globalThis.game.items = makeItemsCollection([cheap, expensive])

      const actor = { id: 'actor-1', name: 'Test', system: { credits: 100 } }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      app._viewState = { ...app._viewState, affordableOnly: true }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.filteredCount).toBe(1)
      expect(context.catalog.items[0].name).toBe('Cheap Blaster')
    })

    it('with affordableOnly=true but no buyer, shows all items (filter is a no-op)', async () => {
      const cheap = makeItem({ type: 'weapon', name: 'Cheap Blaster', price: 50 })
      const expensive = makeItem({ type: 'weapon', name: 'Expensive Blaster', price: 9999 })
      globalThis.game.items = makeItemsCollection([cheap, expensive])

      const app = new MarketApplicationV2()
      // No buyer set — filter must not apply
      app._viewState = { ...app._viewState, affordableOnly: true }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.filteredCount).toBe(2)
    })

    it('with affordableOnly=true and buyer who cannot afford any item, returns isFilteredEmpty=true', async () => {
      const expensive = makeItem({ type: 'weapon', name: 'Expensive Blaster', price: 9999 })
      globalThis.game.items = makeItemsCollection([expensive])

      const actor = { id: 'actor-1', name: 'Test', system: { credits: 1 } }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      app._viewState = { ...app._viewState, affordableOnly: true }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.totalCount).toBe(1)
      expect(context.catalog.filteredCount).toBe(0)
      expect(context.catalog.isFilteredEmpty).toBe(true)
    })

    it('resetCatalog action resets affordableOnly to false', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, affordableOnly: true }
      app.render = vi.fn().mockResolvedValue(undefined)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.resetCatalog
      await action.call(app, {}, {})

      expect(app._viewState.affordableOnly).toBe(false)
      expect(app.render).toHaveBeenCalled()
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
      // rarity=1 → 'available', rarity=5 → 'rare': both visible in standard market
      const common = makeItem({ type: 'weapon', name: 'Common', rarity: 1 })
      const rare = makeItem({ type: 'weapon', name: 'Rare', rarity: 5 })
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
      // rarity=7 → derives 'veryRare' (threshold is 7); rarity=1 → derives 'available'
      const veryRareItem = makeItem({ type: 'weapon', name: 'Very Rare Weapon', rarity: 7 })
      const commonItem = makeItem({ type: 'weapon', name: 'Common Blaster', rarity: 1 })
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
      // restrictionLevel='restricted' derives availability='restricted'
      const restrictedItem = makeItem({ type: 'weapon', name: 'Restricted Blaster', restrictionLevel: 'restricted', rarity: 0 })
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
      // rarity=5 → derives 'rare'; rarity=3 → derives 'common'
      const rareItem = makeItem({ type: 'weapon', name: 'Rare Blaster', rarity: 5 })
      const commonItem = makeItem({ type: 'armor', name: 'Common Armor', rarity: 3 })
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
      // rarity=7 → derives 'veryRare' (threshold is 7)
      const veryRareItem = makeItem({ type: 'weapon', name: 'Very Rare Blaster', rarity: 7 })
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
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.expensive' }, querySelector: vi.fn().mockReturnValue(null) })) }

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
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.cheap' }, querySelector: vi.fn().mockReturnValue(null) })) }

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
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.cheap' }, querySelector: vi.fn().mockReturnValue(null) })) }

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
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.cheap' }, querySelector: vi.fn().mockReturnValue(null) })) }

      await action.call(app, {}, target)

      expect(actor.createEmbeddedDocuments).not.toHaveBeenCalled()
      expect(globalThis.ui.notifications.info).not.toHaveBeenCalled()

      delete globalThis.fromUuid
      delete globalThis.foundry.applications.api.DialogV2.confirm
    })

    it('[non-regression] buyItem still triggers AvailabilityCheckDialog for a rare item and aborts if it fails', async () => {
      const actor = { id: 'actor-1', name: 'Test', system: { credits: 500 } }
      // rarity=4 triggers check in buy flow too
      const item = makeItem({ uuid: 'Item.rare', type: 'weapon', price: 200, rarity: 4, restrictionLevel: 'none' })
      item.toObject = vi.fn(() => ({ type: 'weapon', name: item.name, system: item.system }))
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)

      // Check fails
      AvailabilityCheckDialogMock.prompt.mockResolvedValue({ passed: false, testResult: null })

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.buyItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.rare' } })) }

      await action.call(app, {}, target)

      expect(AvailabilityCheckDialogMock.prompt).toHaveBeenCalled()
      // Purchase must be aborted — no confirmation dialog opened
      expect(globalThis.foundry?.applications?.api?.DialogV2?.confirm ?? vi.fn()).not.toHaveBeenCalled()
      expect(globalThis.ui.notifications.warn).toHaveBeenCalled()

      delete globalThis.fromUuid
    })
  })

  /* -------------------------------------------- */
  /*  negotiateItem action (Phase 7)               */
  /* -------------------------------------------- */

  describe('negotiateItem action', () => {
    it('declares the negotiateItem action in DEFAULT_OPTIONS.actions', () => {
      expect(MarketApplicationV2.DEFAULT_OPTIONS.actions).toHaveProperty('negotiateItem')
    })

    it('logs a warning and returns when no data-uuid is present', async () => {
      const app = new MarketApplicationV2()
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.negotiateItem
      const target = { closest: vi.fn(() => ({ dataset: {} })) }

      await expect(action.call(app, {}, target)).resolves.toBeUndefined()
      expect(globalThis.ui.notifications.warn).not.toHaveBeenCalled()
    })

    it('shows a warn notification when no buyer actor is set', async () => {
      const app = new MarketApplicationV2()
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.negotiateItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.abc' } })) }

      await action.call(app, {}, target)

      expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith('MARKET.Purchase.Error.MissingActor')
    })

    it('shows an error notification when UUID resolves to null (item deleted)', async () => {
      const actor = { id: 'actor-1', name: 'Test', system: { credits: 500 } }
      globalThis.fromUuid = vi.fn().mockResolvedValue(null)

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.negotiateItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.gone' } })) }

      await action.call(app, {}, target)

      expect(globalThis.ui.notifications.error).toHaveBeenCalledWith('MARKET.Purchase.Error.ItemNotFound')

      delete globalThis.fromUuid
    })

    it('shows an error notification when fromUuid throws', async () => {
      const actor = { id: 'actor-1', name: 'Test', system: { credits: 500 } }
      globalThis.fromUuid = vi.fn().mockRejectedValue(new Error('Invalid UUID'))

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.negotiateItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'bad-uuid' } })) }

      await action.call(app, {}, target)

      expect(globalThis.ui.notifications.error).toHaveBeenCalledWith('MARKET.Purchase.Error.ItemNotFound')

      delete globalThis.fromUuid
    })

    it('aborts silently when NegotiationDialog.prompt returns null (user cancelled)', async () => {
      const actor = { id: 'actor-1', name: 'Test', system: { credits: 500 } }
      const item = makeItem({ uuid: 'Item.cheap', type: 'weapon', price: 100, rarity: 0 })
      item.toObject = vi.fn(() => ({ type: 'weapon', name: item.name, system: item.system }))
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)

      // User cancels the negotiation dialog
      NegotiationDialogMock.prompt.mockResolvedValue(null)

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.negotiateItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.cheap' }, querySelector: vi.fn().mockReturnValue(null) })) }

      await action.call(app, {}, target)

      expect(globalThis.ui.notifications.info).not.toHaveBeenCalled()
      expect(globalThis.ui.notifications.error).not.toHaveBeenCalled()

      delete globalThis.fromUuid
    })

    it('aborts silently when NegotiationDialog.prompt returns confirmed=false', async () => {
      const actor = { id: 'actor-1', name: 'Test', system: { credits: 500 } }
      const item = makeItem({ uuid: 'Item.cheap', type: 'weapon', price: 100, rarity: 0 })
      item.toObject = vi.fn(() => ({ type: 'weapon', name: item.name, system: item.system }))
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)

      NegotiationDialogMock.prompt.mockResolvedValue({ confirmed: false, finalPrice: 0, outcome: 'failure', successRanks: 0 })

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.negotiateItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.cheap' }, querySelector: vi.fn().mockReturnValue(null) })) }

      await action.call(app, {}, target)

      expect(globalThis.ui.notifications.info).not.toHaveBeenCalled()

      delete globalThis.fromUuid
    })

    it('proceeds to purchase with negotiated price after successful negotiation', async () => {
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        createEmbeddedDocuments: vi.fn().mockResolvedValue([]),
      }
      const item = makeItem({ uuid: 'Item.cheap', type: 'weapon', price: 100, rarity: 0 })
      item.toObject = vi.fn(() => ({ type: 'weapon', name: item.name, system: item.system }))
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)

      // Negotiation succeeds: 10% discount → final price = 90
      NegotiationDialogMock.prompt.mockResolvedValue({ confirmed: true, finalPrice: 90, outcome: 'success', successRanks: 2 })
      globalThis.foundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(true)

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.negotiateItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.cheap' }, querySelector: vi.fn().mockReturnValue(null) })) }

      await action.call(app, {}, target)

      expect(actor.createEmbeddedDocuments).toHaveBeenCalledWith('Item', expect.any(Array))
      expect(globalThis.ui.notifications.info).toHaveBeenCalled()

      delete globalThis.fromUuid
      delete globalThis.foundry.applications.api.DialogV2.confirm
    })

    it('shows a success notification mentioning the negotiated price on success outcome', async () => {
      const actor = { id: 'actor-1', name: 'Test', system: { credits: 500 } }
      const item = makeItem({ uuid: 'Item.cheap', type: 'weapon', price: 100, rarity: 0 })
      item.toObject = vi.fn(() => ({ type: 'weapon', name: item.name, system: item.system }))
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)

      NegotiationDialogMock.prompt.mockResolvedValue({ confirmed: true, finalPrice: 85, outcome: 'success', successRanks: 3 })
      // Cancel the purchase confirmation to isolate notification check
      globalThis.foundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(false)

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.negotiateItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.cheap' }, querySelector: vi.fn().mockReturnValue(null) })) }

      await action.call(app, {}, target)

      // Info notification about negotiation outcome should have been shown
      expect(globalThis.ui.notifications.info).toHaveBeenCalled()

      delete globalThis.fromUuid
      delete globalThis.foundry.applications.api.DialogV2.confirm
    })

    it('shows a warning notification on disaster outcome', async () => {
      const actor = { id: 'actor-1', name: 'Test', system: { credits: 500 } }
      const item = makeItem({ uuid: 'Item.cheap', type: 'weapon', price: 100, rarity: 0 })
      item.toObject = vi.fn(() => ({ type: 'weapon', name: item.name, system: item.system }))
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)

      // Disaster: vendor raises the price to 110
      NegotiationDialogMock.prompt.mockResolvedValue({ confirmed: true, finalPrice: 110, outcome: 'disaster', successRanks: 0 })
      // Cancel purchase to isolate notification
      globalThis.foundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(false)

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.negotiateItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.cheap' }, querySelector: vi.fn().mockReturnValue(null) })) }

      await action.call(app, {}, target)

      expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith('MARKET.Negotiation.Outcome.DisasterNotification')

      delete globalThis.fromUuid
      delete globalThis.foundry.applications.api.DialogV2.confirm
    })

    /* -------------------------------------------- */
    /*  Anti-bypass: availability check in negotiate */
    /* -------------------------------------------- */

    it('triggers AvailabilityCheckDialog before NegotiationDialog for a rare item (rarity >= 4)', async () => {
      const actor = { id: 'actor-1', name: 'Test', system: { credits: 500 } }
      // rarity=4 triggers availability check (AVAILABILITY_CHECK_RARITY_THRESHOLD = 4)
      const item = makeItem({ uuid: 'Item.rare', type: 'weapon', price: 200, rarity: 4, restrictionLevel: 'none' })
      item.toObject = vi.fn(() => ({ type: 'weapon', name: item.name, system: item.system }))
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)

      // Check passes — proceed to negotiation
      AvailabilityCheckDialogMock.prompt.mockResolvedValue({ passed: true, testResult: null })
      // Negotiation cancelled to isolate the call order check
      NegotiationDialogMock.prompt.mockResolvedValue(null)

      const callOrder = []
      AvailabilityCheckDialogMock.prompt.mockImplementation(async () => {
        callOrder.push('availabilityCheck')
        return { passed: true, testResult: null }
      })
      NegotiationDialogMock.prompt.mockImplementation(async () => {
        callOrder.push('negotiation')
        return null
      })

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.negotiateItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.rare' } })) }

      await action.call(app, {}, target)

      // AvailabilityCheckDialog must be called before NegotiationDialog
      expect(callOrder[0]).toBe('availabilityCheck')
      expect(callOrder[1]).toBe('negotiation')

      delete globalThis.fromUuid
    })

    it('triggers AvailabilityCheckDialog before NegotiationDialog for a restricted item', async () => {
      const actor = { id: 'actor-1', name: 'Test', system: { credits: 500 } }
      // restrictionLevel=restricted always requires a check regardless of rarity
      const item = makeItem({ uuid: 'Item.restricted', type: 'weapon', price: 150, rarity: 1, restrictionLevel: 'restricted' })
      item.toObject = vi.fn(() => ({ type: 'weapon', name: item.name, system: item.system }))
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)

      // Use black-market so restricted items are visible
      const callOrder = []
      AvailabilityCheckDialogMock.prompt.mockImplementation(async () => {
        callOrder.push('availabilityCheck')
        return { passed: true, testResult: null }
      })
      NegotiationDialogMock.prompt.mockImplementation(async () => {
        callOrder.push('negotiation')
        return null
      })

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      app._viewState = { ...app._viewState, activeMarketType: 'black-market' }
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.negotiateItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.restricted' } })) }

      await action.call(app, {}, target)

      expect(callOrder[0]).toBe('availabilityCheck')
      expect(callOrder[1]).toBe('negotiation')

      delete globalThis.fromUuid
    })

    it('aborts negotiate flow — does not open NegotiationDialog — when availability check is cancelled', async () => {
      const actor = { id: 'actor-1', name: 'Test', system: { credits: 500 } }
      const item = makeItem({ uuid: 'Item.rare', type: 'weapon', price: 200, rarity: 4, restrictionLevel: 'none' })
      item.toObject = vi.fn(() => ({ type: 'weapon', name: item.name, system: item.system }))
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)

      // User cancels the availability check (returns null)
      AvailabilityCheckDialogMock.prompt.mockResolvedValue(null)

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.negotiateItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.rare' } })) }

      await action.call(app, {}, target)

      // NegotiationDialog must NOT have been opened
      expect(NegotiationDialogMock.prompt).not.toHaveBeenCalled()

      delete globalThis.fromUuid
    })

    it('aborts negotiate flow — does not open NegotiationDialog — when availability check fails (passed=false)', async () => {
      const actor = { id: 'actor-1', name: 'Test', system: { credits: 500 } }
      const item = makeItem({ uuid: 'Item.rare', type: 'weapon', price: 200, rarity: 4, restrictionLevel: 'none' })
      item.toObject = vi.fn(() => ({ type: 'weapon', name: item.name, system: item.system }))
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)

      // Roll failed
      AvailabilityCheckDialogMock.prompt.mockResolvedValue({ passed: false, testResult: null })

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.negotiateItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.rare' } })) }

      await action.call(app, {}, target)

      expect(NegotiationDialogMock.prompt).not.toHaveBeenCalled()
      expect(globalThis.ui.notifications.warn).toHaveBeenCalled()

      delete globalThis.fromUuid
    })

    it('does NOT call AvailabilityCheckDialog for a common item (rarity < 4, no restriction) in negotiate flow', async () => {
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        createEmbeddedDocuments: vi.fn().mockResolvedValue([]),
      }
      // rarity=0, restrictionLevel=none — no check required
      const item = makeItem({ uuid: 'Item.common', type: 'weapon', price: 100, rarity: 0, restrictionLevel: 'none' })
      item.toObject = vi.fn(() => ({ type: 'weapon', name: item.name, system: item.system }))
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)

      // Negotiation succeeds immediately
      NegotiationDialogMock.prompt.mockResolvedValue({ confirmed: true, finalPrice: 90, outcome: 'success', successRanks: 1 })
      globalThis.foundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(false)

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.negotiateItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.common' }, querySelector: vi.fn().mockReturnValue(null) })) }

      await action.call(app, {}, target)

      // For a common item no check dialog is required
      expect(AvailabilityCheckDialogMock.prompt).not.toHaveBeenCalled()

      delete globalThis.fromUuid
      delete globalThis.foundry.applications.api.DialogV2.confirm
    })
  })

  /* -------------------------------------------- */
  /*  isNegotiable annotation (Phase 7)           */
  /* -------------------------------------------- */

  describe('isNegotiable annotation on catalog entries', () => {
    it('annotates entries as isNegotiable=true on standard market (negotiationAllowed=true)', async () => {
      const item = makeItem({ type: 'weapon', name: 'Blaster', availability: 'available' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'standard' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.items[0].isNegotiable).toBe(true)
    })

    it('annotates entries as isNegotiable=true on black-market (negotiationAllowed=true)', async () => {
      const item = makeItem({ type: 'weapon', name: 'Restricted Blaster', availability: 'restricted' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'black-market' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.items[0].isNegotiable).toBe(true)
    })

    it('exposes isNegotiable on every catalog entry', async () => {
      const items = [
        makeItem({ type: 'weapon', name: 'Blaster', availability: 'available' }),
        makeItem({ type: 'armor', name: 'Light Armor', availability: 'common' }),
        makeItem({ type: 'gear', name: 'Medpac', availability: 'available' }),
      ]
      globalThis.game.items = makeItemsCollection(items)

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      for (const entry of context.catalog.items) {
        expect(entry).toHaveProperty('isNegotiable')
        expect(typeof entry.isNegotiable).toBe('boolean')
      }
    })
  })

  /* -------------------------------------------- */
  /*  Restriction filtering in catalog            */
  /* -------------------------------------------- */

  describe('restriction level filtering in catalog', () => {
    it('standard market hides items with restrictionLevel=restricted', async () => {
      const legal = makeItem({ type: 'weapon', name: 'Legal Blaster', restrictionLevel: 'none', availability: 'available' })
      const restricted = makeItem({ type: 'weapon', name: 'Restricted Blaster', restrictionLevel: 'restricted', availability: 'available' })
      globalThis.game.items = makeItemsCollection([legal, restricted])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'standard' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.totalCount).toBe(1)
      expect(context.catalog.items[0].name).toBe('Legal Blaster')
    })

    it('standard market hides items with restrictionLevel=military', async () => {
      const legal = makeItem({ type: 'weapon', name: 'Legal Blaster', restrictionLevel: 'none', availability: 'available' })
      const military = makeItem({ type: 'weapon', name: 'Military Rifle', restrictionLevel: 'military', availability: 'available' })
      globalThis.game.items = makeItemsCollection([legal, military])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'standard' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.totalCount).toBe(1)
      expect(context.catalog.items[0].name).toBe('Legal Blaster')
    })

    it('standard market hides items with restrictionLevel=illegal', async () => {
      const legal = makeItem({ type: 'weapon', name: 'Legal Blaster', restrictionLevel: 'none', availability: 'available' })
      const illegal = makeItem({ type: 'weapon', name: 'Illegal Weapon', restrictionLevel: 'illegal', availability: 'available' })
      globalThis.game.items = makeItemsCollection([legal, illegal])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'standard' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.totalCount).toBe(1)
      expect(context.catalog.items[0].name).toBe('Legal Blaster')
    })

    it('specialized market shows restricted items (badge annotated)', async () => {
      const restricted = makeItem({ type: 'weapon', name: 'Restricted Blaster', restrictionLevel: 'restricted', availability: 'available' })
      globalThis.game.items = makeItemsCollection([restricted])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'specialized' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.totalCount).toBe(1)
      expect(context.catalog.items[0].isRestricted).toBe(true)
    })

    it('specialized market shows military items', async () => {
      const military = makeItem({ type: 'weapon', name: 'Military Rifle', restrictionLevel: 'military', availability: 'available' })
      globalThis.game.items = makeItemsCollection([military])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'specialized' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.totalCount).toBe(1)
      expect(context.catalog.items[0].isRestricted).toBe(true)
    })

    it('specialized market hides illegal items', async () => {
      const illegal = makeItem({ type: 'weapon', name: 'Illegal Weapon', restrictionLevel: 'illegal', availability: 'available' })
      globalThis.game.items = makeItemsCollection([illegal])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'specialized' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.totalCount).toBe(0)
    })

    it('black-market shows all restriction levels', async () => {
      const legal = makeItem({ type: 'weapon', name: 'Legal Blaster', restrictionLevel: 'none', availability: 'available' })
      const restricted = makeItem({ type: 'weapon', name: 'Restricted Blaster', restrictionLevel: 'restricted', availability: 'available' })
      const military = makeItem({ type: 'weapon', name: 'Military Rifle', restrictionLevel: 'military', availability: 'available' })
      const illegal = makeItem({ type: 'weapon', name: 'Illegal Weapon', restrictionLevel: 'illegal', availability: 'available' })
      globalThis.game.items = makeItemsCollection([legal, restricted, military, illegal])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'black-market' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.totalCount).toBe(4)
    })

    it('annotates isRestricted=false on legal items', async () => {
      const legal = makeItem({ type: 'weapon', name: 'Legal Blaster', restrictionLevel: 'none', availability: 'available' })
      globalThis.game.items = makeItemsCollection([legal])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.items[0].isRestricted).toBe(false)
    })

    it('annotates isRestricted=true on restricted items in black-market', async () => {
      const restricted = makeItem({ type: 'weapon', name: 'Restricted Blaster', restrictionLevel: 'restricted', availability: 'available' })
      globalThis.game.items = makeItemsCollection([restricted])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'black-market' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.items[0].isRestricted).toBe(true)
    })

    it('annotates restrictionLabel on restricted items', async () => {
      const restricted = makeItem({ type: 'weapon', name: 'Restricted Blaster', restrictionLevel: 'restricted', availability: 'available' })
      globalThis.game.items = makeItemsCollection([restricted])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'black-market' }
      const context = await app._preparePartContext('catalog', {})

      // restrictionLabel should be a non-empty i18n key string
      expect(context.catalog.items[0].restrictionLabel).toBeTruthy()
      expect(typeof context.catalog.items[0].restrictionLabel).toBe('string')
    })

    it('local market hides restricted items (same as standard)', async () => {
      const restricted = makeItem({ type: 'weapon', name: 'Restricted Blaster', restrictionLevel: 'restricted', availability: 'available' })
      globalThis.game.items = makeItemsCollection([restricted])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'local' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.totalCount).toBe(0)
    })

    it('annotates restrictionLabel for items with restrictionLevel=none (non-null i18n key)', async () => {
      const legal = makeItem({ type: 'weapon', name: 'Legal Blaster', restrictionLevel: 'none', availability: 'available' })
      globalThis.game.items = makeItemsCollection([legal])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      // restrictionLabel must not be null for none — the template falls back to empty display via {{#if}}
      // but the key must be provided so the template can localize correctly when restrictionLevel is 'none'
      expect(context.catalog.items[0].restrictionLabel).toBe('ITEM.RESTRICTION_LEVEL.NONE')
    })
  })

  /* -------------------------------------------- */
  /*  Rarity display — rarityPips view-model       */
  /* -------------------------------------------- */

  describe('rarityPips annotation on catalog entries', () => {
    it('produces an array of filled pip objects matching the rarity value', async () => {
      const item = makeItem({ type: 'weapon', name: 'Blaster', rarity: 3, availability: 'available' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.items[0]
      expect(Array.isArray(entry.rarityPips)).toBe(true)
      expect(entry.rarityPips).toHaveLength(3)
      expect(entry.rarityPips.every((p) => p.filled === true)).toBe(true)
    })

    it('produces an empty array when rarity is 0', async () => {
      const item = makeItem({ type: 'weapon', name: 'Common Blaster', rarity: 0, availability: 'available' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.items[0]
      expect(entry.rarityPips).toHaveLength(0)
    })

    it('produces an empty array when rarity is missing/undefined (falls back to 0)', async () => {
      const item = makeItem({ type: 'weapon', name: 'Unknown Rarity', availability: 'available' })
      // Override rarity to undefined after factory
      item.system.rarity = undefined
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.items[0]
      expect(Array.isArray(entry.rarityPips)).toBe(true)
      expect(entry.rarityPips).toHaveLength(0)
    })

    it('caps rarityPips at 10 even when rarity exceeds 10', async () => {
      // rarity=15 → derives 'veryRare'; use specialized market to ensure visibility
      const item = makeItem({ type: 'weapon', name: 'Ultra Rare', rarity: 15 })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'specialized' }
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.items[0]
      expect(entry.rarityPips).toHaveLength(10)
    })

    it('produces exactly 1 pip for rarity 1', async () => {
      const item = makeItem({ type: 'weapon', name: 'Blaster', rarity: 1, availability: 'available' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.items[0].rarityPips).toHaveLength(1)
    })

    it('produces exactly 10 pips for rarity 10', async () => {
      const item = makeItem({ type: 'weapon', name: 'Legendary', rarity: 10, availability: 'available' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      // Use black-market to ensure visibility (rarity 10 items may be excluded in standard)
      app._viewState = { ...app._viewState, activeMarketType: 'black-market' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.items[0].rarityPips).toHaveLength(10)
    })

    it('exposes rarityPips on every catalog entry', async () => {
      const items = [
        makeItem({ type: 'weapon', name: 'Item A', rarity: 2, availability: 'available' }),
        makeItem({ type: 'armor', name: 'Item B', rarity: 5, availability: 'available' }),
        makeItem({ type: 'gear', name: 'Item C', rarity: 0, availability: 'available' }),
      ]
      globalThis.game.items = makeItemsCollection(items)

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      for (const entry of context.catalog.items) {
        expect(entry).toHaveProperty('rarityPips')
        expect(Array.isArray(entry.rarityPips)).toBe(true)
      }
    })

    it('does not alter sort-by-rarity behavior (rarityPips is presentation-only, entry.rarity unchanged)', async () => {
      const common = makeItem({ type: 'weapon', name: 'Common', rarity: 1 })
      const rare = makeItem({ type: 'weapon', name: 'Rare', rarity: 5 })
      globalThis.game.items = makeItemsCollection([rare, common])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, sortBy: 'rarity', sortDirection: 'asc' }
      const context = await app._preparePartContext('catalog', {})

      const rarities = context.catalog.items.map((e) => e.rarity)
      expect(rarities[0]).toBeLessThanOrEqual(rarities[1])
      // entry.rarity is preserved
      expect(context.catalog.items[0].rarity).toBe(1)
      expect(context.catalog.items[1].rarity).toBe(5)
    })
  })

  /* -------------------------------------------- */
  /*  Adaptive restriction filter dropdown        */
  /* -------------------------------------------- */

  describe('#buildRestrictionFilterOptions (via _preparePartContext)', () => {
    it('standard market returns only the "All" option', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'standard' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.restrictionFilterOptions).toHaveLength(1)
      expect(context.restrictionFilterOptions[0].value).toBe('')
    })

    it('local market returns only the "All" option', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'local' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.restrictionFilterOptions).toHaveLength(1)
      expect(context.restrictionFilterOptions[0].value).toBe('')
    })

    it('specialized market returns "All", "Legal only", "Restricted", "Military" options', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'specialized' }
      const context = await app._preparePartContext('catalog', {})

      const values = context.restrictionFilterOptions.map((o) => o.value)
      expect(values).toContain('')
      expect(values).toContain('none')
      expect(values).toContain('restricted')
      expect(values).toContain('military')
      expect(values).not.toContain('illegal')
      expect(context.restrictionFilterOptions).toHaveLength(4)
    })

    it('black-market returns "All", "Legal only", "Restricted", "Military", "Illegal" options', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'black-market' }
      const context = await app._preparePartContext('catalog', {})

      const values = context.restrictionFilterOptions.map((o) => o.value)
      expect(values).toContain('')
      expect(values).toContain('none')
      expect(values).toContain('restricted')
      expect(values).toContain('military')
      expect(values).toContain('illegal')
      expect(context.restrictionFilterOptions).toHaveLength(5)
    })

    it('each option has value and label', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'black-market' }
      const context = await app._preparePartContext('catalog', {})

      for (const opt of context.restrictionFilterOptions) {
        expect(opt).toHaveProperty('value')
        expect(opt).toHaveProperty('label')
        expect(typeof opt.label).toBe('string')
      }
    })

    it('changing market type updates dropdown options without clearing filterRestriction from vueState', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      // Set a restriction filter while in black-market
      app._viewState = { ...app._viewState, activeMarketType: 'black-market', filterRestriction: 'military' }
      const bmContext = await app._preparePartContext('catalog', {})
      expect(bmContext.restrictionFilterOptions).toHaveLength(5)

      // Switch to standard — filter state is preserved in _viewState
      app._viewState = { ...app._viewState, activeMarketType: 'standard' }
      const stdContext = await app._preparePartContext('catalog', {})
      expect(stdContext.restrictionFilterOptions).toHaveLength(1)
      // filterRestriction remains set in _viewState (not cleared)
      expect(app._viewState.filterRestriction).toBe('military')
    })
  })

  /* -------------------------------------------- */
  /*  Mode toggle (buy / sell)                    */
  /* -------------------------------------------- */

  describe('_viewState.mode default', () => {
    it('starts in buy mode', () => {
      const app = new MarketApplicationV2()
      expect(app._viewState.mode).toBe('buy')
    })
  })

  describe('static configuration — sell mode actions', () => {
    it('declares the toggleMode action', () => {
      expect(MarketApplicationV2.DEFAULT_OPTIONS.actions).toHaveProperty('toggleMode')
    })

    it('declares the sellItem action', () => {
      expect(MarketApplicationV2.DEFAULT_OPTIONS.actions).toHaveProperty('sellItem')
    })
  })

  describe('toggleMode action', () => {
    it('switches from buy to sell and calls render', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app.render = vi.fn().mockResolvedValue(undefined)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.toggleMode
      const target = { dataset: { mode: 'sell' } }

      await action.call(app, {}, target)

      expect(app._viewState.mode).toBe('sell')
      expect(app.render).toHaveBeenCalled()
    })

    it('switches from sell to buy and calls render', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, mode: 'sell' }
      app.render = vi.fn().mockResolvedValue(undefined)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.toggleMode
      const target = { dataset: { mode: 'buy' } }

      await action.call(app, {}, target)

      expect(app._viewState.mode).toBe('buy')
      expect(app.render).toHaveBeenCalled()
    })

    it('toggles buy→sell when no data-mode attribute is provided', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app.render = vi.fn().mockResolvedValue(undefined)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.toggleMode
      // dataset without mode — action should invert the current mode
      const target = { dataset: {} }

      await action.call(app, {}, target)

      expect(app._viewState.mode).toBe('sell')
      expect(app.render).toHaveBeenCalled()
    })

    it('does not update state for an unknown mode value', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app.render = vi.fn().mockResolvedValue(undefined)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.toggleMode
      const target = { dataset: { mode: 'unknown' } }

      await action.call(app, {}, target)

      expect(app._viewState.mode).toBe('buy')
      expect(app.render).not.toHaveBeenCalled()
    })

    it('preserves other viewState fields when toggling mode', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, search: 'blaster', filterType: 'weapon' }
      app.render = vi.fn().mockResolvedValue(undefined)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.toggleMode
      await action.call(app, {}, { dataset: { mode: 'sell' } })

      expect(app._viewState.mode).toBe('sell')
      expect(app._viewState.search).toBe('blaster')
      expect(app._viewState.filterType).toBe('weapon')
    })
  })

  /* -------------------------------------------- */
  /*  #prepareInventory via _preparePartContext    */
  /* -------------------------------------------- */

  describe('_preparePartContext — inventory', () => {
    it('exposes context.mode from _viewState', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.mode).toBe('buy')
    })

    it('exposes context.mode as sell when _viewState.mode is sell', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, mode: 'sell' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.mode).toBe('sell')
    })

    it('exposes empty inventory when no buyer is set', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.inventory).toBeDefined()
      expect(context.inventory.items).toHaveLength(0)
    })

    it('exposes sellable items when buyer is set', async () => {
      globalThis.game.items = makeItemsCollection([])

      const sellableItem = {
        id: 'item-1',
        name: 'Blaster Pistol',
        img: 'icons/blaster.webp',
        type: 'weapon',
        system: { price: 400, _source: { price: 400 } },
      }
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: makeItemsCollection([sellableItem]),
      }

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const context = await app._preparePartContext('catalog', {})

      expect(context.inventory.items).toHaveLength(1)
      const entry = context.inventory.items[0]
      expect(entry.id).toBe('item-1')
      expect(entry.name).toBe('Blaster Pistol')
      expect(entry.type).toBe('weapon')
      expect(entry.basePrice).toBe(400)
    })

    it('excludes items with non-purchasable types (e.g. talent)', async () => {
      globalThis.game.items = makeItemsCollection([])

      const talentItem = {
        id: 'talent-1',
        name: 'Force Sensitive',
        img: '',
        type: 'talent',
        system: { price: 0 },
      }
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: makeItemsCollection([talentItem]),
      }

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const context = await app._preparePartContext('catalog', {})

      expect(context.inventory.items).toHaveLength(0)
    })

    it('includes only weapon, armor, and gear types', async () => {
      globalThis.game.items = makeItemsCollection([])

      const items = [
        { id: 'w1', name: 'Blaster', img: '', type: 'weapon', system: { price: 100 } },
        { id: 'a1', name: 'Armor', img: '', type: 'armor', system: { price: 200 } },
        { id: 'g1', name: 'Medpac', img: '', type: 'gear', system: { price: 50 } },
        { id: 't1', name: 'Force Power', img: '', type: 'talent', system: { price: 0 } },
        { id: 'c1', name: 'Bounty Hunter', img: '', type: 'career', system: { price: 0 } },
      ]
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: makeItemsCollection(items),
      }

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const context = await app._preparePartContext('catalog', {})

      // Only weapon, armor, gear are sellable
      expect(context.inventory.items).toHaveLength(3)
      const types = context.inventory.items.map((i) => i.type)
      expect(types).toContain('weapon')
      expect(types).toContain('armor')
      expect(types).toContain('gear')
      expect(types).not.toContain('talent')
      expect(types).not.toContain('career')
    })

    it('computes resaleEstimate as 25% of basePrice (floored)', async () => {
      globalThis.game.items = makeItemsCollection([])

      const item = { id: 'w1', name: 'Blaster', img: '', type: 'weapon', system: { price: 400 } }
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: makeItemsCollection([item]),
      }

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const context = await app._preparePartContext('catalog', {})

      const entry = context.inventory.items[0]
      expect(entry.resaleEstimate).toBe(Math.floor(400 * 0.25)) // 100
      expect(entry.resaleFraction).toBe(25)
    })

    it('uses _source.price over system.price when available', async () => {
      globalThis.game.items = makeItemsCollection([])

      // _source.price is 300, but post-derivation system.price is 999
      const item = { id: 'w1', name: 'Blaster', img: '', type: 'weapon', system: { price: 999, _source: { price: 300 } } }
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: makeItemsCollection([item]),
      }

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const context = await app._preparePartContext('catalog', {})

      const entry = context.inventory.items[0]
      expect(entry.basePrice).toBe(300)
      expect(entry.resaleEstimate).toBe(Math.floor(300 * 0.25)) // 75
    })

    it('sorts inventory items by name ascending', async () => {
      globalThis.game.items = makeItemsCollection([])

      const items = [
        { id: 'z1', name: 'Z-6 Blaster', img: '', type: 'weapon', system: { price: 100 } },
        { id: 'a1', name: 'A-300 Rifle', img: '', type: 'weapon', system: { price: 150 } },
        { id: 'm1', name: 'Medpac', img: '', type: 'gear', system: { price: 50 } },
      ]
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: makeItemsCollection(items),
      }

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const context = await app._preparePartContext('catalog', {})

      const names = context.inventory.items.map((i) => i.name)
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
    })

    it('exposes typeLabel from PURCHASABLE_ITEM_TYPES config', async () => {
      globalThis.game.items = makeItemsCollection([])

      const item = { id: 'w1', name: 'Blaster', img: '', type: 'weapon', system: { price: 100 } }
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: makeItemsCollection([item]),
      }

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const context = await app._preparePartContext('catalog', {})

      const entry = context.inventory.items[0]
      // typeLabel must be the i18n key from PURCHASABLE_ITEM_TYPES config
      expect(entry.typeLabel).toBe('MARKET.ItemType.Weapon')
    })
  })

  /* -------------------------------------------- */
  /*  Sell-mode toolbar: search, sort, reset      */
  /* -------------------------------------------- */

  describe('sell-mode inventory toolbar — search', () => {
    it('_viewState starts with empty inventorySearch', () => {
      const app = new MarketApplicationV2()
      expect(app._viewState.inventorySearch).toBe('')
    })

    it('filters inventory items by name when inventorySearch is set (case-insensitive)', async () => {
      globalThis.game.items = makeItemsCollection([])

      const items = [
        { id: 'w1', name: 'Blaster Pistol', img: '', type: 'weapon', system: { price: 100 } },
        { id: 'w2', name: 'Vibro Knife', img: '', type: 'weapon', system: { price: 80 } },
      ]
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: makeItemsCollection(items),
      }

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      app._viewState = { ...app._viewState, inventorySearch: 'blaster' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.inventory.items).toHaveLength(1)
      expect(context.inventory.items[0].name).toBe('Blaster Pistol')
    })

    it('inventory search is case-insensitive', async () => {
      globalThis.game.items = makeItemsCollection([])

      const item = { id: 'w1', name: 'Blaster Pistol', img: '', type: 'weapon', system: { price: 100 } }
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: makeItemsCollection([item]),
      }

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      app._viewState = { ...app._viewState, inventorySearch: 'BLASTER' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.inventory.items).toHaveLength(1)
    })

    it('empty inventorySearch returns all sellable items', async () => {
      globalThis.game.items = makeItemsCollection([])

      const items = [
        { id: 'w1', name: 'Blaster', img: '', type: 'weapon', system: { price: 100 } },
        { id: 'a1', name: 'Armor', img: '', type: 'armor', system: { price: 200 } },
      ]
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: makeItemsCollection(items),
      }

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      app._viewState = { ...app._viewState, inventorySearch: '' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.inventory.items).toHaveLength(2)
    })

    it('returns isFilteredEmpty=true when search matches nothing but inventory has items', async () => {
      globalThis.game.items = makeItemsCollection([])

      const item = { id: 'w1', name: 'Blaster', img: '', type: 'weapon', system: { price: 100 } }
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: makeItemsCollection([item]),
      }

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      app._viewState = { ...app._viewState, inventorySearch: 'lightsaber' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.inventory.isEmpty).toBe(false)
      expect(context.inventory.isFilteredEmpty).toBe(true)
      expect(context.inventory.items).toHaveLength(0)
    })
  })

  describe('sell-mode inventory toolbar — sort', () => {
    it('_viewState starts with inventorySortBy=name and inventorySortDirection=asc', () => {
      const app = new MarketApplicationV2()
      expect(app._viewState.inventorySortBy).toBe('name')
      expect(app._viewState.inventorySortDirection).toBe('asc')
    })

    it('sorts inventory by name ascending (A→Z)', async () => {
      globalThis.game.items = makeItemsCollection([])

      const items = [
        { id: 'z1', name: 'Z-6 Blaster', img: '', type: 'weapon', system: { price: 100 } },
        { id: 'a1', name: 'A-300 Rifle', img: '', type: 'weapon', system: { price: 150 } },
      ]
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: makeItemsCollection(items),
      }

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      app._viewState = { ...app._viewState, inventorySortBy: 'name', inventorySortDirection: 'asc' }
      const context = await app._preparePartContext('catalog', {})

      const names = context.inventory.items.map((i) => i.name)
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
    })

    it('sorts inventory by name descending (Z→A)', async () => {
      globalThis.game.items = makeItemsCollection([])

      const items = [
        { id: 'a1', name: 'A-300 Rifle', img: '', type: 'weapon', system: { price: 100 } },
        { id: 'z1', name: 'Z-6 Blaster', img: '', type: 'weapon', system: { price: 150 } },
      ]
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: makeItemsCollection(items),
      }

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      app._viewState = { ...app._viewState, inventorySortBy: 'name', inventorySortDirection: 'desc' }
      const context = await app._preparePartContext('catalog', {})

      const names = context.inventory.items.map((i) => i.name)
      expect(names[0]).toBe('Z-6 Blaster')
      expect(names[1]).toBe('A-300 Rifle')
    })

    it('sorts inventory by basePrice ascending (cheapest first)', async () => {
      globalThis.game.items = makeItemsCollection([])

      const items = [
        { id: 'e1', name: 'Expensive', img: '', type: 'weapon', system: { price: 500 } },
        { id: 'c1', name: 'Cheap', img: '', type: 'weapon', system: { price: 50 } },
      ]
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: makeItemsCollection(items),
      }

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      app._viewState = { ...app._viewState, inventorySortBy: 'basePrice', inventorySortDirection: 'asc' }
      const context = await app._preparePartContext('catalog', {})

      const prices = context.inventory.items.map((i) => i.basePrice)
      expect(prices[0]).toBeLessThanOrEqual(prices[1])
    })

    it('sorts inventory by basePrice descending (most expensive first)', async () => {
      globalThis.game.items = makeItemsCollection([])

      const items = [
        { id: 'c1', name: 'Cheap', img: '', type: 'weapon', system: { price: 50 } },
        { id: 'e1', name: 'Expensive', img: '', type: 'weapon', system: { price: 500 } },
      ]
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: makeItemsCollection(items),
      }

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      app._viewState = { ...app._viewState, inventorySortBy: 'basePrice', inventorySortDirection: 'desc' }
      const context = await app._preparePartContext('catalog', {})

      const prices = context.inventory.items.map((i) => i.basePrice)
      expect(prices[0]).toBeGreaterThanOrEqual(prices[1])
    })

    it('sorts inventory by resaleEstimate ascending', async () => {
      globalThis.game.items = makeItemsCollection([])

      const items = [
        { id: 'h1', name: 'High', img: '', type: 'weapon', system: { price: 400 } },
        { id: 'l1', name: 'Low', img: '', type: 'weapon', system: { price: 100 } },
      ]
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: makeItemsCollection(items),
      }

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      app._viewState = { ...app._viewState, inventorySortBy: 'resaleEstimate', inventorySortDirection: 'asc' }
      const context = await app._preparePartContext('catalog', {})

      const estimates = context.inventory.items.map((i) => i.resaleEstimate)
      expect(estimates[0]).toBeLessThanOrEqual(estimates[1])
    })

    it('exposes inventorySortOptions in catalog context', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.inventorySortOptions).toBeDefined()
      expect(Array.isArray(context.inventorySortOptions)).toBe(true)
      expect(context.inventorySortOptions).toHaveLength(3)

      const values = context.inventorySortOptions.map((o) => o.value)
      expect(values).toContain('name')
      expect(values).toContain('basePrice')
      expect(values).toContain('resaleEstimate')
    })
  })

  describe('sell-mode inventory toolbar — reset', () => {
    it('declares the resetInventory action', () => {
      expect(MarketApplicationV2.DEFAULT_OPTIONS.actions).toHaveProperty('resetInventory')
    })

    it('resetInventory resets inventorySearch, inventorySortBy, inventorySortDirection to defaults', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = {
        ...app._viewState,
        inventorySearch: 'blaster',
        inventorySortBy: 'basePrice',
        inventorySortDirection: 'desc',
      }
      app.render = vi.fn().mockResolvedValue(undefined)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.resetInventory
      await action.call(app, {}, {})

      expect(app._viewState.inventorySearch).toBe('')
      expect(app._viewState.inventorySortBy).toBe('name')
      expect(app._viewState.inventorySortDirection).toBe('asc')
      expect(app.render).toHaveBeenCalled()
    })

    it('resetInventory preserves the current mode (sell) and buy-mode state', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = {
        ...app._viewState,
        mode: 'sell',
        search: 'blaster',
        filterType: 'weapon',
        activeMarketType: 'black-market',
        inventorySearch: 'rifle',
        inventorySortBy: 'basePrice',
        inventorySortDirection: 'desc',
      }
      app.render = vi.fn().mockResolvedValue(undefined)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.resetInventory
      await action.call(app, {}, {})

      // Inventory state reset
      expect(app._viewState.inventorySearch).toBe('')
      expect(app._viewState.inventorySortBy).toBe('name')
      expect(app._viewState.inventorySortDirection).toBe('asc')

      // Buy-mode state and current mode preserved
      expect(app._viewState.mode).toBe('sell')
      expect(app._viewState.search).toBe('blaster')
      expect(app._viewState.filterType).toBe('weapon')
      expect(app._viewState.activeMarketType).toBe('black-market')
    })

    it('resetInventory does not reset buy-mode search when in sell mode', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = {
        ...app._viewState,
        mode: 'sell',
        search: 'vibro',
        inventorySearch: 'blaster',
      }
      app.render = vi.fn().mockResolvedValue(undefined)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.resetInventory
      await action.call(app, {}, {})

      expect(app._viewState.inventorySearch).toBe('')
      expect(app._viewState.search).toBe('vibro')
    })
  })

  describe('sell-mode inventory toolbar — combined search+sort', () => {
    it('applies search and sort together (search first, then sort result)', async () => {
      globalThis.game.items = makeItemsCollection([])

      const items = [
        { id: 'b2', name: 'Blaster Rifle', img: '', type: 'weapon', system: { price: 300 } },
        { id: 'b1', name: 'Blaster Pistol', img: '', type: 'weapon', system: { price: 100 } },
        { id: 'v1', name: 'Vibro Knife', img: '', type: 'weapon', system: { price: 80 } },
      ]
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: makeItemsCollection(items),
      }

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      // Search for "blaster" then sort by basePrice ascending
      app._viewState = { ...app._viewState, inventorySearch: 'blaster', inventorySortBy: 'basePrice', inventorySortDirection: 'asc' }
      const context = await app._preparePartContext('catalog', {})

      // Only blaster items, sorted by base price ascending
      expect(context.inventory.items).toHaveLength(2)
      expect(context.inventory.items[0].name).toBe('Blaster Pistol') // 100 < 300
      expect(context.inventory.items[1].name).toBe('Blaster Rifle')
    })
  })

  describe('sell-mode inventory — non-regression on buy mode', () => {
    it('buy-mode catalog is not affected by inventory search state', async () => {
      const weapon = makeItem({ type: 'weapon', name: 'Blaster Pistol' })
      globalThis.game.items = makeItemsCollection([weapon])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, mode: 'buy', inventorySearch: 'lightsaber' }
      const context = await app._preparePartContext('catalog', {})

      // Buy-mode catalog should still show the weapon — inventorySearch does not affect it
      expect(context.catalog.items).toHaveLength(1)
      expect(context.catalog.items[0].name).toBe('Blaster Pistol')
    })

    it('toggling from sell to buy does not clear the buy-mode search', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, mode: 'sell', search: 'blaster' }
      app.render = vi.fn().mockResolvedValue(undefined)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.toggleMode
      await action.call(app, {}, { dataset: { mode: 'buy' } })

      expect(app._viewState.mode).toBe('buy')
      expect(app._viewState.search).toBe('blaster')
    })
  })

  /* -------------------------------------------- */
  /*  sellItem action                             */
  /* -------------------------------------------- */

  describe('sellItem action', () => {
    it('shows a warn notification when no buyer actor is set', async () => {
      const app = new MarketApplicationV2()
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.sellItem
      const target = { dataset: { itemId: 'item-1' } }

      await action.call(app, {}, target)

      expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith('MARKET.Purchase.Error.MissingActor')
    })

    it('logs a warning and returns when no data-item-id is present', async () => {
      const actor = { id: 'actor-1', name: 'Test', system: { credits: 500 } }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.sellItem
      const target = { dataset: {} }

      await expect(action.call(app, {}, target)).resolves.toBeUndefined()
      // No notification should be fired (only a logger.warn)
      expect(globalThis.ui.notifications.warn).not.toHaveBeenCalled()
      expect(globalThis.ui.notifications.error).not.toHaveBeenCalled()
    })

    it('shows an error notification when item is not found in seller inventory', async () => {
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: { get: vi.fn(() => undefined) },
      }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.sellItem
      const target = { dataset: { itemId: 'nonexistent-item' } }

      await action.call(app, {}, target)

      // ui.notifications.error receives the localized string (localize() translates the key)
      expect(globalThis.ui.notifications.error).toHaveBeenCalledWith('Item was not found in your inventory.')
    })

    it('shows a warn notification when validateSale returns canSell=false', async () => {
      const unsellableItem = {
        id: 'talent-1',
        name: 'Force Power',
        type: 'talent',
        system: { price: 0 },
      }
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: { get: vi.fn(() => unsellableItem) },
      }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.sellItem
      const target = { dataset: { itemId: 'talent-1' } }

      await action.call(app, {}, target)

      // validateSale returns canSell=false for talent type
      expect(globalThis.ui.notifications.warn).toHaveBeenCalled()
    })

    it('does not execute sale when confirmation dialog is cancelled', async () => {
      const item = {
        id: 'w1',
        name: 'Blaster',
        type: 'weapon',
        system: { price: 100 },
      }
      const itemsArray = [item]
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: {
          get: vi.fn((id) => itemsArray.find((i) => i.id === id)),
          some: vi.fn((fn) => itemsArray.some(fn)),
        },
        deleteEmbeddedDocuments: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue(undefined),
      }
      globalThis.foundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(false)

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.sellItem
      const target = { dataset: { itemId: 'w1' }, closest: vi.fn(() => ({ querySelector: vi.fn().mockReturnValue(null) })) }

      await action.call(app, {}, target)

      expect(actor.deleteEmbeddedDocuments).not.toHaveBeenCalled()
      expect(actor.update).not.toHaveBeenCalled()

      delete globalThis.foundry.applications.api.DialogV2.confirm
    })

    it('deletes item and credits actor when sale is confirmed', async () => {
      const item = {
        id: 'w1',
        name: 'Blaster',
        type: 'weapon',
        system: { price: 100 },
      }
      const itemsArray = [item]
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        items: {
          get: vi.fn((id) => itemsArray.find((i) => i.id === id)),
          some: vi.fn((fn) => itemsArray.some(fn)),
        },
        deleteEmbeddedDocuments: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue(undefined),
      }
      // Confirm sale, skip negotiation
      globalThis.foundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false)

      const app = new MarketApplicationV2()
      app.render = vi.fn().mockResolvedValue(undefined)
      app.setBuyerActor(actor)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.sellItem
      const target = { dataset: { itemId: 'w1' }, closest: vi.fn(() => ({ querySelector: vi.fn().mockReturnValue(null) })) }

      await action.call(app, {}, target)

      expect(actor.deleteEmbeddedDocuments).toHaveBeenCalledWith('Item', ['w1'])
      // Compensated formula: manualAdjustment(500) + resalePrice(25) - basePrice(100) = 425
      // This prevents double-credit when deleteEmbeddedDocuments triggers automatic totalSpent refund.
      expect(actor.update).toHaveBeenCalledWith({ 'system.credits': 425 })
      expect(globalThis.ui.notifications.info).toHaveBeenCalled()

      delete globalThis.foundry.applications.api.DialogV2.confirm
    })

    it('uses system._source.credits as the manual adjustment base when creditBudget diverges from raw credits', async () => {
      // Bug reproduction: before the fix, selling with creditBudget.availableCredits=800 and
      // system.credits=300 (manual adjustment) would write 800+25=825 into system.credits,
      // inflating the budget by basePrice (500 from the automatic totalSpent refund).
      // After the fix: writes _source.credits(300) + resalePrice(25) - basePrice(500) = -175 (capped by domain).
      // The key invariant is that system.credits is NOT fed from creditBudget.availableCredits.
      const item = {
        id: 'w1',
        name: 'Expensive Blaster',
        type: 'weapon',
        system: { price: 500 },
      }
      const itemsArray = [item]
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: {
          // creditBudget.availableCredits diverges from the raw manual adjustment
          creditBudget: { availableCredits: 800 },
          credits: 300,
          _source: { credits: 300 },
        },
        items: {
          get: vi.fn((id) => itemsArray.find((i) => i.id === id)),
          some: vi.fn((fn) => itemsArray.some(fn)),
        },
        deleteEmbeddedDocuments: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue(undefined),
      }
      globalThis.foundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false)

      const app = new MarketApplicationV2()
      app.render = vi.fn().mockResolvedValue(undefined)
      app.setBuyerActor(actor)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.sellItem
      const target = { dataset: { itemId: 'w1' }, closest: vi.fn(() => ({ querySelector: vi.fn().mockReturnValue(null) })) }

      await action.call(app, {}, target)

      // Must use _source.credits (300) as base, NOT creditBudget.availableCredits (800)
      // newManualAdjustment = 300 + Math.floor(500*0.25) - 500 = 300 + 125 - 500 = -75
      expect(actor.update).toHaveBeenCalledWith({ 'system.credits': -75 })
      // The update must NOT have been called with the inflated value (825)
      expect(actor.update).not.toHaveBeenCalledWith({ 'system.credits': 825 })

      delete globalThis.foundry.applications.api.DialogV2.confirm
    })

    it('availableCreditsAfter shown in success notification equals availableBefore + resalePrice', async () => {
      // Invariant: the "remaining" credits in the notification must be availableBefore + resalePrice,
      // not the raw system.credits value written to the document.
      const item = {
        id: 'w1',
        name: 'Blaster',
        type: 'weapon',
        system: { price: 100 },
      }
      const itemsArray = [item]
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: {
          creditBudget: { availableCredits: 600 },
          credits: 200,
          _source: { credits: 200 },
        },
        items: {
          get: vi.fn((id) => itemsArray.find((i) => i.id === id)),
          some: vi.fn((fn) => itemsArray.some(fn)),
        },
        deleteEmbeddedDocuments: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue(undefined),
      }
      globalThis.foundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false)

      const app = new MarketApplicationV2()
      app.render = vi.fn().mockResolvedValue(undefined)
      app.setBuyerActor(actor)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.sellItem
      const target = { dataset: { itemId: 'w1' }, closest: vi.fn(() => ({ querySelector: vi.fn().mockReturnValue(null) })) }

      await action.call(app, {}, target)

      // resalePrice = Math.floor(100 * 0.25) = 25
      // availableCreditsAfter = 600 + 25 = 625
      // The success notification must show the derived available amount, not the raw system.credits value.
      expect(globalThis.ui.notifications.info).toHaveBeenCalledWith(expect.stringContaining('625'))

      delete globalThis.foundry.applications.api.DialogV2.confirm
    })
  })

  /* -------------------------------------------- */
  /*  Badge view-model deduplication (#526)       */
  /* -------------------------------------------- */

  describe('badges view-model on catalog entries', () => {
    it('exposes a badges object on every catalog entry', async () => {
      const item = makeItem({ type: 'weapon', name: 'Blaster', availability: 'available' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.items[0]
      expect(entry.badges).toBeDefined()
      expect(typeof entry.badges).toBe('object')
    })

    it('badges.showBlackMarket is false when restrictionLevel is "illegal" (skull already shown by restriction badge)', async () => {
      // Black-market market — item is illegal (skull already rendered by restriction badge)
      const item = makeItem({ type: 'weapon', name: 'Illegal Blaster', restrictionLevel: 'illegal', availability: 'blackMarket' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'black-market' }
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.items[0]
      // isBlackMarket is true, but showBlackMarket is suppressed because illegal already carries the skull
      expect(entry.isBlackMarket).toBe(true)
      expect(entry.badges.showBlackMarket).toBe(false)
    })

    it('badges.showBlackMarket is true when item is black-market but restrictionLevel is not "illegal"', async () => {
      // Item with blackMarket availability but restriction "restricted" — skull not already shown
      const item = makeItem({ type: 'weapon', name: 'Restricted BM Item', restrictionLevel: 'restricted', availability: 'blackMarket' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'black-market' }
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.items[0]
      expect(entry.isBlackMarket).toBe(true)
      expect(entry.badges.showBlackMarket).toBe(true)
    })

    it('badges.showNegotiable is false when buyer is present (CTA negotiate button already signals negotiability)', async () => {
      const item = makeItem({ type: 'weapon', name: 'Blaster', availability: 'available' })
      globalThis.game.items = makeItemsCollection([item])

      const actor = { id: 'actor-1', name: 'Test', system: { credits: 500 } }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      app._viewState = { ...app._viewState, activeMarketType: 'standard' } // negotiationAllowed=true
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.items[0]
      // isNegotiable is true, but showNegotiable is suppressed because the CTA button is visible
      expect(entry.isNegotiable).toBe(true)
      expect(entry.badges.showNegotiable).toBe(false)
    })

    it('badges.showNegotiable is true when market is negotiable and buyer is absent', async () => {
      const item = makeItem({ type: 'weapon', name: 'Blaster', availability: 'available' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      // No buyer set
      app._viewState = { ...app._viewState, activeMarketType: 'standard' } // negotiationAllowed=true
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.items[0]
      expect(entry.isNegotiable).toBe(true)
      expect(entry.badges.showNegotiable).toBe(true)
    })

    it('badges.showImperialSuspicion reflects isImperialSuspicion (no deduplication applied)', async () => {
      // Imperial suspicion badge is never duplicated by any other badge
      const item = makeItem({ type: 'weapon', name: 'Restricted Blaster', restrictionLevel: 'restricted', availability: 'available' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'specialized' }
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.items[0]
      expect(entry.isImperialSuspicion).toBe(true)
      expect(entry.badges.showImperialSuspicion).toBe(true)
    })

    it('badges.showImmediateAccess is true when obtainability.immediate is true', async () => {
      // rarity=0 in standard market → immediate access
      const item = makeItem({ type: 'weapon', name: 'Common Blaster', availability: 'available', rarity: 0 })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.items[0]
      expect(entry.badges.showImmediateAccess).toBe(entry.obtainability.immediate)
      expect(entry.badges.showSupplyDelay).toBe(!entry.obtainability.immediate)
    })

    it('badges.showImmediateAccess and badges.showSupplyDelay are mutually exclusive', async () => {
      const items = [
        makeItem({ type: 'weapon', name: 'Common', availability: 'available', rarity: 0 }),
        makeItem({ type: 'weapon', name: 'Rare', availability: 'rare', rarity: 7 }),
      ]
      globalThis.game.items = makeItemsCollection(items)

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'specialized' }
      const context = await app._preparePartContext('catalog', {})

      for (const entry of context.catalog.items) {
        expect(entry.badges.showImmediateAccess).not.toBe(entry.badges.showSupplyDelay)
      }
    })
  })

  /* -------------------------------------------- */
  /*  Consequence integration (Phase 7)           */
  /* -------------------------------------------- */

  describe('consequence integration in buyItem flow', () => {
    it('shows consequences dialog before confirmation dialog', async () => {
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
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.buyItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.cheap' }, querySelector: vi.fn().mockReturnValue(null) })) }

      await action.call(app, {}, target)

      // ConsequencesDialogMock.prompt must have been called before the confirmation dialog
      expect(ConsequencesDialogMock.prompt).toHaveBeenCalled()

      delete globalThis.fromUuid
      delete globalThis.foundry.applications.api.DialogV2.confirm
    })

    it('aborts purchase when consequences dialog is cancelled (confirmed=false)', async () => {
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        createEmbeddedDocuments: vi.fn().mockResolvedValue([]),
      }
      const item = makeItem({ uuid: 'Item.cheap', type: 'weapon', price: 100, rarity: 0 })
      item.toObject = vi.fn(() => ({ type: 'weapon', name: item.name, system: item.system }))
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)

      // Consequences dialog cancelled (GM aborts)
      ConsequencesDialogMock.prompt.mockResolvedValue(null)

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.buyItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.cheap' }, querySelector: vi.fn().mockReturnValue(null) })) }

      await action.call(app, {}, target)

      expect(actor.createEmbeddedDocuments).not.toHaveBeenCalled()
      expect(globalThis.ui.notifications.info).not.toHaveBeenCalled()

      delete globalThis.fromUuid
    })

    it('stores a black-market debt flag when blackMarketDebt consequence is accepted', async () => {
      const existingDebts = []
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        createEmbeddedDocuments: vi.fn().mockResolvedValue([]),
        getFlag: vi.fn((_scope, _key) => existingDebts),
        setFlag: vi.fn().mockResolvedValue(undefined),
      }
      // restrictionLevel='illegal' → derives availability='blackMarket' → triggers blackMarketDebt consequence
      const item = makeItem({ uuid: 'Item.cheap', type: 'weapon', price: 100, rarity: 0, restrictionLevel: 'illegal' })
      item.toObject = vi.fn(() => ({ type: 'weapon', name: item.name, system: item.system }))
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)

      // Consequences dialog: blackMarketDebt consequence accepted
      ConsequencesDialogMock.prompt.mockResolvedValue({
        confirmed: true,
        acceptedTypes: ['blackMarketDebt'],
        rejectedTypes: [],
      })
      globalThis.foundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(true)

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.buyItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.cheap' }, querySelector: vi.fn().mockReturnValue(null) })) }

      await action.call(app, {}, target)

      // setFlag must have been called with the new debt
      expect(actor.setFlag).toHaveBeenCalledWith('swerpg', 'marketConsequences', expect.any(Array))
      const [_scope, _key, debts] = actor.setFlag.mock.calls[0]
      expect(debts).toHaveLength(1)
      expect(debts[0]).toMatchObject({
        type: 'blackMarketDebt',
        metadata: { amount: expect.any(Number) },
      })

      delete globalThis.fromUuid
      delete globalThis.foundry.applications.api.DialogV2.confirm
    })

    it('does not store a debt flag when blackMarketDebt consequence is rejected', async () => {
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        createEmbeddedDocuments: vi.fn().mockResolvedValue([]),
        getFlag: vi.fn(),
        setFlag: vi.fn().mockResolvedValue(undefined),
      }
      const item = makeItem({ uuid: 'Item.cheap', type: 'weapon', price: 100, rarity: 0 })
      item.toObject = vi.fn(() => ({ type: 'weapon', name: item.name, system: item.system }))
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)

      // blackMarketDebt consequence rejected
      ConsequencesDialogMock.prompt.mockResolvedValue({
        confirmed: true,
        acceptedTypes: [],
        rejectedTypes: ['blackMarketDebt'],
      })
      globalThis.foundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(true)

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.buyItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.cheap' }, querySelector: vi.fn().mockReturnValue(null) })) }

      await action.call(app, {}, target)

      expect(actor.setFlag).not.toHaveBeenCalled()

      delete globalThis.fromUuid
      delete globalThis.foundry.applications.api.DialogV2.confirm
    })

    it('accumulates debts when actor already has existing market debts', async () => {
      const existingDebt = { itemName: 'Old Blaster', itemUuid: 'Item.old', amount: 200, date: '2026-01-01T00:00:00.000Z' }
      const actor = {
        id: 'actor-1',
        name: 'Test',
        system: { credits: 500 },
        createEmbeddedDocuments: vi.fn().mockResolvedValue([]),
        getFlag: vi.fn().mockReturnValue([existingDebt]),
        setFlag: vi.fn().mockResolvedValue(undefined),
      }
      // restrictionLevel='illegal' → derives availability='blackMarket' → triggers blackMarketDebt consequence
      const item = makeItem({ uuid: 'Item.new', type: 'weapon', price: 100, rarity: 0, restrictionLevel: 'illegal' })
      item.toObject = vi.fn(() => ({ type: 'weapon', name: item.name, system: item.system }))
      globalThis.fromUuid = vi.fn().mockResolvedValue(item)

      ConsequencesDialogMock.prompt.mockResolvedValue({
        confirmed: true,
        acceptedTypes: ['blackMarketDebt'],
        rejectedTypes: [],
      })
      globalThis.foundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(true)

      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.buyItem
      const target = { closest: vi.fn(() => ({ dataset: { uuid: 'Item.new' }, querySelector: vi.fn().mockReturnValue(null) })) }

      await action.call(app, {}, target)

      const [_scope, _key, debts] = actor.setFlag.mock.calls[0]
      // Must include the old debt plus the new one
      expect(debts).toHaveLength(2)
      expect(debts[0]).toMatchObject({ itemUuid: 'Item.old' })
      expect(debts[1]).toMatchObject({ type: 'blackMarketDebt' })

      delete globalThis.fromUuid
      delete globalThis.foundry.applications.api.DialogV2.confirm
    })
  })

  /* -------------------------------------------- */
  /*  Toolbar state (active filter indicators)    */
  /* -------------------------------------------- */

  describe('toolbarState in _preparePartContext', () => {
    it('exposes toolbarState in catalog context', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.toolbarState).toBeDefined()
    })

    it('all active flags are false in the default view state', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})
      const { toolbarState } = context

      expect(toolbarState.isSearchActive).toBe(false)
      expect(toolbarState.isFilterTypeActive).toBe(false)
      expect(toolbarState.isFilterSourceActive).toBe(false)
      expect(toolbarState.isFilterRestrictionActive).toBe(false)
      expect(toolbarState.isAffordableActive).toBe(false)
      expect(toolbarState.isSortNonDefault).toBe(false)
      expect(toolbarState.hasActiveFilters).toBe(false)
    })

    it('isSearchActive is true when search is non-empty', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, search: 'blaster' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.toolbarState.isSearchActive).toBe(true)
      expect(context.toolbarState.hasActiveFilters).toBe(true)
    })

    it('isSearchActive is false when search contains only whitespace', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, search: '   ' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.toolbarState.isSearchActive).toBe(false)
    })

    it('isFilterTypeActive is true when filterType is set', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, filterType: 'weapon' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.toolbarState.isFilterTypeActive).toBe(true)
      expect(context.toolbarState.hasActiveFilters).toBe(true)
    })

    it('isFilterSourceActive is true when filterSource is set', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, filterSource: 'world' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.toolbarState.isFilterSourceActive).toBe(true)
      expect(context.toolbarState.hasActiveFilters).toBe(true)
    })

    it('isFilterRestrictionActive is true when filterRestriction is set', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'black-market', filterRestriction: 'restricted' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.toolbarState.isFilterRestrictionActive).toBe(true)
      expect(context.toolbarState.hasActiveFilters).toBe(true)
    })

    it('isAffordableActive is true only when affordableOnly=true and a buyer is set', async () => {
      globalThis.game.items = makeItemsCollection([])

      const actor = { id: 'actor-1', name: 'Test', system: { credits: 100 } }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      app._viewState = { ...app._viewState, affordableOnly: true }
      const context = await app._preparePartContext('catalog', {})

      expect(context.toolbarState.isAffordableActive).toBe(true)
      expect(context.toolbarState.hasActiveFilters).toBe(true)
    })

    it('isAffordableActive is false when affordableOnly=true but no buyer is set', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, affordableOnly: true }
      const context = await app._preparePartContext('catalog', {})

      // Without a buyer, the affordableOnly filter has no effect — active flag must be false
      expect(context.toolbarState.isAffordableActive).toBe(false)
    })

    it('isSortNonDefault is true when sortBy differs from the default', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, sortBy: 'price' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.toolbarState.isSortNonDefault).toBe(true)
    })

    it('isSortNonDefault is true when sortDirection differs from the default', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, sortDirection: 'desc' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.toolbarState.isSortNonDefault).toBe(true)
    })

    it('isSortNonDefault is false at default sortBy=name and sortDirection=asc', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      // Explicitly set to defaults
      app._viewState = { ...app._viewState, sortBy: 'name', sortDirection: 'asc' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.toolbarState.isSortNonDefault).toBe(false)
    })

    it('hasActiveFilters is false when only sort is non-default (sort is not a filter)', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, sortBy: 'price', sortDirection: 'desc' }
      const context = await app._preparePartContext('catalog', {})

      // Sort order is highlighted separately — it does not contribute to hasActiveFilters
      expect(context.toolbarState.hasActiveFilters).toBe(false)
    })

    it('hasActiveFilters is true when multiple filters are active simultaneously', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, search: 'blaster', filterType: 'weapon' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.toolbarState.hasActiveFilters).toBe(true)
      expect(context.toolbarState.isSearchActive).toBe(true)
      expect(context.toolbarState.isFilterTypeActive).toBe(true)
    })

    it('resetCatalog action resets toolbarState active flags to default', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, search: 'blaster', filterType: 'weapon', sortBy: 'price' }
      app.render = vi.fn().mockResolvedValue(undefined)

      const action = MarketApplicationV2.DEFAULT_OPTIONS.actions.resetCatalog
      await action.call(app, {}, {})

      // After reset, verify toolbarState would show no active filters
      const context = await app._preparePartContext('catalog', {})
      expect(context.toolbarState.hasActiveFilters).toBe(false)
      expect(context.toolbarState.isSortNonDefault).toBe(false)
    })

    it('toolbarState is not present in non-catalog part context', async () => {
      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('other', {})

      expect(context.toolbarState).toBeUndefined()
    })
  })

  /* -------------------------------------------- */
  /*  Price variation view-model (#532)            */
  /* -------------------------------------------- */

  describe('price variation view-model on catalog entries', () => {
    it('isModified=false and priceTrend="none" when price has no modifiers (e.g. rarity=0, standard market)', async () => {
      const item = makeItem({ type: 'weapon', name: 'Blaster', price: 100, rarity: 0, availability: 'available' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'standard' }
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.items[0]
      expect(entry.isModified).toBe(false)
      expect(entry.priceTrend).toBe('none')
      expect(entry.priceStateClass).toBe('')
      expect(entry.priceIndicator).toBeNull()
      expect(entry.priceTrendAriaKey).toBeNull()
    })

    it('isModified=true and priceTrend="premium" when finalPrice > basePrice (e.g. black-market +50%)', async () => {
      const item = makeItem({ type: 'weapon', name: 'Blaster', price: 100, rarity: 0, availability: 'available' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'black-market' }
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.items[0]
      // Black-market applies a +50% premium: finalPrice=150 > basePrice=100
      expect(entry.isModified).toBe(true)
      expect(entry.priceTrend).toBe('premium')
      expect(entry.priceStateClass).toBe('market-price--premium')
      expect(entry.priceIndicator).toBe('↑')
      expect(entry.priceTrendAriaKey).toBe('MARKET.Price.Trend.premium')
    })

    it('isModified=true and priceTrend="discount" when finalPrice < basePrice (e.g. local market -10%)', async () => {
      const item = makeItem({ type: 'weapon', name: 'Blaster', price: 100, rarity: 0, availability: 'available' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'local' }
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.items[0]
      // Local market applies a -10% discount: finalPrice=90 < basePrice=100
      expect(entry.isModified).toBe(true)
      expect(entry.priceTrend).toBe('discount')
      expect(entry.priceStateClass).toBe('market-price--discount')
      expect(entry.priceIndicator).toBe('↓')
      expect(entry.priceTrendAriaKey).toBe('MARKET.Price.Trend.discount')
    })

    it('exposes isModified, priceTrend, priceStateClass, priceIndicator, priceTrendAriaKey on every catalog entry', async () => {
      const items = [
        makeItem({ type: 'weapon', name: 'Blaster A', price: 100, rarity: 0, availability: 'available' }),
        makeItem({ type: 'armor', name: 'Armor B', price: 200, rarity: 1, availability: 'available' }),
      ]
      globalThis.game.items = makeItemsCollection(items)

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      for (const entry of context.catalog.items) {
        expect(entry).toHaveProperty('isModified')
        expect(typeof entry.isModified).toBe('boolean')
        expect(entry).toHaveProperty('priceTrend')
        expect(['none', 'discount', 'premium']).toContain(entry.priceTrend)
        expect(entry).toHaveProperty('priceStateClass')
        expect(typeof entry.priceStateClass).toBe('string')
        expect(entry).toHaveProperty('priceIndicator')
        expect(entry).toHaveProperty('priceTrendAriaKey')
      }
    })

    it('priceIndicator is null and priceTrendAriaKey is null when isModified=false', async () => {
      const item = makeItem({ type: 'weapon', name: 'Blaster', price: 100, rarity: 0, availability: 'available' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.items[0]
      expect(entry.priceIndicator).toBeNull()
      expect(entry.priceTrendAriaKey).toBeNull()
    })

    it('priceStateClass is empty string when isModified=false', async () => {
      const item = makeItem({ type: 'weapon', name: 'Blaster', price: 100, rarity: 0, availability: 'available' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.items[0].priceStateClass).toBe('')
    })

    it('does not alter priceResult.basePrice or priceResult.finalPrice when adding trend fields', async () => {
      const item = makeItem({ type: 'weapon', name: 'Blaster', price: 100, rarity: 0, availability: 'available' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, activeMarketType: 'black-market' }
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.items[0]
      // Price values must remain unchanged
      expect(entry.priceResult.basePrice).toBe(100)
      expect(entry.priceResult.finalPrice).toBe(150)
    })
  })

  /* -------------------------------------------- */
  /*  isOutOfBudget annotation (Issue #534)       */
  /* -------------------------------------------- */

  describe('isOutOfBudget annotation on catalog entries', () => {
    it('annotates isOutOfBudget=false when no buyer actor is set', async () => {
      const item = makeItem({ type: 'weapon', name: 'Blaster', price: 100 })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.items[0].isOutOfBudget).toBe(false)
    })

    it('annotates isOutOfBudget=false when buyer has sufficient credits', async () => {
      const item = makeItem({ type: 'weapon', name: 'Blaster', price: 100 })
      globalThis.game.items = makeItemsCollection([item])

      const actor = { id: 'actor-1', name: 'Rich', system: { credits: 500 } }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.items[0].isOutOfBudget).toBe(false)
    })

    it('annotates isOutOfBudget=true when buyer has insufficient credits', async () => {
      const item = makeItem({ type: 'weapon', name: 'Expensive', price: 1000 })
      globalThis.game.items = makeItemsCollection([item])

      const actor = { id: 'actor-1', name: 'Poor', system: { credits: 50 } }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.items[0].isOutOfBudget).toBe(true)
    })

    it('annotates isOutOfBudget=false when item is blocked for reasons other than credits (e.g. nonPurchasable items are excluded)', async () => {
      // nonPurchasable items are removed from the catalog entirely before annotation,
      // so we test with a buyer who can afford the item — isOutOfBudget must be false.
      const item = makeItem({ type: 'weapon', name: 'Affordable', price: 50 })
      globalThis.game.items = makeItemsCollection([item])

      const actor = { id: 'actor-1', name: 'Buyer', system: { credits: 200 } }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.items[0].isOutOfBudget).toBe(false)
    })

    it('exposes isOutOfBudget on every catalog entry', async () => {
      const items = [makeItem({ type: 'weapon', name: 'Cheap', price: 10 }), makeItem({ type: 'armor', name: 'Expensive', price: 9999 })]
      globalThis.game.items = makeItemsCollection(items)

      const actor = { id: 'actor-1', name: 'Test', system: { credits: 100 } }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const context = await app._preparePartContext('catalog', {})

      for (const entry of context.catalog.items) {
        expect(entry).toHaveProperty('isOutOfBudget')
        expect(typeof entry.isOutOfBudget).toBe('boolean')
      }
    })

    it('isOutOfBudget=true only for items the buyer cannot afford, not all items', async () => {
      const cheap = makeItem({ type: 'weapon', name: 'Cheap Blaster', price: 10 })
      const expensive = makeItem({ type: 'armor', name: 'Expensive Armor', price: 9999 })
      globalThis.game.items = makeItemsCollection([cheap, expensive])

      const actor = { id: 'actor-1', name: 'Test', system: { credits: 100 } }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const context = await app._preparePartContext('catalog', {})

      const cheapEntry = context.catalog.items.find((e) => e.name === 'Cheap Blaster')
      const expensiveEntry = context.catalog.items.find((e) => e.name === 'Expensive Armor')

      expect(cheapEntry.isOutOfBudget).toBe(false)
      expect(expensiveEntry.isOutOfBudget).toBe(true)
    })

    it('isOutOfBudget and canBuy are consistent: isOutOfBudget=true implies canBuy=false', async () => {
      const expensive = makeItem({ type: 'weapon', name: 'Expensive', price: 9999 })
      globalThis.game.items = makeItemsCollection([expensive])

      const actor = { id: 'actor-1', name: 'Test', system: { credits: 1 } }
      const app = new MarketApplicationV2()
      app.setBuyerActor(actor)
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.items[0]
      expect(entry.isOutOfBudget).toBe(true)
      expect(entry.canBuy).toBe(false)
    })
  })

  /* -------------------------------------------- */
  /*  toolbarState contract (Issue #534)          */
  /* -------------------------------------------- */

  describe('toolbarState in catalog context', () => {
    it('exposes toolbarState in catalog context', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.toolbarState).toBeDefined()
    })

    it('toolbarState.hasActiveFilters is false when all filters are default', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.toolbarState.hasActiveFilters).toBe(false)
    })

    it('toolbarState.hasActiveFilters is true when search is active', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, search: 'blaster' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.toolbarState.isSearchActive).toBe(true)
      expect(context.toolbarState.hasActiveFilters).toBe(true)
    })

    it('toolbarState.isFilterTypeActive is true when filterType is set', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, filterType: 'weapon' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.toolbarState.isFilterTypeActive).toBe(true)
    })

    it('toolbarState.isSortNonDefault is false when sort is name/asc', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      // Default state
      const context = await app._preparePartContext('catalog', {})

      expect(context.toolbarState.isSortNonDefault).toBe(false)
    })

    it('toolbarState.isSortNonDefault is true when sort field deviates from default', async () => {
      globalThis.game.items = makeItemsCollection([])

      const app = new MarketApplicationV2()
      app._viewState = { ...app._viewState, sortBy: 'price' }
      const context = await app._preparePartContext('catalog', {})

      expect(context.toolbarState.isSortNonDefault).toBe(true)
    })
  })
})
