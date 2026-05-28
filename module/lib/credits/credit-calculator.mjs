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
 * Coerce a value to a safe non-negative finite number.
 *
 * Returns `fallback` when the value is NaN, Infinity, negative, null,
 * undefined, or any non-numeric type. The default fallback is 0.
 *
 * @param {*} value    The raw value to sanitise.
 * @param {number} [fallback=0]  Value returned when input is unsafe.
 * @returns {number} A finite, non-negative number.
 */
export function toSafeNumber(value, fallback = 0) {
  const coerced = Number(value)
  return Number.isFinite(coerced) && coerced >= 0 ? coerced : fallback
}

/**
 * Compute the full credit budget for a character.
 *
 * Calculation rules:
 * - `totalSpent`       = sum of (item.price × item.quantity) across all owned physical items
 * - `totalBudget`      = startingCredits + obligationBonusCredits + manualAdjustment
 * - `availableCredits` = totalBudget − totalSpent  (may be negative)
 * - `isOverBudget`     = availableCredits < 0
 *
 * All numeric inputs are sanitised: NaN, Infinity, negative prices/quantities
 * and null/undefined items are safely coerced so no output field is ever NaN.
 * `manualAdjustment` accepts negative finite values (debt/penalty).
 *
 * Does not mutate the input object.
 *
 * @param {CreditBudgetInput} input
 * @returns {CreditBudgetResult}
 */
export function computeCreditBudget({ startingCredits = 0, obligationBonusCredits = 0, manualAdjustment = 0, ownedItems = [] } = {}) {
  const safeStartingCredits = toSafeNumber(startingCredits)
  const safeObligationBonusCredits = toSafeNumber(obligationBonusCredits)
  // manualAdjustment may be negative (penalty/debt) — only guard against NaN/Infinity
  const safeManualAdjustment = Number.isFinite(Number(manualAdjustment)) ? Number(manualAdjustment) : 0

  const totalSpent = ownedItems.reduce((sum, item) => {
    if (item == null) return sum
    const price = toSafeNumber(item.price)
    const quantity = toSafeNumber(item.quantity, 1)
    return sum + price * quantity
  }, 0)

  const totalBudget = safeStartingCredits + safeObligationBonusCredits + safeManualAdjustment
  const availableCredits = totalBudget - totalSpent

  return {
    startingCredits: safeStartingCredits,
    obligationBonus: safeObligationBonusCredits,
    manualAdjustment: safeManualAdjustment,
    totalBudget,
    totalSpent,
    availableCredits,
    isOverBudget: availableCredits < 0,
  }
}
