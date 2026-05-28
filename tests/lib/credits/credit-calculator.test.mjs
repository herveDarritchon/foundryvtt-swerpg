import { describe, expect, it } from 'vitest'
import { computeCreditBudget, toSafeNumber } from '../../../module/lib/credits/credit-calculator.mjs'

describe('computeCreditBudget', () => {
  it('returns 500 available credits with no items, no bonus', () => {
    const result = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: 0,
      ownedItems: [],
    })
    expect(result.availableCredits).toBe(500)
    expect(result.totalSpent).toBe(0)
    expect(result.isOverBudget).toBe(false)
  })

  it('adds obligation bonus credits to total budget', () => {
    const result = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 1000,
      manualAdjustment: 0,
      ownedItems: [],
    })
    expect(result.totalBudget).toBe(1500)
    expect(result.availableCredits).toBe(1500)
  })

  it('deducts item costs from available credits', () => {
    const result = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: 0,
      ownedItems: [
        { price: 100, quantity: 1 },
        { price: 50, quantity: 2 },
      ],
    })
    expect(result.totalSpent).toBe(200)
    expect(result.availableCredits).toBe(300)
  })

  it('applies manual adjustments — positive', () => {
    const result = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: 50,
      ownedItems: [],
    })
    expect(result.totalBudget).toBe(550)
    expect(result.availableCredits).toBe(550)
  })

  it('applies manual adjustments — negative', () => {
    const result = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: -100,
      ownedItems: [],
    })
    expect(result.totalBudget).toBe(400)
    expect(result.availableCredits).toBe(400)
  })

  it('marks as over budget when available < 0', () => {
    const result = computeCreditBudget({
      startingCredits: 300,
      obligationBonusCredits: 0,
      manualAdjustment: 0,
      ownedItems: [{ price: 500, quantity: 1 }],
    })
    expect(result.availableCredits).toBe(-200)
    expect(result.isOverBudget).toBe(true)
  })

  it('is not over budget when available equals exactly 0', () => {
    const result = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: 0,
      ownedItems: [{ price: 500, quantity: 1 }],
    })
    expect(result.availableCredits).toBe(0)
    expect(result.isOverBudget).toBe(false)
  })

  it('handles empty ownedItems gracefully', () => {
    const result = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: 0,
      ownedItems: [],
    })
    expect(result.totalSpent).toBe(0)
    expect(result.availableCredits).toBe(500)
  })

  it('handles multi-quantity items correctly (price × quantity)', () => {
    const result = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: 0,
      ownedItems: [{ price: 50, quantity: 3 }],
    })
    expect(result.totalSpent).toBe(150)
    expect(result.availableCredits).toBe(350)
  })

  it('exposes all result fields', () => {
    const result = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 1000,
      manualAdjustment: 50,
      ownedItems: [{ price: 100, quantity: 2 }],
    })
    expect(result).toMatchObject({
      startingCredits: 500,
      obligationBonus: 1000,
      manualAdjustment: 50,
      totalBudget: 1550,
      totalSpent: 200,
      availableCredits: 1350,
      isOverBudget: false,
    })
  })

  it('does not mutate input objects', () => {
    const input = {
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: 0,
      ownedItems: [{ price: 100, quantity: 1 }],
    }
    const inputBefore = JSON.stringify(input)
    computeCreditBudget(input)
    expect(JSON.stringify(input)).toBe(inputBefore)
  })

  it('works with default parameters (called with empty object)', () => {
    const result = computeCreditBudget({})
    expect(result.totalBudget).toBe(0)
    expect(result.availableCredits).toBe(0)
    expect(result.isOverBudget).toBe(false)
  })

  it('works when called with no arguments', () => {
    const result = computeCreditBudget()
    expect(result.totalBudget).toBe(0)
    expect(result.availableCredits).toBe(0)
    expect(result.isOverBudget).toBe(false)
  })

  // --- Defensive / NaN-safety tests ---

  it('treats NaN price as 0 — totalSpent ignores the malformed item', () => {
    const result = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: 0,
      ownedItems: [
        { price: NaN, quantity: 1 },
        { price: 100, quantity: 1 },
      ],
    })
    expect(result.totalSpent).toBe(100)
    expect(result.availableCredits).toBe(400)
    expect(Number.isFinite(result.availableCredits)).toBe(true)
  })

  it('treats NaN quantity as 1 — falls back to single unit cost', () => {
    const result = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: 0,
      ownedItems: [{ price: 200, quantity: NaN }],
    })
    expect(result.totalSpent).toBe(200)
    expect(result.availableCredits).toBe(300)
  })

  it('treats undefined price and quantity as 0 and 1 respectively', () => {
    const result = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: 0,
      ownedItems: [{ price: undefined, quantity: undefined }],
    })
    expect(result.totalSpent).toBe(0)
    expect(result.availableCredits).toBe(500)
  })

  it('treats negative price as 0 — no negative cost contribution', () => {
    const result = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: 0,
      ownedItems: [{ price: -100, quantity: 1 }],
    })
    expect(result.totalSpent).toBe(0)
    expect(result.availableCredits).toBe(500)
  })

  it('skips null and undefined entries in ownedItems array', () => {
    const result = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: 0,
      ownedItems: [null, undefined, { price: 100, quantity: 1 }],
    })
    expect(result.totalSpent).toBe(100)
    expect(result.availableCredits).toBe(400)
  })

  it('treats Infinity price as 0 — no infinite cost contribution', () => {
    const result = computeCreditBudget({
      startingCredits: 500,
      obligationBonusCredits: 0,
      manualAdjustment: 0,
      ownedItems: [{ price: Infinity, quantity: 1 }],
    })
    expect(result.totalSpent).toBe(0)
    expect(result.availableCredits).toBe(500)
  })

  it('never returns NaN in any output field regardless of malformed inputs (fuzz)', () => {
    const badInputs = [
      { startingCredits: NaN, obligationBonusCredits: NaN, manualAdjustment: NaN, ownedItems: [{ price: NaN, quantity: NaN }] },
      { startingCredits: undefined, obligationBonusCredits: undefined, manualAdjustment: undefined, ownedItems: [{ price: undefined, quantity: undefined }] },
      { startingCredits: 'abc', obligationBonusCredits: 'xyz', manualAdjustment: 'bad', ownedItems: [{ price: 'bad', quantity: 'bad' }] },
      { startingCredits: Infinity, obligationBonusCredits: -Infinity, manualAdjustment: NaN, ownedItems: [{}] },
      { startingCredits: 500, obligationBonusCredits: 0, manualAdjustment: 0, ownedItems: [null, undefined, {}] },
    ]

    for (const input of badInputs) {
      const result = computeCreditBudget(input)
      expect(Number.isFinite(result.startingCredits), `startingCredits finite for ${JSON.stringify(input)}`).toBe(true)
      expect(Number.isFinite(result.obligationBonus), `obligationBonus finite for ${JSON.stringify(input)}`).toBe(true)
      expect(Number.isFinite(result.manualAdjustment), `manualAdjustment finite for ${JSON.stringify(input)}`).toBe(true)
      expect(Number.isFinite(result.totalBudget), `totalBudget finite for ${JSON.stringify(input)}`).toBe(true)
      expect(Number.isFinite(result.totalSpent), `totalSpent finite for ${JSON.stringify(input)}`).toBe(true)
      expect(Number.isFinite(result.availableCredits), `availableCredits finite for ${JSON.stringify(input)}`).toBe(true)
      expect(typeof result.isOverBudget).toBe('boolean')
    }
  })
})

describe('toSafeNumber', () => {
  it('returns the value for a normal positive number', () => {
    expect(toSafeNumber(42)).toBe(42)
  })

  it('returns the value for zero', () => {
    expect(toSafeNumber(0)).toBe(0)
  })

  it('returns fallback for NaN', () => {
    expect(toSafeNumber(NaN)).toBe(0)
  })

  it('returns fallback for Infinity', () => {
    expect(toSafeNumber(Infinity)).toBe(0)
  })

  it('returns fallback for negative numbers', () => {
    expect(toSafeNumber(-5)).toBe(0)
  })

  it('returns fallback for null', () => {
    expect(toSafeNumber(null)).toBe(0)
  })

  it('returns fallback for undefined', () => {
    expect(toSafeNumber(undefined)).toBe(0)
  })

  it('returns fallback for non-numeric strings', () => {
    expect(toSafeNumber('abc')).toBe(0)
  })

  it('uses the provided custom fallback', () => {
    expect(toSafeNumber(NaN, 1)).toBe(1)
  })
})
