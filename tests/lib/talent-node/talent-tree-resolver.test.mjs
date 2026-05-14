import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../module/utils/logger.mjs', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { logger } from '../../../module/utils/logger.mjs'
import {
  findTreeForSpecialization,
  getSpecializationTreeResolutionState,
  normalizeActorSpecializations,
  resolveActorSpecializationTrees,
  resolveSpecializationTree,
} from '../../../module/lib/talent-node/talent-tree-resolver.mjs'

describe('talent-tree-resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.game.ready = true
    globalThis.game.items = []
    globalThis.fromUuidSync = vi.fn()
  })

  it('resolves a specialization tree by treeUuid when the UUID is valid', () => {
    const tree = {
      type: 'specialization-tree',
      system: {
        nodes: [{ nodeId: 'r1c1' }],
        connections: [{ from: 'r1c1', to: 'r2c1' }],
      },
    }
    globalThis.fromUuidSync.mockReturnValue(tree)

    const result = resolveSpecializationTree({ treeUuid: 'Item.tree-uuid', specializationId: 'bodyguard' })

    expect(globalThis.fromUuidSync).toHaveBeenCalledWith('Item.tree-uuid')
    expect(result).toEqual({ tree, state: 'available' })
  })

  it('falls back to specializationId when treeUuid resolution fails', () => {
    const fallbackTree = {
      type: 'specialization-tree',
      system: {
        specializationId: 'bodyguard',
        nodes: [{ nodeId: 'r1c1' }],
        connections: [{ from: 'r1c1', to: 'r2c1' }],
      },
    }
    globalThis.fromUuidSync.mockImplementation(() => {
      throw new Error('bad uuid')
    })
    globalThis.game.items = [fallbackTree]

    const result = resolveSpecializationTree({ treeUuid: 'Item.bad', specializationId: 'bodyguard' })

    expect(result).toEqual({ tree: fallbackTree, state: 'available' })
    expect(logger.warn).toHaveBeenCalledOnce()
  })

  it('returns unresolved and warns when no identifiers are provided', () => {
    const result = resolveSpecializationTree({ name: 'Bodyguard' })

    expect(result).toEqual({ tree: null, state: 'unresolved' })
    expect(logger.warn).toHaveBeenCalledOnce()
  })

  it('returns unresolved when game is not ready', () => {
    globalThis.game.ready = false

    const result = resolveSpecializationTree({ treeUuid: 'Item.tree-uuid', specializationId: 'bodyguard' })

    expect(result).toEqual({ tree: null, state: 'unresolved' })
    expect(globalThis.fromUuidSync).not.toHaveBeenCalled()
  })

  it('marks trees without nodes or connections as incomplete', () => {
    const tree = {
      type: 'specialization-tree',
      system: {
        specializationId: 'bodyguard',
        nodes: [],
        connections: [{ from: 'r1c1', to: 'r2c1' }],
      },
    }

    expect(resolveSpecializationTree({ specializationId: 'bodyguard' })).toEqual({ tree: null, state: 'unresolved' })

    globalThis.game.items = [tree]

    expect(resolveSpecializationTree({ specializationId: 'bodyguard' })).toEqual({ tree, state: 'incomplete' })
  })

  it('resolves all owned specializations for an actor', () => {
    const bodyguardTree = {
      type: 'specialization-tree',
      system: {
        specializationId: 'bodyguard',
        nodes: [{ nodeId: 'r1c1' }],
        connections: [{ from: 'r1c1', to: 'r2c1' }],
      },
    }
    const slicerTree = {
      type: 'specialization-tree',
      system: {
        specializationId: 'slicer',
        nodes: [],
        connections: [],
      },
    }
    globalThis.game.items = [bodyguardTree, slicerTree]

    const result = resolveActorSpecializationTrees({
      system: {
        details: {
          specializations: new Set([
            { specializationId: 'bodyguard', name: 'Bodyguard' },
            { specializationId: 'slicer', name: 'Slicer' },
            { specializationId: 'missing', name: 'Missing' },
          ]),
        },
      },
    })

    expect(result.get('bodyguard')).toEqual({ tree: bodyguardTree, state: 'available' })
    expect(result.get('slicer')).toEqual({ tree: slicerTree, state: 'incomplete' })
    expect(result.get('missing')).toEqual({ tree: null, state: 'unresolved' })
  })

  it('returns available for trees with nodes and connections', () => {
    expect(
      getSpecializationTreeResolutionState({
        system: {
          nodes: [{ nodeId: 'r1c1' }],
          connections: [{ from: 'r1c1', to: 'r2c1' }],
        },
      }),
    ).toBe('available')
  })

  it('returns incomplete for trees without nodes', () => {
    expect(
      getSpecializationTreeResolutionState({
        system: {
          nodes: [],
          connections: [{ from: 'r1c1', to: 'r2c1' }],
        },
      }),
    ).toBe('incomplete')
  })

  describe('findTreeForSpecialization', () => {
    it('finds a tree by matching name slug to specializationId', () => {
      const tree = {
        type: 'specialization-tree',
        system: { specializationId: 'bodyguard', nodes: [], connections: [] },
      }
      globalThis.game.items = [tree]

      const result = findTreeForSpecialization({ name: 'Bodyguard' })

      expect(result).toBe(tree)
    })

    it('finds a tree by matching name exactly', () => {
      const tree = {
        type: 'specialization-tree',
        name: 'Bodyguard Tree',
        system: { specializationId: 'bodyguard', nodes: [], connections: [] },
      }
      globalThis.game.items = [tree]

      const result = findTreeForSpecialization({ name: 'Bodyguard Tree' })

      expect(result).toBe(tree)
    })

    it('returns null when no tree matches', () => {
      globalThis.game.items = []

      const result = findTreeForSpecialization({ name: 'Ambassador' })

      expect(result).toBeNull()
    })

    it('returns null when specData has no name', () => {
      const result = findTreeForSpecialization({})
      expect(result).toBeNull()
    })

    it('returns null when game is not ready', () => {
      globalThis.game = undefined
      const result = findTreeForSpecialization({ name: 'Bodyguard' })
      expect(result).toBeNull()
    })
  })

  it('resolves legacy specialization by name fallback when specializationId and treeUuid are missing', () => {
    const tree = {
      type: 'specialization-tree',
      system: { specializationId: 'bodyguard', nodes: [{ nodeId: 'r1c1' }], connections: [{ from: 'r1c1', to: 'r2c1' }] },
    }
    globalThis.game.items = [tree]

    const result = resolveSpecializationTree({ name: 'Bodyguard' })

    expect(result).toEqual({ tree, state: 'available' })
    expect(logger.warn).toHaveBeenCalledTimes(2)
  })

  describe('normalizeActorSpecializations', () => {
    it('enriches specializations missing specializationId and treeUuid', async () => {
      const tree = {
        uuid: 'Item.tree-bodyguard',
        type: 'specialization-tree',
        system: { specializationId: 'bodyguard', nodes: [], connections: [] },
      }
      globalThis.game.items = [tree]

      const actor = {
        system: {
          details: {
            specializations: new Set([
              { name: 'Bodyguard', img: 'icons/bodyguard.png', freeSkillRank: 4, specializationSkills: [] },
            ]),
          },
        },
        update: vi.fn(),
      }

      const enriched = await normalizeActorSpecializations(actor)

      expect(enriched).toHaveLength(1)
      expect(enriched[0]).toMatchObject({
        name: 'Bodyguard',
        specializationId: 'bodyguard',
        treeUuid: 'Item.tree-bodyguard',
      })
      expect(actor.update).toHaveBeenCalledOnce()
    })

    it('does not modify already-enriched specializations', async () => {
      const actor = {
        system: {
          details: {
            specializations: new Set([
              { name: 'Bodyguard', specializationId: 'bodyguard', treeUuid: 'Item.tree-bodyguard' },
            ]),
          },
        },
        update: vi.fn(),
      }

      const enriched = await normalizeActorSpecializations(actor)

      expect(actor.update).not.toHaveBeenCalled()
      expect(enriched[0].specializationId).toBe('bodyguard')
    })

    it('falls back to slug when no tree is found', async () => {
      globalThis.game.items = []

      const actor = {
        system: {
          details: {
            specializations: new Set([
              { name: 'Ambassador', img: 'icons/ambassador.png', freeSkillRank: 3 },
            ]),
          },
        },
        update: vi.fn(),
      }

      const enriched = await normalizeActorSpecializations(actor)

      expect(enriched).toHaveLength(1)
      expect(enriched[0].specializationId).toBe('ambassador')
      expect(enriched[0].treeUuid).toBeUndefined()
      expect(actor.update).toHaveBeenCalledOnce()
    })

    it('preserves existing fields unchanged', async () => {
      const tree = {
        uuid: 'Item.tree-ambassador',
        type: 'specialization-tree',
        system: { specializationId: 'ambassador', nodes: [], connections: [] },
      }
      globalThis.game.items = [tree]

      const actor = {
        system: {
          details: {
            specializations: new Set([
              {
                name: 'Ambassador',
                img: 'icons/ambassador.png',
                freeSkillRank: 3,
                specializationSkills: [{ id: 'charm' }, { id: 'leadership' }],
                description: '<p>Some desc</p>',
              },
            ]),
          },
        },
        update: vi.fn(),
      }

      const enriched = await normalizeActorSpecializations(actor)

      expect(enriched[0].img).toBe('icons/ambassador.png')
      expect(enriched[0].freeSkillRank).toBe(3)
      expect(enriched[0].specializationSkills).toEqual([{ id: 'charm' }, { id: 'leadership' }])
      expect(enriched[0].description).toBe('<p>Some desc</p>')
    })
  })

  it('returns incomplete for trees flagged as unresolved by import diagnostics', () => {
    expect(
      getSpecializationTreeResolutionState({
        flags: {
          swerpg: {
            import: {
              status: 'incomplete',
              unresolved: true,
            },
          },
        },
        system: {
          nodes: [{ nodeId: 'r1c1' }],
          connections: [{ from: 'r1c1', to: 'r2c1' }],
        },
      }),
    ).toBe('incomplete')
  })
})
