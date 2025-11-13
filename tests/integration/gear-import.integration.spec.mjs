import { describe, it, expect } from 'vitest'
import fs from 'node:fs/promises'
import xml2jsModule from '../../vendors/xml2js.min.js'
if (globalThis.xml2js === undefined) {
  globalThis.xml2js = { js: xml2jsModule }
}
import { parseXmlToJson } from '../../module/utils/xml/parser.mjs'
import { gearMapper } from '../../module/importer/items/gear-ogg-dude.mjs'

describe('Intégration gearMapper', () => {
  it('mappe plusieurs équipements depuis Gear.xml', async () => {
    const xml = await fs.readFile('resources/integration/Gear.xml', 'utf8')
    const raw = await parseXmlToJson(xml)
    const gears = raw.Gears.Gear
    expect(Array.isArray(gears)).toBe(true)
    const mapped = gearMapper(gears)
    expect(mapped.length).toBeGreaterThan(10)
    const first = mapped[0]
    expect(first).toHaveProperty('name')
    expect(first).toHaveProperty('type', 'gear')
    expect(first.system).toHaveProperty('category')
    expect(first.system).toHaveProperty('price')
  })
})
