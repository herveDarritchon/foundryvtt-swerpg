import { ImportStats } from './import-stats.mjs'

/**
 * Utilities de statistiques pour l'import des équipements (gear) OggDude
 * Permet une observabilité homogène avec armor & weapon.
 */

export const FLAG_STRICT_GEAR_VALIDATION = false

const gearStats = new ImportStats({
  unknownCategories: 0,
})

export function resetGearImportStats() {
  gearStats.reset({
    unknownCategories: 0,
  })
}

export function incrementGearImportStat(key, amount = 1) {
  gearStats.increment(key, amount)
}

export function addGearUnknownCategory(code) {
  gearStats.addDetail('unknownCategories', code, 'categoryDetails')
}

export function getGearImportStats() {
  return gearStats.getStats()
}
