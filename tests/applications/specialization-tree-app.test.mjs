import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setupFoundryMock, teardownFoundryMock } from '../helpers/mock-foundry.mjs'

function createActor(overrides = {}) {
  return {
    id: 'actor-1',
    name: 'Vara Kesh',
    type: 'character',
    isOwner: true,
    update: vi.fn().mockResolvedValue(undefined),
    system: {
      details: { specializations: [] },
      progression: { talentPurchases: [], experience: { available: 100 } },
      ...overrides.system,
    },
    ...overrides,
  }
}

function createRoot({ viewportHost, tooltip }) {
  return {
    querySelector: vi.fn((selector) => {
      if (selector === '[data-specialization-tree-viewport]') return viewportHost
      if (selector === '[data-node-tooltip]') return tooltip
      return null
    }),
function getTreeContainer(app) {
  return app.pixiApp.stage.children.find((child) => child.position && child.scale)
}

/**
 * Recursively collect all descendant display objects from a container.
 * @param {object} container - A mock PIXI container with a `children` array.
 * @returns {object[]} Flat list of all descendants.
 */
function flattenChildren(container) {
  const result = []
  for (const child of container.children ?? []) {
    result.push(child)
    if (Array.isArray(child.children)) {
      result.push(...flattenChildren(child))
    }
  }
}

/**
 * Find the first node hit area within a tree container.
 * Each node is now wrapped in its own PIXI.Container (for hover dimming),
 * so the hit area is one level deeper than the tree container.
 * @param {object} treeContainer
 * @returns {object|undefined}
 */
function findNodeHitArea(treeContainer) {
  return flattenChildren(treeContainer).find((child) => child._listeners?.pointerdown)
}

describe('specialization-tree application', () => {
  let SpecializationTreeApp
  let buildSpecializationTreeContext
  let mockRendererInstances
  let purchaseTalentNodeMock
  let forgetTalentNodeMock

  beforeEach(async () => {
    setupFoundryMock({
      translations: {
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TITLE': 'Specialization trees: {actor}',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUBTITLE': 'subtitle',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.UNKNOWN_ACTOR': 'Unknown actor',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.UNKNOWN_SPECIALIZATION': 'Unknown specialization',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.VIEWPORT_ARIA_LABEL': 'viewport',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.AVAILABLE': 'Available tree',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.UNRESOLVED': 'Tree not resolved',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.INCOMPLETE': 'Incomplete tree',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUMMARY.ACTIONABLE': 'Actionable',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUMMARY.LOCKED': 'Locked',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUMMARY.AVAILABLE_XP': 'Available XP',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_ACTOR_TITLE': 'No actor selected',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_ACTOR_DESCRIPTION': 'desc',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_SPECIALIZATIONS_TITLE': 'No owned specialization',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_SPECIALIZATIONS_DESCRIPTION': 'desc',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_AVAILABLE_TREE_TITLE': 'No available tree',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_AVAILABLE_TREE_DESCRIPTION': 'desc',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.PURCHASED': 'Purchased',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.AVAILABLE': 'Available',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.LOCKED': 'Locked',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.INVALID': 'Invalid',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.ALREADY_PURCHASED': 'Already purchased',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_LOCKED': 'Prerequisites not met',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NOT_ENOUGH_XP': 'Not enough XP',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_HAS_DEPENDENTS': 'Node has purchased dependents',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.XP_COST': 'Cost',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.TYPE': 'Type',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.RANKED': 'Ranked Talent',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.NON_RANKED': 'Non-ranked Talent',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.STATE': 'State',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.REASON': 'Reason',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.PURCHASE.SUCCESS': 'Purchase successful: {talent}',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.PURCHASE.FAILURE': 'Purchase failed: {reason}',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.FORGET.SUCCESS': 'Talent forgotten: {talent}',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.FORGET.FAILURE': 'Forget failed: {reason}',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.CONFIRM.PURCHASE.TITLE': '{action}: {talent}',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.CONFIRM.PURCHASE.CONTENT': 'Spend {xp} XP to purchase {talent}?',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.CONFIRM.FORGET.TITLE': '{action}: {talent}',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.CONFIRM.FORGET.CONTENT': 'Forget {talent} and refund {xp} XP?',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.PERMISSION_DENIED': 'Denied',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.PURCHASE': 'Purchase',
        'SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.FORGET': 'Forget',
        'SWERPG.TALENT.UNKNOWN': 'Unknown talent',
      },
    })

    mockRendererInstances = []
    purchaseTalentNodeMock = vi.fn().mockResolvedValue({ ok: true })
    forgetTalentNodeMock = vi.fn().mockResolvedValue({ ok: true })

    class MockPixiTreeRenderer {
      constructor(options = {}) {
        this.options = options
        this.mount = vi.fn()
        this.update = vi.fn().mockResolvedValue(undefined)
        this.destroy = vi.fn()
        this.resetView = vi.fn()
        this.zoomIn = vi.fn()
        this.zoomOut = vi.fn()
        this.onNodePointerDown = null
        mockRendererInstances.push(this)
      }
    }

    vi.doMock('../../module/applications/specialization-tree/pixi-tree-renderer.mjs', () => ({
      PixiTreeRenderer: MockPixiTreeRenderer,
    }))

    vi.doMock('../../module/lib/talent-node/talent-node-purchase.mjs', () => ({
      purchaseTalentNode: purchaseTalentNodeMock,
    }))

    vi.doMock('../../module/lib/talent-node/talent-node-forget.mjs', () => ({
      forgetTalentNode: forgetTalentNodeMock,
    }))

    foundry.applications.api.DialogV2.confirm = vi.fn().mockResolvedValue(false)

    const mod = await import('../../module/applications/specialization-tree-app.mjs')
    SpecializationTreeApp = mod.default
    buildSpecializationTreeContext = mod.buildSpecializationTreeContext
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.doUnmock('../../module/applications/specialization-tree/pixi-tree-renderer.mjs')
    vi.doUnmock('../../module/lib/talent-node/talent-node-purchase.mjs')
    vi.doUnmock('../../module/lib/talent-node/talent-node-forget.mjs')
    teardownFoundryMock()
  })

  it('buildSpecializationTreeContext returns empty context when no actor', () => {
    const context = buildSpecializationTreeContext(null)

    expect(context.hasActor).toBe(false)
    expect(context.actor).toBeNull()
    expect(context.document).toBeNull()
    expect(context.system).toBeNull()
    expect(context.isOwner).toBe(false)
  })

  it('buildSpecializationTreeContext adds Foundry fields around the pure builder', () => {
    globalThis.fromUuidSync = vi.fn((uuid) => {
      if (uuid === 'Item.tree-spec') {
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [{ nodeId: 'n1', talentId: 'Item.t1', talentUuid: 'Item.t1', row: 1, column: 1, cost: 5 }],
            connections: [{ from: 'n1', to: 'n2' }],
          },
        }
      }
      if (uuid === 'Item.t1') return { name: 'Tough', system: { isRanked: false } }
      return null
    })

    const actor = createActor({
      system: {
        details: { specializations: [{ specializationId: 'spec', name: 'Bodyguard', treeUuid: 'Item.tree-spec' }] },
      },
    })

    const context = buildSpecializationTreeContext(actor)

    expect(context.hasActor).toBe(true)
    expect(context.actor).toBe(actor)
    expect(context.document).toBe(actor)
    expect(context.system).toBe(actor.system)
    expect(context.config).toBe(game.system.config)
    expect(context.isOwner).toBe(true)
  })

  it('open sets actor and renders', async () => {
    const actor = createActor()
    const app = new SpecializationTreeApp()
    const renderSpy = vi.spyOn(app, 'render').mockResolvedValue(app)

    const result = await app.open(actor)

    expect(result).toBe(app)
    expect(app.actor).toBe(actor)
    expect(app.document).toBe(actor)
    expect(renderSpy).toHaveBeenCalledWith({ force: true })
  })

  it('refresh coalesces concurrent calls and merges options', async () => {
    const app = new SpecializationTreeApp()
    app.actor = createActor()
    app.rendered = true
    const renderSpy = vi.spyOn(app, 'render').mockResolvedValue(app)

    await Promise.all([app.refresh({ resetView: true }), app.refresh({ resetView: true })])

    expect(renderSpy).toHaveBeenCalledTimes(1)
    expect(renderSpy).toHaveBeenCalledWith({ force: true, resetView: true })
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
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: { nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }], connections: [{ from: 'r1c1', to: 'r2c1' }] },
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

    await app._onRender(context, {})

    expect(app.pixiApp).not.toBeNull()
    expect(app.pixiApp.stage.addChild).toHaveBeenCalled()
    expect(app.pixiApp.stage.children.length).toBeGreaterThan(0)
  })

  it('draws connections before node graphics in the PIXI container', async () => {
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
            nodes: [
              { nodeId: 'r1c1', talentId: 'Item.talent-tough', talentUuid: 'Item.talent-tough', row: 1, column: 1, cost: 10 },
              { nodeId: 'r2c1', talentId: 'Item.talent-grit', talentUuid: 'Item.talent-grit', row: 2, column: 1, cost: 15 },
            ],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
      }
      if (uuid === 'Item.talent-tough') return { name: 'Tough', system: { isRanked: false } }
      if (uuid === 'Item.talent-grit') return { name: 'Grit', system: { isRanked: false } }
      return null
    })

    const app = new SpecializationTreeApp()
    app.actor = actor
    app.document = actor
    const host = createMockHost({ width: 640, height: 480 })
    app.element = { querySelector: vi.fn(() => host) }

    const context = buildSpecializationTreeContext(actor)
    await app._onRender(context, {})

    const treeContainer = app.pixiApp.stage.children.find((c) => c.position && c.scale)
    expect(treeContainer, 'tree container must exist').toBeDefined()

    // The first direct Graphics child of the treeContainer is the connections (lineStyle is its first call)
    const directGraphicsChildren = treeContainer.children.filter((c) => c.constructor.name === 'MockGraphics')
    const firstGraphicsCall = directGraphicsChildren[0]?.calls?.[0]?.[0]
    expect(firstGraphicsCall, 'first Graphics call must be lineStyle for connections').toBe('lineStyle')

    // Node backgrounds are now inside per-node Containers — find the first one
    const allGraphicsChildren = flattenChildren(treeContainer).filter((c) => c.constructor.name === 'MockGraphics')
    const nodeBackground = allGraphicsChildren.find((c) => c.calls?.[0]?.[0] === 'beginFill')
    expect(nodeBackground, 'a node background Graphics with beginFill must exist').toBeDefined()
  })

  it('renders a (R) indicator on PIXI cards for ranked talents', async () => {
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
            nodes: [
              { nodeId: 'r1c1', talentId: 'Item.talent-tough', talentUuid: 'Item.talent-tough', row: 1, column: 1, cost: 10 },
              { nodeId: 'r2c1', talentId: 'Item.talent-grit', talentUuid: 'Item.talent-grit', row: 2, column: 1, cost: 15 },
            ],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
      }
      if (uuid === 'Item.talent-tough') return { name: 'Tough', system: { isRanked: true } }
      if (uuid === 'Item.talent-grit') return { name: 'Grit', system: { isRanked: false } }
      return null
    })

    const app = new SpecializationTreeApp()
    app.actor = actor
    app.document = actor
    const host = createMockHost({ width: 640, height: 480 })
    app.element = { querySelector: vi.fn(() => host) }

    const context = buildSpecializationTreeContext(actor)
    await app._onRender(context, {})

    const treeContainer = app.pixiApp.stage.children.find((c) => c.position && c.scale)
    expect(treeContainer, 'tree container must exist').toBeDefined()

    const rankedTexts = flattenChildren(treeContainer).filter((c) => c.constructor.name === 'MockText' && c.text === '(R)')
    expect(rankedTexts, 'ranked indicator (R) must appear exactly once for Tough').toHaveLength(1)

    const nonRankedTexts = flattenChildren(treeContainer).filter((c) => c.constructor.name === 'MockText' && /^Grit$/.test(c.text))
    expect(nonRankedTexts, 'Grit text must be present').toHaveLength(1)
  })

  it('renders state pictogram on every node card', async () => {
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
            nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', talentUuid: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
      }
      if (uuid === 'Item.talent-tough') return { name: 'Tough', system: { isRanked: false } }
      return null
    })

    const app = new SpecializationTreeApp()
    const viewportHost = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
    const tooltip = { hidden: true, querySelector: vi.fn(() => null) }
    app.element = createRoot({ viewportHost, tooltip })

    const context = {
      currentTreeId: 'spec-a',
      renderNodes: [{ nodeId: 'n1' }],
      renderConnections: [{ fromNodeId: 'n1', toNodeId: 'n2' }],
    }

    await app._onRender(context, {})

    const treeContainer = app.pixiApp.stage.children.find((c) => c.position && c.scale)
    expect(treeContainer, 'tree container must exist').toBeDefined()

    const node = context.renderNodes[0]
    const pictogram = node.variant.pictogram
    expect(pictogram, 'node variant must have a pictogram').toBeTruthy()

    const pictogramTexts = flattenChildren(treeContainer).filter((c) => c.constructor.name === 'MockText' && c.text === pictogram)
    expect(pictogramTexts.length, 'state pictogram must appear on the node card').toBeGreaterThanOrEqual(1)
  })

  it('renders type indicator icon for passive talents by default', async () => {
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
      { resetView: true }
    )
  })

  it('does not reset view on rerender when tree selection is unchanged', async () => {
    const app = new SpecializationTreeApp()
    const viewportHost = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
    const tooltip = { hidden: true, querySelector: vi.fn(() => null) }
    app.element = createRoot({ viewportHost, tooltip })

    const context = { currentTreeId: 'spec-a', renderNodes: [], renderConnections: [] }

    await app._onRender(context, {})

    const treeContainer = app.pixiApp.stage.children.find((c) => c.position && c.scale)
    expect(treeContainer, 'tree container must exist').toBeDefined()

    const node = context.renderNodes[0]
    const expectedIcon = node.nodeTypeIcon
    expect(expectedIcon, 'node must have a type icon').toBeTruthy()

    const typeTexts = flattenChildren(treeContainer).filter((c) => c.constructor.name === 'MockText' && c.text === expectedIcon)
    expect(typeTexts.length, 'type indicator icon must be rendered on the node card').toBeGreaterThanOrEqual(1)
  })

  it('renders type indicator icon for active talents', async () => {
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
            nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', talentUuid: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
      }
      if (uuid === 'Item.talent-tough') return { name: 'Tough', system: { isRanked: false, activation: 'active' } }
      return null
    })

    const app = new SpecializationTreeApp()
    app.actor = actor
    app.document = actor
    const host = createMockHost({ width: 640, height: 480 })
    app.element = { querySelector: vi.fn(() => host) }

    const context = buildSpecializationTreeContext(actor)
    await app._onRender(context, {})

    const treeContainer = app.pixiApp.stage.children.find((c) => c.position && c.scale)
    expect(treeContainer, 'tree container must exist').toBeDefined()

    const node = context.renderNodes[0]
    expect(node.isActive, 'tough must be active').toBe(true)
    expect(node.nodeType, 'nodeType must be active').toBe('active')

    const typeTexts = flattenChildren(treeContainer).filter((c) => c.constructor.name === 'MockText' && c.text === '\u26A1')
    expect(typeTexts.length, 'active type indicator (⚡) must be rendered').toBeGreaterThanOrEqual(1)
  })

  it('close destroys the renderer and clears actor bindings', async () => {
    const app = new SpecializationTreeApp()
    app.actor = actor
    app.document = actor
    const host = createMockHost({ width: 640, height: 480 })
    app.element = { querySelector: vi.fn(() => host) }

    const context = buildSpecializationTreeContext(actor)
    await app._onRender(context, {})

    const containerBefore = app.pixiApp.stage.children.find((c) => c.position && c.scale)
    expect(containerBefore, 'tree container must exist after first render').toBeDefined()
    const childrenBefore = containerBefore.children.length

    await app._onRender(context, {})

    const containerAfter = app.pixiApp.stage.children.find((c) => c.position && c.scale)
    expect(containerAfter, 'tree container must exist after second render').toBeDefined()

    expect(containerBefore.destroy, 'old container must have been destroyed').toHaveBeenCalled()
    expect(containerAfter.children.length, 'new container must be rebuilt with fresh children').toBeGreaterThan(0)
    expect(containerAfter.children.length, 'new container must have at least as many children').toBeGreaterThanOrEqual(1)
  })

  it('creates named connections-layer and nodes-layer containers inside the tree container', async () => {
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
            nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', talentUuid: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
      }
      if (uuid === 'Item.talent-tough') return { name: 'Tough', system: { isRanked: false } }
      return null
    })

    const app = new SpecializationTreeApp()
    app.actor = actor
    app.document = actor
    const host = createMockHost({ width: 640, height: 480 })
    app.element = { querySelector: vi.fn(() => host) }

    const context = buildSpecializationTreeContext(actor)
    await app._onRender(context, {})

    const treeContainer = app.pixiApp.stage.children.find((c) => c.position && c.scale)
    expect(treeContainer, 'tree container must exist').toBeDefined()
    expect(treeContainer.label, 'tree container must carry debug label').toBe('specialization-tree')

    const connectionsLayer = treeContainer.children[0]
    const nodesLayer = treeContainer.children[1]
    expect(connectionsLayer, 'connections-layer must be first child').toBeDefined()
    expect(connectionsLayer.label, 'connections-layer label').toBe('connections-layer')
    expect(nodesLayer, 'nodes-layer must be second child').toBeDefined()
    expect(nodesLayer.label, 'nodes-layer label').toBe('nodes-layer')

    const nodeContainers = nodesLayer.children.filter((c) => c.constructor.name === 'MockContainer')
    expect(nodeContainers.length, 'one node container per render node').toBe(context.renderNodes.length)
    expect(nodeContainers[0].label, 'node container must carry debug label starting with node:').toMatch(/^node:r1c1:/)
  })

  it('populates window.swerpgDebug.specializationTree.nodeViews after draw', async () => {
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
            nodes: [
              { nodeId: 'r1c1', talentId: 'Item.talent-tough', talentUuid: 'Item.talent-tough', row: 1, column: 1, cost: 10 },
              { nodeId: 'r2c1', talentId: 'Item.talent-grit', talentUuid: 'Item.talent-grit', row: 2, column: 1, cost: 15 },
            ],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
      }
      if (uuid === 'Item.talent-tough') return { name: 'Tough', system: { isRanked: false } }
      if (uuid === 'Item.talent-grit') return { name: 'Grit', system: { isRanked: false } }
      return null
    })

    globalThis.game.user = { isGM: true }

    const app = new SpecializationTreeApp()
    app.actor = actor
    app.document = actor
    const host = createMockHost({ width: 640, height: 480 })
    app.element = { querySelector: vi.fn(() => host) }

    const context = buildSpecializationTreeContext(actor)
    await app._onRender(context, {})

    const nodeViews = globalThis.swerpgDebug?.specializationTree?.nodeViews
    expect(nodeViews, 'nodeViews must be exposed after draw').toBeDefined()
    expect(nodeViews).toBeInstanceOf(Map)
    expect(nodeViews.size, 'nodeViews must have one entry per node').toBe(2)
    expect(nodeViews.has('r1c1'), 'r1c1 must be in nodeViews').toBe(true)
    expect(nodeViews.has('r2c1'), 'r2c1 must be in nodeViews').toBe(true)

    const view = nodeViews.get('r1c1')
    expect(view.container, 'view.container must be defined').toBeDefined()
    expect(view.background, 'view.background must be defined').toBeDefined()
    expect(view.nameText, 'view.nameText must be defined').toBeDefined()
    expect(view.costText, 'view.costText must be defined').toBeDefined()
    expect(view.hitArea, 'view.hitArea must be defined').toBeDefined()
    expect(view.data, 'view.data must be the render node').toBeDefined()
    expect(view.data.nodeId).toBe('r1c1')
  })

  it('does not render a (R) indicator when isRanked is false', async () => {
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

    const app = new SpecializationTreeApp()
    app.actor = actor
    app.document = actor
    const host = createMockHost({ width: 640, height: 480 })
    app.element = { querySelector: vi.fn(() => host) }

    const context = buildSpecializationTreeContext(actor)
    await app._onRender(context, {})

    const treeContainer = app.pixiApp.stage.children.find((c) => c.position && c.scale)
    expect(treeContainer, 'tree container must exist').toBeDefined()

    const rankedTexts = flattenChildren(treeContainer).filter((c) => c.constructor.name === 'MockText' && c.text === '(R)')
    expect(rankedTexts, 'no (R) indicator must appear for non-ranked talents').toHaveLength(0)
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
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: { nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }], connections: [{ from: 'r1c1', to: 'r2c1' }] },
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
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: { nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }], connections: [{ from: 'r1c1', to: 'r2c1' }] },
        }
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
        return {
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: { nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }], connections: [{ from: 'r1c1', to: 'r2c1' }] },
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

    const context = buildSpecializationTreeContext(actor)

    expect(context.renderNodes[0].nodeState).toBe('available')
    expect(context.renderNodes[0].nodeStateLabel).toBe('Available')
  })

  it('sets nodeState to locked when actor lacks sufficient XP', () => {
    const actor = createActor({
      system: {
        details: {
          specializations: [{ specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard' }],
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
            nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
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
          specializations: [{ specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard' }],
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
            nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
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

  it('sets nodeState to purchased when talent has already been purchased', () => {
    const actor = createActor({
      system: {
        details: {
          specializations: [{ specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard' }],
        },
        progression: {
          talentPurchases: [
            {
              nodeId: 'r1c1',
              specializationId: 'spec-bodyguard',
              treeId: 'tree-bodyguard',
              talentId: 'Item.talent-tough',
            },
          ],
          experience: { available: 100 },
        },
      },
    })

    globalThis.fromUuidSync = vi.fn((uuid) => {
      if (uuid === 'Item.tree-bodyguard') {
        return {
          id: 'tree-bodyguard',
          type: 'specialization-tree',
          name: 'Bodyguard Tree',
          system: {
            nodes: [
              { nodeId: 'r1c1', talentId: 'Item.talent-tough', talentUuid: 'Item.talent-tough', row: 1, column: 1, cost: 10 },
              { nodeId: 'r2c1', talentId: 'Item.talent-grit', talentUuid: 'Item.talent-grit', row: 2, column: 1, cost: 15 },
            ],
            connections: [{ from: 'r1c1', to: 'r2c1' }],
          },
        }
      }
      if (uuid === 'Item.talent-tough') return { name: 'Tough', system: { isRanked: false } }
      if (uuid === 'Item.talent-grit') return { name: 'Grit', system: { isRanked: false } }
      return null
    })

    const context = buildSpecializationTreeContext(actor)

    expect(context.renderNodes, 'should have 2 render nodes').toHaveLength(2)

    const purchased = context.renderNodes.find((n) => n.nodeId === 'r1c1')
    expect(purchased, 'r1c1 should be purchased').toBeDefined()
    expect(purchased.nodeState, 'purchased node state').toBe('purchased')
    expect(purchased.nodeStateLabel, 'purchased node state label').toBe('Purchased')
    expect(purchased.reasonCode, 'purchased reason code').toBe('already-purchased')
    expect(purchased.reasonLabel, 'purchased reason label').toBe('Already purchased')

    const other = context.renderNodes.find((n) => n.nodeId === 'r2c1')
    expect(other, 'r2c1 should exist').toBeDefined()
    expect(other.nodeState, 'other node must not be purchased').not.toBe('purchased')
  })

  it('does not trigger any purchase behavior from rendering', () => {
    const actor = createActor({
      system: {
        details: {
          specializations: [{ specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard' }],
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

    expect(app.renderer).toBeNull()
    expect(app.actor).toBeNull()
    expect(app.document).toBeNull()
  })

  it('toolbar actions delegate to renderer methods', async () => {
    const app = new SpecializationTreeApp()
    app.renderer = {
      resetView: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
    }

    const resetEvent = { preventDefault: vi.fn() }
    const zoomInEvent = { preventDefault: vi.fn() }
    const zoomOutEvent = { preventDefault: vi.fn() }

    await SpecializationTreeApp.DEFAULT_OPTIONS.actions.resetView.call(app, resetEvent)
    await SpecializationTreeApp.DEFAULT_OPTIONS.actions.zoomIn.call(app, zoomInEvent)
    await SpecializationTreeApp.DEFAULT_OPTIONS.actions.zoomOut.call(app, zoomOutEvent)

    expect(app.renderer.resetView).toHaveBeenCalled()
    expect(app.renderer.zoomIn).toHaveBeenCalled()
    expect(app.renderer.zoomOut).toHaveBeenCalled()
  })

  it('renderer node callback triggers tooltip rendering when no primary action exists', async () => {
    const viewportHost = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
    const headerEl = { textContent: '' }
    const bodyEl = { innerHTML: '' }
    const tooltip = {
      hidden: true,
      querySelector: vi.fn((selector) => {
        if (selector === '[data-tooltip-header]') return headerEl
        if (selector === '[data-tooltip-body]') return bodyEl
        return null
      }),
    }

    const app = new SpecializationTreeApp()
    app.actor = createActor()
    app.element = createRoot({ viewportHost, tooltip })
    await app._onRender({ currentTreeId: 'spec-a', renderNodes: [], renderConnections: [] }, {})

    const node = {
      talentName: 'Tough',
      xpCost: 5,
      isRanked: true,
      nodeStateLabel: 'Available',
      reasonLabel: null,
      actionable: { primaryAction: null },
    }

    await app.renderer.onNodePointerDown(node)

    expect(tooltip.hidden).toBe(false)
    expect(headerEl.textContent).toBe('Tough')
    expect(bodyEl.innerHTML).toContain('5 XP')
  })

  it('renderer node callback executes purchase flow and refreshes on success', async () => {
    const app = new SpecializationTreeApp()
    app.actor = createActor()
    app.rendered = true
    const viewportHost = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
    const tooltip = { hidden: true, querySelector: vi.fn(() => null) }
    app.element = createRoot({ viewportHost, tooltip })
    const refreshSpy = vi.spyOn(app, 'refresh').mockResolvedValue(app)
    const infoSpy = vi.spyOn(ui.notifications, 'info')
    foundry.applications.api.DialogV2.confirm.mockResolvedValue(true)

    await app._onRender({ currentTreeId: 'spec-a', renderNodes: [], renderConnections: [] }, {})

    const node = {
      nodeId: 'n1',
      talentName: 'Tough',
      xpCost: 5,
      actionable: {
        primaryAction: 'purchase',
        canPurchase: true,
        actionRef: { specializationId: 'spec-a', nodeId: 'n1' },
      },
    }

    await app.renderer.onNodePointerDown(node)

    expect(purchaseTalentNodeMock).toHaveBeenCalledWith(app.actor, 'spec-a', 'n1')
    expect(infoSpy).toHaveBeenCalled()
    expect(refreshSpy).toHaveBeenCalled()
  })

  it('renderer node callback executes forget flow and warns on failure', async () => {
    forgetTalentNodeMock.mockResolvedValue({ ok: false, reasonCode: 'node-has-dependents' })
    const app = new SpecializationTreeApp()
    app.actor = createActor()
    app.rendered = true
    const viewportHost = { dataset: {}, firstElementChild: null, replaceChildren: vi.fn() }
    const tooltip = { hidden: true, querySelector: vi.fn(() => null) }
    app.element = createRoot({ viewportHost, tooltip })
    const refreshSpy = vi.spyOn(app, 'refresh').mockResolvedValue(app)
    const warnSpy = vi.spyOn(ui.notifications, 'warn')
    foundry.applications.api.DialogV2.confirm.mockResolvedValue(true)

    await app._onRender({ currentTreeId: 'spec-a', renderNodes: [], renderConnections: [] }, {})

    const node = {
      nodeId: 'n1',
      talentName: 'Tough',
      xpCost: 5,
      actionable: {
        primaryAction: 'forget',
        canForget: true,
        actionRef: { specializationId: 'spec-a', nodeId: 'n1' },
      },
    }

    await app.renderer.onNodePointerDown(node)

    expect(forgetTalentNodeMock).toHaveBeenCalledWith(app.actor, 'spec-a', 'n1')
    expect(warnSpy).toHaveBeenCalled()
    expect(refreshSpy).toHaveBeenCalled()
  })

  it('_prepareContext returns a context object', async () => {
    const app = new SpecializationTreeApp()
    app.actor = createActor()

    const context = await app._prepareContext({})

    expect(context).toBeDefined()
    expect(typeof context.hasActor).toBe('boolean')
  })

  describe('connection visual variants (GUX3 — step 1)', () => {
    it('buildConnectionVariants annotates each connection with a connectionVariant and lineStyle', async () => {
      const { buildConnectionVariants } = await import('../../module/applications/specialization-tree-app.mjs')
      const { NODE_STATE, CONNECTION_VARIANT, CONNECTION_LINE_STYLES } = await import('../../module/applications/specialization-tree/node-ui-state.mjs')

      const renderNodes = [
        { nodeId: 'r1c1', nodeState: NODE_STATE.PURCHASED },
        { nodeId: 'r2c1', nodeState: NODE_STATE.AVAILABLE },
        { nodeId: 'r3c1', nodeState: NODE_STATE.LOCKED },
      ]
      const renderConnections = [
        { fromNodeId: 'r1c1', toNodeId: 'r2c1', fromX: 0, fromY: 0, toX: 1, toY: 1 },
        { fromNodeId: 'r2c1', toNodeId: 'r3c1', fromX: 1, fromY: 1, toX: 2, toY: 2 },
      ]

      const result = buildConnectionVariants(renderConnections, renderNodes)

      expect(result).toHaveLength(2)
      expect(result[0].connectionVariant).toBe(CONNECTION_VARIANT.AVAILABLE)
      expect(result[0].lineStyle).toBe(CONNECTION_LINE_STYLES[CONNECTION_VARIANT.AVAILABLE])
      expect(result[1].connectionVariant).toBe(CONNECTION_VARIANT.LOCKED)
      expect(result[1].lineStyle).toBe(CONNECTION_LINE_STYLES[CONNECTION_VARIANT.LOCKED])
    })

    it('buildConnectionVariants assigns PURCHASED variant when both endpoints are purchased', async () => {
      const { buildConnectionVariants } = await import('../../module/applications/specialization-tree-app.mjs')
      const { NODE_STATE, CONNECTION_VARIANT } = await import('../../module/applications/specialization-tree/node-ui-state.mjs')

      const renderNodes = [
        { nodeId: 'r1c1', nodeState: NODE_STATE.PURCHASED },
        { nodeId: 'r2c1', nodeState: NODE_STATE.PURCHASED },
      ]
      const renderConnections = [{ fromNodeId: 'r1c1', toNodeId: 'r2c1', fromX: 0, fromY: 0, toX: 1, toY: 1 }]

      const result = buildConnectionVariants(renderConnections, renderNodes)

      expect(result[0].connectionVariant).toBe(CONNECTION_VARIANT.PURCHASED)
    })

    it('buildConnectionVariants assigns LOCKED variant for connections involving missing node IDs', async () => {
      const { buildConnectionVariants } = await import('../../module/applications/specialization-tree-app.mjs')
      const { NODE_STATE, CONNECTION_VARIANT } = await import('../../module/applications/specialization-tree/node-ui-state.mjs')

      const renderNodes = [{ nodeId: 'r1c1', nodeState: NODE_STATE.PURCHASED }]
      const renderConnections = [{ fromNodeId: 'r1c1', toNodeId: 'r-missing', fromX: 0, fromY: 0, toX: 1, toY: 1 }]

      const result = buildConnectionVariants(renderConnections, renderNodes)

      expect(result[0].connectionVariant).toBe(CONNECTION_VARIANT.LOCKED)
    })

    it('renders connections with variant-aware line styles in the PIXI container', async () => {
      const actor = createActor({
        system: {
          details: {
            specializations: [{ specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard' }],
          },
          progression: {
            talentPurchases: [{ specializationId: 'spec-bodyguard', nodeId: 'r1c1', talentId: 'Item.talent-tough', xpCost: 10, treeId: 'tree-bodyguard' }],
            experience: { available: 100 },
          },
        },
      })
      globalThis.fromUuidSync = vi.fn((uuid) => {
        if (uuid === 'Item.tree-bodyguard') {
          return {
            id: 'tree-bodyguard',
            type: 'specialization-tree',
            name: 'Bodyguard Tree',
            system: {
              specializationId: 'spec-bodyguard',
              nodes: [
                { nodeId: 'r1c1', talentId: 'Item.talent-tough', talentUuid: 'Item.talent-tough', row: 1, column: 1, cost: 10 },
                { nodeId: 'r2c1', talentId: 'Item.talent-grit', talentUuid: 'Item.talent-grit', row: 2, column: 1, cost: 15 },
              ],
              connections: [{ from: 'r1c1', to: 'r2c1' }],
            },
          }
        }
        if (uuid === 'Item.talent-tough') return { name: 'Tough', system: { isRanked: false } }
        if (uuid === 'Item.talent-grit') return { name: 'Grit', system: { isRanked: false } }
        return null
      })

      const app = new SpecializationTreeApp()
      app.actor = actor
      app.document = actor
      const host = createMockHost({ width: 640, height: 480 })
      app.element = { querySelector: vi.fn(() => host) }

      const context = buildSpecializationTreeContext(actor)
      await app._onRender(context, { resetView: false })

      const treeContainer = app.pixiApp.stage.children.find((c) => c.position && c.scale)
      expect(treeContainer, 'tree container must exist').toBeDefined()

      // First child of treeContainer is the connections Graphics
      const connectionGfx = treeContainer.children.find((c) => c.constructor.name === 'MockGraphics')
      expect(connectionGfx, 'connection graphics must exist').toBeDefined()

      // With r1c1 purchased and r2c1 available, the connection variant is AVAILABLE
      // The lineStyle call should use a width > 1 (AVAILABLE has width 2)
      const lineStyleCalls = connectionGfx.calls.filter((call) => call[0] === 'lineStyle')
      expect(lineStyleCalls.length, 'lineStyle must be called for each connection').toBeGreaterThanOrEqual(1)
      // Each lineStyle call has [cmd, width, color, alpha]
      const [, firstWidth] = lineStyleCalls[0]
      expect(typeof firstWidth, 'lineStyle width must be a number').toBe('number')
      expect(firstWidth, 'AVAILABLE connection must use width >= 2').toBeGreaterThanOrEqual(2)
    })
  })

  describe('hover contextual behaviour (GUX3 — step 2)', () => {
    it('computeHoverContext returns empty sets when hoveredNodeId is null', async () => {
      const { computeHoverContext } = await import('../../module/applications/specialization-tree-app.mjs')

      const connections = [{ fromNodeId: 'r1c1', toNodeId: 'r2c1' }]
      const { prerequisiteNodeIds, unlockNodeIds } = computeHoverContext(null, connections)

      expect(prerequisiteNodeIds.size).toBe(0)
      expect(unlockNodeIds.size).toBe(0)
    })

    it('computeHoverContext identifies prerequisites and unlockable nodes for a hovered node', async () => {
      const { computeHoverContext } = await import('../../module/applications/specialization-tree-app.mjs')

      const connections = [
        { fromNodeId: 'r1c1', toNodeId: 'r2c1' },
        { fromNodeId: 'r2c1', toNodeId: 'r3c1' },
        { fromNodeId: 'r2c1', toNodeId: 'r3c2' },
      ]
      const { prerequisiteNodeIds, unlockNodeIds } = computeHoverContext('r2c1', connections)

      expect(prerequisiteNodeIds.has('r1c1'), 'r1c1 is a prerequisite of r2c1').toBe(true)
      expect(unlockNodeIds.has('r3c1'), 'r3c1 is unlocked by r2c1').toBe(true)
      expect(unlockNodeIds.has('r3c2'), 'r3c2 is unlocked by r2c1').toBe(true)
      expect(unlockNodeIds.size).toBe(2)
      expect(prerequisiteNodeIds.size).toBe(1)
    })

    it('computeHoverContext returns empty sets for a node with no connections', async () => {
      const { computeHoverContext } = await import('../../module/applications/specialization-tree-app.mjs')

      const connections = [{ fromNodeId: 'r1c1', toNodeId: 'r2c1' }]
      const { prerequisiteNodeIds, unlockNodeIds } = computeHoverContext('r3c1', connections)

      expect(prerequisiteNodeIds.size).toBe(0)
      expect(unlockNodeIds.size).toBe(0)
    })

    it('shows the detail panel on node pointerover', async () => {
      const actor = createActor({
        system: {
          details: {
            specializations: [{ specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard' }],
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
              nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', talentUuid: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
              connections: [{ from: 'r1c1', to: 'r1c1' }],
            },
          }
        }
        if (uuid === 'Item.talent-tough') return { name: 'Tough', system: { isRanked: false } }
        return null
      })

      const headerEl = { textContent: '' }
      const bodyEl = { innerHTML: '' }
      const tooltip = {
        hidden: true,
        querySelector: vi.fn((selector) => {
          if (selector === '[data-tooltip-header]') return headerEl
          if (selector === '[data-tooltip-body]') return bodyEl
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

      const treeContainer = app.pixiApp.stage.children.find((c) => c.position && c.scale)
      const hitArea = findNodeHitArea(treeContainer)
      expect(hitArea, 'hit area must exist').toBeDefined()

      // Simulate pointerover
      hitArea._listeners.pointerover?.()

      expect(tooltip.hidden, 'tooltip must be shown on hover').toBe(false)
      expect(headerEl.textContent, 'header must show talent name').toBe('Tough')
    })

    it('hides the detail panel on node pointerout', async () => {
      const actor = createActor({
        system: {
          details: {
            specializations: [{ specializationId: 'spec-bodyguard', name: 'Bodyguard', treeUuid: 'Item.tree-bodyguard' }],
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
              nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', talentUuid: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
              connections: [{ from: 'r1c1', to: 'r1c1' }],
            },
          }
        }
        if (uuid === 'Item.talent-tough') return { name: 'Tough', system: { isRanked: false } }
        return null
      })

      const tooltip = {
        hidden: false,
        querySelector: vi.fn(() => null),
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

      const treeContainer = app.pixiApp.stage.children.find((c) => c.position && c.scale)
      const hitArea = findNodeHitArea(treeContainer)

      // Enter then leave hover
      hitArea._listeners.pointerover?.()
      hitArea._listeners.pointerout?.()

      expect(tooltip.hidden, 'tooltip must be hidden after pointerout').toBe(true)
    })

    it('dims non-highlighted nodes during hover and restores on pointerout', async () => {
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
              nodes: [
                { nodeId: 'r1c1', talentId: 'Item.talent-tough', talentUuid: 'Item.talent-tough', row: 1, column: 1, cost: 10 },
                { nodeId: 'r2c1', talentId: 'Item.talent-grit', talentUuid: 'Item.talent-grit', row: 2, column: 1, cost: 15 },
                { nodeId: 'r3c1', talentId: 'Item.talent-durable', talentUuid: 'Item.talent-durable', row: 3, column: 1, cost: 20 },
              ],
              connections: [
                { from: 'r1c1', to: 'r2c1' },
                { from: 'r2c1', to: 'r3c1' },
              ],
            },
          }
        }
        if (uuid === 'Item.talent-tough') return { name: 'Tough', system: { isRanked: false } }
        if (uuid === 'Item.talent-grit') return { name: 'Grit', system: { isRanked: false } }
        if (uuid === 'Item.talent-durable') return { name: 'Durable', system: { isRanked: false } }
        return null
      })

      const app = new SpecializationTreeApp()
      app.actor = actor
      app.document = actor
      const host = createMockHost({ width: 640, height: 480 })
      app.element = {
        querySelector: vi.fn((selector) => {
          if (selector === '[data-specialization-tree-viewport]') return host
          if (selector === '[data-node-tooltip]') return { hidden: true, querySelector: vi.fn(() => null) }
          return null
        }),
      }

      const context = buildSpecializationTreeContext(actor)
      await app._onRender(context, { resetView: false })

      const treeContainer = app.pixiApp.stage.children.find((c) => c.position && c.scale)

      // Hover over middle node (r2c1) — r1c1 is prerequisite, r3c1 is unlocked
      // Find all three per-node containers (they are direct children of treeContainer that are not the connections Graphics)
      const nodeContainers = treeContainer.children.filter((c) => c.constructor.name === 'MockContainer')
      expect(nodeContainers, 'there must be 3 per-node containers').toHaveLength(3)

      // Find the hit area inside the second node container (r2c1)
      const r2c1HitArea = nodeContainers[1]?.children?.find((c) => c._listeners?.pointerover)
      expect(r2c1HitArea, 'r2c1 must have a pointerover-enabled hit area').toBeDefined()

      r2c1HitArea._listeners.pointerover?.()

      // r2c1 (hovered), r1c1 (prerequisite), r3c1 (unlocked) → alpha 1
      expect(nodeContainers[0].alpha, 'r1c1 (prerequisite) must stay at full opacity').toBe(1)
      expect(nodeContainers[1].alpha, 'r2c1 (hovered) must stay at full opacity').toBe(1)
      expect(nodeContainers[2].alpha, 'r3c1 (unlocked) must stay at full opacity').toBe(1)

      // Hover over first node (r1c1) — no prerequisites, r2c1 is unlocked
      const r1c1HitArea = nodeContainers[0]?.children?.find((c) => c._listeners?.pointerover)
      r1c1HitArea._listeners.pointerover?.()

      // r1c1 (hovered), r2c1 (unlocked by r1c1) → alpha 1; r3c1 → dimmed
      expect(nodeContainers[0].alpha, 'r1c1 (hovered) must stay at full opacity').toBe(1)
      expect(nodeContainers[1].alpha, 'r2c1 (directly unlocked) must stay at full opacity').toBe(1)
      expect(nodeContainers[2].alpha, 'r3c1 (not directly connected to r1c1) must be dimmed').toBeLessThan(1)

      // Exit hover — all nodes must restore to alpha 1
      r1c1HitArea._listeners.pointerout?.()

      expect(nodeContainers[0].alpha, 'r1c1 must restore to full opacity').toBe(1)
      expect(nodeContainers[1].alpha, 'r2c1 must restore to full opacity').toBe(1)
      expect(nodeContainers[2].alpha, 'r3c1 must restore to full opacity').toBe(1)
    })

    it('does not start hover if the same node is hovered again', async () => {
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
              nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', talentUuid: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
              connections: [{ from: 'r1c1', to: 'r1c1' }],
            },
          }
        }
        if (uuid === 'Item.talent-tough') return { name: 'Tough', system: { isRanked: false } }
        return null
      })

      let tooltipShowCount = 0
      const tooltip = {
        hidden: true,
        querySelector: vi.fn((selector) => {
          if (selector === '[data-tooltip-header]') return { textContent: '' }
          if (selector === '[data-tooltip-body]') return { innerHTML: '' }
          return null
        }),
        get hidden() {
          return this._hidden
        },
        set hidden(v) {
          if (!v) tooltipShowCount++
          this._hidden = v
        },
        _hidden: true,
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

      const treeContainer = app.pixiApp.stage.children.find((c) => c.position && c.scale)
      const hitArea = findNodeHitArea(treeContainer)

      // Two consecutive pointerover on the same node must not show the tooltip twice
      hitArea._listeners.pointerover?.()
      hitArea._listeners.pointerover?.()

      expect(tooltipShowCount, 'tooltip must only be shown once for repeated hover of the same node').toBe(1)
    })

    it('clears hover state when the tree is redrawn on refresh', async () => {
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
              nodes: [{ nodeId: 'r1c1', talentId: 'Item.talent-tough', talentUuid: 'Item.talent-tough', row: 1, column: 1, cost: 10 }],
              connections: [{ from: 'r1c1', to: 'r1c1' }],
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

      const treeContainer = app.pixiApp.stage.children.find((c) => c.position && c.scale)
      const hitArea = findNodeHitArea(treeContainer)
      hitArea._listeners.pointerover?.()
      expect(tooltip.hidden, 'tooltip must be shown before redraw').toBe(false)

      // Re-render (simulates refresh after actor update) — tooltip must be hidden
      await app._onRender(context, { resetView: false })
      expect(tooltip.hidden, 'tooltip must be hidden after tree redraw').toBe(true)
    })
  })
})
