import { DEFAULT_MARKET_CONTEXT, DEFAULT_AVAILABILITY, MARKET_TYPES } from '../../config/market.mjs'
import { computeMarketPrice } from './pricing.mjs'

/**
 * @typedef {Object} ItemData
 * @property {number}  basePrice    Original item price from the data model (>= 0)
 * @property {number}  rarity       Item rarity score (0–10)
 * @property {string}  [itemType]   Item type key (e.g. 'weapon', 'armor', 'gear') — used for type modifiers
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

/**
 * @typedef {Object} PriceEngineOptions
 * @property {Record<string, { priceModifier: number }>} [typeModifiers]    Per-type price modifiers from GM config
 * @property {number}                                    [globalModifier]   Global GM price modifier (%)
 */

/* -------------------------------------------- */

/**
 * Calculate the final Market price for an item given its data and a market context.
 *
 * This is the canonical API for all Market price computation. It delegates to
 * `computeMarketPrice` from `pricing.mjs` and re-maps the result to the
 * canonical `PriceResult` shape (`modifiers` instead of `breakdown`).
 *
 * Availability resolution:
 *   `itemData.availability` is the only valid source of the availability key.
 *   It must be derived canonically by the caller via `deriveAvailability()` from
 *   `market-entry.mjs` before invoking this function. When `itemData.availability`
 *   is absent, the engine falls back to `DEFAULT_AVAILABILITY` ('available') internally.
 *   Injecting `availability` through `marketContext` is not supported and will be ignored.
 *
 * Type modifier resolution:
 *   When `options.typeModifiers` is provided and contains the item's type key,
 *   that fractional modifier is added to the computation and appears in the
 *   `modifiers` array with label `'typeModifier'`.
 *
 * Global modifier resolution:
 *   When `options.globalModifier` is non-zero, it is treated as an additional
 *   GM percentage modifier and stacked on top of `marketContext.manualModifier`.
 *
 * No Foundry dependencies — accepts plain objects only.
 *
 * @param {ItemData}      itemData       Normalised item data (plain object)
 * @param {Partial<MarketContext>} [marketContext]  Optional market context; merged with defaults
 * @param {PriceEngineOptions} [options]  Optional extra modifiers from GM advanced config
 * @returns {PriceResult}
 * @throws {TypeError} If basePrice is not a finite non-negative number
 * @throws {TypeError} If rarity is not a finite number
 */
export function calculateItemPrice(itemData, marketContext = {}, options = {}) {
  const ctx = { ...DEFAULT_MARKET_CONTEXT, ...marketContext }

  // Availability must come from itemData (derived by the caller via deriveAvailability()).
  // Context-level availability is not supported — DEFAULT_AVAILABILITY is the neutral fallback.
  const availability = itemData.availability ?? DEFAULT_AVAILABILITY

  // Resolve market-type price modifier from the registry
  const marketTypeDef = MARKET_TYPES[ctx.marketType]
  const marketTypeModifier = marketTypeDef?.priceModifier ?? 0

  // Per-type price modifier from advanced GM config
  const typeModifierDef = options.typeModifiers?.[itemData.itemType]
  const typeModifier = typeof typeModifierDef?.priceModifier === 'number' ? typeModifierDef.priceModifier : 0

  // Global modifier stacks on top of manualModifier
  const globalModifier = typeof options.globalModifier === 'number' && Number.isFinite(options.globalModifier) ? options.globalModifier : 0

  const pricingContext = {
    basePrice: itemData.basePrice,
    rarity: itemData.rarity,
    availability,
    gmModifier: (ctx.manualModifier ?? 0) + globalModifier,
    marketType: ctx.marketType,
    marketTypeModifier: marketTypeModifier + typeModifier,
  }

  const { finalPrice, basePrice, breakdown } = computeMarketPrice(pricingContext)

  return {
    basePrice,
    finalPrice,
    modifiers: breakdown,
  }
}
