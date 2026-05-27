/* ── Bar geometry ──────────────────────────────────────────────── */

/** Height in pixels of the primary (health) resource bar. */
const BAR_PRIMARY_HEIGHT = 8

/** Height in pixels of the secondary (morale) resource bar. */
const BAR_SECONDARY_HEIGHT = 6

/** Border stroke width for resource bars. */
const BAR_BORDER_WIDTH = 1

/** Fill alpha for the bar background (dark tint). */
const BAR_BG_ALPHA = 0.5

/** Alpha filter opacity applied to the bars container. */
const BAR_ALPHA_FILTER = 0.6

/** Y offset from bottom of token for the primary bar. */
const BAR_PRIMARY_Y_OFFSET = 8

/** Y offset from bottom of token for the secondary bar. */
const BAR_SECONDARY_Y_OFFSET = 14

/* ── Pip geometry ──────────────────────────────────────────────── */

/** Radius in pixels of each resource pip circle. */
const PIP_RADIUS = 3

/** Horizontal spacing between consecutive pips. */
const PIP_SPACING = 10

/** X offset from the left edge for the first action pip. */
const PIP_ACTION_START_X = 6

/** X offset from the right edge for the first focus pip. */
const PIP_FOCUS_END_X = 6

/* ── Overlay and effect geometry ───────────────────────────────── */

/** Fraction of token width/height used for the overlay effect size. */
const OVERLAY_SCALE_FACTOR = 0.6

/** Rounding radius for status-effect background rectangles. */
const STATUS_EFFECT_CORNER_RADIUS = 2

/** Margin inset on each side for rounded status-effect backgrounds. */
const STATUS_EFFECT_BG_INSET = 1

/** Scale factor for the target indicator size relative to token size. */
const TARGET_SIZE_SCALE = 0.5

export default class SwerpgTokenObject extends foundry.canvas.placeables.Token {
  /** @inheritDoc */
  static RENDER_FLAGS = { ...super.RENDER_FLAGS, refreshFlanking: {} }

  /**
   * @typedef {Object} SwerpgTokenEngagement
   * @property {Set<Token>} allies      Allied tokens which are adjacent
   * @property {Set<Token>} enemies     Enemy tokens which are adjacent
   * @property {PIXI.Rectangle} engagementBounds
   * @property {PIXI.Polygon} movePolygon
   * @property {number} allyBonus
   */

  /**
   * Current engagement status for the Token.
   * @type {SwerpgTokenEngagement}
   */
  engagement = {
    allies: new Set(),
    enemies: new Set(),
  }

  /**
   * Should the next flanking update be responsible for committing Active Effect changes?
   * @type {boolean}
   */
  #commitFlanking = false

  /**
   * A Graphics object in the debug layer which displays engagement for this token.
   * @type {PIXI.Graphics}
   */
  #engagementDebug

  /* -------------------------------------------- */
  /*  Rendering                                   */

  /* -------------------------------------------- */

  /** @inheritDoc */
  _applyRenderFlags(flags) {
    super._applyRenderFlags(flags)
    if (flags.refreshFlanking) this.#updateFlanking()
  }

  /* -------------------------------------------- */

  /**
   * TODO remove in V13+ if core supports better UI scale
   * @override
   */
  _drawTarget(options = {}) {
    return super._drawTarget({ ...options, size: TARGET_SIZE_SCALE })
  }

  /* -------------------------------------------- */

  /** @override */
  drawBars() {
    super.drawBars()
    if (!this.actor || this.document.displayBars === CONST.TOKEN_DISPLAY_MODES.NONE) return
    this.#drawResources()
    if (!this.bars.alphaFilter) {
      this.bars.alphaFilter = new PIXI.filters.AlphaFilter()
      this.bars.filters = [this.bars.alphaFilter]
    }
    this.bars.alphaFilter.alpha = BAR_ALPHA_FILTER
  }

  /* -------------------------------------------- */

  /**
   * TODO remove in V13+ if core supports better UI scale
   * @override
   */
  _drawBar(number, bar, data) {
    const val = Number(data.value)
    const pct = Math.clamp(val, 0, data.max) / data.max

    // Determine sizing
    const { width, height } = this.getSize()
    const bw = width
    const bh = number === 0 ? BAR_PRIMARY_HEIGHT : BAR_SECONDARY_HEIGHT
    const bs = BAR_BORDER_WIDTH

    // Determine the color to use
    const colors = number === 0 ? SYSTEM.RESOURCES.health.color : SYSTEM.RESOURCES.morale.color
    const color = colors.low.mix(colors.high, pct)

    // Draw bar
    bar.clear()
    bar.lineStyle(bs, 0x000000, 1.0)
    bar.beginFill(0x000000, BAR_BG_ALPHA).drawRect(0, 0, bw, bh, 3)
    bar.beginFill(color, 1.0).drawRect(0, 0, pct * bw, bh, 2)

    // Set position
    const posY = number === 0 ? height - BAR_PRIMARY_Y_OFFSET : height - BAR_SECONDARY_Y_OFFSET
    bar.position.set(0, posY)
    return true
  }

  /* -------------------------------------------- */

  /**
   * Draw resource pips as part of the token bars.
   */
  #drawResources() {
    if (!this.bars.resources) {
      this.bars.resources = this.bars.addChild(new PIXI.Graphics())
      this.bars.resources.position.set(0, 0)
    }
    const r = this.bars.resources
    r.clear()
    const { action, focus } = this.actor.system.resources
    const { width, height } = this.getSize()

    // Action Pips
    const ac = SYSTEM.RESOURCES.action.color
    r.beginFill(ac, 1.0).lineStyle({ color: 0x000000, width: BAR_BORDER_WIDTH })
    for (let i = 0; i < action.value; i++) {
      r.drawCircle(PIP_ACTION_START_X + i * PIP_SPACING, height - BAR_PRIMARY_Y_OFFSET, PIP_RADIUS)
    }
    r.endFill()

    // Focus Pips
    const fc = SYSTEM.RESOURCES.focus.color
    r.beginFill(fc, 1.0).lineStyle({ color: 0x000000, width: BAR_BORDER_WIDTH })
    for (let i = 0; i < focus.value; i++) {
      r.drawCircle(width - PIP_FOCUS_END_X - i * PIP_SPACING, height - BAR_SECONDARY_Y_OFFSET, PIP_RADIUS)
    }
    r.endFill()
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onControl(options) {
    super._onControl(options)
    if (logger.isDebugEnabled()) this._visualizeEngagement(this.engagement)
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRelease(options) {
    super._onRelease(options)
    this._clearEngagementVisualization()
  }

  /* -------------------------------------------- */
  /*  Engagement and Flanking                     */

  /* -------------------------------------------- */

  /**
   * Compute the rectangular area which represents a "hit" against this Token.
   * @returns {Rectangle}
   */
  getHitRectangle() {
    const s = canvas.scene.dimensions.size
    return this.bounds.pad(-s / 4)
  }

  /* -------------------------------------------- */

  /**
   * Compute the rectangular area of engagement for the token on a square grid.
   * @param {number} distance
   * @returns {Rectangle}
   */
  getEngagementRectangle(distance = 1) {
    const s = canvas.scene.dimensions.size * distance
    const p0 = canvas.grid.getTopLeftPoint(this.document._source) // Non-animated?
    const { w, h } = this
    return new PIXI.Rectangle(p0.x - s, p0.y - s, w + 2 * s, h + 2 * s)
  }

  /* -------------------------------------------- */

  /**
   * Update the flanking status of the Token.
   * @returns {SwerpgTokenEngagement}
   */
  #computeEngagement() {
    if (this.isPreview || !this.actor || this.actor?.isIncapacitated || this.actor?.isBroken || !canvas.grid.isSquare) {
      return { allies: new Set(), enemies: new Set() }
    }
    const { engagementBounds, movePolygon } = this.#computeEngagementSquareGrid()
    const { ally, enemy } = this.#getDispositions()
    const enemies = new Set()
    const allies = new Set()
    const value = this.actor.system.movement.engagement
    const engagement = { allies, enemies, engagementBounds, movePolygon, value }
    canvas.tokens.quadtree.getObjects(engagementBounds, {
      collisionTest: ({ t: token }) => {
        if (token.id === this.id) return false // Ignore yourself
        if (token.actor?.isBroken || token.actor?.isIncapacitated) return false

        // Identify friend or foe
        let targetSet
        if (enemy.includes(token.document.disposition)) targetSet = enemies
        else if (ally.includes(token.document.disposition)) targetSet = allies
        if (!targetSet) return false

        // Confirm collision against the hit rectangle
        const hit = token.getHitRectangle()
        const ix = movePolygon.intersectRectangle(hit) // TODO do something more efficient in the future
        if (ix.points.length > 0) {
          targetSet.add(token)
          return true
        }
      },
    })
    this.constructor.computeFlanking(engagement)
    return engagement
  }

  /* -------------------------------------------- */

  /**
   * Process engagement updates applying them symmetrically to other affected tokens.
   * @param {SwerpgTokenEngagement} oldEngagement   Prior engagement for this Token
   * @param {SwerpgTokenEngagement} newEngagement   New engagement for this Token
   * @returns {Set<SwerpgTokenObject>}              The set of Tokens whose flanking status changed
   */
  #applyEngagementUpdates(oldEngagement, newEngagement) {
    const updated = new Set()

    // Prior engaged allies
    for (const ally of oldEngagement.allies) {
      updated.add(ally)
      if (newEngagement.allies.has(ally)) continue
      ally.engagement.allies.delete(this)
    }

    // Prior engaged enemies
    for (const enemy of oldEngagement.enemies) {
      updated.add(enemy)
      if (newEngagement.enemies.has(enemy)) continue
      enemy.engagement.enemies.delete(this)
    }

    // New engaged allies
    for (const ally of newEngagement.allies) {
      updated.add(ally)
      if (oldEngagement.allies.has(ally)) continue
      ally.engagement.allies.add(this)
    }

    // New engaged enemies
    for (const enemy of newEngagement.enemies) {
      updated.add(enemy)
      if (oldEngagement.enemies.has(enemy)) continue
      enemy.engagement.enemies.add(this)
    }

    // Recompute flanked state
    for (const token of updated) this.constructor.computeFlanking(token.engagement)
    return updated
  }

  /* -------------------------------------------- */

  /**
   * Compute the bounds and eligible polygon for flanking on a square grid.
   * @returns {{engagementBounds: PIXI.Rectangle, movePolygon: PointSourcePolygon}}
   */
  #computeEngagementSquareGrid() {
    const c = this.center
    const engagementBounds = this.getEngagementRectangle()
    const movePolygon = ClockwiseSweepPolygon.create(c, { type: 'move', boundaryShapes: [engagementBounds] })
    return { engagementBounds, movePolygon }
  }

  /* -------------------------------------------- */

  /**
   * Classify Token dispositions into allied and enemy groups.
   * @returns {{ally: number[], enemy: number[]}}
   */
  #getDispositions() {
    const D = CONST.TOKEN_DISPOSITIONS
    switch (this.document.disposition) {
      case D.SECRET:
        return { ally: [], enemy: [] }
      case D.HOSTILE:
        return { ally: [D.HOSTILE], enemy: [D.NEUTRAL, D.FRIENDLY] }
      case D.NEUTRAL:
        return { ally: [D.NEUTRAL, D.FRIENDLY], enemy: [D.HOSTILE] }
      case D.FRIENDLY:
        return { ally: [D.NEUTRAL, D.FRIENDLY], enemy: [D.HOSTILE] }
    }
  }

  /* -------------------------------------------- */

  /**
   * Set the render flag to schedule a flanking refresh.
   * @param commit
   */
  refreshFlanking(commit) {
    const activeGM = game.users.activeGM
    commit ??= activeGM === game.user && activeGM?.viewedScene === canvas.id
    if (commit) this.#commitFlanking = true
    this.renderFlags.set({ refreshFlanking: true })
  }

  /* -------------------------------------------- */

  /**
   * Update flanking conditions for all actors affected by a Token change.
   */
  #updateFlanking() {
    const engagement = this.#computeEngagement()
    const toUpdate = this.#applyEngagementUpdates(this.engagement, engagement)
    this.engagement = engagement // Save the new state

    // Debug visualize enemies
    this._visualizeEngagement(engagement)

    // Update other Actors
    if (!this.#commitFlanking) return
    this.#commitFlanking = false
    for (const token of toUpdate) {
      token.actor.commitFlanking(token.engagement)
    }

    // Update our own actor
    if (this.actor) this.actor.commitFlanking(this.engagement)
  }

  /* -------------------------------------------- */

  /**
   * Compute the Flanked stage for a certain engagement state.
   * @param {SwerpgTokenEngagement} engagement
   */
  static computeFlanking(engagement) {
    engagement.allyBonus = engagement.allies.reduce((bonus, ally) => {
      const mutual = ally.engagement.enemies.intersection(engagement.enemies)
      if (!mutual.size) return bonus
      bonus += Math.min(ally?.actor.system.movement.engagement ?? 1, mutual.size)
      return bonus
    }, 0)
    engagement.flanked = Math.max(engagement.enemies.size - engagement.allyBonus - engagement.value, 0)
  }

  /* -------------------------------------------- */
  /*  Socket Listeners and Handlers               */

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId)
    this.engagement = { allies: new Set(), enemies: new Set() } // "Prior" engagement
    this.refreshFlanking()
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onUpdate(data, options, userId) {
    // Token movement speed
    const positionChange = 'x' in data || 'y' in data
    if (positionChange && this.actor) {
      options.animation ||= {}
      options.animation.movementSpeed = this.actor.system.movement.stride * 2
    }

    // Standard Token update workflow
    super._onUpdate(data, options, userId)

    // Flanking Updates
    const flankingChange = ['x', 'y', 'width', 'height', 'disposition', 'actorId', 'actorLink'].some((k) => k in data)
    if (flankingChange) this.refreshFlanking()
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId)

    // Apply flanking updates
    const activeGM = game.users.activeGM
    const commit = activeGM === game.user && activeGM?.viewedScene === canvas.id
    const newEngagement = { allies: new Set(), enemies: new Set() }
    const toUpdate = this.#applyEngagementUpdates(this.engagement, newEngagement)
    if (commit) {
      for (const token of toUpdate) token.actor.commitFlanking(token.engagement)
    }
    this.engagement = newEngagement
  }

  /* -------------------------------------------- */
  /*  Debugging and Visualization                 */

  /* -------------------------------------------- */

  /**
   * Draw the visualization of Token engagement.
   * @param engagement
   * @internal
   */
  _visualizeEngagement(engagement) {
    if (!logger.isDebugEnabled()) return
    if (!this.#engagementDebug) {
      this.#engagementDebug = canvas.controls.debug.addChild(new PIXI.Graphics())

      // Enemies Text
      this.#engagementDebug.enemies = this.#engagementDebug.addChild(new PreciseText('', PreciseText.getTextStyle({ fontSize: 20 })))
      this.#engagementDebug.enemies.anchor.set(0.5, 1)

      // Engagement Text
      this.#engagementDebug.engagement = this.#engagementDebug.addChild(new PreciseText('', PreciseText.getTextStyle({ fontSize: 20 })))
      this.#engagementDebug.engagement.anchor.set(0.5, 0)

      // Flanked Text
      this.#engagementDebug.flanked = this.#engagementDebug.addChild(new PreciseText('', PreciseText.getTextStyle({ fontSize: 32 })))
      this.#engagementDebug.flanked.anchor.set(0.5, 0.5)
    }
    const e = this.#engagementDebug.clear()

    // Movement polygon
    e.beginFill(0x00ffff, 0.1)
      .lineStyle({
        width: 3,
        color: 0x00ffff,
        alpha: 1.0,
      })
      .drawShape(engagement.movePolygon)
      .endFill()

    // Enemy bounds
    e.beginFill(0xff0000, 0.1).lineStyle({ width: 2, color: 0xff0000, alpha: 1.0 })
    for (const enemy of engagement.enemies) e.drawShape(enemy.bounds)
    e.endFill()

    // Ally bounds
    e.beginFill(0x00ff00, 0.1).lineStyle({ width: 2, color: 0x00ff00, alpha: 1.0 })
    for (const ally of engagement.allies) e.drawShape(ally.bounds)
    e.endFill()

    // Flanking State
    const { x, y } = this.document._source
    const { x: cx, y: cy } = this.getCenterPoint({ x, y })
    this.#engagementDebug.enemies.text = `${engagement.enemies.size} Enemies`
    this.#engagementDebug.enemies.position.set(cx, y)
    this.#engagementDebug.enemies.visible = true
    this.#engagementDebug.engagement.text = `Engagement ${engagement.value + engagement.allyBonus}`
    this.#engagementDebug.engagement.position.set(cx, y + this.h)
    this.#engagementDebug.engagement.visible = true
    this.#engagementDebug.flanked.text = `Flanked ${engagement.flanked}`
    this.#engagementDebug.flanked.position.set(cx, cy)
    this.#engagementDebug.flanked.visible = true
  }

  /* -------------------------------------------- */

  /**
   * Clear the visualization of Token engagement.
   * @internal
   */
  _clearEngagementVisualization() {
    if (!this.#engagementDebug) return
    this.#engagementDebug.clear()
    this.#engagementDebug.enemies.visible = false
    this.#engagementDebug.engagement.visible = false
    this.#engagementDebug.flanked.visible = false
  }

  /* -------------------------------------------- */

  /**
   * TODO: figure out how to use this
   * @param g
   * @private
   */
  _visualizeOffensiveRange(g) {
    const c = this.center
    const r = this.actor.equipment.weapons.maxRange + Math.floor(this.actor.size / 2)
    const range = new PIXI.Polygon(canvas.grid.getCircle(c, r))
    const offsets = swerpg.api.grid.getTargetAreaOffsets(c, range)
    g.beginFill(0xff0000, 0.1)
    const s = canvas.dimensions.size
    for (const o of offsets) {
      const { x, y } = canvas.grid.getTopLeftPoint(o)
      g.drawRect(x, y, s, s)
    }
    g.endFill()
  }
}
