import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetWeaponImportStats,
  incrementWeaponImportStat,
  addWeaponUnknownSkill,
  addWeaponUnknownQuality,
  getWeaponImportStats
} from '../../module/importer/utils/weapon-import-utils.mjs'

describe('weapon-import-utils', () => {
  beforeEach(() => resetWeaponImportStats())

  it('incrémente les compteurs basiques', () => {
    incrementWeaponImportStat('total')
    incrementWeaponImportStat('rejected')
    const stats = getWeaponImportStats()
    expect(stats.total).toBe(1)
    expect(stats.rejected).toBe(1)
    expect(stats.imported).toBe(0)
  })

  it('enregistre les skills inconnues', () => {
    addWeaponUnknownSkill('RANDOM_SKILL')
    const stats = getWeaponImportStats()
    expect(stats.unknownSkills).toBe(1)
    expect(stats.skillDetails).toContain('RANDOM_SKILL')
  })

  it('enregistre les qualités inconnues', () => {
    addWeaponUnknownQuality('ODD_QUALITY')
    const stats = getWeaponImportStats()
    expect(stats.unknownQualities).toBe(1)
    expect(stats.qualityDetails).toContain('ODD_QUALITY')
  })
})
