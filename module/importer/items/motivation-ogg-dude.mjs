import OggDudeImporter from '../oggDude.mjs'
import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import { logger } from '../../utils/logger.mjs'
import { buildItemImgSystemPath } from '../../settings/directories.mjs'
import { resetMotivationImportStats, incrementMotivationImportStat } from '../utils/motivation-import-utils.mjs'

/**
 * Motivation Mapper
 * @param motivations {Array} The Motivation data from the XML file.
 * @returns {Array} The SwerpgMotivation object array.
 */
export function motivationMapper(motivations) {
  resetMotivationImportStats()
  return motivations
    .map((xmlMotivation) => {
      incrementMotivationImportStat('total')
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

      const name = OggDudeImporter.mapMandatoryString('SpecificMotivation.Name', xmlMotivation?.Name)
      const key = OggDudeImporter.mapMandatoryString('SpecificMotivation.Key', xmlMotivation?.Key)

      if (!name || !key) {
        incrementMotivationImportStat('rejected')
        return null
      }

      incrementMotivationImportStat('success')

      return {
        name,
        description: OggDudeImporter.mapOptionalString(xmlMotivation?.Description),
        img: 'systems/swerpg/assets/images/icons/motivation.svg', // Default icon
        system: {
          description: OggDudeImporter.mapOptionalString(xmlMotivation?.Description),
          sources,
          category: OggDudeImporter.mapOptionalString(xmlMotivation?.Motivation),
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
 * Create the Motivation Context for the OggDude Data Import
 * @param zip
 * @param groupByDirectory
 * @param groupByType
 * @returns {Promise<Object>}
 */
export async function buildMotivationContext(zip, groupByDirectory, groupByType) {
  logger.debug('[MotivationImporter] Building Motivation context')

  return {
    jsonData: await OggDudeDataElement.buildJsonDataFromFile(zip, groupByDirectory, 'SpecificMotivations.xml', 'SpecificMotivations.SpecificMotivation'),
    zip: {
      folderName: 'Motivations',
      elementFileName: 'SpecificMotivations.xml',
      content: zip,
      directories: groupByDirectory,
    },
    image: {
      criteria: 'Data/MotivationImages', // Assuming images might be here or similar, though SpecificMotivations usually don't have images in OggDude
      worldPath: 'items/motivation',
      systemPath: buildItemImgSystemPath('motivation.svg'),
      images: groupByType.image,
      prefix: '',
    },
    folder: {
      name: 'Swerpg - Motivations',
      type: 'Item',
    },
    element: {
      jsonCriteria: 'SpecificMotivations.SpecificMotivation',
      mapper: motivationMapper,
      type: 'motivation',
    },
  }
}
