import { describe, test, expect } from 'vitest'
import {
  SKILL_RANK_COST_MULTIPLIER,
  SKILL_NON_CAREER_SURCHARGE,
  SKILL_MAX_CAREER_FREE_RANK_PER_SKILL,
  SKILL_MAX_SPECIALIZATION_FREE_RANK_PER_SKILL,
  CHARACTERISTIC_RANK_COST_MULTIPLIER,
  CHARACTERISTIC_MAX_RANK_AT_CREATION,
  CHARACTERISTIC_MAX_RANK,
  SPECIALIZATION_FIRST_COST,
  SPECIALIZATION_RANK_COST_MULTIPLIER,
  SPECIALIZATION_NON_CAREER_PENALTY,
  ENCUMBRANCE_BASE_BONUS,
  CAREER_MAX_SKILL_COUNT,
  CAREER_DEFAULT_FREE_SKILL_RANK,
  CAREER_MIN_FREE_SKILL_RANK,
  CAREER_MAX_FREE_SKILL_RANK,
} from '../../module/config/progression.mjs'
import { MAX_RANK_AT_CREATION, MAX_RANK } from '../../module/config/skills.mjs'

describe('Progression config — contractual constants (ADR-0018)', () => {
  /* -------------------------------------------- */
  /*  Skill XP costs                              */
  /* -------------------------------------------- */

  describe('Skill XP cost constants', () => {
    test('SKILL_RANK_COST_MULTIPLIER is 5 (career skill base cost per rank)', () => {
      expect(SKILL_RANK_COST_MULTIPLIER).toBe(5)
    })

    test('SKILL_NON_CAREER_SURCHARGE is 5 (flat penalty for non-career skills)', () => {
      expect(SKILL_NON_CAREER_SURCHARGE).toBe(5)
    })

    test('career rank-1 cost formula yields 5', () => {
      expect(1 * SKILL_RANK_COST_MULTIPLIER).toBe(5)
    })

    test('non-career rank-1 cost formula yields 10', () => {
      expect(1 * SKILL_RANK_COST_MULTIPLIER + SKILL_NON_CAREER_SURCHARGE).toBe(10)
    })

    test('career rank-2 cost formula yields 10', () => {
      expect(2 * SKILL_RANK_COST_MULTIPLIER).toBe(10)
    })

    test('non-career rank-2 cost formula yields 15', () => {
      expect(2 * SKILL_RANK_COST_MULTIPLIER + SKILL_NON_CAREER_SURCHARGE).toBe(15)
    })
  })

  /* -------------------------------------------- */
  /*  Skill free-rank limits                      */
  /* -------------------------------------------- */

  describe('Skill free-rank limit constants', () => {
    test('SKILL_MAX_CAREER_FREE_RANK_PER_SKILL is 1', () => {
      expect(SKILL_MAX_CAREER_FREE_RANK_PER_SKILL).toBe(1)
    })

    test('SKILL_MAX_SPECIALIZATION_FREE_RANK_PER_SKILL is 1', () => {
      expect(SKILL_MAX_SPECIALIZATION_FREE_RANK_PER_SKILL).toBe(1)
    })
  })

  /* -------------------------------------------- */
  /*  Skill rank caps — #395 remains the source   */
  /* -------------------------------------------- */

  describe('Skill rank caps — #395 (skills.mjs) remains the source of truth', () => {
    test('MAX_RANK_AT_CREATION from skills.mjs is 2', () => {
      expect(MAX_RANK_AT_CREATION).toBe(2)
    })

    test('MAX_RANK from skills.mjs is 5', () => {
      expect(MAX_RANK).toBe(5)
    })
  })

  /* -------------------------------------------- */
  /*  Characteristic XP cost                      */
  /* -------------------------------------------- */

  describe('Characteristic XP cost constants', () => {
    test('CHARACTERISTIC_RANK_COST_MULTIPLIER is 10 (XP cost per rank value)', () => {
      expect(CHARACTERISTIC_RANK_COST_MULTIPLIER).toBe(10)
    })

    test('raising characteristic to value 2 costs 20 XP', () => {
      expect(2 * CHARACTERISTIC_RANK_COST_MULTIPLIER).toBe(20)
    })

    test('raising characteristic to value 5 costs 50 XP', () => {
      expect(5 * CHARACTERISTIC_RANK_COST_MULTIPLIER).toBe(50)
    })
  })

  /* -------------------------------------------- */
  /*  Characteristic rank caps                    */
  /* -------------------------------------------- */

  describe('Characteristic rank cap constants', () => {
    test('CHARACTERISTIC_MAX_RANK_AT_CREATION is 5', () => {
      expect(CHARACTERISTIC_MAX_RANK_AT_CREATION).toBe(5)
    })

    test('CHARACTERISTIC_MAX_RANK is 6', () => {
      expect(CHARACTERISTIC_MAX_RANK).toBe(6)
    })

    test('CHARACTERISTIC_MAX_RANK_AT_CREATION is strictly less than CHARACTERISTIC_MAX_RANK', () => {
      expect(CHARACTERISTIC_MAX_RANK_AT_CREATION).toBeLessThan(CHARACTERISTIC_MAX_RANK)
    })
  })

  /* -------------------------------------------- */
  /*  Specialisation XP costs                     */
  /* -------------------------------------------- */

  describe('Specialisation XP cost constants', () => {
    test('SPECIALIZATION_FIRST_COST is 0 (first specialisation is free)', () => {
      expect(SPECIALIZATION_FIRST_COST).toBe(0)
    })

    test('SPECIALIZATION_RANK_COST_MULTIPLIER is 10', () => {
      expect(SPECIALIZATION_RANK_COST_MULTIPLIER).toBe(10)
    })

    test('SPECIALIZATION_NON_CAREER_PENALTY is 10', () => {
      expect(SPECIALIZATION_NON_CAREER_PENALTY).toBe(10)
    })

    test('2nd specialisation base cost formula yields 20 (ownedCountAfter=2)', () => {
      expect(SPECIALIZATION_RANK_COST_MULTIPLIER * 2).toBe(20)
    })

    test('3rd specialisation base cost formula yields 30 (ownedCountAfter=3)', () => {
      expect(SPECIALIZATION_RANK_COST_MULTIPLIER * 3).toBe(30)
    })

    test('2nd non-career specialisation total cost formula yields 30', () => {
      expect(SPECIALIZATION_RANK_COST_MULTIPLIER * 2 + SPECIALIZATION_NON_CAREER_PENALTY).toBe(30)
    })
  })

  /* -------------------------------------------- */
  /*  Actor derived attributes                    */
  /* -------------------------------------------- */

  describe('Actor derived attribute constants', () => {
    test('ENCUMBRANCE_BASE_BONUS is 5', () => {
      expect(ENCUMBRANCE_BASE_BONUS).toBe(5)
    })

    test('encumbrance threshold formula for brawn 2 yields 7', () => {
      expect(2 + ENCUMBRANCE_BASE_BONUS).toBe(7)
    })
  })

  /* -------------------------------------------- */
  /*  Career skill list limits                     */
  /* -------------------------------------------- */

  describe('Career skill list constants (MC4 — ADR-0018)', () => {
    test('CAREER_MAX_SKILL_COUNT is 8 (matches SwerpgCareer schema)', () => {
      expect(CAREER_MAX_SKILL_COUNT).toBe(8)
    })

    test('CAREER_DEFAULT_FREE_SKILL_RANK is 4 (matches SwerpgCareer schema initial)', () => {
      expect(CAREER_DEFAULT_FREE_SKILL_RANK).toBe(4)
    })

    test('CAREER_MIN_FREE_SKILL_RANK is 0 (matches SwerpgCareer schema min)', () => {
      expect(CAREER_MIN_FREE_SKILL_RANK).toBe(0)
    })

    test('CAREER_MAX_FREE_SKILL_RANK is 8 (matches SwerpgCareer schema max)', () => {
      expect(CAREER_MAX_FREE_SKILL_RANK).toBe(8)
    })

    test('CAREER_DEFAULT_FREE_SKILL_RANK is within [CAREER_MIN_FREE_SKILL_RANK, CAREER_MAX_FREE_SKILL_RANK]', () => {
      expect(CAREER_DEFAULT_FREE_SKILL_RANK).toBeGreaterThanOrEqual(CAREER_MIN_FREE_SKILL_RANK)
      expect(CAREER_DEFAULT_FREE_SKILL_RANK).toBeLessThanOrEqual(CAREER_MAX_FREE_SKILL_RANK)
    })

    test('CAREER_MAX_FREE_SKILL_RANK matches CAREER_MAX_SKILL_COUNT (same upper bound)', () => {
      expect(CAREER_MAX_FREE_SKILL_RANK).toBe(CAREER_MAX_SKILL_COUNT)
    })
  })
})
