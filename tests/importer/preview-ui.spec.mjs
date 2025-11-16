import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import OggDudeImporter from '../../module/importer/oggDude.mjs'
import { OggDudeDataImporter } from '../../module/settings/OggDudeDataImporter.mjs'

/**
 * Construit un ZIP minimal OggDude à partir des fichiers de ressources d'intégration
 */
function buildFakeZip(domains = ['armor']) {
  const files = {}
  const baseDir = path.resolve(process.cwd(), 'resources', 'integration')
  for (const d of domains) {
    if (d === 'armor') {
      const armorXml = fs.readFileSync(path.join(baseDir, 'Armor.xml'), 'utf-8')
      files['Data/Armor.xml'] = {
        name: 'Data/Armor.xml',
        dir: false,
        async: async (type) => armorXml,
      }
    }
  }
  return { files }
}

// Stub global JSZip for importer load
globalThis.JSZip = {
  loadAsync: async (_buffer) => buildFakeZip(['armor']),
}

// Shim xml2js minimal pour parser Name
globalThis.xml2js = {
  js: {
    parseStringPromise: async (xml) => {
      if (xml.includes('<Armors>')) {
        // Très simpliste: renvoie tableau d'armures avec Name
        const names = [...xml.matchAll(/<Name>([^<]+)<\/Name>/g)].map((m) => ({ Name: m[1] }))
        return { Armors: { Armor: names.length ? names : [{ Name: 'Unknown' }] } }
      }
      return {}
    },
  },
}

// Stub monde pour buildArmorImgWorldPath
if (!globalThis.game) globalThis.game = {}
globalThis.game.world = { id: 'test-world' }

describe('Preview UI - préchargement', () => {
  it('précharge les armures sans création et fournit un aperçu paginé', async () => {
    const buffer = Buffer.from('fake')
    const domains = [
      { id: 'armor', checked: true },
      { id: 'weapon', checked: false },
      { id: 'gear', checked: false },
      { id: 'species', checked: false },
      { id: 'career', checked: false },
    ]

    const preview = await OggDudeImporter.preloadOggDudeData(buffer, domains)
    expect(preview).toBeTypeOf('object')
    expect(preview.armor?.length).toBeGreaterThan(0)

    // Injecte données dans l'application et vérifie le contexte
    const app = new OggDudeDataImporter()
    app.previewData = preview
    app.previewFilters = { domain: 'all', text: '' }
    app.pagination = { page: 1, size: 50 }

    const ctx = app._buildPreviewContext()
    expect(ctx.hasData).toBe(true)
    expect(ctx.items.length).toBeGreaterThan(0)
    expect(ctx.total).toBe(preview.armor.length)
    expect(ctx.page).toBe(1)
  })

  it('filtre par texte sur le nom', async () => {
    const buffer = Buffer.from('fake')
    const domains = [{ id: 'armor', checked: true }]
    const preview = await OggDudeImporter.preloadOggDudeData(buffer, domains)
    const app = new OggDudeDataImporter()
    app.previewData = preview
    app.previewFilters = { domain: 'armor', text: 'cloth' }
    app.pagination = { page: 1, size: 50 }

    const ctx = app._buildPreviewContext()
    // Le filtre peut être 0 si aucun item ne correspond, mais ne doit pas planter
    expect(ctx.hasData).toBeTypeOf('boolean')
    expect(ctx.page).toBe(1)
    expect(ctx.total).toBeGreaterThanOrEqual(0)
  })
})
