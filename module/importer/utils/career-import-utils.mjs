import { ImportStats } from './import-stats.mjs'

// Statistiques d'import pour Career (carrières) OggDude

export const FLAG_STRICT_CAREER_VALIDATION = false

const careerStats = new ImportStats({
  unknownSkills: 0,
  skillCount: 0,
})

// Additional stats not covered by ImportStats
let _additionalCareerStats = {
  skillCount: 0,
}

export function resetCareerImportStats() {
  careerStats.reset({
    unknownSkills: 0,
    skillCount: 0,
  })
  _additionalCareerStats = {
    skillCount: 0,
  }
}

export function incrementCareerImportStat(key, amount = 1) {
  careerStats.increment(key, amount)
}

export function addCareerUnknownSkill(code) {
  careerStats.addDetail('unknownSkills', code, 'skillDetails')
}

export function addCareerSkillCount(count) {
  if (typeof count === 'number' && count > 0) {
    _additionalCareerStats.skillCount += count
  }
}

export function getCareerImportStats() {
  const stats = careerStats.getStats()
  return {
    ...stats,
    skillCount: _additionalCareerStats.skillCount,
  }
}

export function _unsafeInternalCareerStatsRef() {
  return careerStats.getStats()
}
