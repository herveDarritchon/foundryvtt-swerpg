import { describe, it, expect } from 'vitest'
import OggDudeDataElement from '../../module/settings/models/OggDudeDataElement.mjs'

// Construire des entrées zip factices
function makeZipEntry(name, dir = false) {
  return { name, dir }
}

describe('OggDudeDataElement', () => {
  it('classifie les types directory / image / xml', () => {
    const dirEl = new OggDudeDataElement(makeZipEntry('Data/', true))
    expect(dirEl.isDir()).toBe(true)
    const imgEl = new OggDudeDataElement(makeZipEntry('Data/EquipmentImages/Armor/armor.png'))
    expect(imgEl.isImage()).toBe(true)
    const xmlEl = new OggDudeDataElement(makeZipEntry('Data/Armor.xml'))
    expect(xmlEl.isXml()).toBe(true)
  })

  it('groupByType regroupe par type', () => {
    const entries = [
      new OggDudeDataElement(makeZipEntry('Data/', true)),
      new OggDudeDataElement(makeZipEntry('Data/Armor.xml')),
      new OggDudeDataElement(makeZipEntry('Data/EquipmentImages/Armor/armor.png')),
    ]
    const grouped = OggDudeDataElement.groupByType(entries)
    expect(Object.keys(grouped)).toContain('directory')
    expect(Object.keys(grouped)).toContain('xml')
    expect(Object.keys(grouped)).toContain('image')
  })

  it('groupByDirectory ignore les directories et regroupe par path', () => {
    const entries = [
      new OggDudeDataElement(makeZipEntry('Data/', true)),
      new OggDudeDataElement(makeZipEntry('Data/Armor.xml')),
      new OggDudeDataElement(makeZipEntry('Data/Armor2.xml')),
    ]
    const grouped = OggDudeDataElement.groupByDirectory(entries)
    expect(grouped['Data']).toHaveLength(2)
  })
})
