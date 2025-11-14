/**
 * Context builder pour l'import des talents OggDude
 * Compatible avec l'architecture existante d'OggDude.mjs
 */

import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import { OggDudeTalentMapper } from '../mappers/oggdude-talent-mapper.mjs'
import { logger } from '../../utils/logger.mjs'
import { buildItemImgSystemPath } from '../../settings/directories.mjs'

/**
 * Mapper pour transformer les données talent OggDude en objets SwerpgTalent
 * Compatible avec OggDudeDataElement.processElements()
 * @param {object} oggDudeData - Données OggDude d'un talent individuel
 * @returns {object} Données formatées pour création Item Foundry
 */
function talentMapper(oggDudeData) {
  try {
    // Créer un contexte minimal pour le mapper
    const context = OggDudeTalentMapper.buildSingleTalentContext(oggDudeData, {})
    if (!context) {
      logger.warn('[TalentOggDude] Failed to build context for talent:', oggDudeData?.Name || 'Unknown')
      return null
    }
    
    // Transformer via le mapper principal
    const transformedData = OggDudeTalentMapper.transform(context)
    
    logger.debug(`[TalentOggDude] Mapped talent: ${transformedData.name}`)
    return transformedData
    
  } catch (error) {
    logger.error('[TalentOggDude] Error mapping talent:', error)
    return null
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