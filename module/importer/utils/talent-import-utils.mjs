import { ImportStats } from './import-stats.mjs'
import { clampNumber, sanitizeText } from './text.mjs'

// Re-export helpers for backward compatibility
export { clampNumber, sanitizeText }

/**
 * Utilitaires de statistiques pour l'import des talents OggDude
 * Fournit observabilité pour métriques globales et tests unitaires.
 */

/**
 * Mode strict pour validation talents (cohérent avec autres domaines)
 * En mode strict, les talents avec données invalides sont rejetés
 */
export const FLAG_STRICT_TALENT_VALIDATION = false

/**
 * Structure interne des statistiques d'import talent
 * @private
 */
const talentStats = new ImportStats({
  validation_failed: 0,
  transform_failed: 0,
  contextMaps: 0,
  contextMapErrors: 0,
  duplicates: 0,
  unknownActivations: 0,
  unresolvedNodes: 0,
  invalidPrerequisites: 0,
  transformed: 0,
  dieModifiers: 0,
})

/**
 * Reset des statistiques avant chaque session d'import.
 * DOIT être appelé avant chaque import pour éviter fuite state.
 */
export function resetTalentImportStats() {
  talentStats.reset({
    validation_failed: 0,
    transform_failed: 0,
    contextMaps: 0,
    contextMapErrors: 0,
    duplicates: 0,
    unknownActivations: 0,
    unresolvedNodes: 0,
    invalidPrerequisites: 0,
    transformed: 0,
    dieModifiers: 0,
  })
}

/**
 * Incrémente un compteur numérique connu.
 * @param {string} key - Clé de la statistique
 * @param {number} amount - Montant à ajouter (défaut: 1)
 */
export function incrementTalentImportStat(key, amount = 1) {
  talentStats.increment(key, amount)
}

/**
 * Enregistre un nœud talent inconnu.
 * @param {string} nodeId - Identifiant du nœud inconnu
 */
export function addTalentUnknownNode(nodeId) {
  talentStats.addDetail('unresolvedNodes', nodeId, 'nodeDetails')
}

/**
 * Enregistre une activation talent inconnue.
 * @param {string} activationCode - Code d'activation inconnu
 */
export function addTalentUnknownActivation(activationCode) {
  talentStats.addDetail('unknownActivations', activationCode, 'activationDetails')
}

/**
 * Ajoute une raison de rejet aux statistiques.
 * @param {string} reason - La raison du rejet
 */
export function addTalentRejectionReason(reason) {
  talentStats.addRejectionReason(reason)
}

/**
 * Récupère les statistiques actuelles dans un format sérialisable.
 * @returns {object} Statistiques complètes d'import
 */
export function getTalentImportStats() {
  return talentStats.getStats()
}

/**
 * Limite un tier de talent aux valeurs autorisées
 * @param {number} tier - Le tier à limiter
 * @returns {number} Le tier limité entre 0 et 5
 */
export function clampTalentTier(tier) {
  const numTier = Number(tier) || 0
  return Math.max(0, Math.min(5, numTier))
}

/**
 * Valide et nettoie un coût de talent
 * @param {number|string} cost - Le coût à valider
 * @returns {number} Le coût validé (minimum 0)
 */
export function validateTalentCost(cost) {
  const numCost = Number(cost) || 0
  return Math.max(0, numCost)
}

/**
 * Génère une clé unique pour un talent basée sur son nom
 * @param {string} name - Nom du talent
 * @returns {string} Clé unique
 */
export function generateTalentKey(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}
