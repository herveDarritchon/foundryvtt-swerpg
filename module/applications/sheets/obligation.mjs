import SwerpgBaseItemSheet from './base-item.mjs'
import { logger } from '../../utils/logger.mjs'
import ObligationBonusCalculator from '../../lib/obligations/obligation-bonus-calculator.mjs'

/**
 * A SwerpgBaseItemSheet subclass used to configure Items of the "obligation" type.
 *
 * The sheet acts as an expert fallback: narrative editing is always simple and primary.
 * When isExtra is true, the sheet resolves the obligation's bonus state so the template
 * can prioritise official options and clearly signal legacy (non-official) combinations.
 *
 * @extends SwerpgBaseItemSheet
 */
export default class ObligationSheet extends SwerpgBaseItemSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    position: {
      width: 600,
      height: 'auto',
    },
    window: {
      minimizable: true,
      resizable: true,
    },
    item: {
      type: 'obligation',
    },
    actions: {},
  }

  // Initialize subclass options
  static {
    this._initializeItemSheetClass()
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)

    context.obligationBonus = this.#prepareObligationBonusContext(context.system)

    logger.debug(`[${this.constructor.name}] Context prepared:`, context)

    return context
  }

  /* -------------------------------------------- */

  /**
   * Prepare the obligation bonus context used by the config template to determine
   * which rendering mode to apply.
   *
   * Returns a plain object with three exclusive boolean flags and the matched
   * official option when applicable.
   *
   * @param {object} system The obligation system data (plain or Foundry model).
   * @returns {{isNarrative: boolean, isOfficialBonus: boolean, isLegacyBonus: boolean, officialOption: import('../../lib/obligations/obligation-bonus-calculator.mjs').ObligationCreationOption|null}}
   */
  #prepareObligationBonusContext(system) {
    const input = {
      isExtra: system.isExtra ?? false,
      extraXp: system.extraXp ?? 0,
      extraCredits: system.extraCredits ?? 0,
    }

    const { state, officialOption } = ObligationBonusCalculator.resolveObligationState(input)

    return {
      isNarrative: state === 'narrative',
      isOfficialBonus: state === 'official',
      isLegacyBonus: state === 'legacy',
      officialOption,
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _processFormData(event, form, formData) {
    const submitData = super._processFormData(event, form, formData)
    return submitData
  }
}
