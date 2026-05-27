import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  computeCenteredOffset,
  computeTreeBoundingBox,
  getCanvasSharpnessConfig,
  getViewportDimensions,
  loadStatePictogram,
  PixiTreeRenderer,
} from '../../module/applications/specialization-tree/pixi-tree-renderer.mjs'
import { CONNECTION_VISUAL_STYLES } from '../../module/applications/specialization-tree/connection-ui-state.mjs'
import {
  ACTIVE_TYPE_ICON_PATH,
  NODE_STATE,
  NODE_STATE_VARIANTS,
  PASSIVE_TYPE_ICON_PATH,
  PURCHASE_ACTION_ICON_PATH,
  RANKED_ICON_PATH,
} from '../../module/applications/specialization-tree/node-ui-state.mjs'

/**
 *
 */
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

/**
 *
 * @param root0
 * @param root0.width
 * @param root0.height
 */
function createMockHost({ width = 640, height = 480 } = {}) {
  return {
    clientWidth: width,
    clientHeight: height,
    firstElementChild: null,
    replaceChildren: vi.fn(function (child) {
      this.firstElementChild = child
    }),
  }
}

/**
 *
 */
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

/**
 *
 * @param container
 */
function flattenChildren(container) {
  const result = []
  for (const child of container.children ?? []) {
    result.push(child)
    if (child.children?.length) {
      result.push(...flattenChildren(child))
    }
  }
  return result
}

/**
 *
 * @param container
 */
function findNodeHitArea(container) {
  return flattenChildren(container).find((child) => child._listeners?.pointerdown)
}

/**
 *
 */
function createViewModel() {
  return {
    renderNodes: [
      {
        nodeId: 'n1',
        talentName: 'Tough',
        x: 20,
        y: 20,
        xpCost: 5,
        isRanked: true,
        nodeTypeIcon: 'P',
        nodeState: NODE_STATE.AVAILABLE,
        variant: NODE_STATE_VARIANTS[NODE_STATE.AVAILABLE].passive,
        iconSlots: {
          topLeft: PASSIVE_TYPE_ICON_PATH,
          topRight: PURCHASE_ACTION_ICON_PATH,
          bottomRight: RANKED_ICON_PATH,
        },
        actionable: { primaryAction: 'purchase' },
      },
      {
        nodeId: 'n2',
        talentName: 'Grit',
        x: 20,
        y: 92,
        xpCost: 10,
        isRanked: false,
        nodeTypeIcon: 'A',
        nodeState: NODE_STATE.LOCKED,
        variant: NODE_STATE_VARIANTS[NODE_STATE.LOCKED].active,
        iconSlots: {
          topLeft: ACTIVE_TYPE_ICON_PATH,
          topRight: null,
          bottomRight: null,
        },
        actionable: { primaryAction: null },
      },
    ],
    renderConnections: [
      {
        fromNodeId: 'n1',
        toNodeId: 'n2',
        fromX: 80,
        fromY: 44,
        toX: 80,
        toY: 116,
        type: 'straight',
      },
    ],
  }
}

describe('PixiTreeRenderer integration', () => {
  beforeEach(() => {
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
          this.renderer = { resize: vi.fn(), resolution: 1, width: 0, height: 0 }
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
          this.width = String(text).length * 5
          this.height = 10
          this.alpha = 1
        }
      },
      Sprite: class MockSprite {
        constructor(texture) {
          this.texture = texture
          this.x = 0
          this.y = 0
          this.width = 0
          this.height = 0
          this.tint = 0
        }
      },
      Assets: { load: vi.fn().mockImplementation(async (path) => ({ path })) },
      Texture: { from: vi.fn().mockReturnValue(null) },
    }

    globalThis.ResizeObserver = class MockResizeObserver {
      constructor(callback) {
        this.callback = callback
        this.observe = vi.fn()
        this.disconnect = vi.fn()
        this.unobserve = vi.fn()
      }
    }

    globalThis.requestAnimationFrame = vi.fn((callback) => {
      callback()
      return 1
    })
    globalThis.cancelAnimationFrame = vi.fn()
    delete globalThis.__PIXI_DEVTOOLS__
    delete globalThis.swerpgDebug
  })

  afterEach(() => {
    vi.clearAllMocks()
    delete globalThis.PIXI
    delete globalThis.ResizeObserver
    delete globalThis.requestAnimationFrame
    delete globalThis.cancelAnimationFrame
    delete globalThis.__PIXI_DEVTOOLS__
    delete globalThis.swerpgDebug
  })

  it('exports viewport math helpers', () => {
    expect(getViewportDimensions({ clientWidth: 120, clientHeight: 180 })).toEqual({ width: 320, height: 320 })
    expect(computeTreeBoundingBox([{ x: 20, y: 20 }], 120, 48)).toEqual({
      minX: 20,
      minY: 20,
      maxX: 140,
      maxY: 68,
      width: 120,
      height: 48,
    })
    expect(computeCenteredOffset({ minX: 20, minY: 20, width: 120, height: 48 }, 640, 480)).toEqual({
      offsetX: 240,
      offsetY: 196,
    })
  })

  it('getCanvasSharpnessConfig returns a complete sharpness contract', () => {
    const config = getCanvasSharpnessConfig()
    expect(config).toMatchObject({
      antialias: true,
      autoDensity: true,
      backgroundAlpha: 0,
    })
    expect(config.resolution).toBeGreaterThanOrEqual(1)
    expect(Number.isFinite(config.resolution)).toBe(true)
  })

  it('creates PIXI Application with explicit sharpness config', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()
    renderer.mount(host)

    const appOptions = renderer.pixiApp.options
    expect(appOptions.antialias).toBe(true)
    expect(appOptions.autoDensity).toBe(true)
    expect(appOptions.resolution).toBeGreaterThanOrEqual(1)
    expect(appOptions.backgroundAlpha).toBe(0)
  })

  it('resize passes resolution to renderer.resize', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()
    renderer.mount(host)
    await renderer.update(createViewModel(), {})

    expect(renderer.pixiApp.renderer.resize).toHaveBeenCalledWith(640, 480, 1)
  })

  it('loadStatePictogram passes resolution to Assets.load', async () => {
    PIXI.Assets.load.mockClear()
    const loadSpy = vi.mocked(PIXI.Assets.load)

    const result = await loadStatePictogram(NODE_STATE.AVAILABLE)

    expect(result).not.toBeNull()
    expect(loadSpy).toHaveBeenCalledWith(expect.stringContaining('.svg'), expect.objectContaining({ resolution: 1 }))
  })

  it('mounts the PIXI canvas into the host and resizes on first update', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()

    renderer.mount(host)
    await renderer.update(createViewModel(), {})

    expect(renderer.pixiApp).not.toBeNull()
    expect(host.firstElementChild).toBe(renderer.pixiApp.canvas)
    expect(renderer.pixiApp.renderer.resize).toHaveBeenCalledWith(640, 480, 1)
  })

  it('draws named layers, nodes and connections on update', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()
    renderer.mount(host)

    await renderer.update(createViewModel(), {})

    expect(renderer.treeContainer).toBeDefined()
    expect(renderer.treeContainer.label).toBe('specialization-tree')
    expect(renderer.treeContainer.children[0].label).toBe('connections-layer')
    expect(renderer.treeContainer.children[1].label).toBe('nodes-layer')
    expect(renderer.renderNodesCache).toHaveLength(2)
  })

  it('uses connection-ui-state defaults when drawing lines', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()
    renderer.mount(host)

    await renderer.update(createViewModel(), {})

    const connectionLayer = renderer.treeContainer.children[0]
    const connectionGraphic = connectionLayer.children[0]
    expect(connectionGraphic.calls[0]).toEqual([
      'lineStyle',
      CONNECTION_VISUAL_STYLES.default.thickness,
      CONNECTION_VISUAL_STYLES.default.color,
      CONNECTION_VISUAL_STYLES.default.alpha,
    ])
  })

  it('renders title texts, cost texts, and corner icon sprites from icon slots', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()
    renderer.mount(host)

    await renderer.update(createViewModel(), {})

    const descendants = flattenChildren(renderer.treeContainer)
    expect(descendants.some((child) => child.text === 'Tough')).toBe(true)
    expect(descendants.some((child) => child.text === 'Grit')).toBe(true)
    expect(descendants.some((child) => child.text === '5 XP')).toBe(true)
    expect(descendants.some((child) => child.label === 'node:n1:Tough:icon-slot:topLeft')).toBe(true)
    expect(descendants.some((child) => child.label === 'node:n1:Tough:icon-slot:topRight')).toBe(true)
    expect(descendants.some((child) => child.label === 'node:n1:Tough:icon-slot:bottomRight')).toBe(true)
    expect(descendants.some((child) => child.label === 'node:n2:Grit:icon-slot:topLeft')).toBe(true)
    expect(descendants.some((child) => child.label === 'node:n2:Grit:icon-slot:topRight')).toBe(false)
    expect(descendants.some((child) => child.label === 'node:n2:Grit:icon-slot:bottomRight')).toBe(false)
  })

  it('attaches the expected textures to rendered icon slot sprites', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()
    renderer.mount(host)

    await renderer.update(createViewModel(), {})

    const descendants = flattenChildren(renderer.treeContainer)
    const topLeft = descendants.find((child) => child.label === 'node:n1:Tough:icon-slot:topLeft')
    const topRight = descendants.find((child) => child.label === 'node:n1:Tough:icon-slot:topRight')
    const bottomRight = descendants.find((child) => child.label === 'node:n1:Tough:icon-slot:bottomRight')
    const activeTopLeft = descendants.find((child) => child.label === 'node:n2:Grit:icon-slot:topLeft')

    expect(topLeft?.texture?.path).toBe(PASSIVE_TYPE_ICON_PATH)
    expect(topRight?.texture?.path).toBe(PURCHASE_ACTION_ICON_PATH)
    expect(bottomRight?.texture?.path).toBe(RANKED_ICON_PATH)
    expect(activeTopLeft?.texture?.path).toBe(ACTIVE_TYPE_ICON_PATH)
  })

  /* ═══════════════════════════════════════════════════════════════ */
  /*  PXP5 — Multi-state icon coverage                              */
  /* ═══════════════════════════════════════════════════════════════ */

  /**
   * Build a view model covering all 4 node states × 2 node types = 6 variants.
   * Each node has a distinct state and type so the icon slot rendering can be
   * verified across the full visual matrix.
   */
  function createMultiStateViewModel() {
    return {
      renderNodes: [
        {
          nodeId: 'n-purchased',
          talentName: 'Tough',
          x: 20,
          y: 20,
          xpCost: 5,
          isRanked: true,
          nodeTypeIcon: 'P',
          nodeState: NODE_STATE.PURCHASED,
          variant: NODE_STATE_VARIANTS[NODE_STATE.PURCHASED].passive,
          iconSlots: {
            topLeft: PASSIVE_TYPE_ICON_PATH,
            topRight: null,
            bottomRight: RANKED_ICON_PATH,
          },
          actionable: { primaryAction: null },
        },
        {
          nodeId: 'n-available',
          talentName: 'Grit',
          x: 20,
          y: 92,
          xpCost: 10,
          isRanked: false,
          nodeTypeIcon: 'A',
          nodeState: NODE_STATE.AVAILABLE,
          variant: NODE_STATE_VARIANTS[NODE_STATE.AVAILABLE].active,
          iconSlots: {
            topLeft: ACTIVE_TYPE_ICON_PATH,
            topRight: PURCHASE_ACTION_ICON_PATH,
            bottomRight: null,
          },
          actionable: { primaryAction: 'purchase' },
        },
        {
          nodeId: 'n-locked',
          talentName: 'Durable',
          x: 164,
          y: 20,
          xpCost: 15,
          isRanked: true,
          nodeTypeIcon: 'P',
          nodeState: NODE_STATE.LOCKED,
          variant: NODE_STATE_VARIANTS[NODE_STATE.LOCKED].passive,
          iconSlots: {
            topLeft: PASSIVE_TYPE_ICON_PATH,
            topRight: null,
            bottomRight: RANKED_ICON_PATH,
          },
          actionable: { primaryAction: null },
        },
        {
          nodeId: 'n-invalid',
          talentName: '???',
          x: 164,
          y: 92,
          xpCost: 0,
          isRanked: false,
          nodeTypeIcon: 'A',
          nodeState: NODE_STATE.INVALID,
          variant: NODE_STATE_VARIANTS[NODE_STATE.INVALID].active,
          iconSlots: {
            topLeft: ACTIVE_TYPE_ICON_PATH,
            topRight: null,
            bottomRight: null,
          },
          actionable: { primaryAction: null },
        },
      ],
      renderConnections: [],
    }
  }

  it('renders icon slots correctly for all 4 node states', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()
    renderer.mount(host)

    await renderer.update(createMultiStateViewModel(), {})

    const descendants = flattenChildren(renderer.treeContainer)

    // purchased passive node: type icon + ranked icon, no action icon
    expect(descendants.some((c) => c.label === 'node:n-purchased:Tough:icon-slot:topLeft')).toBe(true)
    expect(descendants.some((c) => c.label === 'node:n-purchased:Tough:icon-slot:topRight')).toBe(false)
    expect(descendants.some((c) => c.label === 'node:n-purchased:Tough:icon-slot:bottomRight')).toBe(true)
    expect(descendants.some((c) => c.label === 'node:n-purchased:Tough:icon-slot:topLeft' && c.texture?.path === PASSIVE_TYPE_ICON_PATH)).toBe(true)

    // available active node: type icon + purchase action icon, no ranked icon
    expect(descendants.some((c) => c.label === 'node:n-available:Grit:icon-slot:topLeft')).toBe(true)
    expect(descendants.some((c) => c.label === 'node:n-available:Grit:icon-slot:topRight')).toBe(true)
    expect(descendants.some((c) => c.label === 'node:n-available:Grit:icon-slot:bottomRight')).toBe(false)
    expect(descendants.some((c) => c.label === 'node:n-available:Grit:icon-slot:topLeft' && c.texture?.path === ACTIVE_TYPE_ICON_PATH)).toBe(true)
    expect(descendants.some((c) => c.label === 'node:n-available:Grit:icon-slot:topRight' && c.texture?.path === PURCHASE_ACTION_ICON_PATH)).toBe(true)

    // locked passive node: type icon + ranked icon, no action icon
    expect(descendants.some((c) => c.label === 'node:n-locked:Durable:icon-slot:topLeft')).toBe(true)
    expect(descendants.some((c) => c.label === 'node:n-locked:Durable:icon-slot:topRight')).toBe(false)
    expect(descendants.some((c) => c.label === 'node:n-locked:Durable:icon-slot:bottomRight')).toBe(true)
    expect(descendants.some((c) => c.label === 'node:n-locked:Durable:icon-slot:topLeft' && c.texture?.path === PASSIVE_TYPE_ICON_PATH)).toBe(true)

    // invalid active node: type icon only, no action or ranked icon
    expect(descendants.some((c) => c.label === 'node:n-invalid:???:icon-slot:topLeft')).toBe(true)
    expect(descendants.some((c) => c.label === 'node:n-invalid:???:icon-slot:topRight')).toBe(false)
    expect(descendants.some((c) => c.label === 'node:n-invalid:???:icon-slot:bottomRight')).toBe(false)
    expect(descendants.some((c) => c.label === 'node:n-invalid:???:icon-slot:topLeft' && c.texture?.path === ACTIVE_TYPE_ICON_PATH)).toBe(true)
  })

  it('renders all 4 nodes from multi-state view-model', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()
    renderer.mount(host)

    await renderer.update(createMultiStateViewModel(), {})

    const descendants = flattenChildren(renderer.treeContainer)
    expect(descendants.some((child) => child.text === 'Tough')).toBe(true)
    expect(descendants.some((child) => child.text === 'Grit')).toBe(true)
    expect(descendants.some((child) => child.text === 'Durable')).toBe(true)
    expect(descendants.some((child) => child.text === '???')).toBe(true)
    expect(renderer.renderNodesCache).toHaveLength(4)
  })

  it('zoom in/out/reset preserves the PIXI application sharpness settings', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()
    renderer.mount(host)

    await renderer.update(createViewModel(), { resetView: true })

    // Capture sharpness values from the PIXI Application options (set at construction)
    const initialAntialias = renderer.pixiApp.options.antialias
    const initialAutoDensity = renderer.pixiApp.options.autoDensity
    const initialBackgroundAlpha = renderer.pixiApp.options.backgroundAlpha
    const initialResolution = renderer.pixiApp.options.resolution

    // Zoom in — sharpness config remains intact
    renderer.zoomIn()
    expect(renderer.pixiApp.options.antialias).toBe(initialAntialias)
    expect(renderer.pixiApp.options.autoDensity).toBe(initialAutoDensity)
    expect(renderer.pixiApp.options.backgroundAlpha).toBe(initialBackgroundAlpha)
    expect(renderer.pixiApp.options.resolution).toBe(initialResolution)

    // Zoom out — sharpness config remains intact
    renderer.zoomOut()
    expect(renderer.pixiApp.options.antialias).toBe(initialAntialias)
    expect(renderer.pixiApp.options.autoDensity).toBe(initialAutoDensity)
    expect(renderer.pixiApp.options.backgroundAlpha).toBe(initialBackgroundAlpha)
    expect(renderer.pixiApp.options.resolution).toBe(initialResolution)

    // Reset view — sharpness config remains intact
    renderer.resetView()
    expect(renderer.pixiApp.options.antialias).toBe(initialAntialias)
    expect(renderer.pixiApp.options.autoDensity).toBe(initialAutoDensity)
    expect(renderer.pixiApp.options.backgroundAlpha).toBe(initialBackgroundAlpha)
    expect(renderer.pixiApp.options.resolution).toBe(initialResolution)
  })

  it('rebuilds the tree container on subsequent updates', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()
    renderer.mount(host)

    await renderer.update(createViewModel(), {})
    const firstContainer = renderer.treeContainer

    await renderer.update(createViewModel(), {})

    expect(firstContainer.destroy).toHaveBeenCalled()
    expect(renderer.treeContainer).not.toBe(firstContainer)
  })

  it('recenters viewport when update requests resetView after initialization', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()
    renderer.mount(host)

    await renderer.update(createViewModel(), { resetView: false })
    renderer.viewport.x = 999
    renderer.viewport.y = 888
    renderer.viewport.scale = 1.5

    const nextViewModel = createViewModel()
    await renderer.update(nextViewModel, { resetView: true })

    expect(renderer.viewport).toMatchObject({ x: 240, y: 160, scale: 1 })
    expect(renderer.treeContainer.position.set).toHaveBeenLastCalledWith(240, 160)
    expect(renderer.treeContainer.scale.set).toHaveBeenLastCalledWith(1)
  })

  it('exposes debug helpers when debug mode is enabled', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer({ debug: true })
    renderer.mount(host)

    await renderer.update(createViewModel(), {})

    expect(globalThis.__PIXI_DEVTOOLS__).toBeDefined()
    expect(globalThis.swerpgDebug?.specializationTree?.renderer).toBe(renderer)
    expect(globalThis.swerpgDebug?.specializationTree?.nodeViews.size).toBe(2)
  })

  it('fires background callback and pans the viewport on stage drag', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()
    const onBackgroundPointerDown = vi.fn()
    renderer.onBackgroundPointerDown = onBackgroundPointerDown
    renderer.mount(host)
    await renderer.update(createViewModel(), { resetView: false })

    const stage = renderer.pixiApp.stage
    renderer.treeContainer.position.set.mockClear()

    stage._listeners.pointerdown({ global: { x: 100, y: 120 } })
    stage._listeners.pointermove({ global: { x: 140, y: 170 } })

    expect(onBackgroundPointerDown).toHaveBeenCalled()
    expect(renderer.treeContainer.position.set).toHaveBeenCalledWith(280, 210)
  })

  it('stops panning on pointerup and pointerupoutside', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()
    renderer.mount(host)
    await renderer.update(createViewModel(), { resetView: false })

    const stage = renderer.pixiApp.stage
    stage._listeners.pointerdown({ global: { x: 10, y: 20 } })
    stage._listeners.pointerup()
    renderer.treeContainer.position.set.mockClear()
    stage._listeners.pointermove({ global: { x: 30, y: 40 } })
    expect(renderer.treeContainer.position.set).not.toHaveBeenCalled()

    stage._listeners.pointerdown({ global: { x: 10, y: 20 } })
    stage._listeners.pointerupoutside()
    renderer.treeContainer.position.set.mockClear()
    stage._listeners.pointermove({ global: { x: 35, y: 45 } })
    expect(renderer.treeContainer.position.set).not.toHaveBeenCalled()
  })

  it('fires node callback from the hit area and stops propagation', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()
    const onNodePointerDown = vi.fn()
    renderer.onNodePointerDown = onNodePointerDown
    renderer.mount(host)
    await renderer.update(createViewModel(), { resetView: false })

    const hitArea = findNodeHitArea(renderer.treeContainer)
    const stopPropagation = vi.fn()
    hitArea._listeners.pointerdown({ stopPropagation })

    expect(stopPropagation).toHaveBeenCalled()
    expect(onNodePointerDown).toHaveBeenCalledWith(expect.objectContaining({ nodeId: 'n1' }))
  })

  it('does not duplicate stage listeners on repeated mounts/updates', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()
    renderer.mount(host)
    await renderer.update(createViewModel(), {})

    expect(renderer.pixiApp.stage.on.mock.calls.map(([eventName]) => eventName)).toEqual(['pointerdown', 'pointermove', 'pointerup', 'pointerupoutside'])

    renderer.pixiApp.stage.on.mockClear()
    renderer.mount(host)
    await renderer.update(createViewModel(), {})
    expect(renderer.pixiApp.stage.on).not.toHaveBeenCalled()
  })

  it('registers wheel listener and zooms/clamps around pointer', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()
    renderer.mount(host)
    await renderer.update(createViewModel(), { resetView: false })

    expect(renderer.pixiApp.canvas.addEventListener).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false })

    renderer.treeContainer.scale.set.mockClear()
    renderer.treeContainer.position.set.mockClear()
    renderer.pixiApp.canvas._listeners.wheel({ deltaY: -100, offsetX: 320, offsetY: 240, preventDefault: vi.fn() })
    expect(renderer.treeContainer.scale.set).toHaveBeenCalledWith(1.15)

    for (let i = 0; i < 10; i++) {
      renderer.pixiApp.canvas._listeners.wheel({ deltaY: -100, offsetX: 320, offsetY: 240, preventDefault: vi.fn() })
    }
    expect(renderer.treeContainer.scale.set).toHaveBeenLastCalledWith(2)
  })

  it('resetView recenters and destroy tears everything down', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()
    renderer.mount(host)
    await renderer.update(createViewModel(), { resetView: false })

    renderer.treeContainer.position.set.mockClear()
    renderer.treeContainer.scale.set.mockClear()
    renderer.resetView()

    expect(renderer.treeContainer.position.set).toHaveBeenCalled()
    expect(renderer.treeContainer.scale.set).toHaveBeenCalledWith(1)

    const canvas = renderer.pixiApp.canvas
    renderer.destroy()

    expect(canvas.removeEventListener).toHaveBeenCalledWith('wheel', expect.any(Function))
    expect(renderer.pixiApp).toBeNull()
    expect(renderer.treeContainer).toBeNull()
  })

  /* ═══════════════════════════════════════════════════════════════ */
  /*  MC5 — Named constants contract tests                          */
  /* ═══════════════════════════════════════════════════════════════ */

  it('MIN_VIEWPORT_SIZE clamps small host dimensions to at least 320', () => {
    // width=50 and height=80 are both below MIN_VIEWPORT_SIZE (320)
    expect(getViewportDimensions({ clientWidth: 50, clientHeight: 80 })).toEqual({ width: 320, height: 320 })
    // width=400 is above MIN_VIEWPORT_SIZE; height=100 is below
    expect(getViewportDimensions({ clientWidth: 400, clientHeight: 100 })).toEqual({ width: 400, height: 320 })
  })

  it('node card background uses the corner-radius constant (4px rounded rect)', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()
    renderer.mount(host)
    await renderer.update(createViewModel(), {})

    const descendants = flattenChildren(renderer.treeContainer)
    const bg = descendants.find((c) => c.label === 'node:n1:Tough:background')
    expect(bg).toBeDefined()
    // drawRoundedRect is called with (0, 0, nodeWidth, nodeHeight, cornerRadius)
    const drawCall = bg.calls.find((c) => c[0] === 'drawRoundedRect')
    expect(drawCall).toBeDefined()
    expect(drawCall[5]).toBe(4) // NODE_CARD_CORNER_RADIUS
  })

  it('cost badge geometry uses the named padding constants', async () => {
    const host = createMockHost()
    const renderer = new PixiTreeRenderer()
    renderer.mount(host)
    await renderer.update(createViewModel(), {})

    const descendants = flattenChildren(renderer.treeContainer)
    // n1 (AVAILABLE state) has a badge-mode cost display
    const badge = descendants.find((c) => c.label === 'node:n1:Tough:cost-badge')
    expect(badge).toBeDefined()
    // drawRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, cornerRadius)
    const drawCall = badge.calls.find((c) => c[0] === 'drawRoundedRect')
    expect(drawCall).toBeDefined()
    // badgeX = BADGE_X = 4
    expect(drawCall[1]).toBe(4)
    // badgeY = nodeHeight - BADGE_BOTTOM_OFFSET = 48 - 17 = 31
    expect(drawCall[2]).toBe(31)
  })

  it('getCanvasSharpnessConfig backgroundAlpha is always 0 (transparent canvas)', () => {
    const config = getCanvasSharpnessConfig()
    expect(config.backgroundAlpha).toBe(0)
  })
})
