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
  let computeNodePosition
  let resolveTalentItem

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
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.PURCHASED': 'Purchased',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.AVAILABLE': 'Available',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.LOCKED': 'Locked',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.INVALID': 'Invalid',
        'SWERPG.TALENT.UNKNOWN': 'Unknown talent',
      },
    })

    function createMockContainer() {
      return {
        children: [],
        addChild: vi.fn(function (child) {
          this.children.push(child)
          return child
        }),
        removeChild: vi.fn(function (child) {
          this.children = this.children.filter((c) => c !== child)
          return child
        }),
        destroy: vi.fn(function () {
          this.children = []
        }),
      }
    }

    globalThis.PIXI = {
      Application: class MockPixiApplication {
        constructor(options = {}) {
          this.options = options
          this.renderer = { resize: vi.fn() }
          this.canvas = createMockCanvas()
          this.stage = createMockContainer()
          this.destroy = vi.fn()
        }
      },
      Container: class MockContainer {
        constructor() {
          Object.assign(this, createMockContainer())
        }
      },
      Graphics: class MockGraphics {
        constructor() {
          this.calls = []
        }
        lineStyle(...args) {
          this.calls.push(['lineStyle', ...args])
          return this
        }
        moveTo(...args) {
          this.calls.push(['moveTo', ...args])
          return this
        }
        lineTo(...args) {
          this.calls.push(['lineTo', ...args])
          return this
        }
        beginFill(...args) {
          this.calls.push(['beginFill', ...args])
          return this
        }
        endFill() {
          this.calls.push(['endFill'])
          return this
        }
        drawRoundedRect(...args) {
          this.calls.push(['drawRoundedRect', ...args])
          return this
        }
      },
      Text: class MockText {
        constructor(text, style) {
          this.text = text
          this.style = style
          this.x = 0
          this.y = 0
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
      computeNodePosition,
      resolveTalentItem,
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

  it('computes node position from row and column', () => {
    const pos = computeNodePosition(1, 2)
    expect(pos.x).toBe(2 * (140 + 30) + 20)
    expect(pos.y).toBe(1 * (60 + 30) + 20)
    const pos2 = computeNodePosition(0, 0)
    expect(pos2.x).toBe(20)
    expect(pos2.y).toBe(20)
  })

  it('selects the last available specialization as current tree', () => {
    const actor = createActor({
      system: {
        details: {
          specializations: [
            { specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard' },
            { specializationId: 'spec-soldier', name: 'Soldier', treeUuid: 'Item.tree-soldier' },
          ],
        },
        progression: {
          talentPurchases: [],
          experience: { available: 100 },
        },
      },
    })

    globalThis.fromUuidSync = vi.fn((uuid) => {
      if (uuid === 'Item.tree-bodyguard') {
        return { type: 'specialization-tree', name: 'Bodyguard Tree', system: { nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-bg', row: 1, column: 1 }, { nodeId: 'r2c1', talentId: 'Item.talent-bg', row: 2, column: 1 }], connections: [{ from: 'r1c1', to: 'r2c1' }] } }
      }
      if (uuid === 'Item.tree-soldier') {
        return { type: 'specialization-tree', name: 'Soldier Tree', system: { nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-sd', row: 1, column: 1 }, { nodeId: 'r2c1', talentId: 'Item.talent-sd', row: 2, column: 1 }], connections: [{ from: 'r1c1', to: 'r2c1' }] } }
      }
      return null
    })

    const context = buildSpecializationTreeContext(actor)

    expect(context.currentTreeId).toBe('spec-soldier')
    expect(context.currentTreeName).toBe('Soldier Tree')
    expect(context.currentTreeData).not.toBeNull()
  })

  it('sets currentTreeId to null when no specialization is available', () => {
    const actor = createActor({
      system: {
        details: {
          specializations: [
            { specializationId: 'spec-unknown', name: 'Unknown', treeUuid: 'Item.tree-unknown' },
          ],
        },
      },
    })

    globalThis.fromUuidSync = vi.fn(() => null)

    const context = buildSpecializationTreeContext(actor)

    expect(context.currentTreeId).toBeNull()
    expect(context.currentTreeData).toBeNull()
    expect(context.renderNodes).toEqual([])
    expect(context.renderConnections).toEqual([])
  })

  it('builds renderNodes with computed positions, talent names and node states', () => {
    const actor = createActor({
      system: {
        details: {
          specializations: [
            { specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard' },
          ],
        },
        progression: {
          talentPurchases: [],
          experience: { available: 100 },
        },
      },
    })

    globalThis.fromUuidSync = vi.fn((uuid) => {
      if (uuid === 'Item.tree-bodyguard') {
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [
              { nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 },
              { nodeId: 'r1c2', talentId: 'Item.talent-protect', row: 1, column: 2, cost: 15 },
            ],
            connections: [{ from: 'r1c1', to: 'r1c2' }],
          },
        }
      }
      if (uuid === 'Item.talent-tough' || uuid === 'Item.talent-protect') {
        return { name: uuid === 'Item.talent-tough' ? 'Tough' : 'Protect' }
      }
      return null
    })

    const context = buildSpecializationTreeContext(actor)

    expect(context.renderNodes, 'should have 2 render nodes').toHaveLength(2)

    const firstNode = context.renderNodes[0]
    expect(firstNode.nodeId).toBe('r1c1')
    expect(firstNode.talentName).toBe('Tough')
    expect(firstNode.xpCost).toBe(10)
    expect(firstNode.row).toBe(1)
    expect(firstNode.column).toBe(1)
    expect(firstNode.x).toBe(1 * (140 + 30) + 20)
    expect(firstNode.y).toBe(1 * (60 + 30) + 20)

    const secondNode = context.renderNodes[1]
    expect(secondNode.nodeId).toBe('r1c2')
    expect(secondNode.talentName).toBe('Protect')
    expect(secondNode.xpCost).toBe(15)
    expect(secondNode.row).toBe(1)
    expect(secondNode.column).toBe(2)
    expect(secondNode.x).toBe(2 * (140 + 30) + 20)
    expect(secondNode.y).toBe(1 * (60 + 30) + 20)
  })

  it('includes node state for every render node', () => {
    const actor = createActor({
      system: {
        details: {
          specializations: [
            { specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard' },
          ],
        },
      },
    })

    globalThis.fromUuidSync = vi.fn((uuid) => {
      if (uuid === 'Item.tree-bodyguard') {
        return { type: 'specialization-tree', name: 'Bodyguard Tree', system: { nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }], connections: [{ from: 'r1c1', to: 'r2c1' }] } }
      }
      return null
    })

    const context = buildSpecializationTreeContext(actor)

    expect(context.renderNodes, 'should have at least one render node').not.toHaveLength(0)
    for (const node of context.renderNodes) {
      expect(node.nodeId).toBeDefined()
      expect(node.nodeState).toBeDefined()
      expect(node.nodeStateLabel).toBeDefined()
      expect(node.variant).toBeDefined()
      expect(node.variant.fillColor).toBeDefined()
      expect(node.variant.borderColor).toBeDefined()
      expect(node.variant.textColor).toBeDefined()
    }
  })

  it('builds renderConnections with correct from/to center positions', () => {
    const actor = createActor({
      system: {
        details: {
          specializations: [
            { specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard' },
          ],
        },
        progression: {
          talentPurchases: [],
          experience: { available: 100 },
        },
      },
    })

    globalThis.fromUuidSync = vi.fn((uuid) => {
      if (uuid === 'Item.tree-bodyguard') {
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [
              { nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 },
              { nodeId: 'r1c2', talentId: 'Item.talent-protect', row: 1, column: 2, cost: 15 },
            ],
            connections: [{ from: 'r1c1', to: 'r1c2', type: 'straight' }],
          },
        }
      }
      if (uuid === 'Item.talent-tough' || uuid === 'Item.talent-protect') {
        return { name: 'Talent' }
      }
      return null
    })

    const context = buildSpecializationTreeContext(actor)

    expect(context.renderConnections).toHaveLength(1)
    const conn = context.renderConnections[0]
    expect(conn.type).toBe('straight')

    const fromCenterX = context.renderNodes[0].x + 70
    const fromCenterY = context.renderNodes[0].y + 30
    const toCenterX = context.renderNodes[1].x + 70
    const toCenterY = context.renderNodes[1].y + 30

    expect(conn.fromX).toBe(fromCenterX)
    expect(conn.fromY).toBe(fromCenterY)
    expect(conn.toX).toBe(toCenterX)
    expect(conn.toY).toBe(toCenterY)
  })

  it('resolves unknown talentId to i18n fallback', () => {
    const actor = createActor({
      system: {
        details: {
          specializations: [
            { specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard' },
          ],
        },
      },
    })

    globalThis.fromUuidSync = vi.fn((uuid) => {
      if (uuid === 'Item.tree-bodyguard') {
        return { type: 'specialization-tree', name: 'Bodyguard Tree', system: { nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-missing', row: 1, column: 1, cost: 5 }, { nodeId: 'r2c1', talentId: 'Item.talent-other', row: 2, column: 1, cost: 5 }], connections: [{ from: 'r1c1', to: 'r2c1' }] } }
      }
      return null
    })

    const context = buildSpecializationTreeContext(actor)

    expect(context.renderNodes[0].talentName).toBe('Unknown talent')
  })

  it('resolveTalentItem returns name when item found', () => {
    globalThis.fromUuidSync = vi.fn(() => ({ name: 'Dodge' }))
    expect(resolveTalentItem('Item.talent-dodge')).toBe('Dodge')
  })

  it('resolveTalentItem returns unknown fallback when item not found', () => {
    globalThis.fromUuidSync = vi.fn(() => null)
    expect(resolveTalentItem('Item.talent-nonexistent')).toBe('Unknown talent')
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

  it('draws tree nodes and connections into the PIXI stage without crashing', async () => {
    const actor = createActor({
      system: {
        details: {
          specializations: [{ specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard' }],
        },
        progression: {
          talentPurchases: [],
          experience: { available: 100 },
        },
      },
    })
    globalThis.fromUuidSync = vi.fn((uuid) => {
      if (uuid === 'Item.tree-bodyguard') {
        return { type: 'specialization-tree', name: 'Bodyguard Tree', system: { nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }], connections: [{ from: 'r1c1', to: 'r2c1' }] } }
      }
      if (uuid === 'Item.talent-tough') return { name: 'Tough' }
      return null
    })

    const app = new SpecializationTreeApp()
    app.actor = actor
    app.document = actor
    const host = createMockHost({ width: 640, height: 480 })
    app.element = { querySelector: vi.fn(() => host) }

    const context = buildSpecializationTreeContext(actor)

    await app._onRender(context, {})

    expect(app.pixiApp).not.toBeNull()
    expect(app.pixiApp.stage.addChild).toHaveBeenCalled()
    expect(app.pixiApp.stage.children.length).toBeGreaterThan(0)
  })

  it('sets nodeState to available when actor has enough XP and row access', () => {
    const actor = createActor({
      system: {
        details: {
          specializations: [
            { specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard' },
          ],
        },
        progression: {
          talentPurchases: [],
          experience: { available: 100 },
        },
      },
    })

    globalThis.fromUuidSync = vi.fn((uuid) => {
      if (uuid === 'Item.tree-bodyguard') {
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [
              { nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 },
            ],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
      }
      if (uuid === 'Item.talent-tough') return { name: 'Tough' }
      return null
    })

    const context = buildSpecializationTreeContext(actor)

    expect(context.renderNodes[0].nodeState).toBe('available')
    expect(context.renderNodes[0].nodeStateLabel).toBe('Available')
  })

  it('sets nodeState to locked when actor lacks sufficient XP', () => {
    const actor = createActor({
      system: {
        details: {
          specializations: [
            { specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard' },
          ],
        },
        progression: {
          talentPurchases: [],
          experience: { available: 0 },
        },
      },
    })

    globalThis.fromUuidSync = vi.fn((uuid) => {
      if (uuid === 'Item.tree-bodyguard') {
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [
              { nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 },
            ],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
      }
      if (uuid === 'Item.talent-tough') return { name: 'Tough' }
      return null
    })

    const context = buildSpecializationTreeContext(actor)

    expect(context.renderNodes[0].nodeState).toBe('locked')
    expect(context.renderNodes[0].nodeStateLabel).toBe('Locked')
  })

  it('assigns a variant with fillColor, borderColor and textColor per node', () => {
    const actor = createActor({
      system: {
        details: {
          specializations: [
            { specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard' },
          ],
        },
        progression: {
          talentPurchases: [],
          experience: { available: 5 },
        },
      },
    })

    globalThis.fromUuidSync = vi.fn((uuid) => {
      if (uuid === 'Item.tree-bodyguard') {
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [
              { nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 },
            ],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
      }
      if (uuid === 'Item.talent-tough') return { name: 'Tough' }
      return null
    })

    const context = buildSpecializationTreeContext(actor)

    const node = context.renderNodes[0]
    expect(node.variant, 'node should have a variant object').toBeDefined()
    expect(typeof node.variant.fillColor).toBe('number')
    expect(typeof node.variant.borderColor).toBe('number')
    expect(typeof node.variant.textColor).toBe('number')
    expect(typeof node.variant.costColor).toBe('number')
    expect(typeof node.variant.borderWidth).toBe('number')
    expect(typeof node.variant.alpha).toBe('number')
  })

  it('does not trigger any purchase behavior from rendering', () => {
    const actor = createActor({
      system: {
        details: {
          specializations: [
            { specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard' },
          ],
        },
      },
    })

    globalThis.fromUuidSync = vi.fn(() => null)

    const context = buildSpecializationTreeContext(actor)

    expect(context.currentTreeId).toBeNull()
    expect(context.renderNodes).toEqual([])
    expect(context.renderConnections).toEqual([])
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
