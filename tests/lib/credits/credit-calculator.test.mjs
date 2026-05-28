import { describe, expect, it } from 'vitest'
import { computeCreditBudget } from '../../../module/lib/credits/credit-calculator.mjs'

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
})
