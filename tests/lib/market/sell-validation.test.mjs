import { describe, expect, it } from 'vitest'

import { validateSale } from '../../../module/lib/market/sell-validation.mjs'

/* -------------------------------------------- */
/*  Factories                                   */
/* -------------------------------------------- */

/**
 * Build a minimal item-like plain object that can be sold.
 * @param {object} [overrides]
 */
function makeItem({ id = 'item-1', uuid = 'Item.item-1', type = 'weapon', price = 100 } = {}) {
  return {
    id,
    uuid,
    type,
    system: { price },
  }
}

/**
 * Build a minimal actor-like plain object with a given inventory.
 * Uses a plain array for items (compatible with validateSale's `.some()` check).
 * @param {object} [overrides]
 */
function makeActor({ id = 'actor-1', items = [] } = {}) {
  return {
    id,
    items,
  }
}

/**
 * Build an actor that contains the given item in its inventory.
 * @param {object} item
 */
function makeActorWithItem(item) {
  return makeActor({ items: [item] })
}

/* -------------------------------------------- */
/*  Tests                                       */
/* -------------------------------------------- */

describe('validateSale', () => {
  /* -------------------------------------------- */
  /*  Happy path                                  */
  /* -------------------------------------------- */

  describe('success', () => {
    it('returns canSell=true when all conditions are met (weapon)', () => {
      const item = makeItem({ type: 'weapon', price: 100 })
      const actor = makeActorWithItem(item)
      const result = validateSale({ actor, item })
      expect(result.canSell).toBe(true)
      expect(result.reason).toBe('')
    })

    it('returns canSell=true for armor type', () => {
      const item = makeItem({ type: 'armor', price: 50 })
      const actor = makeActorWithItem(item)
      const result = validateSale({ actor, item })
      expect(result.canSell).toBe(true)
    })

    it('returns canSell=true for gear type', () => {
      const item = makeItem({ type: 'gear', price: 20 })
      const actor = makeActorWithItem(item)
      const result = validateSale({ actor, item })
      expect(result.canSell).toBe(true)
    })

    it('includes the resolved basePrice in the result', () => {
      const item = makeItem({ price: 250 })
      const actor = makeActorWithItem(item)
      const result = validateSale({ actor, item })
      expect(result.basePrice).toBe(250)
    })

    it('returns canSell=true when price is 0', () => {
      const item = makeItem({ price: 0 })
      const actor = makeActorWithItem(item)
      const result = validateSale({ actor, item })
      expect(result.canSell).toBe(true)
      expect(result.basePrice).toBe(0)
    })

    it('matches by uuid when item has no id match but uuid matches', () => {
      const item = makeItem({ id: 'item-abc', uuid: 'Item.uuid-abc', type: 'weapon', price: 10 })
      const actorItem = { id: 'item-other', uuid: 'Item.uuid-abc' }
      const actor = makeActor({ items: [actorItem] })
      const result = validateSale({ actor, item })
      expect(result.canSell).toBe(true)
    })
  })

  /* -------------------------------------------- */
  /*  Source price precedence                     */
  /* -------------------------------------------- */

  describe('source price precedence', () => {
    it('reads item.system._source.price when available (prefers source over derived)', () => {
      // Simulates an item with a rarity-adjusted derived price (e.g. rarity 2: 250 * 27 = 6750)
      const item = {
        id: 'item-1',
        uuid: 'Item.item-1',
        type: 'gear',
        system: {
          price: 6750, // derived price (250 * (2+1)^3)
          _source: {
            price: 250, // original source price
          },
        },
      }
      const actor = makeActorWithItem(item)
      const result = validateSale({ actor, item })
      expect(result.canSell).toBe(true)
      expect(result.basePrice).toBe(250) // must read from _source, not derived
    })

    it('falls back to system.price if _source.price is absent', () => {
      const item = makeItem({ price: 100 })
      const actor = makeActorWithItem(item)
      const result = validateSale({ actor, item })
      expect(result.canSell).toBe(true)
      expect(result.basePrice).toBe(100)
    })
  })

  /* -------------------------------------------- */
  /*  Missing actor                               */
  /* -------------------------------------------- */

  describe('missing actor', () => {
    it('returns canSell=false with reason "missing-actor" when actor is null', () => {
      const result = validateSale({ actor: null, item: makeItem() })
      expect(result.canSell).toBe(false)
      expect(result.reason).toBe('missing-actor')
      expect(result.messageKey).toBe('MARKET.Sale.Error.MissingActor')
    })

    it('returns canSell=false when actor is undefined', () => {
      const result = validateSale({ actor: undefined, item: makeItem() })
      expect(result.canSell).toBe(false)
      expect(result.reason).toBe('missing-actor')
    })

    it('returns canSell=false when called with no arguments', () => {
      const result = validateSale()
      expect(result.canSell).toBe(false)
      expect(result.reason).toBe('missing-actor')
    })
  })

  /* -------------------------------------------- */
  /*  Missing item                                */
  /* -------------------------------------------- */

  describe('missing item', () => {
    it('returns canSell=false with reason "missing-item" when item is null', () => {
      const actor = makeActor()
      const result = validateSale({ actor, item: null })
      expect(result.canSell).toBe(false)
      expect(result.reason).toBe('missing-item')
      expect(result.messageKey).toBe('MARKET.Sale.Error.MissingItem')
    })

    it('returns canSell=false when item is undefined', () => {
      const actor = makeActor()
      const result = validateSale({ actor, item: undefined })
      expect(result.canSell).toBe(false)
      expect(result.reason).toBe('missing-item')
    })
  })

  /* -------------------------------------------- */
  /*  Unsellable type                             */
  /* -------------------------------------------- */

  describe('unsellable type', () => {
    it('returns canSell=false for talent type', () => {
      const item = makeItem({ type: 'talent' })
      const actor = makeActorWithItem(item)
      const result = validateSale({ actor, item })
      expect(result.canSell).toBe(false)
      expect(result.reason).toBe('unsellable-type')
      expect(result.messageKey).toBe('MARKET.Sale.Error.UnsellableType')
    })

    it('returns canSell=false for career type', () => {
      const item = makeItem({ type: 'career' })
      const actor = makeActorWithItem(item)
      const result = validateSale({ actor, item })
      expect(result.canSell).toBe(false)
      expect(result.reason).toBe('unsellable-type')
    })

    it('returns canSell=false when type is an empty string', () => {
      const item = { ...makeItem(), type: '' }
      const actor = makeActorWithItem(item)
      const result = validateSale({ actor, item })
      expect(result.canSell).toBe(false)
      expect(result.reason).toBe('unsellable-type')
    })

    it('returns canSell=false when type is absent', () => {
      const item = { id: 'item-1', system: { price: 10 } }
      const actor = makeActorWithItem(item)
      const result = validateSale({ actor, item })
      expect(result.canSell).toBe(false)
      expect(result.reason).toBe('unsellable-type')
    })
  })

  /* -------------------------------------------- */
  /*  Not in inventory                            */
  /* -------------------------------------------- */

  describe('not in inventory', () => {
    it('returns canSell=false when item is not in actor inventory', () => {
      const item = makeItem({ id: 'item-missing', uuid: 'Item.item-missing', type: 'weapon' })
      const actor = makeActor({ items: [makeItem({ id: 'item-other', uuid: 'Item.item-other', type: 'weapon' })] })
      const result = validateSale({ actor, item })
      expect(result.canSell).toBe(false)
      expect(result.reason).toBe('not-in-inventory')
      expect(result.messageKey).toBe('MARKET.Sale.Error.NotInInventory')
    })

    it('returns canSell=false when actor has no items', () => {
      const item = makeItem()
      const actor = makeActor({ items: [] })
      const result = validateSale({ actor, item })
      expect(result.canSell).toBe(false)
      expect(result.reason).toBe('not-in-inventory')
    })

    it('returns canSell=false when actor.items is undefined', () => {
      const item = makeItem()
      const actor = { id: 'actor-1' }
      const result = validateSale({ actor, item })
      expect(result.canSell).toBe(false)
      expect(result.reason).toBe('not-in-inventory')
    })
  })

  /* -------------------------------------------- */
  /*  Invalid price                               */
  /* -------------------------------------------- */

  describe('invalid price', () => {
    it('returns canSell=false when price is negative', () => {
      const item = makeItem({ price: -10 })
      const actor = makeActorWithItem(item)
      const result = validateSale({ actor, item })
      expect(result.canSell).toBe(false)
      expect(result.reason).toBe('invalid-price')
      expect(result.messageKey).toBe('MARKET.Sale.Error.InvalidPrice')
    })

    it('returns canSell=false when price is NaN', () => {
      const item = makeItem({ price: NaN })
      const actor = makeActorWithItem(item)
      const result = validateSale({ actor, item })
      expect(result.canSell).toBe(false)
      expect(result.reason).toBe('invalid-price')
    })

    it('returns canSell=false when price is Infinity', () => {
      const item = makeItem({ price: Infinity })
      const actor = makeActorWithItem(item)
      const result = validateSale({ actor, item })
      expect(result.canSell).toBe(false)
      expect(result.reason).toBe('invalid-price')
    })

    it('defaults to price 0 when system.price is absent (and allows the sale)', () => {
      const item = { id: 'item-1', uuid: 'Item.item-1', type: 'weapon', system: {} }
      const actor = makeActorWithItem(item)
      const result = validateSale({ actor, item })
      expect(result.canSell).toBe(true)
      expect(result.basePrice).toBe(0)
    })
  })

  /* -------------------------------------------- */
  /*  messageKey completeness                     */
  /* -------------------------------------------- */

  describe('messageKey completeness', () => {
    const failureCases = [
      { desc: 'missing-actor', params: { actor: null, item: makeItem() } },
      { desc: 'missing-item', params: { actor: makeActor(), item: null } },
      { desc: 'unsellable-type', params: { actor: makeActorWithItem(makeItem({ type: 'talent' })), item: makeItem({ type: 'talent' }) } },
      { desc: 'not-in-inventory', params: { actor: makeActor(), item: makeItem() } },
      { desc: 'invalid-price', params: { actor: makeActorWithItem(makeItem({ price: -1 })), item: makeItem({ price: -1 }) } },
    ]

    for (const { desc, params } of failureCases) {
      it(`defines a messageKey for reason "${desc}"`, () => {
        const result = validateSale(params)
        expect(result.canSell).toBe(false)
        expect(typeof result.messageKey).toBe('string')
        expect(result.messageKey.length).toBeGreaterThan(0)
      })
    }
  })
})
