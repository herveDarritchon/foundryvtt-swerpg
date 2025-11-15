import { describe, it, expect } from 'vitest'
import fs from 'node:fs/promises'
import xml2jsModule from '../../vendors/xml2js.min.js'
import { parseXmlToJson } from '../../module/utils/xml/parser.mjs'
import { weaponMapper, getWeaponImportStats, resetWeaponImportStats } from '../../module/importer/items/weapon-ogg-dude.mjs'

// Shim xml2js global
if (globalThis.xml2js === undefined) {
  globalThis.xml2js = { js: xml2jsModule }
}

// Mock minimal SYSTEM si absent (qualités d'armes)
if (!globalThis.SYSTEM) {
  globalThis.SYSTEM = {
    WEAPON: {
      QUALITIES: { stunsetting: {}, accurate: {}, vicious: {} },
    },
  }
}

describe('Intégration OggDude -> weaponMapper', () => {
  it('Weapons.xml - mapping de plusieurs armes réelles', async () => {
    resetWeaponImportStats()
    const xml = await fs.readFile('resources/integration/Weapons.xml', 'utf8')
    const raw = await parseXmlToJson(xml)
    expect(raw).toBeDefined()
    const weaponNodes = raw.Weapons.Weapon
    expect(Array.isArray(weaponNodes)).toBe(true)
    const sample = weaponNodes.slice(0, 5)
    const mapped = weaponMapper(sample)
    expect(mapped.length).toBeGreaterThan(0)

    const first = mapped[0]
    expect(first.type).toBe('weapon')
    expect(typeof first.name).toBe('string')
    expect(first.system).toBeDefined()
    expect(first.system).toHaveProperty('skill')
    expect(first.system).toHaveProperty('range')
    expect(typeof first.system.damage).toBe('number')
    expect(typeof first.system.crit).toBe('number')
    expect(Array.isArray(first.system.qualities)).toBe(true)
    expect(typeof first.system.slot).toBe('string')
    expect(typeof first.system.encumbrance).toBe('number')
    expect(typeof first.system.price).toBe('number')
    expect(typeof first.system.rarity).toBe('number')
    expect(typeof first.system.hp).toBe('number')
    expect(typeof first.system.restricted).toBe('boolean')

    const stats = getWeaponImportStats()
    expect(stats.total).toBe(sample.length)
    expect(stats.imported).toBe(mapped.length)
    expect(stats.rejected).toBe(0)
  })

  it('Weapons.xml - enregistrement des qualités inconnues', () => {
    resetWeaponImportStats()
    const fakeWeapon = {
      Name: 'Unknown Quality Weapon',
      SkillKey: 'RANGLT',
      Damage: '4',
      Crit: '3',
      RangeValue: 'wrShort',
      Encumbrance: '1',
      HP: '1',
      Price: '50',
      Rarity: '2',
      Qualities: { Quality: { Key: 'UNKNOWN_QUALITY_X' } },
    }
    const mapped = weaponMapper([fakeWeapon])
    expect(mapped).toHaveLength(1) // non strict -> arme conservée
    const stats = getWeaponImportStats()
    expect(stats.unknownQualities).toBe(1)
    expect(stats.qualityDetails).toContain('UNKNOWN_QUALITY_X')
  })
})
