import { ImportStats } from './import-stats.mjs'

// Statistiques d'import pour Motivation et Motivation Category OggDude

const motivationStats = new ImportStats()
const motivationCategoryStats = new ImportStats()

// --- Motivation ---

/**
 * Reset all motivation import counters to zero.
 */
export function resetMotivationImportStats() {
  motivationStats.reset()
}

/**
 * Increment a named motivation import counter by the given amount.
 * @param key
 * @param amount
 */
export function incrementMotivationImportStat(key, amount = 1) {
  motivationStats.increment(key, amount)
}

/**
 * Return the current motivation import statistics snapshot.
 */
export function getMotivationImportStats() {
  return motivationStats.getStats()
}

// --- Motivation Category ---

/**
 * Reset all motivation-category import counters to zero.
 */
export function resetMotivationCategoryImportStats() {
  motivationCategoryStats.reset()
}

/**
 * Increment a named motivation-category import counter by the given amount.
 * @param key
 * @param amount
 */
export function incrementMotivationCategoryImportStat(key, amount = 1) {
  motivationCategoryStats.increment(key, amount)
}

/**
 * Return the current motivation-category import statistics snapshot.
 */
export function getMotivationCategoryImportStats() {
  return motivationCategoryStats.getStats()
}
