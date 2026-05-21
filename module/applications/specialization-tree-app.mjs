import { resolveActorSpecializationTrees } from '../lib/talent-node/talent-tree-resolver.mjs'
import { getTreeNodesStates } from '../lib/talent-node/talent-node-state.mjs'
import { forgetTalentNode } from '../lib/talent-node/talent-node-forget.mjs'
import { purchaseTalentNode } from '../lib/talent-node/talent-node-purchase.mjs'
import { resolveTalentDetail } from '../lib/talent-node/talent-reference-resolver.mjs'
import { selectDefaultTreeKey } from '../lib/specialization-tree/default-tree-selector.mjs'
import { buildRenderViewModel } from './specialization-tree/render-view-model.mjs'
import { actionableNodeViewModel } from './specialization-tree/actionable-node-view-model.mjs'
import { enrichNode, getReasonLabelKey, NODE_STATE, NODE_STATE_VARIANTS } from './specialization-tree/node-ui-state.mjs'
import { NODE_WIDTH, NODE_HEIGHT, computeNodePosition, buildConnectionAnchors } from './specialization-tree/layout.mjs'
import { logger } from '../utils/logger.mjs'

const { api } = foundry.applications

const SPECIALIZATION_TREE_STATE_LABELS = Object.freeze({
  available: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.AVAILABLE',
  unresolved: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.UNRESOLVED',
  incomplete: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.INCOMPLETE',
})

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

const MIN_VIEWPORT_SIZE = 320

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

  const activeKey = selectDefaultTreeKey(specializationEntries, selectedKey)

  for (const entry of specializationEntries) {
    entry.isSelected = entry.key === activeKey
  }

  if (activeKey) {
    currentTreeId = activeKey
    const entry = specializationEntries.find((e) => e.key === activeKey)
    currentTreeName = entry?.treeName ?? null
    const resolution = resolutions.get(activeKey)
    currentTreeData = resolution?.tree ?? null

    const viewModel = buildRenderViewModel(currentTreeData, (node) => {
      const detail = resolveTalentDetail(node)
      return detail ? { name: detail.name, uuid: node.talentUuid ?? node.talentId ?? '', isRanked: detail.isRanked } : null
    })

    renderNodes = viewModel.nodes.map((viewNode) => {
      const pos = computeNodePosition(viewNode.row, viewNode.column)
      return {
        nodeId: viewNode.nodeId,
        talentId: viewNode.talentId,
        talentName: viewNode.talent.name,
        isRanked: viewNode.isRanked,
        xpCost: viewNode.cost,
        row: viewNode.row,
        column: viewNode.column,
        x: pos.x,
        y: pos.y,
      }
    })

    const nodeStates = getTreeNodesStates(actor, currentTreeId, currentTreeData)
    const localize = game.i18n.localize.bind(game.i18n)
    renderNodes = renderNodes.map((node) => {
      const stateResult = nodeStates.get(node.nodeId) ?? { state: NODE_STATE.INVALID }
      const enriched = enrichNode(node, stateResult, localize)
      return {
        ...enriched,
        actionable: actionableNodeViewModel({
          renderNode: enriched,
          actor,
          specializationId: currentTreeId,
          tree: currentTreeData,
          localize,
        }),
      }
    })

    renderConnections = buildConnectionAnchors(renderNodes, viewModel.connections)
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

        // Ranked indicator — shown only when the node is explicitly ranked
        if (node.isRanked) {
          const rankedText = new PIXI.Text('(R)', {
            fontFamily: 'Arial',
            fontSize: 9,
            fill: v.costColor,
            fontStyle: 'italic',
          })
          rankedText.x = node.x + NODE_WIDTH - rankedText.width - 4
          rankedText.y = node.y + 4
          this.#treeContainer.addChild(rankedText)
        }

        const hitArea = new PIXI.Graphics()
        hitArea.beginFill(0xffffff, 0.001)
        hitArea.drawRect(node.x, node.y, NODE_WIDTH, NODE_HEIGHT)
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
        this.#treeContainer.addChild(hitArea)
      }
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

    const actionLabel = node.actionable?.actionLabel ?? game.i18n.localize(`SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.${action.toUpperCase()}`)

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
  }

  #hideNodeTooltip() {
    const root = typeof HTMLElement !== 'undefined' && this.element instanceof HTMLElement ? this.element : (this.element?.[0] ?? this.element)
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
