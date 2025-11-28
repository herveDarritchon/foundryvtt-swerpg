import { ImportStats } from './import-stats.mjs'

/**
 * Statistiques d'import pour Species (espèces) OggDude
 */

export const FLAG_STRICT_SPECIES_VALIDATION = false

const speciesStats = new ImportStats({
  unknownTalents: 0,
})

export function resetSpeciesImportStats() {
  speciesStats.reset({
    unknownTalents: 0,
  })
}

export function incrementSpeciesImportStat(key, amount = 1) {
  speciesStats.increment(key, amount)
}

export function addSpeciesUnknownTalent(code) {
  speciesStats.addDetail('unknownTalents', code, 'talentDetails')
}

export function getSpeciesImportStats() {
  return speciesStats.getStats()
}
