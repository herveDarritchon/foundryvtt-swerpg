import { buildArmorImgWorldPath, buildItemImgSystemPath } from '../../settings/directories.mjs'
import OggDudeImporter from '../oggDude.mjs'
import OggDudeDataElement from '../../settings/models/OggDudeDataElement.mjs'
import { logger } from '../../utils/logger.mjs'
import { SYSTEM } from '../../config/system.mjs'
import { mapOggDudeSkillCodes, mapOggDudeSkillCode } from '../mappings/oggdude-skill-map.mjs'
import {
  resetCareerImportStats,
  incrementCareerImportStat,
  addCareerUnknownSkill,
  getCareerImportStats,
  FLAG_STRICT_CAREER_VALIDATION,
} from '../utils/career-import-utils.mjs'

/**
 * Career Array Mapper : Map the Career XML data to the SwerpgCareer creation objects.
 * Seuls les champs définis dans le schéma SwerpgCareer sont produits dans system.
 * @param careers {Array} Raw XML career entries.
 * @returns {Array} Array of item source objects { name, type, system }
 */
export function careerMapper(careers, { strictSkills = false } = {}) {
  // Réinitialiser stats à chaque nouvelle session
  resetCareerImportStats()
  const mapped = careers.map((xmlCareer) => {
    incrementCareerImportStat('total')
    const name = OggDudeImporter.mapMandatoryString('career.Name', xmlCareer?.Name)
    const key = OggDudeImporter.mapMandatoryString('career.Key', xmlCareer?.Key)
    const description = OggDudeImporter.mapOptionalString(xmlCareer?.Description)
    const freeSkillRank = normalizeFreeSkillRank(xmlCareer?.FreeRanks)

    // Raw skill codes extraction (structure may be array or object); we accept either xmlCareer.CareerSkills?.CareerSkill?.Key or direct array
    const rawCareerSkills = extractRawCareerSkillCodes(xmlCareer)
    const careerSkills = mapCareerSkills(rawCareerSkills, { strict: strictSkills })

    logger.debug('[CareerImporter] Mapped career', {
      key,
      name,
      descriptionLength: description?.length || 0,
      freeSkillRank,
      skillCount: careerSkills.length,
      strictSkills,
      rawSkillCount: rawCareerSkills.length,
      ignoredSkillCodes: rawCareerSkills.filter((c) => !mapOggDudeSkillCode(c, { warnOnUnknown: false })),
    })

    const careerObject = {
      name,
      type: 'career',
      system: {
        description,
        freeSkillRank,
        careerSkills,
      },
      // conserver la clé d'origine comme flag interne éventuel
      flags: {
        swerpg: { oggdudeKey: key },
      },
    }

    // Enregistrer les compétences inconnues (observabilité)
    const unknown = rawCareerSkills.filter((c) => !mapOggDudeSkillCode(c, { warnOnUnknown: false }))
    for (const code of unknown) {
      addCareerUnknownSkill(code)
    }

    // Mode strict: pourrait rejeter la carrière si unknown skills détectés (placeholder)
    if (FLAG_STRICT_CAREER_VALIDATION === true) {
      // Si une logique de rejet est ajoutée, ajouter incrementCareerImportStat('rejected') ici
    }

    return careerObject
  })
  logger.debug('[CareerImporter] Statistiques après mapping', { stats: getCareerImportStats() })
  return mapped
}

/**
 * Normalise la valeur FreeRanks en entier borné 0-8, défaut 4.
 * @param {any} raw
 * @returns {number}
 */
function normalizeFreeSkillRank(raw) {
  let n = Number.parseInt(raw, 10)
  if (Number.isNaN(n)) n = 4
  if (n < 0) n = 0
  if (n > 8) n = 8
  return n
}

/**
 * Extrait la liste des codes bruts de compétences carrière depuis la structure XML.
 * Supporte plusieurs formes selon variations possibles.
 * @param {object} xmlCareer
 * @returns {string[]} raw codes
 */
function extractRawCareerSkillCodes(xmlCareer) {
  if (!xmlCareer) return []
  // Possible nested structure CareerSkills.CareerSkill
  const cs = xmlCareer.CareerSkills
  if (!cs) return []
  // If already array of strings
  if (Array.isArray(cs)) return cs.filter((c) => typeof c === 'string')
  // If object with CareerSkill list
  const list = cs.CareerSkill || cs.Skill || cs.Skills || cs
  if (!list) return []
  const arr = Array.isArray(list) ? list : [list]
  return arr.map((e) => (typeof e === 'string' ? e : e?.Key)).filter(Boolean)
}

/**
 * Transforme des codes OggDude en liste d'objets {id} conforme au schéma SwerpgCareer.
 * - mapping via table globale
 * - exclusion des inconnus (log.warn dans mapOggDudeSkillCode déjà)
 * - déduplication & validation par rapport à SYSTEM.SKILLS
 * - tronquage à 8 entrées
 * @param {string[]} rawCodes
 * @returns {{id:string}[]}
 */
export function mapCareerSkills(rawCodes = [], { strict = false } = {}) {
  if (!Array.isArray(rawCodes) || rawCodes.length === 0) return []

  // map codes -> ids (unknown codes are filtered internally by mapOggDudeSkillCodes)
  const mappedIds = mapOggDudeSkillCodes(rawCodes).filter(Boolean)

  // Déterminer le registre de compétences en fusionnant la config runtime et le mock éventuel de test
  // Merge both the static SYSTEM config and any runtime-provided globalThis.SYSTEM
  // (tests may inject a lightweight globalThis.SYSTEM). Keep merge deterministic.
  const skillsRegistry = { ...(SYSTEM?.SKILLS || {}), ...(globalThis.SYSTEM?.SKILLS || {}) }

  // optional strict mode: retain only ids that exist in skillsRegistry
  const validated = strict ? mappedIds.filter((id) => !!skillsRegistry[id]) : mappedIds

  // deduplicate preserving order
  const seen = new Set()
  const unique = []
  for (const id of validated) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    unique.push(id)
  }

  // truncate to 8
  const truncated = unique.slice(0, 8)

  // final filtering: no falsy id objects to respect DataModel schema
  const result = truncated.filter((id) => typeof id === 'string' && id.length > 0).map((id) => ({ id }))

  if (result.length !== truncated.length) {
    logger.warn('[CareerImporter] Filtered out invalid skill ids', {
      before: truncated,
      after: result.map((o) => o.id),
    })
  }

  return result
}

/**
 * Create the Species Context for the OggDude Data Import
 * @param zip
 * @param groupByDirectory
 * @param groupByType
 * @returns {{zip: {elementFileName: string, directories, content}, image: {images: (string|((buffer: Buffer, options?: ansiEscapes.ImageOptions) => string)|number|[OggDudeDataElement]|[OggDudeDataElement,OggDudeDataElement]|[OggDudeDataElement,OggDudeDataElement]|OggDudeContextImage|*), criteria: string, systemPath: string, worldPath: string}, folder: {name: string, type: string}, element: {jsonCriteria: string, mapper: *, type: string}}}
 * @public
 * @function
 */
export async function buildCareerContext(zip, groupByDirectory, groupByType) {
  logger.debug('[CareerImporter] Building Career context', { groupByDirectoryCount: groupByDirectory.length, groupByType, hasZip: !!zip })
  return {
    jsonData: await OggDudeDataElement.buildJsonDataFromDirectory(zip, groupByType.xml, 'Careers', 'Career'),
    zip: {
      folderName: 'Career',
      elementFileName: '*.xml',
      content: zip,
      directories: groupByDirectory,
    },
    image: {
      worldPath: buildArmorImgWorldPath('careers'),
      systemPath: buildItemImgSystemPath('career.svg'),
      images: groupByType.image,
      prefix: '',
    },
    folder: {
      name: 'Swerpg - Careers',
      type: 'Item',
    },
    element: {
      jsonCriteria: 'Careers.Career',
      mapper: careerMapper,
      type: 'career',
    },
  }
}

// Export utilitaires stats pour tests & agrégation
export { getCareerImportStats, resetCareerImportStats } from '../utils/career-import-utils.mjs'
