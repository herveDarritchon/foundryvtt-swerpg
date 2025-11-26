// Statistiques d'import pour Duty OggDude

let _dutyStats = {
  total: 0,
  rejected: 0,
}

export function resetDutyImportStats() {
  _dutyStats = {
    total: 0,
    rejected: 0,
  }
}

export function incrementDutyImportStat(key, amount = 1) {
  if (Object.prototype.hasOwnProperty.call(_dutyStats, key)) {
    _dutyStats[key] += amount
  }
}

export function getDutyImportStats() {
  return {
    total: _dutyStats.total,
    rejected: _dutyStats.rejected,
    imported: _dutyStats.total - _dutyStats.rejected,
  }
}
