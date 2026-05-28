import { PURCHASABLE_ITEM_TYPES, SOURCE_TYPES, DEFAULT_SOURCE_TYPE, DEFAULT_AVAILABILITY } from '../../config/market.mjs'
import { evaluateEligibility } from './eligibility.mjs'

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
 *
 * No Foundry dependencies — accepts plain objects only.
 *
 * @param {RawItem}    rawItem     The raw item data to normalize
 * @param {SourceInfo} sourceInfo  Source metadata for this item
 * @returns {MarketEntry}
 * @throws {TypeError} If itemType is not a key of PURCHASABLE_ITEM_TYPES
 */
export function createMarketEntry(rawItem, sourceInfo) {
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
    availability: rawItem.availability ?? DEFAULT_AVAILABILITY,
    eligible,
    ineligibilityReason: reason,
  }
}
