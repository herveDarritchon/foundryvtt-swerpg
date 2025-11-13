import { describe, it, expect, beforeEach } from 'vitest'
// Préparer un stub minimal Foundry pour le fallback dans OggDudeDataImporter
if (!globalThis.foundry) {
  globalThis.foundry = {
    applications: { api: {} },
    utils: {
      expandObject: (o) => o,
      getProperty: (obj, path) => path.split('.').reduce((acc, key) => acc?.[key], obj)
    }
  }
}
import { OggDudeDataImporter } from '../../module/settings/OggDudeDataImporter.mjs'

describe('OggDudeDataImporter - logique interne basique', () => {
  let importer
  beforeEach(() => {
    importer = new OggDudeDataImporter()
  })

  it('initialise les domaines', () => {
    expect(importer.domains).toHaveLength(5)
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
})
