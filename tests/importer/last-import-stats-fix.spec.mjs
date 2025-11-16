import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  markGlobalStart,
  markGlobalEnd,
  aggregateImportMetrics,
  resetRuntimeMetrics,
} from '../../module/importer/utils/global-import-metrics.mjs'

// Mock les fonctions d'import pour simuler des stats
vi.mock('../../module/importer/utils/armor-import-utils.mjs', () => ({
  getArmorImportStats: vi.fn(() => ({ total: 0, rejected: 0, imported: 0 })),
}))

vi.mock('../../module/importer/utils/weapon-import-utils.mjs', () => ({
  getWeaponImportStats: vi.fn(() => ({ total: 0, rejected: 0, imported: 0 })),
}))

vi.mock('../../module/importer/utils/gear-import-utils.mjs', () => ({
  getGearImportStats: vi.fn(() => ({ total: 0, rejected: 0, imported: 0 })),
}))

vi.mock('../../module/importer/utils/species-import-utils.mjs', () => ({
  getSpeciesImportStats: vi.fn(() => ({ total: 0, rejected: 0, imported: 0 })),
}))

vi.mock('../../module/importer/utils/career-import-utils.mjs', () => ({
  getCareerImportStats: vi.fn(() => ({ total: 0, rejected: 0, imported: 0 })),
}))

describe('Last import stats preservation fix', () => {
  beforeEach(() => {
    resetRuntimeMetrics()
    vi.clearAllMocks()
  })

  it('should preserve stats from last successful import when current stats are zero', async () => {
    console.log('=== Test: Stats preservation fix ===')

    // Phase 1: Simuler un import réussi avec des vraies stats
    const { getArmorImportStats } = await import('../../module/importer/utils/armor-import-utils.mjs')
    const { getWeaponImportStats } = await import('../../module/importer/utils/weapon-import-utils.mjs')
    const { getGearImportStats } = await import('../../module/importer/utils/gear-import-utils.mjs')
    const { getSpeciesImportStats } = await import('../../module/importer/utils/species-import-utils.mjs')
    const { getCareerImportStats } = await import('../../module/importer/utils/career-import-utils.mjs')

    // Mock les stats non-zéro pour simuler un import réussi
    getArmorImportStats.mockReturnValue({ total: 5, rejected: 1, imported: 4 })
    getWeaponImportStats.mockReturnValue({ total: 10, rejected: 0, imported: 10 })
    getGearImportStats.mockReturnValue({ total: 8, rejected: 2, imported: 6 })
    getSpeciesImportStats.mockReturnValue({ total: 3, rejected: 0, imported: 3 })
    getCareerImportStats.mockReturnValue({ total: 4, rejected: 1, imported: 3 })

    markGlobalStart()
    await new Promise((resolve) => setTimeout(resolve, 50))
    markGlobalEnd()

    // Premier appel avec des stats non-zéro - doit les sauvegarder
    const metricsWithStats = aggregateImportMetrics()
    console.log('Metrics with real stats:', metricsWithStats)

    expect(metricsWithStats.totalImported).toBe(26)
    expect(metricsWithStats.itemsPerSecond).toBeGreaterThan(0)

    // Phase 2: Simuler l'UI qui appelle les métriques après réinitialisation des stats
    // Mock les stats comme zéro (comme si les mappers avaient été réinitialisés)
    getArmorImportStats.mockReturnValue({ total: 0, rejected: 0, imported: 0 })
    getWeaponImportStats.mockReturnValue({ total: 0, rejected: 0, imported: 0 })
    getGearImportStats.mockReturnValue({ total: 0, rejected: 0, imported: 0 })
    getSpeciesImportStats.mockReturnValue({ total: 0, rejected: 0, imported: 0 })
    getCareerImportStats.mockReturnValue({ total: 0, rejected: 0, imported: 0 })

    // Deuxième appel avec des stats à zéro - doit utiliser les stats préservées
    const metricsWithZeroStats = aggregateImportMetrics()
    console.log('Metrics with zero current stats (should use preserved):', metricsWithZeroStats)

    // Les stats du dernier import doivent être préservées
    expect(metricsWithZeroStats.totalImported).toBe(26)
    expect(metricsWithZeroStats.itemsPerSecond).toBeGreaterThan(0)
    expect(metricsWithZeroStats.overallDurationMs).toBe(metricsWithStats.overallDurationMs)
  })

  it('should use current stats when they are non-zero', async () => {
    console.log('=== Test: Current stats priority ===')

    const { getArmorImportStats } = await import('../../module/importer/utils/armor-import-utils.mjs')

    // Mock des stats actuelles non-zéro
    getArmorImportStats.mockReturnValue({ total: 10, rejected: 1, imported: 9 })

    markGlobalStart()
    await new Promise((resolve) => setTimeout(resolve, 30))
    markGlobalEnd()

    const metrics = aggregateImportMetrics()
    console.log('Metrics with current non-zero stats:', metrics)

    expect(metrics.totalImported).toBe(9)
    expect(metrics.itemsPerSecond).toBeGreaterThan(0)
  })
})
