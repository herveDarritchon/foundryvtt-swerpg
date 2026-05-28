/**
 * Pure domain helper for validating and describing a Market purchase.
 *
 * No Foundry dependencies — accepts plain objects and returns plain values.
 * All mutations (credit deduction, item creation) are the responsibility
 * of the Foundry adapter layer.
 */

/**
 * @typedef {Object} PurchaseInput
 * @property {{ id: string, name: string, system: { creditBudget?: { availableCredits: number }, credits?: number } }} actor
 *   Plain actor-like object. Credit balance is read from `system.creditBudget.availableCredits` (derived budget)
 *   when available, falling back to `system.credits` for backward compatibility.
 * @property {{ uuid: string, name: string, priceResult: { finalPrice: number } }} entry  Market entry to purchase.
 */

/**
 * @typedef {Object} PurchaseResult
 * @property {boolean}  canPurchase        Whether all pre-conditions are satisfied.
 * @property {string}   reason             Machine-readable reason key (empty string when canPurchase is true).
 * @property {number}   [finalPrice]       The price that will be charged (present when canPurchase is true).
 * @property {number}   [creditsAfter]     Remaining credits after purchase (present when canPurchase is true).
 * @property {string}   [messageKey]       i18n key for the user-facing message (present when canPurchase is false).
 */

/**
 * Resolve the effective credit balance from an actor-like plain object.
 *
 * Reads `system.creditBudget.availableCredits` first (the derived budget set by
 * `SwerpgCharacter._prepareCredits()`). Falls back to `system.credits` when the
 * derived budget is not yet available (e.g. in tests with minimal actor stubs).
 *
 * @param {{ system?: { creditBudget?: { availableCredits?: number }, credits?: number } }} actor
 * @returns {number}
 */
function resolveActorCredits(actor) {
  const budgetCredits = actor?.system?.creditBudget?.availableCredits
  if (typeof budgetCredits === 'number' && Number.isFinite(budgetCredits)) {
    return budgetCredits
  }
  return actor?.system?.credits ?? 0
}

/**
 * Validate whether an actor can purchase a market entry at the given price.
 *
 * Credit balance resolution (in priority order):
 * 1. `actor.system.creditBudget.availableCredits` — derived credit budget (preferred)
 * 2. `actor.system.credits`                        — persisted field (fallback)
 *
 * Rules (in order of evaluation):
 * 1. Actor must be provided.
 * 2. Entry must be provided and have a resolvable UUID.
 * 3. `entry.priceResult.finalPrice` must be a non-negative finite integer — the canonical price; no recalculation allowed.
 * 4. Actor credits must be sufficient.
 *
 * @param {PurchaseInput} input
 * @returns {PurchaseResult}
 */
export function validatePurchase({ actor, entry } = {}) {
  if (!actor || typeof actor !== 'object') {
    return {
      canPurchase: false,
      reason: 'missing-actor',
      messageKey: 'MARKET.Purchase.Error.MissingActor',
    }
  }

  if (!entry || typeof entry !== 'object' || !entry.uuid) {
    return {
      canPurchase: false,
      reason: 'missing-entry',
      messageKey: 'MARKET.Purchase.Error.MissingEntry',
    }
  }

  const finalPrice = entry?.priceResult?.finalPrice
  if (!Number.isFinite(finalPrice) || finalPrice < 0) {
    return {
      canPurchase: false,
      reason: 'invalid-price',
      messageKey: 'MARKET.Purchase.Error.InvalidPrice',
    }
  }

  const credits = resolveActorCredits(actor)
  if (typeof credits !== 'number' || !Number.isFinite(credits) || credits < finalPrice) {
    return {
      canPurchase: false,
      reason: 'insufficient-credits',
      messageKey: 'MARKET.Purchase.Error.InsufficientCredits',
    }
  }

  return {
    canPurchase: true,
    reason: '',
    finalPrice,
    creditsAfter: credits - finalPrice,
  }
}
