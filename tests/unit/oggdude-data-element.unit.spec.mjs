import { describe, it, expect, beforeEach } from 'vitest'
import OggDudeDataElement from '../../module/settings/models/OggDudeDataElement.mjs'
import { parseXmlToJson } from '../../module/utils/xml/parser.mjs'

// Helper: minimal fake JSZip shape
function buildFakeZip(filesMap) {
  const files = {}
  Object.entries(filesMap).forEach(([name, content]) => {
    files[name] = {
      name,
      dir: false,
      async: async (type) => {
        if (type === 'text') return content
        return content
      },
    }
  })
  return { files }
}

describe('OggDudeDataElement - basic file classification & grouping', () => {
  it('classifies image, xml and directory entries', () => {
    const entries = [
      { name: 'Data/', dir: true },
      { name: 'Data/Weapons.xml', dir: false },
      { name: 'Images/weapon1.png', dir: false },
    ].map((z) => new OggDudeDataElement(z))

    const types = entries.map((e) => e._type)
    expect(types).toEqual(['directory', 'xml', 'image'])
  })

  it('groups by type', () => {
    const entries = [
      { name: 'Data/', dir: true },
      { name: 'Data/Weapons.xml', dir: false },
      { name: 'Images/weapon1.png', dir: false },
      { name: 'Images/weapon2.png', dir: false },
    ].map((z) => new OggDudeDataElement(z))
    const grouped = OggDudeDataElement.groupByType(entries)
    expect(Object.keys(grouped).sort()).toEqual(['directory', 'image', 'xml'])
    expect(grouped.image.length).toBe(2)
  })

  it('groups by directory (excluding directories themselves)', () => {
    const entries = [
      { name: 'Data/', dir: true },
      { name: 'Data/Weapons.xml', dir: false },
      { name: 'Data/Gear.xml', dir: false },
      { name: 'Images/weapon1.png', dir: false },
    ].map((z) => new OggDudeDataElement(z))
    const grouped = OggDudeDataElement.groupByDirectory(entries)
    expect(grouped['Data'].length).toBe(2)
    expect(grouped['Images'].length).toBe(1)
  })
})

describe('OggDudeDataElement - security name validation', () => {
  it('rejects suspicious names (.., /, \\)', () => {
    const directories = {
      Data: [new OggDudeDataElement({ name: 'Data/Weapons.xml', dir: false })],
    }
    expect(OggDudeDataElement.getElementsFrom(directories, 'Data', '../Weapons.xml')).toBeUndefined()
    expect(OggDudeDataElement.getElementsFrom(directories, 'Data', 'Weapons/Weapons.xml')).toBeUndefined()
    expect(OggDudeDataElement.getElementsFrom(directories, 'Data', 'Weapons\\Weapons.xml')).toBeUndefined()
  })
})

describe('OggDudeDataElement - XML parsing with stubbed vendor', () => {
  beforeEach(() => {
    // Minimal stub of xml2js vendor to satisfy parser usage
    globalThis.xml2js = {
      js: {
        parseStringPromise: async (xml) => {
          // Extremely naive XML to JSON for controlled test inputs only
          // Weapons test
          if (xml.includes('<Weapons>')) {
            const nameMatch = /<Name>([^<]+)<\/Name>/.exec(xml)
            return { Weapons: { Weapon: { Name: nameMatch ? nameMatch[1] : '' } } }
          }
          // Generic root test <Root><A>1</A></Root>
          if (xml.includes('<Root>')) {
            const aMatch = /<A>([^<]+)<\/A>/.exec(xml)
            return { Root: { A: aMatch ? aMatch[1] : '' } }
          }
          return {}
        },
      },
    }
  })

  it('buildJsonDataFromFile parses simple Weapons.xml and extracts Weapon Name', async () => {
    const xml = '<Weapons><Weapon><Name>Blaster</Name></Weapon></Weapons>'
    const zip = buildFakeZip({ 'Data/Weapons.xml': xml })
    const elements = OggDudeDataElement.from(zip)
    const byDirectory = OggDudeDataElement.groupByDirectory(elements)
    const data = await OggDudeDataElement.buildJsonDataFromFile(zip, byDirectory, 'Weapons.xml', 'Weapons.Weapon')
    expect(data.Name).toBe('Blaster')
  })

  it('parseXmlToJson parses minimal xml', async () => {
    const result = await parseXmlToJson('<Root><A>1</A></Root>')
    expect(result.Root.A).toBe('1')
  })

  it('throws when vendor xml2js missing interface', async () => {
    // Temporarily sabotage vendor to simulate failure
    const original = globalThis.xml2js
    globalThis.xml2js = { js: { parseStringPromise: undefined } }
    await expect(parseXmlToJson('<X/>')).rejects.toThrow()
    globalThis.xml2js = original
  })
})
