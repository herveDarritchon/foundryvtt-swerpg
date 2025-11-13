/**
 * Utilitaires pour l'import des armures OggDude
 */

/**
 * Borne une valeur numérique entre un minimum et un maximum
 * @param {*} value - La valeur à borner
 * @param {number} min - Valeur minimum
 * @param {number} max - Valeur maximum
 * @param {number} defaultValue - Valeur par défaut si value n'est pas numérique
 * @returns {number} La valeur bornée
 */
export function clampNumber(value, min, max, defaultValue = 0) {
  const num = parseInt(value)
  if (isNaN(num)) {
    return defaultValue
  }
  return Math.max(min, Math.min(max, num))
}

/**
 * Sanitise une chaîne de texte pour éviter les injections HTML
 * @param {string} str - La chaîne à sanitiser
 * @returns {string} La chaîne sanitisée
 */
export function sanitizeText(str) {
  if (!str || typeof str !== 'string') {
    return ''
  }
  
  return str
    .trim()
    .replace(/<script/gi, '&lt;script')
    .replace(/<\/script>/gi, '&lt;/script&gt;')
}

/**
 * Mode de validation strict pour l'import des armures
 * En mode strict, les armures avec des données invalides sont rejetées
 */
export const FLAG_STRICT_ARMOR_VALIDATION = false

/**
 * Statistics d'import des armures
 * @private
 */
let armorImportStats = {
  total: 0,
  rejected: 0,
  unknownCategories: 0,
  unknownProperties: 0,
  rejectionReasons: []
}

/**
 * Obtient les statistiques d'import des armures
 * @returns {object} Les statistiques d'import
 */
export function getArmorImportStats() {
  return { ...armorImportStats, imported: armorImportStats.total - armorImportStats.rejected }
}

/**
 * Remet à zéro les statistiques d'import des armures
 */
export function resetArmorImportStats() {
  armorImportStats = {
    total: 0,
    rejected: 0,
    unknownCategories: 0,
    unknownProperties: 0,
    rejectionReasons: []
  }
}

/**
 * Incrémente les statistiques d'import
 * @param {string} stat - Le nom de la statistique à incrémenter
 * @param {number} amount - Le montant à ajouter (défaut: 1)
 */
export function incrementArmorImportStat(stat, amount = 1) {
  if (stat in armorImportStats && typeof armorImportStats[stat] === 'number') {
    armorImportStats[stat] += amount
  }
}

/**
 * Ajoute une raison de rejet aux statistiques
 * @param {string} reason - La raison du rejet
 */
export function addRejectionReason(reason) {
  armorImportStats.rejectionReasons.push(reason)
}