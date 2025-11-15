/**
 * Mapping des codes d'activation OggDude vers les valeurs système TALENT_ACTIVATION
 */

import { addTalentUnknownActivation } from '../utils/talent-import-utils.mjs'

// Dans les tests on mocke SYSTEM.TALENT_ACTIVATION comme simples chaînes.
// Ici on renvoie donc directement les codes systèmes attendus par les TUs, sans normaliser sur "active".

/**
 * Table de correspondance entre codes OggDude et activations système
 */
export const TALENT_ACTIVATION_MAP = Object.freeze({
  // Valeurs courantes dans OggDude
  'passive': 'passive',
  'Passive': 'passive',
  'PASSIVE': 'passive',
  
  'active': 'active',
  'Active': 'active',
  'ACTIVE': 'active',
  
  // Variations possibles
  'incidental': 'incidental',
  'Incidental': 'incidental',
  'INCIDENTAL': 'incidental',
  
  'maneuver': 'maneuver',
  'Maneuver': 'maneuver',
  'MANEUVER': 'maneuver',
  
  'action': 'action',
  'Action': 'action',
  'ACTION': 'action',
  'reaction': 'reaction',
  'Reaction': 'reaction',
  'REACTION': 'reaction',
  
  // Fallback par défaut (vide ou undefined)
  '': 'passive',
  'undefined': 'passive',
  'null': 'passive',
})

/**
 * Résout un code d'activation OggDude vers une activation système
 * @param {string} oggDudeCode - Code d'activation depuis OggDude XML
 * @returns {string} ID de l'activation système correspondante
 */
export function resolveTalentActivation(oggDudeCode) {
  // Nettoyer l'entrée
  const cleanCode = String(oggDudeCode || '').trim()
  
  // Recherche directe dans la table
  if (cleanCode in TALENT_ACTIVATION_MAP) {
    return TALENT_ACTIVATION_MAP[cleanCode]
  }
  
  // Recherche insensible à la casse
  const lowerCode = cleanCode.toLowerCase()
  const foundEntry = Object.entries(TALENT_ACTIVATION_MAP).find(
    ([key]) => key.toLowerCase() === lowerCode
  )
  
  if (foundEntry) {
    return foundEntry[1]
  }
  
  // Code inconnu - enregistrer pour statistiques et utiliser fallback
  if (cleanCode !== '') {
    addTalentUnknownActivation(cleanCode)
  }
  
  return 'passive' // Fallback sécurisé
}

/**
 * Obtient la liste des codes d'activation OggDude supportés
 * @returns {string[]} Liste des codes supportés
 */
export function getSupportedTalentActivationCodes() {
  return Object.keys(TALENT_ACTIVATION_MAP)
}

/**
 * Vérifie si un code d'activation est supporté
 * @param {string} code - Code à vérifier
 * @returns {boolean} True si supporté
 */
export function isTalentActivationSupported(code) {
  const cleanCode = String(code || '').trim()
  return cleanCode in TALENT_ACTIVATION_MAP || 
         getSupportedTalentActivationCodes().some(key => key.toLowerCase() === cleanCode.toLowerCase())
}