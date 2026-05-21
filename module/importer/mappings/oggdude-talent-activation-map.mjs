/**
 * Mapping des codes d'activation OggDude vers les valeurs système TALENT_ACTIVATION.
 * Le modèle talent SWERPG ne distingue que `passive`, `active` et `unspecified`.
 */

/**
 * Table de correspondance entre codes OggDude et activations système
 */
export const TALENT_ACTIVATION_MAP = Object.freeze({
  passive: 'passive',
  tapassive: 'passive',
  active: 'active',
  taactive: 'active',
  incidental: 'active',
  taincidental: 'active',
  taincidentaloot: 'active',
  maneuver: 'active',
  tamaneuver: 'active',
  action: 'active',
  taaction: 'active',
  reaction: 'active',
  tareaction: 'active',
  '': 'unspecified',
})

/**
 * Résout un code d'activation OggDude vers une activation système
 * @param {string} oggDudeCode - Code d'activation depuis OggDude XML
 * @returns {string} ID de l'activation système correspondante
 */
export function resolveTalentActivation(oggDudeCode) {
  const cleanCode = String(oggDudeCode ?? '').trim()
  const normalizedCode = cleanCode.toLowerCase()

  if (normalizedCode in TALENT_ACTIVATION_MAP) {
    return TALENT_ACTIVATION_MAP[normalizedCode]
  }

  // Contrat OggDude réel: `taPassive` est passif, toute autre valeur non vide est active.
  return cleanCode === '' ? 'unspecified' : 'active'
}

/**
 * Obtient la liste des codes d'activation OggDude supportés
 * @returns {string[]} Liste des codes supportés
 */
export function getSupportedTalentActivationCodes() {
  return Object.keys(TALENT_ACTIVATION_MAP).filter(Boolean)
}

/**
 * Vérifie si un code d'activation est supporté
 * @param {string} code - Code à vérifier
 * @returns {boolean} True si supporté
 */
export function isTalentActivationSupported(code) {
  const cleanCode = String(code || '').trim()
  return cleanCode === '' || typeof code === 'string'
}
