import { buildArmorImgWorldPath, buildItemImgSystemPath } from '../../settings/directories.mjs'
import OggDudeImporter from '../oggDude.mjs'
import { buildMod, buildWeaponModifiers } from './combat-item-mapper.mjs'
import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import { logger } from '../../utils/logger.mjs'
import { SYSTEM } from '../../config/system.mjs'
import {
  resolveArmorCategory,
  resolveArmorProperties
} from '../mappings/index-armor.mjs'
import {
  clampNumber,
  sanitizeText,
  FLAG_STRICT_ARMOR_VALIDATION,
  getArmorImportStats,
  incrementArmorImportStat,
  addRejectionReason
} from '../utils/armor-import-utils.mjs'

/**
 * Validation des données système d'une armure
 * @param {object} system - Les données système de l'armure
 * @returns {{valid: boolean, errors: string[]}} Résultat de la validation
 */
function validateArmorSystem(system) {
  const errors = []
  
  // Validation de la catégorie
  if (!system.category || typeof system.category !== 'string') {
    errors.push('Catégorie manquante ou invalide')
  } else if (!Object.keys(SYSTEM.ARMOR.CATEGORIES).includes(system.category)) {
    errors.push(`Catégorie non supportée: ${system.category}`)
  }
  
  // Validation defense.base
  if (typeof system.defense?.base !== 'number' || system.defense.base < 0 || !Number.isInteger(system.defense.base)) {
    errors.push('defense.base doit être un entier >= 0')
  }
  
  // Validation soak.base
  if (typeof system.soak?.base !== 'number' || system.soak.base < 0 || !Number.isInteger(system.soak.base)) {
    errors.push('soak.base doit être un entier >= 0')
  }
  
  // Validation properties (doit être un Set contenant uniquement des propriétés valides)
  if (system.properties instanceof Set) {
    const validProperties = Object.keys(SYSTEM.ARMOR.PROPERTIES)
    for (const prop of system.properties) {
      if (!validProperties.includes(prop)) {
        errors.push(`Propriété non supportée: ${prop}`)
      }
    }
  } else {
    errors.push('properties doit être un Set')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Résout la catégorie d'une armure avec gestion des erreurs et fallback
 */
function resolveArmorCategoryWithFallback(xmlCategories, armorName) {
  // Recherche de la première catégorie reconnue
  for (const xmlCategory of xmlCategories) {
    const resolvedCategory = resolveArmorCategory(xmlCategory)
    if (resolvedCategory) {
      return resolvedCategory
    }
  }
  
  // Gestion des catégories inconnues
  incrementArmorImportStat('unknownCategories')
  if (xmlCategories.length > 0) {
    logger.warn(`Catégorie d'armure inconnue pour "${armorName}": ${xmlCategories.join(', ')}`)
  }
  
  if (FLAG_STRICT_ARMOR_VALIDATION) {
    addRejectionReason('ARMOR_CATEGORY_UNKNOWN')
    incrementArmorImportStat('rejected')
    logger.warn(`Armure rejetée en mode strict: "${armorName}" - catégorie inconnue`)
    return null
  }
  
  return SYSTEM.ARMOR.DEFAULT_CATEGORY || 'medium'
}

/**
 * Traite les propriétés d'une armure avec limitation et tri
 */
function processArmorProperties(xmlCategories, armorName) {
  const { resolvedProperties, unknownProperties } = resolveArmorProperties(xmlCategories)
  
  if (unknownProperties.length > 0) {
    incrementArmorImportStat('unknownProperties', unknownProperties.length)
    logger.warn(`Propriétés d'armure inconnues pour "${armorName}": ${unknownProperties.join(', ')}`)
  }
  
  // Limitation et tri des propriétés
  const maxProperties = 12
  if (resolvedProperties.size > maxProperties) {
    logger.warn(`Trop de propriétés pour "${armorName}": ${resolvedProperties.size} > ${maxProperties}, troncature appliquée`)
    const sortedProperties = Array.from(resolvedProperties).sort((a, b) => a.localeCompare(b)).slice(0, maxProperties)
    return new Set(sortedProperties)
  }
  
  const sortedProperties = Array.from(resolvedProperties).sort((a, b) => a.localeCompare(b))
  return new Set(sortedProperties)
}

/**
 * Mappe les valeurs numériques avec validation
 */
function mapArmorNumericValues(xmlArmor, armorName) {
  const result = {}
  
  // Defense avec validation
  result.defenseValue = clampNumber(xmlArmor.Defense, 0, 100, 0)
  if (xmlArmor.Defense && (Number.isNaN(Number.parseInt(xmlArmor.Defense)) || Number.parseInt(xmlArmor.Defense) > 100)) {
    logger.warn(`Valeur Defense aberrante pour "${armorName}": ${xmlArmor.Defense}, clamped à ${result.defenseValue}`, { code: 'ARMOR_DEFENSE_SOAK_ABNORMAL' })
  }
  
  // Soak avec validation
  result.soakValue = clampNumber(xmlArmor.Soak, 0, 100, 0)
  if (xmlArmor.Soak && (Number.isNaN(Number.parseInt(xmlArmor.Soak)) || Number.parseInt(xmlArmor.Soak) > 100)) {
    logger.warn(`Valeur Soak aberrante pour "${armorName}": ${xmlArmor.Soak}, clamped à ${result.soakValue}`, { code: 'ARMOR_DEFENSE_SOAK_ABNORMAL' })
  }
  
  return result
}

/**
 * Mappe une armure XML OggDude vers un objet SwerpgArmor
 * @param {object} xmlArmor - Les données XML de l'armure
 * @returns {object|null} L'objet armure mappé ou null si rejeté
 */
function mapOggDudeArmor(xmlArmor) {
  incrementArmorImportStat('total')
  
  try {
    // Construction de la structure de base Foundry
    const armorData = {
      name: sanitizeText(OggDudeImporter.mapMandatoryString('armor.Name', xmlArmor.Name)),
      type: 'armor',
      img: buildItemImgSystemPath('armor.svg'), // Image par défaut, sera remplacée plus tard
      system: {}
    }
    
    // Mapping de la catégorie
    const xmlCategories = OggDudeImporter.mapOptionalArray(xmlArmor?.Categories?.Category, (cat) => cat) || []
    const category = resolveArmorCategoryWithFallback(xmlCategories, armorData.name)
    
    if (category === null) {
      return null // Rejeté en mode strict
    }
    
    armorData.system.category = category
    
    // Mapping des propriétés
    armorData.system.properties = processArmorProperties(xmlCategories, armorData.name)
    
    // Mapping des valeurs numériques
    const { defenseValue, soakValue } = mapArmorNumericValues(xmlArmor, armorData.name)
    armorData.system.defense = { base: defenseValue }
    armorData.system.soak = { base: soakValue }
    
    // Mapping des autres propriétés héritées
    armorData.system.encumbrance = clampNumber(xmlArmor.Encumbrance, 0, Number.MAX_SAFE_INTEGER, 0)
    armorData.system.price = clampNumber(xmlArmor.Price, 0, Number.MAX_SAFE_INTEGER, 0)
    armorData.system.rarity = clampNumber(xmlArmor.Rarity, 0, 20, 0)
    armorData.system.restricted = Boolean(xmlArmor.Restricted)
    
    // Mapping HP si supporté
    if (xmlArmor.HP !== undefined) {
      armorData.system.hp = clampNumber(xmlArmor.HP, 0, Number.MAX_SAFE_INTEGER, 0)
    }
    
    // Sanitisation de la description
    armorData.system.description = sanitizeText(OggDudeImporter.mapMandatoryString('armor.Description', xmlArmor.Description))
    
    // Validation finale
    const validation = validateArmorSystem(armorData.system)
    if (!validation.valid) {
      if (FLAG_STRICT_ARMOR_VALIDATION) {
        addRejectionReason('ARMOR_SYSTEM_INVALID')
        incrementArmorImportStat('rejected')
        logger.warn(`Armure rejetée en mode strict: "${armorData.name}" - validation échouée: ${validation.errors.join(', ')}`)
        return null
      } else {
        logger.warn(`Armure avec erreurs de validation: "${armorData.name}" - ${validation.errors.join(', ')}`)
      }
    }
    
    return armorData
    
  } catch (error) {
    logger.error(`Erreur lors du mapping de l'armure "${xmlArmor.Name || 'Unknown'}"`, error)
    addRejectionReason('ARMOR_MAPPING_ERROR')
    incrementArmorImportStat('rejected')
    return null
  }
}

/**
 * Armor Array Mapper : Map the Armor XML data to the SwerpgArmor object array.
 * @param armors {Array} The Armors data from the XML file.
 * @returns {Array} The SwerpgArmor object array.
 * @public
 * @function
 * @name armorMapper
 */
export function armorMapper(armors) {
  logger.debug(`[ArmorMapper] Mapping ${armors.length} armures`)
  
  const mappedArmors = armors
    .map(mapOggDudeArmor)
    .filter(armor => armor !== null) // Exclure les armures rejetées
  
  logger.debug(`[ArmorMapper] Mapping terminé: ${mappedArmors.length}/${armors.length} armures conservées`)
  
  // Export des statistiques finales pour observabilité
  const finalStats = getArmorImportStats()
  logger.debug('[ArmorMapper] Statistiques finales d\'import:', JSON.stringify(finalStats, null, 2))
  
  return mappedArmors
}

// Export des utilitaires pour les tests et le monitoring
export {
  getArmorImportStats,
  resetArmorImportStats
} from '../utils/armor-import-utils.mjs'

/**
 * Create the Armor Context for the OggDude Data Import
 * @param zip
 * @param groupByDirectory
 * @param groupByType
 * @returns {{zip: {elementFileName: string, directories, content}, image: {images: (string|((buffer: Buffer, options?: ansiEscapes.ImageOptions) => string)|number|[OggDudeDataElement]|[OggDudeDataElement,OggDudeDataElement]|[OggDudeDataElement,OggDudeDataElement]|OggDudeContextImage|*), criteria: string, systemPath: string, worldPath: string}, folder: {name: string, type: string}, element: {jsonCriteria: string, mapper: *, type: string}}}
 * @public
 * @function
 */
export async function buildArmorContext(zip, groupByDirectory, groupByType) {
  logger.debug('[ArmorImporter] Building Armor context', { groupByDirectoryCount: groupByDirectory.length, groupByType, hasZip: !!zip })

  return {
    jsonData: await OggDudeDataElement.buildJsonDataFromFile(zip, groupByDirectory, 'Armor.xml', 'Armors.Armor'),
    zip: {
      elementFileName: 'Armor.xml',
      content: zip,
      directories: groupByDirectory,
    },
    image: {
      criteria: 'Data/EquipmentImages/Armor',
      worldPath: buildArmorImgWorldPath('armors'),
      systemPath: buildItemImgSystemPath('armor.svg'),
      images: groupByType.image,
      prefix: 'Armor',
    },
    folder: {
      name: 'Swerpg - Armors',
      type: 'Item',
    },
    element: {
      jsonCriteria: 'Armors.Armor',
      mapper: armorMapper,
      type: 'armor',
    },
  }
}
