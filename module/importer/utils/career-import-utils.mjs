import { ImportStats } from './import-stats.mjs'

/**
 * Statistiques d'import pour Career (carrières) OggDude
 */

export const FLAG_STRICT_CAREER_VALIDATION = false

const careerStats = new ImportStats({
  unknownSkills: 0,
  skillCount: 0,
})

export function resetCareerImportStats() {
  careerStats.reset({
    unknownSkills: 0,
    skillCount: 0,
  })
}

export function incrementCareerImportStat(key, amount = 1) {
  careerStats.increment(key, amount)
}

export function addCareerUnknownSkill(code) {
  careerStats.addDetail('unknownSkills', code, 'skillDetails')
}

export function getCareerImportStats() {
  return careerStats.getStats()
}
