import { ImportStats } from './import-stats.mjs'

/**
 * Utilities de statistiques pour l'import des équipements (gear) OggDude
 * Permet une observabilité homogène avec armor & weapon.
 */

export const FLAG_STRICT_GEAR_VALIDATION = false

const gearStats = new ImportStats({
  unknownCategories: 0,
})

/**
 * Reset all gear import counters and category details to zero.
 */
export function resetGearImportStats() {
  gearStats.reset({
    unknownCategories: 0,
  })
}

/**
 * Increment a named gear import counter by the given amount.
 * @param key
 * @param amount
 */
export function incrementGearImportStat(key, amount = 1) {
  gearStats.increment(key, amount)
}

/**
 * Record an unknown category code encountered during gear import.
 * @param code
 */
export function addGearUnknownCategory(code) {
  gearStats.addDetail('unknownCategories', code, 'categoryDetails')
}

/**
 * Return the current gear import statistics snapshot.
 */
export function getGearImportStats() {
  return gearStats.getStats()
}
