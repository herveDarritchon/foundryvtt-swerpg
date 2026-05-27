import { ImportStats } from './import-stats.mjs'

// Statistiques d'import pour Duty OggDude

const dutyStats = new ImportStats()

/**
 *
 */
export function resetDutyImportStats() {
  dutyStats.reset()
}

/**
 *
 * @param key
 * @param amount
 */
export function incrementDutyImportStat(key, amount = 1) {
  dutyStats.increment(key, amount)
}

/**
 *
 */
export function getDutyImportStats() {
  return dutyStats.getStats()
}
