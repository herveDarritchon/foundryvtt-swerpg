import { describe, it, expect } from 'vitest'
import OggDudeDataElement from '../../module/settings/models/OggDudeDataElement.mjs'
import xml2jsModule from '../../vendors/xml2js.min.js'
// Shim global xml2js comme dans autres tests d'intégration
if (globalThis.xml2js === undefined) {
  globalThis.xml2js = { js: xml2jsModule }
}

// Génère un gros XML >10MB pour test performance parsing/buildJsonDataFromFile
function buildLargeWeaponsXml(count) {
  let parts = ['<Weapons>']
  for (let i = 0; i < count; i++) {
    parts.push(
      `<Weapon><Key>W${i}</Key><Name>Weapon ${i}</Name><SkillKey>RANGLT</SkillKey><Damage>5</Damage><Crit>3</Crit><RangeValue>wrShort</RangeValue></Weapon>`,
    ) // ~150 bytes
  }
  parts.push('</Weapons>')
  return parts.join('')
}

describe('Performance import gros fichier XML', () => {
  it('parse Weapons.xml >10MB sous limite temps', async () => {
    // ~150 bytes per weapon; 75k weapons ~11.25MB
    const xml = buildLargeWeaponsXml(75000)
    // Mock JSZip minimal interface: entry.async('text') => xml string
    const fakeZip = {
      files: {
        'Data/Weapons.xml': {
          async async(type) {
            if (type === 'text') return xml
          },
        },
      },
    }
    const directories = {
      Data: [{ name: 'Weapons.xml', fullPath: 'Data/Weapons.xml' }],
    }
    const start = performance.now()
    const jsonData = await OggDudeDataElement.buildJsonDataFromFile(fakeZip, directories, 'Weapons.xml', 'Weapons.Weapon')
    const duration = performance.now() - start
    expect(Array.isArray(jsonData)).toBe(true)
    expect(jsonData.length).toBe(75000)
    // Arbitrary threshold 4000ms
    expect(duration).toBeLessThan(4000)
  }, 15000) // test timeout 15s
})
