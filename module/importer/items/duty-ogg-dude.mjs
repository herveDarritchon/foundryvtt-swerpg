import OggDudeImporter from '../oggDude.mjs'
import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import { logger } from '../../utils/logger.mjs'
import { buildItemImgSystemPath } from '../../settings/directories.mjs'
import { resetDutyImportStats, incrementDutyImportStat } from '../utils/duty-import-utils.mjs'

/**
 * Duty Mapper
 * @param duties {Array} The Duty data from the XML file.
 * @returns {Array} The SwerpgDuty object array.
 */
export function dutyMapper(duties) {
  resetDutyImportStats()
  return duties
    .map((xmlDuty) => {
      incrementDutyImportStat('total')
      const sources = OggDudeImporter.mapOptionalArray(xmlDuty?.Sources?.Source, (source) => ({
        book: OggDudeImporter.mapOptionalString(source?._),
        page: OggDudeImporter.mapOptionalString(source?.Page),
      }))
      // Handle single source case if not in Sources list
      if (xmlDuty?.Source) {
        sources.push({
          book: OggDudeImporter.mapOptionalString(xmlDuty.Source?._),
          page: OggDudeImporter.mapOptionalString(xmlDuty.Source?.Page),
        })
      }

      const name = OggDudeImporter.mapMandatoryString('Duty.Name', xmlDuty?.Name)
      const key = OggDudeImporter.mapMandatoryString('Duty.Key', xmlDuty?.Key)

      if (!name || !key) {
        incrementDutyImportStat('rejected')
        return null
      }

      incrementDutyImportStat('success')

      return {
        name,
        type: 'duty',
        img: 'systems/swerpg/assets/images/icons/duty.svg', // Default icon
        system: {
          description: OggDudeImporter.mapOptionalString(xmlDuty?.Description),
          sources,
          category: '', // Duty doesn't seem to have a category in the XML provided
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
 * Create the Duty Context for the OggDude Data Import
 * @param zip
 * @param groupByDirectory
 * @param groupByType
 * @returns {Promise<Object>}
 */
export async function buildDutyContext(zip, groupByDirectory, groupByType) {
  logger.debug('[DutyImporter] Building Duty context')

  return {
    jsonData: await OggDudeDataElement.buildJsonDataFromFile(zip, groupByDirectory, 'Duty.xml', 'Duties.Duty'),
    zip: {
      folderName: 'Duties',
      elementFileName: 'Duty.xml',
      content: zip,
      directories: groupByDirectory,
    },
    image: {
      criteria: 'Data/DutyImages',
      worldPath: 'items/duty',
      systemPath: buildItemImgSystemPath('duty.svg'),
      images: groupByType.image,
      prefix: '',
    },
    folder: {
      name: 'Swerpg - Duties',
      type: 'Item',
    },
    element: {
      jsonCriteria: 'Duties.Duty',
      mapper: dutyMapper,
      type: 'duty',
    },
  }
}
