import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetRuntimeMetrics,
  markGlobalStart,
  markGlobalEnd,
  markArchiveSize,
  recordDomainStart,
  recordDomainEnd,
  aggregateImportMetrics,
  getAllImportStats,
  formatGlobalMetrics,
} from '../../../module/importer/utils/global-import-metrics.mjs'

describe('Global Import Metrics', () => {
  beforeEach(() => {
    resetRuntimeMetrics()
  })

  describe('Runtime Metrics', () => {
    it('should track global start and end times', () => {
      markGlobalStart()
      // Simuler du travail
      const start = performance.now()
      while (performance.now() - start < 10) {
        // Wait 10ms
      }
      markGlobalEnd()

      const metrics = aggregateImportMetrics()
      expect(metrics.overallDurationMs).toBeGreaterThan(0)
    })

    it('should track archive size', () => {
      markArchiveSize(1024 * 1024) // 1MB

      const metrics = aggregateImportMetrics()
      expect(metrics.archiveSizeBytes).toBe(1024 * 1024)
    })

    it('should ignore invalid archive sizes', () => {
      markArchiveSize(-100)
      markArchiveSize('invalid')
      markArchiveSize(null)

      const metrics = aggregateImportMetrics()
      expect(metrics.archiveSizeBytes).toBe(0)
    })

    it('should track domain durations', () => {
      recordDomainStart('weapons')
      const start = performance.now()
      while (performance.now() - start < 5) {
        // Wait 5ms
      }
      recordDomainEnd('weapons')

      const metrics = aggregateImportMetrics()
      expect(metrics.domains.weapons).toBeDefined()
      expect(metrics.domains.weapons.durationMs).toBeGreaterThan(0)
    })

    it('should handle multiple domains', () => {
      recordDomainStart('weapons')
      recordDomainEnd('weapons')
      recordDomainStart('armor')
      recordDomainEnd('armor')

      const metrics = aggregateImportMetrics()
      expect(metrics.domainsCount).toBe(2)
      expect(metrics.domains.weapons).toBeDefined()
      expect(metrics.domains.armor).toBeDefined()
    })
  })

  describe('Stats Aggregation', () => {
    it('should aggregate stats from all domains', () => {
      const stats = getAllImportStats()

      expect(stats).toHaveProperty('armor')
      expect(stats).toHaveProperty('weapon')
      expect(stats).toHaveProperty('gear')
      expect(stats).toHaveProperty('species')
      expect(stats).toHaveProperty('career')
      expect(stats).toHaveProperty('talent')
      expect(stats).toHaveProperty('duty')
      expect(stats).toHaveProperty('totalProcessed')
      expect(stats).toHaveProperty('totalRejected')
      expect(stats).toHaveProperty('totalImported')
    })

    it('should calculate totals correctly', () => {
      const stats = getAllImportStats()

      // Les totaux doivent être cohérents
      expect(stats.totalImported).toBe(stats.totalProcessed - stats.totalRejected)
    })

    it('should calculate error rate', () => {
      markGlobalStart()
      markGlobalEnd()

      const metrics = aggregateImportMetrics()
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0)
      expect(metrics.errorRate).toBeLessThanOrEqual(1)
    })

    it('should calculate items per second', () => {
      markGlobalStart()
      const start = performance.now()
      while (performance.now() - start < 100) {
        // Wait 100ms
      }
      markGlobalEnd()

      const metrics = aggregateImportMetrics()
      expect(metrics.itemsPerSecond).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Formatting', () => {
    it('should format metrics for human reading', () => {
      markGlobalStart()
      markGlobalEnd()
      markArchiveSize(2048576) // ~2MB
      recordDomainStart('test')
      recordDomainEnd('test')

      const formatted = formatGlobalMetrics()

      expect(formatted).toHaveProperty('overallDuration')
      expect(formatted).toHaveProperty('archiveSize')
      expect(formatted).toHaveProperty('errorRate')
      expect(formatted).toHaveProperty('itemsPerSecond')
      expect(formatted).toHaveProperty('domains')

      // Les valeurs formatées doivent être des chaînes
      expect(typeof formatted.overallDuration).toBe('string')
      expect(typeof formatted.archiveSize).toBe('string')
      expect(formatted.archiveSize).toContain('MB')
    })

    it('should preserve raw values in formatted output', () => {
      markGlobalStart()
      markGlobalEnd()

      const formatted = formatGlobalMetrics()
      expect(formatted.raw).toBeDefined()
      expect(typeof formatted.raw.overallDurationMs).toBe('number')
    })
  })

  describe('Reset Functionality', () => {
    it('should reset all runtime metrics', () => {
      markGlobalStart()
      markGlobalEnd()
      markArchiveSize(1000)
      recordDomainStart('test')
      recordDomainEnd('test')

      resetRuntimeMetrics()

      const metrics = aggregateImportMetrics()
      expect(metrics.overallDurationMs).toBe(0)
      expect(metrics.archiveSizeBytes).toBe(0)
      expect(metrics.domainsCount).toBe(0)
    })

    it('should preserve last import stats when requested', () => {
      markGlobalStart()
      markGlobalEnd()

      // Premier import avec des stats
      const firstMetrics = aggregateImportMetrics()

      // Reset sans effacer les stats
      resetRuntimeMetrics(true)

      // Les stats devraient être préservées
      const metrics = aggregateImportMetrics()
      expect(metrics.totalImported).toBe(firstMetrics.totalImported)
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing global end gracefully', () => {
      markGlobalStart()
      // Pas d'appel à markGlobalEnd

      const metrics = aggregateImportMetrics()
      expect(metrics.overallDurationMs).toBe(0)
    })

    it('should handle missing domain end gracefully', () => {
      recordDomainStart('incomplete')
      // Pas d'appel à recordDomainEnd

      const metrics = aggregateImportMetrics()
      expect(metrics.domains.incomplete).toBeDefined()
      expect(metrics.domains.incomplete.durationMs).toBe(0)
    })

    it('should handle zero duration gracefully', () => {
      markGlobalStart()
      markGlobalEnd()

      const metrics = aggregateImportMetrics()
      expect(metrics.itemsPerSecond).toBeGreaterThanOrEqual(0)
    })
  })
})
