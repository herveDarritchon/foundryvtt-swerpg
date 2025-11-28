import { buildItemImgSystemPath } from '../../settings/directories.mjs'
import OggDudeImporter from '../oggDude.mjs'
import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import { logger } from '../../utils/logger.mjs'
import { resetMotivationCategoryImportStats, incrementMotivationCategoryImportStat } from '../utils/motivation-import-utils.mjs'

/**
 * Motivation Category Mapper
 * @param motivations {Array} The Motivation data from the XML file.
 * @returns {Array} The SwerpgMotivationCategory object array.
 */
export function motivationCategoryMapper(motivations) {
  resetMotivationCategoryImportStats()
  return motivations
    .map((xmlMotivation) => {
      incrementMotivationCategoryImportStat('total')
      const sources = OggDudeImporter.mapOptionalArray(xmlMotivation?.Sources?.Source, (source) => ({
        book: OggDudeImporter.mapOptionalString(source?._),
        page: OggDudeImporter.mapOptionalString(source?.Page),
      }))
      // Handle single source case if not in Sources list (some files might have direct Source tag)
      if (xmlMotivation?.Source) {
        sources.push({
          book: OggDudeImporter.mapOptionalString(xmlMotivation.Source?._),
          page: OggDudeImporter.mapOptionalString(xmlMotivation.Source?.Page),
        })
      }

      const name = OggDudeImporter.mapMandatoryString('Motivation.Name', xmlMotivation?.Name)
      const key = OggDudeImporter.mapMandatoryString('Motivation.Key', xmlMotivation?.Key)

      if (!name || !key) {
        incrementMotivationCategoryImportStat('rejected')
        return null
      }

      return {
        name,
        description: OggDudeImporter.mapOptionalString(xmlMotivation?.Description),
        img: 'systems/swerpg/assets/images/icons/motivation-category.svg', // Default icon
        system: {
          description: OggDudeImporter.mapOptionalString(xmlMotivation?.Description),
          sources,
        },
        flags: {
          swerpg: {
            oggdudeKey: key,
          },
        },
      }
    })
    .filter(Boolean)
}

/**
 * Create the Motivation Category Context for the OggDude Data Import
 * @param zip
 * @param groupByDirectory
 * @param groupByType
 * @returns {Promise<Object>}
 */
export async function buildMotivationCategoryContext(zip, groupByDirectory, groupByType) {
  logger.debug('[MotivationCategoryImporter] Building Motivation Category context')

  return {
    jsonData: await OggDudeDataElement.buildJsonDataFromFile(zip, groupByDirectory, 'Motivations.xml', 'Motivations.Motivation'),
    zip: {
      folderName: 'Motivations',
      elementFileName: 'Motivations.xml',
      content: zip,
      directories: groupByDirectory,
    },
    image: {
      criteria: 'Data/MotivationImages',
      worldPath: 'items/motivation-category',
      systemPath: buildItemImgSystemPath('motivation-category.svg'),
      images: groupByType.image,
      prefix: '',
    },
    folder: {
      name: 'Swerpg - Motivation Categories',
      type: 'Item',
    },
    element: {
      jsonCriteria: 'Motivations.Motivation',
      mapper: motivationCategoryMapper,
      type: 'motivation-category',
    },
  }
}
