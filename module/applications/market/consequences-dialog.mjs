import { evaluateMarketConsequences } from '../../lib/market/consequences.mjs'
import { logger } from '../../utils/logger.mjs'

const { api } = foundry.applications

/* -------------------------------------------- */

/**
 * @typedef {Object} ConsequencesDialogResult
 * @property {boolean}  confirmed          Whether the GM confirmed proceeding with the purchase.
 * @property {string[]} acceptedTypes      Consequence type keys the GM accepted.
 * @property {string[]} rejectedTypes      Consequence type keys the GM rejected.
 */

/* -------------------------------------------- */

/**
 * Dialog presenting narrative consequences of a purchase to the GM for validation.
 *
 * The GM may accept or reject each player-choice consequence individually.
 * Automatic consequences (e.g. imperial suspicion logging) are shown but not interactive.
 *
 * Usage:
 * ```js
 * const result = await ConsequencesDialog.prompt({ consequences, entry, buyer })
 * if (result?.confirmed) { // apply accepted consequences }
 * ```
 */
export default class ConsequencesDialog extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    id: 'market-consequences',
    classes: ['swerpg', 'application', 'market-consequences-dialog'],
    tag: 'div',
    window: {
      title: 'MARKET.Consequence.Dialog.Title',
      minimizable: false,
      resizable: false,
    },
    position: {
      width: 480,
    },
    actions: {
      confirmConsequences: ConsequencesDialog.#onConfirmConsequences,
      cancelConsequences: ConsequencesDialog.#onCancelConsequences,
    },
  }

  /** @override */
  static PARTS = {
    form: {
      template: 'systems/swerpg/templates/market/consequences-dialog.hbs',
    },
  }

  /* -------------------------------------------- */

  /**
   * The evaluated consequences to display.
   * @type {import('../../lib/market/consequences.mjs').MarketConsequence[]}
   */
  #consequences = []

  /**
   * The market entry being purchased.
   * @type {import('../../lib/market/market-entry.mjs').MarketEntry|null}
   */
  #entry = null

  /**
   * The buyer actor.
   * @type {object|null}
   */
  #buyer = null

  /**
   * Current accepted/rejected state per consequence type.
   * Defaults to accepted for all player-choice consequences.
   * @type {Map<string, boolean>}
   */
  #acceptedMap = new Map()

  /**
   * Resolve callback.
   * @type {((result: ConsequencesDialogResult|null) => void)|null}
   */
  #resolve = null

  /* -------------------------------------------- */

  /**
   * Open a consequences dialog for the given purchase context.
   * Evaluates consequences from the entry and market type, then presents them.
   *
   * Returns null if no consequences need presenting (no player-choice consequences).
   * In that case, automatic consequences are still returned as accepted.
   *
   * @param {object} params
   * @param {import('../../lib/market/market-entry.mjs').MarketEntry} params.entry
   * @param {string} params.marketType  Active market type key.
   * @param {object|null} params.buyer  Buyer actor plain object.
   * @returns {Promise<ConsequencesDialogResult|null>}
   */
  static async prompt({ entry, marketType, buyer }) {
    const consequences = evaluateMarketConsequences({ entry, marketType, actor: buyer })

    if (consequences.length === 0) {
      return { confirmed: true, acceptedTypes: [], rejectedTypes: [] }
    }

    return new Promise((resolve) => {
      const dialog = new ConsequencesDialog()
      dialog.#consequences = consequences
      dialog.#entry = entry
      dialog.#buyer = buyer
      dialog.#resolve = resolve

      // Pre-accept all player-choice consequences by default
      for (const c of consequences) {
        if (c.playerChoice) {
          dialog.#acceptedMap.set(c.type, true)
        }
      }

      dialog.render(true)
    })
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)

    context.entry = { name: this.#entry?.name ?? '' }
    context.buyer = this.#buyer ? { name: this.#buyer.name ?? '' } : null
    context.consequences = this.#consequences.map((c) => ({
      ...c,
      isAccepted: this.#acceptedMap.get(c.type) ?? false,
      isAutomatic: c.automatic,
    }))
    context.hasPlayerChoices = this.#consequences.some((c) => c.playerChoice)

    return context
  }

  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender?.(context, options)
    const html = this.element
    if (!html) return

    // Consequence acceptance toggles (player-choice only)
    html.querySelectorAll('.consequence-accept-check').forEach((checkbox) => {
      checkbox.addEventListener('change', (event) => {
        const type = event.currentTarget.dataset?.consequenceType
        if (type) {
          this.#acceptedMap.set(type, event.currentTarget.checked)
          this.render()
        }
      })
    })
  }

  /* -------------------------------------------- */

  /**
   * GM confirms proceeding with the purchase (possibly with/without some consequences).
   * @param _event
   * @param _target
   * @this {ConsequencesDialog}
   */
  static async #onConfirmConsequences(_event, _target) {
    const acceptedTypes = []
    const rejectedTypes = []

    for (const c of this.#consequences) {
      if (c.automatic) {
        // Automatic consequences are always accepted
        acceptedTypes.push(c.type)
      } else if (c.playerChoice) {
        if (this.#acceptedMap.get(c.type)) {
          acceptedTypes.push(c.type)
        } else {
          rejectedTypes.push(c.type)
        }
      }
    }

    logger.debug('[Market] Consequences confirmed', { acceptedTypes, rejectedTypes })

    this.#resolve?.({ confirmed: true, acceptedTypes, rejectedTypes })
    this.#resolve = null
    await this.close()
  }

  /**
   * GM cancels the purchase entirely.
   * @param _event
   * @param _target
   * @this {ConsequencesDialog}
   */
  static async #onCancelConsequences(_event, _target) {
    logger.debug('[Market] Consequences dialog cancelled — purchase aborted')
    this.#resolve?.(null)
    this.#resolve = null
    await this.close()
  }

  /** @override */
  async close(options) {
    if (this.#resolve) {
      this.#resolve(null)
      this.#resolve = null
    }
    return super.close(options)
  }
}
