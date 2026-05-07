import { ImportStats } from './import-stats.mjs'

// Utilities de statistiques pour l'import des armes OggDude
// Centralise la logique pour support d'un agrégateur global et tests unitaires.

// Mode strict (peut être activé ailleurs – exporté pour cohérence)
export const FLAG_STRICT_WEAPON_VALIDATION = false

// Structure interne des statistiques (Sets pour détails uniques)
const weaponStats = new ImportStats({
  unknownSkills: 0,
  unknownQualities: 0,
  unknownTypes: 0,
  unknownCategories: 0,
  categoryFallbacks: 0,
})

/**
 * Reset des statistiques avant chaque session d'import.
 */
export function resetWeaponImportStats() {
  weaponStats.reset({
    unknownSkills: 0,
    unknownQualities: 0,
    unknownTypes: 0,
    unknownCategories: 0,
    categoryFallbacks: 0,
  })
}

/**
 * Incrémente un compteur numérique connu.
 * @param {('total'|'rejected'|'unknownSkills'|'unknownQualities')} key
 * @param {number} amount - Montant à ajouter (défaut: 1)
 */
export function incrementWeaponImportStat(key, amount = 1) {
  weaponStats.increment(key, amount)
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
 * Enregistre un type d'arme inconnu.
 * @param {string} typeValue
 */
export function addWeaponUnknownType(typeValue) {
  weaponStats.addDetail('unknownTypes', typeValue, 'typeDetails')
}

/**
 * Enregistre une catégorie d'arme inconnue.
 * @param {string} categoryValue
 */
export function addWeaponUnknownCategory(categoryValue) {
  weaponStats.addDetail('unknownCategories', categoryValue, 'categoryDetails')
}

/**
 * Incrémente le compteur de fallback de catégorie.
 */
export function incrementWeaponCategoryFallback() {
  weaponStats.increment('categoryFallbacks', 1)
}

/**
 * Récupère les statistiques actuelles dans un format sérialisable.
 * @returns {{total:number,rejected:number,imported:number,unknownSkills:number,unknownQualities:number,unknownTypes:number,unknownCategories:number,categoryFallbacks:number,skillDetails:string[],qualityDetails:string[],typeDetails:string[],categoryDetails:string[]}}
 */
export function getWeaponImportStats() {
  return weaponStats.getStats()
}
