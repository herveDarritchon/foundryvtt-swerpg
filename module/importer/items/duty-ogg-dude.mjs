import OggDudeImporter from '../oggDude.mjs'
import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import { logger } from '../../utils/logger.mjs'
import { buildItemImgSystemPath } from '../../settings/directories.mjs'
import { resetDutyImportStats, incrementDutyImportStat, getDutyImportStats } from '../utils/duty-import-utils.mjs'
import { sanitizeDescription } from '../utils/text.mjs'

export function dutyMapper(duties) {
  resetDutyImportStats()
  if (!Array.isArray(duties)) {
    logger.warn('[DutyImporter] Invalid input: expected array', { duties })
    return []
  }
  const mapped = []
  for (const xmlDuty of duties) {
    if (!xmlDuty || typeof xmlDuty !== 'object') {
      incrementDutyImportStat('total')
      incrementDutyImportStat('rejected')
      continue
    }
    incrementDutyImportStat('total')

    try {
      const name = OggDudeImporter.mapMandatoryString('duty.Name', xmlDuty.Name)
      const key = OggDudeImporter.mapMandatoryString('duty.Key', xmlDuty.Key)

      if (!name || !key) {
        logger.warn('[DutyImporter] Skipping duty with missing mandatory fields', {
          name,
          key,
        })
        incrementDutyImportStat('rejected')
        continue
      }

      logger.debug('[DutyImporter] Mapping duty', {
        key,
        name,
        hasDescription: !!xmlDuty.Description,
      })

      const description = sanitizeDescription(OggDudeImporter.mapOptionalString(xmlDuty.Description))

      const sources = OggDudeImporter.mapOptionalArray(xmlDuty?.Sources?.Source, (source) => ({
        book: OggDudeImporter.mapOptionalString(source?._),
        page: OggDudeImporter.mapOptionalString(source?.Page),
      }))
      if (xmlDuty?.Source) {
        sources.push({
          book: OggDudeImporter.mapOptionalString(xmlDuty.Source?._),
          page: OggDudeImporter.mapOptionalString(xmlDuty.Source?.Page),
        })
      }

      const system = {
        description,
        value: 10,
        sources,
      }

      const swerpgFlags = {
        oggdudeKey: key,
      }

      const item = {
        name,
        type: 'duty',
        system,
        flags: {
          swerpg: swerpgFlags,
        },
      }

      mapped.push(item)
      incrementDutyImportStat('imported')

      logger.debug('[DutyImporter] Successfully mapped duty', {
        key,
        name,
      })
    } catch (error) {
      logger.error('[DutyImporter] Error mapping duty', {
        name: xmlDuty?.Name || 'unknown',
        key: xmlDuty?.Key || 'unknown',
        error: error.message,
      })
      incrementDutyImportStat('rejected')
    }
  }

  const stats = getDutyImportStats()
  logger.info('[DutyImporter] Import completed', {
    total: stats.total,
    imported: stats.imported,
    rejected: stats.rejected,
  })

  return mapped
}

export { getDutyImportStats } from '../utils/duty-import-utils.mjs'

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
