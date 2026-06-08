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

  describe('OFFICIAL_OPTIONS static getter', () => {
    test('exposes a frozen array of 4 official options', () => {
      expect(ObligationBonusCalculator.OFFICIAL_OPTIONS).toHaveLength(4)
    })

    test('contains xp_5 option with xp=5 and obligationCost=5', () => {
      const opt = ObligationBonusCalculator.OFFICIAL_OPTIONS.find((o) => o.key === 'xp_5')
      expect(opt).toBeDefined()
      expect(opt.xp).toBe(5)
      expect(opt.credits).toBe(0)
      expect(opt.obligationCost).toBe(5)
    })

    test('contains xp_10 option with xp=10 and obligationCost=10', () => {
      const opt = ObligationBonusCalculator.OFFICIAL_OPTIONS.find((o) => o.key === 'xp_10')
      expect(opt).toBeDefined()
      expect(opt.xp).toBe(10)
      expect(opt.credits).toBe(0)
      expect(opt.obligationCost).toBe(10)
    })

    test('contains credits_1000 option with credits=1000 and obligationCost=5', () => {
      const opt = ObligationBonusCalculator.OFFICIAL_OPTIONS.find((o) => o.key === 'credits_1000')
      expect(opt).toBeDefined()
      expect(opt.xp).toBe(0)
      expect(opt.credits).toBe(1000)
      expect(opt.obligationCost).toBe(5)
    })

    test('contains credits_2500 option with credits=2500 and obligationCost=10', () => {
      const opt = ObligationBonusCalculator.OFFICIAL_OPTIONS.find((o) => o.key === 'credits_2500')
      expect(opt).toBeDefined()
      expect(opt.xp).toBe(0)
      expect(opt.credits).toBe(2500)
      expect(opt.obligationCost).toBe(10)
    })
  })

  describe('computeCreationSummary', () => {
    describe('empty / no extra obligations', () => {
      test('returns zero totals and isConformant=true for empty array', () => {
        const result = ObligationBonusCalculator.computeCreationSummary([])
        expect(result.totalXp).toBe(0)
        expect(result.totalCredits).toBe(0)
        expect(result.totalObligationConsumed).toBe(0)
        expect(result.recognizedOptions).toHaveLength(0)
        expect(result.errors).toHaveLength(0)
        expect(result.isConformant).toBe(true)
      })

      test('returns isConformant=true when only non-extra obligations are present', () => {
        const obligations = [
          { isExtra: false, extraXp: 0, extraCredits: 0, value: 10 },
          { isExtra: false, extraXp: 0, extraCredits: 0, value: 10 },
        ]
        const result = ObligationBonusCalculator.computeCreationSummary(obligations)
        expect(result.isConformant).toBe(true)
        expect(result.totalXp).toBe(0)
        expect(result.totalCredits).toBe(0)
      })
    })

    describe('official valid options', () => {
      test('+5 XP option (xp=5, credits=0) is recognized as xp_5', () => {
        const obligations = [{ isExtra: true, extraXp: 5, extraCredits: 0, value: 5 }]
        const result = ObligationBonusCalculator.computeCreationSummary(obligations)
        expect(result.isConformant).toBe(true)
        expect(result.totalXp).toBe(5)
        expect(result.totalCredits).toBe(0)
        expect(result.totalObligationConsumed).toBe(5)
        expect(result.recognizedOptions[0].key).toBe('xp_5')
      })

      test('+10 XP option (xp=10, credits=0) is recognized as xp_10', () => {
        const obligations = [{ isExtra: true, extraXp: 10, extraCredits: 0, value: 10 }]
        const result = ObligationBonusCalculator.computeCreationSummary(obligations)
        expect(result.isConformant).toBe(true)
        expect(result.totalXp).toBe(10)
        expect(result.totalCredits).toBe(0)
        expect(result.totalObligationConsumed).toBe(10)
        expect(result.recognizedOptions[0].key).toBe('xp_10')
      })

      test('+1 000 credits option (xp=0, credits=1000) is recognized as credits_1000', () => {
        const obligations = [{ isExtra: true, extraXp: 0, extraCredits: 1000, value: 5 }]
        const result = ObligationBonusCalculator.computeCreationSummary(obligations)
        expect(result.isConformant).toBe(true)
        expect(result.totalXp).toBe(0)
        expect(result.totalCredits).toBe(1000)
        expect(result.totalObligationConsumed).toBe(5)
        expect(result.recognizedOptions[0].key).toBe('credits_1000')
      })

      test('+2 500 credits option (xp=0, credits=2500) is recognized as credits_2500', () => {
        const obligations = [{ isExtra: true, extraXp: 0, extraCredits: 2500, value: 10 }]
        const result = ObligationBonusCalculator.computeCreationSummary(obligations)
        expect(result.isConformant).toBe(true)
        expect(result.totalXp).toBe(0)
        expect(result.totalCredits).toBe(2500)
        expect(result.totalObligationConsumed).toBe(10)
        expect(result.recognizedOptions[0].key).toBe('credits_2500')
      })

      test('combination +5 XP + +1 000 credits (two extra obligations) is conformant', () => {
        const obligations = [
          { isExtra: false, extraXp: 0, extraCredits: 0, value: 10 },
          { isExtra: true, extraXp: 5, extraCredits: 0, value: 5 },
          { isExtra: true, extraXp: 0, extraCredits: 1000, value: 5 },
        ]
        const result = ObligationBonusCalculator.computeCreationSummary(obligations, 10)
        expect(result.isConformant).toBe(true)
        expect(result.totalXp).toBe(5)
        expect(result.totalCredits).toBe(1000)
        expect(result.totalObligationConsumed).toBe(10)
        expect(result.recognizedOptions).toHaveLength(2)
      })
    })

    describe('non-official amounts', () => {
      test('flags an error for a non-official (xp, credits) pair', () => {
        const obligations = [{ isExtra: true, extraXp: 7, extraCredits: 0, value: 5 }]
        const result = ObligationBonusCalculator.computeCreationSummary(obligations)
        expect(result.isConformant).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.totalXp).toBe(0)
        expect(result.recognizedOptions).toHaveLength(0)
      })

      test('flags an error for a non-official credits amount (e.g. 500)', () => {
        const obligations = [{ isExtra: true, extraXp: 0, extraCredits: 500, value: 5 }]
        const result = ObligationBonusCalculator.computeCreationSummary(obligations)
        expect(result.isConformant).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })

    describe('duplicate official options', () => {
      test('flags a duplicate when xp_5 is chosen twice', () => {
        const obligations = [
          { isExtra: true, extraXp: 5, extraCredits: 0, value: 5 },
          { isExtra: true, extraXp: 5, extraCredits: 0, value: 5 },
        ]
        const result = ObligationBonusCalculator.computeCreationSummary(obligations)
        expect(result.isConformant).toBe(false)
        expect(result.errors.some((e) => e.includes('xp_5'))).toBe(true)
        // Only the first one is counted
        expect(result.recognizedOptions).toHaveLength(1)
        expect(result.totalXp).toBe(5)
      })

      test('flags a duplicate when credits_1000 is chosen twice', () => {
        const obligations = [
          { isExtra: true, extraXp: 0, extraCredits: 1000, value: 5 },
          { isExtra: true, extraXp: 0, extraCredits: 1000, value: 5 },
        ]
        const result = ObligationBonusCalculator.computeCreationSummary(obligations)
        expect(result.isConformant).toBe(false)
        expect(result.errors.some((e) => e.includes('credits_1000'))).toBe(true)
        expect(result.recognizedOptions).toHaveLength(1)
        expect(result.totalCredits).toBe(1000)
      })
    })

    describe('obligation cap', () => {
      test('is conformant when totalObligationConsumed equals the cap', () => {
        const obligations = [{ isExtra: true, extraXp: 10, extraCredits: 0, value: 10 }]
        const result = ObligationBonusCalculator.computeCreationSummary(obligations, 10)
        expect(result.isConformant).toBe(true)
        expect(result.totalObligationConsumed).toBe(10)
      })

      test('flags an error when totalObligationConsumed exceeds the cap', () => {
        // Trying to take +10 XP (+10 obligation) on a character with only 5 base obligation
        const obligations = [{ isExtra: true, extraXp: 10, extraCredits: 0, value: 10 }]
        const result = ObligationBonusCalculator.computeCreationSummary(obligations, 5)
        expect(result.isConformant).toBe(false)
        expect(result.errors.some((e) => e.includes('cap'))).toBe(true)
      })

      test('does not flag cap error when no cap is provided (Infinity)', () => {
        // Two full options (10 + 10 obligation) but no cap set
        const obligations = [
          { isExtra: true, extraXp: 10, extraCredits: 0, value: 10 },
          { isExtra: true, extraXp: 0, extraCredits: 2500, value: 10 },
        ]
        const result = ObligationBonusCalculator.computeCreationSummary(obligations)
        // Both are valid options without duplicate keys (xp_10 and credits_2500)
        expect(result.errors.filter((e) => e.includes('cap'))).toHaveLength(0)
        expect(result.totalObligationConsumed).toBe(20)
      })
    })
  })

  describe('buildObligationBonusOptions', () => {
    describe('with no obligations', () => {
      test('returns 4 options all available when no obligations exist', () => {
        const result = ObligationBonusCalculator.buildObligationBonusOptions([], Infinity)
        expect(result).toHaveLength(4)
        expect(result.every((opt) => opt.isAvailable)).toBe(true)
      })

      test('all options have unavailableReason null when all available', () => {
        const result = ObligationBonusCalculator.buildObligationBonusOptions([], Infinity)
        expect(result.every((opt) => opt.unavailableReason === null)).toBe(true)
      })

      test('all options have isAlreadyTaken=false when no obligations exist', () => {
        const result = ObligationBonusCalculator.buildObligationBonusOptions([], Infinity)
        expect(result.every((opt) => opt.isAlreadyTaken === false)).toBe(true)
      })

      test('all options have isExceedsCap=false when remainingCap is Infinity', () => {
        const result = ObligationBonusCalculator.buildObligationBonusOptions([], Infinity)
        expect(result.every((opt) => opt.isExceedsCap === false)).toBe(true)
      })
    })

    describe('with an already-taken option', () => {
      test('marks xp_5 as already taken when it is in obligations', () => {
        const obligations = [{ isExtra: true, extraXp: 5, extraCredits: 0, value: 5 }]
        const result = ObligationBonusCalculator.buildObligationBonusOptions(obligations, Infinity)
        const xp5 = result.find((opt) => opt.key === 'xp_5')
        expect(xp5.isAlreadyTaken).toBe(true)
        expect(xp5.isAvailable).toBe(false)
        expect(xp5.unavailableReason).toBe('already-taken')
      })

      test('marks credits_1000 as already taken and other options still available', () => {
        const obligations = [{ isExtra: true, extraXp: 0, extraCredits: 1000, value: 5 }]
        const result = ObligationBonusCalculator.buildObligationBonusOptions(obligations, Infinity)
        const credits1000 = result.find((opt) => opt.key === 'credits_1000')
        expect(credits1000.isAlreadyTaken).toBe(true)
        const others = result.filter((opt) => opt.key !== 'credits_1000')
        expect(others.every((opt) => opt.isAvailable)).toBe(true)
      })

      test('marks two taken options as unavailable and two others as available', () => {
        const obligations = [
          { isExtra: true, extraXp: 5, extraCredits: 0, value: 5 },
          { isExtra: true, extraXp: 0, extraCredits: 1000, value: 5 },
        ]
        const result = ObligationBonusCalculator.buildObligationBonusOptions(obligations, Infinity)
        const taken = result.filter((opt) => opt.isAlreadyTaken)
        const available = result.filter((opt) => opt.isAvailable)
        expect(taken).toHaveLength(2)
        expect(available).toHaveLength(2)
      })
    })

    describe('with remaining cap constraints', () => {
      test('marks options exceeding remainingCap as isExceedsCap=true', () => {
        // remainingCap = 5 so only options with obligationCost <= 5 are within cap
        const result = ObligationBonusCalculator.buildObligationBonusOptions([], 5)
        const exceedsCap = result.filter((opt) => opt.isExceedsCap)
        // xp_10 (cost=10) and credits_2500 (cost=10) exceed cap=5
        expect(exceedsCap.every((opt) => opt.obligationCost > 5)).toBe(true)
        expect(exceedsCap.every((opt) => opt.unavailableReason === 'exceeds-cap')).toBe(true)
      })

      test('marks options within cap as available', () => {
        const result = ObligationBonusCalculator.buildObligationBonusOptions([], 5)
        const available = result.filter((opt) => opt.isAvailable)
        // xp_5 (cost=5) and credits_1000 (cost=5) are within cap
        expect(available.every((opt) => opt.obligationCost <= 5)).toBe(true)
      })

      test('returns all options as isExceedsCap when remainingCap is 0', () => {
        const result = ObligationBonusCalculator.buildObligationBonusOptions([], 0)
        expect(result.every((opt) => opt.isExceedsCap)).toBe(true)
        expect(result.every((opt) => !opt.isAvailable)).toBe(true)
      })

      test('does not mark taken options as isExceedsCap even when cost would exceed cap', () => {
        // xp_5 is taken; remainingCap=0 — taken takes priority over cap check
        const obligations = [{ isExtra: true, extraXp: 5, extraCredits: 0, value: 5 }]
        const result = ObligationBonusCalculator.buildObligationBonusOptions(obligations, 0)
        const xp5 = result.find((opt) => opt.key === 'xp_5')
        expect(xp5.isAlreadyTaken).toBe(true)
        expect(xp5.isExceedsCap).toBe(false)
        expect(xp5.unavailableReason).toBe('already-taken')
      })
    })

    describe('option shape', () => {
      test('each option has key, xp, credits, obligationCost fields', () => {
        const result = ObligationBonusCalculator.buildObligationBonusOptions([], Infinity)
        for (const opt of result) {
          expect(opt).toHaveProperty('key')
          expect(opt).toHaveProperty('xp')
          expect(opt).toHaveProperty('credits')
          expect(opt).toHaveProperty('obligationCost')
        }
      })

      test('each option has availability annotation fields', () => {
        const result = ObligationBonusCalculator.buildObligationBonusOptions([], Infinity)
        for (const opt of result) {
          expect(opt).toHaveProperty('isAlreadyTaken')
          expect(opt).toHaveProperty('isExceedsCap')
          expect(opt).toHaveProperty('isAvailable')
          expect(opt).toHaveProperty('unavailableReason')
        }
      })

      test('returns options in the same order as OFFICIAL_OPTIONS', () => {
        const result = ObligationBonusCalculator.buildObligationBonusOptions([], Infinity)
        const resultKeys = result.map((opt) => opt.key)
        const officialKeys = ObligationBonusCalculator.OFFICIAL_OPTIONS.map((opt) => opt.key)
        expect(resultKeys).toEqual(officialKeys)
      })
    })

    describe('non-extra obligations are ignored', () => {
      test('non-extra obligations do not affect availability', () => {
        const obligations = [
          { isExtra: false, extraXp: 5, extraCredits: 0, value: 10 },
          { isExtra: false, extraXp: 0, extraCredits: 1000, value: 10 },
        ]
        const result = ObligationBonusCalculator.buildObligationBonusOptions(obligations, Infinity)
        expect(result.every((opt) => opt.isAvailable)).toBe(true)
      })
    })
  })
})
