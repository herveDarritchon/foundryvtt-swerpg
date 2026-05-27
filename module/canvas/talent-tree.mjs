import SwerpgTalentNode from '../config/talent-tree.mjs'
import SwerpgTalentTreeControls from './talent-tree-controls.mjs'
import SwerpgTalentTreeNode from './talent-tree-node.mjs'
import SwerpgTalentChoiceWheel from './talent-choice-wheel.mjs'
import SwerpgTalentHUD from './talent-hud.mjs'

/* ── Background and viewport ──────────────────────────────────── */

/** Background color of the talent tree canvas (dark near-black). */
const CANVAS_BACKGROUND_COLOR = 0x0b0909

/** Half-width and half-height of the square used by darkenBackground. */
const DARKEN_RECT_HALF_SIZE = 6000

/** Alpha of the darkening overlay applied when a node is active. */
const DARKEN_OVERLAY_ALPHA = 0.5

/* ── Tree decoration circles ──────────────────────────────────── */

/** Radius of the inner decorative circle drawn on the tree background. */
const TREE_INNER_CIRCLE_RADIUS = 1400

/** Radius of the outer decorative circle drawn on the tree background. */
const TREE_OUTER_CIRCLE_RADIUS = 2000

/* ── Character sprite ─────────────────────────────────────────── */

/** Height in pixels of the actor portrait sprite at the tree center. */
const CHARACTER_SPRITE_HEIGHT = 200

/* ── Active connections ───────────────────────────────────────── */

/** Line width for active (purchased) connections between nodes. */
const CONNECTION_LINE_WIDTH = 3

/** Line alpha for active (purchased) connections between nodes. */
const CONNECTION_LINE_ALPHA = 1.0

/** Background edge line alpha (dim, non-interactive). */
const EDGE_LINE_ALPHA = 0.35

/* ── Audio ────────────────────────────────────────────────────── */

/** Volume for UI click sound effects. */
const CLICK_SOUND_VOLUME = 0.2

/* ── Interaction ──────────────────────────────────────────────── */

/** Speed multiplier applied to right-drag pan deltas. */
const DRAG_PAN_SPEED = 0.8

/** Zoom scale multiplier for a single wheel-up tick. */
const ZOOM_IN_FACTOR = 1.05

/** Zoom scale multiplier for a single wheel-down tick. */
const ZOOM_OUT_FACTOR = 0.95

/** Scale applied to a deactivated node returning to its resting state. */
const NODE_NORMAL_SCALE = 1.0

/* ── Z-index ──────────────────────────────────────────────────── */

/** Z-index applied to the HUD element while the talent tree is open. */
const HUD_Z_INDEX_TREE_OPEN = 9999

/** Z-index applied to the talent tree canvas in development mode. */
const TREE_CANVAS_Z_INDEX_DEV = 0

/**
 * @typedef {Object} SwerpgTalentNodeState
 * @property {boolean} [accessible]
 * @property {boolean} unlocked
 * @property {boolean} purchased
 * @property {boolean} banned
 */

class SwerpgTalentNodeStates extends Map {
  /**
   * The default Talent node state.
   * @type {SwerpgTalentNodeState}
   */
  static DEFAULT_STATE = Object.freeze({ accessible: false, unlocked: false, purchased: false, banned: false })

  /**
   * @inheritDoc
   * @returns {SwerpgTalentNodeState}
   */
  get(key) {
    /** @type {SwerpgTalentNodeState} */
    const state = super.get(key)
    return state || SwerpgTalentNodeStates.DEFAULT_STATE
  }
}

/* -------------------------------------------- */

export default class SwerpgTalentTree extends PIXI.Container {
  constructor() {
    super()
    this.#initialize()
  }

  /**
   * Has the talent tree been drawn yet?
   * @type {boolean}
   */
  #drawn = false

  /**
   * The canvas element used to draw the tree.
   * @type {HTMLCanvasElement}
   */
  canvas

  /**
   * The PIXI Application that controls the secondary canvas.
   * @type {PIXI.Application}
   */
  app

  /**
   * A reference to the Actor which is currently bound to the talent tree.
   * @type {SwerpgActor|null}
   */
  actor = null

  /**
   * A reference to the active node
   * @type {SwerpgTalentTreeNode}
   */
  active

  /**
   * A reference to the talent tree HUD
   * @type {SwerpgTalentHUD}
   */
  hud = new SwerpgTalentHUD()

  /**
   * A reference to the talent tree choice wheel
   * @type {SwerpgTalentChoiceWheel}
   */
  wheel

  /**
   * A mapping which tracks the current node states
   * @type {Map<SwerpgTalentNode,SwerpgTalentNodeState>}
   */
  state = new SwerpgTalentNodeStates()

  /**
   * The set of sound files used for UI clicks.
   * @type {string[]}
   */
  static clickSounds = [
    'systems/swerpg/audio/click1.wav',
    'systems/swerpg/audio/click2.wav',
    'systems/swerpg/audio/click3.wav',
    'systems/swerpg/audio/click4.wav',
    'systems/swerpg/audio/click5.wav',
  ]

  /* -------------------------------------------- */

  get tree() {
    return SwerpgTalentNode.nodes
  }

  /* -------------------------------------------- */

  /**
   * Initialize the secondary canvas used for the talent tree.
   */
  #initialize() {
    // Create the HTML canvas element
    Object.defineProperty(this, 'canvas', { value: document.createElement('canvas'), writable: false })
    this.canvas.id = 'swerpg-talent-tree'
    this.canvas.hidden = true
    document.body.appendChild(this.canvas)

    // Create the PIXI Application
    Object.defineProperty(this, 'app', {
      value: new PIXI.Application({
        view: this.canvas,
        width: window.innerWidth,
        height: window.innerHeight,
        transparent: false,
        resolution: 1,
        autoDensity: true,
        background: CANVAS_BACKGROUND_COLOR,
        antialias: false, // Not needed because we use SmoothGraphics
        powerPreference: 'high-performance', // Prefer high performance GPU for devices with dual graphics cards
      }),
      writable: false,
    })
    Object.defineProperty(this, 'stage', { value: this.app.stage, writable: false })

    // Create the controls app
    Object.defineProperty(this, 'controls', { value: new SwerpgTalentTreeControls(), writable: false })

    // Add this class to the canvas stage
    this.stage.addChild(this)
  }

  /* -------------------------------------------- */
  /*  Drawing                                     */

  /* -------------------------------------------- */

  /**
   * Draw the Talent Tree to the secondary canvas.
   * @returns {Promise<void>}
   */
  async draw() {
    if (this.#drawn) return
    this.background = this.addChild(new PIXI.Container())
    this.foreground = this.addChild(new PIXI.Container())

    // Load Textures
    await this.#loadTextures()

    // Draw Background
    this.backdrop = this.background.addChild(await this.#drawBackdrop())

    // Draw Center
    this.character = this.foreground.addChild(new PIXI.Sprite())

    // Background connections
    this.edges = this.background.addChild(new PIXI.Graphics())
    this.edges.lineStyle({ color: 0x000000, alpha: EDGE_LINE_ALPHA, width: CONNECTION_LINE_WIDTH })

    // Active connections
    this.connections = this.background.addChild(new PIXI.Graphics())

    // Draw Nodes and Edges
    this.nodes = this.background.addChild(new PIXI.Container())
    const origin = SwerpgTalentNode.nodes.get('origin')
    await this.#drawNodes(origin.connected, new Set([origin]))
    this.#drawCircles()

    // Background fade and filter
    this.background.darken = this.background.addChild(new PIXI.Graphics())
    this.background.blurFilter = new PIXI.filters.BlurFilter(1)
    this.background.filters = [this.background.blurFilter]
    this.background.blurFilter.enabled = false

    // Create Choice Wheel
    this.wheel = this.foreground.addChild(new SwerpgTalentChoiceWheel())

    // Enable interactivity
    this.#activateInteractivity()

    // Ensure the main Canvas HUD is rendered
    canvas.hud.render(true)

    // Draw initial conditions
    this.refresh()
    this.#drawn = true
  }

  /* -------------------------------------------- */

  /**
   * Load all necessary textures for rendering the talent tree.
   * @returns {Promise<void[]>}
   */
  async #loadTextures() {
    const toLoad = ['systems/swerpg/ui/tree/background.webp', 'systems/swerpg/ui/tree/wheel.webp']
    const varities = Object.keys(SYSTEM.CHARACTERISTICS).concat(['inactive'])
    for (const nodeType in SwerpgTalentTreeNode.NODE_TYPES) {
      for (const variety of varities) {
        toLoad.push(`systems/swerpg/ui/tree/nodes/${nodeType}-${variety}.webp`)
      }
    }
    return TextureLoader.loader.load(toLoad, {
      message: game.i18n.format('SCENES.Loading', { name: 'Talent Tree' }),
    })
  }

  /* -------------------------------------------- */

  async #drawBackdrop() {
    const tex = getTexture('systems/swerpg/ui/tree/background.webp')
    const bd = new PIXI.Sprite(tex)
    bd.anchor.set(0.5, 0.5)
    return bd
  }

  /* -------------------------------------------- */

  #drawCharacter(texture) {
    if (!this.actor) return (this.character.visible = false)
    if (texture) this.character.texture = texture
    this.character.height = CHARACTER_SPRITE_HEIGHT
    this.character.scale.x = this.character.scale.y
    this.character.anchor.set(0.5, 0.5)
    this.character.visible = true
  }

  /* -------------------------------------------- */

  #drawConnections(node, seen) {
    for (const c of node.connected) {
      if (seen.has(c) || c.tier < 0 || !this.state.get(c).purchased) continue
      this.connections
        .lineStyle({ color: c.color, width: CONNECTION_LINE_WIDTH, alpha: CONNECTION_LINE_ALPHA })
        .moveTo(node.point.x, node.point.y)
        .lineTo(c.point.x, c.point.y)
    }
  }

  /* -------------------------------------------- */

  async #drawNodes(nodes, seen = new Set()) {
    const next = []
    for (const node of nodes) {
      if (seen.has(node)) continue
      await this.#drawNode(node)
      this.#drawEdges(node, seen)
      seen.add(node)
      next.push(...node.connected)
    }
    if (next.length) await this.#drawNodes(next, seen)
  }

  /* -------------------------------------------- */

  async #drawNode(node) {
    const config = {}
    config.borderColor = node.color
    const icon = (node.icon = new SwerpgTalentTreeNode(node, config))
    this.nodes.addChild(icon)
  }

  /* -------------------------------------------- */

  #drawEdges(node, seen) {
    for (const c of node.connected) {
      if (seen.has(c)) continue
      this.edges.moveTo(node.point.x, node.point.y)
      this.edges.lineTo(c.point.x, c.point.y)
    }
  }

  /* -------------------------------------------- */

  #drawCircles() {
    this.edges.drawCircle(0, 0, TREE_INNER_CIRCLE_RADIUS)
    this.edges.drawCircle(0, 0, TREE_OUTER_CIRCLE_RADIUS)
  }

  /* -------------------------------------------- */
  /*  Tree Management                             */

  /* -------------------------------------------- */

  /**
   * Open the Talent Tree, binding it to a certain Actor
   * @param {SwerpgActor} actor         The Actor to bind to the talent tree
   * @param {object} [options]            Options which modify how the talent tree is opened
   * @param {boolean} [options.resetView]   Reset the view coordinates of the tree to the center?
   */
  async open(actor, { resetView = true } = {}) {
    if (!(actor instanceof Actor)) throw new Error('You must provide an actor to bind to the Talent Tree.')
    this.developmentMode = logger.isDebugEnabled()

    // Draw the tree (once only)
    await this.draw()
    for (const layer of canvas.layers) {
      if (layer.hud) layer.hud.close()
    }
    this.darkenBackground(false)

    // Associate Actor
    this.actor = actor
    const actorTexture = this.actor ? await loadTexture(this.actor.img) : undefined
    this.#drawCharacter(actorTexture)
    await actor.sheet.render({ force: false, left: 20, top: 20 })
    if (actor.sheet.rendered) {
      actor.sheet.setPosition({ left: 20, top: 20 })
      actor.sheet.minimize()
    }

    // Refresh tree state
    this.pan(resetView ? { x: 0, y: 0, scale: 1.0 } : {})
    this.refresh()

    // Enable the talent tree canvas
    this.app.renderer.enabled = true
    canvas.stage.eventMode = 'none'
    this.stage.eventMode = 'static'
    this.stage.interactiveChildren = true
    this.canvas.hidden = false
    if (this.developmentMode) this.canvas.style.zIndex = TREE_CANVAS_Z_INDEX_DEV
    else canvas.hud.element.style.zIndex = HUD_Z_INDEX_TREE_OPEN // Move HUD above our canvas
  }

  /* -------------------------------------------- */

  /** @override */
  async close() {
    // Disassociate Actor
    const actor = this.actor
    this.actor = null
    await actor?.sheet.render(false)
    actor.sheet.maximize()

    // Deactivate UI
    this.wheel.deactivate()
    this.hud.clear()
    this.controls.close()

    // Disable the talent tree canvas
    this.app.renderer.enabled = false
    this.canvas.hidden = true
    this.stage.eventMode = 'none'
    this.stage.interactiveChildren = false
    canvas.stage.eventMode = 'static'
    canvas.hud.element.style.zIndex = '' // Move HUD back to normal
    canvas.hud.align()
  }

  /* -------------------------------------------- */

  /**
   * Refresh display of the talent tree, incorporating updated data about the Actor's purchased Talents.
   */
  refresh() {
    if (!this.actor) return

    // Draw node changes
    this.getActiveNodes()
    this.connections.clear()
    const seen = new Set()
    for (const node of SwerpgTalentNode.nodes.values()) {
      if (node.tier < 0) continue
      const state = this.state.get(node)
      const nPurchased = state.purchased && node.talents.reduce((n, t) => n + this.actor.talentIds.has(t.id), 0)
      let text = nPurchased > 1 ? nPurchased : ''
      if (this.developmentMode) text = node.talents.size
      node.icon?.draw({ state, text })
      if (state.purchased) this.#drawConnections(node, seen)
      seen.add(node)
    }

    // Refresh talent wheel
    this.wheel.refresh()

    // Refresh controls
    this.controls.render(true)
  }

  /* -------------------------------------------- */

  /**
   * Pan the visual position of the talent tree canvas.
   * @param {number} x
   * @param {number} y
   * @param {number} scale
   */
  pan({ x, y, scale } = {}) {
    x ??= this.stage.pivot.x
    y ??= this.stage.pivot.y
    scale ??= this.stage.scale.x
    this.stage.pivot.set(x, y)
    this.stage.scale.set(scale, scale)
    this.#alignHUD()
  }

  /* -------------------------------------------- */

  /**
   * Play a UI click sound.
   */
  playClick() {
    const src = this.constructor.clickSounds[Math.floor(Math.random() * this.constructor.clickSounds.length)]
    game.audio.play(src, { volume: CLICK_SOUND_VOLUME, loop: false, context: game.audio.interface })
  }

  /* -------------------------------------------- */
  /*  Talent Management                           */

  /* -------------------------------------------- */

  activateNode(node) {
    if (this.active) this.deactivateNode({ click: false })
    this.active = node
    this.wheel.activate(node)
    this.darkenBackground(true)
    this.playClick()
  }

  /* -------------------------------------------- */

  deactivateNode({ click = true } = {}) {
    if (!this.active) return
    this.wheel.deactivate()
    this.active.scale.set(NODE_NORMAL_SCALE, NODE_NORMAL_SCALE)
    this.active = null
    this.darkenBackground(false)
    if (click) this.playClick()
  }

  /* -------------------------------------------- */

  darkenBackground(fade = true) {
    this.background.darken.clear()
    const w = DARKEN_RECT_HALF_SIZE * 2
    if (fade) this.background.darken.beginFill(0x000000, DARKEN_OVERLAY_ALPHA).drawRect(-DARKEN_RECT_HALF_SIZE, -DARKEN_RECT_HALF_SIZE, w, w).endFill()
    this.background.blurFilter.enabled = fade
  }

  /* -------------------------------------------- */

  /**
   * Traverse the talent tree, acquiring a Set of nodes which are currently accessible.
   * @returns {Map<SwerpgTalentNode, number>}
   */
  getActiveNodes() {
    const state = this.state
    const actor = this.actor
    state.clear()

    // Classify the number of signature nodes that have been purchased
    const signatures = SwerpgTalentNode.getSignatureTalents(actor)

    // Recursive testing function
    /**
     *
     * @param nodes
     * @param accessible
     */
    function updateBatch(nodes, accessible = false) {
      const next = []
      for (const node of nodes) {
        // Record Node state
        if (state.has(node)) continue
        const s = node.getState(actor, signatures)
        s.accessible = accessible
        state.set(node, s)

        // Traverse Outwards
        if (node.id === 'origin' || s.purchased) {
          next.push(...node.connected)

          // Signature Teleport Nodes
          if (node.type === 'signature') {
            for (const t of node.talents) {
              // Next.push(t.system.teleportNode);
            }
          }
        }
      }

      // Recursively test
      if (next.length) updateBatch(next, true)
    }

    // Explore outwards from the origin node
    updateBatch([SwerpgTalentNode.nodes.get('origin')], true)

    // Specifically record the state of all signature nodes
    updateBatch(SwerpgTalentNode.signature, false)
    return state
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */

  /* -------------------------------------------- */

  #activateInteractivity() {
    this.background.eventMode = 'passive'
    this.background.children.forEach((c) => (c.eventMode = 'none'))
    this.nodes.eventMode = 'passive' // Capture hover/click events on nodes
    this.backdrop.eventMode = 'static' // Capture drag events on the backdrop
    this.foreground.eventMode = 'passive' // Capture hover/click events on the wheel

    // Mouse Interaction Manager
    this.interactionManager = new MouseInteractionManager(
      this,
      this,
      {},
      {
        clickLeft: this.#onClickLeft,
        dragRightStart: null,
        dragRightMove: this.#onDragRightMove,
        dragRightDrop: null,
        dragRightCancel: null,
      },
      {
        application: this.app,
        dragResistance: 25,
      },
    ).activate()

    // Window Events
    window.addEventListener('resize', this.#onResize.bind(this))
    window.addEventListener('wheel', this.#onWheel.bind(this), { passive: false })
    this.#onResize() // Set initial dimensions
  }

  /* -------------------------------------------- */

  /**
   * Handle left-click events on the talent tree
   * @param {PIXI.FederatedEvent}   event
   */
  #onClickLeft(event) {
    event.stopPropagation()
    this.deactivateNode()
  }

  /* -------------------------------------------- */

  /**
   * Handle right-mouse drag events occurring on the Canvas.
   * @param {PIXI.FederatedEvent} event
   */
  #onDragRightMove(event) {
    const { origin, destination } = event.interactionData
    const dx = destination.x - origin.x
    const dy = destination.y - origin.y
    this.pan({
      x: this.stage.pivot.x - dx * DRAG_PAN_SPEED,
      y: this.stage.pivot.y - dy * DRAG_PAN_SPEED,
    })
  }

  /* -------------------------------------------- */

  /**
   * Handle window resize events.
   */
  #onResize() {
    this.app.renderer.resize(window.innerWidth, window.innerHeight)
    const { width, height } = this.app.renderer.screen
    this.stage.position.set(width / 2, height / 2)
    this.pan(this.stage.pivot)
  }

  /* -------------------------------------------- */

  /**
   * Handle mousewheel events on the Talent Tree canvas.
   * @param {WheelEvent} event      The mousewheel event
   */
  #onWheel(event) {
    if (this.canvas.hidden || event.target?.id !== 'swerpg-talent-tree') return
    const dz = event.delta < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR
    this.pan({ scale: dz * this.stage.scale.x })
  }

  /* -------------------------------------------- */

  /**
   * Align the position of the HUD layer to the current position of the canvas
   */
  #alignHUD() {
    const hud = canvas.hud.element
    const { x, y } = this.getGlobalPosition()
    const scale = this.stage.scale.x
    hud.style.left = `${x}px`
    hud.style.top = `${y}px`
    hud.style.transform = `scale(${scale})`
  }
}
