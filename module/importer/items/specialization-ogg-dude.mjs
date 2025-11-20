import { buildArmorImgWorldPath, buildItemImgSystemPath } from '../../settings/directories.mjs'
import OggDudeImporter from '../oggDude.mjs'
import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import { logger } from '../../utils/logger.mjs'
import { SYSTEM } from '../../config/system.mjs'
import { mapOggDudeSkillCodes, mapOggDudeSkillCode } from '../mappings/oggdude-skill-map.mjs'
import {
  resetSpecializationImportStats,
  incrementSpecializationImportStat,
  addSpecializationUnknownSkill,
  getSpecializationImportStats,
  addSpecializationSkillCount,
} from '../utils/specialization-import-utils.mjs'
import { normalizeFreeSkillRank, resolveSource, buildDescription } from '../utils/description-markup-utils.mjs'

/**
 * Extrait la liste des codes bruts de compétences specialization depuis la structure XML.
 * Supporte plusieurs formes selon variations possibles (direct <Key> ou nested <CareerSkill>).
 * Filtre les types non-string et gère les objets orphelins.
 * @param {object} xmlSpecialization
 * @returns {string[]} raw codes
 */
function extractRawSpecializationSkillCodes(xmlSpecialization) {
  if (!xmlSpecialization) return []
  const cs = xmlSpecialization.CareerSkills
  if (!cs) return []

  // If already array of strings
  if (Array.isArray(cs)) {
    return cs
      .map((c) => {
        if (typeof c === 'string') return c
        if (typeof c === 'object' && c?.Key && typeof c.Key === 'string') return c.Key
        return null
      })
      .filter((c) => typeof c === 'string' && c.length > 0)
  }

  // If object with nested Key elements (direct or via CareerSkill)
  const list = cs.Key || cs.CareerSkill || cs.Skill || cs.Skills
  if (!list) return []

  const arr = Array.isArray(list) ? list : [list]
  return arr
    .map((e) => {
      if (typeof e === 'string') return e
      if (typeof e === 'object' && e?.Key && typeof e.Key === 'string') return e.Key
      return null
    })
    .filter((c) => typeof c === 'string' && c.length > 0)
}

/**
 * Transforme des codes OggDude en liste d'objets {id} conforme au schéma SwerpgSpecialization.
 * - mapping via table globale
 * - exclusion des inconnus (log.warn déjà dans mapOggDudeSkillCode)
 * - déduplication & validation par rapport à SYSTEM.SKILLS
 * - tronquage à 8 entrées
 * - logging des codes inconnus
 * @param {string[]} rawCodes
 * @param {object} options
 * @param {boolean} [options.strict=false]
 * @returns {{id:string}[]}
 */
export function mapSpecializationSkills(rawCodes = [], { strict = false } = {}) {
  if (!Array.isArray(rawCodes) || rawCodes.length === 0) return []

  const mappedIds = mapOggDudeSkillCodes(rawCodes).filter(Boolean)

  const skillsRegistry = { ...(SYSTEM?.SKILLS || {}), ...(globalThis.SYSTEM?.SKILLS || {}) }

  const validated = strict ? mappedIds.filter((id) => !!skillsRegistry[id]) : mappedIds

  const seen = new Set()
  const unique = []
  for (const id of validated) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    unique.push(id)
  }

  const truncated = unique.slice(0, 8)

  const result = truncated.filter((id) => typeof id === 'string' && id.length > 0).map((id) => ({ id }))

  if (result.length !== truncated.length) {
    logger.warn('[SpecializationImporter] Filtered out invalid skill ids', {
      before: truncated,
      after: result.map((o) => o.id),
    })
  }

  // Log unknown codes for observability (throttled via Set in stats)
  const unknownCodes = rawCodes.filter((code) => !mapOggDudeSkillCode(code, { warnOnUnknown: false }))
  if (unknownCodes.length > 0) {
    logger.warn('[SpecializationImporter] Unknown skill codes ignored during mapping', {
      unknownCodes,
      rawCount: rawCodes.length,
      mappedCount: result.length,
    })
  }

  return result
}

/**
 * Specialization Array Mapper : Map the Specialization XML data to SwerpgSpecialization creation objects.
 * @param {Array} specializations Raw XML specialization entries
 * @param {object} options
 * @param {boolean} [options.strictSkills=false]
 * @returns {Array} Array of item source objects { name, type, system }
 */
export function specializationMapper(specializations, { strictSkills = false } = {}) {
  resetSpecializationImportStats()
  
  const mapped = specializations.map((xmlSpecialization) => {
    incrementSpecializationImportStat('total')
    
    const name = OggDudeImporter.mapMandatoryString('specialization.Name', xmlSpecialization?.Name)
    const key = OggDudeImporter.mapMandatoryString('specialization.Key', xmlSpecialization?.Key)
    
    if (!name || !key) {
      incrementSpecializationImportStat('rejected')
      return null
    }
    
    const rawDescription = OggDudeImporter.mapOptionalString(xmlSpecialization?.Description)
    const sourceInfo = resolveSource(xmlSpecialization)
    const description = buildDescription(rawDescription, sourceInfo)
    const freeSkillRank = normalizeFreeSkillRank(xmlSpecialization?.FreeRanks)

    const rawSpecializationSkills = extractRawSpecializationSkillCodes(xmlSpecialization)
    const specializationSkills = mapSpecializationSkills(rawSpecializationSkills, { strict: strictSkills })

    logger.debug('[SpecializationImporter] Mapped specialization', {
      key,
      name,
      descriptionLength: description?.length || 0,
      freeSkillRank,
      skillCount: specializationSkills.length,
      strictSkills,
      rawSkillCount: rawSpecializationSkills.length,
      ignoredSkillCodes: rawSpecializationSkills.filter((c) => !mapOggDudeSkillCode(c, { warnOnUnknown: false })),
      sourceName: sourceInfo.name,
      sourcePage: sourceInfo.page,
    })

    addSpecializationSkillCount(specializationSkills.length)

    const swerpgFlags = {
      oggdudeKey: key,
    }
    if (sourceInfo.name) {
      swerpgFlags.oggdudeSource = sourceInfo.name
    }
    if (typeof sourceInfo.page === 'number') {
      swerpgFlags.oggdudeSourcePage = sourceInfo.page
    }

    const specializationObject = {
      name,
      type: 'specialization',
      system: {
        description,
        freeSkillRank,
        specializationSkills,
      },
      flags: {
        swerpg: swerpgFlags,
      },
    }

    // Enregistrer les compétences inconnues (observabilité)
    const unknown = rawSpecializationSkills.filter((c) => !mapOggDudeSkillCode(c, { warnOnUnknown: false }))
    for (const code of unknown) {
      addSpecializationUnknownSkill(code)
    }
    if (unknown.length > 0) {
      logger.warn('[SpecializationImporter] Unknown specialization skill codes detected', {
        key,
        name,
        unknown,
      })
    }

    return specializationObject
  })
  
  const filtered = mapped.filter((item) => item !== null)
  logger.debug('[SpecializationImporter] Statistiques après mapping', { stats: getSpecializationImportStats() })
  return filtered
}

/**
 * Create the Specialization Context for the OggDude Data Import
 * @param {object} zip
 * @param {Array} groupByDirectory
 * @param {object} groupByType
 * @returns {Promise<object>}
 * @public
 * @function
 */
export async function buildSpecializationContext(zip, groupByDirectory, groupByType) {
  logger.debug('[SpecializationImporter] Building Specialization context', { groupByDirectoryCount: groupByDirectory.length, groupByType, hasZip: !!zip })
  return {
    jsonData: await OggDudeDataElement.buildJsonDataFromDirectory(zip, groupByType.xml, 'Specializations', 'Specialization'),
    zip: {
      folderName: 'Specializations',
      elementFileName: '*.xml',
      content: zip,
      directories: groupByDirectory,
    },
    image: {
      worldPath: buildArmorImgWorldPath('specializations'),
      systemPath: buildItemImgSystemPath('specialization.svg'),
      images: groupByType.image,
      prefix: '',
    },
    folder: {
      name: 'Swerpg - Specializations',
      type: 'Item',
    },
    element: {
      jsonCriteria: 'Specializations.Specialization',
      mapper: specializationMapper,
      type: 'specialization',
    },
  }
}

export { getSpecializationImportStats, resetSpecializationImportStats } from '../utils/specialization-import-utils.mjs'
