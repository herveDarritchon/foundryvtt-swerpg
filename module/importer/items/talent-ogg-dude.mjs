/**
 * Context builder pour l'import des talents OggDude
 * Compatible avec l'architecture existante d'OggDude.mjs
 */

import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import { OggDudeTalentMapper } from '../mappers/oggdude-talent-mapper.mjs'
import { logger } from '../../utils/logger.mjs'
import { buildItemImgSystemPath } from '../../settings/directories.mjs'
import { resetTalentImportStats, incrementTalentImportStat } from '../utils/talent-import-utils.mjs'

/**
 * Mapper pour transformer les données talent OggDude en objets SwerpgTalent
 * Compatible avec OggDudeDataElement.processElements()
 * @param {object} oggDudeData - Données OggDude d'un talent individuel
 * @returns {object} Données formatées pour création Item Foundry
 */
function talentMapper(talents) {
  try {
    // Le mapper doit recevoir un tableau et retourner un tableau (pattern conforme aux autres mappers)
    if (!Array.isArray(talents)) {
      logger.warn('[TalentOggDude] Expected array of talents, got:', typeof talents)
      return []
    }
    
    // Réinitialiser les stats pour cette session d'import
    resetTalentImportStats()
    
    // Mapper chaque talent individuellement
    const mappedTalents = talents.map(oggDudeData => {
      try {
        // Créer un contexte pour le mapper
        const context = OggDudeTalentMapper.buildSingleTalentContext(oggDudeData, {})
        if (!context) {
          logger.warn('[TalentOggDude] Failed to build context for talent:', oggDudeData?.Name || 'Unknown')
          return null
        }
        
        // Transformer via le mapper principal
        const transformedData = OggDudeTalentMapper.transform(context)
        // Incrémenter les stats « processed » seulement si le contexte est valide et transformé
        incrementTalentImportStat('processed')
        
        logger.debug(`[TalentOggDude] Mapped talent: ${context.key}`)
        return transformedData
        
      } catch (error) {
        logger.error('[TalentOggDude] Error mapping individual talent:', error)
        // Comptabiliser l'échec de transformation
        incrementTalentImportStat('failed')
        return null
      }
    }).filter(talent => talent !== null) // Filtrer les éléments null
    // Consolider métrique contextMaps (parité avec buildContextMap())
    incrementTalentImportStat('contextMaps', mappedTalents.length)
    logger.info(`Talent import completed: ${mappedTalents.length}/${talents.length} talents imported`)
    return mappedTalents
    
  } catch (error) {
    logger.error('[TalentOggDude] Error in talent mapper:', error)
    return []
  }
}

/**
 * Construit le contexte d'import pour les talents OggDude
 * Compatible avec l'architecture de processOggDudeData()
 * @param {object} zip - Archive ZIP OggDude
 * @param {Array} groupByDirectory - Éléments groupés par répertoire  
 * @param {object} groupByType - Éléments groupés par type
 * @returns {Promise<object>} Contexte d'import structuré
 */
export async function buildTalentContext(zip, groupByDirectory, groupByType) {
  logger.debug('[TalentImporter] Building Talent context', { 
    groupByDirectoryCount: groupByDirectory.length, 
    groupByType: Object.keys(groupByType), 
    hasZip: !!zip 
  })

  return {
    jsonData: await OggDudeDataElement.buildJsonDataFromFile(zip, groupByDirectory, 'Talents.xml', 'Talents.Talent'),
    zip: {
      elementFileName: 'Talents.xml',
      content: zip,
      directories: groupByDirectory,
    },
    image: {
      criteria: 'Data/TalentImages', // Répertoire supposé pour les images de talents
      worldPath: 'modules/swerpg/assets/images/talents/', // Path par défaut
      systemPath: buildItemImgSystemPath('talent.svg'), // Icône par défaut
      images: groupByType.image || [],
      prefix: 'Talent',
    },
    folder: {
      name: 'Swerpg - Talents',
      type: 'Item',
    },
    element: {
      jsonCriteria: 'Talents.Talent',
      mapper: talentMapper,
      type: 'talent',
    },
  }
}

// Export stats utils for global metrics and test resets
export { getTalentImportStats, resetTalentImportStats } from '../utils/talent-import-utils.mjs'