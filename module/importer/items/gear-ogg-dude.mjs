import { buildArmorImgWorldPath, buildItemImgSystemPath } from '../../settings/directories.mjs'
import OggDudeImporter from '../oggDude.mjs'
import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import { logger } from '../../utils/logger.mjs'
import {
  FLAG_STRICT_GEAR_VALIDATION,
  resetGearImportStats,
  incrementGearImportStat,
  addGearUnknownCategory,
  getGearImportStats,
} from '../utils/gear-import-utils.mjs'

/**
 * Normalize a numeric field value with validation and default fallback.
 * @param {*} value Raw value from XML
 * @param {number} defaultValue Default fallback value
 * @param {number} min Minimum allowed value
 * @param {number} max Maximum allowed value (optional)
 * @returns {number} Normalized valid number
 */
function normalizeGearNumericField(value, defaultValue, min = 0, max = undefined) {
  // Check if original value is invalid before calling mapOptionalNumber
  if (value === undefined || value === null || value === '') {
    logger.debug('[GearImporter] Normalizing missing numeric value', {
      originalValue: value,
      defaultValue,
      min,
      max,
    })
    return defaultValue
  }

  // Check if string value would result in NaN when parsed
  if (typeof value === 'string' && Number.isNaN(Number.parseInt(value))) {
    logger.debug('[GearImporter] Normalizing invalid string numeric value', {
      originalValue: value,
      defaultValue,
      min,
      max,
    })
    return defaultValue
  }

  const numValue = OggDudeImporter.mapOptionalNumber(value)

  // Check if parsed value is out of bounds (including when 0 is below minimum)
  if (numValue < min || (max !== undefined && numValue > max)) {
    logger.debug('[GearImporter] Normalizing out-of-range numeric value', {
      originalValue: value,
      numValue,
      defaultValue,
      min,
      max,
    })
    return defaultValue
  }

  return Math.floor(numValue) // Ensure integer
}

/**
 * Validate a boolean field with proper fallback.
 * @param {*} value Raw value from XML
 * @param {boolean} defaultValue Default fallback value
 * @returns {boolean} Valid boolean value
 */
function validateGearBooleanField(value, defaultValue) {
  const boolValue = OggDudeImporter.mapOptionalBoolean(value)
  return boolValue === undefined ? defaultValue : boolValue
}

/**
 * Validate and normalize description field for HTML content.
 * @param {*} value Raw description value
 * @returns {string} Clean description string
 */
function normalizeGearDescription(value) {
  const description = OggDudeImporter.mapOptionalString(value)
  if (!description) {
    return ''
  }
  // Basic HTML cleaning - just ensure it's a string, more complex sanitization could be added
  return description.toString().trim()
}

/**
 * Validate gear category against available options.
 * @param {*} value Raw category/type value
 * @returns {string} Valid category string
 */
function validateGearCategory(value) {
  const category = OggDudeImporter.mapOptionalString(value)
  if (!category) {
    logger.debug('[GearImporter] Missing category, using default')
    return 'general'
  }
  // For now accept any non-empty string, could be enhanced with whitelist validation
  return category
}

/**
 * Build the system object for SwerpgGear from XML gear data.
 * @param {Object} xmlGear Raw XML gear object
 * @returns {Object} System object conforming to SwerpgGear schema
 */
function buildGearSystem(xmlGear) {
  try {
    // Extract and validate all fields with proper fallbacks
    const category = validateGearCategory(xmlGear.Type)
    const description = normalizeGearDescription(xmlGear.Description)
    const price = normalizeGearNumericField(xmlGear.Price, 0)
    const encumbrance = normalizeGearNumericField(xmlGear.Encumbrance, 1)
    const rarity = normalizeGearNumericField(xmlGear.Rarity, 1)
    const broken = validateGearBooleanField(xmlGear.Broken, false)

    logger.debug('[GearImporter] Built gear system object', {
      category,
      price,
      encumbrance,
      rarity,
      broken,
      descriptionLength: description.length,
    })

    return {
      category,
      quantity: 1, // Default for imported items
      price,
      quality: 'standard', // Default quality tier
      encumbrance,
      rarity,
      broken,
      description: {
        public: description,
        secret: '',
      },
      actions: [], // No actions defined in XML data
    }
  } catch (error) {
    logger.warn('[GearImporter] Error building gear system object, using fallback values', {
      error: error.message,
      xmlGear: xmlGear?.Key || 'unknown',
    })

    // Fallback to safe defaults on any error
    return {
      category: 'general',
      quantity: 1,
      price: 0,
      quality: 'standard',
      encumbrance: 1,
      rarity: 1,
      broken: false,
      description: {
        public: '',
        secret: '',
      },
      actions: [],
    }
  }
}

/**
 * Gear Array Mapper : Map the Gear XML data to SwerpgGear creation objects.
 * Only fields defined in SwerpgGear schema are produced in system.
 * @param {Array} gears Raw XML gear entries.
 * @returns {Array} Array of item source objects { name, type, system, flags }
 * @public
 * @function
 * @name gearMapper
 */
export function gearMapper(gears) {
  resetGearImportStats()
  const mapped = []
  for (const xmlGear of gears) {
    incrementGearImportStat('total')
    try {
      const name = OggDudeImporter.mapMandatoryString('gear.Name', xmlGear.Name)
      const key = OggDudeImporter.mapMandatoryString('gear.Key', xmlGear.Key)
      logger.debug('[GearImporter] Mapping gear', {
        key,
        name,
        hasType: !!xmlGear.Type,
        hasDescription: !!xmlGear.Description,
        hasPrice: !!xmlGear.Price,
        hasEncumbrance: !!xmlGear.Encumbrance,
        hasRarity: !!xmlGear.Rarity,
      })
      const originalType = OggDudeImporter.mapOptionalString(xmlGear.Type)
      const system = buildGearSystem(xmlGear)
      if (system.category === 'general' && originalType) {
        addGearUnknownCategory(originalType)
        if (FLAG_STRICT_GEAR_VALIDATION) {
          incrementGearImportStat('rejected')
          continue
        }
      }
      mapped.push({
        name,
        type: 'gear',
        system,
        flags: {
          swerpg: {
            oggdudeKey: key,
            ...(originalType && { originalType }),
          },
        },
      })
    } catch (e) {
      logger.warn(`Gear mapping failed for: ${xmlGear?.Name || 'unnamed'} - ${e.message}`)
      incrementGearImportStat('rejected')
    }
  }
  logger.info(`Gear import completed: ${mapped.length}/${getGearImportStats().total} gear imported`, {
    stats: getGearImportStats(),
  })
  return mapped
}

export { getGearImportStats } from '../utils/gear-import-utils.mjs'

/**
 * Build the Gear context for the importer process.
 * @param {*} zip
 * @param {*} groupByDirectory
 * @param {*} groupByType
 * @returns {{zip: {elementFileName: string, directories, content}, image: {images: (string|((buffer: Buffer, options?: ansiEscapes.ImageOptions) => string)|number|[OggDudeDataElement]|[OggDudeDataElement,OggDudeDataElement]|[OggDudeDataElement,OggDudeDataElement]|OggDudeContextImage|*), criteria: string, systemPath: string, worldPath: string}, folder: {name: string, type: string}, element: {jsonCriteria: string, mapper: *, type: string}}}
 * @public
 * @function
 */
export async function buildGearContext(zip, groupByDirectory, groupByType) {
  logger.debug('[GearImporter] Building Gear context', { groupByDirectoryCount: groupByDirectory.length, groupByType, hasZip: !!zip })

  return {
    jsonData: await OggDudeDataElement.buildJsonDataFromFile(zip, groupByDirectory, 'Gear.xml', 'Gears.Gear'),
    zip: {
      elementFileName: 'Gear.xml',
      content: zip,
      directories: groupByDirectory,
    },
    image: {
      criteria: 'Data/EquipmentImages/Gear',
      worldPath: buildArmorImgWorldPath('gears'),
      systemPath: buildItemImgSystemPath('gear.svg'),
      images: groupByType.image,
      prefix: 'Gear',
    },
    folder: {
      name: 'Swerpg - Gears',
      type: 'Item',
    },
    element: {
      jsonCriteria: 'Gears.Gear',
      mapper: gearMapper,
      type: 'gear',
    },
  }
}
