import { describe, it, expect } from 'vitest'
import OggDudeDataElement from '../../module/settings/models/OggDudeDataElement.mjs'

describe('Sécurité OggDudeDataElement.getElementsFrom', () => {
  it('rejette les noms avec path traversal', () => {
    const directories = {
      Data: [{ name: 'Armor.xml' }, { name: 'Weapons.xml' }],
    }
    expect(OggDudeDataElement.getElementsFrom(directories, 'Data', '../Armor.xml')).toBeUndefined()
    expect(OggDudeDataElement.getElementsFrom(directories, 'Data', 'sub/Armor.xml')).toBeUndefined()
    expect(OggDudeDataElement.getElementsFrom(directories, 'Data', 'Armor..xml')).toBeUndefined()
  })

  it('retourne le fichier quand le nom est valide', () => {
    const directories = { Data: [{ name: 'Armor.xml' }] }
    const found = OggDudeDataElement.getElementsFrom(directories, 'Data', 'Armor.xml')
    expect(found).toBeDefined()
    expect(found.name).toBe('Armor.xml')
  })
})
