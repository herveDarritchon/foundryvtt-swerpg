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
 * @typedef {Object} RarityRules
 * @property {number} obtainmentProbability  Base chance (0–100%) of obtaining the item immediately.
 * @property {{ days: number, descriptionKey: string }} supplyDelay  Narrative delay when not immediately available.
 * @property {string} narrativeReasonKey  i18n key explaining the availability situation.
 */

/**
 * @typedef {Object} AvailabilityStatus
 * @property {string}      id             The canonical availability key
 * @property {string}      label          Localization key
 * @property {boolean}     purchasable    Whether items with this status can be purchased normally
 * @property {number|null} priceModifier  Price multiplier modifier (fraction), or null if no price applies
 * @property {RarityRules} rarityRules    Narrative rarity rules for obtainability and supply delay
 */

/**
 * Possible availability statuses for a Market item.
 * The `priceModifier` is applied additively in the pricing formula.
 * `null` means no valid price exists (item cannot be purchased at any price).
 * Each entry carries `rarityRules` describing obtainability probability and supply delay.
 * @enum {AvailabilityStatus}
 */
export const AVAILABILITY_STATUS = Object.freeze({
  available: Object.freeze({
    id: 'available',
    label: 'MARKET.Availability.Available',
    purchasable: true,
    priceModifier: 0,
    rarityRules: Object.freeze({
      obtainmentProbability: 100,
      supplyDelay: Object.freeze({ days: 0, descriptionKey: '' }),
      narrativeReasonKey: 'MARKET.Rarity.Reason.ReadilyAvailable',
    }),
  }),
  common: Object.freeze({
    id: 'common',
    label: 'MARKET.Availability.Common',
    purchasable: true,
    priceModifier: 0,
    rarityRules: Object.freeze({
      obtainmentProbability: 100,
      supplyDelay: Object.freeze({ days: 0, descriptionKey: '' }),
      narrativeReasonKey: 'MARKET.Rarity.Reason.ReadilyAvailable',
    }),
  }),
  rare: Object.freeze({
    id: 'rare',
    label: 'MARKET.Availability.Rare',
    purchasable: true,
    priceModifier: 0.25,
    rarityRules: Object.freeze({
      obtainmentProbability: 70,
      supplyDelay: Object.freeze({ days: 2, descriptionKey: 'MARKET.Rarity.Delay.FewDays' }),
      narrativeReasonKey: 'MARKET.Rarity.Reason.LimitedStock',
    }),
  }),
  veryRare: Object.freeze({
    id: 'veryRare',
    label: 'MARKET.Availability.VeryRare',
    purchasable: false,
    priceModifier: 0.5,
    rarityRules: Object.freeze({
      obtainmentProbability: 40,
      supplyDelay: Object.freeze({ days: 5, descriptionKey: 'MARKET.Rarity.Delay.Week' }),
      narrativeReasonKey: 'MARKET.Rarity.Reason.HardToFind',
    }),
  }),
  restricted: Object.freeze({
    id: 'restricted',
    label: 'MARKET.Availability.Restricted',
    purchasable: false,
    priceModifier: 1.0,
    rarityRules: Object.freeze({
      obtainmentProbability: 30,
      supplyDelay: Object.freeze({ days: 7, descriptionKey: 'MARKET.Rarity.Delay.Week' }),
      narrativeReasonKey: 'MARKET.Rarity.Reason.RiskyDelivery',
    }),
  }),
  blackMarket: Object.freeze({
    id: 'blackMarket',
    label: 'MARKET.Availability.BlackMarket',
    purchasable: false,
    priceModifier: 1.5,
    rarityRules: Object.freeze({
      obtainmentProbability: 20,
      supplyDelay: Object.freeze({ days: 7, descriptionKey: 'MARKET.Rarity.Delay.Week' }),
      narrativeReasonKey: 'MARKET.Rarity.Reason.RiskyDelivery',
    }),
  }),
  unavailable: Object.freeze({
    id: 'unavailable',
    label: 'MARKET.Availability.Unavailable',
    purchasable: false,
    priceModifier: null,
    rarityRules: Object.freeze({
      obtainmentProbability: 0,
      supplyDelay: Object.freeze({ days: 0, descriptionKey: '' }),
      narrativeReasonKey: 'MARKET.Rarity.Reason.Unavailable',
    }),
  }),
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

/* -------------------------------------------- */

/**
 * Rarity thresholds used to derive an {@link AVAILABILITY_STATUS} key from item rarity.
 *
 * Rules (evaluated in order, restriction level takes precedence):
 *   - illegal → 'blackMarket'
 *   - military | restricted → 'restricted'
 *   - none + rarity >= VERY_RARE → 'veryRare'
 *   - none + rarity >= RARE     → 'rare'
 *   - none + rarity >= COMMON   → 'common'
 *   - none + rarity < COMMON    → 'available'
 *
 * These thresholds are named constants to prevent magic numbers in the derivation logic.
 * Change these values only via an ADR.
 *
 * @type {Readonly<{VERY_RARE: number, RARE: number, COMMON: number}>}
 */
export const AVAILABILITY_DERIVATION_THRESHOLDS = Object.freeze({
  /** Minimum rarity (inclusive) to derive 'veryRare' for a legal item. */
  VERY_RARE: 7,
  /** Minimum rarity (inclusive) to derive 'rare' for a legal item. */
  RARE: 5,
  /** Minimum rarity (inclusive) to derive 'common' for a legal item. */
  COMMON: 3,
})

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
 * @property {string}  marketType      Market type key: one of MARKET_TYPES keys
 * @property {number}  manualModifier  Manual GM percentage modifier (-100 to +100), default 0
 *
 * Note: `availability` is NOT a context field. It is always derived from the item's
 * `rarity` and `restrictionLevel` via `deriveAvailability()` in `market-entry.mjs`,
 * or provided explicitly as `itemData.availability` to `calculateItemPrice()`.
 * Injecting `availability` into a `MarketContext` is a contract violation.
 */

/* -------------------------------------------- */

/**
 * @typedef {Object} MarketTypeDefinition
 * @property {string}   id                        Canonical market type key
 * @property {string}   label                     Localization key
 * @property {string}   description               Short description localization key
 * @property {string[]} allowedItemTypes          Item type keys visible in this market (['*'] = all purchasable)
 * @property {string[]} allowedAvailability       Availability keys allowed; items with other keys are hidden
 * @property {string[]} allowedRestrictionLevels  Restriction level keys allowed; ['*'] means all levels allowed
 * @property {number}   priceModifier             Flat additive fractional modifier applied on top of item modifiers
 * @property {string}   uiVariant                 CSS modifier class applied to the market UI for visual distinction
 * @property {boolean}  negotiationAllowed        Whether price negotiation is allowed in this market type
 */

/**
 * Canonical registry of market types available in V1.
 *
 * Rules per type:
 * - `standard`    : all purchasable types, all normal availability statuses, no extra price modifier, negotiation allowed.
 * - `local`       : all purchasable types, only available/common items, -10% price discount (proximity bonus), negotiation allowed.
 * - `specialized` : all purchasable types, rare/veryRare/restricted items unlocked (military/restricted restriction levels allowed), +25% price premium, negotiation allowed.
 * - `black-market`: all purchasable types, restricted/blackMarket/illegal items visible (all restriction levels allowed), +50% price premium, negotiation allowed (risky).
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
    allowedRestrictionLevels: Object.freeze(['none']),
    priceModifier: 0,
    uiVariant: 'market--standard',
    negotiationAllowed: true,
  }),
  local: Object.freeze({
    id: 'local',
    label: 'MARKET.MarketType.Local.Label',
    description: 'MARKET.MarketType.Local.Description',
    allowedItemTypes: Object.freeze(['*']),
    allowedAvailability: Object.freeze(['available', 'common']),
    allowedRestrictionLevels: Object.freeze(['none']),
    priceModifier: -0.1,
    uiVariant: 'market--local',
    negotiationAllowed: true,
  }),
  specialized: Object.freeze({
    id: 'specialized',
    label: 'MARKET.MarketType.Specialized.Label',
    description: 'MARKET.MarketType.Specialized.Description',
    allowedItemTypes: Object.freeze(['*']),
    // 'restricted' is included because items with restrictionLevel='restricted'|'military'
    // derive availability='restricted' via deriveAvailability().
    // Both axes must be coherent: allowedAvailability lists the derived keys that are visible,
    // and allowedRestrictionLevels lists the restriction levels that are allowed.
    allowedAvailability: Object.freeze(['available', 'common', 'rare', 'veryRare', 'restricted']),
    allowedRestrictionLevels: Object.freeze(['none', 'restricted', 'military']),
    priceModifier: 0.25,
    uiVariant: 'market--specialized',
    negotiationAllowed: true,
  }),
  'black-market': Object.freeze({
    id: 'black-market',
    label: 'MARKET.MarketType.BlackMarket.Label',
    description: 'MARKET.MarketType.BlackMarket.Description',
    allowedItemTypes: Object.freeze(['*']),
    allowedAvailability: Object.freeze(['available', 'common', 'rare', 'veryRare', 'restricted', 'blackMarket']),
    allowedRestrictionLevels: Object.freeze(['*']),
    priceModifier: 0.5,
    uiVariant: 'market--black-market',
    negotiationAllowed: true,
  }),
})

/**
 * The default market type key applied when none is provided to the price engine.
 * Must be a key of {@link MARKET_TYPES}.
 * @type {string}
 */
export const DEFAULT_MARKET_TYPE = 'standard'

/* -------------------------------------------- */

/**
 * Price modifiers (as fractions) applied by commerce test outcomes.
 * Used by `computeCommerceOutcome` in `module/lib/market/commerce-outcomes.mjs`.
 *
 * - advantage: −10% (vendor discount)
 * - threat:    +10% (vendor harder bargain)
 * - disaster:  +10% (scam / inflated price)
 *
 * @type {Readonly<Record<'advantage'|'threat'|'disaster', number>>}
 */
export const COMMERCE_OUTCOME_PRICE_MODIFIERS = Object.freeze({
  advantage: -0.1,
  threat: 0.1,
  disaster: 0.1,
})

/**
 * Default market context applied when none is provided to the price engine.
 * Uses deterministic fallback values that produce no price modification beyond item data.
 *
 * `availability` is intentionally absent: it is not a contextual dimension.
 * It must be derived from the item's `rarity` and `restrictionLevel` via
 * `deriveAvailability()`, or supplied explicitly as `itemData.availability`
 * to `calculateItemPrice()`. Context-level availability was a legacy backward-compat
 * field and has been removed to enforce a single source of truth.
 *
 * @type {Readonly<MarketContext>}
 */
export const DEFAULT_MARKET_CONTEXT = Object.freeze({
  marketType: DEFAULT_MARKET_TYPE,
  manualModifier: 0,
})

/* -------------------------------------------- */

/**
 * Whether broken items are allowed to be sold by default.
 * When false, selling a broken item is rejected regardless of multiplier.
 * @type {boolean}
 */
export const DEFAULT_ALLOW_BROKEN_ITEM_SALE = false

/**
 * Default resale price multiplier (as a percentage, 0–100) applied to broken items when
 * their resale is allowed.
 * A value of 50 means broken items sell for 50% of the normal resale value.
 * @type {number}
 */
export const DEFAULT_BROKEN_ITEM_SALE_MULTIPLIER = 50

/**
 * Minimum allowed value (inclusive) for the broken item sale multiplier (%).
 * @type {number}
 */
export const BROKEN_ITEM_SALE_MULTIPLIER_MIN = 0

/**
 * Maximum allowed value (inclusive) for the broken item sale multiplier (%).
 * @type {number}
 */
export const BROKEN_ITEM_SALE_MULTIPLIER_MAX = 100
