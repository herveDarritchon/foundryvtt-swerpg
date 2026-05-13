import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setupFoundryMock, teardownFoundryMock } from '../helpers/mock-foundry.mjs'

function createMockCanvas() {
  return {
    classList: {
      add: vi.fn(),
    },
  }
}

function createMockHost({ width = 640, height = 480 } = {}) {
  return {
    clientWidth: width,
    clientHeight: height,
    firstElementChild: null,
    replaceChildren: vi.fn(function replaceChildren(child) {
      this.firstElementChild = child
    }),
  }
}

function createActor(overrides = {}) {
  return {
    id: 'actor-1',
    name: 'Vara Kesh',
    type: 'character',
    isOwner: true,
    system: {
      details: {
        specializations: [],
      },
      ...overrides.system,
    },
    ...overrides,
  }
}

describe('specialization-tree application', () => {
  let SpecializationTreeApp
  let buildSpecializationTreeContext
  let getViewportDimensions

  beforeEach(async () => {
    setupFoundryMock({
      translations: {
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TITLE': 'Specialization trees: {actor}',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUBTITLE': 'Dedicated graphical viewport for owned specialization trees.',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.UNKNOWN_ACTOR': 'Unknown actor',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.UNKNOWN_SPECIALIZATION': 'Unknown specialization',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.VIEWPORT_ARIA_LABEL': 'Specialization tree graphical viewport',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.AVAILABLE': 'Available tree',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.UNRESOLVED': 'Tree not resolved',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.INCOMPLETE': 'Incomplete tree',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_ACTOR_TITLE': 'No actor selected',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_ACTOR_DESCRIPTION': 'Open this application from a character sheet to inspect the owned specialization trees.',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_SPECIALIZATIONS_TITLE': 'No owned specialization',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_SPECIALIZATIONS_DESCRIPTION': 'This character does not currently own any specialization to display.',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_AVAILABLE_TREE_TITLE': 'No available specialization tree',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_AVAILABLE_TREE_DESCRIPTION': 'The owned specializations were found, but none currently resolve to a complete reference tree.',
      },
    })

    globalThis.PIXI = {
      Application: class MockPixiApplication {
        constructor(options = {}) {
          this.options = options
          this.renderer = {
            resize: vi.fn(),
          }
          this.canvas = createMockCanvas()
          this.destroy = vi.fn()
        }
      },
    }

    globalThis.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }

    ;({
      default: SpecializationTreeApp,
      buildSpecializationTreeContext,
      getViewportDimensions,
    } = await import('../../module/applications/specialization-tree-app.mjs'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete globalThis.PIXI
    delete globalThis.window
    teardownFoundryMock()
  })

  it('builds an empty context when no actor is provided', () => {
    const context = buildSpecializationTreeContext(null)

    expect(context.hasActor).toBe(false)
    expect(context.showViewport).toBe(false)
    expect(context.emptyStateTitle).toBe('No actor selected')
  })

  it('builds specialization entries from resolved trees', () => {
    const actor = createActor({
      system: {
        details: {
          specializations: [
            { specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard' },
            { specializationId: 'spec-pilot', name: 'Pilot', treeUuid: 'Item.tree-pilot' },
          ],
        },
      },
    })

    globalThis.fromUuidSync = vi.fn((uuid) => {
      if (uuid === 'Item.tree-bodyguard') {
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: { nodes: [{ nodeId: 'r1c1' }], connections: [{ from: 'r1c1', to: 'r2c1' }] },
        }
      }
      return null
    })

    const context = buildSpecializationTreeContext(actor)

    expect(context.hasActor).toBe(true)
    expect(context.hasSpecializations).toBe(true)
    expect(context.hasResolvedTrees).toBe(true)
    expect(context.showViewport).toBe(true)
    expect(context.specializations).toEqual([
      expect.objectContaining({
        specializationId: 'spec-bodyguard',
        name: 'Bodyguard',
        treeName: 'Bodyguard Tree',
        state: 'available',
        stateLabel: 'Available tree',
      }),
      expect.objectContaining({
        specializationId: 'spec-pilot',
        name: 'Pilot',
        treeName: null,
        state: 'unresolved',
        stateLabel: 'Tree not resolved',
      }),
    ])
  })

  it('returns safe minimum viewport dimensions', () => {
    const host = createMockHost({ width: 120, height: 180 })

    expect(getViewportDimensions(host)).toEqual({ width: 320, height: 320 })
  })

  it('opens for the provided actor and triggers a render', async () => {
    const actor = createActor()
    const app = new SpecializationTreeApp()
    const renderSpy = vi.spyOn(app, 'render').mockResolvedValue(app)

    const result = await app.open(actor, { resetView: false })

    expect(result).toBe(app)
    expect(app.actor).toBe(actor)
    expect(app.document).toBe(actor)
    expect(renderSpy).toHaveBeenCalledWith({ force: true, resetView: false })
  })

  it('refreshes only when rendered and bound to an actor', async () => {
    const actor = createActor()
    const app = new SpecializationTreeApp()
    const renderSpy = vi.spyOn(app, 'render').mockResolvedValue(app)

    app.actor = actor
    app.rendered = false
    await app.refresh()
    expect(renderSpy).not.toHaveBeenCalled()

    app.rendered = true
    await app.refresh()
    expect(renderSpy).toHaveBeenCalledWith({ force: true })
  })

  it('mounts and resizes a PIXI viewport without using the scene canvas', async () => {
    const actor = createActor({
      system: {
        details: {
          specializations: [{ specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard' }],
        },
      },
    })
    globalThis.fromUuidSync = vi.fn(() => ({
      type: 'specialization-tree',
      name: 'Bodyguard Tree',
      system: { nodes: [{ nodeId: 'r1c1' }], connections: [{ from: 'r1c1', to: 'r2c1' }] },
    }))

    const app = new SpecializationTreeApp()
    app.actor = actor
    app.document = actor
    const host = createMockHost({ width: 640, height: 480 })
    app.element = {
      querySelector: vi.fn(() => host),
    }

    await app._onRender({}, {})

    expect(app.pixiApp).not.toBeNull()
    expect(host.firstElementChild).toBe(app.pixiApp.canvas)
    expect(app.pixiApp.renderer.resize).toHaveBeenCalledWith(640, 480)
    expect(globalThis.window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(globalThis.canvas).toBeUndefined()
  })

  it('tears down the PIXI viewport and clears actor bindings on close', async () => {
    const actor = createActor()
    const app = new SpecializationTreeApp()
    app.actor = actor
    app.document = actor
    app.pixiApp = {
      destroy: vi.fn(),
    }

    await app.close({})

    expect(app.pixiApp).toBeNull()
    expect(app.actor).toBeNull()
    expect(app.document).toBeNull()
  })
})
