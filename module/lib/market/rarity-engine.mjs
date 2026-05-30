/**
 * Pure domain engine for market item obtainability based on rarity.
 *
 * Enriches the rarity concept with:
 *   - `obtainmentProbability`: chance (0-100) of immediate item availability.
 *   - `supplyDelayDays`: delay in days if the item is not immediately available.
 *   - `narrativeReasonKey`: i18n key explaining the delay narrative.
 *
 * The black-market type applies additional penalties to probability and adds extra delay.
 *
 * No Foundry dependencies — accepts plain objects only.
 */

/* -------------------------------------------- */
/*  Constants                                   */
/* -------------------------------------------- */

/**
 * Rarity bands defining obtainment probability and supply delay.
 * Bands are evaluated top-to-bottom; the first match wins.
 * @type {ReadonlyArray<{minRarity: number, maxRarity: number, probability: number, delayDays: number, reasonKey: string}>}
 */
export const RARITY_OBTAINABILITY_BANDS = Object.freeze([
  {
    minRarity: 0,
    maxRarity: 3,
    probability: 100,
    delayDays: 0,
    reasonKey: 'MARKET.Rarity.Reason.ReadilyAvailable',
  },
  {
    minRarity: 4,
    maxRarity: 5,
    probability: 80,
    delayDays: 1,
    reasonKey: 'MARKET.Rarity.Reason.LimitedStock',
  },
  {
    minRarity: 6,
    maxRarity: 7,
    probability: 60,
    delayDays: 2,
    reasonKey: 'MARKET.Rarity.Reason.ResupplyPending',
  },
  {
    minRarity: 8,
    maxRarity: 9,
    probability: 40,
    delayDays: 5,
    reasonKey: 'MARKET.Rarity.Reason.HardToFind',
  },
  {
    minRarity: 10,
    maxRarity: 10,
    probability: 20,
    delayDays: 7,
    reasonKey: 'MARKET.Rarity.Reason.ExtremelyRare',
  },
])

/**
 * Additional probability penalty applied for black-market items, as absolute percentage points.
 * @type {number}
 */
export const BLACK_MARKET_PROBABILITY_PENALTY = 20

/**
 * Additional delay days added for black-market items.
 * @type {number}
 */
export const BLACK_MARKET_EXTRA_DELAY_DAYS = 2

/**
 * Market type key for black-market (matches MARKET_TYPES key in market.mjs).
 * @type {string}
 */
export const BLACK_MARKET_TYPE_KEY = 'black-market'

/* -------------------------------------------- */
/*  Typedefs                                    */
/* -------------------------------------------- */

/**
 * @typedef {Object} ObtainabilityResult
 * @property {boolean} immediate         Whether the item is available immediately.
 * @property {number}  probability       Probability of immediate availability (0-100).
 * @property {number}  delayInDays       Number of days to wait if not immediately available (0 if immediate).
 * @property {string}  narrativeReasonKey  i18n key explaining the availability situation.
 */

/* -------------------------------------------- */
/*  Public API                                  */
/* -------------------------------------------- */

/**
 * Evaluate the obtainability of a market item based on its rarity and market type.
 *
 * A deterministic result is returned based on rarity bands. The `immediate` field
 * reflects whether the base probability reaches 100% (rarity 0–3) or is reduced
 * by the black-market penalty.
 *
 * Callers that need to resolve probabilistic availability (e.g. by rolling dice)
 * must use the returned `probability` field to make that decision. This function
 * only returns the probability, not a random draw.
 *
 * No Foundry dependencies — all inputs are plain values.
 *
 * @param {object} params
 * @param {number} params.rarity       Item rarity (0–10, clamped).
 * @param {string} [params.marketType] Active market type key. Default: 'standard'.
 * @returns {ObtainabilityResult}
 */
export function evaluateObtainability({ rarity, marketType = 'standard' }) {
  const clampedRarity = Math.max(0, Math.min(10, rarity ?? 0))

  let band = RARITY_OBTAINABILITY_BANDS[RARITY_OBTAINABILITY_BANDS.length - 1]
  for (const b of RARITY_OBTAINABILITY_BANDS) {
    if (clampedRarity >= b.minRarity && clampedRarity <= b.maxRarity) {
      band = b
      break
    }
  }

  const isBlackMarket = marketType === BLACK_MARKET_TYPE_KEY
  const probability = Math.max(0, band.probability - (isBlackMarket ? BLACK_MARKET_PROBABILITY_PENALTY : 0))
  const delayInDays = band.delayDays + (isBlackMarket ? BLACK_MARKET_EXTRA_DELAY_DAYS : 0)
  const immediate = probability >= 100

  return {
    immediate,
    probability,
    delayInDays,
    narrativeReasonKey: band.reasonKey,
  }
}
