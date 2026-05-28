import { STARTING_CREDITS } from '../../config/progression.mjs'

/**
 * @typedef {Object} ObligationBonusInput
 * Plain-object representation of an obligation item used for bonus calculations.
 * No Foundry dependency — callers must map Item documents to this shape before calling.
 *
 * @property {boolean} isExtra     - Whether the obligation provides extra starting resources.
 * @property {number}  extraCredits - Extra credits granted when isExtra is true.
 * @property {number}  extraXp      - Extra XP granted when isExtra is true.
 */

/**
 * Pure domain calculator for obligation-sourced starting bonuses.
 *
 * Inputs are plain objects ({ isExtra, extraCredits, extraXp }), never Foundry Items.
 * Outputs are numbers.
 *
 * Business rules (Star Wars FFG / Edge Studio):
 * - A character starts with STARTING_CREDITS (500) credits.
 * - Taking +5 Obligation grants +1 000 extra starting credits (extraCredits = 1000, isExtra = true).
 * - Taking +10 Obligation grants +2 500 extra starting credits (extraCredits = 2500, isExtra = true).
 * - Same mechanic applies to XP via extraXp.
 */
export default class ObligationBonusCalculator {
  /**
   * Sum the extra credits granted by obligations marked as "extra".
   *
   * @param {ObligationBonusInput[]} obligations Array of plain obligation objects.
   * @returns {number} Total bonus credits. Returns 0 for an empty or all-non-extra array.
   */
  static computeObligationBonusCredits(obligations) {
    return obligations.filter((o) => o.isExtra === true).reduce((total, o) => total + (o.extraCredits || 0), 0)
  }

  /**
   * Sum the extra XP granted by obligations marked as "extra".
   *
   * @param {ObligationBonusInput[]} obligations Array of plain obligation objects.
   * @returns {number} Total bonus XP. Returns 0 for an empty or all-non-extra array.
   */
  static computeObligationBonusXp(obligations) {
    return obligations.filter((o) => o.isExtra === true).reduce((total, o) => total + (o.extraXp || 0), 0)
  }

  /**
   * The base starting credits constant, exposed for callers that need it without
   * importing progression.mjs directly.
   * @type {number}
   */
  static get STARTING_CREDITS() {
    return STARTING_CREDITS
  }
}
