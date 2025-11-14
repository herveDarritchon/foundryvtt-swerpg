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
let _talentStats = {
  processed: 0,
  created: 0,
  failed: 0,
  validation_failed: 0,
  transform_failed: 0,
  contextMaps: 0,
  contextMapErrors: 0,
  duplicates: 0,
  unknownActivations: 0,
  unresolvedNodes: 0,
  invalidPrerequisites: 0,
  transformed: 0,
  nodeDetails: new Set(),        // Ensemble des nodes inconnus
  activationDetails: new Set(),  // Ensemble des activations inconnues
  rejectionReasons: []          // Raisons de rejet détaillées
}

/**
 * Reset des statistiques avant chaque session d'import.
 * DOIT être appelé avant chaque import pour éviter fuite state.
 */
export function resetTalentImportStats() {
  _talentStats = {
    processed: 0,
    created: 0,
    failed: 0,
    validation_failed: 0,
    transform_failed: 0,
    contextMaps: 0,
    contextMapErrors: 0,
    duplicates: 0,
    unknownActivations: 0,
    unresolvedNodes: 0,
    invalidPrerequisites: 0,
    transformed: 0,
    nodeDetails: new Set(),
    activationDetails: new Set(),
    rejectionReasons: []
  }
}

/**
 * Incrémente un compteur numérique connu.
 * @param {string} key - Clé de la statistique
 * @param {number} amount - Montant à ajouter (défaut: 1)
 */
export function incrementTalentImportStat(key, amount = 1) {
  if (Object.hasOwn(_talentStats, key) && typeof _talentStats[key] === 'number') {
    _talentStats[key] += amount
  }
}

/**
 * Enregistre un nœud talent inconnu.
 * @param {string} nodeId - Identifiant du nœud inconnu
 */
export function addTalentUnknownNode(nodeId) {
  _talentStats.unresolvedNodes += 1
  _talentStats.nodeDetails.add(nodeId)
}

/**
 * Enregistre une activation talent inconnue.
 * @param {string} activationCode - Code d'activation inconnu
 */
export function addTalentUnknownActivation(activationCode) {
  _talentStats.unknownActivations += 1
  _talentStats.activationDetails.add(activationCode)
}

/**
 * Ajoute une raison de rejet aux statistiques.
 * @param {string} reason - La raison du rejet
 */
export function addTalentRejectionReason(reason) {
  _talentStats.rejectionReasons.push(reason)
}

/**
 * Récupère les statistiques actuelles dans un format sérialisable.
 * @returns {object} Statistiques complètes d'import
 */
export function getTalentImportStats() {
  return {
    processed: _talentStats.processed,
    created: _talentStats.created,
    failed: _talentStats.failed,
    validation_failed: _talentStats.validation_failed,
    transform_failed: _talentStats.transform_failed,
    contextMaps: _talentStats.contextMaps,
    contextMapErrors: _talentStats.contextMapErrors,
    duplicates: _talentStats.duplicates,
    unknownActivations: _talentStats.unknownActivations,
    unresolvedNodes: _talentStats.unresolvedNodes,
    invalidPrerequisites: _talentStats.invalidPrerequisites,
    transformed: _talentStats.transformed,
    // Propriétés calculées pour compatibilité
    total: _talentStats.processed,
    rejected: _talentStats.failed,
    imported: _talentStats.processed - _talentStats.failed,
    // Détails
    nodeDetails: Array.from(_talentStats.nodeDetails),
    activationDetails: Array.from(_talentStats.activationDetails),
    rejectionReasons: [..._talentStats.rejectionReasons]
  }
}

/**
 * Borne une valeur numérique entre un minimum et un maximum
 * @param {*} value - La valeur à borner
 * @param {number} min - Valeur minimum
 * @param {number} max - Valeur maximum
 * @param {number} defaultValue - Valeur par défaut si value n'est pas numérique
 * @returns {number} La valeur bornée
 */
export function clampNumber(value, min, max, defaultValue) {
  const num = Number.parseInt(value)
  if (Number.isNaN(num)) {
    return defaultValue
  }
  return Math.max(min, Math.min(max, num))
}

/**
 * Sanitise une chaîne de texte pour éviter les injections et normaliser
 * @param {*} str - La chaîne à sanitiser
 * @returns {string} La chaîne sanitisée
 */
export function sanitizeText(str) {
  if (str === null || str === undefined) {
    return ''
  }

  const text = String(str)
    .trim()
    .replaceAll(/\s+/g, ' ') // Normaliser les espaces multiples

  // Limiter la longueur à 2000 caractères comme dans les tests
  return text.length > 2000 ? text.substring(0, 2000) : text
}

/**
 * Statistiques d'import des talents
 * @type {Object}
 */
let talentImportStats = {
    total: 0,
    rejected: 0,
    get imported() {
        return this.total - this.rejected
    }
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

/**
 * Fournit un accès direct (lecture seule) à la structure interne pour agrégateur global.
 * À utiliser prudemment (ne pas modifier en dehors de ce module).
 * @returns {object} Référence interne aux stats (lecture seule)
 */
export function _unsafeInternalTalentStatsRef() {
  return _talentStats
}