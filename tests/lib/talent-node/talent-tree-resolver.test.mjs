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
  getSpecializationTreeResolutionState,
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
})
