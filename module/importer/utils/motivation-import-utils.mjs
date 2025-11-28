import { ImportStats } from './import-stats.mjs'

// Statistiques d'import pour Motivation et Motivation Category OggDude

const motivationStats = new ImportStats()
const motivationCategoryStats = new ImportStats()

// --- Motivation ---

export function resetMotivationImportStats() {
  motivationStats.reset()
}

export function incrementMotivationImportStat(key, amount = 1) {
  motivationStats.increment(key, amount)
}

export function getMotivationImportStats() {
  return motivationStats.getStats()
}

// --- Motivation Category ---

export function resetMotivationCategoryImportStats() {
  motivationCategoryStats.reset()
}

export function incrementMotivationCategoryImportStat(key, amount = 1) {
  motivationCategoryStats.increment(key, amount)
}

export function getMotivationCategoryImportStats() {
  return motivationCategoryStats.getStats()
}
