// Statistiques d'import pour Specialization OggDude

let _specializationStats = {
  total: 0,
  rejected: 0,
  unknownSkills: 0,
  skillCount: 0,
  skillDetails: new Set(),
}

export function resetSpecializationImportStats() {
  _specializationStats = {
    total: 0,
    rejected: 0,
    unknownSkills: 0,
    skillCount: 0,
    skillDetails: new Set(),
  }
}

export function incrementSpecializationImportStat(key, amount = 1) {
  if (Object.prototype.hasOwnProperty.call(_specializationStats, key)) {
    _specializationStats[key] += amount
  }
}

export function addSpecializationUnknownSkill(code) {
  _specializationStats.unknownSkills += 1
  _specializationStats.skillDetails.add(code)
}

export function addSpecializationSkillCount(count) {
  if (typeof count === 'number' && count > 0) {
    _specializationStats.skillCount += count
  }
}

export function getSpecializationImportStats() {
  return {
    total: _specializationStats.total,
    rejected: _specializationStats.rejected,
    imported: _specializationStats.total - _specializationStats.rejected,
    unknownSkills: _specializationStats.unknownSkills,
    skillCount: _specializationStats.skillCount,
    skillDetails: Array.from(_specializationStats.skillDetails),
  }
}
