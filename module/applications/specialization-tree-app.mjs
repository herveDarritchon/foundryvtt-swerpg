import { resolveActorSpecializationTrees } from '../lib/talent-node/talent-tree-resolver.mjs'
import { forgetTalentNode } from '../lib/talent-node/talent-node-forget.mjs'
import { purchaseTalentNode } from '../lib/talent-node/talent-node-purchase.mjs'
import { resolveTalentDetail } from '../lib/talent-node/talent-reference-resolver.mjs'
import { getReasonLabelKey } from './specialization-tree/node-ui-state.mjs'
import { buildSpecializationTreeContext as buildContextPure } from './specialization-tree/tree-context-builder.mjs'
import { buildContextualActionPanelViewModel } from './specialization-tree/contextual-action-panel-view-model.mjs'
import { PixiTreeRenderer } from './specialization-tree/pixi-tree-renderer.mjs'
import { getOwnedSpecializations } from '../lib/specializations/owned-specializations.mjs'
import { evaluateSpecializationRemoval } from '../lib/specializations/specialization-removal-flow.mjs'

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
  remove: {
    success: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REMOVE.SUCCESS',
    failure: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.REMOVE.FAILURE',
    confirmTitle: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.CONFIRM.REMOVE.TITLE',
    confirmContent: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.CONFIRM.REMOVE.CONTENT',
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
        ? { name: detail.name, uuid: node.talentUuid ?? node.talentId ?? '', isRanked: detail.isRanked, isActive: detail.isActive, description: detail.description }
        : null
    }

    const pureContext = buildContextPure(actor, selectedKey, { resolutions, localize, format, talentLookup })

    const legendItems = buildLegendItems(localize)

    return {
      ...pureContext,
      actor,
      document: actor,
      system: actor?.system ?? null,
      config: game.system.config,
      isOwner: actor?.isOwner ?? false,
      legendItems,
    }
  }

  /**
   * Build the legend items for the specialization tree viewport.
   *
   * Each item carries the state key, a localized label, the affordance type
   * (actionable, informational, blocked), and the matching CSS cursor.
   *
   * @param {(key: string) => string} localize - i18n localize function.
   * @returns {Array<{state: string, label: string, affordance: string, cursor: string}>}
   */
  export function buildLegendItems(localize) {
    return [
      {
        state: 'purchased',
        label: localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.PURCHASED'),
        affordance: 'informational',
        cursor: 'default',
      },
      {
        state: 'available',
        label: localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.AVAILABLE'),
        affordance: 'actionable',
        cursor: 'pointer',
      },
      {
        state: 'locked',
        label: localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.LOCKED'),
        affordance: 'blocked',
        cursor: 'not-allowed',
      },
      {
        state: 'invalid',
        label: localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.NODE_STATE.INVALID'),
        affordance: 'informational',
        cursor: 'help',
      },
    ]
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
      contextualAction: SpecializationTreeApp.#onContextualAction,
      closeDetail: SpecializationTreeApp.#onCloseDetail,
      removeSpecialization: SpecializationTreeApp.#onRemoveSpecialization,
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

  /** @type {object|null} */
  #currentDetailNode = null

  /** Public getter for #currentDetailNode, accessible from static action handlers. */
  get _currentDetailNode() { return this.#currentDetailNode }

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
    this.renderer.onBackgroundPointerDown = () => this.#hideDetailPanel()
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
   * Opens the detail panel for the clicked node.
   * @param {object} node - The enriched render node.
   */
  async #handleNodePointerDown(node) {
    this.#showDetailPanel(node)
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
    this.#hideDetailPanel()

    if (!this.#canExecutePrimaryAction(node)) {
      this.#showDetailPanel(node)
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
    const cancelLabel = game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.CONFIRM.CANCEL')

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
      buttons: [
        {
          action: 'confirm',
          label: actionLabel,
          default: true,
        },
        {
          action: 'cancel',
          label: cancelLabel,
        },
      ],
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

  /** @returns {Promise<void>} */
  static async #onContextualAction(event, _target) {
    event.preventDefault()
    const node = this._currentDetailNode
    if (!node) return
    await this.#handleNodePrimaryAction(node)
  }

  /** @returns {Promise<void>} */
  static async #onCloseDetail(event, _target) {
    event.preventDefault()
    this.#hideDetailPanel()
  }

  /** @returns {Promise<void>} */
  static async #onRemoveSpecialization(event, target) {
    event.preventDefault()
    const specializationKey = target.dataset.specializationKey
    if (!specializationKey || !this.actor?.isOwner) return

    const snapshot = getOwnedSpecializations(this.actor)
    const result = evaluateSpecializationRemoval({
      items: snapshot.items,
      specializationKey,
      selectedTreeKey: this.#selectedTreeKey,
    })

    if (!result.allowed) {
      const reasonLabel = game.i18n.localize(result.reasonCode)
      ui.notifications.warn(game.i18n.format(ACTION_KEYS.remove.failure, { reason: reasonLabel }))
      return
    }

    const confirmed = await api.DialogV2.confirm({
      title: game.i18n.format(ACTION_KEYS.remove.confirmTitle, { specialization: result.specializationName }),
      content: `<p>${game.i18n.format(ACTION_KEYS.remove.confirmContent, { specialization: result.specializationName })}</p>`,
      buttons: [
        {
          action: 'confirm',
          label: game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.ACTION.REMOVE'),
          default: true,
        },
        {
          action: 'cancel',
          label: game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.CONFIRM.CANCEL'),
        },
      ],
    })

    if (!confirmed) return

    try {
      await this.actor.system.removeSpecialization(specializationKey)

      this.#selectedTreeKey = result.fallbackTreeKey

      ui.notifications.info(game.i18n.format(ACTION_KEYS.remove.success, { specialization: result.specializationName }))
    } catch (err) {
      logger.error('[SpecializationTreeApp] Failed to remove specialization', err)
      ui.notifications.error(game.i18n.localize('SWERPG.ERRORS.UnexpectedError'))
    }

    await this.refresh()
  }

  #showDetailPanel(node) {
    this.#currentDetailNode = node

    const root = typeof HTMLElement !== 'undefined' && this.element instanceof HTMLElement
      ? this.element
      : (this.element?.[0] ?? this.element)
    const panel = root?.querySelector?.('[data-detail-panel]')
    if (!panel) return

    const localize = game.i18n.localize.bind(game.i18n)
    const vm = buildContextualActionPanelViewModel(node, localize)

    const nameEl = panel.querySelector('[data-detail-talent-name]')
    const costEl = panel.querySelector('[data-detail-cost]')
    const typeEl = panel.querySelector('[data-detail-type]')
    const stateEl = panel.querySelector('[data-detail-state]')
    const reasonEl = panel.querySelector('[data-detail-reason]')
    const descriptionEl = panel.querySelector('[data-detail-description]')
    const ctaEl = panel.querySelector('[data-detail-cta]')
    const ctaLabelEl = panel.querySelector('[data-detail-cta-label]')

    if (nameEl) nameEl.textContent = vm.talentName
    if (costEl) costEl.textContent = `${vm.xpCost} XP`
    if (typeEl) typeEl.textContent = vm.typeLabel
    if (stateEl) stateEl.textContent = vm.nodeStateLabel
    if (reasonEl) {
      if (vm.reasonLabel) {
        reasonEl.textContent = vm.reasonLabel
        reasonEl.hidden = false
      } else {
        reasonEl.hidden = true
      }
    }
    if (descriptionEl) {
      if (vm.description) {
        descriptionEl.innerHTML = vm.description
        descriptionEl.hidden = false
      } else {
        descriptionEl.hidden = true
      }
    }
    if (ctaEl && ctaLabelEl) {
      if (vm.canAction && vm.actionLabel) {
        ctaLabelEl.textContent = vm.actionLabel
        ctaEl.hidden = false
      } else {
        ctaEl.hidden = true
      }
    }

    panel.hidden = false
  }

  #hideDetailPanel() {
    this.#currentDetailNode = null

    const root = typeof HTMLElement !== 'undefined' && this.element instanceof HTMLElement
      ? this.element
      : (this.element?.[0] ?? this.element)
    const panel = root?.querySelector?.('[data-detail-panel]')
    if (panel) panel.hidden = true
  }
}
