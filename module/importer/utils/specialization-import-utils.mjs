import { ImportStats } from './import-stats.mjs'

/**
 * Utilitaires pour l'import des spécialisations OggDude
 */

/**
 * Statistics d'import des spécialisations
 * @private
 */
const specializationStats = new ImportStats({
  unknownSkills: 0,
  skillCount: 0,
})

/**
 * Obtient les statistiques d'import des spécialisations
 * @returns {object} Les statistiques d'import
 */
export function getSpecializationImportStats() {
  const stats = specializationStats.getStats()
  return {
    ...stats,
    failed: stats.rejected, // Alias pour compatibilité
  }
}

/**
 * Remet à zéro les statistiques d'import des spécialisations
 */
export function resetSpecializationImportStats() {
  specializationStats.reset({
    unknownSkills: 0,
    skillCount: 0,
  })
}

/**
 * Incrémente les statistiques d'import
 * @param {string} stat - Le nom de la statistique à incrémenter
 * @param {number} amount - Le montant à ajouter (défaut: 1)
 */
export function incrementSpecializationImportStat(stat, amount = 1) {
  if (stat === 'failed') stat = 'rejected'
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
  specializationStats.addDetail('unknownSkills', code, 'skillDetails')
}
