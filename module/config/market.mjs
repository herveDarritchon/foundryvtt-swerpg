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

/* -------------------------------------------- */

/**
 * The Foundry flag namespace used for Market-specific item flags.
 * Used for the `non-purchasable` per-item exclusion flag.
 * @type {string}
 */
export const MARKET_FLAG_NAMESPACE = 'swerpg'

/**
 * The flag key used to mark an item as explicitly excluded from the Market.
 * When this flag is `true` on an item, it is not eligible regardless of source or type.
 * @type {string}
 */
export const MARKET_EXCLUDED_FLAG = 'marketExcluded'

/* -------------------------------------------- */

/**
 * @typedef {Object} MarketConfig
 * @property {string[]} enabledSources    List of enabled source type keys (subset of SOURCE_TYPES keys)
 * @property {string[]} allowedItemTypes  List of allowed item type keys (subset of PURCHASABLE_ITEM_TYPES keys)
 * @property {string}   dedupStrategy     Deduplication strategy key (one of DEDUP_STRATEGIES values)
 */

/**
 * Default Market runtime configuration.
 * All sources and purchasable types are enabled by default.
 * Deduplication prefers compendium entries.
 *
 * This object is the canonical source of truth for the Market defaults.
 * Consumers must not hardcode these values — read them from this constant or
 * from the resolved runtime config via `resolveMarketConfig()`.
 *
 * @type {Readonly<MarketConfig>}
 */
export const DEFAULT_MARKET_CONFIG = Object.freeze({
  enabledSources: Object.freeze(Object.keys(SOURCE_TYPES)),
  allowedItemTypes: Object.freeze(Object.keys(PURCHASABLE_ITEM_TYPES)),
  dedupStrategy: 'prefer-compendium',
})

/* -------------------------------------------- */

/**
 * @typedef {Object} MarketContext
 * @property {string}  availability    Availability key (one of AVAILABILITY_STATUS keys)
 * @property {string}  marketType      Market type key: one of MARKET_TYPES keys
 * @property {number}  manualModifier  Manual GM percentage modifier (-100 to +100), default 0
 */

/* -------------------------------------------- */

/**
 * @typedef {Object} MarketTypeDefinition
 * @property {string}   id                  Canonical market type key
 * @property {string}   label               Localization key
 * @property {string}   description         Short description localization key
 * @property {string[]} allowedItemTypes    Item type keys visible in this market (['*'] = all purchasable)
 * @property {string[]} allowedAvailability Availability keys allowed; items with other keys are hidden
 * @property {number}   priceModifier       Flat additive fractional modifier applied on top of item modifiers
 * @property {string}   uiVariant           CSS modifier class applied to the market UI for visual distinction
 */

/**
 * Canonical registry of market types available in V1.
 *
 * Rules per type:
 * - `standard`    : all purchasable types, all normal availability statuses, no extra price modifier.
 * - `local`       : all purchasable types, only available/common items, -10% price discount (proximity bonus).
 * - `specialized` : all purchasable types, rare/veryRare items unlocked, +25% price premium.
 * - `black-market`: all purchasable types, restricted/blackMarket/illegal items visible, +50% price premium.
 *
 * Consumers must iterate this registry — never hardcode market type keys.
 * @enum {MarketTypeDefinition}
 */
export const MARKET_TYPES = Object.freeze({
  standard: Object.freeze({
    id: 'standard',
    label: 'MARKET.MarketType.Standard.Label',
    description: 'MARKET.MarketType.Standard.Description',
    allowedItemTypes: Object.freeze(['*']),
    allowedAvailability: Object.freeze(['available', 'common', 'rare']),
    priceModifier: 0,
    uiVariant: 'market--standard',
  }),
  local: Object.freeze({
    id: 'local',
    label: 'MARKET.MarketType.Local.Label',
    description: 'MARKET.MarketType.Local.Description',
    allowedItemTypes: Object.freeze(['*']),
    allowedAvailability: Object.freeze(['available', 'common']),
    priceModifier: -0.1,
    uiVariant: 'market--local',
  }),
  specialized: Object.freeze({
    id: 'specialized',
    label: 'MARKET.MarketType.Specialized.Label',
    description: 'MARKET.MarketType.Specialized.Description',
    allowedItemTypes: Object.freeze(['*']),
    allowedAvailability: Object.freeze(['available', 'common', 'rare', 'veryRare']),
    priceModifier: 0.25,
    uiVariant: 'market--specialized',
  }),
  'black-market': Object.freeze({
    id: 'black-market',
    label: 'MARKET.MarketType.BlackMarket.Label',
    description: 'MARKET.MarketType.BlackMarket.Description',
    allowedItemTypes: Object.freeze(['*']),
    allowedAvailability: Object.freeze(['available', 'common', 'rare', 'veryRare', 'restricted', 'blackMarket']),
    priceModifier: 0.5,
    uiVariant: 'market--black-market',
  }),
})

/**
 * The default market type key applied when none is provided to the price engine.
 * Must be a key of {@link MARKET_TYPES}.
 * @type {string}
 */
export const DEFAULT_MARKET_TYPE = 'standard'

/**
 * Default market context applied when none is provided to the price engine.
 * Uses deterministic fallback values that produce no price modification beyond item data.
 * @type {Readonly<MarketContext>}
 */
export const DEFAULT_MARKET_CONTEXT = Object.freeze({
  availability: DEFAULT_AVAILABILITY,
  marketType: DEFAULT_MARKET_TYPE,
  manualModifier: 0,
})
