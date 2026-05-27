import { ImportStats } from './import-stats.mjs'

// Statistiques d'import pour Duty OggDude

const dutyStats = new ImportStats()

/**
 * Reset all duty import counters to zero.
 */
export function resetDutyImportStats() {
  dutyStats.reset()
}

/**
 * Increment a named duty import counter by the given amount.
 * @param key
 * @param amount
 */
export function incrementDutyImportStat(key, amount = 1) {
  dutyStats.increment(key, amount)
}

/**
 * Return the current duty import statistics snapshot.
 */
export function getDutyImportStats() {
  return dutyStats.getStats()
}
