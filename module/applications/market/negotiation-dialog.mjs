import StandardCheck from '../../dice/standard-check.mjs'
import { computeNegotiatedPrice, rarityToDifficulty, NEGOTIATION_SKILLS } from '../../lib/market/negotiation.mjs'
import { computeResalePrice } from '../../lib/market/sell-valuation.mjs'
import { logger } from '../../utils/logger.mjs'

const { api } = foundry.applications

/* -------------------------------------------- */

/**
 * @typedef {Object} NegotiationDialogResult
 * @property {boolean}  confirmed     Whether the user confirmed the negotiated purchase.
 * @property {number}   finalPrice    The negotiated price (may be higher on disaster, lower on success).
 * @property {string}   outcome       One of 'success', 'failure', 'disaster' (buy mode) or 'success', 'failure', 'triumph', 'disaster' (sale mode).
 * @property {number}   successRanks  Net success ranks used.
 */

/* -------------------------------------------- */

/**
 * DC table mapping FFG difficulty levels (1–5) to d20 difficulty class values.
 * Mirrors the same table used by AvailabilityCheckDialog.
 * @type {Readonly<Record<number, number>>}
 */
const DIFFICULTY_TO_DC = Object.freeze({ 1: 8, 2: 11, 3: 14, 4: 17, 5: 20 })

/* -------------------------------------------- */

/**
 * Minimum net success ranks required to achieve a 'triumph' outcome in sale mode.
 * When the seller achieves this many success ranks (or more), the maximum resale fraction applies.
 * @type {number}
 */
export const TRIUMPH_THRESHOLD = 4

/* -------------------------------------------- */

/**
 * Map the dialog form state to a sale negotiation outcome string.
 *
 * In sale mode, the form state (successRanks + isDisaster) must be converted
 * to one of the four outcomes understood by `computeResalePrice`:
 *   - 'failure'  → base fraction (25%)
 *   - 'success'  → negotiated fraction (50%)
 *   - 'triumph'  → max fraction (75%)
 *   - 'disaster' → penalty fraction (10%)
 *
 * @param {object} formState
 * @param {number} formState.successRanks  Net success ranks (≥ 0).
 * @param {boolean} formState.isDisaster   Whether the roll produced a Disaster.
 * @returns {'failure'|'success'|'triumph'|'disaster'}
 */
export function mapOutcomeToSale({ successRanks, isDisaster }) {
  if (isDisaster) return 'disaster'
  if (successRanks >= TRIUMPH_THRESHOLD) return 'triumph'
  if (successRanks > 0) return 'success'
  return 'failure'
}

/* -------------------------------------------- */

/**
 * Derive `successRanks` and `isDisaster` from a completed StandardCheck roll result.
 *
 * - successRanks: the positive margin above dc (total - dc), clamped to 0 minimum.
 * - isDisaster:   true when the roll is a critical failure (total strictly below dc - threshold).
 *
 * @param {StandardCheck} roll   An evaluated StandardCheck instance.
 * @returns {{ successRanks: number, isDisaster: boolean }}
 */
export function deriveNegotiationRollState(roll) {
  const margin = roll.total - roll.data.dc
  const successRanks = Math.max(0, margin)
  const isDisaster = roll.isCriticalFailure === true
  return { successRanks, isDisaster }
}

/* -------------------------------------------- */

/**
 * Dialog allowing the buyer to attempt a price negotiation before confirming purchase,
 * or the seller to negotiate a better resale price.
 *
 * The negotiation outcome is now derived from a real StandardCheck roll.
 * Manual successRanks/isDisaster inputs have been removed. The user must roll
 * the check before confirming, and cannot manually override the result.
 *
 * When `forSale` is true, the dialog uses `computeResalePrice` with a mapped outcome
 * instead of `computeNegotiatedPrice`, and adjusts labels/title accordingly.
 *
 * Usage — buy mode:
 * ```js
 * const result = await NegotiationDialog.prompt({ entry, buyer })
 * if (result?.confirmed) { // use result.finalPrice }
 * ```
 *
 * Usage — sale mode:
 * ```js
 * const result = await NegotiationDialog.prompt({ entry, buyer: seller, forSale: true })
 * ```
 */
export default class NegotiationDialog extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    id: 'market-negotiation',
    classes: ['swerpg', 'application', 'market-negotiation-dialog'],
    tag: 'div',
    window: {
      title: 'MARKET.Negotiation.Dialog.Title', // default; overridden by #forSale title getter
      minimizable: false,
      resizable: false,
    },
    position: {
      width: 420,
    },
    actions: {
      rollNegotiation: NegotiationDialog.#onRollNegotiation,
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
   * Whether this dialog is in sale mode (seller negotiates a better resale price).
   * @type {boolean}
   */
  #forSale = false

  /**
   * Current skill selection.
   * @type {{ skillKey: string }}
   */
  #formState = { skillKey: NEGOTIATION_SKILLS[0] }

  /**
   * Derived roll state, set after the StandardCheck is completed.
   * Null means no roll has been performed yet.
   * @type {{ successRanks: number, isDisaster: boolean }|null}
   */
  #rollState = null

  /**
   * Resolve callback — called when the dialog closes with a result.
   * @type {((result: NegotiationDialogResult|null) => void)|null}
   */
  #resolve = null

  /* -------------------------------------------- */

  /** @override */
  get title() {
    if (this.#forSale) {
      return game.i18n.localize('MARKET.Negotiation.Dialog.TitleSell')
    }
    return super.title
  }

  /* -------------------------------------------- */

  /**
   * Open a negotiation dialog for the given entry and buyer/seller, returning a promise
   * that resolves to the NegotiationDialogResult when the dialog closes.
   *
   * @param {object} params
   * @param {import('../../lib/market/market-entry.mjs').MarketEntry} params.entry    The market entry.
   * @param {object|null} params.buyer     The buyer (or seller) actor.
   * @param {boolean}  [params.forSale=false]  Whether this is a sale negotiation.
   * @returns {Promise<NegotiationDialogResult|null>}
   */
  static async prompt({ entry, buyer, forSale = false }) {
    return new Promise((resolve) => {
      const dialog = new NegotiationDialog()
      dialog.#entry = entry
      dialog.#buyer = buyer
      dialog.#forSale = forSale
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

    const hasRolled = this.#rollState !== null
    let negotiationResult = null

    if (hasRolled) {
      if (this.#forSale) {
        const outcome = mapOutcomeToSale(this.#rollState)
        const saleResult = computeResalePrice({
          basePrice: originalPrice,
          negotiationOutcome: outcome,
        })
        negotiationResult = {
          outcome: saleResult.outcome,
          finalPrice: saleResult.resalePrice,
          originalPrice: saleResult.basePrice,
          successRanks: this.#rollState.successRanks,
        }
      } else {
        negotiationResult = computeNegotiatedPrice({
          originalPrice,
          successRanks: this.#rollState.successRanks,
          isDisaster: this.#rollState.isDisaster,
        })
      }
    }

    context.entry = { name: entry?.name ?? '', rarity, originalPrice }
    context.difficulty = difficulty
    context.skillOptions = NEGOTIATION_SKILLS.map((key) => ({
      value: key,
      label: `MARKET.Negotiation.Skill.${key.charAt(0).toUpperCase()}${key.slice(1)}`,
      selected: key === this.#formState.skillKey,
    }))
    context.formState = { ...this.#formState }
    context.hasRolled = hasRolled
    context.negotiationResult = negotiationResult
    context.forSale = this.#forSale

    return context
  }

  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options)
    const html = this.element
    if (!html) return

    // Skill selector — only active before rolling
    const skillSelect = html.querySelector('.negotiation-skill-select')
    if (skillSelect) {
      skillSelect.addEventListener('change', (event) => {
        this.#formState = { ...this.#formState, skillKey: event.currentTarget.value }
        this.render()
      })
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle the Roll Negotiation action: build the StandardCheck pool and open the roll dialog.
   * Derives successRanks and isDisaster from the roll result, then re-renders.
   * @this {NegotiationDialog}
   * @param {PointerEvent} _event
   * @param {HTMLElement}  _target
   */
  static async #onRollNegotiation(_event, _target) {
    const actor = this.#buyer
    const skillKey = this.#formState.skillKey
    const skill = SYSTEM.SKILLS[skillKey]

    if (!skill) {
      logger.error(`[Market] NegotiationDialog: skill "${skillKey}" not found in SYSTEM.SKILLS`)
      return
    }

    const entry = this.#entry
    const rarity = entry?.rarity ?? 0
    const difficulty = rarityToDifficulty(rarity)
    const dc = DIFFICULTY_TO_DC[difficulty] ?? 14

    const skillRank = actor?.system?.skills?.[skillKey]?.rank?.value ?? 0
    const characteristicKey = skill.characteristic?.key ?? skill.characteristic
    const characteristicValue = actor?.system?.characteristics?.[characteristicKey]?.rank?.value ?? 0

    const roll = new StandardCheck({
      actorId: actor?.id ?? null,
      skill: skillRank,
      ability: characteristicValue,
      dc,
      type: skillKey,
    })

    logger.debug('[Market] Negotiation roll initiated', {
      skillKey,
      skillRank,
      characteristicValue,
      dc,
      actorId: actor?.id,
    })

    const result = await roll.dialog({
      title: game.i18n.format('MARKET.Negotiation.RollTitle', { skill: skill.name }),
      flavor: game.i18n.localize('MARKET.Negotiation.RollFlavor'),
    })

    if (result === null) {
      // User cancelled the roll dialog — stay open without a result
      logger.debug('[Market] Negotiation roll cancelled by user')
      return
    }

    this.#rollState = deriveNegotiationRollState(result)

    logger.debug('[Market] Negotiation roll completed', {
      total: result.total,
      dc,
      successRanks: this.#rollState.successRanks,
      isDisaster: this.#rollState.isDisaster,
    })

    this.render()
  }

  /* -------------------------------------------- */

  /**
   * Confirm the negotiated price and close the dialog.
   * Only callable after a roll has been performed.
   * @this {NegotiationDialog}
   * @param {PointerEvent} _event
   * @param {HTMLElement} _target
   */
  static async #onConfirmNegotiation(_event, _target) {
    if (!this.#rollState) {
      logger.warn('[Market] NegotiationDialog: confirm called without a roll result — ignored')
      return
    }

    const originalPrice = this.#entry?.priceResult?.finalPrice ?? 0

    let negotiationResult
    if (this.#forSale) {
      const outcome = mapOutcomeToSale(this.#rollState)
      const saleResult = computeResalePrice({
        basePrice: originalPrice,
        negotiationOutcome: outcome,
      })
      negotiationResult = {
        outcome: saleResult.outcome,
        finalPrice: saleResult.resalePrice,
        originalPrice: saleResult.basePrice,
        successRanks: this.#rollState.successRanks,
      }
    } else {
      negotiationResult = computeNegotiatedPrice({
        originalPrice,
        successRanks: this.#rollState.successRanks,
        isDisaster: this.#rollState.isDisaster,
      })
    }

    logger.debug('[Market] Negotiation confirmed', {
      skill: this.#formState.skillKey,
      successRanks: this.#rollState.successRanks,
      isDisaster: this.#rollState.isDisaster,
      outcome: negotiationResult.outcome,
      originalPrice,
      finalPrice: negotiationResult.finalPrice,
      forSale: this.#forSale,
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
