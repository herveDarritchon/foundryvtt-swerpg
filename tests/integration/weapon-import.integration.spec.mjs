import { describe, it, expect } from 'vitest'
import fs from 'node:fs/promises'
import xml2jsModule from '../../vendors/xml2js.min.js'
if (globalThis.xml2js === undefined) {
  globalThis.xml2js = { js: xml2jsModule }
}
import { parseXmlToJson } from '../../module/utils/xml/parser.mjs'
import { weaponMapper } from '../../module/importer/items/weapon-ogg-dude.mjs'

describe('Intégration weaponMapper', () => {
  it('mappe plusieurs armes depuis Weapons.xml', async () => {
    const xml = await fs.readFile('resources/integration/Weapons.xml', 'utf8')
    const raw = await parseXmlToJson(xml)
    const weapons = raw.Weapons.Weapon
    expect(Array.isArray(weapons)).toBe(true)
    const mapped = weaponMapper(weapons)
    expect(mapped.length).toBeGreaterThan(10)
    const first = mapped[0]
    expect(first).toHaveProperty('name')
    expect(first).toHaveProperty('type', 'weapon')
    expect(first.system).toHaveProperty('skill')
    expect(first.system).toHaveProperty('range')
  })
})
