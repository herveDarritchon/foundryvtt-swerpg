import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetObligationImportStats,
  incrementObligationImportStat,
  addUnknownObligationProperty,
  getObligationImportStats,
  registerObligationMetrics,
} from '../../module/importer/utils/obligation-import-utils.mjs'

describe('obligation-import-utils', () => {
  beforeEach(() => {
    resetObligationImportStats()
  })

  describe('resetObligationImportStats', () => {
    it('should initialize stats to zero', () => {
      const stats = getObligationImportStats()
      expect(stats).toEqual({
        total: 0,
        imported: 0,
        rejected: 0,
        unknownProperties: 0,
        propertyDetails: [],
      })
    })

    it('should reset stats after modifications', () => {
      incrementObligationImportStat('total', 5)
      incrementObligationImportStat('imported', 3)
      resetObligationImportStats()

      const stats = getObligationImportStats()
      expect(stats.total).toBe(0)
      expect(stats.imported).toBe(0)
    })
  })

  describe('incrementObligationImportStat', () => {
    it('should increment stat by 1 by default', () => {
      incrementObligationImportStat('total')
      const stats = getObligationImportStats()
      expect(stats.total).toBe(1)
    })

    it('should increment stat by specified value', () => {
      incrementObligationImportStat('imported', 5)
      const stats = getObligationImportStats()
      expect(stats.imported).toBe(5)
    })

    it('should handle multiple increments', () => {
      incrementObligationImportStat('total')
      incrementObligationImportStat('total')
      incrementObligationImportStat('total', 3)

      const stats = getObligationImportStats()
      expect(stats.total).toBe(5)
    })

    it('should not modify stats for unknown keys', () => {
      const beforeStats = getObligationImportStats()
      incrementObligationImportStat('nonExistentKey', 10)
      const afterStats = getObligationImportStats()

      expect(afterStats).toEqual(beforeStats)
    })
  })

  describe('addUnknownObligationProperty', () => {
    it('should increment unknownProperties count', () => {
      addUnknownObligationProperty('customField')
      const stats = getObligationImportStats()
      expect(stats.unknownProperties).toBe(1)
    })

    it('should add property to propertyDetails array', () => {
      addUnknownObligationProperty('customField')
      const stats = getObligationImportStats()
      expect(stats.propertyDetails).toContain('customField')
    })

    it('should not duplicate properties in propertyDetails', () => {
      addUnknownObligationProperty('customField')
      addUnknownObligationProperty('customField')
      addUnknownObligationProperty('customField')

      const stats = getObligationImportStats()
      expect(stats.unknownProperties).toBe(3)
      expect(stats.propertyDetails).toEqual(['customField'])
    })

    it('should track multiple different properties', () => {
      addUnknownObligationProperty('field1')
      addUnknownObligationProperty('field2')
      addUnknownObligationProperty('field3')

      const stats = getObligationImportStats()
      expect(stats.unknownProperties).toBe(3)
      expect(stats.propertyDetails).toEqual(['field1', 'field2', 'field3'])
    })
  })

  describe('getObligationImportStats', () => {
    it('should return a copy of stats object', () => {
      const stats1 = getObligationImportStats()
      stats1.total = 999

      const stats2 = getObligationImportStats()
      expect(stats2.total).toBe(0)
    })

    it('should return current state after modifications', () => {
      incrementObligationImportStat('total', 10)
      incrementObligationImportStat('imported', 7)
      incrementObligationImportStat('rejected', 3)
      addUnknownObligationProperty('unknownField')

      const stats = getObligationImportStats()
      expect(stats).toEqual({
        total: 10,
        imported: 7,
        rejected: 3,
        unknownProperties: 1,
        propertyDetails: ['unknownField'],
      })
    })
  })

  describe('registerObligationMetrics', () => {
    it('should return metrics registration object with correct structure', () => {
      const registration = registerObligationMetrics()

      expect(registration).toHaveProperty('domain')
      expect(registration).toHaveProperty('getStats')
      expect(registration.domain).toBe('obligation')
      expect(typeof registration.getStats).toBe('function')
    })

    it('should return getStats function that retrieves current stats', () => {
      incrementObligationImportStat('total', 5)
      incrementObligationImportStat('imported', 3)

      const registration = registerObligationMetrics()
      const stats = registration.getStats()

      expect(stats.total).toBe(5)
      expect(stats.imported).toBe(3)
    })
  })
})
