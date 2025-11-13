// Utilities de statistiques pour l'import des armes OggDude
// Centralise la logique pour support d'un agrégateur global et tests unitaires.

// Mode strict (peut être activé ailleurs – exporté pour cohérence)
export const FLAG_STRICT_WEAPON_VALIDATION = false

// Structure interne des statistiques (Sets pour détails uniques)
let _weaponStats = {
  total: 0,
  rejected: 0,
  unknownSkills: 0,
  unknownQualities: 0,
  skillDetails: new Set(),
  qualityDetails: new Set(),
}

/**
 * Reset des statistiques avant chaque session d'import.
 */
export function resetWeaponImportStats() {
  _weaponStats = {
    total: 0,
    rejected: 0,
    unknownSkills: 0,
    unknownQualities: 0,
    skillDetails: new Set(),
    qualityDetails: new Set(),
  }
}

/**
 * Incrémente un compteur numérique connu.
 * @param {('total'|'rejected'|'unknownSkills'|'unknownQualities')} key
 */
export function incrementWeaponImportStat(key) {
  if (Object.prototype.hasOwnProperty.call(_weaponStats, key)) {
    _weaponStats[key] += 1
  }
}

/**
 * Enregistre une compétence inconnue.
 * @param {string} code
 */
export function addWeaponUnknownSkill(code) {
  _weaponStats.unknownSkills += 1
  _weaponStats.skillDetails.add(code)
}

/**
 * Enregistre une qualité inconnue.
 * @param {string} code
 */
export function addWeaponUnknownQuality(code) {
  _weaponStats.unknownQualities += 1
  _weaponStats.qualityDetails.add(code)
}

/**
 * Récupère les statistiques actuelles dans un format sérialisable.
 * @returns {{total:number,rejected:number,imported:number,unknownSkills:number,unknownQualities:number,skillDetails:string[],qualityDetails:string[]}}
 */
export function getWeaponImportStats() {
  return {
    total: _weaponStats.total,
    rejected: _weaponStats.rejected,
    imported: _weaponStats.total - _weaponStats.rejected,
    unknownSkills: _weaponStats.unknownSkills,
    unknownQualities: _weaponStats.unknownQualities,
    skillDetails: Array.from(_weaponStats.skillDetails),
    qualityDetails: Array.from(_weaponStats.qualityDetails),
  }
}

/**
 * Fournit un accès direct (lecture seule) à la structure interne pour un éventuel agrégateur global.
 * À utiliser prudemment (ne pas modifier en dehors de ce module).
 */
export function _unsafeInternalWeaponStatsRef() {
  return _weaponStats
}
