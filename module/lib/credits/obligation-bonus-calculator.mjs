/**
 * Pure domain helpers for obligation-sourced starting bonuses.
 *
 * These functions delegate to ObligationBonusCalculator (module/lib/obligations/),
 * which is the canonical implementation. This module re-exports them as named
 * functions to satisfy the flat import shape expected by credit-calculator consumers.
 *
 * No Foundry dependencies — inputs are plain objects, outputs are numbers.
 */
import ObligationBonusCalculator from '../obligations/obligation-bonus-calculator.mjs'

/**
 * @typedef {Object} ObligationBonusInput
 * @property {boolean} isExtra      Whether the obligation provides extra starting resources.
 * @property {number}  extraCredits Extra credits granted when isExtra is true.
 * @property {number}  extraXp      Extra XP granted when isExtra is true.
 */

/**
 * Compute total bonus credits from extra obligations.
 *
 * @param {ObligationBonusInput[]} obligations Array of plain obligation objects.
 * @returns {number} Total bonus credits. Returns 0 for an empty or all-non-extra array.
 */
export function computeObligationBonusCredits(obligations) {
  return ObligationBonusCalculator.computeObligationBonusCredits(obligations)
}

/**
 * Compute total bonus XP from extra obligations.
 *
 * @param {ObligationBonusInput[]} obligations Array of plain obligation objects.
 * @returns {number} Total bonus XP. Returns 0 for an empty or all-non-extra array.
 */
export function computeObligationBonusXp(obligations) {
  return ObligationBonusCalculator.computeObligationBonusXp(obligations)
}
