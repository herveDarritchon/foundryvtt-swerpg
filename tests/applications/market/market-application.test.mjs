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
        'MARKET.Catalog.OpenSheet': 'Open item sheet',
        'MARKET.Catalog.Column.Name': 'Name',
        'MARKET.Catalog.Column.Type': 'Type',
        'MARKET.Catalog.Column.Price': 'Price',
        'MARKET.Catalog.Column.Rarity': 'Rarity',
        'MARKET.Catalog.Column.Restriction': 'Restriction',
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
  })

  /* -------------------------------------------- */
  /*  #prepareCatalog via _preparePartContext     */
  /* -------------------------------------------- */

  describe('_preparePartContext — catalog', () => {
    it('groups eligible items by type', async () => {
      const weaponItem = makeItem({ type: 'weapon', name: 'Blaster Pistol' })
      const armorItem = makeItem({ type: 'armor', name: 'Light Armor', basePrice: 200 })
      globalThis.game.items = makeItemsCollection([weaponItem, armorItem])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.isEmpty).toBe(false)
      expect(context.catalog.groups).toHaveLength(2)

      const weaponGroup = context.catalog.groups.find((g) => g.typeKey === 'weapon')
      expect(weaponGroup).toBeDefined()
      expect(weaponGroup.items).toHaveLength(1)
      expect(weaponGroup.items[0].name).toBe('Blaster Pistol')

      const armorGroup = context.catalog.groups.find((g) => g.typeKey === 'armor')
      expect(armorGroup).toBeDefined()
      expect(armorGroup.items).toHaveLength(1)
      expect(armorGroup.items[0].name).toBe('Light Armor')
    })

    it('excludes items with non-purchasable types (e.g. talent)', async () => {
      const talentItem = makeItem({ type: 'talent', name: 'Force Sensitive' })
      globalThis.game.items = makeItemsCollection([talentItem])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.isEmpty).toBe(true)
      expect(context.catalog.groups).toHaveLength(0)
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
      expect(context.catalog.groups).toHaveLength(0)
    })

    it('does not include groups with zero items', async () => {
      // Only one weapon, no armor, no gear
      const weaponItem = makeItem({ type: 'weapon' })
      globalThis.game.items = makeItemsCollection([weaponItem])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      expect(context.catalog.groups.every((g) => g.items.length > 0)).toBe(true)
      expect(context.catalog.groups.some((g) => g.typeKey === 'armor')).toBe(false)
      expect(context.catalog.groups.some((g) => g.typeKey === 'gear')).toBe(false)
    })

    it('includes typeKey, label, icon in each group', async () => {
      const item = makeItem({ type: 'gear', name: 'Medpac', basePrice: 25 })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      const gearGroup = context.catalog.groups.find((g) => g.typeKey === 'gear')
      expect(gearGroup.label).toBe('MARKET.ItemType.Gear')
      expect(gearGroup.icon).toBe('fa-solid fa-toolbox')
    })

    it('uses item.uuid as sourceId in the market entry', async () => {
      const item = makeItem({ type: 'weapon', uuid: 'Item.myUuid' })
      globalThis.game.items = makeItemsCollection([item])

      const app = new MarketApplicationV2()
      const context = await app._preparePartContext('catalog', {})

      const entry = context.catalog.groups[0].items[0]
      expect(entry.sourceId).toBe('Item.myUuid')
      expect(entry.sourceType).toBe('world')
    })

    it('does not mutate context for non-catalog parts', async () => {
      const app = new MarketApplicationV2()
      const context = { someExistingKey: 'value' }
      const result = await app._preparePartContext('other', context)

      expect(result).not.toHaveProperty('catalog')
      expect(result.someExistingKey).toBe('value')
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
})
