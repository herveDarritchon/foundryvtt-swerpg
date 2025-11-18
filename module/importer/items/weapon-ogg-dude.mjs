import { buildArmorImgWorldPath, buildItemImgSystemPath } from '../../settings/directories.mjs'
import OggDudeImporter from '../oggDude.mjs'
import { buildMod, buildWeaponModifiers } from './combat-item-mapper.mjs'
import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import { logger } from '../../utils/logger.mjs'
import { SYSTEM } from '../../config/system.mjs'
import {
  WEAPON_SKILL_MAP,
  WEAPON_RANGE_MAP,
  WEAPON_QUALITY_MAP,
  WEAPON_HANDS_MAP,
  clampNumber,
  sanitizeText,
  parseOggDudeBoolean,
  sanitizeOggDudeWeaponDescription,
} from '../mappings/index-weapon.mjs'
import {
  FLAG_STRICT_WEAPON_VALIDATION,
  resetWeaponImportStats,
  getWeaponImportStats,
  incrementWeaponImportStat,
  addWeaponUnknownSkill,
  addWeaponUnknownQuality,
} from '../utils/weapon-import-utils.mjs'

const DEFAULT_SKILL = 'rangedLight'
const DEFAULT_RANGE = 'medium'

function coerceQualityCount(value) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function normalizeDelimitedValues(input) {
  if (!input) {
    return []
  }

  return String(input)
    .split(/[;,/]/)
    .map((entry) => sanitizeText(entry))
    .map((entry) => entry.replace(/[\n\r]+/g, ' '))
    .map((entry) => entry.replace(/\s+/g, ' '))
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function normalizeCategoryValues(rawCategories) {
  if (!rawCategories) {
    return []
  }

  const categories = Array.isArray(rawCategories) ? rawCategories : [rawCategories]
  return categories
    .map((category) => {
      if (typeof category === 'string') {
        return sanitizeText(category)
      }
      if (category && typeof category === 'object') {
        return sanitizeText(category._ || category.Name || '')
      }
      return ''
    })
    .map((category) => category.replace(/[\n\r]+/g, ' '))
    .map((category) => category.replace(/\s+/g, ' '))
    .map((category) => category.trim())
    .filter(Boolean)
}

function normalizeSizeHigh(value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const numeric = Number.parseFloat(value)
  if (Number.isFinite(numeric)) {
    return numeric
  }

  const sanitized = sanitizeText(String(value))
  return sanitized || null
}

function extractSourceInfo(source) {
  if (!source) {
    return { name: '', page: null }
  }

  if (typeof source === 'string') {
    return { name: sanitizeText(source), page: null }
  }

  const name = sanitizeText(source._ || source.name || '')
  const pageRaw = source?.$?.Page ?? source?.page ?? source?.Page
  const pageNumber = Number.parseInt(pageRaw, 10)

  return {
    name,
    page: Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : null,
  }
}

/**
 * Maps a single OggDude weapon XML object to SWERPG system format.
 * @param {Object} xmlWeapon - Raw weapon data from OggDude XML
 * @returns {Object|null} Mapped weapon object or null if invalid
 */
function mapOggDudeWeapon(xmlWeapon) {
  incrementWeaponImportStat('total')

  try {
    const name = sanitizeText(xmlWeapon.Name)
    const oggdudeKey = sanitizeText(xmlWeapon.Key || '')

    const skillCode = xmlWeapon.SkillKey
    let mappedSkill = WEAPON_SKILL_MAP[skillCode]
    if (!mappedSkill) {
      const fallbackSkillCode = skillCode ?? 'UNDEFINED_SKILL'
      logger.warn(`Unknown skill code: ${fallbackSkillCode}`, { category: 'WEAPON_IMPORT_INVALID' })
      addWeaponUnknownSkill(fallbackSkillCode)
      if (FLAG_STRICT_WEAPON_VALIDATION) {
        incrementWeaponImportStat('rejected')
        return null
      }
      mappedSkill = DEFAULT_SKILL
    }

    const rangeCode = xmlWeapon.RangeValue || xmlWeapon.Range
    let mappedRange = WEAPON_RANGE_MAP[rangeCode]
    if (!mappedRange) {
      const fallbackRangeCode = rangeCode ?? 'UNDEFINED_RANGE'
      logger.warn(`Unknown range code: ${fallbackRangeCode}`, { category: 'WEAPON_IMPORT_INVALID' })
      if (FLAG_STRICT_WEAPON_VALIDATION) {
        incrementWeaponImportStat('rejected')
        return null
      }
      mappedRange = DEFAULT_RANGE
    }

    const baseDamage = clampNumber(xmlWeapon.Damage, 0, 20, 0)
    const damageAdd = clampNumber(xmlWeapon.DamageAdd, 0, 20, 0)
    const totalDamage = clampNumber(baseDamage + damageAdd, 0, 20, 0)
    const crit = clampNumber(xmlWeapon.Crit, 0, 20, 0)

    const qualityCounts = new Map()
    if (xmlWeapon.Qualities?.Quality) {
      const qualityArray = Array.isArray(xmlWeapon.Qualities.Quality) ? xmlWeapon.Qualities.Quality : [xmlWeapon.Qualities.Quality]

      for (const quality of qualityArray) {
        const qualityCode = quality?.Key ?? quality
        if (!qualityCode) {
          continue
        }

        const sanitizedQualityCode = sanitizeText(qualityCode)
        const mappedQuality =
          WEAPON_QUALITY_MAP[qualityCode] ||
          WEAPON_QUALITY_MAP[sanitizedQualityCode] ||
          sanitizedQualityCode.toLowerCase()

        if (!SYSTEM.WEAPON.QUALITIES[mappedQuality]) {
          logger.warn(`Unknown quality: ${qualityCode}`, { category: 'WEAPON_IMPORT_INVALID' })
          addWeaponUnknownQuality(String(qualityCode))
          continue
        }

        const count = coerceQualityCount(quality?.Count ?? quality?.count)
        const existingCount = qualityCounts.get(mappedQuality) ?? 0
        qualityCounts.set(mappedQuality, existingCount + count)
      }
    }

    const qualities = Array.from(qualityCounts.keys()).sort()
    const oggdudeQualities = Array.from(qualityCounts.entries())
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => a.id.localeCompare(b.id))

    const handsCode = xmlWeapon.Hands
    const mappedSlot = WEAPON_HANDS_MAP[handsCode] || 'mainhand'

    const rarity = clampNumber(xmlWeapon.Rarity, 0, 20, 0)
    const price = clampNumber(xmlWeapon.Price, 0, Number.MAX_SAFE_INTEGER, 0)
    const encumbrance = clampNumber(xmlWeapon.Encumbrance, 0, Number.MAX_SAFE_INTEGER, 0)
    const hp = clampNumber(xmlWeapon.HP, 0, Number.MAX_SAFE_INTEGER, 0)

    const restricted = parseOggDudeBoolean(xmlWeapon.Restricted)
    const typeTags = normalizeDelimitedValues(xmlWeapon.Type)
    const categoryTags = normalizeCategoryValues(xmlWeapon?.Categories?.Category)
    const sizeHigh = normalizeSizeHigh(xmlWeapon.SizeHigh)
    const { name: sourceName, page: sourcePage } = extractSourceInfo(xmlWeapon.Source)

    let description = sanitizeOggDudeWeaponDescription(xmlWeapon.Description)
    if (sourceName) {
      const sourceLine = sourcePage ? `Source: ${sourceName}, p.${sourcePage}` : `Source: ${sourceName}`
      description = description ? `${description}\n\n${sourceLine}` : sourceLine
    }

    const oggdudeTags = []
    const tagKeySet = new Set()
    const registerTag = (type, value, label) => {
      if (!value) return
      const key = `${type}|${value.toLowerCase()}`
      if (tagKeySet.has(key)) return
      tagKeySet.add(key)
      oggdudeTags.push({ type, value, label })
    }

    typeTags.forEach((value) => registerTag('type', value, value))
    categoryTags.forEach((value) => registerTag('category', value, value))
    if (restricted) {
      registerTag('status', 'restricted', 'Restricted')
    }

    const flags = {
      swerpg: {
        oggdudeKey,
      },
    }

    if (oggdudeQualities.length > 0) {
      flags.swerpg.oggdudeQualities = oggdudeQualities
    }
    if (oggdudeTags.length > 0) {
      flags.swerpg.oggdudeTags = oggdudeTags
    }

    const oggdudeExtras = {}
    if (sizeHigh !== null) {
      oggdudeExtras.sizeHigh = sizeHigh
    }
    if (sourceName) {
      oggdudeExtras.source = {
        name: sourceName,
        page: sourcePage,
      }
    }
    if (Object.keys(oggdudeExtras).length > 0) {
      flags.swerpg.oggdude = oggdudeExtras
    }

    const weaponObject = {
      name: name || xmlWeapon.Name || 'Unnamed Weapon',
      type: 'weapon',
      img: null,
      system: {
        skill: mappedSkill,
        range: mappedRange,
        damage: totalDamage,
        crit,
        qualities,
        slot: mappedSlot,
        encumbrance,
        price,
        rarity,
        hp,
        restricted,
        description: {
          public: description,
          secret: '',
        },
        actions: [],
      },
      flags,
    }

    if (xmlWeapon.NoMelee === true) {
      logger.debug(`NoMelee weapon detected: ${weaponObject.name} with range: ${mappedRange}`)
    }

    return weaponObject
  } catch (error) {
    logger.warn(`Failed to map weapon ${xmlWeapon.Name || 'unnamed'}: ${error.message}`, {
      category: 'WEAPON_IMPORT_INVALID',
    })
    incrementWeaponImportStat('rejected')
    return null
  }
}

/**
 * Weapon Array Mapper : Map the Weapon XML data to the Swerpg Weapon object array.
 * @param weapons {Array} The Weapons data from the XML file.
 * @returns {Array} The Swerpg Weapon object array.
 * @public
 * @function
 * @name weaponMapper
 */
export function weaponMapper(weapons) {
  // Reset stats for new import session via util
  resetWeaponImportStats()
  const mappedWeapons = weapons.map(mapOggDudeWeapon).filter((weapon) => weapon !== null)
  logger.info(`Weapon import completed: ${mappedWeapons.length}/${getWeaponImportStats().total} weapons imported`, {
    stats: getWeaponImportStats(),
  })
  return mappedWeapons
}

// Export stats utils for global metrics and test resets
export { getWeaponImportStats, resetWeaponImportStats } from '../utils/weapon-import-utils.mjs'

/**
 * Create the Weapon Context for the OggDude Data Importer.
 * @param zip
 * @param groupByDirectory
 * @param groupByType
 * @returns {{zip: {elementFileName: string, directories, content}, image: {images: (string|((buffer: Buffer, options?: ansiEscapes.ImageOptions) => string)|number|[OggDudeDataElement]|[OggDudeDataElement,OggDudeDataElement]|[OggDudeDataElement,OggDudeDataElement]|OggDudeContextImage|*), criteria: string, systemPath: string, worldPath: string}, folder: {name: string, type: string}, element: {jsonCriteria: string, mapper: *, type: string}}}
 * @public
 * @function
 */
export async function buildWeaponContext(zip, groupByDirectory, groupByType) {
  logger.debug('Building Weapon with Zip, GroupByDirectory, GroupByType', zip, groupByDirectory, groupByType)

  return {
    jsonData: await OggDudeDataElement.buildJsonDataFromFile(zip, groupByDirectory, 'Weapons.xml', 'Weapons.Weapon'),
    zip: {
      elementFileName: 'Weapons.xml',
      content: zip,
      directories: groupByDirectory,
    },
    image: {
      criteria: 'Data/EquipmentImages/Weapon',
      worldPath: buildArmorImgWorldPath('weapons'),
      systemPath: buildItemImgSystemPath('weapon.svg'),
      images: groupByType.image,
      prefix: 'Weapon',
    },
    folder: {
      name: 'Swerpg - Weapons',
      type: 'Item',
    },
    element: {
      jsonCriteria: 'Weapons.Weapon',
      mapper: weaponMapper,
      type: 'weapon',
    },
  }
}
