import { describe, expect, it } from 'vitest'

import { evaluateMarketConsequences, CONSEQUENCE_TYPES } from '../../../module/lib/market/consequences.mjs'

/* -------------------------------------------- */
/*  Factories                                   */
/* -------------------------------------------- */

/**
 * Build a minimal market entry-like plain object.
 * @param {object} [overrides]
 */
function makeEntry({ name = 'Test Item', rarity = 0, availability = 'available', restrictionLevel = '' } = {}) {
  return { name, rarity, availability, restrictionLevel }
}

/**
 * Build a minimal actor-like plain object.
 * @param {object} [overrides]
 */
function makeActor({ name = 'Han Solo', id = 'actor-1' } = {}) {
  return { name, id }
}

/* -------------------------------------------- */
/*  evaluateMarketConsequences                  */
/* -------------------------------------------- */

describe('evaluateMarketConsequences', () => {
  /* -------------------------------------------- */
  /*  Standard purchase: no consequences          */
  /* -------------------------------------------- */

  describe('standard purchase', () => {
    it('returns empty array for a common item in a standard market', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ availability: 'common', restrictionLevel: '' }),
        marketType: 'standard',
      })
      expect(result).toEqual([])
    })

    it('returns empty array for a rare item in a standard market with no restriction', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ rarity: 5, availability: 'rare', restrictionLevel: '' }),
        marketType: 'standard',
      })
      expect(result).toEqual([])
    })
  })

  /* -------------------------------------------- */
  /*  Imperial Suspicion                          */
  /* -------------------------------------------- */

  describe('imperialSuspicion', () => {
    it('triggers for a restricted restrictionLevel', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ restrictionLevel: 'restricted' }),
        marketType: 'standard',
      })
      const types = result.map((c) => c.type)
      expect(types).toContain(CONSEQUENCE_TYPES.imperialSuspicion)
    })

    it('triggers for an illegal restrictionLevel', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ restrictionLevel: 'illegal' }),
        marketType: 'standard',
      })
      const types = result.map((c) => c.type)
      expect(types).toContain(CONSEQUENCE_TYPES.imperialSuspicion)
    })

    it('does not trigger for a licensed item', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ restrictionLevel: 'licensed' }),
        marketType: 'standard',
      })
      const types = result.map((c) => c.type)
      expect(types).not.toContain(CONSEQUENCE_TYPES.imperialSuspicion)
    })

    it('imperialSuspicion is not automatic (requires GM review)', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ restrictionLevel: 'restricted' }),
        marketType: 'standard',
      })
      const consequence = result.find((c) => c.type === CONSEQUENCE_TYPES.imperialSuspicion)
      expect(consequence?.automatic).toBe(false)
    })

    it('imperialSuspicion is not a player choice', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ restrictionLevel: 'restricted' }),
        marketType: 'standard',
      })
      const consequence = result.find((c) => c.type === CONSEQUENCE_TYPES.imperialSuspicion)
      expect(consequence?.playerChoice).toBe(false)
    })

    it('includes itemName and restrictionLevel in metadata', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ name: 'E-11 Blaster', restrictionLevel: 'restricted' }),
        marketType: 'standard',
        actor: makeActor(),
      })
      const c = result.find((c) => c.type === CONSEQUENCE_TYPES.imperialSuspicion)
      expect(c?.metadata?.itemName).toBe('E-11 Blaster')
      expect(c?.metadata?.restrictionLevel).toBe('restricted')
    })
  })

  /* -------------------------------------------- */
  /*  Black-market Debt                           */
  /* -------------------------------------------- */

  describe('blackMarketDebt', () => {
    it('triggers when market type is black-market', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ availability: 'available' }),
        marketType: 'black-market',
      })
      const types = result.map((c) => c.type)
      expect(types).toContain(CONSEQUENCE_TYPES.blackMarketDebt)
    })

    it('triggers when availability is blackMarket', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ availability: 'blackMarket' }),
        marketType: 'standard',
      })
      const types = result.map((c) => c.type)
      expect(types).toContain(CONSEQUENCE_TYPES.blackMarketDebt)
    })

    it('triggers when availability is restricted', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ availability: 'restricted' }),
        marketType: 'standard',
      })
      const types = result.map((c) => c.type)
      expect(types).toContain(CONSEQUENCE_TYPES.blackMarketDebt)
    })

    it('does not trigger for a rare item in a standard market', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ availability: 'rare' }),
        marketType: 'standard',
      })
      const types = result.map((c) => c.type)
      expect(types).not.toContain(CONSEQUENCE_TYPES.blackMarketDebt)
    })

    it('blackMarketDebt is a player choice', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ availability: 'blackMarket' }),
        marketType: 'standard',
      })
      const consequence = result.find((c) => c.type === CONSEQUENCE_TYPES.blackMarketDebt)
      expect(consequence?.playerChoice).toBe(true)
    })
  })

  /* -------------------------------------------- */
  /*  Complication                                */
  /* -------------------------------------------- */

  describe('complication', () => {
    it('triggers for rarity >= 8', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ rarity: 8 }),
        marketType: 'standard',
      })
      const types = result.map((c) => c.type)
      expect(types).toContain(CONSEQUENCE_TYPES.complication)
    })

    it('triggers for rarity 10', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ rarity: 10 }),
        marketType: 'standard',
      })
      const types = result.map((c) => c.type)
      expect(types).toContain(CONSEQUENCE_TYPES.complication)
    })

    it('does not trigger for rarity 7', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ rarity: 7 }),
        marketType: 'standard',
      })
      const types = result.map((c) => c.type)
      expect(types).not.toContain(CONSEQUENCE_TYPES.complication)
    })

    it('triggers for black-market regardless of rarity', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ rarity: 0 }),
        marketType: 'black-market',
      })
      const types = result.map((c) => c.type)
      expect(types).toContain(CONSEQUENCE_TYPES.complication)
    })

    it('complication is a player choice', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ rarity: 9 }),
        marketType: 'standard',
      })
      const consequence = result.find((c) => c.type === CONSEQUENCE_TYPES.complication)
      expect(consequence?.playerChoice).toBe(true)
    })
  })

  /* -------------------------------------------- */
  /*  Multiple consequences                       */
  /* -------------------------------------------- */

  describe('multiple consequences', () => {
    it('black-market purchase of restricted item produces all three consequences', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ rarity: 9, availability: 'blackMarket', restrictionLevel: 'illegal' }),
        marketType: 'black-market',
        actor: makeActor(),
      })
      const types = result.map((c) => c.type)
      expect(types).toContain(CONSEQUENCE_TYPES.imperialSuspicion)
      expect(types).toContain(CONSEQUENCE_TYPES.blackMarketDebt)
      expect(types).toContain(CONSEQUENCE_TYPES.complication)
    })

    it('item with rarity=8 includes complication', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ rarity: 8 }),
        marketType: 'standard',
      })
      const types = result.map((c) => c.type)
      expect(types).toContain(CONSEQUENCE_TYPES.complication)
    })

    it('black-market + restricted item produces imperialSuspicion + blackMarketDebt + complication', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ availability: 'blackMarket', restrictionLevel: 'restricted', rarity: 3 }),
        marketType: 'black-market',
        actor: makeActor(),
      })
      const types = result.map((c) => c.type)
      expect(types).toContain(CONSEQUENCE_TYPES.imperialSuspicion)
      expect(types).toContain(CONSEQUENCE_TYPES.blackMarketDebt)
      expect(types).toContain(CONSEQUENCE_TYPES.complication)
    })

    it('returns empty array when no consequences apply (standard market, common item, low rarity)', () => {
      const result = evaluateMarketConsequences({
        entry: makeEntry({ availability: 'common', restrictionLevel: '', rarity: 2 }),
        marketType: 'standard',
      })
      expect(result).toEqual([])
    })
  })

  /* -------------------------------------------- */
  /*  Edge cases                                  */
  /* -------------------------------------------- */

  describe('edge cases', () => {
    it('returns empty array when entry is null', () => {
      const result = evaluateMarketConsequences({ entry: null, marketType: 'standard' })
      expect(result).toEqual([])
    })

    it('returns empty array when called with no arguments', () => {
      const result = evaluateMarketConsequences()
      expect(result).toEqual([])
    })

    it('does not throw when actor is absent', () => {
      expect(() =>
        evaluateMarketConsequences({
          entry: makeEntry({ restrictionLevel: 'restricted' }),
          marketType: 'standard',
        }),
      ).not.toThrow()
    })

    it('does not mutate the entry input', () => {
      const entry = makeEntry({ restrictionLevel: 'restricted' })
      const before = JSON.stringify(entry)
      evaluateMarketConsequences({ entry, marketType: 'standard' })
      expect(JSON.stringify(entry)).toBe(before)
    })
  })
})
