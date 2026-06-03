import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { addPacksMock, setupFoundryMock, teardownFoundryMock } from '../../helpers/mock-foundry.mjs'
import { loadCompendiumItems } from '../../../module/applications/market/compendium-source-adapter.mjs'

describe('loadCompendiumItems', () => {
  beforeEach(() => {
    setupFoundryMock()
  })

  afterEach(() => {
    teardownFoundryMock()
    vi.resetModules()
  })

  /* -------------------------------------------- */
  /*  Basic loading                               */
  /* -------------------------------------------- */

  test('returns empty array when there are no packs', async () => {
    // game.packs is already an empty Map from setupFoundryMock
    const result = await loadCompendiumItems()
    expect(result).toEqual([])
  })

  test('loads purchasable items from an Item-type pack', async () => {
    addPacksMock({
      'swerpg.weapons': {
        documentName: 'Item',
        collection: 'swerpg.weapons',
        documents: [
          { id: 'w1', name: 'Blaster', type: 'weapon', system: { price: 500, rarity: 0, availability: 'available' } },
          { id: 'w2', name: 'Rifle', type: 'weapon', system: { price: 1000, rarity: 1, availability: 'rare' } },
        ],
      },
    })

    const result = await loadCompendiumItems()

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Blaster')
    expect(result[1].name).toBe('Rifle')
  })

  test('sets _sourceId to the pack collection on each item', async () => {
    addPacksMock({
      'swerpg.weapons': {
        documentName: 'Item',
        collection: 'swerpg.weapons',
        documents: [{ id: 'w1', name: 'Blaster', type: 'weapon', system: { price: 500 } }],
      },
    })

    const result = await loadCompendiumItems()

    expect(result).toHaveLength(1)
    expect(result[0]._sourceId).toBe('swerpg.weapons')
  })

  test('maps system fields to RawItem shape correctly', async () => {
    addPacksMock({
      'swerpg.weapons': {
        documentName: 'Item',
        collection: 'swerpg.weapons',
        documents: [
          {
            id: 'w1',
            name: 'Blaster',
            type: 'weapon',
            // NOTE: `availability` is intentionally absent — it is not a field in the physical item schema.
            // Market availability is derived by the domain layer from rarity + restrictionLevel.
            system: { price: 750, rarity: 3, quality: 'superior', restrictionLevel: 'restricted' },
          },
        ],
      },
    })

    const result = await loadCompendiumItems()

    expect(result).toHaveLength(1)
    const item = result[0]
    expect(item.name).toBe('Blaster')
    expect(item.type).toBe('weapon')
    expect(item.basePrice).toBe(750)
    expect(item.rarity).toBe(3)
    expect(item.quality).toBe('superior')
    expect(item.restrictionLevel).toBe('restricted')
    // `availability` is NOT in the RawItem shape — it is derived by createMarketEntry() via deriveAvailability()
    expect(item).not.toHaveProperty('availability')
    expect(item.nonPurchasable).toBe(false)
    expect(item.broken).toBe(false)
  })

  /* -------------------------------------------- */
  /*  Type filtering                              */
  /* -------------------------------------------- */

  test('filters out non-purchasable item types (e.g. talent)', async () => {
    addPacksMock({
      'swerpg.mixed': {
        documentName: 'Item',
        collection: 'swerpg.mixed',
        documents: [
          { id: 'w1', name: 'Blaster', type: 'weapon', system: { price: 500 } },
          { id: 't1', name: 'Force Sensitive', type: 'talent', system: {} },
          { id: 'a1', name: 'Light Armor', type: 'armor', system: { price: 300 } },
        ],
      },
    })

    const result = await loadCompendiumItems()

    expect(result).toHaveLength(2)
    const types = result.map((item) => item.type)
    expect(types).toContain('weapon')
    expect(types).toContain('armor')
    expect(types).not.toContain('talent')
  })

  test('filters out career item type', async () => {
    addPacksMock({
      'swerpg.items': {
        documentName: 'Item',
        collection: 'swerpg.items',
        documents: [
          { id: 'c1', name: 'Smuggler', type: 'career', system: {} },
          { id: 'g1', name: 'Medpac', type: 'gear', system: { price: 25 } },
        ],
      },
    })

    const result = await loadCompendiumItems()

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('gear')
  })

  /* -------------------------------------------- */
  /*  Non-Item packs                              */
  /* -------------------------------------------- */

  test('skips non-Item packs (e.g. Actor packs)', async () => {
    addPacksMock({
      'swerpg.weapons': {
        documentName: 'Item',
        collection: 'swerpg.weapons',
        documents: [{ id: 'w1', name: 'Blaster', type: 'weapon', system: { price: 500 } }],
      },
      'swerpg.actors': {
        documentName: 'Actor',
        collection: 'swerpg.actors',
        documents: [{ id: 'a1', name: 'NPC', type: 'character' }],
      },
    })

    const result = await loadCompendiumItems()

    // Only the weapon from the Item pack, not the actor
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Blaster')
  })

  /* -------------------------------------------- */
  /*  Error handling                              */
  /* -------------------------------------------- */

  test('skips a pack gracefully when getIndex throws', async () => {
    addPacksMock({
      'swerpg.weapons': {
        documentName: 'Item',
        collection: 'swerpg.weapons',
        documents: [{ id: 'w1', name: 'Blaster', type: 'weapon', system: { price: 500 } }],
      },
    })

    // Override getIndex to simulate a pack error
    const pack = globalThis.game.packs.get('swerpg.weapons')
    pack.getIndex = vi.fn().mockRejectedValue(new Error('Pack index unavailable'))

    const result = await loadCompendiumItems()

    // Failing pack is skipped; no items returned
    expect(result).toHaveLength(0)
  })

  test('loads items from multiple Item packs', async () => {
    addPacksMock({
      'swerpg.weapons': {
        documentName: 'Item',
        collection: 'swerpg.weapons',
        documents: [{ id: 'w1', name: 'Blaster', type: 'weapon', system: { price: 500 } }],
      },
      'swerpg.gear': {
        documentName: 'Item',
        collection: 'swerpg.gear',
        documents: [
          { id: 'g1', name: 'Medpac', type: 'gear', system: { price: 25 } },
          { id: 'g2', name: 'Stims', type: 'gear', system: { price: 10 } },
        ],
      },
    })

    const result = await loadCompendiumItems()

    expect(result).toHaveLength(3)
    const names = result.map((item) => item.name)
    expect(names).toContain('Blaster')
    expect(names).toContain('Medpac')
    expect(names).toContain('Stims')
  })

  test('uses empty string fallback for missing system fields', async () => {
    addPacksMock({
      'swerpg.weapons': {
        documentName: 'Item',
        collection: 'swerpg.weapons',
        documents: [
          // Minimal doc with no system data
          { id: 'w1', name: 'Mystery Weapon', type: 'weapon' },
        ],
      },
    })

    const result = await loadCompendiumItems()

    expect(result).toHaveLength(1)
    const item = result[0]
    expect(item.basePrice).toBe(0)
    expect(item.rarity).toBe(0)
    expect(item.quality).toBe('')
    expect(item.restrictionLevel).toBe('')
    // `availability` is not part of the RawItem shape — it is derived by the domain layer
    expect(item).not.toHaveProperty('availability')
  })
})
