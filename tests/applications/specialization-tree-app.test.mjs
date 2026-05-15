import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setupFoundryMock, teardownFoundryMock } from '../helpers/mock-foundry.mjs'

function createMockCanvas() {
  const listeners = {}

  return {
    classList: { add: vi.fn() },
    style: {},
    _listeners: listeners,
    addEventListener: vi.fn((event, handler) => {
      listeners[event] = handler
    }),
    removeEventListener: vi.fn((event) => {
      delete listeners[event]
    }),
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
  let computeTreeBoundingBox
  let computeCenteredOffset
  let resolveTalentItem
  let resolveTalentDetail

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
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.ALREADY_PURCHASED': 'Already purchased',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.SPECIALIZATION_NOT_OWNED': 'Specialization not owned',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.TREE_NOT_FOUND': 'Reference tree not found',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.TREE_INCOMPLETE': 'Reference tree is incomplete',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_NOT_FOUND': 'Node not found in tree',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_INVALID': 'Node data is invalid',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_LOCKED': 'Prerequisites not met',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NOT_ENOUGH_XP': 'Not enough XP',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.UNKNOWN': 'Unknown reason',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.XP_COST': 'Cost',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.TYPE': 'Type',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.RANKED': 'Ranked Talent',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.NON_RANKED': 'Non-ranked Talent',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.STATE': 'State',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.REASON': 'Reason',
        'SWERPG.TALENT.UNKNOWN': 'Unknown talent',
      },
    })

    function createMockContainer() {
      const listeners = {}
      return {
        children: [],
        eventMode: 'none',
        hitArea: null,
        position: { set: vi.fn() },
        scale: { set: vi.fn() },
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
        on: vi.fn(function (event, handler) {
          listeners[event] = handler
          return this
        }),
        off: vi.fn(function (event) {
          delete listeners[event]
          return this
        }),
        _listeners: listeners,
      }
    }

    globalThis.PIXI = {
      Rectangle: class MockRectangle {
        constructor(x, y, width, height) {
          this.x = x
          this.y = y
          this.width = width
          this.height = height
        }
      },
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
          this.eventMode = 'none'
          this.cursor = 'default'
          this._listeners = {}
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
        drawRect(...args) {
          this.calls.push(['drawRect', ...args])
          return this
        }
        on(event, handler) {
          this._listeners[event] = handler
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

    const resizeObserverInstances = []

    globalThis.ResizeObserver = class MockResizeObserver {
      constructor(callback) {
        this.callback = callback
        this.observe = vi.fn()
        this.disconnect = vi.fn()
        this.unobserve = vi.fn()
        resizeObserverInstances.push(this)
      }
    }

    globalThis.__resizeObserverInstances = resizeObserverInstances

    globalThis.requestAnimationFrame = vi.fn((callback) => {
      callback()
      return 1
    })

    globalThis.cancelAnimationFrame = vi.fn()

    ;({
      default: SpecializationTreeApp,
      buildSpecializationTreeContext,
      getViewportDimensions,
      computeNodePosition,
      computeTreeBoundingBox,
      computeCenteredOffset,
      resolveTalentItem,
      resolveTalentDetail,
    } = await import('../../module/applications/specialization-tree-app.mjs'))
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete globalThis.PIXI
    delete globalThis.window
    delete globalThis.ResizeObserver
    delete globalThis.requestAnimationFrame
    delete globalThis.cancelAnimationFrame
    delete globalThis.__resizeObserverInstances
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
    expect(pos.x).toBe(2 * (120 + 24) + 20)
    expect(pos.y).toBe(1 * (48 + 24) + 20)
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
              { nodeId: 'r1c1', talentId: 'Item.talent-tough', talentUuid: 'Item.talent-tough', row: 1, column: 1, cost: 10 },
              { nodeId: 'r1c2', talentId: 'Item.talent-protect', talentUuid: 'Item.talent-protect', row: 1, column: 2, cost: 15 },
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
    expect(firstNode.x).toBe(1 * (120 + 24) + 20)
    expect(firstNode.y).toBe(1 * (48 + 24) + 20)

    const secondNode = context.renderNodes[1]
    expect(secondNode.nodeId).toBe('r1c2')
    expect(secondNode.talentName).toBe('Protect')
    expect(secondNode.xpCost).toBe(15)
    expect(secondNode.row).toBe(1)
    expect(secondNode.column).toBe(2)
    expect(secondNode.x).toBe(2 * (120 + 24) + 20)
    expect(secondNode.y).toBe(1 * (48 + 24) + 20)
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

    const fromCenterX = context.renderNodes[0].x + 60
    const fromCenterY = context.renderNodes[0].y + 24
    const toCenterX = context.renderNodes[1].x + 60
    const toCenterY = context.renderNodes[1].y + 24

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

  it('resolveTalentItem returns name from talentUuid when passed node object', () => {
    globalThis.fromUuidSync = vi.fn(() => ({ name: 'Dodge' }))
    expect(resolveTalentItem({ talentUuid: 'Item.talent-dodge', talentId: 'dodge' })).toBe('Dodge')
  })

  describe('computeTreeBoundingBox', () => {
    it('returns zeros for empty nodes', () => {
      const result = computeTreeBoundingBox([])
      expect(result).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 })
    })

    it('returns zeros for nullish nodes', () => {
      expect(computeTreeBoundingBox(null)).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 })
      expect(computeTreeBoundingBox(undefined)).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 })
    })

    it('computes bounds for a single node', () => {
      const result = computeTreeBoundingBox([{ x: 20, y: 20 }], 120, 48)
      expect(result).toEqual({ minX: 20, minY: 20, maxX: 140, maxY: 68, width: 120, height: 48 })
    })

    it('computes bounds for multiple nodes', () => {
      const nodes = [
        { x: 20, y: 20 },
        { x: 164, y: 20 },
        { x: 20, y: 92 },
      ]
      const result = computeTreeBoundingBox(nodes, 120, 48)
      expect(result.minX).toBe(20)
      expect(result.minY).toBe(20)
      expect(result.maxX).toBe(284)
      expect(result.maxY).toBe(140)
      expect(result.width).toBe(264)
      expect(result.height).toBe(120)
    })

    it('accepts custom node width and height', () => {
      const result = computeTreeBoundingBox([{ x: 10, y: 10 }], 80, 30)
      expect(result).toEqual({ minX: 10, minY: 10, maxX: 90, maxY: 40, width: 80, height: 30 })
    })
  })

  describe('computeCenteredOffset', () => {
    it('centers a small tree in a large viewport', () => {
      const bbox = { minX: 20, minY: 20, maxX: 140, maxY: 68, width: 120, height: 48 }
      const result = computeCenteredOffset(bbox, 640, 480)
      const expectedX = (640 - 120) / 2 - 20
      const expectedY = (480 - 48) / 2 - 20
      expect(result.offsetX).toBe(expectedX)
      expect(result.offsetY).toBe(expectedY)
    })

    it('offsets from zero-origin bounding box correctly', () => {
      const bbox = { minX: 0, minY: 0, width: 200, height: 100 }
      const result = computeCenteredOffset(bbox, 400, 300)
      expect(result.offsetX).toBe(100)
      expect(result.offsetY).toBe(100)
    })

    it('handles large tree in small viewport (partial visibility)', () => {
      const bbox = { minX: 20, minY: 20, width: 600, height: 400 }
      const result = computeCenteredOffset(bbox, 320, 320)
      expect(result.offsetX).toBeLessThan(0)
      expect(result.offsetY).toBeLessThan(0)
    })
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
    expect(globalThis.__resizeObserverInstances).toHaveLength(1)
    expect(globalThis.__resizeObserverInstances[0].observe).toHaveBeenCalledWith(host)
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

  it('applies viewport transform via position.set and scale.set after draw', async () => {
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
    const container = app.pixiApp.stage.children.find((c) => c.position && c.scale)
    expect(container).toBeDefined()
    expect(container.position.set).toHaveBeenCalled()
    expect(container.scale.set).toHaveBeenCalled()
  })

  it('preserves renderNodes coordinates after viewport transform', async () => {
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

    const context = buildSpecializationTreeContext(actor)
    const originalX = context.renderNodes[0].x
    const originalY = context.renderNodes[0].y

    const app = new SpecializationTreeApp()
    app.actor = actor
    app.document = actor
    const host = createMockHost({ width: 640, height: 480 })
    app.element = { querySelector: vi.fn(() => host) }

    await app._onRender(context, {})

    expect(context.renderNodes[0].x, 'renderNodes x must not be mutated by viewport').toBe(originalX)
    expect(context.renderNodes[0].y, 'renderNodes y must not be mutated by viewport').toBe(originalY)
  })

  it('does not center when resetView is false', async () => {
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
    await app._onRender(context, { resetView: false })

    expect(app.pixiApp).not.toBeNull()
    const container = app.pixiApp.stage.children.find((c) => c.position && c.scale)
    expect(container).toBeDefined()
    const setCall = container.position.set.mock.calls[0]
    expect(setCall, 'without centering viewport x,y should be 0,0').toEqual([0, 0])
    expect(container.scale.set).toHaveBeenCalledWith(1)
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

  describe('resolveTalentDetail', () => {
    it('returns talent name and isRanked when item is found', () => {
      globalThis.fromUuidSync = vi.fn(() => ({
        name: 'Dodge',
        system: { isRanked: true },
      }))
      const detail = resolveTalentDetail('Item.talent-dodge')
      expect(detail.name).toBe('Dodge')
      expect(detail.isRanked).toBe(true)
    })

    it('returns talent name and isRanked=false when item is found but not ranked', () => {
      globalThis.fromUuidSync = vi.fn(() => ({
        name: 'Tough',
        system: { isRanked: false },
      }))
      const detail = resolveTalentDetail('Item.talent-tough')
      expect(detail.name).toBe('Tough')
      expect(detail.isRanked).toBe(false)
    })

    it('returns unknown fallback when item is not found', () => {
      globalThis.fromUuidSync = vi.fn(() => null)
      const detail = resolveTalentDetail('Item.talent-nonexistent')
      expect(detail.name).toBe('Unknown talent')
      expect(detail.isRanked).toBe(false)
    })

    it('returns unknown fallback when fromUuidSync throws', () => {
      globalThis.fromUuidSync = vi.fn(() => { throw new Error('not found') })
      const detail = resolveTalentDetail('Item.talent-error')
      expect(detail.name).toBe('Unknown talent')
      expect(detail.isRanked).toBe(false)
    })
  })

  describe('resolveTalentDetail with node object', () => {
    it('prioritizes talentUuid over talentId', () => {
      globalThis.fromUuidSync = vi.fn((uuid) => {
        if (uuid === 'Item.talent-dodge') return { name: 'Dodge', system: { isRanked: true } }
        return null
      })

      const detail = resolveTalentDetail({ talentUuid: 'Item.talent-dodge', talentId: 'grit' })
      expect(detail.name).toBe('Dodge')
      expect(detail.isRanked).toBe(true)
    })

    it('falls back to legacy business key lookup when talentUuid is absent', () => {
      globalThis.fromUuidSync = vi.fn(() => null)
      globalThis.game.items = [
        { type: 'talent', name: 'Grit', uuid: 'Item.grit001', system: { id: 'grit', isRanked: true } },
      ]

      const detail = resolveTalentDetail({ talentUuid: null, talentId: 'grit' })
      expect(detail.name).toBe('Grit')
      expect(detail.isRanked).toBe(true)
    })

    it('returns unknown when both talentUuid and talentId fail', () => {
      globalThis.fromUuidSync = vi.fn(() => null)

      const detail = resolveTalentDetail({ talentUuid: null, talentId: 'nonexistent' })
      expect(detail.name).toBe('Unknown talent')
      expect(detail.isRanked).toBe(false)
    })

    it('never calls fromUuidSync with a business-key talentId', () => {
      const fromUuidSync = vi.fn(() => null)
      globalThis.fromUuidSync = fromUuidSync
      globalThis.game.items = [
        { type: 'talent', name: 'Grit', uuid: 'Item.grit001', system: { id: 'grit', isRanked: true } },
      ]

      resolveTalentDetail({ talentUuid: null, talentId: 'grit' })

      expect(fromUuidSync).not.toHaveBeenCalledWith('grit')
    })
  })

  it('includes talentId and isRanked in every render node', () => {
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
              { nodeId: 'r1c1', talentId: 'Item.talent-tough', talentUuid: 'Item.talent-tough', row: 1, column: 1, cost: 10 },
              { nodeId: 'r2c1', talentId: 'Item.talent-protect', talentUuid: 'Item.talent-protect', row: 2, column: 1, cost: 15 },
            ],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
      }
      if (uuid === 'Item.talent-tough') return { name: 'Tough', system: { isRanked: true } }
      if (uuid === 'Item.talent-protect') return { name: 'Protect', system: { isRanked: false } }
      return null
    })

    const context = buildSpecializationTreeContext(actor)

    expect(context.renderNodes, 'should have 2 render nodes').toHaveLength(2)

    const tough = context.renderNodes.find((n) => n.nodeId === 'r1c1')
    expect(tough).toBeDefined()
    expect(tough.talentId).toBe('Item.talent-tough')
    expect(tough.isRanked).toBe(true)

    const protect = context.renderNodes.find((n) => n.nodeId === 'r2c1')
    expect(protect).toBeDefined()
    expect(protect.talentId).toBe('Item.talent-protect')
    expect(protect.isRanked).toBe(false)
  })

  it('includes reasonCode and reasonLabel for locked nodes', () => {
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
      if (uuid === 'Item.talent-tough') return { name: 'Tough', system: { isRanked: false } }
      return null
    })

    const context = buildSpecializationTreeContext(actor)

    expect(context.renderNodes).toHaveLength(1)
    const node = context.renderNodes[0]
    expect(node.nodeState).toBe('locked')
    expect(node.reasonCode).toBe('not-enough-xp')
    expect(node.reasonLabel).toBe('Not enough XP')
  })

  it('includes reasonCode and reasonLabel for nodes locked by accessibility', () => {
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
              { nodeId: 'r2c1', talentId: 'Item.talent-protect', row: 2, column: 1, cost: 5 },
            ],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
      }
      if (uuid === 'Item.talent-tough') return { name: 'Tough', system: { isRanked: false } }
      if (uuid === 'Item.talent-protect') return { name: 'Protect', system: { isRanked: false } }
      return null
    })

    const context = buildSpecializationTreeContext(actor)

    const lockedNode = context.renderNodes.find((n) => n.nodeState === 'locked')
    expect(lockedNode).toBeDefined()
    expect(lockedNode.reasonCode).toBe('node-locked')
    expect(lockedNode.reasonLabel).toBe('Prerequisites not met')
  })

  it('sets reasonLabel to null for available nodes', () => {
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
      if (uuid === 'Item.talent-tough') return { name: 'Tough', system: { isRanked: false } }
      return null
    })

    const context = buildSpecializationTreeContext(actor)

    const available = context.renderNodes.find((n) => n.nodeState === 'available')
    expect(available).toBeDefined()
    expect(available.reasonCode).toBe('')
    expect(available.reasonLabel).toBeNull()
  })

  it('renders mapper-enriched nodes with talentUuid without falling back to Unknown talent', () => {
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
              { nodeId: 'r1c1', talentId: 'grit', talentUuid: 'Item.talent-grit', row: 1, column: 1, cost: 10 },
              { nodeId: 'r2c1', talentId: 'tough', talentUuid: 'Item.talent-tough', row: 2, column: 1, cost: 15 },
            ],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
      }
      if (uuid === 'Item.talent-grit') return { name: 'Grit', system: { isRanked: true } }
      if (uuid === 'Item.talent-tough') return { name: 'Tough', system: { isRanked: false } }
      return null
    })

    const context = buildSpecializationTreeContext(actor)

    expect(context.renderNodes, 'should have 2 render nodes').toHaveLength(2)

    const grit = context.renderNodes.find((n) => n.nodeId === 'r1c1')
    expect(grit).toBeDefined()
    expect(grit.talentName, 'grit resolved by talentUuid').toBe('Grit')
    expect(grit.talentId, 'grit keeps business key').toBe('grit')
    expect(grit.isRanked, 'grit is ranked').toBe(true)

    const tough = context.renderNodes.find((n) => n.nodeId === 'r2c1')
    expect(tough).toBeDefined()
    expect(tough.talentName, 'tough resolved by talentUuid').toBe('Tough')
    expect(tough.talentId, 'tough keeps business key').toBe('tough')
    expect(tough.isRanked, 'tough is not ranked').toBe(false)

    const unknownNodes = context.renderNodes.filter((n) => n.talentName === 'Unknown talent')
    expect(unknownNodes, 'no node falls back to Unknown talent').toHaveLength(0)
  })

  it('resetView action recenters the tree viewport', async () => {
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
    await app._onRender(context, { resetView: false })

    expect(app.pixiApp).not.toBeNull()
    const container = app.pixiApp.stage.children.find((c) => c.position && c.scale)
    expect(container, 'tree container must exist after render').toBeDefined()
    expect(container.position.set.mock.calls.at(-1), 'initial viewport must be at origin').toEqual([0, 0])

    container.position.set.mockClear()
    container.scale.set.mockClear()

    const event = { preventDefault: vi.fn() }
    await SpecializationTreeApp.DEFAULT_OPTIONS.actions.resetView.call(app, event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(container.position.set).toHaveBeenCalled()
    expect(container.scale.set).toHaveBeenCalledWith(1)
    const centerCall = container.position.set.mock.calls[0]
    expect(centerCall[0], 'centered x must differ from origin').not.toBe(0)
    expect(centerCall[1], 'centered y must differ from origin').not.toBe(0)
  })

  it('pans the viewport when dragging on the stage background', async () => {
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
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
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
    expect(context.renderNodes, 'drag test requires one render node').toHaveLength(1)
    const originalNode = { x: context.renderNodes[0].x, y: context.renderNodes[0].y }

    await app._onRender(context, { resetView: false })

    const stage = app.pixiApp.stage
    const container = stage.children.find((child) => child.position && child.scale)
    expect(stage.hitArea, 'stage hitArea must cover the viewport').toEqual({ x: 0, y: 0, width: 640, height: 480 })

    container.position.set.mockClear()

    stage._listeners.pointerdown({ global: { x: 100, y: 120 } })
    stage._listeners.pointermove({ global: { x: 140, y: 170 } })

    expect(container.position.set, 'drag on background must move the viewport').toHaveBeenCalledWith(40, 50)
    expect(context.renderNodes[0].x, 'drag must not mutate node x').toBe(originalNode.x)
    expect(context.renderNodes[0].y, 'drag must not mutate node y').toBe(originalNode.y)
  })

  it('stops panning on pointerup', async () => {
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
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
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
    await app._onRender(context, { resetView: false })

    const stage = app.pixiApp.stage
    const container = stage.children.find((child) => child.position && child.scale)

    stage._listeners.pointerdown({ global: { x: 10, y: 20 } })
    stage._listeners.pointerup()
    container.position.set.mockClear()
    stage._listeners.pointermove({ global: { x: 30, y: 40 } })

    expect(container.position.set, 'pointermove after pointerup must not pan').not.toHaveBeenCalled()
  })

  it('stops panning on pointerupoutside', async () => {
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
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
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
    await app._onRender(context, { resetView: false })

    const stage = app.pixiApp.stage
    const container = stage.children.find((child) => child.position && child.scale)

    stage._listeners.pointerdown({ global: { x: 10, y: 20 } })
    stage._listeners.pointerupoutside()
    container.position.set.mockClear()
    stage._listeners.pointermove({ global: { x: 30, y: 40 } })

    expect(container.position.set, 'pointermove after pointerupoutside must not pan').not.toHaveBeenCalled()
  })

  it('stops propagation on node pointerdown so pan does not start from node interaction', async () => {
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
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
      }
      if (uuid === 'Item.talent-tough') return { name: 'Tough', system: { isRanked: false } }
      return null
    })

    const tooltip = {
      hidden: true,
      querySelector: vi.fn((selector) => {
        if (selector === '[data-tooltip-header]') return { textContent: '' }
        if (selector === '[data-tooltip-body]') return { innerHTML: '' }
        return null
      }),
    }

    const app = new SpecializationTreeApp()
    app.actor = actor
    app.document = actor
    const host = createMockHost({ width: 640, height: 480 })
    app.element = {
      querySelector: vi.fn((selector) => {
        if (selector === '[data-specialization-tree-viewport]') return host
        if (selector === '[data-node-tooltip]') return tooltip
        return null
      }),
    }

    const context = buildSpecializationTreeContext(actor)
    await app._onRender(context, { resetView: false })

    const stage = app.pixiApp.stage
    const container = stage.children.find((child) => child.position && child.scale)
    const nodeHitArea = container.children.find((child) => child._listeners?.pointerdown)
    const stopPropagation = vi.fn()

    nodeHitArea._listeners.pointerdown({ stopPropagation })
    container.position.set.mockClear()
    stage._listeners.pointermove({ global: { x: 30, y: 40 } })

    expect(stopPropagation, 'node pointerdown must stop propagation').toHaveBeenCalled()
    expect(container.position.set, 'node interaction alone must not start panning').not.toHaveBeenCalled()
  })

  it('does not duplicate stage listeners between renders and cleans them up on close', async () => {
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
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
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
    await app._onRender(context, { resetView: false })

    const stage = app.pixiApp.stage
    expect(stage.on.mock.calls.map(([eventName]) => eventName), 'stage listeners must be registered once').toEqual([
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointerupoutside',
    ])

    stage.on.mockClear()
    await app._onRender(context, { resetView: false })

    expect(stage.on, 'rerender must not duplicate stage listeners').not.toHaveBeenCalled()

    await app.close()

    expect(stage.off.mock.calls.map(([eventName]) => eventName), 'close must clean viewport listeners').toEqual([
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointerupoutside',
    ])
  })

  it('registers a wheel listener on the PIXI canvas', async () => {
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
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
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
    await app._onRender(context, { resetView: false })

    const canvas = app.pixiApp.canvas
    expect(canvas.addEventListener, 'wheel listener must be registered on canvas').toHaveBeenCalledWith(
      'wheel', expect.any(Function), { passive: false },
    )
  })

  it('wheel zoom in increases viewport scale by zoomStep', async () => {
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
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
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
    await app._onRender(context, { resetView: false })

    const container = app.pixiApp.stage.children.find((c) => c.position && c.scale)
    expect(container, 'tree container must exist').toBeDefined()

    container.scale.set.mockClear()
    container.position.set.mockClear()

    app.pixiApp.canvas._listeners.wheel({ deltaY: -100, offsetX: 320, offsetY: 240, preventDefault: vi.fn() })

    expect(container.scale.set, 'wheel up must zoom in by zoomStep factor').toHaveBeenCalledWith(1.15)
  })

  it('wheel zoom out decreases viewport scale by zoomStep', async () => {
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
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
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
    await app._onRender(context, { resetView: false })

    const container = app.pixiApp.stage.children.find((c) => c.position && c.scale)
    expect(container, 'tree container must exist').toBeDefined()

    container.scale.set.mockClear()
    container.position.set.mockClear()

    app.pixiApp.canvas._listeners.wheel({ deltaY: 100, offsetX: 320, offsetY: 240, preventDefault: vi.fn() })

    expect(container.scale.set, 'wheel down must zoom out by 1/zoomStep factor').toHaveBeenCalledWith(1 / 1.15)
  })

  it('clamps zoom scale between minZoom and maxZoom', async () => {
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
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
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
    await app._onRender(context, { resetView: false })

    const container = app.pixiApp.stage.children.find((c) => c.position && c.scale)
    expect(container, 'tree container must exist').toBeDefined()

    container.scale.set.mockClear()
    container.position.set.mockClear()

    const canvas = app.pixiApp.canvas
    const fire = (deltaY) => canvas._listeners.wheel({ deltaY, offsetX: 320, offsetY: 240, preventDefault: vi.fn() })

    fire(-100)
    expect(container.scale.set, 'zoom in must not exceed maxZoom 2').toHaveBeenCalledWith(1.15)

    fire(-100)
    fire(-100)
    fire(-100)
    fire(-100)
    fire(-100)
    expect(container.scale.set, 'zoom in after many steps must not exceed maxZoom 2').toHaveBeenCalledWith(2)

    container.scale.set.mockClear()

    fire(100)
    fire(100)
    fire(100)
    fire(100)
    fire(100)
    fire(100)
    fire(100)
    fire(100)
    fire(100)
    fire(100)
    expect(container.scale.set, 'zoom out after many steps must not go below minZoom 0.5').toHaveBeenCalledWith(0.5)
  })

  it('wheel zoom preserves pointer point stability and does not mutate renderNodes', async () => {
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
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
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
    expect(context.renderNodes, 'stability test requires at least one node').toHaveLength(1)
    const originalNode = { x: context.renderNodes[0].x, y: context.renderNodes[0].y }

    await app._onRender(context, { resetView: false })

    const container = app.pixiApp.stage.children.find((c) => c.position && c.scale)
    expect(container, 'tree container must exist').toBeDefined()

    container.scale.set.mockClear()
    container.position.set.mockClear()

    const pointerX = 320
    const pointerY = 240
    app.pixiApp.canvas._listeners.wheel({ deltaY: -100, offsetX: pointerX, offsetY: pointerY, preventDefault: vi.fn() })

    const setCalls = container.position.set.mock.calls
    const lastCall = setCalls[setCalls.length - 1]
    expect(lastCall, 'viewport position must be recalculated after zoom').toBeDefined()

    const newViewportX = lastCall[0]
    const newViewportY = lastCall[1]

    const worldX = (pointerX - 0) / 1
    const worldY = (pointerY - 0) / 1
    const expectedX = pointerX - worldX * 1.15
    const expectedY = pointerY - worldY * 1.15
    expect(newViewportX, 'viewport x must keep pointer point stable').toBeCloseTo(expectedX, 5)
    expect(newViewportY, 'viewport y must keep pointer point stable').toBeCloseTo(expectedY, 5)

    expect(context.renderNodes[0].x, 'zoom must not mutate node x').toBe(originalNode.x)
    expect(context.renderNodes[0].y, 'zoom must not mutate node y').toBe(originalNode.y)
  })

  it('removes the wheel listener from the canvas on close', async () => {
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
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
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
    await app._onRender(context, { resetView: false })

    const canvas = app.pixiApp.canvas
    await app.close()

    expect(canvas.removeEventListener, 'close must remove wheel listener').toHaveBeenCalledWith(
      'wheel', expect.any(Function),
    )
  })

  it('zoomIn action increases viewport scale by zoomStep', async () => {
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
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
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
    await app._onRender(context, { resetView: false })

    const container = app.pixiApp.stage.children.find((c) => c.position && c.scale)
    expect(container, 'tree container must exist').toBeDefined()

    container.scale.set.mockClear()
    container.position.set.mockClear()

    const event = { preventDefault: vi.fn() }
    await SpecializationTreeApp.DEFAULT_OPTIONS.actions.zoomIn.call(app, event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(container.scale.set, 'zoomIn must zoom in by zoomStep factor').toHaveBeenCalledWith(1.15)
  })

  it('zoomOut action decreases viewport scale by zoomStep', async () => {
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
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
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
    await app._onRender(context, { resetView: false })

    const container = app.pixiApp.stage.children.find((c) => c.position && c.scale)
    expect(container, 'tree container must exist').toBeDefined()

    container.scale.set.mockClear()
    container.position.set.mockClear()

    const event = { preventDefault: vi.fn() }
    await SpecializationTreeApp.DEFAULT_OPTIONS.actions.zoomOut.call(app, event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(container.scale.set, 'zoomOut must zoom out by 1/zoomStep factor').toHaveBeenCalledWith(1 / 1.15)
  })

  it('zoomIn and zoomOut actions do not mutate renderNodes', async () => {
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
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
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
    expect(context.renderNodes, 'immutability test requires at least one node').toHaveLength(1)
    const originalNode = { x: context.renderNodes[0].x, y: context.renderNodes[0].y }

    await app._onRender(context, { resetView: false })

    const event = { preventDefault: vi.fn() }
    await SpecializationTreeApp.DEFAULT_OPTIONS.actions.zoomIn.call(app, event)
    await SpecializationTreeApp.DEFAULT_OPTIONS.actions.zoomOut.call(app, event)

    expect(context.renderNodes[0].x, 'zoom actions must not mutate node x').toBe(originalNode.x)
    expect(context.renderNodes[0].y, 'zoom actions must not mutate node y').toBe(originalNode.y)
  })
})
