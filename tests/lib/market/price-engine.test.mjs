import { describe, expect, it } from 'vitest'
import { calculateItemPrice } from '../../../module/lib/market/price-engine.mjs'

describe('calculateItemPrice', () => {
  /* -------------------------------------------- */
  /*  Return shape                                */
  /* -------------------------------------------- */

  describe('return shape', () => {
    it('returns basePrice, finalPrice, and modifiers', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 })
      expect(result).toHaveProperty('basePrice')
      expect(result).toHaveProperty('finalPrice')
      expect(result).toHaveProperty('modifiers')
      expect(Array.isArray(result.modifiers)).toBe(true)
    })

    it('finalPrice is always an integer', () => {
      const result = calculateItemPrice({ basePrice: 75, rarity: 3 })
      expect(Number.isInteger(result.finalPrice)).toBe(true)
    })

    it('finalPrice is never negative', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, { manualModifier: -500 })
      expect(result.finalPrice).toBeGreaterThanOrEqual(0)
    })
  })

  /* -------------------------------------------- */
  /*  Default context fallback                    */
  /* -------------------------------------------- */

  describe('default context fallback', () => {
    it('uses DEFAULT_MARKET_CONTEXT when no context is provided', () => {
      // With no modifiers (default availability=available, rarity=0, manualModifier=0)
      const result = calculateItemPrice({ basePrice: 200, rarity: 0 })
      expect(result.finalPrice).toBe(200)
      expect(result.modifiers).toHaveLength(0)
    })

    it('uses DEFAULT_MARKET_CONTEXT when empty context is provided', () => {
      const result = calculateItemPrice({ basePrice: 200, rarity: 0 }, {})
      expect(result.finalPrice).toBe(200)
    })

    it('partial context is merged with defaults', () => {
      // Only provide manualModifier — availability/marketType should still default
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, { manualModifier: 10 })
      // 100 * (1 + 0.1) = 110
      expect(result.finalPrice).toBe(110)
    })
  })

  /* -------------------------------------------- */
  /*  Availability resolution                     */
  /* -------------------------------------------- */

  describe('availability resolution', () => {
    it('item-level availability overrides context availability', () => {
      // Item has 'rare' availability (priceModifier=0.25), context has 'available' (0)
      const result = calculateItemPrice({ basePrice: 100, rarity: 0, availability: 'rare' }, { availability: 'available' })
      // Item overrides: 100 * (1 + 0.25) = 125
      expect(result.finalPrice).toBe(125)
    })

    it('context availability is used when item has no availability', () => {
      // No item availability — context provides 'restricted' (priceModifier=1.0)
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, { availability: 'restricted' })
      // 100 * (1 + 1.0) = 200
      expect(result.finalPrice).toBe(200)
    })

    it('defaults to available when neither item nor context sets availability', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 })
      // No availability modifier
      expect(result.finalPrice).toBe(100)
    })
  })

  /* -------------------------------------------- */
  /*  manualModifier (GM override)                */
  /* -------------------------------------------- */

  describe('manualModifier from context', () => {
    it('+50 manual modifier adds 50% to base price', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, { manualModifier: 50 })
      expect(result.finalPrice).toBe(150)
    })

    it('-50 manual modifier reduces price by 50%', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, { manualModifier: -50 })
      expect(result.finalPrice).toBe(50)
    })

    it('-100 manual modifier clamps at 0', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, { manualModifier: -100 })
      expect(result.finalPrice).toBe(0)
    })

    it('0 manual modifier produces no modifier step', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, { manualModifier: 0 })
      const step = result.modifiers.find((m) => m.label === 'gmModifier')
      expect(step).toBeUndefined()
    })

    it('non-zero manual modifier appears in modifiers array', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, { manualModifier: 25 })
      const step = result.modifiers.find((m) => m.label === 'gmModifier')
      expect(step).toBeDefined()
      expect(step.modifier).toBeCloseTo(0.25)
    })
  })

  /* -------------------------------------------- */
  /*  Rarity modifier                             */
  /* -------------------------------------------- */

  describe('rarity modifier', () => {
    it('applies 10% per rarity point', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 5 })
      // 100 * (1 + 0.5) = 150
      expect(result.finalPrice).toBe(150)
    })

    it('rarity=0 produces no rarity modifier step', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 })
      const step = result.modifiers.find((m) => m.label === 'rarity')
      expect(step).toBeUndefined()
    })

    it('rarity>0 appears in modifiers array', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 3 })
      const step = result.modifiers.find((m) => m.label === 'rarity')
      expect(step).toBeDefined()
      expect(step.modifier).toBeCloseTo(0.3)
    })
  })

  /* -------------------------------------------- */
  /*  Combined modifiers                          */
  /* -------------------------------------------- */

  describe('combined modifiers', () => {
    it('combines rarity + availability + manualModifier', () => {
      // base=100, rarity=2 (0.2), availability=rare (0.25), manualModifier=10 (0.1)
      // 100 * (1 + 0.25 + 0.2 + 0.1) = 155
      const result = calculateItemPrice({ basePrice: 100, rarity: 2, availability: 'rare' }, { manualModifier: 10 })
      expect(result.finalPrice).toBe(155)
      expect(result.modifiers).toHaveLength(3)
    })

    it('basePrice=0 always yields finalPrice=0 regardless of modifiers', () => {
      const result = calculateItemPrice({ basePrice: 0, rarity: 10, availability: 'blackMarket' }, { manualModifier: 100 })
      expect(result.finalPrice).toBe(0)
    })
  })

  /* -------------------------------------------- */
  /*  Validation                                  */
  /* -------------------------------------------- */

  describe('validation', () => {
    it('throws TypeError for negative basePrice', () => {
      expect(() => calculateItemPrice({ basePrice: -1, rarity: 0 })).toThrow(TypeError)
    })

    it('throws TypeError for NaN basePrice', () => {
      expect(() => calculateItemPrice({ basePrice: NaN, rarity: 0 })).toThrow(TypeError)
    })

    it('throws TypeError for NaN rarity', () => {
      expect(() => calculateItemPrice({ basePrice: 100, rarity: NaN })).toThrow(TypeError)
    })
  })

  /* -------------------------------------------- */
  /*  Modifier key mapping                        */
  /* -------------------------------------------- */

  describe('modifier labels', () => {
    it('availability modifier uses label "availability"', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 0, availability: 'rare' })
      expect(result.modifiers.some((m) => m.label === 'availability')).toBe(true)
    })

    it('rarity modifier uses label "rarity"', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 2 })
      expect(result.modifiers.some((m) => m.label === 'rarity')).toBe(true)
    })

    it('gmModifier step uses label "gmModifier"', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, { manualModifier: 20 })
      expect(result.modifiers.some((m) => m.label === 'gmModifier')).toBe(true)
    })
  })

  /* -------------------------------------------- */
  /*  Market type modifiers                        */
  /* -------------------------------------------- */

  describe('market type modifiers', () => {
    it('standard market type produces no market type modifier step', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, { marketType: 'standard' })
      const step = result.modifiers.find((m) => m.label === 'marketType')
      expect(step).toBeUndefined()
      expect(result.finalPrice).toBe(100)
    })

    it('local market type applies -10% price discount', () => {
      // 100 * (1 + (-0.1)) = 90
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, { marketType: 'local' })
      expect(result.finalPrice).toBe(90)
      const step = result.modifiers.find((m) => m.label === 'marketType')
      expect(step).toBeDefined()
      expect(step.modifier).toBeCloseTo(-0.1)
    })

    it('specialized market type applies +25% price premium', () => {
      // 100 * (1 + 0.25) = 125
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, { marketType: 'specialized' })
      expect(result.finalPrice).toBe(125)
      const step = result.modifiers.find((m) => m.label === 'marketType')
      expect(step).toBeDefined()
      expect(step.modifier).toBeCloseTo(0.25)
    })

    it('black-market type applies +50% price premium', () => {
      // 100 * (1 + 0.5) = 150
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, { marketType: 'black-market' })
      expect(result.finalPrice).toBe(150)
      const step = result.modifiers.find((m) => m.label === 'marketType')
      expect(step).toBeDefined()
      expect(step.modifier).toBeCloseTo(0.5)
    })

    it('unknown market type produces no market type modifier (permissive fallback)', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, { marketType: 'unknown-type' })
      const step = result.modifiers.find((m) => m.label === 'marketType')
      expect(step).toBeUndefined()
      expect(result.finalPrice).toBe(100)
    })

    it('market type modifier stacks with rarity and availability modifiers', () => {
      // base=100, rarity=2 (0.2), availability=rare (0.25), marketType=black-market (0.5)
      // 100 * (1 + 0.2 + 0.25 + 0.5) = 195
      const result = calculateItemPrice({ basePrice: 100, rarity: 2, availability: 'rare' }, { marketType: 'black-market' })
      expect(result.finalPrice).toBe(195)
      expect(result.modifiers).toHaveLength(3)
    })

    it('local market discount stacks with rarity — net result is rarity + discount', () => {
      // base=100, rarity=5 (0.5), local (-0.1) → 100 * (1 + 0.5 - 0.1) = 140
      const result = calculateItemPrice({ basePrice: 100, rarity: 5 }, { marketType: 'local' })
      expect(result.finalPrice).toBe(140)
    })
  })

  /* -------------------------------------------- */
  /*  Per-type price modifiers (Phase 9)           */
  /* -------------------------------------------- */

  describe('per-type price modifiers (options.typeModifiers)', () => {
    it('applies a per-type modifier for a matching item type', () => {
      // base=100, rarity=0, weapon typeModifier=0.1 → 100 * (1 + 0.1) = 110
      const result = calculateItemPrice({ basePrice: 100, rarity: 0, itemType: 'weapon' }, {}, { typeModifiers: { weapon: { priceModifier: 0.1 } } })
      expect(result.finalPrice).toBe(110)
    })

    it('does not apply type modifier when itemType does not match', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 0, itemType: 'armor' }, {}, { typeModifiers: { weapon: { priceModifier: 0.5 } } })
      expect(result.finalPrice).toBe(100)
    })

    it('applies negative type modifier correctly', () => {
      // base=100, armor typeModifier=-0.05 → 100 * (1 - 0.05) = 95
      const result = calculateItemPrice({ basePrice: 100, rarity: 0, itemType: 'armor' }, {}, { typeModifiers: { armor: { priceModifier: -0.05 } } })
      expect(result.finalPrice).toBe(95)
    })

    it('type modifier stacks with market type modifier', () => {
      // base=100, specialized(+0.25) + weapon typeModifier(+0.1) = 1.35 → 135
      const result = calculateItemPrice(
        { basePrice: 100, rarity: 0, itemType: 'weapon' },
        { marketType: 'specialized' },
        { typeModifiers: { weapon: { priceModifier: 0.1 } } },
      )
      expect(result.finalPrice).toBe(135)
    })

    it('ignores type modifier when itemType is undefined', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, {}, { typeModifiers: { weapon: { priceModifier: 0.5 } } })
      expect(result.finalPrice).toBe(100)
    })

    it('returns same result when typeModifiers is empty object', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 0, itemType: 'weapon' }, {}, { typeModifiers: {} })
      expect(result.finalPrice).toBe(100)
    })
  })

  /* -------------------------------------------- */
  /*  Global price modifier (Phase 9)              */
  /* -------------------------------------------- */

  describe('global price modifier (options.globalModifier)', () => {
    it('applies a positive global modifier', () => {
      // base=100, globalModifier=20 → 100 * (1 + 0.2) = 120
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, {}, { globalModifier: 20 })
      expect(result.finalPrice).toBe(120)
    })

    it('applies a negative global modifier', () => {
      // base=100, globalModifier=-10 → 100 * (1 - 0.1) = 90
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, {}, { globalModifier: -10 })
      expect(result.finalPrice).toBe(90)
    })

    it('global modifier stacks with manualModifier from context', () => {
      // base=100, manualModifier=10, globalModifier=10 → 100 * (1 + 0.2) = 120
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, { manualModifier: 10 }, { globalModifier: 10 })
      expect(result.finalPrice).toBe(120)
    })

    it('global modifier of 0 produces no change', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, {}, { globalModifier: 0 })
      expect(result.finalPrice).toBe(100)
    })

    it('ignores non-finite globalModifier', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, {}, { globalModifier: NaN })
      expect(result.finalPrice).toBe(100)
    })

    it('ignores undefined globalModifier', () => {
      const result = calculateItemPrice({ basePrice: 100, rarity: 0 }, {}, { globalModifier: undefined })
      expect(result.finalPrice).toBe(100)
    })

    it('stacks global modifier, type modifier, and market type modifier', () => {
      // base=100, specialized(+0.25), weapon typeModifier(+0.1), globalModifier(+5=0.05)
      // → 100 * (1 + 0.25 + 0.1 + 0.05) = 140
      const result = calculateItemPrice(
        { basePrice: 100, rarity: 0, itemType: 'weapon' },
        { marketType: 'specialized' },
        { typeModifiers: { weapon: { priceModifier: 0.1 } }, globalModifier: 5 },
      )
      expect(result.finalPrice).toBe(140)
    })
  })
})
