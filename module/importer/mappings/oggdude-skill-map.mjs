import { logger } from '../../utils/logger.mjs'

/**
 * Table de correspondance déterministe entre les codes de compétences OggDude
 * et les identifiants de compétences du système SWERPG.
 * Toutes les clés sont normalisées en upper-case pour lookup.
 */
export const OGG_DUDE_SKILL_MAP = Object.freeze({
  ATHL: 'athletics',
  ATHLETICS: 'athletics',
  // Perception dans OggDude correspond à la compétence système 'perception'
  // (ancien mapping vers 'awareness' corrigé car 'awareness' n'existe pas dans SYSTEM.SKILLS)
  PERC: 'perception',
  PERCEPTION: 'perception',
  DECEP: 'deception',
  DECEPTION: 'deception',
  CHARM: 'charm',
  CHARMING: 'charm',
  STEA: 'stealth',
  STEALTH: 'stealth',
  WILD: 'wilderness',
  WILDERNESS: 'wilderness',
  ARCA: 'arcana',
  ARCANA: 'arcana',
  MEDI: 'medicine',
  MEDICINE: 'medicine',
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
  EDU: 'science', // Education assimilé à science générale
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
