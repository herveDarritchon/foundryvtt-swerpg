import { describe, it, expect } from 'vitest'
import { getArmorImportStats } from '../../module/importer/utils/armor-import-utils.mjs'
import { getWeaponImportStats } from '../../module/importer/utils/weapon-import-utils.mjs'
import { getGearImportStats } from '../../module/importer/utils/gear-import-utils.mjs'
import { getSpeciesImportStats } from '../../module/importer/utils/species-import-utils.mjs'
import { getCareerImportStats } from '../../module/importer/utils/career-import-utils.mjs'
import { getAllImportStats, aggregateImportMetrics } from '../../module/importer/utils/global-import-metrics.mjs'

function expectBaseDomainStats(stats) {
  expect(stats).toHaveProperty('total')
  expect(stats).toHaveProperty('rejected')
  expect(stats).toHaveProperty('imported')
  expect(typeof stats.total).toBe('number')
  expect(typeof stats.rejected).toBe('number')
  expect(typeof stats.imported).toBe('number')
}

describe('Import Stats Utilities', () => {
  it('should expose armor stats structure', () => {
    expectBaseDomainStats(getArmorImportStats())
  })
  it('should expose weapon stats structure', () => {
    expectBaseDomainStats(getWeaponImportStats())
  })
  it('should expose gear stats structure', () => {
    expectBaseDomainStats(getGearImportStats())
  })
  it('should expose species stats structure', () => {
    expectBaseDomainStats(getSpeciesImportStats())
  })
  it('should expose career stats structure', () => {
    expectBaseDomainStats(getCareerImportStats())
  })
  it('should aggregate all import stats', () => {
    const all = getAllImportStats()
    expect(all).toHaveProperty('totalProcessed')
    expect(all).toHaveProperty('totalImported')
    expect(all).toHaveProperty('totalRejected')
  })
  it('should aggregate runtime metrics', () => {
    const metrics = aggregateImportMetrics()
    expect(metrics).toHaveProperty('overallDurationMs')
    expect(metrics).toHaveProperty('domainsCount')
    expect(metrics).toHaveProperty('errorRate')
    expect(metrics).toHaveProperty('archiveSizeBytes')
    expect(metrics).toHaveProperty('itemsPerSecond')
  })
})
