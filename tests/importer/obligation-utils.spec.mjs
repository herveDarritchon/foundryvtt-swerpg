import {beforeEach, describe, expect, it} from 'vitest'
import {
    addUnknownObligationProperty,
    getObligationImportStats,
    incrementObligationImportStat,
    registerObligationMetrics,
    resetObligationImportStats,
} from '../../module/importer/utils/obligation-import-utils.mjs'

describe('obligation-import-utils', () => {
    beforeEach(() => {
        resetObligationImportStats()
    })

    describe('resetObligationImportStats', () => {
        it('should initialize stats to zero', () => {
            const stats = getObligationImportStats()
            expect(stats.total).toBe(0)
            expect(stats.rejected).toBe(0)
            expect(stats.imported).toBe(0) // calculé: total - rejected
            expect(stats.unknownProperties).toBe(0)
            expect(stats.propertyDetails || []).toEqual([]) // propertyDetails peut être undefined
            expect(stats.rejectionReasons).toEqual([])
        })

        it('should reset stats after modifications', () => {
            incrementObligationImportStat('total', 5)
            incrementObligationImportStat('rejected', 2)
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
            incrementObligationImportStat('rejected', 5)
            const stats = getObligationImportStats()
            expect(stats.rejected).toBe(5)
        })

        it('should handle multiple increments', () => {
            incrementObligationImportStat('total')
            incrementObligationImportStat('total')
            incrementObligationImportStat('total', 3)

            const stats = getObligationImportStats()
            expect(stats.total).toBe(5)
        })

        it('should create stats for unknown keys automatically', () => {
            incrementObligationImportStat('nonExistentKey', 10)
            const stats = getObligationImportStats()

            expect(stats.nonExistentKey).toBe(10)
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
            expect(stats.unknownProperties).toBe(1) // Déduplication: seuls les éléments uniques sont comptés
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
            incrementObligationImportStat('rejected', 3)
            addUnknownObligationProperty('unknownField')

            const stats = getObligationImportStats()
            expect(stats.total).toBe(10)
            expect(stats.rejected).toBe(3)
            expect(stats.imported).toBe(7) // calculé: total - rejected
            expect(stats.unknownProperties).toBe(1)
            expect(stats.propertyDetails).toContain('unknownField')
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
            incrementObligationImportStat('rejected', 2)

            const registration = registerObligationMetrics()
            const stats = registration.getStats()

            expect(stats.total).toBe(5)
            expect(stats.rejected).toBe(2)
            expect(stats.imported).toBe(3) // calculé: total - rejected
        })
    })
})
