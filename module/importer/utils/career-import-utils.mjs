// Statistiques d'import pour Career (carrières) OggDude

export const FLAG_STRICT_CAREER_VALIDATION = false

let _careerStats = {
  total: 0,
  rejected: 0,
  unknownSkills: 0,
  skillDetails: new Set(),
}

export function resetCareerImportStats() {
  _careerStats = {
    total: 0,
    rejected: 0,
    unknownSkills: 0,
    skillDetails: new Set(),
  }
}

export function incrementCareerImportStat(key) {
  if (Object.prototype.hasOwnProperty.call(_careerStats, key)) {
    _careerStats[key] += 1
  }
}

export function addCareerUnknownSkill(code) {
  _careerStats.unknownSkills += 1
  _careerStats.skillDetails.add(code)
}

export function getCareerImportStats() {
  return {
    total: _careerStats.total,
    rejected: _careerStats.rejected,
    imported: _careerStats.total - _careerStats.rejected,
    unknownSkills: _careerStats.unknownSkills,
    skillDetails: Array.from(_careerStats.skillDetails),
  }
}

export function _unsafeInternalCareerStatsRef() {
  return _careerStats
}
