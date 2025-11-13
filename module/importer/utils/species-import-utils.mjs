// Statistiques d'import pour Species (espèces) OggDude

export const FLAG_STRICT_SPECIES_VALIDATION = false

let _speciesStats = {
  total: 0,
  rejected: 0,
  unknownTalents: 0,
  talentDetails: new Set(),
}

export function resetSpeciesImportStats() {
  _speciesStats = {
    total: 0,
    rejected: 0,
    unknownTalents: 0,
    talentDetails: new Set(),
  }
}

export function incrementSpeciesImportStat(key) {
  if (Object.prototype.hasOwnProperty.call(_speciesStats, key)) {
    _speciesStats[key] += 1
  }
}

export function addSpeciesUnknownTalent(code) {
  _speciesStats.unknownTalents += 1
  _speciesStats.talentDetails.add(code)
}

export function getSpeciesImportStats() {
  return {
    total: _speciesStats.total,
    rejected: _speciesStats.rejected,
    imported: _speciesStats.total - _speciesStats.rejected,
    unknownTalents: _speciesStats.unknownTalents,
    talentDetails: Array.from(_speciesStats.talentDetails),
  }
}

export function _unsafeInternalSpeciesStatsRef() {
  return _speciesStats
}
