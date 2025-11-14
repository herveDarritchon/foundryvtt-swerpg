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
  total: 0,
  rejected: 0,
  unknownNodes: 0,
  unknownActivations: 0,
  invalidTiers: 0,
  nodeDetails: new Set(),        // Ensemble des nodes inconnus
  activationDetails: new Set(),  // Ensemble des activations inconnues
  rejectionReasons: []           // Raisons de rejet détaillées
}

/**
 * Reset des statistiques avant chaque session d'import.
 * DOIT être appelé avant chaque import pour éviter fuite state.
 */
export function resetTalentImportStats() {
  _talentStats = {
    total: 0,
    rejected: 0,
    unknownNodes: 0,
    unknownActivations: 0,
    invalidTiers: 0,
    nodeDetails: new Set(),
    activationDetails: new Set(),
    rejectionReasons: []
  }
}

/**
 * Incrémente un compteur numérique connu.
 * @param {('total'|'rejected'|'unknownNodes'|'unknownActivations'|'invalidTiers')} key
 */
export function incrementTalentImportStat(key) {
  if (Object.prototype.hasOwnProperty.call(_talentStats, key) && typeof _talentStats[key] === 'number') {
    _talentStats[key] += 1
  }
}

/**
 * Enregistre un nœud talent inconnu.
 * @param {string} nodeId - Identifiant du nœud inconnu
 */
export function addTalentUnknownNode(nodeId) {
  _talentStats.unknownNodes += 1
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
 * @returns {{total:number,rejected:number,imported:number,unknownNodes:number,unknownActivations:number,invalidTiers:number,nodeDetails:string[],activationDetails:string[],rejectionReasons:string[]}}
 */
export function getTalentImportStats() {
  return {
    total: _talentStats.total,
    rejected: _talentStats.rejected,
    imported: _talentStats.total - _talentStats.rejected,
    unknownNodes: _talentStats.unknownNodes,
    unknownActivations: _talentStats.unknownActivations,
    invalidTiers: _talentStats.invalidTiers,
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
export function clampTalentTier(value, min = 0, max = 5, defaultValue = 0) {
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
export function sanitizeTalentText(str) {
  if (!str || typeof str !== 'string') {
    return ''
  }
  
  return str
    .trim()
    .replace(/<script/gi, '&lt;script')
    .replace(/<\/script>/gi, '&lt;/script&gt;')
    .replace(/javascript:/gi, '')
}

/**
 * Fournit un accès direct (lecture seule) à la structure interne pour agrégateur global.
 * À utiliser prudemment (ne pas modifier en dehors de ce module).
 * @returns {object} Référence interne aux stats (lecture seule)
 */
export function _unsafeInternalTalentStatsRef() {
  return _talentStats
}