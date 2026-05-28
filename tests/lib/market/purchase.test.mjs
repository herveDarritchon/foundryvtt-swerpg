import { describe, expect, it } from 'vitest'

import { validatePurchase } from '../../../module/lib/market/purchase.mjs'

/* -------------------------------------------- */
/*  Factories                                   */
/* -------------------------------------------- */

/**
 * Build a minimal actor-like plain object with credits (legacy shape).
 * @param {object} [overrides]
 */
function makeActor({ credits = 500, id = 'actor-1', name = 'Test Character' } = {}) {
  return {
    id,
    name,
    system: { credits },
  }
}

/**
 * Build an actor-like plain object with a creditBudget (derived budget shape).
 * @param {object} [overrides]
 */
function makeActorWithBudget({ availableCredits = 500, id = 'actor-1', name = 'Test Character' } = {}) {
  return {
    id,
    name,
    system: {
      creditBudget: { availableCredits },
      credits: 0, // manual adjustment — should NOT be used for affordability check
    },
  }
}

/**
 * Build a minimal market entry-like plain object with a finalPrice.
 * @param {object} [overrides]
 */
function makeEntry({ uuid = 'Item.abc', name = 'Blaster Pistol', finalPrice = 100 } = {}) {
  return {
    uuid,
    name,
    priceResult: { finalPrice },
  }
}

/* -------------------------------------------- */
/*  Tests                                       */
/* -------------------------------------------- */

describe('validatePurchase', () => {
  /* -------------------------------------------- */
  /*  Success path                                */
  /* -------------------------------------------- */

  describe('success', () => {
    it('returns canPurchase=true when actor has sufficient credits', () => {
      const result = validatePurchase({ actor: makeActor({ credits: 500 }), entry: makeEntry({ finalPrice: 100 }) })
      expect(result.canPurchase).toBe(true)
      expect(result.reason).toBe('')
    })

    it('includes the final price and credits remaining', () => {
      const result = validatePurchase({ actor: makeActor({ credits: 500 }), entry: makeEntry({ finalPrice: 100 }) })
      expect(result.finalPrice).toBe(100)
      expect(result.creditsAfter).toBe(400)
    })

    it('allows purchase when credits exactly equal the price', () => {
      const result = validatePurchase({ actor: makeActor({ credits: 100 }), entry: makeEntry({ finalPrice: 100 }) })
      expect(result.canPurchase).toBe(true)
      expect(result.creditsAfter).toBe(0)
    })

    it('allows purchase for a free item (price = 0)', () => {
      const result = validatePurchase({ actor: makeActor({ credits: 0 }), entry: makeEntry({ finalPrice: 0 }) })
      expect(result.canPurchase).toBe(true)
      expect(result.creditsAfter).toBe(0)
    })
  })

  /* -------------------------------------------- */
  /*  Missing actor                               */
  /* -------------------------------------------- */

  describe('missing actor', () => {
    it('returns canPurchase=false with reason "missing-actor" when actor is null', () => {
      const result = validatePurchase({ actor: null, entry: makeEntry() })
      expect(result.canPurchase).toBe(false)
      expect(result.reason).toBe('missing-actor')
      expect(result.messageKey).toBeDefined()
    })

    it('returns canPurchase=false with reason "missing-actor" when actor is undefined', () => {
      const result = validatePurchase({ actor: undefined, entry: makeEntry() })
      expect(result.canPurchase).toBe(false)
      expect(result.reason).toBe('missing-actor')
    })

    it('returns canPurchase=false when called with no arguments', () => {
      const result = validatePurchase()
      expect(result.canPurchase).toBe(false)
      expect(result.reason).toBe('missing-actor')
    })
  })

  /* -------------------------------------------- */
  /*  Missing entry                               */
  /* -------------------------------------------- */

  describe('missing entry', () => {
    it('returns canPurchase=false with reason "missing-entry" when entry is null', () => {
      const result = validatePurchase({ actor: makeActor(), entry: null })
      expect(result.canPurchase).toBe(false)
      expect(result.reason).toBe('missing-entry')
      expect(result.messageKey).toBeDefined()
    })

    it('returns canPurchase=false with reason "missing-entry" when entry has no uuid', () => {
      const result = validatePurchase({ actor: makeActor(), entry: { priceResult: { finalPrice: 100 } } })
      expect(result.canPurchase).toBe(false)
      expect(result.reason).toBe('missing-entry')
    })
  })

  /* -------------------------------------------- */
  /*  Invalid price                               */
  /* -------------------------------------------- */

  describe('invalid price', () => {
    it('returns canPurchase=false with reason "invalid-price" when finalPrice is NaN', () => {
      const result = validatePurchase({ actor: makeActor(), entry: makeEntry({ finalPrice: NaN }) })
      expect(result.canPurchase).toBe(false)
      expect(result.reason).toBe('invalid-price')
      expect(result.messageKey).toBeDefined()
    })

    it('returns canPurchase=false with reason "invalid-price" when finalPrice is negative', () => {
      const result = validatePurchase({ actor: makeActor(), entry: makeEntry({ finalPrice: -1 }) })
      expect(result.canPurchase).toBe(false)
      expect(result.reason).toBe('invalid-price')
    })

    it('returns canPurchase=false with reason "invalid-price" when priceResult is missing', () => {
      const result = validatePurchase({ actor: makeActor(), entry: { uuid: 'Item.x', name: 'X' } })
      expect(result.canPurchase).toBe(false)
      expect(result.reason).toBe('invalid-price')
    })
  })

  /* -------------------------------------------- */
  /*  Insufficient credits                        */
  /* -------------------------------------------- */

  describe('insufficient credits', () => {
    it('returns canPurchase=false with reason "insufficient-credits" when balance is too low', () => {
      const result = validatePurchase({ actor: makeActor({ credits: 50 }), entry: makeEntry({ finalPrice: 100 }) })
      expect(result.canPurchase).toBe(false)
      expect(result.reason).toBe('insufficient-credits')
      expect(result.messageKey).toBeDefined()
    })

    it('returns canPurchase=false when balance is exactly 0 and price is > 0', () => {
      const result = validatePurchase({ actor: makeActor({ credits: 0 }), entry: makeEntry({ finalPrice: 1 }) })
      expect(result.canPurchase).toBe(false)
      expect(result.reason).toBe('insufficient-credits')
    })

    it('returns canPurchase=false when actor has no credits field', () => {
      const actor = { id: 'a', name: 'No credits', system: {} }
      const result = validatePurchase({ actor, entry: makeEntry({ finalPrice: 10 }) })
      expect(result.canPurchase).toBe(false)
      expect(result.reason).toBe('insufficient-credits')
    })
  })

  /* -------------------------------------------- */
  /*  No mutation of inputs                       */
  /* -------------------------------------------- */

  describe('immutability', () => {
    it('does not mutate the actor or entry inputs', () => {
      const actor = makeActor({ credits: 500 })
      const entry = makeEntry({ finalPrice: 100 })
      const actorBefore = JSON.stringify(actor)
      const entryBefore = JSON.stringify(entry)

      validatePurchase({ actor, entry })

      expect(JSON.stringify(actor)).toBe(actorBefore)
      expect(JSON.stringify(entry)).toBe(entryBefore)
    })
  })

  /* -------------------------------------------- */
  /*  creditBudget.availableCredits resolution    */
  /* -------------------------------------------- */

  describe('creditBudget-aware credit resolution', () => {
    it('uses creditBudget.availableCredits when present (preferred path)', () => {
      const actor = makeActorWithBudget({ availableCredits: 500 })
      const result = validatePurchase({ actor, entry: makeEntry({ finalPrice: 100 }) })
      expect(result.canPurchase).toBe(true)
      expect(result.creditsAfter).toBe(400)
    })

    it('blocks purchase when creditBudget.availableCredits is insufficient', () => {
      const actor = makeActorWithBudget({ availableCredits: 50 })
      const result = validatePurchase({ actor, entry: makeEntry({ finalPrice: 100 }) })
      expect(result.canPurchase).toBe(false)
      expect(result.reason).toBe('insufficient-credits')
    })

    it('blocks purchase when creditBudget.availableCredits is negative (over budget)', () => {
      const actor = makeActorWithBudget({ availableCredits: -200 })
      const result = validatePurchase({ actor, entry: makeEntry({ finalPrice: 1 }) })
      expect(result.canPurchase).toBe(false)
      expect(result.reason).toBe('insufficient-credits')
    })

    it('falls back to system.credits when creditBudget is absent', () => {
      const actor = makeActor({ credits: 500 })
      const result = validatePurchase({ actor, entry: makeEntry({ finalPrice: 100 }) })
      expect(result.canPurchase).toBe(true)
      expect(result.creditsAfter).toBe(400)
    })

    it('prioritises creditBudget.availableCredits over system.credits (legacy field ignored)', () => {
      // Actor has 0 system.credits but 800 available from budget — should be able to buy
      const actor = {
        id: 'actor-budget',
        name: 'Budget Actor',
        system: {
          creditBudget: { availableCredits: 800 },
          credits: 0,
        },
      }
      const result = validatePurchase({ actor, entry: makeEntry({ finalPrice: 300 }) })
      expect(result.canPurchase).toBe(true)
      expect(result.creditsAfter).toBe(500)
    })
  })
})
