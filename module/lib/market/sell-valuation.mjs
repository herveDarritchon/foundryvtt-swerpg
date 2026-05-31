/**
 * Pure domain module for computing the resale price of an item sold via the Market.
 *
 * No Foundry dependencies — accepts plain values and returns plain values.
 * All mutations (credit update, item deletion) are the responsibility
 * of the Foundry adapter layer.
 */

/* -------------------------------------------- */
/*  Constants                                   */
/* -------------------------------------------- */

/**
 * Base resale fraction (no negotiation or failed negotiation): 25% of base price.
 * @type {number}
 */
export const SELL_BASE_FRACTION = 0.25

/**
 * Resale fraction after a successful negotiation: 50% of base price.
 * @type {number}
 */
export const SELL_NEGOTIATED_FRACTION = 0.5

/**
 * Maximum resale fraction after a triumph (exceptional success): 75% of base price.
 * @type {number}
 */
export const SELL_MAX_FRACTION = 0.75

/**
 * Penalty resale fraction after a disaster: 10% of base price.
 * @type {number}
 */
export const SELL_DISASTER_FRACTION = 0.1

/* -------------------------------------------- */
/*  Types                                       */
/* -------------------------------------------- */

/**
 * @typedef {'failure'|'success'|'triumph'|'disaster'} NegotiationOutcome
 */

/**
 * @typedef {Object} ResalePriceResult
 * @property {number}             resalePrice       Floored resale price in credits.
 * @property {number}             fraction          Fraction of base price applied (0–1).
 * @property {number}             basePrice         The original base price passed in.
 * @property {NegotiationOutcome} outcome           The negotiation outcome applied.
 */

/* -------------------------------------------- */
/*  Pure function                               */
/* -------------------------------------------- */

/**
 * Compute the resale price for an item based on its base price and the negotiation outcome.
 *
 * Fraction table:
 * - `'failure'`  → 25% (base, no negotiation or failed attempt)
 * - `'success'`  → 50%
 * - `'triumph'`  → 75%
 * - `'disaster'` → 10%
 *
 * The result is always floored to the nearest integer.
 *
 * @param {object}             params
 * @param {number}             params.basePrice          Non-negative base price of the item.
 * @param {NegotiationOutcome} [params.negotiationOutcome='failure']  Outcome of the negotiation roll.
 * @returns {ResalePriceResult}
 * @throws {TypeError} When basePrice is not a non-negative finite number.
 */
export function computeResalePrice({ basePrice, negotiationOutcome = 'failure' } = {}) {
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    throw new TypeError(`basePrice must be a non-negative finite number, got ${basePrice}`)
  }

  let fraction = SELL_BASE_FRACTION

  if (negotiationOutcome === 'triumph') {
    fraction = SELL_MAX_FRACTION
  } else if (negotiationOutcome === 'success') {
    fraction = SELL_NEGOTIATED_FRACTION
  } else if (negotiationOutcome === 'disaster') {
    fraction = SELL_DISASTER_FRACTION
  }

  const resalePrice = Math.floor(basePrice * fraction)

  return {
    resalePrice,
    fraction,
    basePrice,
    outcome: negotiationOutcome,
  }
}
