import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetCareerImportStats,
  incrementCareerImportStat,
  addCareerUnknownSkill,
  getCareerImportStats
} from '../../module/importer/utils/career-import-utils.mjs'

describe('career-import-utils', () => {
  beforeEach(() => resetCareerImportStats())

  it('incrémente total/rejected', () => {
    incrementCareerImportStat('total')
    incrementCareerImportStat('rejected')
    const stats = getCareerImportStats()
    expect(stats.total).toBe(1)
    expect(stats.rejected).toBe(1)
    expect(stats.imported).toBe(0)
  })

  it('skills inconnues', () => {
    addCareerUnknownSkill('UNKNOWN_SKILL_X')
    const stats = getCareerImportStats()
    expect(stats.unknownSkills).toBe(1)
    expect(stats.skillDetails).toContain('UNKNOWN_SKILL_X')
  })
})
