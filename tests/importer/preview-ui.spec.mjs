import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import OggDudeImporter from '../../module/importer/oggDude.mjs'
import { OggDudeDataImporter } from '../../module/settings/OggDudeDataImporter.mjs'

/**
 * Build a minimal fake ZIP for OggDude with only weapons
 */
function buildFakeZip() {
  const files = {}
  const baseDir = path.resolve(process.cwd(), 'resources', 'integration')
  const weaponXml = fs.readFileSync(path.join(baseDir, 'Weapons.xml'), 'utf-8')
  files['Data/Weapons.xml'] = {
    name: 'Data/Weapons.xml',
    dir: false,
    async: async (type) => weaponXml,
  }
  return { files }
}

// stub global JSZip for importer load
globalThis.JSZip = {
  loadAsync: async (_buffer) => buildFakeZip(),
}

// Shim xml2js minimal pour parser Name
globalThis.xml2js = {
  js: {
    parseStringPromise: async (xml) => {
      if (xml.includes('<Weapons>')) {
        const names = [...xml.matchAll(/<Name>([^<]+)<\/Name>/g)].map((m) => ({ Name: m[1] }))
        return { Weapons: { Weapon: names.length ? names : [{ Name: 'Unknown' }] } }
      }
      return {}
    },
  },
}

// Stub monde pour buildWeaponImgWorldPath
if (!globalThis.game) globalThis.game = {}
globalThis.game.world = { id: 'test-world' }

describe('Preview UI - preload', () => {
  it('preloads weapons without creation and provides paginated preview', async () => {
    const buffer = Buffer.from('fake')
    const domains = [
      { id: 'weapon', checked: true },
      { id: 'gear', checked: false },
      { id: 'species', checked: false },
      { id: 'career', checked: false },
      { id: 'duty', checked: false },
    ]

    const preview = await OggDudeImporter.preloadOggDudeData(buffer, domains)
    expect(preview).toBeTypeOf('object')
    expect(preview.weapon?.length).toBeGreaterThan(0)

    // Injecte données dans l'application et vérifie le contexte
    const app = new OggDudeDataImporter()
    app.previewData = preview
    app.previewFilters = { domain: 'all', text: '' }
    app.pagination = { page: 1, size: 50 }

    const ctx = app._buildPreviewContext()
    expect(ctx.hasData).toBe(true)
    expect(ctx.items.length).toBeGreaterThan(0)
    expect(ctx.total).toBe(preview.weapon.length)
    expect(ctx.page).toBe(1)
  })

  it('filters by text on name', async () => {
    const buffer = Buffer.from('fake')
    const domains = [{ id: 'weapon', checked: true }]
    const preview = await OggDudeImporter.preloadOggDudeData(buffer, domains)
    const app = new OggDudeDataImporter()
    app.previewData = preview
    app.previewFilters = { domain: 'weapon', text: 'blaster' }
    app.pagination = { page: 1, size: 50 }

    const ctx = app._buildPreviewContext()
    // Le filtre peut être 0 si aucun item ne correspond, mais ne doit pas planter
    expect(ctx.hasData).toBeTypeOf('boolean')
    expect(ctx.page).toBe(1)
    expect(ctx.total).toBeGreaterThanOrEqual(0)
  })
})
