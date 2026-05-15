import { resolveActorSpecializationTrees } from '../lib/talent-node/talent-tree-resolver.mjs'
import { getTreeNodesStates, NODE_STATE, REASON_CODE } from '../lib/talent-node/talent-node-state.mjs'
import { logger } from '../utils/logger.mjs'

const { api } = foundry.applications

const SPECIALIZATION_TREE_STATE_LABELS = Object.freeze({
  available: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.AVAILABLE',
  unresolved: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.UNRESOLVED',
  incomplete: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.INCOMPLETE',
})

const NODE_STATE_LABEL_KEYS = Object.freeze({
  [NODE_STATE.PURCHASED]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.PURCHASED',
  [NODE_STATE.AVAILABLE]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.AVAILABLE',
  [NODE_STATE.LOCKED]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.LOCKED',
  [NODE_STATE.INVALID]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.INVALID',
})

const REASON_LABEL_KEYS = Object.freeze({
  [REASON_CODE.ALREADY_PURCHASED]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.ALREADY_PURCHASED',
  [REASON_CODE.SPECIALIZATION_NOT_OWNED]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.SPECIALIZATION_NOT_OWNED',
  [REASON_CODE.TREE_NOT_FOUND]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.TREE_NOT_FOUND',
  [REASON_CODE.TREE_INCOMPLETE]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.TREE_INCOMPLETE',
  [REASON_CODE.NODE_NOT_FOUND]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_NOT_FOUND',
  [REASON_CODE.NODE_INVALID]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_INVALID',
  [REASON_CODE.NODE_LOCKED]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NODE_LOCKED',
  [REASON_CODE.NOT_ENOUGH_XP]: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.NOT_ENOUGH_XP',
})

const REASON_LABEL_DEFAULT = 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REASON.UNKNOWN'

const NODE_STATE_VARIANTS = Object.freeze({
  [NODE_STATE.PURCHASED]: Object.freeze({
    fillColor: 0x1a3a2a,
    borderColor: 0x4a9a6a,
    borderWidth: 2,
    alpha: 1,
    textColor: 0xcccccc,
    costColor: 0x88bb88,
  }),
  [NODE_STATE.AVAILABLE]: Object.freeze({
    fillColor: 0x1a2c44,
    borderColor: 0x78a9c2,
    borderWidth: 2,
    alpha: 1,
    textColor: 0xffffff,
    costColor: 0xcccccc,
  }),
  [NODE_STATE.LOCKED]: Object.freeze({
    fillColor: 0x222222,
    borderColor: 0x555555,
    borderWidth: 1,
    alpha: 0.7,
    textColor: 0x888888,
    costColor: 0x666666,
  }),
  [NODE_STATE.INVALID]: Object.freeze({
    fillColor: 0x3a1a1a,
    borderColor: 0x8a3333,
    borderWidth: 2,
    alpha: 1,
    textColor: 0xaaaaaa,
    costColor: 0xaa6666,
  }),
})

const MIN_VIEWPORT_SIZE = 320

const NODE_WIDTH = 120
const NODE_HEIGHT = 48
const H_GAP = 24
const V_GAP = 24
const PADDING = 20

/**
 * Compute the viewport size from a host element.
 * @param {HTMLElement|null|undefined} host - The DOM element hosting the PIXI viewport.
 * @returns {{ width: number, height: number }} Safe viewport dimensions.
 */
export function getViewportDimensions(host) {
  const rect = host?.getBoundingClientRect?.()

  return {
    width: Math.max(Math.round(rect?.width || host?.clientWidth || 0), MIN_VIEWPORT_SIZE),
    height: Math.max(Math.round(rect?.height || host?.clientHeight || 0), MIN_VIEWPORT_SIZE),
  }
}

export function computeNodePosition(row, column) {
  return {
    x: column * (NODE_WIDTH + H_GAP) + PADDING,
    y: row * (NODE_HEIGHT + V_GAP) + PADDING,
  }
}

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

export function computeCenteredOffset(bbox, viewportWidth, viewportHeight) {
  return {
    offsetX: (viewportWidth - bbox.width) / 2 - bbox.minX,
    offsetY: (viewportHeight - bbox.height) / 2 - bbox.minY,
  }
}

function _resolveTalentByBusinessKey(normalizedKey) {
  if (typeof game !== 'undefined' && game.items) {
    for (const item of game.items) {
      if (item.type !== 'talent') continue
      const id = item.system?.id
      if (id && typeof id === 'string' && id.toLowerCase().trim() === normalizedKey) {
        return { name: item.name, isRanked: item.system?.isRanked ?? false }
      }
    }
  }

  if (typeof game !== 'undefined' && game.packs) {
    for (const pack of game.packs.values()) {
      if (pack.documentName !== 'Item') continue
      if (!pack.index?.size) continue
      for (const entry of pack.index.values()) {
        if (entry.type !== 'talent') continue
        const systemId = entry.system?.id
        if (systemId && typeof systemId === 'string' && systemId.toLowerCase().trim() === normalizedKey) {
          return { name: entry.name, isRanked: entry.system?.isRanked ?? false }
        }
      }
    }
  }

  return null
}

export function resolveTalentItem(ref) {
  return resolveTalentDetail(ref).name
}

export function resolveTalentDetail(nodeRef) {
  const unknown = game.i18n.localize('SWERPG.TALENT.UNKNOWN')

  const talentUuid = typeof nodeRef === 'string' ? nodeRef : nodeRef?.talentUuid
  const talentId = typeof nodeRef === 'string' ? null : nodeRef?.talentId

  if (talentUuid) {
    try {
      const item = fromUuidSync(talentUuid)
      if (item) {
        return {
          name: item.name ?? unknown,
          isRanked: item.system?.isRanked ?? false,
        }
      }
    } catch {
      // Fall through to legacy fallback
    }
  }

  if (talentId) {
    const matched = _resolveTalentByBusinessKey(talentId.toLowerCase().trim())
    if (matched) {
      return {
        name: matched.name ?? unknown,
        isRanked: matched.isRanked ?? false,
      }
    }
  }

  return { name: unknown, isRanked: false }
}

/**
 * Build the render context for the specialization tree application.
 * @param {Actor|object|null} actor - The active actor document.
 * @returns {object} Display-ready render context.
 */
export function buildSpecializationTreeContext(actor, selectedKey = null) {
  const specializations = Array.from(actor?.system?.details?.specializations || [])
  const title = game.i18n.format('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TITLE', {
    actor: actor?.name ?? game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.UNKNOWN_ACTOR'),
  })

  if (!actor) {
    return {
      actor: null,
      document: null,
      system: null,
      config: game.system.config,
      isOwner: false,
      title,
      subtitle: game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUBTITLE'),
      hasActor: false,
      hasSpecializations: false,
      hasResolvedTrees: false,
      showViewport: false,
      specializations: [],
      currentTreeId: null,
      currentTreeName: null,
      currentTreeData: null,
      renderNodes: [],
      renderConnections: [],
      emptyStateTitle: game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_ACTOR_TITLE'),
      emptyStateDescription: game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_ACTOR_DESCRIPTION'),
      viewportAriaLabel: game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.VIEWPORT_ARIA_LABEL'),
    }
  }

  const resolutions = resolveActorSpecializationTrees(actor)
  const specializationEntries = specializations.map((specialization, index) => {
    const key = specialization?.specializationId || specialization?.treeUuid || specialization?.name || `specialization-${index}`
    const resolution = resolutions.get(key) ?? { tree: null, state: 'unresolved' }
    const state = resolution.state ?? 'unresolved'

    return {
      key,
      specializationId: specialization?.specializationId ?? null,
      name: specialization?.name || game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.UNKNOWN_SPECIALIZATION'),
      treeName: resolution.tree?.name ?? null,
      state,
      stateLabel: game.i18n.localize(SPECIALIZATION_TREE_STATE_LABELS[state] ?? SPECIALIZATION_TREE_STATE_LABELS.unresolved),
      isAvailable: state === 'available',
    }
  })

  const hasResolvedTrees = specializationEntries.some((specialization) => specialization.isAvailable)

  let currentTreeId = null
  let currentTreeName = null
  let currentTreeData = null
  let renderNodes = []
  let renderConnections = []

  let activeKey = null
  if (selectedKey && specializationEntries.some(e => e.key === selectedKey && e.isAvailable)) {
    activeKey = selectedKey
  }
  if (!activeKey) {
    for (const entry of specializationEntries) {
      if (entry.isAvailable) {
        activeKey = entry.key
      }
    }
  }

  for (const entry of specializationEntries) {
    entry.isSelected = entry.key === activeKey
  }

  if (activeKey) {
    currentTreeId = activeKey
    const entry = specializationEntries.find(e => e.key === activeKey)
    currentTreeName = entry?.treeName ?? null
    const resolution = resolutions.get(activeKey)
    currentTreeData = resolution?.tree ?? null

    const nodes = Array.from(currentTreeData?.system?.nodes || [])

    console.table(nodes.map((node) => ({
      nodeId: node.nodeId,
      talentId: node.talentId,
      cost: node.cost,
      row: node.row,
      column: node.column,
    })))

    const connections = Array.from(currentTreeData?.system?.connections || [])

    renderNodes = nodes.map((node) => {
      const pos = computeNodePosition(node.row, node.column)
      const detail = resolveTalentDetail(node)
      return {
        nodeId: node.nodeId,
        talentId: node.talentId,
        talentName: detail.name,
        isRanked: detail.isRanked,
        xpCost: node.cost ?? 0,
        row: node.row,
        column: node.column,
        x: pos.x,
        y: pos.y,
      }
    })

    const nodeStates = getTreeNodesStates(actor, currentTreeId, currentTreeData)
    renderNodes = renderNodes.map((node) => {
      const stateResult = nodeStates.get(node.nodeId) ?? { state: NODE_STATE.INVALID }
      const variant = NODE_STATE_VARIANTS[stateResult.state] ?? NODE_STATE_VARIANTS[NODE_STATE.INVALID]
      const reasonCode = stateResult.reasonCode ?? null
      return {
        ...node,
        nodeState: stateResult.state,
        nodeStateLabel: game.i18n.localize(NODE_STATE_LABEL_KEYS[stateResult.state] ?? NODE_STATE_LABEL_KEYS[NODE_STATE.INVALID]),
        reasonCode,
        reasonLabel: reasonCode ? game.i18n.localize(REASON_LABEL_KEYS[reasonCode] ?? REASON_LABEL_DEFAULT) : null,
        variant,
      }
    })

    const nodePositionMap = new Map()
    for (const node of renderNodes) {
      nodePositionMap.set(node.nodeId, {
        centerX: node.x + NODE_WIDTH / 2,
        centerY: node.y + NODE_HEIGHT / 2,
      })
    }

    renderConnections = connections.map((conn) => {
      const fromPos = nodePositionMap.get(conn.from) ?? { centerX: 0, centerY: 0 }
      const toPos = nodePositionMap.get(conn.to) ?? { centerX: 0, centerY: 0 }
      return {
        fromX: fromPos.centerX,
        fromY: fromPos.centerY,
        toX: toPos.centerX,
        toY: toPos.centerY,
        type: conn.type ?? null,
      }
    })
  }

  return {
    actor,
    document: actor,
    system: actor.system,
    config: game.system.config,
    isOwner: actor.isOwner,
    title,
    subtitle: game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUBTITLE'),
    hasActor: true,
    hasSpecializations: specializationEntries.length > 0,
    hasResolvedTrees,
    showViewport: hasResolvedTrees,
    specializations: specializationEntries,
    currentTreeId,
    currentTreeName,
    currentTreeData,
    renderNodes,
    renderConnections,
    emptyStateTitle:
      specializationEntries.length === 0
        ? game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_SPECIALIZATIONS_TITLE')
        : game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_AVAILABLE_TREE_TITLE'),
    emptyStateDescription:
      specializationEntries.length === 0
        ? game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_SPECIALIZATIONS_DESCRIPTION')
        : game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_AVAILABLE_TREE_DESCRIPTION'),
    viewportAriaLabel: game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.VIEWPORT_ARIA_LABEL'),
  }
}

export default class SpecializationTreeApp extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ['swerpg', 'application', 'specialization-tree-app'],
    tag: 'section',
    position: {
      width: 1080,
      height: 760,
    },
    window: {
      minimizable: true,
      resizable: true,
    },
    sheetConfig: false,
    actions: {
      resetView: SpecializationTreeApp.#onResetView,
      selectTree: SpecializationTreeApp.#onSelectTree,
      zoomIn: SpecializationTreeApp.#onZoomIn,
      zoomOut: SpecializationTreeApp.#onZoomOut,
    },
  }

  static PARTS = {
    root: {
      root: true,
      template: 'systems/swerpg/templates/applications/specialization-tree-app.hbs',
      scrollable: ['.specialization-tree-app__sidebar'],
    },
  }

  actor = null

  document = null

  pixiApp = null

  #viewportHost = null

  #treeContainer = null

  #resizeObserver = null

  #selectedTreeKey = null

  #pendingSelection = null

  #hasInitializedViewport = false

  #observedViewportHost = null

  #renderNodesCache = null

  #selectedNodeId = null

  #viewport = { scale: 1, x: 0, y: 0 }

  #minZoom = 0.5

  #maxZoom = 2

  #zoomStep = 1.15

  #isPanning = false

  #lastPointerPosition = null

  #isViewportInteractionsBound = false

  #zoomCanvas = null

  #zoomWheelHandler = null

  get title() {
    return game.i18n.format('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TITLE', {
      actor: this.actor?.name ?? game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.UNKNOWN_ACTOR'),
    })
  }

  /**
   * Open the specialization tree application for an actor.
   * @param {Actor|object|null} actor - The actor owning the specializations to display.
   * @param {object} [options={}] - Render options.
   * @returns {Promise<SpecializationTreeApp>}
   */
  async open(actor, options = {}) {
    this.actor = actor ?? null
    this.document = this.actor
    await this.render({ ...options, force: true })
    return this
  }

  /**
   * Refresh the application when it is currently open.
   * @returns {Promise<SpecializationTreeApp>}
   */
  async refresh() {
    if (!this.rendered || !this.actor) return this
    await this.render({ force: true })
    return this
  }

  /** @override */
  async close(options) {
    await super.close(options)
    this.#teardownViewport()
    this.actor = null
    this.document = null
    this.#viewportHost = null
    return this
  }

  /** @override */
  async _prepareContext(_options) {
    const pendingKey = this.#pendingSelection
    this.#pendingSelection = null
    return buildSpecializationTreeContext(this.actor, pendingKey ?? this.#selectedTreeKey)
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender?.(context, options)
    this.#syncViewport(context, options)
  }

  #syncViewport(context, options = {}) {
    const viewportHost = this.#getViewportHost()
    if (!viewportHost) {
      this.#teardownViewport()
      return
    }

    this.#viewportHost = viewportHost
    this.#ensurePixiApp(viewportHost)
    this.#bindViewportInteractions()
    this.#bindResizeObserver(viewportHost)

    const nextTreeKey = context?.currentTreeId ?? null
    const shouldResetView = options.resetView !== false && (!this.#hasInitializedViewport || this.#selectedTreeKey !== nextTreeKey)

    this.#selectedTreeKey = nextTreeKey
    this.#hasInitializedViewport = true

    this.#resizeViewport()

    if (shouldResetView) {
      this.#centerTree(context)
    }

    this.#drawTree(context)

    requestAnimationFrame(() => {
      this.#resizeViewport()

      if (shouldResetView) {
        this.#centerTree(context)
      }

      this.#applyViewportTransform()
    })
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

  #getViewportHost() {
    const isHtmlElement = typeof HTMLElement !== 'undefined' && this.element instanceof HTMLElement
    const root = isHtmlElement ? this.element : (this.element?.[0] ?? this.element)
    return root?.querySelector?.('[data-specialization-tree-viewport]') ?? null
  }

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
    }

    const view = this.pixiApp.canvas ?? this.pixiApp.view
    if (!view) {
      logger.warn('[SpecializationTreeApp] PIXI application did not expose a canvas view')
      return
    }

    view.classList.add('specialization-tree-app__canvas')
    if (viewportHost.firstElementChild !== view) {
      viewportHost.replaceChildren(view)
    }
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
    if (!this.#treeContainer) return
    this.#treeContainer.position.set(this.#viewport.x, this.#viewport.y)
    this.#treeContainer.scale.set(this.#viewport.scale)
  }

  #centerTree(context) {
    const { renderNodes } = context ?? {}
    if (!renderNodes?.length) {
      this.#viewport.x = 0
      this.#viewport.y = 0
      this.#viewport.scale = 1
      return
    }
    const bbox = computeTreeBoundingBox(renderNodes, NODE_WIDTH, NODE_HEIGHT)
    const { width: vw, height: vh } = getViewportDimensions(this.#viewportHost)
    const { offsetX, offsetY } = computeCenteredOffset(bbox, vw, vh)
    this.#viewport.x = offsetX
    this.#viewport.y = offsetY
    this.#viewport.scale = 1
  }

  /** @returns {Promise<void>} */
  static async #onResetView(event, _target) {
    event.preventDefault()
    this.#resetView()
  }

  /** @returns {Promise<void>} */
  static async #onSelectTree(event, target) {
    event.preventDefault()
    const key = target.dataset.treeKey
    if (!key || key === this.#selectedTreeKey) return
    this.#pendingSelection = key
    await this.render()
  }

  /** @returns {Promise<void>} */
  static async #onZoomIn(event, _target) {
    event.preventDefault()
    this.#zoomIn()
  }

  /** @returns {Promise<void>} */
  static async #onZoomOut(event, _target) {
    event.preventDefault()
    this.#zoomOut()
  }

  /**
   * Reset the viewport to the centered initial view.
   * Relies on the cached render nodes from the last draw.
   */
  #resetView() {
    this.#centerTree({ renderNodes: this.#renderNodesCache })
    this.#applyViewportTransform()
  }

  /**
   * Zoom in by one zoomStep around the visible center of the viewport.
   * Delegates to #zoomAt() for clamp and repositioning.
   */
  #zoomIn() {
    if (!this.#viewportHost) return
    const { width, height } = getViewportDimensions(this.#viewportHost)
    const center = { x: width / 2, y: height / 2 }
    this.#zoomAt(center, this.#viewport.scale * this.#zoomStep)
  }

  /**
   * Zoom out by one zoomStep around the visible center of the viewport.
   * Delegates to #zoomAt() for clamp and repositioning.
   */
  #zoomOut() {
    if (!this.#viewportHost) return
    const { width, height } = getViewportDimensions(this.#viewportHost)
    const center = { x: width / 2, y: height / 2 }
    this.#zoomAt(center, this.#viewport.scale / this.#zoomStep)
  }

  #zoomAt(globalPoint, nextScale) {
    const clampedScale = Math.min(Math.max(nextScale, this.#minZoom), this.#maxZoom)
    if (clampedScale === this.#viewport.scale) return

    const worldX = (globalPoint.x - this.#viewport.x) / this.#viewport.scale
    const worldY = (globalPoint.y - this.#viewport.y) / this.#viewport.scale

    this.#viewport.scale = clampedScale
    this.#viewport.x = globalPoint.x - worldX * clampedScale
    this.#viewport.y = globalPoint.y - worldY * clampedScale

    this.#applyViewportTransform()
  }

  #bindViewportInteractions() {
    if (this.#isViewportInteractionsBound || !this.pixiApp?.stage) return

    this.#isViewportInteractionsBound = true
    const stage = this.pixiApp.stage
    stage.eventMode = 'static'

    stage.on('pointerdown', (event) => {
      this.#hideNodeTooltip()
      this.#isPanning = true
      this.#lastPointerPosition = this.#getPointerPosition(event)
    })

    stage.on('pointermove', (event) => {
      if (!this.#isPanning || !this.#lastPointerPosition) return

      const nextPosition = this.#getPointerPosition(event)
      if (!nextPosition) return

      this.#viewport.x += nextPosition.x - this.#lastPointerPosition.x
      this.#viewport.y += nextPosition.y - this.#lastPointerPosition.y
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
      const factor = delta > 0 ? 1 / this.#zoomStep : this.#zoomStep
      this.#zoomAt({ x: event.offsetX, y: event.offsetY }, this.#viewport.scale * factor)
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

  #drawTree(context) {
    if (!this.pixiApp) return

    if (this.#treeContainer) {
      this.pixiApp.stage?.removeChild?.(this.#treeContainer)
      this.#treeContainer.destroy?.({ children: true })
      this.#treeContainer = null
    }

    this.#renderNodesCache = null
    this.#hideNodeTooltip()

    const { renderNodes, renderConnections } = context ?? {}
    if (!renderNodes?.length && !renderConnections?.length) return

    this.#treeContainer = new PIXI.Container()
    this.pixiApp.stage.addChild(this.#treeContainer)
    this.#applyViewportTransform()

    this.#renderNodesCache = renderNodes

    if (renderConnections.length > 0) {
      const gfx = new PIXI.Graphics()
      gfx.lineStyle(2, 0x78a9c2, 0.6)
      for (const conn of renderConnections) {
        gfx.moveTo(conn.fromX, conn.fromY)
        gfx.lineTo(conn.toX, conn.toY)
      }
      this.#treeContainer.addChild(gfx)
    }

    if (renderNodes.length > 0) {
      const bg = new PIXI.Graphics()
      for (const node of renderNodes) {
        const v = node.variant ?? NODE_STATE_VARIANTS[NODE_STATE.AVAILABLE]
        bg.beginFill(v.fillColor, v.alpha)
        bg.lineStyle(v.borderWidth, v.borderColor, v.alpha)
        bg.drawRoundedRect(node.x, node.y, NODE_WIDTH, NODE_HEIGHT, 4)
        bg.endFill()
      }
      this.#treeContainer.addChild(bg)

      for (const node of renderNodes) {
        const v = node.variant ?? NODE_STATE_VARIANTS[NODE_STATE.AVAILABLE]
        const nameText = new PIXI.Text(node.talentName, {
          fontFamily: 'Arial',
          fontSize: 10,
          fill: v.textColor,
          wordWrap: true,
          wordWrapWidth: NODE_WIDTH - 8,
        })
        nameText.x = node.x + 4
        nameText.y = node.y + 4
        this.#treeContainer.addChild(nameText)

        const costText = new PIXI.Text(`${node.xpCost} XP`, {
          fontFamily: 'Arial',
          fontSize: 9,
          fill: v.costColor,
        })
        costText.x = node.x + 4
        costText.y = node.y + NODE_HEIGHT - 14
        this.#treeContainer.addChild(costText)

        const hitArea = new PIXI.Graphics()
        hitArea.beginFill(0xffffff, 0.001)
        hitArea.drawRect(node.x, node.y, NODE_WIDTH, NODE_HEIGHT)
        hitArea.endFill()
        hitArea.eventMode = 'static'
        hitArea.cursor = 'pointer'
        const capturedNode = node
        hitArea.on('pointerdown', (event) => {
          event.stopPropagation()
          this.#showNodeTooltip(capturedNode)
        })
        this.#treeContainer.addChild(hitArea)
      }
    }
  }

  #showNodeTooltip(node) {
    const root = typeof HTMLElement !== 'undefined' && this.element instanceof HTMLElement ? this.element : (this.element?.[0] ?? this.element)
    const tooltip = root?.querySelector?.('[data-node-tooltip]')
    if (!tooltip) return

    const i18n = game.i18n.localize.bind(game.i18n)

    const typeLabel = node.isRanked
      ? i18n('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.RANKED')
      : i18n('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.NON_RANKED')

    const headerEl = tooltip.querySelector('[data-tooltip-header]')
    const bodyEl = tooltip.querySelector('[data-tooltip-body]')
    if (headerEl) {
      headerEl.textContent = node.talentName
    }
    if (bodyEl) {
      const parts = [
        `${i18n('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.XP_COST')}: ${node.xpCost} XP`,
        `${i18n('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.TYPE')}: ${typeLabel}`,
        `${i18n('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.STATE')}: ${node.nodeStateLabel}`,
      ]
      if (node.reasonLabel) {
        parts.push(`${i18n('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TOOLTIP.REASON')}: ${node.reasonLabel}`)
      }
      bodyEl.innerHTML = parts.join('<br>')
    }

    tooltip.hidden = false
    this.#selectedNodeId = node.nodeId
  }

  #hideNodeTooltip() {
    const root = typeof HTMLElement !== 'undefined' && this.element instanceof HTMLElement ? this.element : (this.element?.[0] ?? this.element)
    const tooltip = root?.querySelector?.('[data-node-tooltip]')
    if (tooltip) tooltip.hidden = true
    this.#selectedNodeId = null
  }

  #teardownViewport() {
    this.#unbindViewportInteractions()
    this.#stopPanning()

    if (this.#resizeObserver) {
      this.#resizeObserver.disconnect()
      this.#resizeObserver = null
    }

    this.#treeContainer = null
    this.#renderNodesCache = null
    this.#selectedNodeId = null
    this.#viewport = { scale: 1, x: 0, y: 0 }

    if (this.pixiApp) {
      this.pixiApp.destroy?.(true)
      this.pixiApp = null
    }

    this.#observedViewportHost = null
    this.#selectedTreeKey = null
    this.#pendingSelection = null
    this.#hasInitializedViewport = false
    this.#viewportHost = null
  }
}
