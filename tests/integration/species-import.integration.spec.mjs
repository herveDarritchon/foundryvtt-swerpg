import { describe, it, expect } from 'vitest'
import fs from 'node:fs/promises'
// Charge la lib XML (vendeur) pour que parseXmlToJson fonctionne en environnement Node
import xml2jsModule from '../../vendors/xml2js.min.js'
// Shim pour environnement Vitest: le bundle UMD exporte via module.exports, on le ré-injecte sous la forme attendue par parser.mjs
if (globalThis.xml2js === undefined) {
  globalThis.xml2js = { js: xml2jsModule }
}
// Désactivation potentielle de logs verbeux pour ce test (si logger configuré globalement)
import { parseXmlToJson } from '../../module/utils/xml/parser.mjs'
import { speciesMapper } from '../../module/importer/items/species-ogg-dude.mjs'

// Mock minimal SYSTEM pour filtrage des freeSkills
if (globalThis.SYSTEM === undefined) {
  globalThis.SYSTEM = { SKILLS: { deception: { id: 'deception' } } }
}

describe('Intégration OggDude -> speciesMapper', () => {
  it('Gossam.xml - SkillModifiers top-level', async () => {
    const xml = await fs.readFile('resources/integration/Species/Gossam.xml', 'utf8')
    const raw = await parseXmlToJson(xml)
    expect(raw).toBeDefined()
    // La racine doit contenir <Species>
    const speciesNode = raw.Species
    expect(speciesNode).toBeDefined()

    const [mapped] = speciesMapper([speciesNode])
    // Clés de base
    expect(mapped.key).toBe('GOSSAM')
    expect(mapped.name).toBe('Gossam')
    expect(mapped.characteristics).toMatchObject({ brawn: 1, agility: 2, intellect: 2, cunning: 3, willpower: 2, presence: 2 })
    expect(mapped.woundThreshold).toMatchObject({ modifier: 9, abilityKey: 'brawn' })
    expect(mapped.strainThreshold).toMatchObject({ modifier: 11, abilityKey: 'willpower' })
    expect(mapped.startingExperience).toBe(100)
    // SkillModifiers contient DECEP RankStart=1 -> freeSkills doit inclure 'deception'
    expect(mapped.freeSkills).toContain('deception')
    expect(Array.isArray(mapped.freeTalents)).toBe(true)
  })

  it('Twi\'lek.xml - SkillModifiers imbriqués dans OptionChoices', async () => {
    const xml = await fs.readFile('resources/integration/Species/Twi\'lek.xml', 'utf8')
    const raw = await parseXmlToJson(xml)
    const speciesNode = raw.Species
    const [mapped] = speciesMapper([speciesNode])
    expect(mapped.key).toBe('TWI')
    expect(mapped.freeSkills).toContain('charm')
    expect(mapped.freeSkills).toContain('deception')
  })
})
