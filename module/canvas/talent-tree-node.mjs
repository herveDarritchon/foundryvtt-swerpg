import SwerpgTalentIcon from './talent-icon.mjs'

/* ── Node interaction scales ───────────────────────────────────── */

/** Scale applied to a node on pointer hover or when the node is active. */
const NODE_HOVER_SCALE = 1.2

/** Scale applied to a node in its default resting state. */
const NODE_NORMAL_SCALE = 1.0

/* ── Signature node geometry ───────────────────────────────────── */

/** Size (width and height) in pixels for signature-type nodes. */
const SIGNATURE_NODE_SIZE = 80

/** Border radius for signature-type nodes (fully rounded). */
const SIGNATURE_NODE_BORDER_RADIUS = 80

/* ── Standard node visual config ──────────────────────────────── */

/** Border width for accessible (but not purchased) nodes. */
const NODE_ACCESSIBLE_BORDER_WIDTH = 2

/** Alpha for accessible (but not purchased) nodes. */
const NODE_ACCESSIBLE_ALPHA = 0.4

/** Border color for accessible (but not purchased) nodes. */
const NODE_ACCESSIBLE_BORDER_COLOR = 0x827f7d

/** Alpha for inaccessible nodes. */
const NODE_INACCESSIBLE_ALPHA = 0.1

/** Border color for inaccessible nodes. */
const NODE_INACCESSIBLE_BORDER_COLOR = 0x262322

/** Border width for inaccessible nodes. */
const NODE_INACCESSIBLE_BORDER_WIDTH = 2

/** Alpha for fully purchased nodes. */
const NODE_PURCHASED_ALPHA = 1.0

/** Border width for purchased nodes. */
const NODE_PURCHASED_BORDER_WIDTH = 3

/** Border color for banned (but not purchased) nodes. */
const NODE_BANNED_BORDER_COLOR = 0x330000

export default class SwerpgTalentTreeNode extends SwerpgTalentIcon {
  constructor(node, config) {
    super(config)
    this.node = node
    this.position.set(node.point.x, node.point.y)
  }

  static NODE_TYPES = {
    attack: 'Attack',
    defense: 'Defense',
    heal: 'Healing',
    magic: 'Spellcraft',
    move: 'Movement',
    utility: 'Utility',
    signature: 'Signature',
  }

  /* -------------------------------------------- */

  /**
   * Is this node currently active?
   * @type {boolean}
   */
  get isActive() {
    return game.system.tree.active === this
  }

  /* -------------------------------------------- */

  /** @override */
  async draw({ state, ...config } = {}) {
    const variety = state.purchased ? this.node.abilities.first() : 'inactive'
    config.texture = getTexture(`systems/swerpg/ui/tree/nodes/${this.node.type}-${variety}.webp`)

    // Signature nodes
    if (this.node.type === 'signature') {
      config.size = SIGNATURE_NODE_SIZE
      config.borderRadius = SIGNATURE_NODE_BORDER_RADIUS
    }

    // Is the node accessible or not?
    if (state.accessible) {
      config.alpha = NODE_ACCESSIBLE_ALPHA
      config.borderColor = NODE_ACCESSIBLE_BORDER_COLOR
      config.borderWidth = NODE_ACCESSIBLE_BORDER_WIDTH
    } else {
      config.alpha = NODE_INACCESSIBLE_ALPHA
      config.borderColor = NODE_INACCESSIBLE_BORDER_COLOR
      config.borderWidth = NODE_INACCESSIBLE_BORDER_WIDTH
    }

    // Has the node been purchased?
    if (state.purchased) {
      config.alpha = NODE_PURCHASED_ALPHA
      config.borderColor = this.node.color
      config.borderWidth = NODE_PURCHASED_BORDER_WIDTH
    }

    // Has the node been banned?
    else if (state.banned) {
      config.borderColor = NODE_BANNED_BORDER_COLOR
    }

    // Draw Icon
    await super.draw(config)

    // Node interaction
    this.#activateInteraction()
  }

  /* -------------------------------------------- */

  /** @override */
  _getShape() {
    const size = this.config.size
    const hs = size / 2
    const borders = [
      [0, 0.5],
      [0.25, 0],
      [0.75, 0],
      [1, 0.5],
      [0.75, 1],
      [0.25, 1],
    ]

    // Signature nodes = Hexagon
    if (this.node.type === 'signature') {
      const width = size
      const height = (size * Math.sqrt(3)) / 2
      const points = borders.reduce((arr, [ox, oy]) => {
        arr.push(ox * width - width / 2)
        arr.push(oy * height - height / 2)
        return arr
      }, [])
      return new PIXI.Polygon(points)
    }

    // Regular talent nodes = Circle
    return new PIXI.Circle(0, 0, hs)
  }

  /* -------------------------------------------- */

  #activateInteraction() {
    this.removeAllListeners()
    this.on('pointerover', this.#onPointerOver.bind(this))
    this.on('pointerout', this.#onPointerOut.bind(this))
    this.on('pointerdown', this.#onClickLeft.bind(this))
    this.eventMode = 'static'
    this.cursor = 'pointer'
  }

  /* -------------------------------------------- */

  #onClickLeft(event) {
    event.stopPropagation()
    if (event.data.originalEvent.button !== 0) return // Only support standard left-click
    const tree = game.system.tree
    if (this.isActive) {
      tree.deactivateNode()
      this.#onPointerOut(event)
    } else {
      this.#onPointerOver(event)
      tree.activateNode(this)
    }
  }

  /* -------------------------------------------- */

  #onPointerOver(event) {
    const tree = game.system.tree
    // TODO why are these safeguards necessary?
    if (!tree.app.renderer.enabled) return
    if (document.elementFromPoint(event.globalX, event.globalY)?.id !== 'swerpg-talent-tree') return
    tree.hud.activate(this)
    this.scale.set(NODE_HOVER_SCALE, NODE_HOVER_SCALE)
  }

  /* -------------------------------------------- */

  #onPointerOut(event) {
    const tree = game.system.tree
    // TODO why are these safeguards necessary?
    if (!tree.app.renderer.enabled) return
    if (document.elementFromPoint(event.globalX, event.globalY)?.id !== 'swerpg-talent-tree') return
    tree.hud.clear()
    if (this.isActive) return // Don't un-hover an active node
    this.scale.set(NODE_NORMAL_SCALE, NODE_NORMAL_SCALE)
  }
}
