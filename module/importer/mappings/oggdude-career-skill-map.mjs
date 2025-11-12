import { OGG_DUDE_SKILL_MAP, mapOggDudeSkillCode, mapOggDudeSkillCodes } from './oggdude-skill-map.mjs'

/**
 * Alias spécifique carrière. Permet d'étendre ultérieurement sans impacter species.
 */
export const CAREER_SKILL_MAP = OGG_DUDE_SKILL_MAP

/**
 * Map un tableau de codes compétence carrière OggDude vers ids système uniques.
 * @param {string[]} codes
 * @returns {string[]}
 */
export function mapCareerOggDudeSkillCodes(codes = []) {
  return mapOggDudeSkillCodes(codes)
}

export { mapOggDudeSkillCode } from './oggdude-skill-map.mjs'
