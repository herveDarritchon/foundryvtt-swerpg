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
  const requirements = {}
  
  if (!oggDudePrerequisites || typeof oggDudePrerequisites !== 'object') {
    return requirements
  }
  
  try {
    // Prérequis de caractéristiques (structure courante OggDude)
    if (oggDudePrerequisites.Attributes) {
      const attributes = oggDudePrerequisites.Attributes
      
      // Mapper les caractéristiques OggDude vers système
      const characteristicMap = {
        'Brawn': 'brawn',
        'Agility': 'agility', 
        'Intellect': 'intellect',
        'Cunning': 'cunning',
        'Willpower': 'willpower',
        'Presence': 'presence'
      }
      
      for (const [oggDudeAttr, systemAttr] of Object.entries(characteristicMap)) {
        if (attributes[oggDudeAttr] && Number.isFinite(parseInt(attributes[oggDudeAttr]))) {
          requirements[`abilities.${systemAttr}.value`] = parseInt(attributes[oggDudeAttr])
        }
      }
    }
    
    // Prérequis de niveau/tier
    if (oggDudePrerequisites.Level && Number.isFinite(parseInt(oggDudePrerequisites.Level))) {
      requirements['advancement.level'] = parseInt(oggDudePrerequisites.Level)
    }
    
    // Prérequis d'expérience
    if (oggDudePrerequisites.Experience && Number.isFinite(parseInt(oggDudePrerequisites.Experience))) {
      requirements['advancement.experience'] = parseInt(oggDudePrerequisites.Experience)
    }
    
    // Prérequis de compétences
    if (oggDudePrerequisites.Skills) {
      const skills = Array.isArray(oggDudePrerequisites.Skills) 
        ? oggDudePrerequisites.Skills 
        : [oggDudePrerequisites.Skills]
        
      for (const skill of skills) {
        if (skill.Key && skill.Rank && Number.isFinite(parseInt(skill.Rank))) {
          // Mapper le code compétence OggDude vers système (simplification)
          const skillKey = mapOggDudeSkillToSystem(skill.Key)
          if (skillKey) {
            requirements[`skills.${skillKey}.rank`] = parseInt(skill.Rank)
          }
        }
      }
    }
    
    // Prérequis de talents (autres talents requis)
    if (oggDudePrerequisites.Talents) {
      const talents = Array.isArray(oggDudePrerequisites.Talents)
        ? oggDudePrerequisites.Talents
        : [oggDudePrerequisites.Talents]
        
      for (const talent of talents) {
        if (talent.Key) {
          // Pour l'instant, on stocke juste la référence
          // L'implémentation complète nécessiterait une résolution des dépendances
          requirements[`talent.${talent.Key}`] = talent.Rank || 1
        }
      }
    }
    
  } catch (error) {
    logger.warn('[TalentPrerequisiteMap] Error transforming prerequisites:', error)
  }
  
  return requirements
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

/**
 * Valide une structure de prérequis
 * @param {object} requirements - Structure requirements à valider
 * @returns {boolean} True si valide
 */
export function validateTalentPrerequisites(requirements) {
  if (!requirements || typeof requirements !== 'object') {
    return false
  }
  
  // Vérifier que toutes les valeurs sont numériques et positives
  for (const [key, value] of Object.entries(requirements)) {
    if (!Number.isFinite(value) || value < 0) {
      logger.warn(`[TalentPrerequisiteMap] Invalid prerequisite value for "${key}": ${value}`)
      return false
    }
    
    // Vérifier la structure des clés
    if (!key.includes('.') && !key.startsWith('talent.')) {
      logger.warn(`[TalentPrerequisiteMap] Invalid prerequisite key format: "${key}"`)
      return false
    }
  }
  
  return true
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