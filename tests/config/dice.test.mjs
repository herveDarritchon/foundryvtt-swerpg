import { describe, test, expect } from 'vitest'
import {
  CRITICAL_SUCCESS_THRESHOLD,
  CRITICAL_FAILURE_THRESHOLD,
  CRITICAL_SUCCESS_THRESHOLD_KEEN,
  CRITICAL_FAILURE_THRESHOLD_RELIABLE,
  MAX_BOONS,
  MAX_BANES,
  DIE_STEP,
  MIN_DIE,
  MAX_DIE,
  passiveCheck,
} from '../../module/config/dice.mjs'
import { SYSTEM } from '../../module/config/system.mjs'

describe('Dice config — contractual constants (ADR-0018)', () => {
  /* -------------------------------------------- */
  /*  Die pool constants                           */
  /* -------------------------------------------- */

  describe('Die pool constants', () => {
    test('MAX_BOONS is 6', () => {
      expect(MAX_BOONS).toBe(6)
    })

    test('MAX_BANES is 6', () => {
      expect(MAX_BANES).toBe(6)
    })

    test('DIE_STEP is 2', () => {
      expect(DIE_STEP).toBe(2)
    })

    test('MIN_DIE is 4', () => {
      expect(MIN_DIE).toBe(4)
    })

    test('MAX_DIE is 12', () => {
      expect(MAX_DIE).toBe(12)
    })

    test('passiveCheck is 10', () => {
      expect(passiveCheck).toBe(10)
    })
  })

  /* -------------------------------------------- */
  /*  Critical success/failure thresholds          */
  /* -------------------------------------------- */

  describe('Critical resolution thresholds', () => {
    test('CRITICAL_SUCCESS_THRESHOLD is 6 (standard default margin above DC)', () => {
      expect(CRITICAL_SUCCESS_THRESHOLD).toBe(6)
    })

    test('CRITICAL_FAILURE_THRESHOLD is 6 (standard default margin below DC)', () => {
      expect(CRITICAL_FAILURE_THRESHOLD).toBe(6)
    })

    test('CRITICAL_SUCCESS_THRESHOLD_KEEN is 4 (keen weapon override)', () => {
      expect(CRITICAL_SUCCESS_THRESHOLD_KEEN).toBe(4)
    })

    test('CRITICAL_FAILURE_THRESHOLD_RELIABLE is 4 (reliable weapon override)', () => {
      expect(CRITICAL_FAILURE_THRESHOLD_RELIABLE).toBe(4)
    })

    test('keen threshold is strictly smaller than default (wider critical window)', () => {
      expect(CRITICAL_SUCCESS_THRESHOLD_KEEN).toBeLessThan(CRITICAL_SUCCESS_THRESHOLD)
    })

    test('reliable threshold is strictly smaller than default (narrower fumble window)', () => {
      expect(CRITICAL_FAILURE_THRESHOLD_RELIABLE).toBeLessThan(CRITICAL_FAILURE_THRESHOLD)
    })
  })

  /* -------------------------------------------- */
  /*  SYSTEM.dice exposure (ADR-0018)             */
  /* -------------------------------------------- */

  describe('SYSTEM.dice exposure', () => {
    test('SYSTEM.dice.MAX_BOONS equals MAX_BOONS', () => {
      expect(SYSTEM.dice.MAX_BOONS).toBe(MAX_BOONS)
    })

    test('SYSTEM.dice.MAX_BANES equals MAX_BANES', () => {
      expect(SYSTEM.dice.MAX_BANES).toBe(MAX_BANES)
    })

    test('SYSTEM.dice.DIE_STEP equals DIE_STEP', () => {
      expect(SYSTEM.dice.DIE_STEP).toBe(DIE_STEP)
    })

    test('SYSTEM.dice.MIN_DIE equals MIN_DIE', () => {
      expect(SYSTEM.dice.MIN_DIE).toBe(MIN_DIE)
    })

    test('SYSTEM.dice.MAX_DIE equals MAX_DIE', () => {
      expect(SYSTEM.dice.MAX_DIE).toBe(MAX_DIE)
    })

    test('SYSTEM.dice.passiveCheck equals passiveCheck', () => {
      expect(SYSTEM.dice.passiveCheck).toBe(passiveCheck)
    })

    test('SYSTEM.dice.CRITICAL_SUCCESS_THRESHOLD equals CRITICAL_SUCCESS_THRESHOLD', () => {
      expect(SYSTEM.dice.CRITICAL_SUCCESS_THRESHOLD).toBe(CRITICAL_SUCCESS_THRESHOLD)
    })

    test('SYSTEM.dice.CRITICAL_FAILURE_THRESHOLD equals CRITICAL_FAILURE_THRESHOLD', () => {
      expect(SYSTEM.dice.CRITICAL_FAILURE_THRESHOLD).toBe(CRITICAL_FAILURE_THRESHOLD)
    })

    test('SYSTEM.dice.CRITICAL_SUCCESS_THRESHOLD_KEEN equals CRITICAL_SUCCESS_THRESHOLD_KEEN', () => {
      expect(SYSTEM.dice.CRITICAL_SUCCESS_THRESHOLD_KEEN).toBe(CRITICAL_SUCCESS_THRESHOLD_KEEN)
    })

    test('SYSTEM.dice.CRITICAL_FAILURE_THRESHOLD_RELIABLE equals CRITICAL_FAILURE_THRESHOLD_RELIABLE', () => {
      expect(SYSTEM.dice.CRITICAL_FAILURE_THRESHOLD_RELIABLE).toBe(CRITICAL_FAILURE_THRESHOLD_RELIABLE)
    })
  })
})
