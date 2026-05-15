import { SYSTEM } from '../config/system.mjs'
import { logger } from '../utils/logger.mjs'
import SwerpgTalentIcon from './talent-icon.mjs'

const DEPR_CHOICE_WHEEL = () => SYSTEM.DEPRECATION.crucible.choiceWheel

/**
 * @deprecated Crucible legacy — individual talent icon inside the choice wheel.
 *   V1 Edge uses specialization-tree-app.mjs with direct node selection.
 *   Will be removed in a future version.
 */
export default class SwerpgTalentTreeTalent extends SwerpgTalentIcon {
  constructor(node, talent, position, config) {
    super(config)
    this.node = node
    this.talent = talent
    this.position.set(position.x, position.y)
  }

  /** @override */
  async draw({ active, accessible, ...config } = {}) {
    // Talent State
    config.borderRadius = 8
    config.borderColor = active ? this.node.node.color : 0x444444
    config.alpha = active ? 1.0 : 0.6

    // Draw Icon
    await super.draw(config)
    this.icon.filters = accessible ? [] : [this.constructor.greyscaleFilter]
    this.#activateInteraction()
  }

  /* -------------------------------------------- */

  #activateInteraction() {
    this.removeAllListeners()
    this.on('pointerover', this.#onPointerOver.bind(this))
    this.on('pointerout', this.#onPointerOut.bind(this))
    this.on('pointerdown', this.#onClickLeft.bind(this))
    this.on('rightdown', this.#onClickRight.bind(this))
    this.eventMode = 'static'
    this.cursor = 'pointer'
  }

  /* -------------------------------------------- */

  /**
   * @deprecated Crucible legacy — choice wheel left-click purchase.
   *   V1 Edge uses specialization-tree-app.mjs with purchaseTalentNode().
   */
  async #onClickLeft(event) {
    event.stopPropagation()
    if (event.data.originalEvent.button !== 0) return
    const tree = game.system.tree
    if (!tree.actor || tree.actor.talentIds.has(this.talent.id)) return

    // V1 guard : si l'acteur a des spécialisations, rediriger vers la vue graphique V1
    const hasV1Specializations = tree.actor.itemTypes?.specialization?.length > 0
    if (hasV1Specializations) {
      if (DEPR_CHOICE_WHEEL().warn) {
        logger.deprecated('talent-tree-talent', 'Choice wheel purchase blocked — actor has V1 specializations', 'Use specialization-tree-app.mjs for talent purchase.')
      }
      ui.notifications.warn('This actor uses V1 specialization trees. Use the specialization tree view to purchase talents.')
      return
    }

    if (DEPR_CHOICE_WHEEL().warn) {
      logger.deprecated('talent-tree-talent', 'Choice wheel purchase via addTalent()', 'V1 Edge uses purchaseTalentNode() via specialization-tree-app.mjs.')
    }
    const response = await tree.actor.addTalent(this.talent, { dialog: true })
    if (response) tree.playClick()
  }

  /* -------------------------------------------- */

  async #onClickRight(event) {
    event.stopPropagation()
    const tree = game.system.tree
    const actor = tree.actor
    if (!actor || !actor.talentIds.has(this.talent.id) || actor.permanentTalentIds.has(this.talent.id)) return
    const talent = tree.actor.items.get(this.talent.id)
    const response = await talent.deleteDialog()
    if (response) tree.playClick()
  }

  /* -------------------------------------------- */

  #onPointerOver(event) {
    event.stopPropagation()
    this.scale.set(1.2, 1.2)
    game.system.tree.hud.activate(this)
  }

  /* -------------------------------------------- */

  #onPointerOut(event) {
    event.stopPropagation()
    this.scale.set(1.0, 1.0)
    game.system.tree.hud.clear()
  }
}
