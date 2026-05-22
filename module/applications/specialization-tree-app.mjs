import { resolveActorSpecializationTrees } from '../lib/talent-node/talent-tree-resolver.mjs'
import { forgetTalentNode } from '../lib/talent-node/talent-node-forget.mjs'
import { purchaseTalentNode } from '../lib/talent-node/talent-node-purchase.mjs'
import { resolveTalentDetail } from '../lib/talent-node/talent-reference-resolver.mjs'
import { getReasonLabelKey } from './specialization-tree/node-ui-state.mjs'
import { buildSpecializationTreeContext as buildContextPure } from './specialization-tree/tree-context-builder.mjs'
import { buildNodeTooltipViewModel } from './specialization-tree/node-tooltip-view-model.mjs'
import { PixiTreeRenderer } from './specialization-tree/pixi-tree-renderer.mjs'

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
 * Build the full render context for the specialization tree application.
 *
 * Wraps the pure builder from `tree-context-builder.mjs` and injects the
 * Foundry-specific fields that the template and orchestration layer require.
 *
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

  #refreshPending = false

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
    this.renderer.onBackgroundPointerDown = () => this.#hideNodeTooltip()
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
  async #handleNodePointerDown(node) {
    if (node?.actionable?.primaryAction) {
      await this.#handleNodePrimaryAction(node)
      return
    }

    this.#showNodeTooltip(node)
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
}
