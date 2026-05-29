import { PURCHASABLE_ITEM_TYPES, SOURCE_TYPES, DEFAULT_SOURCE_TYPE, DEFAULT_AVAILABILITY, MARKET_TYPES, DEFAULT_MARKET_TYPE } from '../../config/market.mjs'
import { evaluateEligibility } from './eligibility.mjs'
import { calculateItemPrice } from './price-engine.mjs'

/**
 * @typedef {Object} MarketEntry
 * @property {string}      uuid                Foundry UUID or generated unique ID
 * @property {string}      name                Display name (non-empty)
 * @property {string}      img                 Icon path
 * @property {string}      itemType            Canonical item type key (key of PURCHASABLE_ITEM_TYPES)
 * @property {string}      sourceType          Key of SOURCE_TYPES
 * @property {string}      sourceId            Pack/folder/collection identifier
 * @property {number}      basePrice           Original price from item data (>= 0)
 * @property {number}      rarity              Rarity score (0–10)
 * @property {string}      quality             Quality tier key
 * @property {string}      restrictionLevel    Restriction level key
 * @property {string}      availability        Computed availability status key
 * @property {import('./price-engine.mjs').PriceResult} priceResult  Computed price with breakdown
 * @property {boolean}     eligible            Whether this entry passes all eligibility rules
 * @property {string|null} ineligibilityReason Machine-readable reason if not eligible, null otherwise
 */

/**
 * @typedef {Object} RawItem
 * @property {string}      [uuid]
 * @property {string}      [name]
 * @property {string}      [img]
 * @property {string}      [type]
 * @property {number}      [basePrice]
 * @property {number}      [rarity]
 * @property {string}      [quality]
 * @property {string}      [restrictionLevel]
 * @property {string}      [availability]
 * @property {boolean}     [nonPurchasable]
 * @property {boolean}     [broken]
 */

/**
 * @typedef {Object} SourceInfo
 * @property {string}  sourceType  Key of SOURCE_TYPES
 * @property {string}  sourceId    Pack/folder/collection identifier
 */

/* -------------------------------------------- */

/**
 * Create a normalized MarketEntry value object from a raw item and its source info.
 *
 * Invariants guaranteed by this factory:
 * - `name` is always a non-empty string (falls back to 'unknown')
 * - `itemType` must be a key of PURCHASABLE_ITEM_TYPES (throws if not)
 * - `basePrice` is always a finite number >= 0
 * - `eligible` is deterministic for the same inputs
 * - `priceResult` is always present and computed by the canonical price engine
 *
 * No Foundry dependencies — accepts plain objects only.
 *
 * @param {RawItem}    rawItem       The raw item data to normalize
 * @param {SourceInfo} sourceInfo    Source metadata for this item
 * @param {Partial<import('../../config/market.mjs').MarketContext>} [marketContext]  Optional market context for price computation
 * @returns {MarketEntry}
 * @throws {TypeError} If itemType is not a key of PURCHASABLE_ITEM_TYPES
 */
export function createMarketEntry(rawItem, sourceInfo, marketContext = {}) {
  const itemType = rawItem.type ?? rawItem.itemType ?? ''

  if (!(itemType in PURCHASABLE_ITEM_TYPES)) {
    throw new TypeError(
      `createMarketEntry: itemType "${itemType}" is not a valid purchasable item type. ` + `Allowed types: ${Object.keys(PURCHASABLE_ITEM_TYPES).join(', ')}`,
    )
  }

  const sourceType = sourceInfo?.sourceType ?? DEFAULT_SOURCE_TYPE
  const sourceId = sourceInfo?.sourceId ?? ''

  const rawPrice = rawItem.basePrice ?? 0
  const basePrice = Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : 0

  const rarity = Number.isFinite(rawItem.rarity) ? rawItem.rarity : 0
  const name = typeof rawItem.name === 'string' && rawItem.name.trim().length > 0 ? rawItem.name : 'unknown'
  const availability = rawItem.availability ?? DEFAULT_AVAILABILITY

  const eligibilityItem = {
    itemType,
    name,
    basePrice,
    sourceType,
    nonPurchasable: rawItem.nonPurchasable === true,
    broken: rawItem.broken === true,
  }

  const { eligible, reason } = evaluateEligibility(eligibilityItem, {
    purchasableItemTypes: PURCHASABLE_ITEM_TYPES,
    sourceTypes: SOURCE_TYPES,
  })

  const priceResult = calculateItemPrice({ basePrice, rarity, availability }, marketContext)

  return {
    uuid: rawItem.uuid ?? '',
    name,
    img: rawItem.img ?? '',
    itemType,
    sourceType,
    sourceId,
    basePrice,
    rarity,
    quality: rawItem.quality ?? '',
    restrictionLevel: rawItem.restrictionLevel ?? '',
    availability,
    priceResult,
    eligible,
    ineligibilityReason: reason,
  }
}

/* -------------------------------------------- */

/**
 * @typedef {Object} MarketCatalogVisibility
 * @property {boolean}     visible      Whether this entry is visible in the active market
 * @property {boolean}     blocked      Whether this entry is explicitly blocked by market rules
 * @property {string|null} reason       Machine-readable reason for blocking, null if visible
 */

/**
 * Resolve whether a MarketEntry is visible in the given market type.
 *
 * Rules:
 * - If the market type is unknown, the entry is visible (permissive fallback).
 * - If the market's `allowedAvailability` is ['*'], all availability statuses are allowed.
 * - If the entry's `availability` is not in the market's `allowedAvailability`, it is blocked.
 * - A blocked entry returns `{ visible: false, blocked: true, reason: 'availability-not-allowed' }`.
 *
 * This function is a pure domain rule — no Foundry dependencies.
 *
 * @param {import('./market-entry.mjs').MarketEntry} entry        A market entry (plain object)
 * @param {string} [marketTypeKey]                                 Active market type key (key of MARKET_TYPES)
 * @returns {MarketCatalogVisibility}
 */
export function resolveMarketCatalogVisibility(entry, marketTypeKey = DEFAULT_MARKET_TYPE) {
  const marketDef = MARKET_TYPES[marketTypeKey]

  // Unknown market type → permissive fallback: everything visible
  if (!marketDef) {
    return { visible: true, blocked: false, reason: null }
  }

  const { allowedAvailability } = marketDef

  // Wildcard: all availability statuses allowed
  if (Array.isArray(allowedAvailability) && allowedAvailability.includes('*')) {
    return { visible: true, blocked: false, reason: null }
  }

  // Check whether entry's availability is allowed by this market
  const entryAvailability = entry.availability ?? DEFAULT_AVAILABILITY
  const isAllowed = Array.isArray(allowedAvailability) && allowedAvailability.includes(entryAvailability)

  if (!isAllowed) {
    return { visible: false, blocked: true, reason: 'availability-not-allowed' }
  }

  return { visible: true, blocked: false, reason: null }
}
