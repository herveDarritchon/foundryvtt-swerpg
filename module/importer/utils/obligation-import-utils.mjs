import { logger } from '../../utils/logger.mjs'

let stats = {
  total: 0,
  imported: 0,
  rejected: 0,
  unknownProperties: 0,
  propertyDetails: [],
}

/**
 * Reset obligation import statistics to initial state.
 * Called at the beginning of each import batch.
 */
export function resetObligationImportStats() {
  stats = {
    total: 0,
    imported: 0,
    rejected: 0,
    unknownProperties: 0,
    propertyDetails: [],
  }
}

/**
 * Increment a specific obligation import statistic.
 * @param {string} key - The statistic key to increment ('total', 'imported', 'rejected', etc.)
 * @param {number} value - The value to add (default: 1)
 */
export function incrementObligationImportStat(key, value = 1) {
  if (stats[key] !== undefined) {
    stats[key] += value
  }
}

/**
 * Track an unknown property encountered during mapping.
 * Used for observability and debugging of OggDude data variations.
 * @param {string} property - The name of the unknown property
 */
export function addUnknownObligationProperty(property) {
  stats.unknownProperties++
  if (!stats.propertyDetails.includes(property)) {
    stats.propertyDetails.push(property)
    logger.debug('[ObligationImporter] Unknown property detected', { property })
  }
}

/**
 * Get a snapshot of current obligation import statistics.
 * @returns {Object} Copy of the current stats object
 */
export function getObligationImportStats() {
  return { ...stats }
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
