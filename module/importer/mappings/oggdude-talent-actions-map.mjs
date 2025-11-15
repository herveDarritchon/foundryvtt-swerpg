/**
 * Mapping des actions de talents OggDude vers SwerpgAction
 */

import SwerpgAction from '../../models/action.mjs'
import { logger } from '../../utils/logger.mjs'

/**
 * Génère un ID unique pour une action de talent
 * @param {string} talentName - Nom du talent
 * @returns {string} ID unique
 */
function generateActionId(talentName) {
  const cleanName = String(talentName || 'talent')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')

  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 5)

  return `${cleanName}_${timestamp}_${random}`
}

/**
 * Transforme les actions OggDude vers un tableau d'instances SwerpgAction
 * @param {object|Array} oggDudeActions - Actions depuis OggDude XML
 * @param {object} context - Contexte du talent (nom, type, etc.)
 * @returns {SwerpgAction[]} Tableau d'actions système
 */
export function transformTalentActions(oggDudeActions, context = {}) {
  const actions = []

  if (!oggDudeActions) {
    return actions
  }

  try {
    // Normaliser en tableau
    const actionList = Array.isArray(oggDudeActions) ? oggDudeActions : [oggDudeActions]

    for (const actionData of actionList) {
      if (!actionData || typeof actionData !== 'object') continue

      const mappedAction = transformSingleTalentAction(actionData, context)
      if (mappedAction) {
        actions.push(mappedAction)
      }
    }
  } catch (error) {
    logger.warn('[TalentActionsMap] Error transforming actions:', error)
  }

  return actions
}

/**
 * Transforme une action individuelle OggDude vers SwerpgAction
 * @param {object} actionData - Données d'action OggDude
 * @param {object} context - Contexte du talent
 * @returns {SwerpgAction|null} Action transformée ou null
 * @private
 */
function transformSingleTalentAction(actionData, context) {
  try {
    // Structure basique d'une action talent
    const actionConfig = {
      type: 'talent',
      name: actionData.Name || actionData.ActionName || context.talentName || 'Talent Action',
      description: actionData.Description || actionData.Text || '',

      // Activation
      activation: {
        type: mapActionActivationType(actionData.ActivationType),
        cost: extractActionCost(actionData.Cost || actionData.ActivationCost),
      },

      // Ciblage
      target: {
        type: actionData.TargetType || 'self',
        value: actionData.TargetValue || 1,
      },

      // Durée
      duration: {
        type: actionData.DurationType || 'instant',
        value: actionData.DurationValue || 0,
      },

      // Portée
      range: {
        type: actionData.RangeType || 'self',
        value: actionData.RangeValue || 0,
      },
    }

    // Créer l'instance SwerpgAction
    const action = new SwerpgAction(actionConfig)

    logger.debug(`[TalentActionsMap] Mapped action: "${action.name}"`)
    return action
  } catch (error) {
    logger.warn('[TalentActionsMap] Error mapping single action:', error)
    return null
  }
}

/**
 * Mappe un type d'activation OggDude vers les types système
 * @param {string} oggDudeType - Type d'activation OggDude
 * @returns {string} Type d'activation système
 * @private
 */
function mapActionActivationType(oggDudeType) {
  const typeMap = {
    Passive: 'passive',
    passive: 'passive',
    Active: 'action',
    active: 'action',
    Action: 'action',
    action: 'action',
    Incidental: 'incidental',
    incidental: 'incidental',
    Maneuver: 'maneuver',
    maneuver: 'maneuver',
    Reaction: 'reaction',
    reaction: 'reaction',
  }

  return typeMap[oggDudeType] || 'passive'
}

/**
 * Extrait le coût d'activation d'une action
 * @param {object|string|number} costData - Données de coût OggDude
 * @returns {object} Structure de coût système
 * @private
 */
function extractActionCost(costData) {
  const defaultCost = { strain: 0, wounds: 0, advantage: 0, threat: 0 }

  if (!costData) return defaultCost

  // Coût simple (nombre)
  if (typeof costData === 'number') {
    return { ...defaultCost, strain: costData }
  }

  // Coût sous forme de chaîne (parse simple)
  if (typeof costData === 'string') {
    const strain = parseInt(costData) || 0
    return { ...defaultCost, strain }
  }

  // Coût complexe (objet)
  if (typeof costData === 'object') {
    return {
      strain: parseInt(costData.Strain || costData.strain) || 0,
      wounds: parseInt(costData.Wounds || costData.wounds) || 0,
      advantage: parseInt(costData.Advantage || costData.advantage) || 0,
      threat: parseInt(costData.Threat || costData.threat) || 0,
    }
  }

  return defaultCost
}

/**
 * Crée une action par défaut pour un talent sans actions spécifiées
 * @param {object} talentContext - Contexte du talent
 * @returns {SwerpgAction} Action par défaut
 */
export function createDefaultTalentAction(talentContext) {
  try {
    // Générer un ID unique pour l'action
    const actionId = generateActionId(talentContext.name || 'talent')

    const actionConfig = {
      id: actionId,
      type: 'talent',
      name: talentContext.name || 'Talent Effect',
      description: talentContext.description || 'This talent provides a passive benefit.',

      activation: {
        type: 'passive',
        cost: { strain: 0, wounds: 0, advantage: 0, threat: 0 },
      },

      target: { type: 'self', value: 1 },
      duration: { type: 'permanent', value: 0 },
      range: { type: 'self', value: 0 },
    }

    return new SwerpgAction(actionConfig)
  } catch (error) {
    logger.warn('[TalentActionsMap] Error creating default action:', error)
    return null
  }
}

/**
 * Valide un tableau d'actions transformées
 * @param {SwerpgAction[]} actions - Actions à valider
 * @returns {boolean} True si toutes les actions sont valides
 */
export function validateTalentActions(actions) {
  if (!Array.isArray(actions)) {
    return false
  }

  for (const action of actions) {
    if (!(action instanceof SwerpgAction)) {
      logger.warn('[TalentActionsMap] Invalid action instance:', action)
      return false
    }

    if (!action.name || typeof action.name !== 'string') {
      logger.warn('[TalentActionsMap] Action missing valid name:', action)
      return false
    }
  }

  return true
}

/**
 * Fusionne plusieurs listes d'actions en éliminant les doublons
 * @param {...SwerpgAction[]} actionLists - Listes d'actions à fusionner
 * @returns {SwerpgAction[]} Actions fusionnées et déduplicadas
 */
export function mergeTalentActions(...actionLists) {
  const merged = []
  const seenNames = new Set()

  for (const actionList of actionLists) {
    if (!Array.isArray(actionList)) continue

    for (const action of actionList) {
      if (!(action instanceof SwerpgAction)) continue

      // Déduplication basique par nom
      if (!seenNames.has(action.name)) {
        merged.push(action)
        seenNames.add(action.name)
      }
    }
  }

  return merged
}
