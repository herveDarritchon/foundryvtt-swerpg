import { describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import xml2jsModule from '../../vendors/xml2js.min.js'
import { parseXmlToJson } from '../../module/utils/xml/parser.mjs'
import { getDutyImportStats, dutyMapper } from '../../module/importer/items/duty-ogg-dude.mjs'
import { resetDutyImportStats } from '../../module/importer/utils/duty-import-utils.mjs'

if (globalThis.xml2js === undefined) {
  globalThis.xml2js = { js: xml2jsModule }
}

describe('Duty Import Integration Tests', () => {
  describe('Duty.xml - mapping real OggDude data', () => {
    it('should successfully map duties from Duty.xml fixture', async () => {
      resetDutyImportStats()
      const xml = await fs.readFile('resources/integration/Duty.xml', 'utf8')
      const raw = await parseXmlToJson(xml)

      const dutyNodes = Array.isArray(raw.Duties.Duty) ? raw.Duties.Duty : [raw.Duties.Duty]
      expect(Array.isArray(dutyNodes)).toBe(true)
      expect(dutyNodes.length).toBeGreaterThan(0)

      const sampled = dutyNodes.slice(0, 5)
      const mapped = dutyMapper(sampled)

      expect(mapped.length).toBeGreaterThan(0)

      const firstDuty = mapped[0]
      expect(firstDuty).toHaveProperty('type', 'duty')
      expect(firstDuty).toHaveProperty('name')
      expect(firstDuty).toHaveProperty('system')
      expect(firstDuty).toHaveProperty('flags')

      expect(firstDuty.system).toHaveProperty('description')
      expect(firstDuty.system).toHaveProperty('value', 10)

      expect(firstDuty.flags).toHaveProperty('swerpg')
      expect(firstDuty.flags.swerpg).toHaveProperty('oggdudeKey')

      const stats = getDutyImportStats()
      expect(stats.total).toBe(5)
      expect(stats.imported).toBe(mapped.length)
      expect(stats.rejected).toBe(stats.total - stats.imported)
    })

    it('should map all standard duty fields from XML', async () => {
      resetDutyImportStats()
      const xml = await fs.readFile('resources/integration/Duty.xml', 'utf8')
      const raw = await parseXmlToJson(xml)

      const dutyNodes = raw.Duties.Duty.slice(0, 3)
      const mapped = dutyMapper(dutyNodes)

      for (const duty of mapped) {
        expect(duty.name).toBeTruthy()
        expect(duty.type).toBe('duty')

        expect(typeof duty.system.value).toBe('number')

        expect(duty.flags.swerpg.oggdudeKey).toBeTruthy()
      }
    })

    it('should handle duties with Source field', async () => {
      resetDutyImportStats()
      const xml = await fs.readFile('resources/integration/Duty.xml', 'utf8')
      const raw = await parseXmlToJson(xml)

      const dutiesWithSource = raw.Duties.Duty.filter((d) => d.Source)

      if (dutiesWithSource.length > 0) {
        const mapped = dutyMapper(dutiesWithSource.slice(0, 3))

        for (const duty of mapped) {
          if (duty.system.sources && duty.system.sources.length > 0) {
            expect(typeof duty.system.sources[0].book).toBe('string')
          }
        }
      }
    })

    it('should handle duties with Sources field (multiple)', async () => {
      resetDutyImportStats()
      const xml = await fs.readFile('resources/integration/Duty.xml', 'utf8')
      const raw = await parseXmlToJson(xml)

      const dutiesWithSources = raw.Duties.Duty.filter((d) => d.Sources)

      if (dutiesWithSources.length > 0) {
        const mapped = dutyMapper(dutiesWithSources.slice(0, 3))

        for (const duty of mapped) {
          expect(Array.isArray(duty.system.sources)).toBe(true)
          expect(duty.system.sources.length).toBeGreaterThan(0)
        }
      }
    })

    it('should track import statistics for large batch', async () => {
      resetDutyImportStats()
      const xml = await fs.readFile('resources/integration/Duty.xml', 'utf8')
      const raw = await parseXmlToJson(xml)

      const allDuties = raw.Duties.Duty
      const mapped = dutyMapper(allDuties)

      const stats = getDutyImportStats()

      expect(stats.total).toBe(allDuties.length)
      expect(stats.imported + stats.rejected).toBe(stats.total)
      expect(mapped.length).toBe(stats.imported)
    })

    it('should preserve OggDude key traceability', async () => {
      resetDutyImportStats()
      const xml = await fs.readFile('resources/integration/Duty.xml', 'utf8')
      const raw = await parseXmlToJson(xml)

      const dutyNodes = raw.Duties.Duty.slice(0, 10)
      const mapped = dutyMapper(dutyNodes)

      for (let index = 0; index < mapped.length; index++) {
        const duty = mapped[index]
        const originalKey = dutyNodes[index].Key
        expect(duty.flags.swerpg.oggdudeKey).toBe(originalKey)
      }
    })

    it('should handle description field correctly', async () => {
      resetDutyImportStats()
      const xml = await fs.readFile('resources/integration/Duty.xml', 'utf8')
      const raw = await parseXmlToJson(xml)

      const dutyNodes = raw.Duties.Duty.slice(0, 5)
      const mapped = dutyMapper(dutyNodes)

      for (const duty of mapped) {
        expect(typeof duty.system.description).toBe('string')
      }
    })
  })

  describe('Performance validation', () => {
    it('should map 46 duties in reasonable time', async () => {
      resetDutyImportStats()
      const xml = await fs.readFile('resources/integration/Duty.xml', 'utf8')
      const raw = await parseXmlToJson(xml)

      const sample = raw.Duties.Duty.slice(0, 46)

      const startTime = performance.now()
      const mapped = dutyMapper(sample)
      const endTime = performance.now()

      const duration = endTime - startTime

      expect(mapped.length).toBeGreaterThan(0)
      expect(duration).toBeLessThan(1000)
    })
  })
})
