/**
 * Pure domain logic for market price negotiation.
 *
 * Negotiation allows a character to attempt to lower the price of an item
 * using a skill check (Negotiation, Persuasion, or Deception).
 *
 * Formula:
 *   - Difficulty: derived from item rarity (0-10) mapped to 0-5 FFG difficulty dice.
 *   - Discount:   successRanks * NEGOTIATION_DISCOUNT_PER_SUCCESS (5%), capped at NEGOTIATION_MAX_DISCOUNT (30%).
 *   - Disaster:   price increases by NEGOTIATION_DISASTER_PENALTY (10%).
 *
 * No Foundry dependencies — accepts plain objects only.
 */

/* -------------------------------------------- */
/*  Constants                                   */
/* -------------------------------------------- */

/**
 * Discount applied per net success rank, as a fraction (0.05 = 5%).
 * @type {number}
 */
export const NEGOTIATION_DISCOUNT_PER_SUCCESS = 0.05

/**
 * Maximum negotiation discount achievable, as a fraction (0.30 = 30%).
 * @type {number}
 */
export const NEGOTIATION_MAX_DISCOUNT = 0.3

/**
 * Price increase applied when the negotiation roll produces a Disaster, as a fraction (0.10 = 10%).
 * @type {number}
 */
export const NEGOTIATION_DISASTER_PENALTY = 0.1

/**
 * Mapping from rarity band to FFG difficulty level (0–5).
 * Rarity 0-2 → difficulty 1, up to rarity 9-10 → difficulty 5.
 * @type {ReadonlyArray<{minRarity: number, maxRarity: number, difficulty: number}>}
 */
export const NEGOTIATION_RARITY_TO_DIFFICULTY = Object.freeze([
  { minRarity: 0, maxRarity: 2, difficulty: 1 },
  { minRarity: 3, maxRarity: 4, difficulty: 2 },
  { minRarity: 5, maxRarity: 6, difficulty: 3 },
  { minRarity: 7, maxRarity: 8, difficulty: 4 },
  { minRarity: 9, maxRarity: 10, difficulty: 5 },
])

/**
 * Canonical skill keys that may be used for negotiation.
 * @type {ReadonlyArray<string>}
 */
export const NEGOTIATION_SKILLS = Object.freeze(['negotiation', 'persuasion', 'deception'])

/* -------------------------------------------- */
/*  Typedefs                                    */
/* -------------------------------------------- */

/**
 * @typedef {'success'|'failure'|'disaster'} NegotiationOutcome
 *   - 'success'  : at least one net success rank — discount applied.
 *   - 'failure'  : zero net success ranks — price unchanged.
 *   - 'disaster' : the roll produced a Disaster — price increases.
 */

/**
 * @typedef {Object} NegotiationResult
 * @property {NegotiationOutcome} outcome         The negotiation outcome.
 * @property {number}             discountFraction The fractional price change (negative = discount, positive = penalty).
 * @property {number}             finalPrice       The adjusted price (>= 0, integer).
 * @property {number}             originalPrice    The price before negotiation.
 * @property {number}             successRanks     Net success ranks used to compute the discount.
 */

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

/**
 * Derive the FFG difficulty level from an item's rarity score.
 *
 * @param {number} rarity  Item rarity (0–10, clamped).
 * @returns {number} Difficulty level (1–5).
 */
export function rarityToDifficulty(rarity) {
  const clamped = Math.max(0, Math.min(10, rarity))
  for (const band of NEGOTIATION_RARITY_TO_DIFFICULTY) {
    if (clamped >= band.minRarity && clamped <= band.maxRarity) {
      return band.difficulty
    }
  }
  // Fallback: maximum difficulty for out-of-range input
  return 5
}

/* -------------------------------------------- */
/*  Public API                                  */
/* -------------------------------------------- */

/**
 * Compute the negotiated price from a negotiation skill roll result.
 *
 * Rules (evaluated in order):
 * 1. If `isDisaster` is true → price increases by NEGOTIATION_DISASTER_PENALTY (outcome: 'disaster').
 * 2. If `successRanks` <= 0 → price unchanged (outcome: 'failure').
 * 3. Otherwise → discount = min(successRanks * NEGOTIATION_DISCOUNT_PER_SUCCESS, NEGOTIATION_MAX_DISCOUNT),
 *    price decreases by that fraction (outcome: 'success').
 *
 * Final price is always a non-negative integer (Math.floor applied).
 *
 * No Foundry dependencies — all inputs are plain values.
 *
 * @param {object} params
 * @param {number}  params.originalPrice   The price before negotiation (>= 0).
 * @param {number}  params.successRanks    Net number of success ranks from the skill roll (>= 0).
 * @param {boolean} params.isDisaster      Whether the roll produced a Disaster result.
 * @returns {NegotiationResult}
 * @throws {TypeError} If originalPrice is not a finite non-negative number.
 * @throws {TypeError} If successRanks is not a finite non-negative integer.
 */
export function computeNegotiatedPrice({ originalPrice, successRanks, isDisaster }) {
  if (!Number.isFinite(originalPrice) || originalPrice < 0) {
    throw new TypeError(`computeNegotiatedPrice: originalPrice must be a finite non-negative number, got ${originalPrice}`)
  }
  if (!Number.isFinite(successRanks) || successRanks < 0) {
    throw new TypeError(`computeNegotiatedPrice: successRanks must be a finite non-negative number, got ${successRanks}`)
  }

  if (isDisaster) {
    const finalPrice = Math.floor(originalPrice * (1 + NEGOTIATION_DISASTER_PENALTY))
    return {
      outcome: 'disaster',
      discountFraction: NEGOTIATION_DISASTER_PENALTY,
      finalPrice,
      originalPrice,
      successRanks: 0,
    }
  }

  if (successRanks <= 0) {
    return {
      outcome: 'failure',
      discountFraction: 0,
      finalPrice: originalPrice,
      originalPrice,
      successRanks: 0,
    }
  }

  const discount = Math.min(successRanks * NEGOTIATION_DISCOUNT_PER_SUCCESS, NEGOTIATION_MAX_DISCOUNT)
  const finalPrice = Math.max(0, Math.floor(originalPrice * (1 - discount)))

  return {
    outcome: 'success',
    discountFraction: -discount,
    finalPrice,
    originalPrice,
    successRanks,
  }
}
