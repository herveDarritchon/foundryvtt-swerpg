import { logger } from '../../utils/logger.mjs'

/**
 * Table de correspondance déterministe entre les codes de compétences OggDude
 * et les identifiants de compétences du système SWERPG.
 * Toutes les clés sont normalisées en upper-case pour lookup.
 * 
 * Organisation:
 * - General Skills: Compétences générales et sociales
 * - Combat Skills: Compétences de combat
 * - Knowledge Skills: Compétences de connaissance
 * 
 * Notes:
 * - LTSABER (Lightsaber): Compétence spécifique Force and Destiny non présente dans SKILLS
 * - WARF (Warfare): Compétence Knowledge non présente dans SKILLS
 */
export const OGG_DUDE_SKILL_MAP = Object.freeze({
  // === GENERAL SKILLS ===
  ASTRO: 'astrogation',
  ASTROGATION: 'astrogation',
  ATHL: 'athletics',
  ATHLETICS: 'athletics',
  CHARM: 'charm',
  CHARMING: 'charm',
  COERC: 'coercion',
  COERCION: 'coercion',
  COMP: 'computers',
  COMPUTERS: 'computers',
  COOL: 'cool',
  COORD: 'coordination',
  COORDINATION: 'coordination',
  DECEP: 'deception',
  DECEPTION: 'deception',
  DISC: 'discipline',
  DISCIPLINE: 'discipline',
  LEAD: 'leadership',
  LEADERSHIP: 'leadership',
  MECH: 'mechanics',
  MECHANICS: 'mechanics',
  MED: 'medicine',
  MEDICINE: 'medicine',
  NEG: 'negotiation',
  NEGOTIATION: 'negotiation',
  PERC: 'perception',
  PERCEPTION: 'perception',
  PILOTPL: 'pilotingplanetary',
  PILOTINGPLANETARY: 'pilotingplanetary',
  PILOTSP: 'pilotingspace',
  PILOTINGSPACE: 'pilotingspace',
  RESIL: 'resilience',
  RESILIENCE: 'resilience',
  SKUL: 'skulduggery',
  SKULDUGGERY: 'skulduggery',
  STEA: 'stealth',
  STEAL: 'stealth',
  STEALTH: 'stealth',
  SW: 'streetwise',
  STREETWISE: 'streetwise',
  SURV: 'survival',
  SURVIVAL: 'survival',
  VIGIL: 'vigilance',
  VIGILANCE: 'vigilance',

  // === COMBAT SKILLS ===
  BRAWL: 'brawl',
  GUNN: 'gunnery',
  GUNNERY: 'gunnery',
  MELEE: 'melee',
  RANGHVY: 'rangedheavy',
  RANGEDHEAVY: 'rangedheavy',
  RANGLT: 'rangedlight',
  RANGEDLIGHT: 'rangedlight',

  // === KNOWLEDGE SKILLS ===
  CORE: 'coreworlds',
  COREWORLDS: 'coreworlds',
  EDU: 'education',
  EDUCATION: 'education',
  LORE: 'lore',
  OUT: 'outerrim',
  OUTERRIM: 'outerrim',
  XEN: 'xenology',
  XENOLOGY: 'xenology',

  // === DEPRECATED/LEGACY MAPPINGS (kept for backward compatibility) ===
  WILD: 'wilderness',
  WILDERNESS: 'wilderness',
  ARCA: 'arcana',
  ARCANA: 'arcana',
  MEDI: 'medicine',
  SCI: 'science',
  SCIENCE: 'science',
  SOCI: 'society',
  SOCIETY: 'society',
  DIPL: 'diplomacy',
  DIPLOMACY: 'diplomacy',
  INTIM: 'intimidation',
  INTIMIDATION: 'intimidation',
  PERFO: 'performance',
  PERFORMANCE: 'performance',
})

/**
 * Map un code OggDude (insensible à la casse) vers l'identifiant de compétence système.
 * @param {string} code
 * @param {object} [options]
 * @param {boolean} [options.warnOnUnknown=true]
 * @returns {string|null} skill id ou null si inconnu
 */
export function mapOggDudeSkillCode(code, { warnOnUnknown = true } = {}) {
  if (!code || typeof code !== 'string') return null
  const normalized = code.trim().toUpperCase()
  const mapped = OGG_DUDE_SKILL_MAP[normalized] || null
  if (!mapped && warnOnUnknown) {
    logger.warn(`[OggDudeSkillMap] Unknown OggDude skill code: ${code}`)
  }
  return mapped
}

/**
 * Transforme un tableau de codes OggDude en Set ordonné (array) d'IDs système uniques.
 * @param {string[]} codes
 * @returns {string[]} unique skill ids
 */
export function mapOggDudeSkillCodes(codes = []) {
  const out = new Set()
  for (const c of codes) {
    const id = mapOggDudeSkillCode(c)
    if (id) out.add(id)
  }
  return [...out]
}
