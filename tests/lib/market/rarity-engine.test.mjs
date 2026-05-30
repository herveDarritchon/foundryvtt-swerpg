import { describe, expect, it } from 'vitest'

import {
  evaluateObtainability,
  RARITY_OBTAINABILITY_BANDS,
  BLACK_MARKET_PROBABILITY_PENALTY,
  BLACK_MARKET_EXTRA_DELAY_DAYS,
  BLACK_MARKET_TYPE_KEY,
} from '../../../module/lib/market/rarity-engine.mjs'

/* -------------------------------------------- */
/*  evaluateObtainability                       */
/* -------------------------------------------- */

describe('evaluateObtainability', () => {
  /* -------------------------------------------- */
  /*  Rarity 0–3: immediate                       */
  /* -------------------------------------------- */

  describe('rarity 0–3 (standard market)', () => {
    it('rarity 0 → immediate=true, probability=100, delayInDays=0', () => {
      const result = evaluateObtainability({ rarity: 0 })
      expect(result.immediate).toBe(true)
      expect(result.probability).toBe(100)
      expect(result.delayInDays).toBe(0)
    })

    it('rarity 3 → immediate=true', () => {
      const result = evaluateObtainability({ rarity: 3 })
      expect(result.immediate).toBe(true)
    })
  })

  /* -------------------------------------------- */
  /*  Rarity 4–7: probable, some delay            */
  /* -------------------------------------------- */

  describe('rarity 4–7 (standard market)', () => {
    it('rarity 4 → probability=80, delay=1', () => {
      const result = evaluateObtainability({ rarity: 4 })
      expect(result.probability).toBe(80)
      expect(result.delayInDays).toBe(1)
      expect(result.immediate).toBe(false)
    })

    it('rarity 6 → probability=60, delay=2', () => {
      const result = evaluateObtainability({ rarity: 6 })
      expect(result.probability).toBe(60)
      expect(result.delayInDays).toBe(2)
    })
  })

  /* -------------------------------------------- */
  /*  Rarity 8–10: low probability, long delay    */
  /* -------------------------------------------- */

  describe('rarity 8–10 (standard market)', () => {
    it('rarity 8 → probability=40, delay=5', () => {
      const result = evaluateObtainability({ rarity: 8 })
      expect(result.probability).toBe(40)
      expect(result.delayInDays).toBe(5)
    })

    it('rarity 10 → probability=20, delay=7', () => {
      const result = evaluateObtainability({ rarity: 10 })
      expect(result.probability).toBe(20)
      expect(result.delayInDays).toBe(7)
      expect(result.immediate).toBe(false)
    })
  })

  /* -------------------------------------------- */
  /*  Black-market penalties                      */
  /* -------------------------------------------- */

  describe('black-market market type', () => {
    it('rarity 0 with black-market → probability=100-penalty', () => {
      const result = evaluateObtainability({ rarity: 0, marketType: BLACK_MARKET_TYPE_KEY })
      expect(result.probability).toBe(100 - BLACK_MARKET_PROBABILITY_PENALTY)
    })

    it('rarity 0 with black-market → delayInDays=0+extra', () => {
      const result = evaluateObtainability({ rarity: 0, marketType: BLACK_MARKET_TYPE_KEY })
      expect(result.delayInDays).toBe(0 + BLACK_MARKET_EXTRA_DELAY_DAYS)
    })

    it('rarity 0 with black-market → immediate=false (80% < 100%)', () => {
      const result = evaluateObtainability({ rarity: 0, marketType: BLACK_MARKET_TYPE_KEY })
      expect(result.immediate).toBe(false)
    })

    it('rarity 10 with black-market → probability=max(0, 20-20)=0', () => {
      const result = evaluateObtainability({ rarity: 10, marketType: BLACK_MARKET_TYPE_KEY })
      expect(result.probability).toBe(0)
    })

    it('probability never goes below 0', () => {
      const result = evaluateObtainability({ rarity: 10, marketType: BLACK_MARKET_TYPE_KEY })
      expect(result.probability).toBeGreaterThanOrEqual(0)
    })
  })

  /* -------------------------------------------- */
  /*  Rarity clamping                             */
  /* -------------------------------------------- */

  describe('rarity clamping', () => {
    it('clamps rarity above 10 to 10 behavior', () => {
      const result = evaluateObtainability({ rarity: 15 })
      const expected = evaluateObtainability({ rarity: 10 })
      expect(result.probability).toBe(expected.probability)
      expect(result.delayInDays).toBe(expected.delayInDays)
    })

    it('clamps rarity below 0 to 0 behavior', () => {
      const result = evaluateObtainability({ rarity: -5 })
      const expected = evaluateObtainability({ rarity: 0 })
      expect(result.probability).toBe(expected.probability)
    })
  })

  /* -------------------------------------------- */
  /*  narrativeReasonKey is always present        */
  /* -------------------------------------------- */

  describe('narrativeReasonKey', () => {
    it('returns a non-empty narrativeReasonKey for all bands', () => {
      for (const band of RARITY_OBTAINABILITY_BANDS) {
        const result = evaluateObtainability({ rarity: band.minRarity })
        expect(typeof result.narrativeReasonKey).toBe('string')
        expect(result.narrativeReasonKey.length).toBeGreaterThan(0)
      }
    })
  })

  /* -------------------------------------------- */
  /*  Default market type                        */
  /* -------------------------------------------- */

  describe('default market type', () => {
    it('uses standard market behavior when marketType is omitted', () => {
      const withDefault = evaluateObtainability({ rarity: 5 })
      const withExplicit = evaluateObtainability({ rarity: 5, marketType: 'standard' })
      expect(withDefault).toEqual(withExplicit)
    })
  })
})
