import { ImportStats } from './import-stats.mjs'

// Utilities de statistiques pour l'import des armes OggDude
// Centralise la logique pour support d'un agrégateur global et tests unitaires.

// Mode strict (peut être activé ailleurs – exporté pour cohérence)
export const FLAG_STRICT_WEAPON_VALIDATION = false

// Structure interne des statistiques (Sets pour détails uniques)
const weaponStats = new ImportStats({
  unknownSkills: 0,
  unknownQualities: 0,
})

/**
 * Reset des statistiques avant chaque session d'import.
 */
export function resetWeaponImportStats() {
  weaponStats.reset({
    unknownSkills: 0,
    unknownQualities: 0,
  })
}

/**
 * Incrémente un compteur numérique connu.
 * @param {('total'|'rejected'|'unknownSkills'|'unknownQualities')} key
 */
export function incrementWeaponImportStat(key) {
  weaponStats.increment(key)
}

/**
 * Enregistre une compétence inconnue.
 * @param {string} code
 */
export function addWeaponUnknownSkill(code) {
  weaponStats.addDetail('unknownSkills', code, 'skillDetails')
}

/**
 * Enregistre une qualité inconnue.
 * @param {string} code
 */
export function addWeaponUnknownQuality(code) {
  weaponStats.addDetail('unknownQualities', code, 'qualityDetails')
}

/**
 * Récupère les statistiques actuelles dans un format sérialisable.
 * @returns {{total:number,rejected:number,imported:number,unknownSkills:number,unknownQualities:number,skillDetails:string[],qualityDetails:string[]}}
 */
export function getWeaponImportStats() {
  return weaponStats.getStats()
}

/**
 * Fournit un accès direct (lecture seule) à la structure interne pour un éventuel agrégateur global.
 * À utiliser prudemment (ne pas modifier en dehors de ce module).
 */
export function _unsafeInternalWeaponStatsRef() {
  return weaponStats.getStats()
}
