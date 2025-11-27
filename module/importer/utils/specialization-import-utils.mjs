import { ImportStats } from './import-stats.mjs'

/**
 * Utilitaires pour l'import des spécialisations OggDude
 */

/**
 * Statistics d'import des spécialisations
 * @private
 */
const specializationStats = new ImportStats({
  created: 0,
  updated: 0,
  failed: 0,
})

// Additional stats not covered by ImportStats
let _additionalSpecializationStats = {
  unknownSkills: 0,
  skillCount: 0,
  skillDetails: new Set(),
}

/**
 * Obtient les statistiques d'import des spécialisations
 * @returns {object} Les statistiques d'import
 */
export function getSpecializationImportStats() {
  const stats = specializationStats.getStats()
  return {
    ...stats,
    imported: stats.created + stats.updated,
    unknownSkills: _additionalSpecializationStats.unknownSkills,
    skillCount: _additionalSpecializationStats.skillCount,
    skillDetails: Array.from(_additionalSpecializationStats.skillDetails),
  }
}

/**
 * Remet à zéro les statistiques d'import des spécialisations
 */
export function resetSpecializationImportStats() {
  specializationStats.reset({
    created: 0,
    updated: 0,
    failed: 0,
  })
  _additionalSpecializationStats = {
    unknownSkills: 0,
    skillCount: 0,
    skillDetails: new Set(),
  }
}

/**
 * Incrémente les statistiques d'import
 * @param {string} stat - Le nom de la statistique à incrémenter
 * @param {number} amount - Le montant à ajouter (défaut: 1)
 */
export function incrementSpecializationImportStat(stat, amount = 1) {
  specializationStats.increment(stat, amount)
}

/**
 * Ajoute une raison de rejet aux statistiques
 * @param {string} reason - La raison du rejet
 */
export function addSpecializationRejectionReason(reason) {
  specializationStats.addRejectionReason(reason)
}

export function addSpecializationUnknownSkill(code) {
  _additionalSpecializationStats.unknownSkills += 1
  _additionalSpecializationStats.skillDetails.add(code)
}

export function addSpecializationSkillCount(count) {
  if (typeof count === 'number' && count > 0) {
    _additionalSpecializationStats.skillCount += count
  }
}
