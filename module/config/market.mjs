/**
 * @typedef {Object} MarketItemType
 * @property {string} id     The canonical item type key
 * @property {string} label  Localization key
 * @property {string} icon   Font Awesome icon class
 */

/**
 * Item types that can be purchased through the Market.
 * Consumers must always iterate this registry — never hardcode type keys.
 * @enum {MarketItemType}
 */
export const PURCHASABLE_ITEM_TYPES = Object.freeze({
  weapon: { id: 'weapon', label: 'MARKET.ItemType.Weapon', icon: 'fa-solid fa-gun' },
  armor: { id: 'armor', label: 'MARKET.ItemType.Armor', icon: 'fa-solid fa-shield' },
  gear: { id: 'gear', label: 'MARKET.ItemType.Gear', icon: 'fa-solid fa-toolbox' },
})

/* -------------------------------------------- */

/**
 * @typedef {Object} ExcludedItemType
 * @property {string} id      The item type key
 * @property {string} reason  Machine-readable reason for exclusion
 */

/**
 * Item types explicitly excluded from the Market.
 * Kept for documentation and traceability — consumers can use this for
 * validation messages or UI warnings.
 * @enum {ExcludedItemType}
 */
export const EXCLUDED_ITEM_TYPES = Object.freeze({
  talent: { id: 'talent', reason: 'progression-only' },
  career: { id: 'career', reason: 'character-creation-only' },
  species: { id: 'species', reason: 'character-creation-only' },
  specialization: { id: 'specialization', reason: 'progression-only' },
  'specialization-tree': { id: 'specialization-tree', reason: 'meta-structure' },
  obligation: { id: 'obligation', reason: 'narrative-only' },
  duty: { id: 'duty', reason: 'narrative-only' },
  motivation: { id: 'motivation', reason: 'narrative-only' },
  'motivation-category': { id: 'motivation-category', reason: 'meta-structure' },
})

/* -------------------------------------------- */

/**
 * @typedef {Object} AvailabilityStatus
 * @property {string}      id             The canonical availability key
 * @property {string}      label          Localization key
 * @property {boolean}     purchasable    Whether items with this status can be purchased normally
 * @property {number|null} priceModifier  Price multiplier modifier (fraction), or null if no price applies
 */

/**
 * Possible availability statuses for a Market item.
 * The `priceModifier` is applied additively in the pricing formula.
 * `null` means no valid price exists (item cannot be purchased at any price).
 * @enum {AvailabilityStatus}
 */
export const AVAILABILITY_STATUS = Object.freeze({
  available: { id: 'available', label: 'MARKET.Availability.Available', purchasable: true, priceModifier: 0 },
  common: { id: 'common', label: 'MARKET.Availability.Common', purchasable: true, priceModifier: 0 },
  rare: { id: 'rare', label: 'MARKET.Availability.Rare', purchasable: true, priceModifier: 0.25 },
  veryRare: { id: 'veryRare', label: 'MARKET.Availability.VeryRare', purchasable: false, priceModifier: 0.5 },
  restricted: { id: 'restricted', label: 'MARKET.Availability.Restricted', purchasable: false, priceModifier: 1.0 },
  blackMarket: { id: 'blackMarket', label: 'MARKET.Availability.BlackMarket', purchasable: false, priceModifier: 1.5 },
  unavailable: { id: 'unavailable', label: 'MARKET.Availability.Unavailable', purchasable: false, priceModifier: null },
})

/* -------------------------------------------- */

/**
 * @typedef {Object} SourceType
 * @property {string}  id      The canonical source type key
 * @property {string}  label   Localization key
 * @property {boolean} trusted Whether items from this source are trusted by default
 */

/**
 * Types of sources from which Market items can originate.
 * Trusted sources bypass the `untrusted-source` eligibility check.
 * @enum {SourceType}
 */
export const SOURCE_TYPES = Object.freeze({
  compendium: { id: 'compendium', label: 'MARKET.Source.Compendium', trusted: true },
  world: { id: 'world', label: 'MARKET.Source.World', trusted: true },
  import: { id: 'import', label: 'MARKET.Source.Import', trusted: false },
})

/* -------------------------------------------- */

/**
 * The default availability status key applied when none is provided.
 * Must be a key of {@link AVAILABILITY_STATUS}.
 * @type {string}
 */
export const DEFAULT_AVAILABILITY = 'available'

/**
 * The default source type key applied when none is provided.
 * Must be a key of {@link SOURCE_TYPES}.
 * @type {string}
 */
export const DEFAULT_SOURCE_TYPE = 'compendium'

/**
 * The minimum base price (inclusive) for a Market item to be eligible.
 * Items with a price below this threshold fail the `missing-price` eligibility check.
 * @type {number}
 */
export const MIN_PRICE_FOR_ELIGIBILITY = 0
