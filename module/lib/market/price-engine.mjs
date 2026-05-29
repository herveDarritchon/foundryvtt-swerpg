import { DEFAULT_MARKET_CONTEXT, MARKET_TYPES } from '../../config/market.mjs'
import { computeMarketPrice } from './pricing.mjs'

/**
 * @typedef {Object} ItemData
 * @property {number}  basePrice    Original item price from the data model (>= 0)
 * @property {number}  rarity       Item rarity score (0–10)
 * @property {string}  [availability]  Availability key — overrides context if provided
 */

/**
 * @typedef {import('../../config/market.mjs').MarketContext} MarketContext
 */

/**
 * @typedef {Object} PriceModifier
 * @property {string} label    Machine key identifying the modifier source (e.g. 'availability', 'rarity', 'gmModifier')
 * @property {number} modifier Fractional modifier value applied at this step
 */

/**
 * @typedef {Object} PriceResult
 * @property {number}           basePrice   Original base price
 * @property {number}           finalPrice  Computed final price (integer >= 0)
 * @property {PriceModifier[]}  modifiers   Ordered list of modifier steps for traceability
 */

/* -------------------------------------------- */

/**
 * Calculate the final Market price for an item given its data and a market context.
 *
 * This is the canonical API for all Market price computation. It delegates to
 * `computeMarketPrice` from `pricing.mjs` and re-maps the result to the
 * canonical `PriceResult` shape (`modifiers` instead of `breakdown`).
 *
 * Availability resolution order:
 *   1. `itemData.availability` (item-level override)
 *   2. `marketContext.availability` (context-level)
 *   3. `DEFAULT_MARKET_CONTEXT.availability` (fallback)
 *
 * No Foundry dependencies — accepts plain objects only.
 *
 * @param {ItemData}      itemData       Normalised item data (plain object)
 * @param {Partial<MarketContext>} [marketContext]  Optional market context; merged with defaults
 * @returns {PriceResult}
 * @throws {TypeError} If basePrice is not a finite non-negative number
 * @throws {TypeError} If rarity is not a finite number
 */
export function calculateItemPrice(itemData, marketContext = {}) {
  const ctx = { ...DEFAULT_MARKET_CONTEXT, ...marketContext }

  // Item-level availability takes precedence over context
  const availability = itemData.availability ?? ctx.availability

  // Resolve market-type price modifier from the registry
  const marketTypeDef = MARKET_TYPES[ctx.marketType]
  const marketTypeModifier = marketTypeDef?.priceModifier ?? 0

  const pricingContext = {
    basePrice: itemData.basePrice,
    rarity: itemData.rarity,
    availability,
    gmModifier: ctx.manualModifier ?? 0,
    marketType: ctx.marketType,
    marketTypeModifier,
  }

  const { finalPrice, basePrice, breakdown } = computeMarketPrice(pricingContext)

  return {
    basePrice,
    finalPrice,
    modifiers: breakdown,
  }
}
