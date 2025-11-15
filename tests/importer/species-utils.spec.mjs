import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetSpeciesImportStats,
  incrementSpeciesImportStat,
  addSpeciesUnknownTalent,
  getSpeciesImportStats,
} from '../../module/importer/utils/species-import-utils.mjs'

describe('species-import-utils', () => {
  beforeEach(() => resetSpeciesImportStats())

  it('incrémente total/rejected', () => {
    incrementSpeciesImportStat('total')
    incrementSpeciesImportStat('rejected')
    const stats = getSpeciesImportStats()
    expect(stats.total).toBe(1)
    expect(stats.rejected).toBe(1)
    expect(stats.imported).toBe(0)
  })

  it('talents inconnus', () => {
    addSpeciesUnknownTalent('HIDDEN_TALENT')
    const stats = getSpeciesImportStats()
    expect(stats.unknownTalents).toBe(1)
    expect(stats.talentDetails).toContain('HIDDEN_TALENT')
  })
})
