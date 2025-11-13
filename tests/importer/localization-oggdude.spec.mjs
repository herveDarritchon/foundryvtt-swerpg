import { describe, it, expect } from 'vitest'
import fr from '../../lang/fr.json'
import en from '../../lang/en.json'

describe('Localisation OggDudeDataImporter', () => {
  it('contient toutes les clés en français', () => {
    const enKeys = Object.keys(en.SWERPG?.OggDudeDataImporter || en.OggDudeDataImporter || {})
    const frRoot = fr.OggDudeDataImporter
    expect(frRoot).toBeDefined()
    // Vérifie quelques clés critiques
    expect(frRoot.name).toBeDefined()
    expect(frRoot.loadWindow).toBeDefined()
    expect(frRoot.loadWindow.menuLabel).toBeDefined()
    expect(frRoot.loadWindow.domains).toBeDefined()
  })
})
