import { describe, it, expect } from 'vitest'
import fs from 'node:fs/promises'
import xml2jsModule from '../../vendors/xml2js.min.js'
import { parseXmlToJson } from '../../module/utils/xml/parser.mjs'
import { armorMapper, getArmorImportStats, resetArmorImportStats } from '../../module/importer/items/armor-ogg-dude.mjs'

// Shim xml2js global (même pattern que species)
if (globalThis.xml2js === undefined) {
  globalThis.xml2js = { js: xml2jsModule }
}

// Mock minimal SYSTEM si absent (catégories + propriétés basiques)
if (!globalThis.SYSTEM) {
  globalThis.SYSTEM = {
    ARMOR: {
      CATEGORIES: { light: {}, medium: {}, heavy: {}, natural: {}, unarmored: {} },
      PROPERTIES: { bulky: {}, organic: {} },
      DEFAULT_CATEGORY: 'medium',
    },
  }
}

describe('Intégration OggDude -> armorMapper', () => {
  it('Armors.xml - mapping de plusieurs armures réelles', async () => {
    resetArmorImportStats()
    const xml = await fs.readFile('resources/integration/Armor.xml', 'utf8')
    const raw = await parseXmlToJson(xml)
    expect(raw).toBeDefined()
    const armorNodes = raw.Armors.Armor
    expect(Array.isArray(armorNodes)).toBe(true)
    // Sélectionner un petit échantillon pour test (premières 5)
    const sample = armorNodes.slice(0, 5)
    const mapped = armorMapper(sample)
    expect(mapped.length).toBeGreaterThan(0)

    const first = mapped[0]
    expect(first.type).toBe('armor')
    expect(typeof first.name).toBe('string')
    expect(first.system).toBeDefined()
    expect(typeof first.system.category).toBe('string')
    expect(first.system.defense).toHaveProperty('base')
    expect(first.system.soak).toHaveProperty('base')
    expect(typeof first.system.encumbrance).toBe('number')
    expect(typeof first.system.price).toBe('number')
    expect(typeof first.system.rarity).toBe('number')
    expect(typeof first.system.restricted).toBe('boolean')
    expect(first.system.properties instanceof Set).toBe(true)

    // Statistiques cohérentes
    const stats = getArmorImportStats()
    expect(stats.total).toBe(sample.length)
    expect(stats.imported).toBe(mapped.length)
    expect(stats.rejected).toBe(0) // mode non strict
  })

  it('Armors.xml - gestion des catégories inconnues (injection simulée)', () => {
    resetArmorImportStats()
    const fakeArmor = {
      Name: 'Unknown Category Armor',
      Description: 'Test',
      Defense: '1',
      Soak: '1',
      Categories: { Category: ['TotallyUnknownCategory'] },
    }
    const mapped = armorMapper([fakeArmor])
    expect(mapped).toHaveLength(1) // fallback sur DEFAULT_CATEGORY
    expect(mapped[0].system.category).toBe('medium')
    const stats = getArmorImportStats()
    expect(stats.unknownCategories).toBe(1)
  })
})
