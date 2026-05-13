import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import xml2jsModule from '../../vendors/xml2js.min.js'
import { parseXmlToJson } from '../../module/utils/xml/parser.mjs'
import { extractDirectionalConnections, specializationTreeMapper } from '../../module/importer/mappers/oggdude-specialization-tree-mapper.mjs'
import { buildSpecializationTreeContext } from '../../module/importer/items/specialization-tree-ogg-dude.mjs'
import OggDudeDataElement from '../../module/settings/models/OggDudeDataElement.mjs'
import { resetSpecializationTreeImportStats } from '../../module/importer/utils/specialization-tree-import-utils.mjs'

vi.mock('../../module/utils/logger.mjs', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { logger } from '../../module/utils/logger.mjs'

if (globalThis.xml2js === undefined) {
  globalThis.xml2js = { js: xml2jsModule }
}

const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/Specializations/Advisor.xml')

describe('specializationTreeMapper — OggDude format réel (fixture XML)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetSpecializationTreeImportStats()
  })

  describe('scénario nominal — Advisor.xml (5 lignes × 4 nœuds)', () => {
    let tree

    beforeAll(async () => {
      const xml = await fs.readFile(fixturePath, 'utf-8')
      const raw = await parseXmlToJson(xml)
      const result = specializationTreeMapper([raw.Specialization])
      tree = result[0]
    })

    it('produit exactement 1 arbre de spécialisation', () => {
      expect(tree.type).toBe('specialization-tree')
      expect(tree.name).toBe('Advisor')
    })

    it('importe 20 nœuds depuis 5 lignes de 4 talents', () => {
      expect(tree.system.nodes).toHaveLength(20)
    })

    it('assigne les nodeId r1c1 à r5c4', () => {
      const ids = tree.system.nodes.map(n => n.nodeId)
      expect(ids[0]).toBe('r1c1')
      expect(ids[3]).toBe('r1c4')
      expect(ids[4]).toBe('r2c1')
      expect(ids[19]).toBe('r5c4')
    })

    it('normalise les talentId depuis les clés OggDude', () => {
      const talentIds = tree.system.nodes.map(n => n.talentId)
      expect(talentIds[0]).toBe('plausden')
      expect(talentIds[1]).toBe('knowsom')
      expect(talentIds[3]).toBe('kill')
      expect(talentIds[4]).toBe('tough')
      expect(talentIds[16]).toBe('dedi')
    })

    it('répartit les coûts par ligne : 5, 10, 15, 20, 25', () => {
      expect(tree.system.nodes.filter(n => n.row === 1).every(n => n.cost === 5)).toBe(true)
      expect(tree.system.nodes.filter(n => n.row === 2).every(n => n.cost === 10)).toBe(true)
      expect(tree.system.nodes.filter(n => n.row === 3).every(n => n.cost === 15)).toBe(true)
      expect(tree.system.nodes.filter(n => n.row === 4).every(n => n.cost === 20)).toBe(true)
      expect(tree.system.nodes.filter(n => n.row === 5).every(n => n.cost === 25)).toBe(true)
    })

    it('reporte rawNodeCount et importedNodeCount à 20 dans les flags', () => {
      expect(tree.flags.swerpg.import.rawNodeCount).toBe(20)
      expect(tree.flags.swerpg.import.importedNodeCount).toBe(20)
    })
  })

  describe('connexions directionnelles depuis Directions', () => {
    let tree

    beforeAll(async () => {
      const xml = await fs.readFile(fixturePath, 'utf-8')
      const raw = await parseXmlToJson(xml)
      const result = specializationTreeMapper([raw.Specialization])
      tree = result[0]
    })

    it('génère des connexions horizontales (Right)', () => {
      const conns = tree.system.connections
      expect(conns).toContainEqual({ from: 'r3c2', to: 'r3c3', type: 'horizontal' })
      expect(conns).toContainEqual({ from: 'r3c3', to: 'r3c4', type: 'horizontal' })
      expect(conns).toContainEqual({ from: 'r4c1', to: 'r4c2', type: 'horizontal' })
      expect(conns).toContainEqual({ from: 'r5c1', to: 'r5c2', type: 'horizontal' })
      expect(conns).toContainEqual({ from: 'r5c2', to: 'r5c3', type: 'horizontal' })
    })

    it('génère des connexions verticales (Down)', () => {
      const conns = tree.system.connections
      expect(conns).toContainEqual({ from: 'r1c1', to: 'r2c1', type: 'vertical' })
      expect(conns).toContainEqual({ from: 'r1c4', to: 'r2c4', type: 'vertical' })
      expect(conns).toContainEqual({ from: 'r2c1', to: 'r3c1', type: 'vertical' })
      expect(conns).toContainEqual({ from: 'r3c2', to: 'r4c2', type: 'vertical' })
      expect(conns).toContainEqual({ from: 'r4c1', to: 'r5c1', type: 'vertical' })
      expect(conns).toContainEqual({ from: 'r4c4', to: 'r5c4', type: 'vertical' })
    })

    it('respecte la cardinalité totale des connexions', () => {
      expect(tree.system.connections).toHaveLength(20)
    })

    it('ne contient aucun doublon (clé from→to:type unique)', () => {
      const keys = tree.system.connections.map(c => `${c.from}->${c.to}:${c.type}`)
      expect(new Set(keys).size).toBe(keys.length)
    })

    it('reporte importedConnectionCount cohérent dans les flags', () => {
      expect(tree.flags.swerpg.import.importedConnectionCount).toBe(tree.system.connections.length)
    })
  })

  describe('tolérance aux directions absentes ou partielles', () => {
    it('ne crashe pas quand certaines lignes nont pas de Directions', async () => {
      const xml = `<Specialization>
        <Key>ADVISOR</Key>
        <Name>Advisor</Name>
        <TalentRows>
          <TalentRow>
            <Index>0</Index>
            <Cost>5</Cost>
            <Talents><Key>PLAUSDEN</Key><Key>KNOWSOM</Key></Talents>
          </TalentRow>
        </TalentRows>
      </Specialization>`
      const raw = await parseXmlToJson(xml)
      const result = specializationTreeMapper([raw.Specialization])
      expect(result).toHaveLength(1)
      expect(result[0].system.nodes).toHaveLength(2)
    })

    it('ne crashe pas quand un tableau Directions est vide', async () => {
      const xml = `<Specialization>
        <Key>ADVISOR</Key>
        <Name>Advisor</Name>
        <TalentRows>
          <TalentRow>
            <Index>0</Index>
            <Cost>5</Cost>
            <Talents><Key>PLAUSDEN</Key></Talents>
            <Directions></Directions>
          </TalentRow>
        </TalentRows>
      </Specialization>`
      const raw = await parseXmlToJson(xml)
      const result = specializationTreeMapper([raw.Specialization])
      expect(result).toHaveLength(1)
      expect(result[0].system.connections).toEqual([])
    })
  })

  describe('rétrocompatibilité — ancien format TalentColumns', () => {
    it('mappe encore les arbres au format colonnes', async () => {
      const xml = `<Specialization>
        <Key>BODYGUARD</Key>
        <Name>Bodyguard</Name>
        <TalentRows>
          <TalentRow>
            <Index>1</Index>
            <TalentColumns>
              <TalentColumn><Index>1</Index><TalentKey>PARRY</TalentKey><Cost>5</Cost></TalentColumn>
              <TalentColumn><Index>2</Index><TalentKey>GRIT</TalentKey><Cost>5</Cost></TalentColumn>
            </TalentColumns>
          </TalentRow>
          <TalentRow>
            <Index>2</Index>
            <TalentColumns>
              <TalentColumn><Index>1</Index><TalentKey>TOUGHENED</TalentKey><Cost>10</Cost></TalentColumn>
            </TalentColumns>
          </TalentRow>
        </TalentRows>
      </Specialization>`
      const raw = await parseXmlToJson(xml)
      const result = specializationTreeMapper([raw.Specialization])
      expect(result).toHaveLength(1)
      expect(result[0].system.nodes).toHaveLength(3)
      expect(result[0].system.nodes.map(n => n.nodeId)).toEqual(['r1c1', 'r1c2', 'r2c1'])
      expect(result[0].system.nodes.map(n => n.talentId)).toEqual(['PARRY', 'GRIT', 'TOUGHENED'])
    })
  })

  describe('format non reconnu', () => {
    it('retourne un arbre vide et logge un warning', async () => {
      const xml = `<Specialization>
        <Key>UNKNOWN</Key>
        <Name>Unknown Format</Name>
      </Specialization>`
      const raw = await parseXmlToJson(xml)
      const result = specializationTreeMapper([raw.Specialization])
      expect(result).toHaveLength(1)
      expect(result[0].system.nodes).toEqual([])

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Format non reconnu'),
        expect.objectContaining({ specializationId: 'unknown' }),
      )
    })
  })
})

describe('chaîne complète parseur → context builder → mapper', () => {
  it('produit des nœuds et connexions non vides via buildSpecializationTreeContext', async () => {
    const xml = await fs.readFile(fixturePath, 'utf-8')
    const raw = await parseXmlToJson(xml)

    vi.spyOn(OggDudeDataElement, 'buildJsonDataFromDirectory').mockResolvedValue([raw.Specialization])
    const context = await buildSpecializationTreeContext({}, [], { xml: ['Advisor.xml'], image: [] })

    expect(context.element.type).toBe('specialization-tree')
    expect(context.element.mapper).toBe(specializationTreeMapper)
    expect(context.jsonData).toHaveLength(1)
    expect(context.jsonData[0].Key).toBe('ADVISOR')

    const mapped = context.element.mapper(context.jsonData)

    expect(mapped).toHaveLength(1)
    expect(mapped[0].system.nodes.length).toBeGreaterThan(0)
    expect(mapped[0].system.connections.length).toBeGreaterThan(0)
    expect(mapped[0].flags.swerpg.import.rawNodeCount).toBe(20)
    expect(mapped[0].flags.swerpg.import.importedNodeCount).toBe(20)
    expect(mapped[0].flags.swerpg.import.importedConnectionCount).toBe(mapped[0].system.connections.length)
  })
})

describe('extractDirectionalConnections — contrat booléen OggDude', () => {
  it('accepte Right=true booléen (set programmatiquement)', () => {
    const nodes = [
      { nodeId: 'r1c1', row: 1, column: 1, rawNode: { direction: { Right: true } } },
      { nodeId: 'r1c2', row: 1, column: 2, rawNode: { direction: null } },
    ]
    const result = extractDirectionalConnections(nodes)
    expect(result.connections).toContainEqual({ from: 'r1c1', to: 'r1c2', type: 'horizontal' })
  })

  it('accepte Down=true booléen', () => {
    const nodes = [
      { nodeId: 'r1c1', row: 1, column: 1, rawNode: { direction: { Down: true } } },
      { nodeId: 'r2c1', row: 2, column: 1, rawNode: { direction: null } },
    ]
    const result = extractDirectionalConnections(nodes)
    expect(result.connections).toContainEqual({ from: 'r1c1', to: 'r2c1', type: 'vertical' })
  })

  it('rejette Right=false booléen', () => {
    const nodes = [
      { nodeId: 'r1c1', row: 1, column: 1, rawNode: { direction: { Right: false } } },
      { nodeId: 'r1c2', row: 1, column: 2, rawNode: { direction: null } },
    ]
    const result = extractDirectionalConnections(nodes)
    expect(result.connections).toHaveLength(0)
  })

  it('rejette Right="false" string', () => {
    const nodes = [
      { nodeId: 'r1c1', row: 1, column: 1, rawNode: { direction: { Right: 'false' } } },
      { nodeId: 'r1c2', row: 1, column: 2, rawNode: { direction: null } },
    ]
    const result = extractDirectionalConnections(nodes)
    expect(result.connections).toHaveLength(0)
  })

  it('tolère undefined Left sans créer de connexion', () => {
    const nodes = [
      { nodeId: 'r1c1', row: 1, column: 1, rawNode: { direction: { Left: undefined } } },
    ]
    const result = extractDirectionalConnections(nodes)
    expect(result.connections).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })
})
