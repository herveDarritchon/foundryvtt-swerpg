/**
 * Mapper principal pour l'import des talents OggDude
 * Suit le pattern Strategy utilisé par armor-mapper, weapon-mapper, etc.
 */

import { logger } from '../../utils/logger.mjs'
import { incrementTalentImportStat } from '../utils/talent-import-utils.mjs'

// Mappings spécialisés
import { resolveTalentActivation } from '../mappings/oggdude-talent-activation-map.mjs'
import { resolveTalentNode } from '../mappings/oggdude-talent-node-map.mjs'
import { transformTalentPrerequisites, validateTalentPrerequisites } from '../mappings/oggdude-talent-prerequisite-map.mjs'
import { extractIsRanked, extractTalentTier, transformTalentRank } from '../mappings/oggdude-talent-rank-map.mjs'
import { createDefaultTalentAction, transformTalentActions, validateTalentActions } from '../mappings/oggdude-talent-actions-map.mjs'
import { assembleTalentDescription, extractTalentDieModifiers, extractTalentSource } from '../mappings/oggdude-talent-diemodifiers-map.mjs'

/**
 * Context Map Builder pour les talents OggDude
 * Implémente l'interface Strategy attendue par OggDude.mjs
 */
export class OggDudeTalentMapper {
  /**
   * Construit le contexte de mapping pour les talents OggDude
   * @param {object} oggDudeData - Données talents depuis OggDude
   * @param {object} options - Options d'import
   * @returns {Map<string, object>} Context map talent_key -> talent_data
   */
  static buildContextMap(oggDudeData, options = {}) {
    const contextMap = new Map()

    try {
      logger.info('[OggDudeTalentMapper] Building talent context map...')

      // Vérifier la structure des données
      const talents = this.extractTalentsData(oggDudeData)
      if (!talents || talents.length === 0) {
        logger.warn('[OggDudeTalentMapper] No talent data found in OggDude export')
        return contextMap
      }

      // Construire le contexte pour chaque talent
      for (const talentData of talents) {
        try {
          const context = this.buildSingleTalentContext(talentData, options)
          if (context && context.key) {
            contextMap.set(context.key, context)
            incrementTalentImportStat('processed')
          }
        } catch (error) {
          logger.error('[OggDudeTalentMapper] Error building talent context:', error)
          incrementTalentImportStat('failed')
        }
      }

      logger.info(`[OggDudeTalentMapper] Built context for ${contextMap.size} talents`)
      incrementTalentImportStat('contextMaps', contextMap.size)
    } catch (error) {
      logger.error('[OggDudeTalentMapper] Error building talent context map:', error)
      incrementTalentImportStat('contextMapErrors')
    }

    return contextMap
  }

  /**
   * Extrait les données talents depuis la structure OggDude
   * @param {object} oggDudeData - Données OggDude complètes
   * @returns {Array} Liste des talents
   * @private
   */
  static extractTalentsData(oggDudeData) {
    // Structure attendue: oggDudeData.Talents.Talent ou oggDudeData.DataSet.Talents.Talent
    let talents = null

    if (oggDudeData?.Talents?.Talent) {
      talents = oggDudeData.Talents.Talent
    } else if (oggDudeData?.DataSet?.Talents?.Talent) {
      talents = oggDudeData.DataSet.Talents.Talent
    } else if (oggDudeData?.Talent) {
      talents = oggDudeData.Talent
    }

    // Normaliser en tableau
    if (talents && !Array.isArray(talents)) {
      talents = [talents]
    }

    return talents || []
  }

  /**
   * Construit le contexte pour un talent individuel
   * @param {object} talentData - Données d'un talent OggDude
   * @param {object} options - Options d'import
   * @returns {object} Contexte de mapping
   * @private
   */
  static buildSingleTalentContext(talentData, options) {
    if (!talentData) return null

    try {
      // Clé unique du talent
      const key = this.generateTalentKey(talentData)
      const name = talentData.Name || talentData.TalentName || key

      // Construction du contexte avec toutes les transformations
      const context = {
        key,
        name,
        originalData: talentData,

        // Métadonnées
        source: talentData.Source || talentData.SourceBook || 'OggDude Import',
        custom: talentData.Custom === 'true' || talentData.IsCustom === 'true',

        // Données transformées
        activation: resolveTalentActivation(talentData.Activation || talentData.ActivationType),
        node: resolveTalentNode(talentData.NodeId || talentData.TalentNode, { name }),
        tier: extractTalentTier(talentData),
        isRanked: extractIsRanked(talentData),
        rank: transformTalentRank(talentData),

        // Textes
        description: this.extractDescription(talentData),
        sourceText: extractTalentSource(talentData),

        // DieModifiers
        dieModifiers: extractTalentDieModifiers(talentData),

        // Relations
        prerequisites: transformTalentPrerequisites(talentData.Prerequisites || talentData.Prereqs),

        // Actions (placeholder pour extension future)
        actions: transformTalentActions(talentData.Actions, { talentName: name }),

        // Options d'import
        options,
      }

      // Validation du contexte
      if (!this.validateTalentContext(context)) {
        logger.warn(`[OggDudeTalentMapper] Invalid context for talent: ${key}`)
        incrementTalentImportStat('validation_failed')
        return null
      }

      return context
    } catch (error) {
      logger.error('[OggDudeTalentMapper] Error building single talent context:', error)
      throw error
    }
  }

  /**
   * Génère une clé unique pour un talent
   * @param {object} talentData - Données du talent
   * @returns {string} Clé unique
   * @private
   */
  static generateTalentKey(talentData) {
    // Priorité: Key explicite > Name > fallback
    if (talentData.Key) return talentData.Key
    if (talentData.TalentKey) return talentData.TalentKey
    if (talentData.Name) return this.sanitizeKey(talentData.Name)
    if (talentData.TalentName) return this.sanitizeKey(talentData.TalentName)

    // Fallback avec timestamp
    return `talent_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
  }

  /**
   * Nettoie une chaîne pour créer une clé valide
   * @param {string} input - Chaîne à nettoyer
   * @returns {string} Clé nettoyée
   * @private
   */
  static sanitizeKey(input) {
    return String(input)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  }

  /**
   * Extrait et nettoie la description d'un talent
   * @param {object} talentData - Données du talent
   * @returns {string} Description nettoyée
   * @private
   */
  static extractDescription(talentData) {
    let description = ''

    // Sources possibles de description
    if (talentData.Description) {
      description = talentData.Description
    } else if (talentData.Text) {
      description = talentData.Text
    } else if (talentData.Summary) {
      description = talentData.Summary
    }

    // Nettoyage basique
    return String(description || '')
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 2000) // Limite de longueur
  }

  /**
   * Valide le contexte d'un talent
   * @param {object} context - Contexte à valider
   * @returns {boolean} True si valide
   * @private
   */
  static validateTalentContext(context) {
    // Validations essentielles
    if (!context.key || typeof context.key !== 'string') {
      logger.warn('[OggDudeTalentMapper] Missing or invalid key')
      return false
    }

    if (!context.name || typeof context.name !== 'string') {
      logger.warn('[OggDudeTalentMapper] Missing or invalid name')
      return false
    }

    // Validation des prérequis
    if (context.prerequisites && !validateTalentPrerequisites(context.prerequisites)) {
      logger.warn(`[OggDudeTalentMapper] Invalid prerequisites for talent: ${context.key}`)
      return false
    }

    // Validation des actions
    if (context.actions && !validateTalentActions(context.actions)) {
      logger.warn(`[OggDudeTalentMapper] Invalid actions for talent: ${context.key}`)
      return false
    }

    return true
  }

  /**
   * Transforme un contexte de talent en données SwerpgTalent
   * Méthode principale appelée par l'orchestrateur
   * @param {object} context - Contexte de mapping
   * @returns {object} Données pour création SwerpgTalent
   */
  static transform(context) {
    try {
      logger.debug(`[OggDudeTalentMapper] Transforming talent: ${context.key}`)

      // Assembler la description complète avec source et DieModifiers
      const enrichedDescription = assembleTalentDescription({
        baseDescription: context.description,
        source: context.sourceText,
        dieModifiers: context.dieModifiers,
        maxLength: 2000,
      })

      // Incrémenter stats si DieModifiers présents
      if (context.dieModifiers && context.dieModifiers.length > 0) {
        incrementTalentImportStat('dieModifiers')
      }

      // Structure de données SwerpgTalent
      const talentData = {
        name: context.name,
        type: 'talent',

        // Données système spécifiques
        system: {
          // Node et relations
          node: context.node,

          // Activation
          activation: context.activation || 'passive',

          // Rang et coût
          isRanked: context.isRanked || false,
          rank: context.rank || { idx: 1, cost: 5 },
          tier: context.tier || 1,

          // Textes - description enrichie
          description: enrichedDescription,
          source: context.source || 'OggDude Import',

          // Relations
          requirements: context.prerequisites || {},

          // Actions (tableau d'instances SwerpgAction)
          actions: this.finalizeActions(context),

          // Hooks d'acteur (vide par défaut)
          actorHooks: {},

          // Métadonnées d'import
          importMeta: {
            source: 'oggdude',
            originalKey: context.key,
            importedAt: new Date().toISOString(),
            custom: context.custom || false,
          },
        },

        // Flags pour traçabilité et données structurées
        flags: {
          swerpg: {
            oggdudeKey: context.key,
            oggdude: {
              dieModifiers: context.dieModifiers || [],
            },
          },
        },
      }

      incrementTalentImportStat('transformed')
      logger.debug(`[OggDudeTalentMapper] Successfully transformed talent: ${context.key}`)

      return talentData
    } catch (error) {
      logger.error(`[OggDudeTalentMapper] Error transforming talent ${context.key}:`, error)
      incrementTalentImportStat('transform_failed')
      throw error
    }
  }

  /**
   * Finalise le tableau d'actions pour un talent
   * @param {object} context - Contexte du talent
   * @returns {Array} Tableau d'actions finalisées
   * @private
   */
  static finalizeActions(context) {
    let actions = context.actions || []

    // Si aucune action spécifiée, créer une action par défaut
    if (!actions || actions.length === 0) {
      const defaultAction = createDefaultTalentAction({
        name: context.name,
        description: context.description,
      })

      if (defaultAction) {
        actions = [defaultAction]
      }
    }

    // Validation finale
    if (!validateTalentActions(actions)) {
      logger.warn(`[OggDudeTalentMapper] Actions validation failed for talent: ${context.key}`)
      actions = []
    }

    return actions
  }
}

// Export par défaut pour compatibilité
export default OggDudeTalentMapper
