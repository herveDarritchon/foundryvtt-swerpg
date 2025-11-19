/**
 * Mapping des DieModifiers depuis les talents OggDude
 * 
 * Extrait et formate les modificateurs de dés présents dans les talents OggDude
 * pour les rendre lisibles (description) et structurés (flags).
 */

import { logger } from '../../utils/logger.mjs'
import {sanitizeDescription} from "../utils/text.mjs";

/**
 * Champs supportés dans DieModifier OggDude
 * Basé sur l'analyse du fichier Talents.xml de OggDude
 */
const SUPPORTED_DIE_MODIFIER_FIELDS = Object.freeze([
  'SkillKey',
  'SetbackCount',
  'BoostCount',
  'AddSetbackCount',
  'RemoveSetbackCount',
  'UpgradeDifficultyCount',
  'DecreaseDifficultyCount',
  'UpgradeAbilityCount',
  'ApplyOnce',
  'SkillName',
  'CharacteristicType',
])

/**
 * Extrait les DieModifiers d'un talent OggDude
 * @param {object} talentData - Données du talent OggDude
 * @returns {Array<object>} Liste des DieModifiers normalisés
 */
export function extractTalentDieModifiers(talentData) {
  if (!talentData || typeof talentData !== 'object') {
    return []
  }

  try {
    // Chercher DieModifiers dans différentes structures possibles
    let dieModifiersData = null
    
    if (talentData.DieModifiers?.DieModifier) {
      dieModifiersData = talentData.DieModifiers.DieModifier
    } else if (talentData.DieModifier) {
      dieModifiersData = talentData.DieModifier
    }

    if (!dieModifiersData) {
      return []
    }

    // Normaliser en tableau
    const modifiers = Array.isArray(dieModifiersData) ? dieModifiersData : [dieModifiersData]

    // Transformer chaque modificateur
    return modifiers.map(modifier => normalizeDieModifier(modifier)).filter(Boolean)
  } catch (error) {
    logger.error('[TalentDieModifiersMap] Error extracting die modifiers:', error)
    return []
  }
}

/**
 * Normalise un DieModifier OggDude vers une structure standardisée
 * @param {object} modifierData - Données du modificateur brut
 * @returns {object|null} Modificateur normalisé ou null si invalide
 * @private
 */
function normalizeDieModifier(modifierData) {
  if (!modifierData || typeof modifierData !== 'object') {
    return null
  }

  const normalized = {}

  // Extraire les champs supportés
  for (const field of SUPPORTED_DIE_MODIFIER_FIELDS) {
    if (modifierData[field] !== undefined && modifierData[field] !== null) {
      // Normaliser les valeurs
      let value = modifierData[field]
      
      // Convertir les booléens string en boolean
      if (field === 'ApplyOnce') {
        if (typeof value === 'string') {
          value = value.toLowerCase() === 'true'
        } else {
          value = Boolean(value)
        }
      }
      
      // Convertir les nombres string en number
      if (field.includes('Count')) {
        const num = Number.parseInt(value, 10)
        if (!Number.isNaN(num)) {
          value = num
        }
      }
      
      // Normaliser les clés en camelCase
      const normalizedKey = field.charAt(0).toLowerCase() + field.slice(1)
      normalized[normalizedKey] = value
    }
  }

  // Valider qu'on a au moins une compétence ou caractéristique
  if (!normalized.skillKey && !normalized.skillName && !normalized.characteristicType) {
    logger.warn('[TalentDieModifiersMap] DieModifier without skill or characteristic:', modifierData)
    return null
  }

  return normalized
}

/**
 * Formate les DieModifiers pour affichage dans la description
 * @param {Array<object>} modifiers - Liste des modificateurs normalisés
 * @returns {string} Texte formaté pour la description
 */
export function formatTalentDieModifiersForDescription(modifiers) {
  if (!modifiers || modifiers.length === 0) {
    return ''
  }

  try {
    const lines = ['', 'Die Modifiers:']
    
    for (const modifier of modifiers) {
      const parts = []
      
      // Identifier la cible (skill ou characteristic)
      const target = modifier.skillKey || modifier.skillName || modifier.characteristicType || 'Unknown'
      parts.push(`Skill ${target}`)
      
      // Décrire les effets
      const effects = []
      
      if (modifier.setbackCount) {
        effects.push(`+${modifier.setbackCount} Setback ${modifier.setbackCount > 1 ? 'dice' : 'die'}`)
      }
      
      if (modifier.boostCount) {
        effects.push(`+${modifier.boostCount} Boost ${modifier.boostCount > 1 ? 'dice' : 'die'}`)
      }
      
      if (modifier.addSetbackCount) {
        effects.push(`Add ${modifier.addSetbackCount} Setback ${modifier.addSetbackCount > 1 ? 'dice' : 'die'}`)
      }
      
      if (modifier.removeSetbackCount) {
        effects.push(`Remove ${modifier.removeSetbackCount} Setback ${modifier.removeSetbackCount > 1 ? 'dice' : 'die'}`)
      }
      
      if (modifier.decreaseDifficultyCount) {
        effects.push(`Decrease difficulty by ${modifier.decreaseDifficultyCount}`)
      }
      
      if (modifier.upgradeDifficultyCount) {
        effects.push(`Upgrade difficulty ${modifier.upgradeDifficultyCount} ${modifier.upgradeDifficultyCount > 1 ? 'times' : 'time'}`)
      }
      
      if (modifier.upgradeAbilityCount) {
        effects.push(`Upgrade ability ${modifier.upgradeAbilityCount} ${modifier.upgradeAbilityCount > 1 ? 'times' : 'time'}`)
      }
      
      // Ajouter le modificateur Apply Once si présent
      if (modifier.applyOnce === true) {
        effects.push('(Apply once)')
      }
      
      // Assembler la ligne
      if (effects.length > 0) {
        parts.push(': ' + effects.join(', '))
      }
      
      lines.push(`- ${parts.join('')}.`)
    }
    
    return lines.join('\n')
  } catch (error) {
    logger.error('[TalentDieModifiersMap] Error formatting die modifiers:', error)
    return ''
  }
}

/**
 * Extrait les sources (livre + page) d'un talent OggDude
 * @param {object} talentData - Données du talent OggDude
 * @returns {string} Ligne de source formatée (ex: "Source: Unlimited Power, p.33")
 */
export function extractTalentSource(talentData) {
  if (!talentData || typeof talentData !== 'object') {
    return ''
  }

  try {
    // Chercher Sources dans différentes structures possibles
    let sourcesData = null
    
    if (talentData.Sources?.Source) {
      sourcesData = talentData.Sources.Source
    } else if (talentData.Source) {
      sourcesData = talentData.Source
    }

    if (!sourcesData) {
      return ''
    }

    // Normaliser en tableau
    const sources = Array.isArray(sourcesData) ? sourcesData : [sourcesData]
    
    // Prendre la première source avec page si disponible
    const primarySource = sources.find(s => s.Page !== undefined && s.Page !== null) || sources[0]
    
    if (!primarySource) {
      return ''
    }

    // Extraire le nom du livre
    let bookName = ''
    if (typeof primarySource === 'string') {
      bookName = primarySource
    } else if (primarySource._text) {
      bookName = primarySource._text
    } else if (primarySource.text) {
      bookName = primarySource.text
    } else if (primarySource.BookName) {
      bookName = primarySource.BookName
    }

    if (!bookName) {
      return ''
    }

    // Construire la ligne de source
    const parts = ['Source:', bookName.trim()]
    
    // Ajouter la page si présente
    if (primarySource.Page) {
      parts.push(`p.${primarySource.Page}`)
    }
    
    return parts.join(' ')
  } catch (error) {
    logger.error('[TalentDieModifiersMap] Error extracting source:', error)
    return ''
  }
}

/**
 * Assemble une description complète de talent avec toutes les informations
 * @param {object} options - Options d'assemblage
 * @param {string} options.baseDescription - Description de base du talent
 * @param {string} options.source - Ligne de source
 * @param {Array<object>} options.dieModifiers - Liste des DieModifiers
 * @param {number} options.maxLength - Longueur maximale (défaut: 2000)
 * @returns {string} Description complète assemblée
 */
export function assembleTalentDescription({ baseDescription = '', source = '', dieModifiers = [], maxLength = 2000 }) {
  try {
    const parts = []
    
    // Ajouter la description de base nettoyée
    if (baseDescription) {
      parts.push(sanitizeDescription(baseDescription, maxLength))
    }
    
    // Ajouter la source
    if (source) {
      parts.push(source)
    }
    
    // Ajouter les DieModifiers formatés
    if (dieModifiers && dieModifiers.length > 0) {
      const formattedModifiers = formatTalentDieModifiersForDescription(dieModifiers)
      if (formattedModifiers) {
        parts.push(formattedModifiers)
      }
    }
    
    // Assembler avec des retours à la ligne
    let assembled = parts.filter(Boolean).join('\n')
    
    // Vérifier la longueur totale et tronquer si nécessaire
    if (assembled.length > maxLength) {
      // Essayer de garder au moins les DieModifiers
      const dieModifiersText = formatTalentDieModifiersForDescription(dieModifiers)
      const sourceText = source || ''
      const reservedLength = dieModifiersText.length + sourceText.length + 10 // marge
      
      const availableForBase = maxLength - reservedLength
      if (availableForBase > 50) {
        // On peut garder une partie de la description de base
        const truncatedBase = sanitizeDescription(baseDescription, availableForBase)
        assembled = [truncatedBase, sourceText, dieModifiersText].filter(Boolean).join('\n')
      } else {
        // Prioriser DieModifiers et Source
        assembled = [sourceText, dieModifiersText].filter(Boolean).join('\n')
      }
      
      // Dernière vérification
      if (assembled.length > maxLength) {
        assembled = assembled.substring(0, maxLength - 3) + '...'
      }
    }
    
    return assembled
  } catch (error) {
    logger.error('[TalentDieModifiersMap] Error assembling description:', error)
    return sanitizeDescription(baseDescription, maxLength)
  }
}
