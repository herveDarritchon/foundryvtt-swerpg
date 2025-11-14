import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as metrics from '../../module/importer/utils/global-import-metrics.mjs'

// Mock the individual import stats modules used by getAllImportStats
// We'll stub them by overwriting the imports with test doubles using a simple pattern.

// Helper to reset runtime before each test
beforeEach(() => {
  if (typeof metrics.resetRuntimeMetrics === 'function') metrics.resetRuntimeMetrics()
})

describe('aggregateImportMetrics', () => {
  it('returns zeros when no activity recorded', () => {
    const res = metrics.aggregateImportMetrics()
    expect(res.overallDurationMs).toBe(0)
    expect(res.itemsPerSecond).toBe(0)
    expect(res.errorRate).toBe(0)
    expect(res.archiveSizeBytes).toBe(0)
    expect(res.totalProcessed).toBe(0)
  })

  it('computes overall duration and itemsPerSecond when markers are set', async () => {
    // Use spy to mock exported function
    // Provide explicit stats and measure between start/end to ensure itemsPerSecond > 0
    const stats = { totalProcessed: 10, totalRejected: 2, totalImported: 8 }
    metrics.markGlobalStart()
    // small delay
    await new Promise((r) => setTimeout(r, 20))
    metrics.markGlobalEnd()
    const res = metrics.aggregateImportMetrics(stats)
    expect(res.overallDurationMs).toBeGreaterThan(0)
    expect(res.itemsPerSecond).toBeGreaterThan(0)
    expect(res.errorRate).toBeCloseTo(2 / 10)
    expect(res.totalProcessed).toBe(10)
  })

  it('computes domain durations when recorded', async () => {
    const spy = vi.spyOn(metrics, 'getAllImportStats').mockReturnValue({ totalProcessed: 1, totalRejected: 0, totalImported: 1 })
    try {
      metrics.recordDomainStart('weapon')
      await new Promise((r) => setTimeout(r, 10))
      metrics.recordDomainEnd('weapon')
      const res = metrics.aggregateImportMetrics()
      expect(res.domains).toHaveProperty('weapon')
      expect(res.domains.weapon.durationMs).toBeGreaterThanOrEqual(0)
    } finally {
      spy.mockRestore()
    }
  })
})
