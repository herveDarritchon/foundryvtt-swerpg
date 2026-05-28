import { describe, test, expect } from 'vitest'
import { computeMarketPrice } from '../../../module/lib/market/pricing.mjs'

describe('computeMarketPrice', () => {
  describe('nominal case', () => {
    test('returns base price unchanged when availability=available and rarity=0 and no gmModifier', () => {
      const result = computeMarketPrice({ basePrice: 100, rarity: 0, availability: 'available' })
      expect(result.finalPrice).toBe(100)
      expect(result.basePrice).toBe(100)
    })

    test('returns correct breakdown for nominal case (no modifiers)', () => {
      const result = computeMarketPrice({ basePrice: 100, rarity: 0, availability: 'available' })
      expect(result.breakdown).toEqual([])
    })

    test('returns finalPrice as an integer', () => {
      const result = computeMarketPrice({ basePrice: 100, rarity: 3, availability: 'available' })
      expect(Number.isInteger(result.finalPrice)).toBe(true)
    })
  })

  describe('rarity modifier', () => {
    test('applies 10% per rarity point', () => {
      const result = computeMarketPrice({ basePrice: 100, rarity: 5, availability: 'available' })
      // 100 * (1 + 0 + 0.5 + 0) = 150
      expect(result.finalPrice).toBe(150)
    })

    test('rarity=10 doubles base price (1 + 1.0 = 2.0)', () => {
      const result = computeMarketPrice({ basePrice: 200, rarity: 10, availability: 'available' })
      expect(result.finalPrice).toBe(400)
    })

    test('adds rarity breakdown step when rarity > 0', () => {
      const result = computeMarketPrice({ basePrice: 100, rarity: 3, availability: 'available' })
      const rarityStep = result.breakdown.find((s) => s.label === 'rarity')
      expect(rarityStep).toBeDefined()
      expect(rarityStep.modifier).toBeCloseTo(0.3)
    })

    test('does not add rarity breakdown step when rarity = 0', () => {
      const result = computeMarketPrice({ basePrice: 100, rarity: 0, availability: 'available' })
      const rarityStep = result.breakdown.find((s) => s.label === 'rarity')
      expect(rarityStep).toBeUndefined()
    })
  })

  describe('availability modifier', () => {
    test('adds 25% for rare availability', () => {
      const result = computeMarketPrice({ basePrice: 100, rarity: 0, availability: 'rare' })
      // 100 * (1 + 0.25) = 125
      expect(result.finalPrice).toBe(125)
    })

    test('adds 50% for veryRare availability', () => {
      const result = computeMarketPrice({ basePrice: 100, rarity: 0, availability: 'veryRare' })
      expect(result.finalPrice).toBe(150)
    })

    test('adds 100% for restricted availability', () => {
      const result = computeMarketPrice({ basePrice: 100, rarity: 0, availability: 'restricted' })
      expect(result.finalPrice).toBe(200)
    })

    test('adds 150% for blackMarket availability', () => {
      const result = computeMarketPrice({ basePrice: 100, rarity: 0, availability: 'blackMarket' })
      expect(result.finalPrice).toBe(250)
    })

    test('unknown availability treated as 0 modifier', () => {
      const result = computeMarketPrice({ basePrice: 100, rarity: 0, availability: 'custom-future' })
      expect(result.finalPrice).toBe(100)
    })

    test('unavailable (priceModifier=null) treated as 0 modifier', () => {
      // null priceModifier falls back to 0 in formula
      const result = computeMarketPrice({ basePrice: 100, rarity: 0, availability: 'unavailable' })
      expect(result.finalPrice).toBe(100)
    })

    test('adds availability breakdown step when modifier != 0', () => {
      const result = computeMarketPrice({ basePrice: 100, rarity: 0, availability: 'rare' })
      const step = result.breakdown.find((s) => s.label === 'availability')
      expect(step).toBeDefined()
      expect(step.modifier).toBe(0.25)
    })
  })

  describe('gmModifier', () => {
    test('+50 GM modifier adds 50% to base price', () => {
      const result = computeMarketPrice({ basePrice: 100, rarity: 0, availability: 'available', gmModifier: 50 })
      expect(result.finalPrice).toBe(150)
    })

    test('-50 GM modifier reduces price by 50%', () => {
      const result = computeMarketPrice({ basePrice: 100, rarity: 0, availability: 'available', gmModifier: -50 })
      expect(result.finalPrice).toBe(50)
    })

    test('-100 GM modifier results in 0 (not negative)', () => {
      const result = computeMarketPrice({ basePrice: 100, rarity: 0, availability: 'available', gmModifier: -100 })
      expect(result.finalPrice).toBe(0)
    })

    test('adds gmModifier breakdown step when modifier != 0', () => {
      const result = computeMarketPrice({ basePrice: 100, rarity: 0, availability: 'available', gmModifier: 25 })
      const step = result.breakdown.find((s) => s.label === 'gmModifier')
      expect(step).toBeDefined()
      expect(step.modifier).toBeCloseTo(0.25)
    })

    test('no gmModifier defaults to 0', () => {
      const result = computeMarketPrice({ basePrice: 100, rarity: 0, availability: 'available' })
      const step = result.breakdown.find((s) => s.label === 'gmModifier')
      expect(step).toBeUndefined()
    })
  })

  describe('price floor at 0', () => {
    test('finalPrice is never negative', () => {
      const result = computeMarketPrice({ basePrice: 100, rarity: 0, availability: 'available', gmModifier: -200 })
      expect(result.finalPrice).toBeGreaterThanOrEqual(0)
    })

    test('basePrice=0 stays at 0 regardless of modifiers', () => {
      const result = computeMarketPrice({ basePrice: 0, rarity: 10, availability: 'blackMarket', gmModifier: 100 })
      expect(result.finalPrice).toBe(0)
    })
  })

  describe('integer rounding', () => {
    test('rounds down to nearest integer', () => {
      // 100 * (1 + 0.25 + 0.1) = 135, exact
      const result = computeMarketPrice({ basePrice: 100, rarity: 1, availability: 'rare' })
      expect(result.finalPrice).toBe(135)
    })

    test('floors partial result', () => {
      // 10 * (1 + 0.25) = 12.5 → floor = 12
      const result = computeMarketPrice({ basePrice: 10, rarity: 0, availability: 'rare' })
      expect(result.finalPrice).toBe(12)
    })
  })

  describe('combined modifiers', () => {
    test('combines availability + rarity + gmModifier correctly', () => {
      // base=100, rarity=2 (0.2), availability=rare (0.25), gmModifier=10 (0.1)
      // 100 * (1 + 0.25 + 0.2 + 0.1) = 100 * 1.55 = 155
      const result = computeMarketPrice({ basePrice: 100, rarity: 2, availability: 'rare', gmModifier: 10 })
      expect(result.finalPrice).toBe(155)
      expect(result.breakdown).toHaveLength(3)
    })
  })

  describe('validation', () => {
    test('throws TypeError for negative basePrice', () => {
      expect(() => computeMarketPrice({ basePrice: -1, rarity: 0, availability: 'available' })).toThrow(TypeError)
    })

    test('throws TypeError for NaN basePrice', () => {
      expect(() => computeMarketPrice({ basePrice: NaN, rarity: 0, availability: 'available' })).toThrow(TypeError)
    })

    test('throws TypeError for non-finite basePrice', () => {
      expect(() => computeMarketPrice({ basePrice: Infinity, rarity: 0, availability: 'available' })).toThrow(TypeError)
    })

    test('throws TypeError for NaN rarity', () => {
      expect(() => computeMarketPrice({ basePrice: 100, rarity: NaN, availability: 'available' })).toThrow(TypeError)
    })
  })
})
