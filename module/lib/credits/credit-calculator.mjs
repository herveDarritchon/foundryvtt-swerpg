/**
 * Pure domain calculator for the character credit budget.
 *
 * No Foundry dependencies — accepts plain objects and returns plain values.
 * All mutations (credit deduction, item creation) are the responsibility
 * of the Foundry adapter layer.
 */

/**
 * @typedef {Object} CreditBudgetInput
 * @property {number} startingCredits         Base starting credits (e.g. 500)
 * @property {number} obligationBonusCredits  Extra credits from obligation items marked as "extra"
 * @property {number} manualAdjustment        GM or player manual adjustments (can be negative)
 * @property {Array<{ price: number, quantity: number }>} ownedItems  Owned physical items
 */

/**
 * @typedef {Object} CreditBudgetResult
 * @property {number}  startingCredits    Base pool
 * @property {number}  obligationBonus    Obligation bonus applied
 * @property {number}  manualAdjustment   Manual adjustments (positive = bonus, negative = debt)
 * @property {number}  totalBudget        startingCredits + obligationBonus + manualAdjustment
 * @property {number}  totalSpent         Sum of (price × quantity) for all owned items
 * @property {number}  availableCredits   totalBudget − totalSpent (can be negative = debt)
 * @property {boolean} isOverBudget       availableCredits < 0
 */

/**
 * Compute the full credit budget for a character.
 *
 * Calculation rules:
 * - `totalSpent`       = sum of (item.price × item.quantity) across all owned physical items
 * - `totalBudget`      = startingCredits + obligationBonusCredits + manualAdjustment
 * - `availableCredits` = totalBudget − totalSpent  (may be negative)
 * - `isOverBudget`     = availableCredits < 0
 *
 * Does not mutate the input object.
 *
 * @param {CreditBudgetInput} input
 * @returns {CreditBudgetResult}
 */
export function computeCreditBudget({ startingCredits = 0, obligationBonusCredits = 0, manualAdjustment = 0, ownedItems = [] } = {}) {
  const totalSpent = ownedItems.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1), 0)
  const totalBudget = startingCredits + obligationBonusCredits + manualAdjustment
  const availableCredits = totalBudget - totalSpent

  return {
    startingCredits,
    obligationBonus: obligationBonusCredits,
    manualAdjustment,
    totalBudget,
    totalSpent,
    availableCredits,
    isOverBudget: availableCredits < 0,
  }
}
