import { describe, expect, it } from 'vitest'
import { computeObligationBonusCredits, computeObligationBonusXp } from '../../../module/lib/credits/obligation-bonus-calculator.mjs'

describe('computeObligationBonusCredits (credits lib re-export)', () => {
  it('returns 0 for empty obligations array', () => {
    expect(computeObligationBonusCredits([])).toBe(0)
  })

  it('returns 0 when no obligations are marked as extra', () => {
    const obligations = [
      { isExtra: false, extraCredits: 1000, extraXp: 0 },
      { isExtra: false, extraCredits: 500, extraXp: 5 },
    ]
    expect(computeObligationBonusCredits(obligations)).toBe(0)
  })

  it('sums extraCredits only for isExtra=true obligations', () => {
    const obligations = [
      { isExtra: true, extraCredits: 1000, extraXp: 0 },
      { isExtra: false, extraCredits: 500, extraXp: 5 },
      { isExtra: true, extraCredits: 2500, extraXp: 10 },
    ]
    expect(computeObligationBonusCredits(obligations)).toBe(3500)
  })

  it('handles a single extra obligation', () => {
    expect(computeObligationBonusCredits([{ isExtra: true, extraCredits: 1000, extraXp: 5 }])).toBe(1000)
  })

  it('returns 0 for extra obligation with extraCredits missing (falsy)', () => {
    expect(computeObligationBonusCredits([{ isExtra: true, extraXp: 5 }])).toBe(0)
  })
})

describe('computeObligationBonusXp (credits lib re-export)', () => {
  it('returns 0 for empty obligations array', () => {
    expect(computeObligationBonusXp([])).toBe(0)
  })

  it('returns 0 when no obligations are marked as extra', () => {
    const obligations = [
      { isExtra: false, extraCredits: 1000, extraXp: 0 },
      { isExtra: false, extraCredits: 500, extraXp: 5 },
    ]
    expect(computeObligationBonusXp(obligations)).toBe(0)
  })

  it('sums extraXp only for isExtra=true obligations', () => {
    const obligations = [
      { isExtra: true, extraCredits: 1000, extraXp: 5 },
      { isExtra: false, extraCredits: 500, extraXp: 10 },
      { isExtra: true, extraCredits: 2500, extraXp: 15 },
    ]
    expect(computeObligationBonusXp(obligations)).toBe(20)
  })

  it('handles a single extra obligation', () => {
    expect(computeObligationBonusXp([{ isExtra: true, extraCredits: 1000, extraXp: 5 }])).toBe(5)
  })

  it('returns 0 for extra obligation with extraXp missing (falsy)', () => {
    expect(computeObligationBonusXp([{ isExtra: true, extraCredits: 1000 }])).toBe(0)
  })
})
