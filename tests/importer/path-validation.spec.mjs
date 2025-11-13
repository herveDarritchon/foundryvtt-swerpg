import { describe, it, expect } from 'vitest'
import OggDudeDataElement from '../../module/settings/models/OggDudeDataElement.mjs'

describe('Sécurité chemins internes ZIP - getElementsFrom', () => {
  const directories = {
    Data: [ { name: 'Armor.xml' }, { name: 'Weapons.xml' } ]
  }
  it('retourne élément valide sur nom OK', () => {
    const el = OggDudeDataElement.getElementsFrom(directories, 'Data', 'Armor.xml')
    expect(el).toBeDefined()
    expect(el.name).toBe('Armor.xml')
  })
  it('rejette noms avec ..', () => {
    const el = OggDudeDataElement.getElementsFrom(directories, 'Data', '../Armor.xml')
    expect(el).toBeUndefined()
  })
  it('rejette noms avec slash', () => {
    const el = OggDudeDataElement.getElementsFrom(directories, 'Data', 'sub/Armor.xml')
    expect(el).toBeUndefined()
  })
  it('rejette noms avec backslash', () => {
    const el = OggDudeDataElement.getElementsFrom(directories, 'Data', 'sub\\Armor.xml')
    expect(el).toBeUndefined()
  })
})
