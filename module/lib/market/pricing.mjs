import { AVAILABILITY_STATUS } from '../../config/market.mjs'

/**
 * @typedef {Object} PriceContext
 * @property {number}  basePrice             Original item price (>= 0)
 * @property {number}  rarity                Rarity score 0–10
 * @property {string}  availability          Key of AVAILABILITY_STATUS
 * @property {number}  [gmModifier]          Manual MJ percentage override (-100 to +100)
 * @property {string}  [marketType]          Market type key (one of MARKET_TYPES keys)
 * @property {number}  [marketTypeModifier]  Pre-resolved market type fractional modifier from MARKET_TYPES registry
 */

/**
 * @typedef {Object} PriceBreakdownStep
 * @property {string} label      Human-readable step label (machine-key, not localized)
 * @property {number} modifier   Fractional modifier applied at this step
 */

/**
 * @typedef {Object} PriceResult
 * @property {number}               finalPrice  Computed final price (integer >= 0)
 * @property {number}               basePrice   Original base price
 * @property {PriceBreakdownStep[]} breakdown   Ordered list of modifier steps for traceability
 */

/* -------------------------------------------- */

/**
 * Compute the final Market price for an item given a price context.
 *
 * Formula:
 *   finalPrice = floor(basePrice * (1 + availabilityModifier + rarityModifier + gmModifier/100 + marketTypeModifier))
 *
 * Where:
 *   - availabilityModifier = AVAILABILITY_STATUS[availability].priceModifier (or 0 if null/unknown)
 *   - rarityModifier       = rarity * 0.1  (10% per rarity point)
 *   - gmModifier           = gmModifier / 100 (percent → fraction)
 *   - marketTypeModifier   = pre-resolved modifier from MARKET_TYPES registry (or 0)
 *
 * Price floor: 0 (never negative).
 * Result is always an integer (Math.floor applied).
 *
 * No Foundry dependencies — accepts plain objects only.
 *
 * @param {PriceContext} context
 * @returns {PriceResult}
 * @throws {TypeError} If basePrice is not a finite non-negative number
 * @throws {TypeError} If rarity is not a finite number
 */
export function computeMarketPrice(context) {
  const { basePrice, rarity, availability, gmModifier = 0, marketTypeModifier = 0 } = context

  if (!Number.isFinite(basePrice) || basePrice < 0) {
    throw new TypeError(`computeMarketPrice: basePrice must be a finite non-negative number, got ${basePrice}`)
  }

  if (!Number.isFinite(rarity)) {
    throw new TypeError(`computeMarketPrice: rarity must be a finite number, got ${rarity}`)
  }

  const breakdown = []

  // Availability modifier
  const availabilityDef = AVAILABILITY_STATUS[availability]
  const availabilityModifier = availabilityDef?.priceModifier ?? 0
  if (availabilityModifier !== 0) {
    breakdown.push({ label: 'availability', modifier: availabilityModifier })
  }

  // Rarity modifier: 10% per rarity point
  const rarityModifier = rarity * 0.1
  if (rarityModifier !== 0) {
    breakdown.push({ label: 'rarity', modifier: rarityModifier })
  }

  // GM modifier: percent → fraction
  const gmFraction = gmModifier / 100
  if (gmFraction !== 0) {
    breakdown.push({ label: 'gmModifier', modifier: gmFraction })
  }

  // Market type modifier: pre-resolved fractional value from MARKET_TYPES registry
  if (marketTypeModifier !== 0) {
    breakdown.push({ label: 'marketType', modifier: marketTypeModifier })
  }

  const totalModifier = availabilityModifier + rarityModifier + gmFraction + marketTypeModifier
  const rawPrice = basePrice * (1 + totalModifier)
  const finalPrice = Math.max(0, Math.floor(rawPrice))

  return {
    finalPrice,
    basePrice,
    breakdown,
  }
}
