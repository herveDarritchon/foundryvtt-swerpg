import { buildArmorImgWorldPath, buildItemImgSystemPath } from '../../settings/directories.mjs'
import OggDudeImporter from '../oggDude.mjs'
import { buildMod, buildWeaponModifiers } from './combat-item-mapper.mjs'
import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import { logger } from '../../utils/logger.mjs'
import { SYSTEM } from '../../config/system.mjs'
import { WEAPON_SKILL_MAP, WEAPON_RANGE_MAP, WEAPON_QUALITY_MAP, WEAPON_HANDS_MAP, clampNumber, sanitizeText } from '../mappings/index-weapon.mjs'
import {
  FLAG_STRICT_WEAPON_VALIDATION,
  resetWeaponImportStats,
  getWeaponImportStats,
  incrementWeaponImportStat,
  addWeaponUnknownSkill,
  addWeaponUnknownQuality
} from '../utils/weapon-import-utils.mjs'

/**
 * Maps a single OggDude weapon XML object to SWERPG system format.
 * @param {Object} xmlWeapon - Raw weapon data from OggDude XML
 * @returns {Object|null} Mapped weapon object or null if invalid
 */
function mapOggDudeWeapon(xmlWeapon) {
  incrementWeaponImportStat('total')

  try {
    // Mapper skill via table de correspondance
    const skillCode = xmlWeapon.SkillKey
    const mappedSkill = WEAPON_SKILL_MAP[skillCode]

    if (!mappedSkill) {
      logger.warn(`Unknown skill code: ${skillCode}`, { category: 'WEAPON_IMPORT_INVALID' })
      addWeaponUnknownSkill(skillCode)
      if (FLAG_STRICT_WEAPON_VALIDATION) {
        incrementWeaponImportStat('rejected')
        return null
      }
    }

    // Mapper range (priorité RangeValue > Range)
    const rangeCode = xmlWeapon.RangeValue || xmlWeapon.Range
    const mappedRange = WEAPON_RANGE_MAP[rangeCode]

    if (!mappedRange) {
      logger.warn(`Unknown range code: ${rangeCode}`, { category: 'WEAPON_IMPORT_INVALID' })
      if (FLAG_STRICT_WEAPON_VALIDATION) {
        incrementWeaponImportStat('rejected')
        return null
      }
    }

    // Calculer damage combiné avec clamp
    const baseDamage = clampNumber(xmlWeapon.Damage, 0, 20, 0)
    const damageAdd = clampNumber(xmlWeapon.DamageAdd, 0, 20, 0)
    const totalDamage = clampNumber(baseDamage + damageAdd, 0, 20, 0)

    // Calculer crit avec clamp
    const crit = clampNumber(xmlWeapon.Crit, 0, 20, 0)

    // Mapper qualities avec déduplication
    const qualitySet = new Set()
    if (xmlWeapon.Qualities?.Quality) {
      const qualityArray = Array.isArray(xmlWeapon.Qualities.Quality) ? xmlWeapon.Qualities.Quality : [xmlWeapon.Qualities.Quality]

      for (const quality of qualityArray) {
        const qualityCode = quality.Key
        const mappedQuality = WEAPON_QUALITY_MAP[qualityCode] || qualityCode

        // Vérifier si qualité existe dans système
        if (!SYSTEM.WEAPON.QUALITIES[mappedQuality]) {
          logger.warn(`Unknown quality: ${qualityCode}`, { category: 'WEAPON_IMPORT_INVALID' })
          addWeaponUnknownQuality(qualityCode)
          continue
        }

        qualitySet.add(mappedQuality)

        // Log multi-count (ignoré pour Set)
        if (quality.Count > 1) {
          logger.debug(`MULTI_COUNT_IGNORED for quality ${qualityCode}: count=${quality.Count}`)
        }
      }
    }

    // Mapper slot via hands
    const handsCode = xmlWeapon.Hands
    const mappedSlot = WEAPON_HANDS_MAP[handsCode] || 'mainhand'

    // Valeurs numériques avec clamps
    const rarity = clampNumber(xmlWeapon.Rarity, 0, 20, 0)
    const price = clampNumber(xmlWeapon.Price, 0, Number.MAX_SAFE_INTEGER, 0)
    const encumbrance = clampNumber(xmlWeapon.Encumbrance, 0, Number.MAX_SAFE_INTEGER, 0)
    const hp = clampNumber(xmlWeapon.HP, 0, Number.MAX_SAFE_INTEGER, 0)

    // Construire objet final conforme au schéma
    const weaponObject = {
      name: sanitizeText(xmlWeapon.Name),
      type: 'weapon',
      img: null, // Sera résolu par buildWeaponContext
      system: {
        skill: mappedSkill,
        range: mappedRange,
        damage: totalDamage,
        crit: crit,
        qualities: Array.from(qualitySet).sort(), // Tri alphabétique pour déterminisme
        slot: mappedSlot,
        encumbrance: encumbrance,
        price: price,
        rarity: rarity,
        hp: hp,
        restricted: !!xmlWeapon.Restricted,
      },
    }

    // Log debug pour NoMelee
    if (xmlWeapon.NoMelee === true) {
      logger.debug(`NoMelee weapon detected: ${xmlWeapon.Name} with range: ${mappedRange}`)
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

// Export stats util for global metrics
export { getWeaponImportStats } from '../utils/weapon-import-utils.mjs'

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
