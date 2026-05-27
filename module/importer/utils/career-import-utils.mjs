import { ImportStats } from './import-stats.mjs'

/**
 * Statistiques d'import pour Career (carrières) OggDude
 */

export const FLAG_STRICT_CAREER_VALIDATION = false

const careerStats = new ImportStats({
  unknownSkills: 0,
  skillCount: 0,
})

/**
 * Reset all career import counters and skill details to zero.
 */
export function resetCareerImportStats() {
  careerStats.reset({
    unknownSkills: 0,
    skillCount: 0,
  })
}

/**
 * Increment a named career import counter by the given amount.
 * @param key
 * @param amount
 */
export function incrementCareerImportStat(key, amount = 1) {
  careerStats.increment(key, amount)
}

/**
 * Record an unknown skill code encountered during career import.
 * @param code
 */
export function addCareerUnknownSkill(code) {
  careerStats.addDetail('unknownSkills', code, 'skillDetails')
}

/**
 * Return the current career import statistics snapshot.
 */
export function getCareerImportStats() {
  return careerStats.getStats()
}
