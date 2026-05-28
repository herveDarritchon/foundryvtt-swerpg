import { describe, expect, test } from 'vitest'
import ObligationBonusCalculator from '../../../module/lib/obligations/obligation-bonus-calculator.mjs'

describe('ObligationBonusCalculator', () => {
  describe('computeObligationBonusCredits', () => {
    test('should return 0 for empty obligations array', () => {
      expect(ObligationBonusCalculator.computeObligationBonusCredits([])).toBe(0)
    })

    test('should return 0 when no obligations marked as extra', () => {
      const obligations = [
        { isExtra: false, extraCredits: 1000, extraXp: 0 },
        { isExtra: false, extraCredits: 500, extraXp: 5 },
      ]
      expect(ObligationBonusCalculator.computeObligationBonusCredits(obligations)).toBe(0)
    })

    test('should sum extraCredits only for isExtra=true obligations', () => {
      const obligations = [
        { isExtra: true, extraCredits: 1000, extraXp: 0 },
        { isExtra: false, extraCredits: 500, extraXp: 5 },
        { isExtra: true, extraCredits: 2500, extraXp: 10 },
      ]
      expect(ObligationBonusCalculator.computeObligationBonusCredits(obligations)).toBe(3500)
    })

    test('should handle single extra obligation', () => {
      const obligations = [{ isExtra: true, extraCredits: 1000, extraXp: 5 }]
      expect(ObligationBonusCalculator.computeObligationBonusCredits(obligations)).toBe(1000)
    })

    test('should handle obligation with isExtra=true and extraCredits=0', () => {
      const obligations = [{ isExtra: true, extraCredits: 0, extraXp: 5 }]
      expect(ObligationBonusCalculator.computeObligationBonusCredits(obligations)).toBe(0)
    })

    test('should handle obligation with missing extraCredits (falsy)', () => {
      const obligations = [{ isExtra: true, extraXp: 5 }]
      expect(ObligationBonusCalculator.computeObligationBonusCredits(obligations)).toBe(0)
    })
  })

  describe('computeObligationBonusXp', () => {
    test('should return 0 for empty obligations array', () => {
      expect(ObligationBonusCalculator.computeObligationBonusXp([])).toBe(0)
    })

    test('should return 0 when no obligations marked as extra', () => {
      const obligations = [
        { isExtra: false, extraCredits: 1000, extraXp: 0 },
        { isExtra: false, extraCredits: 500, extraXp: 5 },
      ]
      expect(ObligationBonusCalculator.computeObligationBonusXp(obligations)).toBe(0)
    })

    test('should sum extraXp only for isExtra=true obligations', () => {
      const obligations = [
        { isExtra: true, extraCredits: 1000, extraXp: 5 },
        { isExtra: false, extraCredits: 500, extraXp: 10 },
        { isExtra: true, extraCredits: 2500, extraXp: 15 },
      ]
      expect(ObligationBonusCalculator.computeObligationBonusXp(obligations)).toBe(20)
    })

    test('should handle single extra obligation', () => {
      const obligations = [{ isExtra: true, extraCredits: 1000, extraXp: 5 }]
      expect(ObligationBonusCalculator.computeObligationBonusXp(obligations)).toBe(5)
    })

    test('should handle obligation with missing extraXp (falsy)', () => {
      const obligations = [{ isExtra: true, extraCredits: 1000 }]
      expect(ObligationBonusCalculator.computeObligationBonusXp(obligations)).toBe(0)
    })
  })

  describe('STARTING_CREDITS static getter', () => {
    test('should expose STARTING_CREDITS as 500', () => {
      expect(ObligationBonusCalculator.STARTING_CREDITS).toBe(500)
    })
  })
})
