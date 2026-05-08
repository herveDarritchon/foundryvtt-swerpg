import { buildArmorImgWorldPath, buildItemImgSystemPath } from '../../settings/directories.mjs'
import OggDudeImporter from '../oggDude.mjs'
import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import { logger } from '../../utils/logger.mjs'
import { parseOggDudeBoolean } from '../mappings/oggdude-weapon-utils.mjs'
import {
  sanitizeOggDudeGearDescription,
  extractGearSourceInfo,
  formatGearSourceLine,
  slugifyGearCategory,
  extractBaseMods,
  extractWeaponProfile,
  composeGearDescription,
} from '../mappings/oggdude-gear-utils.mjs'
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
 * Build the system object for SwerpgGear from XML gear data.
 * @param {Object} xmlGear Raw XML gear object
 * @returns {Object} System object conforming to SwerpgGear schema
 */
function buildGearSystem(xmlGear, options = {}) {
  try {
    // Extract and validate all fields with proper fallbacks
    const category = options.category ?? slugifyGearCategory(xmlGear.Type)
    const sanitizedDescription = options.description ?? sanitizeOggDudeGearDescription(xmlGear.Description)
    const sourceInfo = options.sourceInfo ?? extractGearSourceInfo(xmlGear.Source)
    const sourceLine = options.sourceLine ?? formatGearSourceLine(sourceInfo)
    const baseModsLines = options.baseModsLines ?? []
    const weaponUseLines = options.weaponUseLines ?? []
    const description = composeGearDescription({
      baseDescription: sanitizedDescription,
      sourceLine,
      baseModsLines,
      weaponUseLines,
    })
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
      quantity: 1,
      price,
      quality: 'standard',
      restrictionLevel: options.restrictionLevel ?? 'none',
      encumbrance,
      rarity,
      broken,
      description: {
        public: description,
        secret: '',
      },
      actions: [],
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
      restrictionLevel: 'none',
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
      const sanitizedDescription = sanitizeOggDudeGearDescription(xmlGear.Description)
      const sourceInfo = extractGearSourceInfo(xmlGear.Source)
      const sourceLine = formatGearSourceLine(sourceInfo)
      const baseModsData = extractBaseMods(xmlGear.BaseMods)
      const weaponProfileData = extractWeaponProfile(xmlGear.WeaponModifiers)
      logger.debug('[GearImporter] Parsed BaseMods', {
        key,
        totalMods: baseModsData.metrics.totalMods,
        totalDieModifiers: baseModsData.metrics.totalDieModifiers,
      })
      logger.debug('[GearImporter] Parsed WeaponModifiers', {
        key,
        totalWeaponModifiers: weaponProfileData.metrics.totalWeaponModifiers,
        totalQualities: weaponProfileData.metrics.totalQualities,
        extraModifiers: weaponProfileData.metrics.extraModifiers,
      })

      const category = slugifyGearCategory(originalType)
      const isRestricted = parseOggDudeBoolean(xmlGear.Restricted)
      const system = buildGearSystem(xmlGear, {
        category,
        description: sanitizedDescription,
        sourceInfo,
        sourceLine,
        baseModsLines: baseModsData.descriptionLines,
        weaponUseLines: weaponProfileData.descriptionLines,
        restrictionLevel: isRestricted ? 'restricted' : 'none',
      })
      if (system.category === 'general' && originalType) {
        addGearUnknownCategory(originalType)
        if (FLAG_STRICT_GEAR_VALIDATION) {
          incrementGearImportStat('rejected')
          continue
        }
      }

      const swerpgFlags = {
        oggdudeKey: key,
        ...(originalType && { originalType }),
      }

      if (sourceInfo.name) {
        swerpgFlags.oggdudeSource = sourceInfo.name
      }
      if (sourceInfo.page !== null) {
        swerpgFlags.oggdudeSourcePage = sourceInfo.page
      }

      const oggdudeNested = {}
      if (originalType) {
        oggdudeNested.type = originalType
      }
      if (baseModsData.baseMods.length > 0) {
        oggdudeNested.baseMods = baseModsData.baseMods
      }
      if (weaponProfileData.weaponProfile) {
        oggdudeNested.weaponProfile = weaponProfileData.weaponProfile
      }
      const rawRestricted = xmlGear.Restricted
      if (rawRestricted !== undefined && rawRestricted !== null) {
        oggdudeNested.restricted = rawRestricted
      }
      if (Object.keys(oggdudeNested).length > 0) {
        swerpgFlags.oggdude = oggdudeNested
      }

      mapped.push({
        name,
        type: 'gear',
        system,
        flags: {
          swerpg: swerpgFlags,
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
