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
import { sanitizeDescription } from '../utils/text.mjs'

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
    const rawDescription = OggDudeImporter.mapOptionalString(xmlCareer?.Description)
    const sourceInfo = resolveCareerSource(xmlCareer)
    const description = buildCareerDescription(rawDescription, sourceInfo)
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
      sourceName: sourceInfo.name,
      sourcePage: sourceInfo.page,
    })

    incrementCareerImportStat('skillCount', careerSkills.length)

    const swerpgFlags = {
      oggdudeKey: key,
    }
    if (sourceInfo.name) {
      swerpgFlags.oggdudeSource = sourceInfo.name
    }
    if (typeof sourceInfo.page === 'number') {
      swerpgFlags.oggdudeSourcePage = sourceInfo.page
    }

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
        swerpg: swerpgFlags,
      },
    }

    // Enregistrer les compétences inconnues (observabilité)
    const unknown = rawCareerSkills.filter((c) => !mapOggDudeSkillCode(c, { warnOnUnknown: false }))
    for (const code of unknown) {
      addCareerUnknownSkill(code)
    }
    if (unknown.length > 0) {
      logger.warn('[CareerImporter] Unknown career skill codes detected', {
        key,
        name,
        unknown,
      })
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
 * Filtre les types non-string et gère les objets orphelins (REQ-001).
 * @param {object} xmlCareer
 * @returns {string[]} raw codes
 */
function extractRawCareerSkillCodes(xmlCareer) {
  if (!xmlCareer) return []
  // Possible nested structure CareerSkills.CareerSkill
  const cs = xmlCareer.CareerSkills
  if (!cs) return []

  // If already array
  if (Array.isArray(cs)) {
    return cs
      .map((c) => {
        if (typeof c === 'string') return c
        if (typeof c === 'object' && c?.Key && typeof c.Key === 'string') return c.Key
        return null
      })
      .filter((c) => typeof c === 'string' && c.length > 0)
  }

  // If object with CareerSkill/Skill/Skills list
  const list = cs.CareerSkill || cs.Skill || cs.Skills || cs.Key
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
 * Transforme des codes OggDude en liste d'objets {id} conforme au schéma SwerpgCareer.
 * - mapping via table globale
 * - exclusion des inconnus (log.warn dans mapOggDudeSkillCode déjà)
 * - déduplication & validation par rapport à SYSTEM.SKILLS
 * - tronquage à 8 entrées (REQ-002, REQ-003)
 * - logging des codes inconnus (REQ-008)
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

  // deduplicate preserving order (REQ-002)
  const seen = new Set()
  const unique = []
  for (const id of validated) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    unique.push(id)
  }

  // truncate to 8 (REQ-003)
  const truncated = unique.slice(0, 8)

  // final filtering: no falsy id objects to respect DataModel schema
  const result = truncated.filter((id) => typeof id === 'string' && id.length > 0).map((id) => ({ id }))

  if (result.length !== truncated.length) {
    logger.warn('[CareerImporter] Filtered out invalid skill ids', {
      before: truncated,
      after: result.map((o) => o.id),
    })
  }

  // Log unknown codes for observability (REQ-008)
  const unknownCodes = rawCodes.filter((code) => !mapOggDudeSkillCode(code, { warnOnUnknown: false }))
  if (unknownCodes.length > 0) {
    logger.warn('[CareerImporter] Unknown skill codes ignored during mapping', {
      unknownCodes,
      rawCount: rawCodes.length,
      mappedCount: result.length,
    })
  }

  return result
}

function resolveCareerSource(xmlCareer) {
  if (!xmlCareer) return { name: '', page: null }

  const directSource = xmlCareer.Source ?? xmlCareer.source
  if (directSource) {
    return extractCareerSourceEntry(directSource)
  }

  const multipleSources = xmlCareer.Sources?.Source ?? xmlCareer.sources?.Source ?? xmlCareer.Sources?.source
  if (Array.isArray(multipleSources)) {
    for (const entry of multipleSources) {
      const resolved = extractCareerSourceEntry(entry)
      if (resolved.name) return resolved
    }
  } else if (multipleSources) {
    const resolved = extractCareerSourceEntry(multipleSources)
    if (resolved.name) return resolved
  }

  return { name: '', page: null }
}

function extractCareerSourceEntry(entry) {
  if (!entry) return { name: '', page: null }

  if (typeof entry === 'string') {
    const name = sanitizeDescription(entry, 256, { preserveLineBreaks: false })
    return { name, page: null }
  }

  if (typeof entry === 'object') {
    const rawName = entry._ ?? entry.name ?? entry.Name ?? entry.label ?? ''
    const sanitizedName = sanitizeDescription(rawName, 256, { preserveLineBreaks: false })
    const pageCandidate = entry?.$?.Page ?? entry?.$?.page ?? entry?.page ?? entry?.Page ?? null
    const parsedPage = Number.parseInt(pageCandidate, 10)
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : null
    return { name: sanitizedName, page }
  }

  return { name: '', page: null }
}

function buildCareerDescription(rawDescription, sourceInfo) {
  const markupHtml = convertCareerMarkupToHtml(rawDescription)
  const sections = markupHtml
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean)

  const htmlSections = sections.map((section) => {
    const lower = section.toLowerCase()
    if (
      lower.startsWith('<h1') ||
      lower.startsWith('<h2') ||
      lower.startsWith('<h3') ||
      lower.startsWith('<h4') ||
      lower.startsWith('<h5') ||
      lower.startsWith('<h6')
    ) {
      return section
    }
    if (lower.startsWith('<ul') || lower.startsWith('<ol') || lower.startsWith('<li') || lower.startsWith('<p') || lower.startsWith('<hr')) {
      return section
    }
    const withLineBreaks = section.replace(/\n/g, '<br />')
    return `<p>${withLineBreaks}</p>`
  })

  const withSource = appendSourceSection(htmlSections, sourceInfo)
  const html = withSource.join('\n').trim()
  if (!html) return ''
  return sanitizeDescription(html, 2000, { preserveLineBreaks: true })
}

function appendSourceSection(sections, sourceInfo) {
  if (!sourceInfo?.name) {
    return sections
  }

  const escapedName = escapeHtmlSafe(sourceInfo.name)
  const escapedPage = typeof sourceInfo.page === 'number' ? escapeHtmlSafe(String(sourceInfo.page)) : null
  const pageSuffix = escapedPage ? `, p.${escapedPage}` : ''
  return [...sections, `<p><strong>Source:</strong> ${escapedName}${pageSuffix}</p>`]
}

function convertCareerMarkupToHtml(description) {
  if (!description) {
    return ''
  }

  let result = String(description).replace(/\r\n/g, '\n')

  for (let level = 1; level <= 6; level += 1) {
    const open = new RegExp(`\\[H${level}\\]`, 'g')
    const closeLower = new RegExp(`\\[h${level}\\]`, 'g')
    const closeUpper = new RegExp(`\\[/H${level}\\]`, 'g')
    const closeExplicit = new RegExp(`\\[/h${level}\\]`, 'g')
    result = result.replace(open, `<h${level}>`)
    result = result.replace(closeLower, `</h${level}>`)
    result = result.replace(closeUpper, `</h${level}>`)
    result = result.replace(closeExplicit, `</h${level}>`)
  }

  const replacements = [
    { regex: /\[B\]/g, replacement: '<strong>' },
    { regex: /\[b\]/g, replacement: '<strong>' },
    { regex: /\[\/B\]/g, replacement: '</strong>' },
    { regex: /\[\/b\]/g, replacement: '</strong>' },
    { regex: /\[I\]/g, replacement: '<em>' },
    { regex: /\[i\]/g, replacement: '<em>' },
    { regex: /\[\/I\]/g, replacement: '</em>' },
    { regex: /\[\/i\]/g, replacement: '</em>' },
    { regex: /\[U\]/g, replacement: '<u>' },
    { regex: /\[u\]/g, replacement: '<u>' },
    { regex: /\[\/U\]/g, replacement: '</u>' },
    { regex: /\[\/u\]/g, replacement: '</u>' },
    { regex: /\[(?:BR|br)\]/g, replacement: '<br />' },
    { regex: /\[(?:HR|hr)\]/g, replacement: '<hr />' },
    { regex: /\[P\]/g, replacement: '<p>' },
    { regex: /\[p\]/g, replacement: '<p>' },
    { regex: /\[\/P\]/g, replacement: '</p>' },
    { regex: /\[\/p\]/g, replacement: '</p>' },
    { regex: /\[UL\]/gi, replacement: '<ul>' },
    { regex: /\[\/UL\]/gi, replacement: '</ul>' },
    { regex: /\[OL\]/gi, replacement: '<ol>' },
    { regex: /\[\/OL\]/gi, replacement: '</ol>' },
    { regex: /\[LI\]/gi, replacement: '<li>' },
    { regex: /\[\/LI\]/gi, replacement: '</li>' },
  ]

  for (const { regex, replacement } of replacements) {
    result = result.replace(regex, replacement)
  }

  result = result.replace(/\[(?:CENTER|LEFT|RIGHT)\]/gi, '')
  result = result.replace(/\[\/(?:CENTER|LEFT|RIGHT)\]/gi, '')
  result = result.replace(/\[COLOR=.*?\]/gi, '')
  result = result.replace(/\[\/COLOR\]/gi, '')

  result = result.replace(/<\/h([1-6])>/g, '</h$1>\n\n')
  result = result.replace(/<h([1-6])>([^<]*?)\s+<\/h([1-6])>/g, (match, level, content, closingLevel) => {
    if (level !== closingLevel) return match
    return `<h${level}>${content.trimEnd()}</h${level}>`
  })

  // Nettoyer les balises restantes non reconnues
  result = result.replace(/\[[^\[\]]+\]/g, '')

  return result
}

function escapeHtmlSafe(value) {
  const text = String(value ?? '')
  if (typeof foundry !== 'undefined' && foundry?.utils?.escapeHTML) {
    return foundry.utils.escapeHTML(text)
  }
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char] || char)
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
