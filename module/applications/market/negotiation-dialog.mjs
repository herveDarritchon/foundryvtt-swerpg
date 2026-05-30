import { computeNegotiatedPrice, rarityToDifficulty, NEGOTIATION_SKILLS } from '../../lib/market/negotiation.mjs'
import { logger } from '../../utils/logger.mjs'

const { api } = foundry.applications

/* -------------------------------------------- */

/**
 * @typedef {Object} NegotiationDialogResult
 * @property {boolean}  confirmed     Whether the user confirmed the negotiated purchase.
 * @property {number}   finalPrice    The negotiated price (may be higher on disaster, lower on success).
 * @property {string}   outcome       One of 'success', 'failure', 'disaster'.
 * @property {number}   successRanks  Net success ranks used.
 */

/* -------------------------------------------- */

/**
 * Dialog allowing the buyer to attempt a price negotiation before confirming purchase.
 *
 * The GM or player inputs:
 *   1. Which skill to use (Negotiation, Persuasion, or Deception).
 *   2. The number of net success ranks obtained from the skill roll.
 *   3. Whether the roll produced a Disaster.
 *
 * The dialog shows the resulting price in real time and lets the buyer confirm or cancel.
 *
 * Usage:
 * ```js
 * const result = await NegotiationDialog.prompt({ entry, buyer })
 * if (result?.confirmed) { // use result.finalPrice }
 * ```
 */
export default class NegotiationDialog extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    id: 'market-negotiation',
    classes: ['swerpg', 'application', 'market-negotiation-dialog'],
    tag: 'div',
    window: {
      title: 'MARKET.Negotiation.Dialog.Title',
      minimizable: false,
      resizable: false,
    },
    position: {
      width: 420,
    },
    actions: {
      confirmNegotiation: NegotiationDialog.#onConfirmNegotiation,
      cancelNegotiation: NegotiationDialog.#onCancelNegotiation,
    },
  }

  /** @override */
  static PARTS = {
    form: {
      template: 'systems/swerpg/templates/market/negotiation-dialog.hbs',
    },
  }

  /* -------------------------------------------- */

  /**
   * The market entry being negotiated.
   * @type {import('../../lib/market/market-entry.mjs').MarketEntry}
   */
  #entry = null

  /**
   * The buyer actor (plain object or Foundry Actor).
   * @type {object|null}
   */
  #buyer = null

  /**
   * Current form state: selected skill, success ranks, disaster flag.
   * @type {{ skillKey: string, successRanks: number, isDisaster: boolean }}
   */
  #formState = { skillKey: NEGOTIATION_SKILLS[0], successRanks: 0, isDisaster: false }

  /**
   * Resolve callback — called when the dialog closes with a result.
   * @type {((result: NegotiationDialogResult|null) => void)|null}
   */
  #resolve = null

  /* -------------------------------------------- */

  /**
   * Open a negotiation dialog for the given entry and buyer, returning a promise
   * that resolves to the NegotiationDialogResult when the dialog closes.
   *
   * @param {object} params
   * @param {import('../../lib/market/market-entry.mjs').MarketEntry} params.entry  The market entry.
   * @param {object|null} params.buyer   The buyer actor.
   * @returns {Promise<NegotiationDialogResult|null>}
   */
  static async prompt({ entry, buyer }) {
    return new Promise((resolve) => {
      const dialog = new NegotiationDialog()
      dialog.#entry = entry
      dialog.#buyer = buyer
      dialog.#resolve = resolve
      dialog.render(true)
    })
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    const entry = this.#entry
    const originalPrice = entry?.priceResult?.finalPrice ?? 0
    const rarity = entry?.rarity ?? 0
    const difficulty = rarityToDifficulty(rarity)

    const negotiationResult = computeNegotiatedPrice({
      originalPrice,
      successRanks: this.#formState.successRanks,
      isDisaster: this.#formState.isDisaster,
    })

    context.entry = { name: entry?.name ?? '', rarity, originalPrice }
    context.difficulty = difficulty
    context.skillOptions = NEGOTIATION_SKILLS.map((key) => ({
      value: key,
      label: `MARKET.Negotiation.Skill.${key.charAt(0).toUpperCase()}${key.slice(1)}`,
      selected: key === this.#formState.skillKey,
    }))
    context.formState = { ...this.#formState }
    context.negotiationResult = negotiationResult

    return context
  }

  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options)
    const html = this.element
    if (!html) return

    // Skill selector
    const skillSelect = html.querySelector('.negotiation-skill-select')
    if (skillSelect) {
      skillSelect.addEventListener('change', (event) => {
        this.#formState = { ...this.#formState, skillKey: event.currentTarget.value }
        this.render()
      })
    }

    // Success ranks input
    const ranksInput = html.querySelector('.negotiation-ranks-input')
    if (ranksInput) {
      ranksInput.addEventListener('change', (event) => {
        const value = parseInt(event.currentTarget.value, 10)
        this.#formState = { ...this.#formState, successRanks: Number.isFinite(value) && value >= 0 ? value : 0 }
        this.render()
      })
    }

    // Disaster checkbox
    const disasterCheck = html.querySelector('.negotiation-disaster-check')
    if (disasterCheck) {
      disasterCheck.addEventListener('change', (event) => {
        this.#formState = { ...this.#formState, isDisaster: event.currentTarget.checked }
        this.render()
      })
    }
  }

  /* -------------------------------------------- */

  /**
   * Confirm the negotiated price and close the dialog.
   * @this {NegotiationDialog}
   * @param {PointerEvent} _event
   * @param {HTMLElement} _target
   */
  static async #onConfirmNegotiation(_event, _target) {
    const originalPrice = this.#entry?.priceResult?.finalPrice ?? 0
    const negotiationResult = computeNegotiatedPrice({
      originalPrice,
      successRanks: this.#formState.successRanks,
      isDisaster: this.#formState.isDisaster,
    })

    logger.debug('[Market] Negotiation confirmed', {
      skill: this.#formState.skillKey,
      successRanks: this.#formState.successRanks,
      isDisaster: this.#formState.isDisaster,
      outcome: negotiationResult.outcome,
      originalPrice,
      finalPrice: negotiationResult.finalPrice,
    })

    this.#resolve?.({
      confirmed: true,
      finalPrice: negotiationResult.finalPrice,
      outcome: negotiationResult.outcome,
      successRanks: negotiationResult.successRanks,
    })
    this.#resolve = null
    await this.close()
  }

  /**
   * Cancel the negotiation dialog without purchasing.
   * @this {NegotiationDialog}
   * @param {PointerEvent} _event
   * @param {HTMLElement} _target
   */
  static async #onCancelNegotiation(_event, _target) {
    logger.debug('[Market] Negotiation cancelled')
    this.#resolve?.(null)
    this.#resolve = null
    await this.close()
  }

  /** @override */
  async close(options) {
    // Ensure promise is resolved on external close (e.g. pressing Escape)
    if (this.#resolve) {
      this.#resolve(null)
      this.#resolve = null
    }
    return super.close(options)
  }
}
