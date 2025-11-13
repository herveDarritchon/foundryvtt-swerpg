import { describe, it, expect } from 'vitest'
import fs from 'node:fs/promises'
import xml2jsModule from '../../vendors/xml2js.min.js'
if (globalThis.xml2js === undefined) {
  globalThis.xml2js = { js: xml2jsModule }
}
import { parseXmlToJson } from '../../module/utils/xml/parser.mjs'
import { armorMapper } from '../../module/importer/items/armor-ogg-dude.mjs'

describe('Intégration armorMapper', () => {
  it('mappe plusieurs armures depuis Armor.xml', async () => {
    const xml = await fs.readFile('resources/integration/Armor.xml', 'utf8')
    const raw = await parseXmlToJson(xml)
    const armors = raw.Armors.Armor
    expect(Array.isArray(armors)).toBe(true)
    const mapped = armorMapper(armors)
    expect(mapped.length).toBeGreaterThan(10)
    const first = mapped[0]
    expect(first).toHaveProperty('name')
    expect(first).toHaveProperty('type', 'armor')
    expect(first.system).toHaveProperty('category')
    expect(first.system).toHaveProperty('defense')
  })
})
