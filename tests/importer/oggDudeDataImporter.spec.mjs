import { describe, it, expect, beforeEach } from 'vitest'
// Préparer un stub minimal Foundry pour le fallback dans OggDudeDataImporter
if (!globalThis.foundry) {
  globalThis.foundry = {
    applications: { api: {} },
    utils: {
      expandObject: (o) => o,
      getProperty: (obj, path) => path.split('.').reduce((acc, key) => acc?.[key], obj),
    },
  }
}
import { OggDudeDataImporter } from '../../module/settings/OggDudeDataImporter.mjs'

describe('OggDudeDataImporter - logique interne basique', () => {
  let importer
  beforeEach(() => {
    importer = new OggDudeDataImporter()
  })

  it('initialise les domaines', () => {
    expect(importer.domains).toHaveLength(11)
    expect(importer.domains[0]).toHaveProperty('id')
    expect(importer.domains[0]).toHaveProperty('checked')
  })

  it('noZipFileSelected retourne true tant que pas de fichier', () => {
    expect(importer.noZipFileSelected()).toBe(true)
    importer.zipFile = { name: 'test.zip' }
    expect(importer.noZipFileSelected()).toBe(false)
  })

  it('_noDomainSelected retourne vrai par défaut et faux après toggle', async () => {
    expect(importer._noDomainSelected()).toBe(true)
    // Simule un toggle manuel
    importer.domains[0].checked = true
    expect(importer._noDomainSelected()).toBe(false)
  })

  it('_buildImportDomainStatus génère les statuts pour tous les domaines incluant obligation et specialization', () => {
    const mockStats = {
      weapon: { total: 10, imported: 10, rejected: 0 },
      armor: { total: 5, imported: 5, rejected: 0 },
      gear: { total: 8, imported: 6, rejected: 2 },
      species: { total: 0, imported: 0, rejected: 0 },
      career: { total: 3, imported: 3, rejected: 0 },
      talent: { total: 20, imported: 18, rejected: 2 },
      obligation: { total: 41, imported: 41, rejected: 0 },
      specialization: { total: 15, imported: 14, rejected: 1 },
    }

    const result = importer._buildImportDomainStatus(mockStats)

    // Vérifier que tous les domaines ont un statut
    expect(result).toHaveProperty('weapon')
    expect(result).toHaveProperty('armor')
    expect(result).toHaveProperty('gear')
    expect(result).toHaveProperty('species')
    expect(result).toHaveProperty('career')
    expect(result).toHaveProperty('talent')
    expect(result).toHaveProperty('obligation')
    expect(result).toHaveProperty('specialization')

    // Vérifier la structure pour obligation
    expect(result.obligation).toHaveProperty('code')
    expect(result.obligation).toHaveProperty('labelI18n')
    expect(result.obligation).toHaveProperty('class')
    expect(result.obligation.code).toBe('success')
    expect(result.obligation.labelI18n).toBe('SETTINGS.OggDudeDataImporter.loadWindow.stats.status.success')
    expect(result.obligation.class).toBe('domain-status domain-status--success')

    // Vérifier la structure pour specialization
    expect(result.specialization).toHaveProperty('code')
    expect(result.specialization).toHaveProperty('labelI18n')
    expect(result.specialization).toHaveProperty('class')
    expect(result.specialization.code).toBe('mixed') // 14 imported + 1 rejected = 15 total
    expect(result.specialization.labelI18n).toBe('SETTINGS.OggDudeDataImporter.loadWindow.stats.status.mixed')
    expect(result.specialization.class).toBe('domain-status domain-status--mixed')
  })
})
