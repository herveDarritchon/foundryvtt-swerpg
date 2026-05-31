import StandardCheck from '../../dice/standard-check.mjs'
import { logger } from '../../utils/logger.mjs'

const { api } = foundry.applications

/* -------------------------------------------- */

/**
 * @typedef {Object} AvailabilityCheckDialogResult
 * @property {boolean}       confirmed   Whether the user proceeded (false if cancelled).
 * @property {boolean}       passed      Whether the skill check succeeded.
 * @property {StandardCheck} [roll]      The executed roll, present when confirmed is true.
 */

/* -------------------------------------------- */

/**
 * DC table mapping FFG difficulty levels (1–5) to d20 difficulty class values.
 * Difficulty 1 → DC 8, difficulty 5 → DC 20.
 * @type {Readonly<Record<number, number>>}
 */
const DIFFICULTY_TO_DC = Object.freeze({ 1: 8, 2: 11, 3: 14, 4: 17, 5: 20 })

/* -------------------------------------------- */

/**
 * Dialog presenting an availability check context before a skill roll is initiated.
 *
 * Shows the item, the required skill, the difficulty, and a narrative explanation.
 * The buyer can roll the check or cancel the purchase attempt.
 *
 * Usage:
 * ```js
 * const result = await AvailabilityCheckDialog.prompt({ entry, buyer, checkSpec })
 * if (result?.passed) { // proceed with purchase }
 * ```
 */
export default class AvailabilityCheckDialog extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    id: 'market-availability-check',
    classes: ['swerpg', 'application', 'market-availability-check-dialog'],
    tag: 'div',
    window: {
      title: 'MARKET.AvailabilityCheck.Dialog.Title',
      minimizable: false,
      resizable: false,
    },
    position: {
      width: 450,
    },
    actions: {
      rollCheck: AvailabilityCheckDialog.#onRollCheck,
      cancelCheck: AvailabilityCheckDialog.#onCancelCheck,
    },
  }

  /** @override */
  static PARTS = {
    form: {
      template: 'systems/swerpg/templates/market/availability-check-dialog.hbs',
    },
  }

  /* -------------------------------------------- */

  /**
   * The market entry being checked.
   * @type {import('../../lib/market/market-entry.mjs').MarketEntry|null}
   */
  #entry = null

  /**
   * The buyer actor performing the check.
   * @type {object|null}
   */
  #buyer = null

  /**
   * The resolved availability check specification.
   * @type {import('../../lib/market/availability-check.mjs').AvailabilityCheckSpec|null}
   */
  #checkSpec = null

  /**
   * Resolve callback — called when the dialog closes with a result.
   * @type {((result: AvailabilityCheckDialogResult|null) => void)|null}
   */
  #resolve = null

  /* -------------------------------------------- */

  /**
   * Open an availability check dialog for the given entry, buyer, and check spec.
   * Returns a promise that resolves to the result when the dialog closes.
   *
   * @param {object} params
   * @param {import('../../lib/market/market-entry.mjs').MarketEntry}           params.entry      The market entry.
   * @param {object}                                                             params.buyer      The buyer actor.
   * @param {import('../../lib/market/availability-check.mjs').AvailabilityCheckSpec} params.checkSpec  The check specification.
   * @returns {Promise<AvailabilityCheckDialogResult|null>}
   */
  static async prompt({ entry, buyer, checkSpec }) {
    return new Promise((resolve) => {
      const dialog = new AvailabilityCheckDialog()
      dialog.#entry = entry
      dialog.#buyer = buyer
      dialog.#checkSpec = checkSpec
      dialog.#resolve = resolve
      dialog.render(true)
    })
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    const checkSpec = this.#checkSpec
    const entry = this.#entry
    const buyer = this.#buyer
    const skillKey = checkSpec.skillKey
    const skill = SYSTEM.SKILLS[skillKey]

    context.entry = {
      name: entry?.name ?? '',
      rarity: entry?.rarity ?? 0,
      restrictionLevel: entry?.restrictionLevel ?? 'none',
    }

    context.checkSpec = {
      skillKey,
      skillName: skill?.name ?? skillKey,
      difficulty: checkSpec.difficulty,
      descriptionKey: checkSpec.descriptionKey,
    }

    context.actor = {
      name: buyer?.name ?? '',
    }

    return context
  }

  /* -------------------------------------------- */

  /**
   * Handle the Roll Check action: build the StandardCheck pool and open the roll dialog.
   * @this {AvailabilityCheckDialog}
   * @param {PointerEvent} _event
   * @param {HTMLElement}  _target
   */
  static async #onRollCheck(_event, _target) {
    const actor = this.#buyer
    const checkSpec = this.#checkSpec
    const skillKey = checkSpec.skillKey
    const skill = SYSTEM.SKILLS[skillKey]

    if (!skill) {
      logger.error(`[Market] AvailabilityCheckDialog: skill "${skillKey}" not found in SYSTEM.SKILLS`)
      this.#resolve?.({ confirmed: false, passed: false })
      this.#resolve = null
      await this.close()
      return
    }

    const skillRank = actor?.system?.skills?.[skillKey]?.rank?.value ?? 0
    const characteristicKey = skill.characteristic?.key ?? skill.characteristic
    const characteristicValue = actor?.system?.characteristics?.[characteristicKey]?.rank?.value ?? 0
    const dc = DIFFICULTY_TO_DC[checkSpec.difficulty] ?? 14

    const roll = new StandardCheck({
      actorId: actor?.id ?? null,
      skill: skillRank,
      ability: characteristicValue,
      dc,
      type: skillKey,
    })

    logger.debug('[Market] Availability check roll initiated', {
      skillKey,
      skillRank,
      characteristicValue,
      dc,
      actorId: actor?.id,
    })

    const result = await roll.dialog({
      title: game.i18n.format('MARKET.AvailabilityCheck.RollTitle', { skill: skill.name }),
      flavor: game.i18n.localize(checkSpec.descriptionKey),
    })

    if (result === null) {
      // User cancelled the roll dialog — treat as check cancelled
      logger.debug('[Market] Availability check roll cancelled by user')
      this.#resolve?.({ confirmed: false, passed: false })
      this.#resolve = null
      await this.close()
      return
    }

    const passed = result.isSuccess === true

    logger.debug('[Market] Availability check rolled', { passed, total: result.total, dc })

    this.#resolve?.({ confirmed: true, passed, roll: result })
    this.#resolve = null
    await this.close()
  }

  /* -------------------------------------------- */

  /**
   * Handle the Cancel action: abort the check without purchasing.
   * @this {AvailabilityCheckDialog}
   * @param {PointerEvent} _event
   * @param {HTMLElement}  _target
   */
  static async #onCancelCheck(_event, _target) {
    logger.debug('[Market] Availability check cancelled by user')
    this.#resolve?.({ confirmed: false, passed: false })
    this.#resolve = null
    await this.close()
  }

  /* -------------------------------------------- */

  /** @override */
  async close(options) {
    // Ensure the promise resolves even when closed externally (e.g. pressing Escape)
    if (this.#resolve) {
      this.#resolve({ confirmed: false, passed: false })
      this.#resolve = null
    }
    return super.close(options)
  }
}
