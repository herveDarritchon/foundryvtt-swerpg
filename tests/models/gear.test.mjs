import { describe, expect, test } from 'vitest'

import SwerpgGear from '../../module/models/gear.mjs'

/**
 * Build a minimal SwerpgGear-compatible data payload.
 * The mock TypeDataModel does Object.assign(this, data), so these properties
 * are directly accessible on the instance as this.price, this.rarity, etc.
 *
 * @param {object} [overrides]
 * @param {number} [overrides.price]
 * @param {number} [overrides.rarity]
 * @param {boolean} [overrides.broken]
 * @returns {object}
 */
function buildGearData({ price = 200, rarity = 1, broken = false } = {}) {
  return { price, rarity, broken }
}

/* -------------------------------------------- */

describe('SwerpgGear — prepareDerivedData', () => {
  test('prepareDerivedData does not produce NaN in price (regression: broken class property shadowing)', () => {
    // Regression: before the fix, a `rarity` class property declaration in SwerpgGear
    // shadowed the DataModel field, leaving this.rarity undefined.
    // _preparePrice() then computed: price * Math.pow(undefined + 1, 3) = NaN.
    const gear = new SwerpgGear(buildGearData({ price: 200, rarity: 1 }))
    gear.prepareDerivedData()

    expect(Number.isFinite(gear.price)).toBe(true)
    expect(gear.price).toBeGreaterThan(0)
  })

  test('prepareDerivedData produces correct price for rarity 1 (200 * (1+1)^3 = 1600)', () => {
    const gear = new SwerpgGear(buildGearData({ price: 200, rarity: 1 }))
    gear.prepareDerivedData()

    // Formula: price * Math.pow(rarity + 1, 3) = 200 * (1+1)^3 = 200 * 8 = 1600
    expect(gear.price).toBe(1600)
  })

  test('prepareDerivedData produces correct price for rarity 0 (100 * (0+1)^3 = 100)', () => {
    const gear = new SwerpgGear(buildGearData({ price: 100, rarity: 0 }))
    gear.prepareDerivedData()

    expect(gear.price).toBe(100)
  })

  test('prepareDerivedData does not throw when called without broken flag', () => {
    // Before the fix, accessing this.defense.base on an undefined property would throw.
    const gear = new SwerpgGear(buildGearData({ price: 50, rarity: 2, broken: false }))
    expect(() => gear.prepareDerivedData()).not.toThrow()
  })

  test('prepareDerivedData does not throw when broken=true', () => {
    // Before the fix, broken=true branch attempted this.defense.base which does not exist in
    // SwerpgGear schema and would throw or produce NaN.
    const gear = new SwerpgGear(buildGearData({ price: 100, rarity: 3, broken: true }))
    expect(() => gear.prepareDerivedData()).not.toThrow()
    expect(Number.isFinite(gear.price)).toBe(true)
  })
})
