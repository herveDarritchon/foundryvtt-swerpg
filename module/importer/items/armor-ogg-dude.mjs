import { buildArmorImgWorldPath, buildItemImgSystemPath } from '../../settings/directories.mjs'
import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import { logger } from '../../utils/logger.mjs'
import { SYSTEM } from '../../config/system.mjs'
import { resolveArmorCategory, resolveArmorProperties, ARMOR_CATEGORY_MAP, ARMOR_PROPERTY_MAP } from '../mappings/index-armor.mjs'
import { getQualityConfig } from '../../config/qualities.mjs'
import {
  clampNumber,
  sanitizeText,
  FLAG_STRICT_ARMOR_VALIDATION,
  getArmorImportStats,
  incrementArmorImportStat,
  addRejectionReason,
  normalizeArmorCategoryTag,
  buildArmorDescription,
  extractBaseMods,
  resetArmorImportStats,
} from '../utils/armor-import-utils.mjs'
import { parseOggDudeBoolean } from '../mappings/oggdude-weapon-utils.mjs'

const DEFAULT_CATEGORY = 'medium'
const DEFAULT_SOAK = 2
const DEFAULT_DEFENSE = 0

/**
 * Résout la catégorie d'une armure avec gestion des erreurs et fallback
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
    errors,
  }
}

/**
 * Résout la catégorie d'une armure en ignorant les propriétés connues
 * @returns {string|null} La catégorie ou null si rejeté
 */
function resolveArmorCategoryWithFallback(xmlCategories, armorName) {
  // Catégories valides OggDude
  const VALID_CATEGORIES = new Set(['light', 'medium', 'heavy', 'natural', 'unarmored', '0', '1', '2', '3', '4'])
  // Propriétés connues qui ne sont PAS des catégories
  const KNOWN_PROPERTIES = new Set(['full body', 'hard full body', 'hard', 'resistant', 'sealable', 'sealed', 'powered', 'light', 'half body'])
  
  // Recherche de la première catégorie reconnue (Light/Medium/Heavy/Natural/Unarmored)
  for (const xmlCategory of xmlCategories) {
    const sanitized = xmlCategory?.trim()
    if (!sanitized) continue
    
    // Ignorer si c'est une propriété connue
    if (KNOWN_PROPERTIES.has(sanitized.toLowerCase())) continue
    
    // Vérifier si c'est une catégorie valide
    if (VALID_CATEGORIES.has(sanitized.toLowerCase())) {
      const resolvedCategory = resolveArmorCategory(sanitized)
      if (resolvedCategory) {
        return resolvedCategory
      }
    }
  }

  // Gestion des catégories inconnues - logger seulement si on a vraiment des catégories inconnues (pas juste des propriétés)
  const unknownCategories = xmlCategories.filter(cat => {
    const sanitized = cat?.trim()?.toLowerCase()
    return sanitized && !KNOWN_PROPERTIES.has(sanitized) && !VALID_CATEGORIES.has(sanitized)
  })

  if (unknownCategories.length > 0) {
    incrementArmorImportStat('unknownCategories')
    logger.warn(`Catégorie d'armure inconnue pour "${armorName}": ${unknownCategories.join(', ')}`)
  }

  if (FLAG_STRICT_ARMOR_VALIDATION && unknownCategories.length > 0) {
    addRejectionReason('ARMOR_CATEGORY_UNKNOWN')
    incrementArmorImportStat('rejected')
    logger.warn(`Armure rejetée en mode strict: "${armorName}" - catégorie inconnue`)
    return null
  }

  return SYSTEM.ARMOR.DEFAULT_CATEGORY || 'medium'
}

/**
 * Mapping des propriétés OggDude vers les qualités système
 */
const OGGDUDE_ARMOR_PROPERTY_TO_QUALITY = {
  'full body': 'full-body',
  'hard full body': 'bulky',
  'hard': 'bulky',
  'resistant': 'organic',
  'sealable': 'sealed',
  'sealed': 'sealed',
  'powered': 'bulky',
  'light': null, // Pas une propriété d'armure système
  'half body': null, // Pas une propriété d'armure système
}

/**
 * Traite les propriétés d'une armure et les convertit en format Option C
 * @returns {Array} Qualities array in Option C format
 */
function processArmorProperties(xmlCategories, armorName, isRestricted = false) {
  const resolvedProperties = new Set()
  const unknownProperties = []

  // Traiter chaque élément : si c'est une catégorie valide, l'ignorer ; sinon, c'est une propriété
  for (const xmlCategory of xmlCategories) {
    const sanitized = xmlCategory?.trim()
    if (!sanitized) continue
    
    // Vérifier si c'est une catégorie valide
    const isCategory = resolveArmorCategory(sanitized)
    if (isCategory) continue // C'est une catégorie, pas une propriété
    
    // C'est une propriété - chercher dans ARMOR_PROPERTY_MAP d'abord
    let mappedProperty = ARMOR_PROPERTY_MAP[sanitized]?.swerpgProperty
    
    // Sinon, chercher dans le mapping OggDude
    if (mappedProperty === undefined) {
      mappedProperty = OGGDUDE_ARMOR_PROPERTY_TO_QUALITY[sanitized.toLowerCase()]
    }
    
    if (mappedProperty) {
      resolvedProperties.add(mappedProperty)
    } else if (mappedProperty === null) {
      // Propriété connue mais pas pertinente pour le système - ignorer silencieusement
      continue
    } else {
      unknownProperties.push(sanitized)
    }
  }

  if (unknownProperties.length > 0) {
    incrementArmorImportStat('unknownProperties', unknownProperties.length)
    logger.warn(`Propriétés d'armure inconnues pour "${armorName}": ${unknownProperties.join(', ')}`)
  }

  // Ajouter sealed et full-body depuis le mapping OGGDUDE_ARMOR_PROPERTY_TO_QUALITY si applicable
  for (const [oggDudeKey, systemKey] of Object.entries(OGGDUDE_ARMOR_PROPERTY_TO_QUALITY)) {
    if (systemKey && resolvedProperties.has(systemKey)) {
      // Déjà ajouté via la première boucle, rien à faire
    }
  }

  // Ajouter restricted si applicable
  if (isRestricted) {
    resolvedProperties.add('restricted')
  }

  // Convertir en format Option C
  const qualities = []
  for (const prop of resolvedProperties) {
    const qualityConfig = getQualityConfig(prop)
    qualities.push({
      key: prop,
      rank: qualityConfig?.hasRank ? 1 : null,
      hasRank: qualityConfig?.hasRank || false,
      active: true,
      source: 'oggdude',
    })
  }

  // Limitation et tri
  const maxProperties = 12
  if (qualities.length > maxProperties) {
    logger.warn(`Trop de propriétés pour "${armorName}": ${qualities.length} > ${maxProperties}, troncature appliquée`)
    return qualities.sort((a, b) => a.key.localeCompare(b.key)).slice(0, maxProperties)
  }

  return qualities.sort((a, b) => a.key.localeCompare(b.key))
}

/**
 * Mappe une armure XML OggDude vers un objet SwerpgArmor (Option C)
 * @param {object} xmlArmor - Les données XML de l'armure
 * @param armorName
 * @returns {object|null} L'objet armure mappé ou null si rejeté
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
 * Mappe une armure XML OggDude vers un objet SwerpgArmor (Option C)
 * @param {object} xmlArmor - Les données XML de l'armure
 * @returns {object|null} L'objet armure mappé ou null si rejeté
 */
function mapOggDudeArmor(xmlArmor) {
  incrementArmorImportStat('total')

  try {
    const name = sanitizeText(xmlArmor.Name)
    const oggdudeKey = sanitizeText(xmlArmor.Key || '')

    // Mapping de la catégorie
    const xmlCategories = Array.isArray(xmlArmor?.Categories?.Category)
      ? xmlArmor.Categories.Category
      : xmlArmor?.Categories?.Category ? [xmlArmor.Categories.Category] : []

    const category = resolveArmorCategoryWithFallback(xmlCategories, name)
    if (category === null) {
      return null // Rejeté en mode strict
    }

    // Vérification restricted
    const isRestricted = parseOggDudeBoolean(xmlArmor.Restricted)

    // Mapping des qualités en format Option C
    const qualities = processArmorProperties(xmlCategories, name, isRestricted)

    // Mapping des valeurs numériques
    const soak = clampNumber(xmlArmor.Soak, 0, 20, DEFAULT_SOAK)
    const defense = clampNumber(xmlArmor.Defense, 0, 20, DEFAULT_DEFENSE)
    const hp = clampNumber(xmlArmor.HP, 0, Number.MAX_SAFE_INTEGER, 0)
    const encumbrance = clampNumber(xmlArmor.Encumbrance, 0, Number.MAX_SAFE_INTEGER, 0)
    const rarity = clampNumber(xmlArmor.Rarity, 0, 20, 0)
    const price = clampNumber(xmlArmor.Price, 0, Number.MAX_SAFE_INTEGER, 0)

    // Construction de la description
    const description = buildArmorDescription(xmlArmor)

    // Ajout des flags OggDude
    const baseMods = extractBaseMods(xmlArmor)
    const flags = {
      swerpg: {
        oggdudeKey,
        oggdudeSource: typeof xmlArmor.Source === 'string' ? xmlArmor.Source : xmlArmor.Source?._ || '',
        oggdudeSourcePage: xmlArmor.Source?.$ ? parseInt(xmlArmor.Source.$.Page) || 0 : 0,
      },
    }

    if (baseMods.length > 0) {
      flags.swerpg.oggdude = { baseMods }
    }

    const armorObject = {
      name,
      type: 'armor',
      img: 'icons/svg/aura.svg', // Image par défaut Foundry
      system: {
        category,
        soak,
        defense,
        hp,
        encumbrance,
        rarity,
        price,
        qualities,
        restricted: isRestricted,
        description,
      },
      flags,
    }

    incrementArmorImportStat('imported')
    return armorObject
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
  resetArmorImportStats()
  logger.debug(`[ArmorMapper] Mapping ${armors.length} armures`)

  const mappedArmors = armors.map(mapOggDudeArmor).filter((armor) => armor !== null)

  logger.debug(`[ArmorMapper] Mapping terminé: ${mappedArmors.length}/${armors.length} armures conservées`)

  // Export des statistiques finales pour observabilité
  const finalStats = getArmorImportStats()
  logger.debug("[ArmorMapper] Statistiques finales d'import:", JSON.stringify(finalStats, null, 2))

  return mappedArmors
}

// Export des utilitaires pour les tests et le monitoring
export { getArmorImportStats, resetArmorImportStats }

/**
 * Create the Armor Context for the OggDude Data Import
 * Supports both old signature (zip, groupByDirectory, groupByType) for backward compatibility
 * and new signature ({importedFile, options})
 * @param {Object|any} zipOrParams - Zip file or params object
 * @param {Object} [groupByDirectory] - Directory grouping (old signature)
 * @param {Object} [groupByType] - Type grouping (old signature)
 * @returns {Promise<Object>} The import context with items and stats
 */
export async function buildArmorContext(zipOrParams, groupByDirectory, groupByType) {
  resetArmorImportStats()

  // Support new signature: buildArmorContext({importedFile, options})
  let importedFile
  if (zipOrParams && typeof zipOrParams === 'object' && !Array.isArray(zipOrParams) && 'importedFile' in zipOrParams) {
    importedFile = zipOrParams.importedFile
    const dataset = OggDudeDataElement.getElementsFrom({ file: importedFile, elementName: 'Armor' })
    return buildContextFromDataset(dataset)
  }

  // Old signature: buildArmorContext(zip, groupByDirectory, groupByType)
  const zip = zipOrParams
  logger.debug('[ArmorImporter] Building Armor context (old signature)', { 
    groupByDirectoryCount: groupByDirectory?.length, 
    hasZip: !!zip 
  })

  const jsonData = await OggDudeDataElement.buildJsonDataFromFile(zip, groupByDirectory, 'Armor.xml', 'Armors.Armor')
  return {
    jsonData,
    zip: {
      elementFileName: 'Armor.xml',
      content: zip,
      directories: groupByDirectory,
    },
    image: {
      criteria: 'Data/EquipmentImages/Armor',
      worldPath: buildArmorImgWorldPath('armors'),
      systemPath: buildItemImgSystemPath('armor.svg'),
      images: groupByType?.image,
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

/**
 * Build context from dataset
 * @param {Array} dataset - The XML dataset
 * @returns {Object} Context with items and stats
 */
function buildContextFromDataset(dataset) {
  const items = []
  const errors = []

  for (const xmlArmor of dataset) {
    try {
      const mapped = mapOggDudeArmor(xmlArmor)
      if (mapped) {
        items.push(mapped)
      }
    } catch (error) {
      errors.push({ key: xmlArmor?.Key, error: error.message })
    }
  }

  return {
    type: 'armor',
    items,
    stats: getArmorImportStats(),
    errors: errors.length > 0 ? errors : undefined,
  }
}
