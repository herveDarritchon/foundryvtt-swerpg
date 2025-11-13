// Utilities de statistiques pour l'import des équipements (gear) OggDude
// Permet une observabilité homogène avec armor & weapon.

export const FLAG_STRICT_GEAR_VALIDATION = false

let _gearStats = {
  total: 0,
  rejected: 0,
  unknownCategories: 0,
  categoryDetails: new Set(),
}

export function resetGearImportStats() {
  _gearStats = {
    total: 0,
    rejected: 0,
    unknownCategories: 0,
    categoryDetails: new Set(),
  }
}

export function incrementGearImportStat(key) {
  if (Object.prototype.hasOwnProperty.call(_gearStats, key)) {
    _gearStats[key] += 1
  }
}

export function addGearUnknownCategory(code) {
  _gearStats.unknownCategories += 1
  _gearStats.categoryDetails.add(code)
}

export function getGearImportStats() {
  return {
    total: _gearStats.total,
    rejected: _gearStats.rejected,
    imported: _gearStats.total - _gearStats.rejected,
    unknownCategories: _gearStats.unknownCategories,
    categoryDetails: Array.from(_gearStats.categoryDetails),
  }
}

export function _unsafeInternalGearStatsRef() {
  return _gearStats
}
