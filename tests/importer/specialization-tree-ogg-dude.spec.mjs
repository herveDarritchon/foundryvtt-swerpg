import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../module/utils/logger.mjs', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import OggDudeDataElement from '../../module/settings/models/OggDudeDataElement.mjs'
import { buildSpecializationTreeContext } from '../../module/importer/items/specialization-tree-ogg-dude.mjs'
import { specializationTreeMapper } from '../../module/importer/mappers/oggdude-specialization-tree-mapper.mjs'
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
    expect(item.flags.swerpg.import.unresolved).toBe(true)
    expect(item.flags.swerpg.import.warnings).toContain('unresolved-talent:r1c1')
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
    expect(item.flags.swerpg.import.warnings).toEqual(expect.arrayContaining(['missing-cost:r1c1', 'tree-incomplete']))
    expect(stats.missingCosts).toBe(1)
    expect(stats.incompleteTrees).toBe(1)
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
    expect(context.element.mapper).toBe(specializationTreeMapper)
    expect(context.jsonData).toEqual([{ Key: 'BODYGUARD' }])
  })
})
