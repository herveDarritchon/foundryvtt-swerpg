import { resolveActorSpecializationTrees } from '../lib/talent-node/talent-tree-resolver.mjs'
import { logger } from '../utils/logger.mjs'

const { api } = foundry.applications

const SPECIALIZATION_TREE_STATE_LABELS = Object.freeze({
  available: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.AVAILABLE',
  unresolved: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.UNRESOLVED',
  incomplete: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.INCOMPLETE',
})

const MIN_VIEWPORT_SIZE = 320

/**
 * Compute the viewport size from a host element.
 * @param {HTMLElement|null|undefined} host - The DOM element hosting the PIXI viewport.
 * @returns {{ width: number, height: number }} Safe viewport dimensions.
 */
export function getViewportDimensions(host) {
  return {
    width: Math.max(Math.round(host?.clientWidth || 0), MIN_VIEWPORT_SIZE),
    height: Math.max(Math.round(host?.clientHeight || 0), MIN_VIEWPORT_SIZE),
  }
}

/**
 * Build the render context for the specialization tree application.
 * @param {Actor|object|null} actor - The active actor document.
 * @returns {object} Display-ready render context.
 */
export function buildSpecializationTreeContext(actor) {
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
      stateLabel: game.i18n.localize(
        SPECIALIZATION_TREE_STATE_LABELS[state] ?? SPECIALIZATION_TREE_STATE_LABELS.unresolved,
      ),
      isAvailable: state === 'available',
    }
  })

  const hasResolvedTrees = specializationEntries.some((specialization) => specialization.isAvailable)

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
    emptyStateTitle: specializationEntries.length === 0
      ? game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_SPECIALIZATIONS_TITLE')
      : game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.EMPTY.NO_AVAILABLE_TREE_TITLE'),
    emptyStateDescription: specializationEntries.length === 0
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

  #boundResize = () => this.#resizeViewport()

  #isResizeBound = false

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
    return buildSpecializationTreeContext(this.actor)
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender?.(context, options)
    this.#syncViewport()
  }

  #syncViewport() {
    const viewportHost = this.#getViewportHost()
    if (!viewportHost) {
      this.#teardownViewport()
      return
    }

    this.#viewportHost = viewportHost
    this.#ensurePixiApp(viewportHost)
    this.#resizeViewport()

    if (!this.#isResizeBound) {
      window.addEventListener('resize', this.#boundResize)
      this.#isResizeBound = true
    }
  }

  #getViewportHost() {
    const isHtmlElement = typeof HTMLElement !== 'undefined' && this.element instanceof HTMLElement
    const root = isHtmlElement ? this.element : this.element?.[0] ?? this.element
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
    this.pixiApp.renderer?.resize?.(width, height)
  }

  #teardownViewport() {
    if (this.#isResizeBound) {
      window.removeEventListener('resize', this.#boundResize)
      this.#isResizeBound = false
    }

    if (this.pixiApp) {
      this.pixiApp.destroy?.(true)
      this.pixiApp = null
    }
  }
}
