import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../module/utils/logger.mjs', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { logger } from '../../module/utils/logger.mjs'
import OggDudeDataElement from '../../module/settings/models/OggDudeDataElement.mjs'
import { buildSpecializationTreeContext } from '../../module/importer/items/specialization-tree-ogg-dude.mjs'
import { extractDirectionalConnections, specializationTreeMapper } from '../../module/importer/mappers/oggdude-specialization-tree-mapper.mjs'
import {
  getSpecializationTreeImportStats,
  resetSpecializationTreeImportStats,
} from '../../module/importer/utils/specialization-tree-import-utils.mjs'

describe('specializationTreeMapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetSpecializationTreeImportStats()
  })

  it('maps a specialization tree with nodes, costs, and typed connections', () => {
    const input = [
      {
        Key: 'BODYGUARD',
        Name: 'Bodyguard',
        CareerKey: 'HIRED_GUN',
        Description: '[H3]Bodyguard[h3][BR]Protect others.',
        Source: { _: 'Edge of the Empire', $: { Page: '97' } },
        TalentRows: {
          TalentRow: [
            {
              Index: '1',
              TalentColumns: {
                TalentColumn: [
                  {
                    Index: '1',
                    TalentKey: 'PARRY',
                    Cost: '5',
                    Connections: {
                      Connection: [{ To: 'r2c1', Type: 'Vertical' }],
                    },
                  },
                  { Index: '2', TalentKey: 'GRIT', Cost: '5' },
                ],
              },
            },
            {
              Index: '2',
              TalentColumns: {
                TalentColumn: [{ Index: '1', TalentKey: 'TOUGHENED', Cost: '10' }],
              },
            },
          ],
        },
      },
    ]

    const result = specializationTreeMapper(input)
    const stats = getSpecializationTreeImportStats()

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('specialization-tree')
    expect(result[0].name).toBe('Bodyguard')
    expect(result[0].system.specializationId).toBe('bodyguard')
    expect(result[0].system.careerId).toBe('hired-gun')
    expect(result[0].system.nodes.map((node) => node.nodeId), 'rows and columns should become stable node ids').toEqual(['r1c1', 'r1c2', 'r2c1'])
    expect(result[0].system.connections).toEqual([{ from: 'r1c1', to: 'r2c1', type: 'vertical' }])
    expect(result[0].flags.swerpg.import.importedNodeCount).toBe(3)
    expect(result[0].flags.swerpg.import.importedConnectionCount).toBe(1)
    expect(result[0].flags.swerpg.import.status).toBe('valid')
    expect(result[0].flags.swerpg.import.raw).toEqual({
      key: 'BODYGUARD',
      careerKey: 'HIRED_GUN',
      inputFormat: 'talent-rows-columns',
      nodeCount: 3,
    })
    expect(result[0].system.description).toContain('Source:')
    expect(stats.total).toBe(1)
    expect(stats.imported).toBe(1)
    expect(stats.rejected).toBe(0)
  })

  it('keeps unresolved talent references diagnostic without rejecting the tree', () => {
    const result = specializationTreeMapper([
      {
        Key: 'BODYGUARD',
        Name: 'Bodyguard',
        TalentRows: {
          TalentRow: [{ Index: '1', TalentColumns: { TalentColumn: [{ Index: '1', Cost: '5' }] } }],
        },
      },
    ])

    const item = result[0]
    const stats = getSpecializationTreeImportStats()

    expect(item.system.nodes[0].talentId).toBe('unknown:bodyguard:r1c1')
    expect(item.flags.swerpg.import.status).toBe('incomplete')
    expect(item.flags.swerpg.import.unresolved).toBe(true)
    expect(item.flags.swerpg.import.warnings).toContain('unresolved-talent:r1c1')
    expect(item.flags.swerpg.import.raw).toMatchObject({
      key: 'BODYGUARD',
      inputFormat: 'talent-rows-columns',
      nodeCount: 1,
    })
    expect(stats.unresolvedTalents).toBe(1)
    expect(stats.imported).toBe(1)
  })

  it('tracks missing costs and marks the tree as incomplete', () => {
    const result = specializationTreeMapper([
      {
        Key: 'BODYGUARD',
        Name: 'Bodyguard',
        TalentRows: {
          TalentRow: [{ Index: '1', TalentColumns: { TalentColumn: [{ Index: '1', TalentKey: 'PARRY' }] } }],
        },
      },
    ])

    const item = result[0]
    const stats = getSpecializationTreeImportStats()

    expect(item.system.nodes).toEqual([])
    expect(item.flags.swerpg.import.status).toBe('invalid')
    expect(item.flags.swerpg.import.warnings).toEqual(expect.arrayContaining(['missing-cost:r1c1', 'tree-incomplete']))
    expect(stats.missingCosts).toBe(1)
    expect(stats.incompleteTrees).toBe(1)
  })

  it('maps specialization-tree connections from OggDude Directions', () => {
    const input = [
      {
        Key: 'ADVISOR',
        Name: 'Advisor',
        TalentRows: {
          TalentRow: [
            {
              Cost: '5',
              Talents: { Key: ['PLAUSDEN', 'KNOWSOM', 'GRIT', 'KILL'] },
              Directions: {
                Direction: [
                  { Right: 'true' },
                  { Right: 'true', Down: 'true' },
                  {},
                  {},
                ],
              },
            },
            {
              Cost: '10',
              Talents: { Key: ['STIM', 'DEDICATION'] },
              Directions: {
                Direction: [{}, {}],
              },
            },
            {
              Cost: '15',
              Talents: { Key: ['CONFUSE'] },
              Directions: {
                Direction: [{}],
              },
            },
          ],
        },
      },
    ]

    const result = specializationTreeMapper(input)

    expect(result).toHaveLength(1)
    expect(result[0].system.nodes).toHaveLength(7)
    expect(result[0].system.connections).toHaveLength(3)
    expect(result[0].system.connections).toContainEqual({ from: 'r1c1', to: 'r1c2', type: 'horizontal' })
    expect(result[0].system.connections).toContainEqual({ from: 'r1c2', to: 'r1c3', type: 'horizontal' })
    expect(result[0].system.connections).toContainEqual({ from: 'r1c2', to: 'r2c2', type: 'vertical' })
  })

  it('marks trees with partially invalid connections as incomplete', () => {
    const result = specializationTreeMapper([
      {
        Key: 'BODYGUARD',
        Name: 'Bodyguard',
        TalentRows: {
          TalentRow: [
            {
              Index: '1',
              TalentColumns: {
                TalentColumn: [
                  {
                    Index: '1',
                    TalentKey: 'PARRY',
                    Cost: '5',
                    Connections: {
                      Connection: [
                        { To: 'r2c1', Type: 'Vertical' },
                        { To: 'missing-node', Type: 'Vertical' },
                      ],
                    },
                  },
                ],
              },
            },
            {
              Index: '2',
              TalentColumns: {
                TalentColumn: [{ Index: '1', TalentKey: 'TOUGHENED', Cost: '10' }],
              },
            },
          ],
        },
      },
    ])

    expect(result[0].flags.swerpg.import.status).toBe('incomplete')
    expect(result[0].flags.swerpg.import.warnings).toEqual(expect.arrayContaining(['invalid-connection:r1c1->missing-node']))
  })

  it('logs debug with detected format for talent-rows-keys', () => {
    const input = [
      {
        Key: 'ADVISOR',
        Name: 'Advisor',
        TalentRows: {
          TalentRow: [
            {
              Cost: '5',
              Talents: { Key: ['PLAUSDEN', 'KNOWSOM'] },
            },
          ],
        },
      },
    ]

    specializationTreeMapper(input)

    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Format détecté'),
      expect.objectContaining({ specializationId: 'advisor', format: 'talent-rows-keys' }),
    )
  })

  it('logs debug with mapping summary', () => {
    const input = [
      {
        Key: 'ADVISOR',
        Name: 'Advisor',
        TalentRows: {
          TalentRow: [
            {
              Cost: '5',
              Talents: { Key: ['PLAUSDEN', 'KNOWSOM'] },
            },
          ],
        },
      },
    ]

    specializationTreeMapper(input)

    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Résumé du mapping'),
      expect.objectContaining({
        specializationId: 'advisor',
        rawNodeCount: 2,
        importedNodeCount: 2,
        connectionCount: 0,
      }),
    )
  })

  it('logs warn for directional target missing', () => {
    const input = [
      {
        Key: 'ADVISOR',
        Name: 'Advisor',
        TalentRows: {
          TalentRow: [
            {
              Cost: '5',
              Talents: { Key: ['PLAUSDEN'] },
              Directions: {
                Direction: [{ Right: 'true' }],
              },
            },
          ],
        },
      },
    ]

    specializationTreeMapper(input)

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('directional-target-missing'),
      expect.objectContaining({ specializationId: 'advisor' }),
    )
  })

  it('logs warn for unknown format', () => {
    const input = [{ Key: 'UNKNOWN', Name: 'Unknown Format' }]

    specializationTreeMapper(input)

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Format non reconnu'),
      expect.objectContaining({ specializationId: 'unknown' }),
    )
  })
})

  it('maps nodes from real OggDude TalentRows/Talents/Key format', () => {
    const input = [
      {
        Key: 'ADVISOR',
        Name: 'Advisor',
        TalentRows: {
          TalentRow: [
            {
              Cost: '5',
              Talents: { Key: ['PLAUSDEN', 'KNOWSOM', 'GRIT', 'KILL'] },
            },
            {
              Cost: '10',
              Talents: { Key: ['STIM', 'DEDICATION'] },
            },
            {
              Cost: '15',
              Talents: { Key: ['CONFUSE'] },
            },
          ],
        },
      },
    ]

    const result = specializationTreeMapper(input)
    const stats = getSpecializationTreeImportStats()

    expect(result).toHaveLength(1)
    expect(result[0].system.nodes).toHaveLength(7)

    // All row-1 nodes inherit cost from row
    expect(result[0].system.nodes.filter((n) => n.row === 1).every((n) => n.cost === 5)).toBe(true)
    expect(result[0].system.nodes.filter((n) => n.row === 2).every((n) => n.cost === 10)).toBe(true)
    expect(result[0].system.nodes.filter((n) => n.row === 3).every((n) => n.cost === 15)).toBe(true)

    // Verify node identities
    expect(result[0].system.nodes[0]).toMatchObject({ nodeId: 'r1c1', row: 1, column: 1, talentId: 'plausden', cost: 5 })
    expect(result[0].system.nodes[1]).toMatchObject({ nodeId: 'r1c2', row: 1, column: 2, talentId: 'knowsom', cost: 5 })
    expect(result[0].system.nodes[4]).toMatchObject({ nodeId: 'r2c1', row: 2, column: 1, talentId: 'stim', cost: 10 })
    expect(result[0].system.nodes[5]).toMatchObject({ nodeId: 'r2c2', row: 2, column: 2, talentId: 'dedication', cost: 10 })
    expect(result[0].system.nodes[6]).toMatchObject({ nodeId: 'r3c1', row: 3, column: 1, talentId: 'confuse', cost: 15 })

    // Connections empty until #219
    expect(result[0].system.connections).toEqual([])
    expect(stats.total).toBe(1)
    expect(stats.imported).toBe(1)
  })

  it('handles single string Talents.Key as produced by xml2js explicitArray:false', () => {
    const input = [
      {
        Key: 'BODYGUARD',
        Name: 'Bodyguard',
        TalentRows: {
          TalentRow: [
            {
              Cost: '5',
              Talents: { Key: 'PARRY' },
            },
          ],
        },
      },
    ]

    const result = specializationTreeMapper(input)

    expect(result[0].system.nodes).toHaveLength(1)
    expect(result[0].system.nodes[0]).toMatchObject({ nodeId: 'r1c1', talentId: 'parry', cost: 5 })
  })

describe('extractDirectionalConnections', () => {
  it('produces a horizontal connection for Right direction', () => {
    const nodes = [
      { nodeId: 'r1c1', row: 1, column: 1, rawNode: { direction: { Right: 'true' } } },
      { nodeId: 'r1c2', row: 1, column: 2, rawNode: { direction: null } },
    ]
    const result = extractDirectionalConnections(nodes)
    expect(result.connections).toEqual([{ from: 'r1c1', to: 'r1c2', type: 'horizontal' }])
    expect(result.warnings).toEqual([])
  })

  it('produces a vertical connection for Down direction', () => {
    const nodes = [
      { nodeId: 'r1c1', row: 1, column: 1, rawNode: { direction: { Down: 'true' } } },
      { nodeId: 'r2c1', row: 2, column: 1, rawNode: { direction: null } },
    ]
    const result = extractDirectionalConnections(nodes)
    expect(result.connections).toEqual([{ from: 'r1c1', to: 'r2c1', type: 'vertical' }])
    expect(result.warnings).toEqual([])
  })

  it('handles both Right and Down on the same node', () => {
    const nodes = [
      { nodeId: 'r1c1', row: 1, column: 1, rawNode: { direction: { Right: 'true', Down: 'true' } } },
      { nodeId: 'r1c2', row: 1, column: 2, rawNode: { direction: null } },
      { nodeId: 'r2c1', row: 2, column: 1, rawNode: { direction: null } },
    ]
    const result = extractDirectionalConnections(nodes)
    expect(result.connections).toHaveLength(2)
    expect(result.connections).toContainEqual({ from: 'r1c1', to: 'r1c2', type: 'horizontal' })
    expect(result.connections).toContainEqual({ from: 'r1c1', to: 'r2c1', type: 'vertical' })
    expect(result.warnings).toEqual([])
  })

  it('ignores Left and Up directions', () => {
    const nodes = [
      { nodeId: 'r2c2', row: 2, column: 2, rawNode: { direction: { Left: 'true', Up: 'true' } } },
    ]
    const result = extractDirectionalConnections(nodes)
    expect(result.connections).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('returns empty connections when nodes have no directions', () => {
    const nodes = [
      { nodeId: 'r1c1', row: 1, column: 1, rawNode: { direction: null } },
      { nodeId: 'r1c2', row: 1, column: 2, rawNode: { direction: null } },
    ]
    const result = extractDirectionalConnections(nodes)
    expect(result.connections).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('returns warning when Right target node is missing', () => {
    const nodes = [
      { nodeId: 'r1c1', row: 1, column: 1, rawNode: { direction: { Right: 'true' } } },
    ]
    const result = extractDirectionalConnections(nodes)
    expect(result.connections).toEqual([])
    expect(result.warnings).toContain('directional-target-missing:r1c1->r1c2 (Right)')
  })

  it('returns warning when Down target node is missing', () => {
    const nodes = [
      { nodeId: 'r1c1', row: 1, column: 1, rawNode: { direction: { Down: 'true' } } },
    ]
    const result = extractDirectionalConnections(nodes)
    expect(result.connections).toEqual([])
    expect(result.warnings).toContain('directional-target-missing:r1c1->r2c1 (Down)')
  })

  it('handles empty nodes array', () => {
    const result = extractDirectionalConnections([])
    expect(result.connections).toEqual([])
    expect(result.warnings).toEqual([])
  })
})

describe('specializationTreeMapper — talentUuid enrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetSpecializationTreeImportStats()
  })

  const minimalInput = [
    {
      Key: 'BODYGUARD',
      Name: 'Bodyguard',
      TalentRows: {
        TalentRow: [
          {
            Cost: '5',
            Talents: { Key: ['PARRY'] },
          },
        ],
      },
    },
  ]

  it('sets talentUuid from talentById when a matching talent exists', () => {
    const talentById = new Map([
      ['parry', { uuid: 'Item.talentParry001', id: 'parry' }],
    ])

    const result = specializationTreeMapper(minimalInput, { talentById })

    expect(result[0].system.nodes[0].talentId).toBe('parry')
    expect(result[0].system.nodes[0].talentUuid).toBe('Item.talentParry001')
  })

  it('sets talentUuid to null when talentById is not provided', () => {
    const result = specializationTreeMapper(minimalInput)

    expect(result[0].system.nodes[0].talentId).toBe('parry')
    expect(result[0].system.nodes[0].talentUuid).toBeNull()
  })

  it('sets talentUuid to null when the talent is not found in talentById', () => {
    const talentById = new Map([
      ['other', { uuid: 'Item.other001', id: 'other' }],
    ])

    const result = specializationTreeMapper(minimalInput, { talentById })

    expect(result[0].system.nodes[0].talentId).toBe('parry')
    expect(result[0].system.nodes[0].talentUuid).toBeNull()
  })

  it('resolves talentUuid when talentById key is already lowercased', () => {
    const talentById = new Map([
      ['parry', { uuid: 'Item.talentParry002', id: 'parry' }],
    ])

    const result = specializationTreeMapper(minimalInput, { talentById })

    expect(result[0].system.nodes[0].talentUuid).toBe('Item.talentParry002')
  })

  it('preserves talentId unchanged when talentUuid is resolved', () => {
    const talentById = new Map([
      ['parry', { uuid: 'Item.talentParry003', id: 'parry' }],
    ])

    const result = specializationTreeMapper(minimalInput, { talentById })

    expect(result[0].system.nodes[0].talentId).toBe('parry')
    expect(result[0].system.nodes[0].talentUuid).toBe('Item.talentParry003')
  })
})

describe('buildSpecializationTreeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds a specialization-tree context for OggDudeDataElement', async () => {
    vi.spyOn(OggDudeDataElement, 'buildJsonDataFromDirectory').mockResolvedValue([{ Key: 'BODYGUARD' }])

    const context = await buildSpecializationTreeContext({}, [], { xml: [], image: [] })

    expect(context.folder.name).toBe('Swerpg - Specialization Trees')
    expect(context.element.type).toBe('specialization-tree')
    expect(typeof context.element.mapper).toBe('function')
    expect(context.jsonData).toEqual([{ Key: 'BODYGUARD' }])
  })
})
