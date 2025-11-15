/**
 * Mapping des prérequis OggDude vers la structure requirements du système
 */

import { logger } from '../../utils/logger.mjs'
import SwerpgTalentNode from '../../config/talent-tree.mjs'

/**
 * Transforme les prérequis XML OggDude vers la structure requirements système
 * @param {object} oggDudePrerequisites - Prérequis depuis OggDude XML
 * @returns {object} Structure requirements compatible système
 */
export function transformTalentPrerequisites(oggDudePrerequisites) {
  // Nouveau format attendu par les TUs: { characteristics: { brawn: 3 }, skills: { lightsaber: 2 } }
  const out = {}
  if (!oggDudePrerequisites || typeof oggDudePrerequisites !== 'object') return out

  try {
    // Format testé: CharacteristicRequirements.CharacteristicRequirement
    const charReq = oggDudePrerequisites.CharacteristicRequirements?.CharacteristicRequirement
    if (charReq && charReq.CharacteristicKey && charReq.MinValue) {
      const key = mapCharacteristicKey(charReq.CharacteristicKey)
      const value = parseInt(charReq.MinValue)
      if (key && Number.isFinite(value)) {
        out.characteristics ||= {}
        out.characteristics[key] = value
      }
    }

    // Format testé: SkillRequirements.SkillRequirement
    const skillReq = oggDudePrerequisites.SkillRequirements?.SkillRequirement
    if (skillReq && skillReq.SkillKey && skillReq.MinValue) {
      const key = mapSkillKey(skillReq.SkillKey)
      const value = parseInt(skillReq.MinValue)
      if (key && Number.isFinite(value)) {
        out.skills ||= {}
        out.skills[key] = value
      }
    }
  } catch (error) {
    logger.warn('[TalentPrerequisiteMap] Error transforming prerequisites:', error)
  }
  return out
}

/**
 * Mappe un code de compétence OggDude vers le système
 * @param {string} oggDudeSkillCode - Code compétence OggDude
 * @returns {string|null} Code compétence système ou null si inconnu
 * @private
 */
function mapOggDudeSkillToSystem(oggDudeSkillCode) {
  // Mapping basique des compétences courantes Star Wars FFG
  const skillMap = {
    'MELEE': 'melee',
    'RANGED': 'ranged', 
    'ATHLETICS': 'athletics',
    'COORDINATION': 'coordination',
    'DISCIPLINE': 'discipline',
    'LEADERSHIP': 'leadership',
    'VIGILANCE': 'vigilance',
    'COOL': 'cool',
    'SURVIVAL': 'survival',
    'MEDICINE': 'medicine',
    'PILOTING': 'piloting',
    'COMPUTERS': 'computers',
    'MECHANICS': 'mechanics',
    'STEALTH': 'stealth',
    'SKULDUGGERY': 'skulduggery',
    'DECEPTION': 'deception',
    'CHARM': 'charm',
    'NEGOTIATION': 'negotiation',
    'COERCION': 'coercion'
  }
  
  const upperCode = String(oggDudeSkillCode || '').toUpperCase()
  return skillMap[upperCode] || null
}

// Mapping minimal selon TUs
function mapCharacteristicKey(k) {
  const map = {
    Brawn: 'brawn',
    Agility: 'agility',
    Intellect: 'intellect',
    Cunning: 'cunning',
    Willpower: 'willpower',
    Presence: 'presence',
  }
  return map[k] || null
}

function mapSkillKey(k) {
  // Lightsaber non présent dans mapOggDudeSkillToSystem (spécifique SW), on renvoie lowercase simplifié
  return String(k || '').toLowerCase()
}

/**
 * Valide une structure de prérequis
 * @param {object} requirements - Structure requirements à valider
 * @returns {boolean} True si valide
 */
export function validateTalentPrerequisites(requirements) {
  if (!requirements || typeof requirements !== 'object') return false

  // Forme imbriquée (nouvelle)
  if (requirements.characteristics) {
    for (const v of Object.values(requirements.characteristics)) {
      if (!Number.isFinite(v) || v < 0) return false
    }
  }
  if (requirements.skills) {
    for (const v of Object.values(requirements.skills)) {
      if (!Number.isFinite(v) || v < 0) return false
    }
  }

  // Si aucune clé valide détectée, invalide
  const hasContent = (requirements.characteristics && Object.keys(requirements.characteristics).length) ||
    (requirements.skills && Object.keys(requirements.skills).length)
  // Les TUs considèrent un objet vide {} comme valide (aucun prérequis requis)
  if (!hasContent) {
    // Objet vide accepté
    if (Object.keys(requirements).length === 0) return true
  }
  return Boolean(hasContent)
}

/**
 * Prépare les prérequis pour l'affichage (utilise la méthode du système)
 * @param {object} requirements - Structure requirements
 * @returns {object} Prérequis préparés avec labels et métadonnées
 */
export function prepareTalentPrerequisitesForDisplay(requirements) {
  return SwerpgTalentNode.preparePrerequisites(requirements)
}

/**
 * Fusionne plusieurs structures de prérequis
 * @param {...object} requirementSets - Ensembles de prérequis à fusionner
 * @returns {object} Prérequis fusionnés (valeur max pour chaque clé)
 */
export function mergeTalentPrerequisites(...requirementSets) {
  const merged = {}
  
  for (const requirements of requirementSets) {
    if (!requirements || typeof requirements !== 'object') continue
    
    for (const [key, value] of Object.entries(requirements)) {
      if (Number.isFinite(value)) {
        merged[key] = Math.max(merged[key] || 0, value)
      }
    }
  }
  
  return merged
}