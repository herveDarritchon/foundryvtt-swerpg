import { ImportStats } from './import-stats.mjs'
import { logger } from '../../utils/logger.mjs'

const obligationStats = new ImportStats({
  imported: 0,
  unknownProperties: 0,
})

/**
 * Reset obligation import statistics to initial state.
 * Called at the beginning of each import batch.
 */
export function resetObligationImportStats() {
  obligationStats.reset({
    imported: 0,
    unknownProperties: 0,
  })
}

/**
 * Increment a specific obligation import statistic.
 * @param {string} key - The statistic key to increment ('total', 'imported', 'rejected', etc.)
 * @param {number} value - The value to add (default: 1)
 */
export function incrementObligationImportStat(key, value = 1) {
  obligationStats.increment(key, value)
}

/**
 * Track an unknown property encountered during mapping.
 * Used for observability and debugging of OggDude data variations.
 * @param {string} property - The name of the unknown property
 */
export function addUnknownObligationProperty(property) {
  obligationStats.addDetail('unknownProperties', property, 'propertyDetails')
  logger.debug('[ObligationImporter] Unknown property detected', { property })
}

/**
 * Get a snapshot of current obligation import statistics.
 * @returns {Object} Copy of the current stats object
 */
export function getObligationImportStats() {
  return obligationStats.getStats()
}

/**
 * Register obligation metrics for global metrics aggregator.
 * Used by the global import metrics system to track all domain statistics.
 * @returns {Object} Registration object with domain identifier and stats accessor
 */
export function registerObligationMetrics() {
  return {
    domain: 'obligation',
    getStats: getObligationImportStats,
  }
}
