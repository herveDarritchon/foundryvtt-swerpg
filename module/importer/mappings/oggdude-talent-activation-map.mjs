/**
 * Mapping des codes d'activation OggDude vers les valeurs système TALENT_ACTIVATION
 */

import { SYSTEM } from '../../config/system.mjs'
import { addTalentUnknownActivation } from '../utils/talent-import-utils.mjs'

/**
 * Table de correspondance entre codes OggDude et activations système
 */
export const TALENT_ACTIVATION_MAP = Object.freeze({
  // Valeurs courantes dans OggDude
  'passive': SYSTEM.TALENT_ACTIVATION.passive.id,
  'Passive': SYSTEM.TALENT_ACTIVATION.passive.id,
  'PASSIVE': SYSTEM.TALENT_ACTIVATION.passive.id,
  
  'active': SYSTEM.TALENT_ACTIVATION.active.id,
  'Active': SYSTEM.TALENT_ACTIVATION.active.id,
  'ACTIVE': SYSTEM.TALENT_ACTIVATION.active.id,
  
  // Variations possibles
  'incidental': SYSTEM.TALENT_ACTIVATION.active.id,
  'Incidental': SYSTEM.TALENT_ACTIVATION.active.id,
  'INCIDENTAL': SYSTEM.TALENT_ACTIVATION.active.id,
  
  'maneuver': SYSTEM.TALENT_ACTIVATION.active.id,
  'Maneuver': SYSTEM.TALENT_ACTIVATION.active.id,
  'MANEUVER': SYSTEM.TALENT_ACTIVATION.active.id,
  
  'action': SYSTEM.TALENT_ACTIVATION.active.id,
  'Action': SYSTEM.TALENT_ACTIVATION.active.id,
  'ACTION': SYSTEM.TALENT_ACTIVATION.active.id,
  
  // Fallback par défaut (vide ou undefined)
  '': SYSTEM.TALENT_ACTIVATION.passive.id,
  'undefined': SYSTEM.TALENT_ACTIVATION.passive.id,
  'null': SYSTEM.TALENT_ACTIVATION.passive.id,
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
  
  return SYSTEM.TALENT_ACTIVATION.passive.id // Fallback sécurisé
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