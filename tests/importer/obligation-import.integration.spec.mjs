import {describe, expect, it} from 'vitest'
import fs from 'node:fs/promises'
import xml2jsModule from '../../vendors/xml2js.min.js'
import {parseXmlToJson} from '../../module/utils/xml/parser.mjs'
import {getObligationImportStats, obligationMapper,} from '../../module/importer/items/obligation-ogg-dude.mjs'

// Shim xml2js global (same pattern as armor/weapon)
if (globalThis.xml2js === undefined) {
    globalThis.xml2js = {js: xml2jsModule}
}

describe('Obligation Import Integration Tests', () => {
    describe('Obligations.xml - mapping real OggDude data', () => {
        it('should successfully map obligations from Obligations.xml fixture', async () => {
            // Load the fixture file
            const xml = await fs.readFile('resources/integration/Obligations.xml', 'utf8')
            const raw = await parseXmlToJson(xml)

            // Extract obligations array
            const obligationNodes = Array.isArray(raw.Obligations.Obligation)
                ? raw.Obligations.Obligation
                : [raw.Obligations.Obligation]
            expect(Array.isArray(obligationNodes)).toBe(true)
            expect(obligationNodes.length).toBeGreaterThan(0)

            // Map first 5 obligations
            const sampled = obligationNodes.slice(0, 5)
            const mapped = obligationMapper(sampled)

            // Verify mapped structure
            expect(mapped.length).toBeGreaterThan(0)

            // Check first mapped obligation
            const firstObligation = mapped[0]
            expect(firstObligation).toHaveProperty('type', 'obligation')
            expect(firstObligation).toHaveProperty('name')
            expect(firstObligation).toHaveProperty('system')
            expect(firstObligation).toHaveProperty('flags')

            // Verify system structure
            expect(firstObligation.system).toHaveProperty('description')
            expect(firstObligation.system).toHaveProperty('value', 10)
            expect(firstObligation.system).toHaveProperty('isExtra', false)
            expect(firstObligation.system).toHaveProperty('extraXp', 0)
            expect(firstObligation.system).toHaveProperty('extraCredits', 0)

            // Verify flags structure
            expect(firstObligation.flags).toHaveProperty('swerpg')
            expect(firstObligation.flags.swerpg).toHaveProperty('oggdudeKey')

            // Verify statistics
            const stats = getObligationImportStats()
            expect(stats.total).toBe(5)
            expect(stats.imported).toBe(mapped.length)
            expect(stats.rejected).toBe(stats.total - stats.imported)
        })

        it('should map all standard obligation fields from XML', async () => {
            const xml = await fs.readFile('resources/integration/Obligations.xml', 'utf8')
            const raw = await parseXmlToJson(xml)

            const obligationNodes = raw.Obligations.Obligation.slice(0, 3)
            const mapped = obligationMapper(obligationNodes)

            for (const obligation of mapped) {
                // Check mandatory fields are present
                expect(obligation.name).toBeTruthy()
                expect(obligation.type).toBe('obligation')

                // Check system defaults are applied
                expect(typeof obligation.system.value).toBe('number')
                expect(typeof obligation.system.isExtra).toBe('boolean')
                expect(typeof obligation.system.extraXp).toBe('number')
                expect(typeof obligation.system.extraCredits).toBe('number')

                // Check flags are present
                expect(obligation.flags.swerpg.oggdudeKey).toBeTruthy()
            }
        })

        it('should handle obligations with Source field', async () => {
            const xml = await fs.readFile('resources/integration/Obligations.xml', 'utf8')
            const raw = await parseXmlToJson(xml)

            // Find obligations with Source field
            const obligationsWithSource = raw.Obligations.Obligation.filter((o) => o.Source)

            if (obligationsWithSource.length > 0) {
                const mapped = obligationMapper(obligationsWithSource.slice(0, 3))

                for (const obligation of mapped) {
                    if (obligation.flags.swerpg.oggdudeSource) {
                        expect(typeof obligation.flags.swerpg.oggdudeSource).toBe('string')
                    }
                }
            }
        })

        it('should handle obligations with Sources field (multiple)', async () => {
            const xml = await fs.readFile('resources/integration/Obligations.xml', 'utf8')
            const raw = await parseXmlToJson(xml)

            // Find obligations with Sources field
            const obligationsWithSources = raw.Obligations.Obligation.filter((o) => o.Sources)

            if (obligationsWithSources.length > 0) {
                const mapped = obligationMapper(obligationsWithSources.slice(0, 3))

                for (const obligation of mapped) {
                    if (obligation.flags.swerpg.oggdudeSources) {
                        expect(Array.isArray(obligation.flags.swerpg.oggdudeSources)).toBe(true)
                        expect(obligation.flags.swerpg.oggdudeSources.length).toBeGreaterThan(0)
                    }
                }
            }
        })

        it('should track import statistics for large batch', async () => {
            const xml = await fs.readFile('resources/integration/Obligations.xml', 'utf8')
            const raw = await parseXmlToJson(xml)

            const allObligations = raw.Obligations.Obligation
            const mapped = obligationMapper(allObligations)

            const stats = getObligationImportStats()

            // Verify stats consistency
            expect(stats.total).toBe(allObligations.length)
            expect(stats.imported + stats.rejected).toBe(stats.total)
            expect(mapped.length).toBe(stats.imported)

            // Log for observability
            logger.info('[ObligationImporter Integration Test] Import stats', {
                total: stats.total,
                imported: stats.imported,
                rejected: stats.rejected,
                successRate: `${((stats.imported / stats.total) * 100).toFixed(2)}%`,
            })
        })

        it('should preserve OggDude key traceability', async () => {
            const xml = await fs.readFile('resources/integration/Obligations.xml', 'utf8')
            const raw = await parseXmlToJson(xml)

            const obligationNodes = raw.Obligations.Obligation.slice(0, 10)
            const mapped = obligationMapper(obligationNodes)

            // Verify each mapped obligation has the original key
            for (let index = 0; index < mapped.length; index++) {
                const obligation = mapped[index]
                const originalKey = obligationNodes[index].Key
                expect(obligation.flags.swerpg.oggdudeKey).toBe(originalKey)
            }
        })

        it('should handle description field correctly', async () => {
            const xml = await fs.readFile('resources/integration/Obligations.xml', 'utf8')
            const raw = await parseXmlToJson(xml)

            const obligationNodes = raw.Obligations.Obligation.slice(0, 5)
            const mapped = obligationMapper(obligationNodes)

            for (const obligation of mapped) {
                // Description should be a string (even if empty)
                expect(typeof obligation.system.description).toBe('string')
            }
        })
    })

    describe('Performance validation', () => {
        it('should map 50 obligations in reasonable time', async () => {
            const xml = await fs.readFile('resources/integration/Obligations.xml', 'utf8')
            const raw = await parseXmlToJson(xml)

            const sample = raw.Obligations.Obligation.slice(0, 50)

            const startTime = performance.now()
            const mapped = obligationMapper(sample)
            const endTime = performance.now()

            const duration = endTime - startTime

            expect(mapped.length).toBeGreaterThan(0)
            expect(duration).toBeLessThan(1000) // Should complete in less than 1 second

            logger.info('[ObligationImporter Performance Test] Mapping performance', {
                count: mapped.length,
                durationMs: duration.toFixed(2)
            })
        })
    })
})
