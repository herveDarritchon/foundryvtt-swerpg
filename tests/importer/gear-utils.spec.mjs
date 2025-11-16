import { describe, it, expect, beforeEach } from 'vitest'
import { resetGearImportStats, incrementGearImportStat, addGearUnknownCategory, getGearImportStats } from '../../module/importer/utils/gear-import-utils.mjs'

describe('gear-import-utils', () => {
  beforeEach(() => resetGearImportStats())

  it('compteurs total/rejected', () => {
    incrementGearImportStat('total')
    incrementGearImportStat('rejected')
    const stats = getGearImportStats()
    expect(stats.total).toBe(1)
    expect(stats.rejected).toBe(1)
    expect(stats.imported).toBe(0)
  })

  it('catégories inconnues', () => {
    addGearUnknownCategory('mystery')
    const stats = getGearImportStats()
    expect(stats.unknownCategories).toBe(1)
    expect(stats.categoryDetails).toContain('mystery')
  })
})
