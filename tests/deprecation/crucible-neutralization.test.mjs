// crucible-neutralization.test.mjs
import '../setupTests.js'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { SYSTEM } from '../../module/config/system.mjs'
import { logger } from '../../module/utils/logger.mjs'
import TalentCostCalculator from '../../module/lib/talents/talent-cost-calculator.mjs'
import TalentFactory from '../../module/lib/talents/talent-factory.mjs'
import { createActor } from '../utils/actors/actor.mjs'
import { createTalentData } from '../utils/talents/talent.mjs'
import TrainedTalent from '../../module/lib/talents/trained-talent.mjs'

/**
 * Helper to reset deprecation flags to defaults before each test.
 */
function resetFlags() {
  const flags = SYSTEM.DEPRECATION.crucible
  for (const key of Object.keys(flags)) {
    flags[key].enabled = true
    flags[key].warn = true
  }
}

describe('Crucible deprecation flags', () => {
  beforeEach(() => {
    resetFlags()
    vi.spyOn(logger, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /* ------------------------------------------------------------------ */
  /*  1. rankTimes5                                                      */
  /* ------------------------------------------------------------------ */

  describe('rankTimes5 (talent-cost-calculator)', () => {
    test('emits deprecation warning when warn=true', () => {
      const actor = createActor()
      const data = createTalentData('1', { row: 1 })
      const talent = new TrainedTalent(actor, data, { action: 'train', isCreation: true }, {})
      const calculator = new TalentCostCalculator(talent)

      calculator.calculateCost('train', 1)

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[DEPRECATED] [talent-cost-calculator]'),
      )
    })

    test('returns 0 when enabled=false', () => {
      SYSTEM.DEPRECATION.crucible.rankTimes5.enabled = false
      const actor = createActor()
      const data = createTalentData('1', { row: 2 })
      const talent = new TrainedTalent(actor, data, { action: 'train', isCreation: true }, {})
      const calculator = new TalentCostCalculator(talent)

      const cost = calculator.calculateCost('train', 2)

      expect(cost).toBe(0)
    })

    test('returns rank*5 when enabled=true', () => {
      SYSTEM.DEPRECATION.crucible.rankTimes5.warn = false
      const actor = createActor()
      const data = createTalentData('1', { row: 3 })
      const talent = new TrainedTalent(actor, data, { action: 'train', isCreation: true }, {})
      const calculator = new TalentCostCalculator(talent)

      const cost = calculator.calculateCost('train', 3)

      expect(cost).toBe(15)
    })

    test('does not emit warning when warn=false', () => {
      SYSTEM.DEPRECATION.crucible.rankTimes5.warn = false
      const actor = createActor()
      const data = createTalentData('1', { row: 1 })
      const talent = new TrainedTalent(actor, data, { action: 'train', isCreation: true }, {})
      const calculator = new TalentCostCalculator(talent)

      calculator.calculateCost('train', 1)

      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('[DEPRECATED]'),
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /*  2. isCreation                                                      */
  /* ------------------------------------------------------------------ */

  describe('isCreation (talent-factory)', () => {
    test('emits deprecation warning when warn=true', () => {
      const actor = createActor()
      const item = createTalentData('1')

      TalentFactory.build(actor, item, { action: 'train', isCreation: true }, {})

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[DEPRECATED] [talent-factory]'),
      )
    })

    test('returns ErrorTalent when enabled=false', () => {
      SYSTEM.DEPRECATION.crucible.isCreation.enabled = false
      const actor = createActor()
      const item = createTalentData('1')

      const result = TalentFactory.build(actor, item, { action: 'train', isCreation: true }, {})

      expect(result.options.message).toContain('disabled')
    })

    test('does not emit warning when warn=false', () => {
      SYSTEM.DEPRECATION.crucible.isCreation.warn = false
      const actor = createActor()
      const item = createTalentData('1')

      TalentFactory.build(actor, item, { action: 'train', isCreation: true }, {})

      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('[DEPRECATED]'),
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /*  3. Structure des flags                                             */
  /* ------------------------------------------------------------------ */

  describe('flag structure', () => {
    test('all 6 crucible flags exist with enabled and warn', () => {
      const flags = SYSTEM.DEPRECATION.crucible
      const expected = ['rankTimes5', 'isCreation', 'talentPoints', 'globalTree', 'choiceWheel', 'directPurchase']

      for (const key of expected) {
        expect(flags).toHaveProperty(key)
        expect(flags[key]).toHaveProperty('enabled')
        expect(flags[key]).toHaveProperty('warn')
        expect(typeof flags[key].enabled).toBe('boolean')
        expect(typeof flags[key].warn).toBe('boolean')
      }
    })

    test('all flags default to enabled=true', () => {
      const flags = SYSTEM.DEPRECATION.crucible
      for (const [key, value] of Object.entries(flags)) {
        expect(value.enabled).toBe(true)
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /*  4. logger.deprecated() format                                       */
  /* ------------------------------------------------------------------ */

  describe('logger.deprecated() format', () => {
    test('includes [DEPRECATED] prefix', () => {
      logger.deprecated('test-module', 'test feature', 'Use new thing instead.')
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[DEPRECATED] [test-module] test feature — Use new thing instead.'),
      )
    })

    test('works without suggestion', () => {
      logger.deprecated('test-module', 'test feature')
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[DEPRECATED] [test-module] test feature'),
      )
    })
  })
})
