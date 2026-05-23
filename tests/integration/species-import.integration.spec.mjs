import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs/promises'
// Charge la lib XML (vendeur) pour que parseXmlToJson fonctionne en environnement Node
import xml2jsModule from '../../vendors/xml2js.min.js'
// Shim pour environnement Vitest: le bundle UMD exporte via module.exports, on le ré-injecte sous la forme attendue par parser.mjs
if (globalThis.xml2js === undefined) {
  globalThis.xml2js = { js: xml2jsModule }
}
import { parseXmlToJson } from '../../module/utils/xml/parser.mjs'
import { speciesMapper } from '../../module/importer/items/species-ogg-dude.mjs'
import { getSpeciesImportStats, resetSpeciesImportStats } from '../../module/importer/utils/species-import-utils.mjs'

// Mock minimal SYSTEM pour filtrage des freeSkills
if (globalThis.SYSTEM === undefined) {
  globalThis.SYSTEM = { SKILLS: { deception: { id: 'deception' }, charm: { id: 'charm' } } }
}

describe('Intégration OggDude -> speciesMapper', () => {
  beforeEach(() => {
    resetSpeciesImportStats()
    // Ensure no Foundry game context for pure import mapping tests
    if (typeof globalThis.game !== 'undefined') {
      delete globalThis.game
    }
  })

  it('Gossam.xml - SkillModifiers top-level', async () => {
    const xml = await fs.readFile('resources/integration/Species/Gossam.xml', 'utf8')
    const raw = await parseXmlToJson(xml)
    expect(raw).toBeDefined()
    // La racine doit contenir <Species>
    const speciesNode = raw.Species
    expect(speciesNode).toBeDefined()

    const [mapped] = speciesMapper([speciesNode])
    // Clés de base (top-level)
    expect(mapped.key).toBe('GOSSAM')
    expect(mapped.name).toBe('Gossam')

    // system contient les champs du TypeDataModel
    expect(mapped.system.characteristics).toMatchObject({ brawn: 1, agility: 2, intellect: 2, cunning: 3, willpower: 2, presence: 2 })
    expect(mapped.system.woundThreshold).toMatchObject({ modifier: 9, abilityKey: 'brawn' })
    expect(mapped.system.strainThreshold).toMatchObject({ modifier: 11, abilityKey: 'willpower' })
    expect(mapped.system.startingExperience).toBe(100)
    // SkillModifiers contient DECEP RankStart=1 -> freeSkills doit inclure 'deception'
    expect(mapped.system.freeSkills).toContain('deception')
    expect(Array.isArray(mapped.system.freeTalents)).toBe(true)

    // flags préserve la clé OggDude source
    expect(mapped.flags.swerpg.oggdudeKey).toBe('GOSSAM')
  })

  it("Twi'lek.xml - SkillModifiers imbriqués dans OptionChoices", async () => {
    const xml = await fs.readFile("resources/integration/Species/Twi'lek.xml", 'utf8')
    const raw = await parseXmlToJson(xml)
    const speciesNode = raw.Species
    const [mapped] = speciesMapper([speciesNode])
    expect(mapped.key).toBe('TWI')
    expect(mapped.system.freeSkills).toContain('charm')
    expect(mapped.system.freeSkills).toContain('deception')
  })

  it('Bothan.xml — CONV préservé dans freeTalentKeys, freeTalents vide sans game context (non-regression)', async () => {
    // Cas de régression principal : Bothan a TalentModifier Key=CONV (Convincing Demeanor)
    // Sans game context (talents pas encore importés), la résolution UUID doit échouer proprement
    // mais la clé source doit être conservée dans les flags pour une réconciliation ultérieure
    const xml = await fs.readFile('resources/integration/Species/Bothan.xml', 'utf8')
    const raw = await parseXmlToJson(xml)
    const speciesNode = raw.Species
    expect(speciesNode).toBeDefined()

    const [mapped] = speciesMapper([speciesNode])

    expect(mapped.key).toBe('BOTH')
    expect(mapped.name).toBe('Bothan')

    // CONV doit être capturé dans les flags même sans résolution UUID
    expect(mapped.flags.swerpg.oggdude.freeTalentKeys).toContain('CONV')
    // Sans game context, aucun UUID ne peut être résolu
    expect(mapped.system.freeTalents).toEqual([])

    // La stat unknownTalents doit être incrémentée
    const stats = getSpeciesImportStats()
    expect(stats.unknownTalents).toBeGreaterThanOrEqual(1)
    expect(stats.talentDetails).toContain('CONV')
  })
})
