import { buildItemImgSystemPath } from '../../settings/directories.mjs'
import OggDudeImporter from '../oggDude.mjs'
import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import { logger } from '../../utils/logger.mjs'
import {
  resetObligationImportStats,
  incrementObligationImportStat,
  getObligationImportStats,
} from '../utils/obligation-import-utils.mjs'

/**
 * Map OggDude Obligation XML data to Foundry Item creation objects.
 * Obligations in the system have fields: description, value, isExtra, extraXp, extraCredits.
 * OggDude XML provides: Key, Name, Description, Source/Sources.
 * System defaults are applied for value (10), isExtra (false), extraXp (0), extraCredits (0).
 *
 * @param {Array} obligations - Raw XML obligation entries from OggDude data
 * @returns {Array} Array of item source objects { name, type, system, flags }
 * @public
 * @function
 * @name obligationMapper
 */
export function obligationMapper(obligations) {
  resetObligationImportStats()
  const mapped = []

  for (const xmlObligation of obligations) {
    incrementObligationImportStat('total')

    try {
      // Extract mandatory fields with validation
      const name = OggDudeImporter.mapMandatoryString('obligation.Name', xmlObligation.Name)
      const key = OggDudeImporter.mapMandatoryString('obligation.Key', xmlObligation.Key)

      // Skip if mandatory fields are missing
      if (!name || !key) {
        logger.warn('[ObligationImporter] Skipping obligation with missing mandatory fields', {
          name,
          key,
        })
        incrementObligationImportStat('rejected')
        continue
      }

      logger.debug('[ObligationImporter] Mapping obligation', {
        key,
        name,
        hasDescription: !!xmlObligation.Description,
        hasSource: !!xmlObligation.Source,
        hasSources: !!xmlObligation.Sources,
      })

      // Extract optional description
      const description = OggDudeImporter.mapOptionalString(xmlObligation.Description)

      // Build system object with schema defaults
      const system = {
        description,
        value: 10, // Default obligation value per schema
        isExtra: false, // Default: not an extra obligation
        extraXp: 0, // Default: no extra XP
        extraCredits: 0, // Default: no extra credits
      }

      // Build flags for traceability
      const swerpgFlags = {
        oggdudeKey: key,
      }

      // Store source information if available
      if (xmlObligation.Source) {
        swerpgFlags.oggdudeSource = OggDudeImporter.mapOptionalString(xmlObligation.Source)
      } else if (xmlObligation.Sources?.Source) {
        // Handle multiple sources - store as array
        const sources = Array.isArray(xmlObligation.Sources.Source)
          ? xmlObligation.Sources.Source
          : [xmlObligation.Sources.Source]
        swerpgFlags.oggdudeSources = sources.map((s) => OggDudeImporter.mapOptionalString(s))
      }

      const item = {
        name,
        type: 'obligation',
        system,
        flags: {
          swerpg: swerpgFlags,
        },
      }

      mapped.push(item)
      incrementObligationImportStat('imported')

      logger.debug('[ObligationImporter] Successfully mapped obligation', {
        key,
        name,
      })
    } catch (error) {
      logger.error('[ObligationImporter] Error mapping obligation', {
        name: xmlObligation?.Name || 'unknown',
        key: xmlObligation?.Key || 'unknown',
        error: error.message,
      })
      incrementObligationImportStat('rejected')
    }
  }

  const stats = getObligationImportStats()
  logger.info('[ObligationImporter] Import completed', {
    total: stats.total,
    imported: stats.imported,
    rejected: stats.rejected,
  })

  return mapped
}

export { getObligationImportStats } from '../utils/obligation-import-utils.mjs'

/**
 * Build the Obligation context for the importer process.
 * Defines how to load, parse, and map Obligations.xml from OggDude data.
 *
 * @param {JSZip} zip - The OggDude ZIP archive
 * @param {Array} groupByDirectory - Elements grouped by directory path
 * @param {Object} groupByType - Elements grouped by file type
 * @returns {Promise<Object>} Context object with jsonData, zip, image, folder, and element configuration
 * @public
 * @function
 * @name buildObligationContext
 */
export async function buildObligationContext(zip, groupByDirectory, groupByType) {
  logger.debug('[ObligationImporter] Building Obligation context', {
    groupByDirectoryCount: groupByDirectory.length,
    hasZip: !!zip,
  })

  return {
    // Parse Obligations.xml from the ZIP archive
    jsonData: await OggDudeDataElement.buildJsonDataFromFile(zip, groupByDirectory, 'Obligations.xml', 'Obligations.Obligation'),

    // ZIP metadata
    zip: {
      elementFileName: 'Obligations.xml',
      content: zip,
      directories: groupByDirectory,
    },

    // Image configuration - obligations typically don't have custom images
    image: {
      criteria: 'Data/ObligationImages', // Unlikely to exist but kept for consistency
      worldPath: 'modules/swerpg/assets/images/obligations/',
      systemPath: buildItemImgSystemPath('obligation.svg'), // Fallback icon
      images: groupByType.image || [],
      prefix: 'Obligation',
    },

    // Foundry folder destination
    folder: {
      name: 'Swerpg - Obligations',
      type: 'Item',
    },

    // Mapping configuration
    element: {
      jsonCriteria: 'Obligations.Obligation',
      mapper: obligationMapper,
      type: 'obligation',
    },
  }
}
