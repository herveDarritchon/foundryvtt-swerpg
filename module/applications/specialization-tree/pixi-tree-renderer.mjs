/**
 * @module module/applications/specialization-tree/pixi-tree-renderer
 * @description Standalone PIXI renderer for the specialization tree.
 *
 * Owns all PIXI internals: Application, Containers, Graphics, Text, Sprites,
 * textures, viewport transforms, pan/zoom, hit areas, and debug exposure.
 *
 * The renderer communicates with the orchestrator (SpecializationTreeApp)
 * through a minimal public API (mount, update, destroy, resetView, zoomIn,
 * zoomOut) and injected callbacks (onNodePointerDown, onBackgroundPointerDown).
 *
 * This module has no dependency on `game`, `ui`, `dialog`, `notifications`,
 * or Foundry document operations.
 */

import { NODE_HEIGHT, NODE_WIDTH } from './layout.mjs'
import { NODE_STATE, NODE_STATE_SVG_ICONS, NODE_STATE_VARIANTS } from './node-ui-state.mjs'
import { getConnectionStyle } from './connection-ui-state.mjs'
import { logger } from '../../utils/logger.mjs'

/* ── Helpers ───────────────────────────────────────────────────── */

/**
 * Assign a human-readable label to a PIXI display object for devtools inspection.
 * @param {PIXI.DisplayObject} displayObject
 * @param {string} label
 * @returns {PIXI.DisplayObject}
 */
function setPixiDebugLabel(displayObject, label) {
  if (!displayObject || !label) return displayObject
  displayObject.label = label
  displayObject.name = label
  return displayObject
}

const MIN_VIEWPORT_SIZE = 320
const NODE_CORNER_ICON_SIZE = 16
const NODE_CORNER_ICON_MARGIN = 4

const ICON_SLOT_POSITIONS = Object.freeze({
  topLeft: Object.freeze({ x: NODE_CORNER_ICON_MARGIN, y: NODE_CORNER_ICON_MARGIN }),
  topRight: Object.freeze({ x: NODE_WIDTH - NODE_CORNER_ICON_SIZE - NODE_CORNER_ICON_MARGIN, y: NODE_CORNER_ICON_MARGIN }),
  bottomRight: Object.freeze({
    x: NODE_WIDTH - NODE_CORNER_ICON_SIZE - NODE_CORNER_ICON_MARGIN,
    y: NODE_HEIGHT - NODE_CORNER_ICON_SIZE - NODE_CORNER_ICON_MARGIN,
  }),
})

const ICON_SLOT_FALLBACKS = Object.freeze({
  topLeft: Object.freeze({
    label: 'type-icon-fallback',
    text: (node) => node?.nodeTypeIcon ?? '',
    style: (node) => ({
      fontFamily: 'Arial',
      fontSize: 9,
      fill: node?.variant?.textColor ?? 0xffffff,
    }),
  }),
  topRight: Object.freeze({
    label: 'action-icon-fallback',
    text: (node) => {
      if (node?.actionable?.primaryAction === 'purchase') return '+'
      if (node?.actionable?.primaryAction === 'forget') return '-'
      return ''
    },
    style: (node) => ({
      fontFamily: 'Arial',
      fontSize: 10,
      fill: node?.variant?.pictogramColor ?? 0xffffff,
      fontWeight: 'bold',
    }),
  }),
  bottomRight: Object.freeze({
    label: 'ranked-indicator-fallback',
    text: (node) => (node?.isRanked ? '(R)' : ''),
    style: (node) => ({
      fontFamily: 'Arial',
      fontSize: 9,
      fill: node?.variant?.costColor ?? 0xffffff,
      fontStyle: 'italic',
    }),
  }),
})

/**
 * Compute the viewport size from a host element.
 * @param {HTMLElement|null|undefined} host
 * @returns {{ width: number, height: number }}
 */
export function getViewportDimensions(host) {
  const rect = host?.getBoundingClientRect?.()

  return {
    width: Math.max(Math.round(rect?.width || host?.clientWidth || 0), MIN_VIEWPORT_SIZE),
    height: Math.max(Math.round(rect?.height || host?.clientHeight || 0), MIN_VIEWPORT_SIZE),
  }
}

/**
 * Compute the bounding box of a set of positioned nodes.
 * @param {Array<{ x: number, y: number }>|null|undefined} nodes
 * @param {number} [nodeWidth=NODE_WIDTH]
 * @param {number} [nodeHeight=NODE_HEIGHT]
 * @returns {{ minX: number, minY: number, maxX: number, maxY: number, width: number, height: number }}
 */
export function computeTreeBoundingBox(nodes, nodeWidth = NODE_WIDTH, nodeHeight = NODE_HEIGHT) {
  if (!nodes?.length) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of nodes) {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + nodeWidth)
    maxY = Math.max(maxY, node.y + nodeHeight)
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

/**
 * Compute the centering offset for a tree within a viewport.
 * @param {{ minX: number, minY: number, width: number, height: number }} bbox
 * @param {number} viewportWidth
 * @param {number} viewportHeight
 * @returns {{ offsetX: number, offsetY: number }}
 */
export function computeCenteredOffset(bbox, viewportWidth, viewportHeight) {
  return {
    offsetX: (viewportWidth - bbox.width) / 2 - bbox.minX,
    offsetY: (viewportHeight - bbox.height) / 2 - bbox.minY,
  }
}

/* ── Texture caches ───────────────────────────────────────────── */

const STATE_PICTOGRAM_TEXTURE_CACHE = new Map()
const ICON_TEXTURE_CACHE = new Map()

/**
 * Load the SVG pictogram texture for a node state.
 * @param {string|null|undefined} state
 * @returns {Promise<PIXI.Texture|null>}
 */
export async function loadStatePictogram(state) {
  const iconPath = NODE_STATE_SVG_ICONS[state] ?? NODE_STATE_SVG_ICONS[NODE_STATE.INVALID]
  if (!iconPath) return null

  if (STATE_PICTOGRAM_TEXTURE_CACHE.has(iconPath)) {
    return STATE_PICTOGRAM_TEXTURE_CACHE.get(iconPath)
  }

  let texturePromise

  if (PIXI.Assets?.load) {
    texturePromise = PIXI.Assets.load(iconPath)
  } else if (PIXI.Texture?.from) {
    texturePromise = Promise.resolve(PIXI.Texture.from(iconPath))
  } else {
    texturePromise = Promise.resolve(null)
  }

  STATE_PICTOGRAM_TEXTURE_CACHE.set(iconPath, texturePromise)

  try {
    return await texturePromise
  } catch (error) {
    STATE_PICTOGRAM_TEXTURE_CACHE.delete(iconPath)
    throw error
  }
}

/**
 * Load an SVG texture from any icon path, with caching.
 * @param {string|null|undefined} iconPath - Direct file path to the SVG.
 * @returns {Promise<PIXI.Texture|null>}
 */
export async function loadIconTexture(iconPath) {
  if (!iconPath) return null

  if (ICON_TEXTURE_CACHE.has(iconPath)) {
    return ICON_TEXTURE_CACHE.get(iconPath)
  }

  let texturePromise

  if (PIXI.Assets?.load) {
    texturePromise = PIXI.Assets.load(iconPath)
  } else if (PIXI.Texture?.from) {
    texturePromise = Promise.resolve(PIXI.Texture.from(iconPath))
  } else {
    texturePromise = Promise.resolve(null)
  }

  ICON_TEXTURE_CACHE.set(iconPath, texturePromise)

  try {
    return await texturePromise
  } catch (error) {
    ICON_TEXTURE_CACHE.delete(iconPath)
    throw error
  }
}

/* ── Renderer class ───────────────────────────────────────────── */

export class PixiTreeRenderer {
  constructor(options = {}) {
    this.nodeWidth = options.nodeWidth ?? NODE_WIDTH
    this.nodeHeight = options.nodeHeight ?? NODE_HEIGHT
    this.minZoom = options.minZoom ?? 0.5
    this.maxZoom = options.maxZoom ?? 2
    this.zoomStep = options.zoomStep ?? 1.15
    this.debug = options.debug ?? false

    /** @type {PIXI.Application|null} */
    this.pixiApp = null

    /** @type {PIXI.Container|null} */
    this.treeContainer = null

    /** @type {Array<object>|null} */
    this.renderNodesCache = null

    /** @type {{ scale: number, x: number, y: number }} */
    this.viewport = { scale: 1, x: 0, y: 0 }

    /** @type {Map<string, object>} */
    this.#debugNodeViews = new Map()

    /* ── Pan / zoom state ── */
    this.#isPanning = false
    /** @type {{ x: number, y: number }|null} */
    this.#lastPointerPosition = null
    this.#isViewportInteractionsBound = false
    /** @type {HTMLElement|null} */
    this.#zoomCanvas = null
    /** @type {Function|null} */
    this.#zoomWheelHandler = null
    /** @type {ResizeObserver|null} */
    this.#resizeObserver = null
    /** @type {HTMLElement|null} */
    this.#observedViewportHost = null
    /** @type {HTMLElement|null} */
    this.#viewportHost = null
    this.#hasInitializedViewport = false

    /* ── Callbacks ── */
    /** @type {Function|null} */
    this.onNodePointerDown = null
    /** @type {Function|null} */
    this.onBackgroundPointerDown = null
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /*  Public API                                                    */
  /* ═══════════════════════════════════════════════════════════════ */

  /**
   * Mount the PIXI application into a host DOM element.
   * Creates the PIXI app on first call; subsequent calls are no-ops if
   * already mounted to the same host.
   * @param {HTMLElement} hostElement
   */
  mount(hostElement) {
    if (!hostElement) return
    this.#viewportHost = hostElement
    this.#ensurePixiApp(hostElement)
    this.#bindViewportInteractions()
    this.#bindResizeObserver(hostElement)
  }

  /**
   * Update the rendered tree from a view-model.
   * Destroys the existing tree and redraws from scratch.
   * @param {{ renderNodes: Array<object>, renderConnections: Array<object> }} viewModel
   * @param {{ resetView?: boolean }} [options={}]
   */
  async update(viewModel, options = {}) {
    if (!this.pixiApp) return

    await this.#drawTree(viewModel)

    const shouldResetView = options.resetView !== false || !this.#hasInitializedViewport

    this.#hasInitializedViewport = true
    this.#resizeViewport()

    if (shouldResetView) {
      this.#centerTree(viewModel.renderNodes)
    }

    this.#applyViewportTransform()

    requestAnimationFrame(() => {
      this.#resizeViewport()

      if (shouldResetView) {
        this.#centerTree(viewModel.renderNodes)
      }

      this.#applyViewportTransform()
    })
  }

  /**
   * Destroy the PIXI application and release all resources.
   */
  destroy() {
    this.#unbindViewportInteractions()
    this.#stopPanning()

    if (this.#resizeObserver) {
      this.#resizeObserver.disconnect()
      this.#resizeObserver = null
    }

    this.treeContainer = null
    this.renderNodesCache = null
    this.viewport = { scale: 1, x: 0, y: 0 }

    if (this.pixiApp) {
      this.pixiApp.destroy?.(true)
      this.pixiApp = null
    }

    this.#debugNodeViews.clear()
    this.#observedViewportHost = null
    this.#hasInitializedViewport = false
    this.#viewportHost = null
  }

  /**
   * Reset the viewport to the centered initial view.
   * Relies on the cached render nodes from the last update.
   */
  resetView() {
    this.#centerTree(this.renderNodesCache)
    this.#applyViewportTransform()
  }

  /**
   * Zoom in by one zoomStep around the viewport center.
   */
  zoomIn() {
    if (!this.#viewportHost) return
    const { width, height } = getViewportDimensions(this.#viewportHost)
    this.#zoomAt({ x: width / 2, y: height / 2 }, this.viewport.scale * this.zoomStep)
  }

  /**
   * Zoom out by one zoomStep around the viewport center.
   */
  zoomOut() {
    if (!this.#viewportHost) return
    const { width, height } = getViewportDimensions(this.#viewportHost)
    this.#zoomAt({ x: width / 2, y: height / 2 }, this.viewport.scale / this.zoomStep)
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /*  PIXI app lifecycle (private)                                  */
  /* ═══════════════════════════════════════════════════════════════ */

  /** @type {Map<string, object>} */
  #debugNodeViews

  /** @type {boolean} */
  #isPanning

  /** @type {{ x: number, y: number }|null} */
  #lastPointerPosition

  /** @type {boolean} */
  #isViewportInteractionsBound

  /** @type {HTMLElement|null} */
  #zoomCanvas

  /** @type {Function|null} */
  #zoomWheelHandler

  /** @type {ResizeObserver|null} */
  #resizeObserver

  /** @type {HTMLElement|null} */
  #observedViewportHost

  /** @type {HTMLElement|null} */
  #viewportHost

  /** @type {boolean} */
  #hasInitializedViewport

  #ensurePixiApp(viewportHost) {
    if (!this.pixiApp) {
      const { width, height } = getViewportDimensions(viewportHost)
      this.pixiApp = new PIXI.Application({
        width,
        height,
        antialias: true,
        autoDensity: true,
        backgroundAlpha: 0,
      })

      this.#exposePixiDevtools()
    }

    const view = this.pixiApp.canvas ?? this.pixiApp.view
    if (!view) {
      logger.warn('[PixiTreeRenderer] PIXI application did not expose a canvas view')
      return
    }

    view.classList.add('specialization-tree-app__canvas')
    if (viewportHost.firstElementChild !== view) {
      viewportHost.replaceChildren(view)
    }
  }

  #exposePixiDevtools() {
    if (!this.pixiApp) return
    if (!this.debug) return

    globalThis.__PIXI_DEVTOOLS__ = {
      app: this.pixiApp,
      renderer: this.pixiApp.renderer,
      stage: this.pixiApp.stage,
    }

    globalThis.swerpgDebug ??= {}

    globalThis.swerpgDebug.specializationTree = {
      renderer: this,
      pixiApp: this.pixiApp,
      stage: this.pixiApp.stage,
      treeContainer: this.treeContainer,
      viewport: { ...this.viewport },
      renderNodes: this.renderNodesCache ?? [],
      nodeViews: this.#debugNodeViews,
      resetView: () => this.resetView(),
      setViewport: ({ x, y, scale } = {}) => {
        if (Number.isFinite(x)) this.viewport.x = x
        if (Number.isFinite(y)) this.viewport.y = y
        if (Number.isFinite(scale)) this.viewport.scale = scale
        this.#applyViewportTransform()
      },
    }

    logger.debug('[SWERPG] PIXI debug exposed')
  }

  #resizeViewport() {
    if (!this.pixiApp || !this.#viewportHost) return

    const { width, height } = getViewportDimensions(this.#viewportHost)

    const renderer = this.pixiApp.renderer
    if (renderer?.width !== width || renderer?.height !== height) {
      renderer?.resize?.(width, height)
    }

    const canvas = this.pixiApp.canvas ?? this.pixiApp.view
    if (canvas) {
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      canvas.style.display = 'block'
    }

    if (this.pixiApp.stage) {
      this.pixiApp.stage.hitArea = new PIXI.Rectangle(0, 0, width, height)
    }
  }

  #applyViewportTransform() {
    if (!this.treeContainer) return
    this.treeContainer.position.set(this.viewport.x, this.viewport.y)
    this.treeContainer.scale.set(this.viewport.scale)
  }

  #centerTree(renderNodes) {
    if (!renderNodes?.length) {
      this.viewport.x = 0
      this.viewport.y = 0
      this.viewport.scale = 1
      return
    }
    const bbox = computeTreeBoundingBox(renderNodes, this.nodeWidth, this.nodeHeight)
    const { width: vw, height: vh } = getViewportDimensions(this.#viewportHost)
    const { offsetX, offsetY } = computeCenteredOffset(bbox, vw, vh)
    this.viewport.x = offsetX
    this.viewport.y = offsetY
    this.viewport.scale = 1
  }

  #bindResizeObserver(viewportHost) {
    if (this.#resizeObserver && this.#observedViewportHost === viewportHost) return

    if (this.#resizeObserver) {
      this.#resizeObserver.disconnect()
      this.#resizeObserver = null
    }

    this.#observedViewportHost = viewportHost

    this.#resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        this.#resizeViewport()
        this.#applyViewportTransform()
      })
    })

    this.#resizeObserver.observe(viewportHost)
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /*  Pan / zoom interaction handlers (private)                     */
  /* ═══════════════════════════════════════════════════════════════ */

  #bindViewportInteractions() {
    if (this.#isViewportInteractionsBound || !this.pixiApp?.stage) return

    this.#isViewportInteractionsBound = true
    const stage = this.pixiApp.stage
    stage.eventMode = 'static'

    stage.on('pointerdown', (event) => {
      if (this.onBackgroundPointerDown) {
        this.onBackgroundPointerDown()
      }
      this.#isPanning = true
      this.#lastPointerPosition = this.#getPointerPosition(event)
    })

    stage.on('pointermove', (event) => {
      if (!this.#isPanning || !this.#lastPointerPosition) return

      const nextPosition = this.#getPointerPosition(event)
      if (!nextPosition) return

      this.viewport.x += nextPosition.x - this.#lastPointerPosition.x
      this.viewport.y += nextPosition.y - this.#lastPointerPosition.y
      this.#lastPointerPosition = nextPosition
      this.#applyViewportTransform()
    })

    stage.on('pointerup', () => this.#stopPanning())
    stage.on('pointerupoutside', () => this.#stopPanning())

    const canvas = this.pixiApp.canvas ?? this.pixiApp.view
    if (!canvas || this.#zoomCanvas === canvas) return

    const wheelHandler = (event) => {
      event.preventDefault()
      const delta = Math.sign(event.deltaY)
      const factor = delta > 0 ? 1 / this.zoomStep : this.zoomStep
      this.#zoomAt({ x: event.offsetX, y: event.offsetY }, this.viewport.scale * factor)
    }
    canvas.addEventListener('wheel', wheelHandler, { passive: false })
    this.#zoomCanvas = canvas
    this.#zoomWheelHandler = wheelHandler
  }

  #unbindViewportInteractions() {
    if (!this.#isViewportInteractionsBound || !this.pixiApp?.stage) return

    this.#isViewportInteractionsBound = false
    this.pixiApp.stage.off?.('pointerdown')
    this.pixiApp.stage.off?.('pointermove')
    this.pixiApp.stage.off?.('pointerup')
    this.pixiApp.stage.off?.('pointerupoutside')

    if (this.#zoomCanvas && this.#zoomWheelHandler) {
      this.#zoomCanvas.removeEventListener('wheel', this.#zoomWheelHandler)
      this.#zoomCanvas = null
      this.#zoomWheelHandler = null
    }
  }

  /**
   * @param {PIXI.FederatedPointerEvent} event
   * @returns {{ x: number, y: number }|null}
   */
  #getPointerPosition(event) {
    const point = event?.global ?? event?.data?.global
    if (point?.x !== undefined && point?.y !== undefined) {
      return { x: point.x, y: point.y }
    }

    if (event?.globalX !== undefined && event?.globalY !== undefined) {
      return { x: event.globalX, y: event.globalY }
    }

    return null
  }

  #stopPanning() {
    this.#isPanning = false
    this.#lastPointerPosition = null
  }

  #zoomAt(globalPoint, nextScale) {
    const clampedScale = Math.min(Math.max(nextScale, this.minZoom), this.maxZoom)
    if (clampedScale === this.viewport.scale) return

    const worldX = (globalPoint.x - this.viewport.x) / this.viewport.scale
    const worldY = (globalPoint.y - this.viewport.y) / this.viewport.scale

    this.viewport.scale = clampedScale
    this.viewport.x = globalPoint.x - worldX * clampedScale
    this.viewport.y = globalPoint.y - worldY * clampedScale

    this.#applyViewportTransform()
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /*  Tree drawing (private)                                        */
  /* ═══════════════════════════════════════════════════════════════ */

  async #drawTree(viewModel) {
    if (!this.pixiApp) return

    if (this.treeContainer) {
      this.pixiApp.stage?.removeChild?.(this.treeContainer)
      this.treeContainer.destroy?.({ children: true })
      this.treeContainer = null
    }

    this.renderNodesCache = null
    this.#debugNodeViews.clear()

    const { renderNodes, renderConnections } = viewModel ?? {}
    if (!renderNodes?.length && !renderConnections?.length) {
      this.#exposePixiDevtools()
      return
    }

    this.treeContainer = new PIXI.Container()
    setPixiDebugLabel(this.treeContainer, 'specialization-tree')
    this.pixiApp.stage.addChild(this.treeContainer)
    this.#applyViewportTransform()

    this.renderNodesCache = renderNodes

    // --- connections layer ---
    const connectionsLayer = new PIXI.Container()
    setPixiDebugLabel(connectionsLayer, 'connections-layer')
    this.treeContainer.addChild(connectionsLayer)

    for (const conn of renderConnections) {
      const style = getConnectionStyle(conn)
      const connGfx = new PIXI.Graphics()
      setPixiDebugLabel(connGfx, `connection:${conn.fromNodeId}->${conn.toNodeId}`)
      connGfx.lineStyle(style.thickness, style.color, style.alpha)
      connGfx.moveTo(conn.fromX, conn.fromY)
      connGfx.lineTo(conn.toX, conn.toY)
      connectionsLayer.addChild(connGfx)
    }

    // --- nodes layer ---
    const nodesLayer = new PIXI.Container()
    setPixiDebugLabel(nodesLayer, 'nodes-layer')
    this.treeContainer.addChild(nodesLayer)

    for (const node of renderNodes) {
      const v = node.variant ?? NODE_STATE_VARIANTS[NODE_STATE.AVAILABLE].passive
      const nodeLabel = `node:${node.nodeId}:${node.talentName}`

      // Per-node container positioned at world coordinates
      const nodeContainer = new PIXI.Container()
      setPixiDebugLabel(nodeContainer, nodeLabel)
      nodeContainer.x = node.x
      nodeContainer.y = node.y
      nodesLayer.addChild(nodeContainer)

      // Background — local coords (0, 0)
      const background = new PIXI.Graphics()
      setPixiDebugLabel(background, `${nodeLabel}:background`)
      background.beginFill(v.fillColor, v.alpha)
      background.lineStyle(v.borderWidth, v.borderColor, v.alpha)
      background.drawRoundedRect(0, 0, this.nodeWidth, this.nodeHeight, 4)
      background.endFill()
      nodeContainer.addChild(background)

      const hasTopLeftIcon = Boolean(node.iconSlots?.topLeft)
      const hasTopRightIcon = Boolean(node.iconSlots?.topRight)
      const nameOffsetX = hasTopLeftIcon ? 24 : 4
      const nameRightPadding = hasTopRightIcon ? 24 : 4

      // Talent name — local coords
      const nameText = new PIXI.Text(node.talentName, {
        fontFamily: 'Arial',
        fontSize: 10,
        fill: v.textColor,
        wordWrap: true,
        wordWrapWidth: this.nodeWidth - nameOffsetX - nameRightPadding,
      })
      setPixiDebugLabel(nameText, `${nodeLabel}:title`)
      nameText.alpha = v.textAlpha ?? 1
      nameText.x = nameOffsetX
      nameText.y = 4
      nodeContainer.addChild(nameText)

      // Cost badge and cost text — local coords
      const costLabel = `${node.xpCost} XP`
      const costText = new PIXI.Text(costLabel, {
        fontFamily: 'Arial',
        fontSize: 9,
        fill: v.costColor,
      })
      setPixiDebugLabel(costText, `${nodeLabel}:cost-text`)
      costText.alpha = v.costAlpha ?? 1

      let badge = null
      if (v.costDisplay === 'badge') {
        const badgePaddingX = 5
        const badgePaddingY = 2
        const badgeX = 4
        const badgeY = this.nodeHeight - 17
        const badgeWidth = costText.width + badgePaddingX * 2
        const badgeHeight = costText.height + badgePaddingY * 2
        badge = new PIXI.Graphics()
        setPixiDebugLabel(badge, `${nodeLabel}:cost-badge`)
        badge.beginFill(v.costBadgeFillColor ?? 0x333333, 1)
        badge.lineStyle(1, v.costBadgeBorderColor ?? v.borderColor, 1)
        badge.drawRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 6)
        badge.endFill()
        nodeContainer.addChild(badge)

        costText.x = badgeX + badgePaddingX
        costText.y = badgeY + badgePaddingY
      } else {
        costText.x = 4
        costText.y = this.nodeHeight - 14
      }
      nodeContainer.addChild(costText)

      const iconSlotSprites = await this.#drawNodeIconSlots(node, nodeContainer, nodeLabel)

      // Hit area — local coords, transparent overlay
      const hitArea = new PIXI.Graphics()
      setPixiDebugLabel(hitArea, `${nodeLabel}:hit-area`)
      hitArea.beginFill(0xffffff, 0.001)
      hitArea.drawRect(0, 0, this.nodeWidth, this.nodeHeight)
      hitArea.endFill()
      hitArea.eventMode = 'static'
      hitArea.cursor = 'pointer'
      const capturedNode = node
      hitArea.on('pointerdown', (event) => {
        event.stopPropagation()
        if (this.onNodePointerDown) {
          this.onNodePointerDown(capturedNode)
        }
      })
      nodeContainer.addChild(hitArea)

      this.#debugNodeViews.set(node.nodeId, {
        data: node,
        container: nodeContainer,
        background,
        nameText,
        costText,
        badge,
        iconSlotSprites,
        hitArea,
      })
    }

    this.#exposePixiDevtools()
  }

  async #drawStatePictogramSprite(node, parent, nodeLabel = 'node:unknown') {
    if (!parent || !PIXI.Sprite) return false

    try {
      const texture = await loadStatePictogram(node?.nodeState)
      if (!texture) return false

      const sprite = new PIXI.Sprite(texture)
      setPixiDebugLabel(sprite, `${nodeLabel}:state-pictogram`)
      sprite.x = this.nodeWidth - 20
      sprite.y = 4
      sprite.width = 16
      sprite.height = 16
      sprite.tint = 0xffffff
      parent.addChild(sprite)
      return true
    } catch (error) {
      logger.warn('[PixiTreeRenderer] Failed to load node state pictogram, falling back to Unicode glyph', {
        state: node?.nodeState,
        error,
      })
      return false
    }
  }

  async #drawNodeIconSlots(node, parent, nodeLabel = 'node:unknown') {
    const iconSlots = node?.iconSlots ?? {}
    const renderedSlots = {}

    for (const slotName of Object.keys(ICON_SLOT_POSITIONS)) {
      renderedSlots[slotName] = await this.#drawNodeIconSlot(node, parent, nodeLabel, slotName, iconSlots[slotName] ?? null)
    }

    return renderedSlots
  }

  async #drawNodeIconSlot(node, parent, nodeLabel, slotName, iconPath) {
    if (!parent) return null

    const position = ICON_SLOT_POSITIONS[slotName]
    if (!position) return null

    if (!iconPath) {
      return null
    }

    try {
      const texture = await loadIconTexture(iconPath)
      if (texture && PIXI.Sprite) {
        const sprite = new PIXI.Sprite(texture)
        setPixiDebugLabel(sprite, `${nodeLabel}:icon-slot:${slotName}`)
        sprite.x = position.x
        sprite.y = position.y
        sprite.width = NODE_CORNER_ICON_SIZE
        sprite.height = NODE_CORNER_ICON_SIZE
        sprite.tint = 0xffffff
        parent.addChild(sprite)
        return sprite
      }
    } catch (error) {
      logger.warn('[PixiTreeRenderer] Failed to load node corner icon, falling back to text', {
        slotName,
        iconPath,
        nodeId: node?.nodeId,
        error,
      })
    }

    return this.#drawNodeIconSlotFallback(node, parent, nodeLabel, slotName)
  }

  #drawNodeIconSlotFallback(node, parent, nodeLabel, slotName) {
    if (!PIXI.Text) return null

    const fallback = ICON_SLOT_FALLBACKS[slotName]
    const position = ICON_SLOT_POSITIONS[slotName]
    const text = fallback?.text?.(node) ?? ''
    if (!text) return null

    const textNode = new PIXI.Text(text, fallback.style?.(node) ?? {})
    setPixiDebugLabel(textNode, `${nodeLabel}:${fallback.label}`)
    textNode.x = position.x
    textNode.y = position.y
    parent.addChild(textNode)
    return textNode
  }
}
