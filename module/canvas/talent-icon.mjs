/* ── Default icon config ──────────────────────────────────────── */

/** Default overall opacity for icons. */
const ICON_DEFAULT_ALPHA = 1.0

/** Default background fill color for icons (opaque black). */
const ICON_DEFAULT_BACKGROUND_COLOR = 0x000000

/** Default border stroke width for icons. */
const ICON_DEFAULT_BORDER_WIDTH = 3

/** Default icon size (width and height) in pixels. */
const ICON_DEFAULT_SIZE = 50

/** Default tint for icon sprites (white = no tint). */
const ICON_DEFAULT_TINT = 0xffffff

/* ── Number badge ─────────────────────────────────────────────── */

/** Font size in pixels for the count badge text. */
const ICON_NUMBER_FONT_SIZE = 24

/**
 * Divisor applied to icon size to compute the number badge position offset.
 * Badge is placed at (size / DIVISOR, -size / DIVISOR) relative to center.
 */
const ICON_NUMBER_POSITION_DIVISOR = 3

export default class SwerpgTalentIcon extends PIXI.Container {
  constructor(config) {
    super(config)

    /**
     * Configuration for this icon
     * @type {object}
     */
    this.config = {
      alpha: ICON_DEFAULT_ALPHA,
      backgroundColor: ICON_DEFAULT_BACKGROUND_COLOR,
      borderColor: undefined,
      borderWidth: ICON_DEFAULT_BORDER_WIDTH,
      borderRadius: undefined,
      size: ICON_DEFAULT_SIZE,
      text: undefined,
      texture: undefined,
      tint: ICON_DEFAULT_TINT,
      ...config,
    }

    // Background
    this.bg = this.addChild(new PIXI.Graphics())

    // Icon
    this.icon = this.addChild(new PIXI.Sprite())
    this.icon.anchor.set(0.5, 0.5)
    this.icon.mask = this.addChild(new PIXI.Graphics())

    // Border
    this.border = this.addChild(new PIXI.Graphics())

    // Number
    const textStyle = PreciseText.getTextStyle({ fontSize: ICON_NUMBER_FONT_SIZE })
    this.number = this.addChild(new PreciseText('', textStyle))
    this.number.anchor.set(0.5, 0.5)
    this.number.position.set(this.config.size / ICON_NUMBER_POSITION_DIVISOR, -this.config.size / ICON_NUMBER_POSITION_DIVISOR)
  }

  /* -------------------------------------------- */

  /**
   * The shared filter instance used by all inaccessible icons
   * @type {PIXI.filters.ColorMatrixFilter}
   */
  static greyscaleFilter = new PIXI.filters.ColorMatrixFilter()

  /* -------------------------------------------- */

  /**
   * Draw the talent tree icon
   * @param config
   * @returns {Promise<void>}
   */
  async draw(config = {}) {
    const c = Object.assign(this.config, config)

    // Icon Shape
    this.shape = this._getShape()
    this.bg.clear().beginFill(0x000000).drawShape(this.shape).endFill()

    // Draw icon
    this.icon.texture = c.texture
    this.icon.width = this.icon.height = c.size
    this.icon.alpha = c.alpha ?? 1.0
    this.icon.tint = c.tint ?? 0xffffff

    // Draw mask
    this._drawMask()

    // Active icons have a colorful border
    this._drawBorder()

    // Number
    this.number.text = c.text ?? ''
    this.number.visible = !!this.number.text

    // Interactive hit area
    this.hitArea = new PIXI.Rectangle(-c.size / 2, -c.size / 2, c.size, c.size)
  }

  /* -------------------------------------------- */

  /**
   * Get the icon shape
   * @returns {PIXI.RoundedRectangle|PIXI.Polygon|PIXI.Circle}
   * @protected
   */
  _getShape() {
    const { size, borderRadius } = this.config
    return new PIXI.RoundedRectangle(size / -2, size / -2, size, size, borderRadius)
  }

  /* -------------------------------------------- */

  /**
   * Draw a mask shape for the node icon.
   * @protected
   */
  _drawMask() {
    this.icon.mask.clear().beginFill(0xffffff, 1.0).drawShape(this.shape)
  }

  /* -------------------------------------------- */

  /**
   * Draw border graphics for the node.
   * @protected
   */
  _drawBorder() {
    const { borderColor, borderWidth } = this.config
    this.border.clear().lineStyle({ alignment: 1, color: borderColor, width: borderWidth }).drawShape(this.shape)
  }
}
SwerpgTalentIcon.greyscaleFilter.desaturate()
