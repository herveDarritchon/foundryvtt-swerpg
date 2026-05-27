import { ImportStats } from './import-stats.mjs'

/**
 * Statistiques d'import pour Species (espèces) OggDude
 */

export const FLAG_STRICT_SPECIES_VALIDATION = false

const speciesStats = new ImportStats({
  unknownTalents: 0,
})

/**
 * Reset all species import counters and talent details to zero.
 */
export function resetSpeciesImportStats() {
  speciesStats.reset({
    unknownTalents: 0,
  })
}

/**
 * Increment a named species import counter by the given amount.
 * @param key
 * @param amount
 */
export function incrementSpeciesImportStat(key, amount = 1) {
  speciesStats.increment(key, amount)
}

/**
 * Record an unknown talent code encountered during species import.
 * @param code
 */
export function addSpeciesUnknownTalent(code) {
  speciesStats.addDetail('unknownTalents', code, 'talentDetails')
}

/**
 * Return the current species import statistics snapshot.
 */
export function getSpeciesImportStats() {
  return speciesStats.getStats()
}
