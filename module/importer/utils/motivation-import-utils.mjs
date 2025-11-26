// Statistiques d'import pour Motivation et Motivation Category OggDude

let _motivationStats = {
  total: 0,
  rejected: 0,
}

let _motivationCategoryStats = {
  total: 0,
  rejected: 0,
}

// --- Motivation ---

export function resetMotivationImportStats() {
  _motivationStats = {
    total: 0,
    rejected: 0,
  }
}

export function incrementMotivationImportStat(key, amount = 1) {
  if (Object.prototype.hasOwnProperty.call(_motivationStats, key)) {
    _motivationStats[key] += amount
  }
}

export function getMotivationImportStats() {
  return {
    total: _motivationStats.total,
    rejected: _motivationStats.rejected,
    imported: _motivationStats.total - _motivationStats.rejected,
  }
}

// --- Motivation Category ---

export function resetMotivationCategoryImportStats() {
  _motivationCategoryStats = {
    total: 0,
    rejected: 0,
  }
}

export function incrementMotivationCategoryImportStat(key, amount = 1) {
  if (Object.prototype.hasOwnProperty.call(_motivationCategoryStats, key)) {
    _motivationCategoryStats[key] += amount
  }
}

export function getMotivationCategoryImportStats() {
  return {
    total: _motivationCategoryStats.total,
    rejected: _motivationCategoryStats.rejected,
    imported: _motivationCategoryStats.total - _motivationCategoryStats.rejected,
  }
}
