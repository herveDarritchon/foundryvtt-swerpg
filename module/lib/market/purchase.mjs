/**
 * Pure domain helper for validating and describing a Market purchase.
 *
 * No Foundry dependencies — accepts plain objects and returns plain values.
 * All mutations (credit deduction, item creation) are the responsibility
 * of the Foundry adapter layer.
 */

/**
 * @typedef {Object} PurchaseInput
 * @property {{ id: string, name: string, system: { credits: number } }} actor  Plain actor-like object with credit balance.
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
 * Validate whether an actor can purchase a market entry at the given price.
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

  const credits = actor?.system?.credits ?? 0
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
