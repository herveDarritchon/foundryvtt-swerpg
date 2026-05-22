import { resolveActorSpecializationTrees } from '../lib/talent-node/talent-tree-resolver.mjs'
import { forgetTalentNode } from '../lib/talent-node/talent-node-forget.mjs'
import { purchaseTalentNode } from '../lib/talent-node/talent-node-purchase.mjs'
import { resolveTalentDetail } from '../lib/talent-node/talent-reference-resolver.mjs'
import { selectDefaultTreeKey } from '../lib/specialization-tree/default-tree-selector.mjs'
import { buildRenderViewModel } from './specialization-tree/render-view-model.mjs'
import { actionableNodeViewModel } from './specialization-tree/actionable-node-view-model.mjs'
import {
  enrichNode,
  getReasonLabelKey,
  NODE_STATE,
  NODE_STATE_SVG_ICONS,
  NODE_STATE_VARIANTS,
  CONNECTION_LINE_STYLES,
  CONNECTION_VARIANT,
  resolveConnectionVariant,
  resolveHoverConnectionVariant,
} from './specialization-tree/node-ui-state.mjs'
import { buildConnectionAnchors, computeNodePosition, NODE_HEIGHT, NODE_WIDTH } from './specialization-tree/layout.mjs'
import { logger } from '../utils/logger.mjs'

const { api } = foundry.applications

const ACTION_KEYS = Object.freeze({
  purchase: {
    success: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.PURCHASE.SUCCESS',
    failure: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.PURCHASE.FAILURE',
    confirmTitle: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.CONFIRM.PURCHASE.TITLE',
    confirmContent: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.CONFIRM.PURCHASE.CONTENT',
  },
  forget: {
    success: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.FORGET.SUCCESS',
    failure: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.FORGET.FAILURE',
    confirmTitle: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.CONFIRM.FORGET.TITLE',
    confirmContent: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.CONFIRM.FORGET.CONTENT',
  },
})

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

/**
 * Build the nominal connection visual variant for each connection based on the
 * states of its two endpoint nodes, without any hover context.
 *
 * @param {Array<{ fromX: number, fromY: number, toX: number, toY: number, fromNodeId?: string, toNodeId?: string, type?: string }>} renderConnections
 * @param {Array<{ nodeId: string, nodeState: string }>} renderNodes
 * @returns {Array<{ connectionVariant: string, lineStyle: object }>} Same connections, each annotated with a `connectionVariant` and `lineStyle`.
 */
export function buildConnectionVariants(renderConnections, renderNodes) {
  const stateByNodeId = new Map()
  for (const node of renderNodes) {
    stateByNodeId.set(node.nodeId, node.nodeState)
  }

  return renderConnections.map((conn) => {
    const fromState = stateByNodeId.get(conn.fromNodeId) ?? NODE_STATE.INVALID
    const toState = stateByNodeId.get(conn.toNodeId) ?? NODE_STATE.INVALID
    const connectionVariant = resolveConnectionVariant(fromState, toState)
    return {
      ...conn,
      connectionVariant,
      lineStyle: CONNECTION_LINE_STYLES[connectionVariant],
    }
  })
}

/**
 * Compute hover context for a given hovered node: which nodes are direct
 * prerequisites (they have a connection TO the hovered node), and which nodes
 * are directly unlocked (the hovered node has a connection TO them).
 *
 * Uses the connections graph — no new business logic is introduced.
 *
 * @param {string|null} hoveredNodeId
 * @param {Array<{ fromNodeId: string, toNodeId: string }>} renderConnections
 * @returns {{ prerequisiteNodeIds: Set<string>, unlockNodeIds: Set<string> }}
 */
export function computeHoverContext(hoveredNodeId, renderConnections) {
  const prerequisiteNodeIds = new Set()
  const unlockNodeIds = new Set()

  if (!hoveredNodeId) return { prerequisiteNodeIds, unlockNodeIds }

  for (const conn of renderConnections) {
    if (conn.toNodeId === hoveredNodeId) {
      prerequisiteNodeIds.add(conn.fromNodeId)
    }
    if (conn.fromNodeId === hoveredNodeId) {
      unlockNodeIds.add(conn.toNodeId)
    }
  }

  return { prerequisiteNodeIds, unlockNodeIds }
}

function buildCurrentTreeSummary(actor, currentTreeName, renderNodes) {
  if (!currentTreeName || !renderNodes.length) {
    return null
  }

  const stateCounts = renderNodes.reduce(
    (counts, node) => {
      counts[node.nodeState] = (counts[node.nodeState] ?? 0) + 1
      return counts
    },
    {
      [NODE_STATE.PURCHASED]: 0,
      [NODE_STATE.AVAILABLE]: 0,
      [NODE_STATE.LOCKED]: 0,
    },
  )

  const purchasedCount = stateCounts[NODE_STATE.PURCHASED] ?? 0
  const totalCount = renderNodes.length
  const availableXp = actor?.system?.progression?.experience?.available
  const hasAvailableXp = Number.isFinite(availableXp)

  return {
    treeName: currentTreeName,
    purchasedCount,
    totalCount,
    availableCount: stateCounts[NODE_STATE.AVAILABLE] ?? 0,
    lockedCount: stateCounts[NODE_STATE.LOCKED] ?? 0,
    availableXp: hasAvailableXp ? availableXp : null,
    progressValue: `${purchasedCount}/${totalCount}`,
    stats: [
      {
        key: 'available',
        label: game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUMMARY.ACTIONABLE'),
        value: stateCounts[NODE_STATE.AVAILABLE] ?? 0,
      },
      {
        key: 'locked',
        label: game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUMMARY.LOCKED'),
        value: stateCounts[NODE_STATE.LOCKED] ?? 0,
      },
      hasAvailableXp
        ? {
            key: 'xp',
            label: game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUMMARY.AVAILABLE_XP'),
            value: availableXp,
          }
        : null,
    ].filter(Boolean),
  }
}

/**
 * Build the render context for the specialization tree application.
 * @param {Actor|object|null} actor - The active actor document.
 * @param {string|null} [selectedKey=null] - Optional tree key to select.
 * @returns {object} Display-ready render context with Foundry refs.
 */
export function buildSpecializationTreeContext(actor, selectedKey = null) {
  const resolutions = resolveActorSpecializationTrees(actor)
  const localize = game.i18n.localize.bind(game.i18n)
  const format = game.i18n.format.bind(game.i18n)

  const talentLookup = (node) => {
    const detail = resolveTalentDetail(node)
    return detail
      ? { name: detail.name, uuid: node.talentUuid ?? node.talentId ?? '', isRanked: detail.isRanked, isActive: detail.isActive }
      : null
  }

  const pureContext = buildContextPure(actor, selectedKey, { resolutions, localize, format, talentLookup })

  return {
    ...pureContext,
    actor,
    document: actor,
    system: actor?.system ?? null,
    config: game.system.config,
    isOwner: actor?.isOwner ?? false,
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

  /** @type {PixiTreeRenderer|null} */
  renderer = null

  #selectedTreeKey = null

  #pendingSelection = null

  #hasInitializedViewport = false

  #observedViewportHost = null

  #renderNodesCache = null

  #renderConnectionsCache = null

  /** @type {Map<string, PIXI.DisplayObject[]>} Maps nodeId → list of PIXI objects belonging to that node. */
  #nodeDisplayObjects = new Map()

  #viewport = { scale: 1, x: 0, y: 0 }

  #minZoom = 0.5

  #maxZoom = 2

  #zoomStep = 1.15

  #isPanning = false

  #lastPointerPosition = null

  #isViewportInteractionsBound = false

  #refreshPending = false

  #zoomCanvas = null

  #zoomWheelHandler = null

  #debugNodeViews = new Map()

  /** @type {string|null} Node ID currently under the pointer, or null when not hovering. */
  #hoveredNodeId = null

  get title() {
    return game.i18n.format('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TITLE', {
      actor: this.actor?.name ?? game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.UNKNOWN_ACTOR'),
    })
  }

  /**
   * Open the specialization tree application for an actor.
   * @param {Actor|object|null} actor
   * @param {object} [options={}]
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
   * Coalesces concurrent calls.
   * @param {object} [options={}]
   * @param {boolean} [options.resetView=false]
   * @returns {Promise<SpecializationTreeApp>}
   */
  async refresh(options = {}) {
    if (!this.rendered || !this.actor) return this
    if (this.#refreshPending) return this
    this.#refreshPending = true
    try {
      const renderOptions = { force: true, resetView: false, ...options }
      await this.render(renderOptions)
    } finally {
      this.#refreshPending = false
    }
    return this
  }

  /** @override */
  async close(options) {
    await super.close(options)
    this.#teardownRenderer()
    this.actor = null
    this.document = null
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
    await this.#syncRenderer(context, options)
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /*  Renderer orchestration (private)                              */
  /* ═══════════════════════════════════════════════════════════════ */

  async #syncRenderer(context, options = {}) {
    const viewportHost = this.#getViewportHost()
    if (!viewportHost) {
      this.#teardownRenderer()
      return
    }

    this.#ensureRenderer()
    this.renderer.mount(viewportHost)

    const nextTreeKey = context?.currentTreeId ?? null
    const shouldResetView = options.resetView !== false
      && (!this.#selectedTreeKey || this.#selectedTreeKey !== nextTreeKey)

    this.#selectedTreeKey = nextTreeKey

    const viewModel = {
      renderNodes: context.renderNodes ?? [],
      renderConnections: context.renderConnections ?? [],
      currentTreeId: context.currentTreeId,
    }

    await this.renderer.update(viewModel, { resetView: shouldResetView })
  }

  #ensureRenderer() {
    if (this.renderer) return

    const isDebugAllowed = game.user?.isGM === true
      || game.settings?.get?.('swerpg', 'debugMode') === true

    this.renderer = new PixiTreeRenderer({
      debug: isDebugAllowed,
    })

    this.renderer.onNodePointerDown = (node) => this.#handleNodePointerDown(node)
  }

  #getViewportHost() {
    const isHtmlElement = typeof HTMLElement !== 'undefined' && this.element instanceof HTMLElement
    const root = isHtmlElement ? this.element : (this.element?.[0] ?? this.element)
    return root?.querySelector?.('[data-specialization-tree-viewport]') ?? null
  }

  #teardownRenderer() {
    this.renderer?.destroy()
    this.renderer = null
    this.#selectedTreeKey = null
    this.#pendingSelection = null
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /*  Action handlers (private static)                              */
  /* ═══════════════════════════════════════════════════════════════ */

  /** @returns {Promise<void>} */
  static async #onResetView(event, _target) {
    event.preventDefault()
    this.renderer?.resetView()
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
    this.renderer?.zoomIn()
  }

  /** @returns {Promise<void>} */
  static async #onZoomOut(event, _target) {
    event.preventDefault()
    this.renderer?.zoomOut()
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /*  Node interaction flow (private)                               */
  /* ═══════════════════════════════════════════════════════════════ */

  /**
   * Handle a node pointer down event from the renderer.
   * Dispatches purchase/forget or shows tooltip.
   * @param {object} node - The enriched render node.
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

  async #drawTree(context) {
    if (!this.pixiApp) return

    if (this.#treeContainer) {
      this.pixiApp.stage?.removeChild?.(this.#treeContainer)
      this.#treeContainer.destroy?.({ children: true })
      this.#treeContainer = null
    }

    this.#renderNodesCache = null
    this.#debugNodeViews.clear()
    this.#renderConnectionsCache = null
    this.#nodeDisplayObjects = new Map()
    this.#hoveredNodeId = null
    this.#hideNodeTooltip()

    const { renderNodes, renderConnections } = context ?? {}
    if (!renderNodes?.length && !renderConnections?.length) {
      this.#exposePixiDevtools()
      return
    }

    this.#treeContainer = new PIXI.Container()
    setPixiDebugLabel(this.#treeContainer, 'specialization-tree')
    this.pixiApp.stage.addChild(this.#treeContainer)
    this.#applyViewportTransform()

    this.#renderNodesCache = renderNodes

    // Annotate connections with their nominal progression variant so the
    // render loop can apply the correct line style without any extra business logic.
    const annotatedConnections = buildConnectionVariants(renderConnections, renderNodes)
    this.#renderConnectionsCache = annotatedConnections

    if (annotatedConnections.length > 0) {
      const gfx = new PIXI.Graphics()
      for (const conn of annotatedConnections) {
        const ls = conn.lineStyle ?? CONNECTION_LINE_STYLES[CONNECTION_VARIANT.LOCKED]
        gfx.lineStyle(ls.width, ls.color, ls.alpha)
        gfx.moveTo(conn.fromX, conn.fromY)
        gfx.lineTo(conn.toX, conn.toY)
      }
      this.#treeContainer.addChild(gfx)
    }

    if (renderNodes.length > 0) {
      for (const node of renderNodes) {
        const v = node.variant ?? NODE_STATE_VARIANTS[NODE_STATE.AVAILABLE].passive
        const nodeLabel = `node:${node.nodeId}:${node.talentName}`

        // Each node gets its own Container so hover dimming can target individual nodes.
        const nodeContainer = new PIXI.Container()
        setPixiDebugLabel(nodeContainer, nodeLabel)
        const bg = new PIXI.Graphics()
        bg.beginFill(v.fillColor, v.alpha)
        bg.lineStyle(v.borderWidth, v.borderColor, v.alpha)
        bg.drawRoundedRect(node.x, node.y, NODE_WIDTH, NODE_HEIGHT, 4)
        bg.endFill()
        nodeContainer.addChild(bg)

        // Background — local coords (0, 0)
        const background = new PIXI.Graphics()
        setPixiDebugLabel(background, `${nodeLabel}:background`)
        background.beginFill(v.fillColor, v.alpha)
        background.lineStyle(v.borderWidth, v.borderColor, v.alpha)
        background.drawRoundedRect(0, 0, NODE_WIDTH, NODE_HEIGHT, 4)
        background.endFill()
        nodeContainer.addChild(background)

        // Type indicator (active/passive icon) — top-left corner, local coords
        const typeIcon = node.nodeTypeIcon ?? ''
        const nameOffsetX = typeIcon ? 14 : 4
        let typeText = null
        if (typeIcon) {
          typeText = new PIXI.Text(typeIcon, {
            fontFamily: 'Arial',
            fontSize: 9,
            fill: v.textColor,
          })
          setPixiDebugLabel(typeText, `${nodeLabel}:type-icon`)
          typeText.x = 4
          typeText.y = 5
          nodeContainer.addChild(typeText)
        }

        // Talent name — local coords
        const nameText = new PIXI.Text(node.talentName, {
          fontFamily: 'Arial',
          fontSize: 10,
          fill: v.textColor,
          wordWrap: true,
          wordWrapWidth: NODE_WIDTH - nameOffsetX - 4,
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
          const badgeY = NODE_HEIGHT - 17
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
          costText.y = NODE_HEIGHT - 14
        }
        nodeContainer.addChild(costText)

        const hasRenderedSvgPictogram = await this.#drawStatePictogramSprite(node, nodeContainer, nodeLabel)

        // Fallback Unicode pictogram — local coords
        let pictogramText = null
        if (!hasRenderedSvgPictogram && v.pictogram) {
          pictogramText = new PIXI.Text(v.pictogram, {
            fontFamily: 'Arial',
            fontSize: 10,
            fill: v.pictogramColor,
          })
          setPixiDebugLabel(pictogramText, `${nodeLabel}:state-pictogram-text`)
          pictogramText.x = NODE_WIDTH - pictogramText.width - 6
          pictogramText.y = 4
          nodeContainer.addChild(pictogramText)
        }

        // Ranked indicator — local coords, shown only when explicitly ranked
        let rankedText = null
        if (node.isRanked) {
          rankedText = new PIXI.Text('(R)', {
            fontFamily: 'Arial',
            fontSize: 9,
            fill: v.costColor,
            fontStyle: 'italic',
          })
          setPixiDebugLabel(rankedText, `${nodeLabel}:ranked-indicator`)
          rankedText.x = NODE_WIDTH - rankedText.width - 4
          rankedText.y = 4
          nodeContainer.addChild(rankedText)
        }

        // Hit area — local coords, transparent overlay that captures pointer events
        const hitArea = new PIXI.Graphics()
        setPixiDebugLabel(hitArea, `${nodeLabel}:hit-area`)
        hitArea.beginFill(0xffffff, 0.001)
        hitArea.drawRect(0, 0, NODE_WIDTH, NODE_HEIGHT)
        hitArea.endFill()
        hitArea.eventMode = 'static'
        hitArea.cursor = 'pointer'
        const capturedNode = node
        hitArea.on('pointerdown', async (event) => {
          event.stopPropagation()
          if (capturedNode.actionable?.primaryAction) {
            await this.#handleNodePrimaryAction(capturedNode)
            return
          }

          this.#showNodeTooltip(capturedNode)
        })
        hitArea.on('pointerover', () => {
          this.#onNodeHoverEnter(capturedNode)
        })
        hitArea.on('pointerout', () => {
          this.#onNodeHoverExit()
        })
        nodeContainer.addChild(hitArea)

        this.#debugNodeViews.set(node.nodeId, {
          data: node,
          container: nodeContainer,
          background,
          nameText,
          costText,
          badge,
          typeText,
          pictogramText,
          rankedText,
          hitArea,
        })

        this.#treeContainer.addChild(nodeContainer)
        this.#nodeDisplayObjects.set(node.nodeId, nodeContainer)
      }
    }

    this.#exposePixiDevtools()
  }

  /**
   * Enter hover state for a node: show the detail panel and redraw the tree
   * with contextual highlighting (hovered node prominent, prerequisites and
   * unlockable nodes highlighted, rest dimmed).
   * @param {object} node - The enriched render node being hovered.
   */
  #onNodeHoverEnter(node) {
    if (this.#hoveredNodeId === node.nodeId) return
    this.#hoveredNodeId = node.nodeId
    this.#showNodeTooltip(node)
    this.#applyHoverOverlay(node)
  }

  /**
   * Exit hover state: hide the detail panel, restore nominal tree rendering.
   */
  #onNodeHoverExit() {
    if (!this.#hoveredNodeId) return
    this.#hoveredNodeId = null
    this.#hideNodeTooltip()
    this.#clearHoverOverlay()
  }

  /**
   * Apply a transient hover overlay on the existing tree container:
   * - Dim all nodes that are neither the hovered node, a direct prerequisite, nor a direct unlockable.
   * - Keep the hovered node, prerequisites, and unlockable nodes at full opacity.
   *
   * The overlay reuses per-node Containers tracked in `#nodeDisplayObjects` and
   * the connection graph already computed from `buildConnectionVariants`.
   *
   * @param {object} hoveredNode - The enriched render node being hovered.
   */
  #applyHoverOverlay(hoveredNode) {
    if (!this.#nodeDisplayObjects.size) return

    const renderConnections = this.#renderConnectionsCache ?? []
    const { prerequisiteNodeIds, unlockNodeIds } = computeHoverContext(hoveredNode.nodeId, renderConnections)

    const DIMMED_ALPHA = 0.25

    for (const [nodeId, container] of this.#nodeDisplayObjects) {
      const isHovered = nodeId === hoveredNode.nodeId
      const isPrerequisite = prerequisiteNodeIds.has(nodeId)
      const isUnlockable = unlockNodeIds.has(nodeId)
      container.alpha = isHovered || isPrerequisite || isUnlockable ? 1 : DIMMED_ALPHA
    }
  }

  /**
   * Clear the hover overlay by restoring all per-node containers to full opacity.
   */
  #clearHoverOverlay() {
    for (const container of this.#nodeDisplayObjects.values()) {
      container.alpha = 1
    }
  }

  /**
   * @param {object} node
   * @param {PIXI.Container} [container] - Optional container to add sprite to; defaults to #treeContainer.
   * @returns {Promise<boolean>}
   */
  async #drawStatePictogramSprite(node, container, nodeLabel = 'node:unknown') {
    const target = container ?? this.#treeContainer
    if (!target || !PIXI.Sprite) return false

    try {
      const texture = await loadStatePictogram(node?.nodeState)
      if (!texture) return false

      const sprite = new PIXI.Sprite(texture)
      setPixiDebugLabel(sprite, `${nodeLabel}:state-pictogram`)
      sprite.x = NODE_WIDTH - 20
      sprite.y = 4
      sprite.width = 16
      sprite.height = 16
      sprite.tint = 0xffffff
      target.addChild(sprite)
      return true
    } catch (error) {
      logger.warn('[SpecializationTreeApp] Failed to load node state pictogram, falling back to Unicode glyph', {
        state: node?.nodeState,
        error,
      })
      return false
    }
  }

  #canExecutePrimaryAction(node) {
    const action = node?.actionable?.primaryAction
    if (!this.actor || !action || !node?.nodeId) return false

    const actionRef = node.actionable?.actionRef
    if (!actionRef?.nodeId || !actionRef?.specializationId) return false
    if (actionRef.specializationId !== this.#selectedTreeKey) return false

    if (action === 'purchase') return node.actionable?.canPurchase === true
    if (action === 'forget') return node.actionable?.canForget === true
    return false
  }

  async #handleNodePrimaryAction(node) {
    this.#hideNodeTooltip()

    if (!this.#canExecutePrimaryAction(node)) {
      this.#showNodeTooltip(node)
      return
    }

    if (!this.actor?.isOwner) {
      ui.notifications.warn(game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.PERMISSION_DENIED'))
      return
    }

    const confirmed = await this.#confirmNodeAction(node)
    if (!confirmed) return

    await this.#executeNodeAction(node)
  }

  async #confirmNodeAction(node) {
    const action = node?.actionable?.primaryAction
    const keys = ACTION_KEYS[action]
    if (!keys) return false

    const actionLabel = node.actionable?.actionLabel
      ?? game.i18n.localize(`SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.${action.toUpperCase()}`)

    return api.DialogV2.confirm({
      title: game.i18n.format(keys.confirmTitle, {
        action: actionLabel,
        talent: node.talentName,
      }),
      content: `<p>${game.i18n.format(keys.confirmContent, {
        action: actionLabel,
        talent: node.talentName,
        xp: node.xpCost,
      })}</p>`,
    })
  }

  async #executeNodeAction(node) {
    const action = node?.actionable?.primaryAction
    const specializationId = node?.actionable?.actionRef?.specializationId ?? this.#selectedTreeKey
    const keys = ACTION_KEYS[action]

    if (!action || !specializationId || !node?.nodeId || !keys) return

    const operation = action === 'forget' ? forgetTalentNode : purchaseTalentNode
    const result = await operation(this.actor, specializationId, node.nodeId)

    if (result.ok) {
      ui.notifications.info(game.i18n.format(keys.success, { talent: node.talentName }))
    } else {
      const reasonLabelKey = getReasonLabelKey(result.reasonCode)
      const reasonLabel = game.i18n.localize(reasonLabelKey)
      ui.notifications.warn(game.i18n.format(keys.failure, { reason: reasonLabel, talent: node.talentName }))
    }

    await this.refresh()
  }

  #showNodeTooltip(node) {
    const root = typeof HTMLElement !== 'undefined' && this.element instanceof HTMLElement
      ? this.element
      : (this.element?.[0] ?? this.element)
    const tooltip = root?.querySelector?.('[data-node-tooltip]')
    if (!tooltip) return

    const localize = game.i18n.localize.bind(game.i18n)
    const vm = buildNodeTooltipViewModel(node, localize)

    const headerEl = tooltip.querySelector('[data-tooltip-header]')
    const bodyEl = tooltip.querySelector('[data-tooltip-body]')
    if (headerEl) headerEl.textContent = vm.header
    if (bodyEl) bodyEl.innerHTML = vm.lines.join('<br>')

    tooltip.hidden = false
  }

  #hideNodeTooltip() {
    const root = typeof HTMLElement !== 'undefined' && this.element instanceof HTMLElement
      ? this.element
      : (this.element?.[0] ?? this.element)
    const tooltip = root?.querySelector?.('[data-node-tooltip]')
    if (tooltip) tooltip.hidden = true
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
    this.#renderConnectionsCache = null
    this.#nodeDisplayObjects = new Map()
    this.#hoveredNodeId = null
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
