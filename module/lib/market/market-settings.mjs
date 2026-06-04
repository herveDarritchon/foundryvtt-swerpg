import {
  DEFAULT_MARKET_CONFIG,
  MARKET_FLAG_NAMESPACE,
  MARKET_EXCLUDED_FLAG,
  DEFAULT_ALLOW_BROKEN_ITEM_SALE,
  DEFAULT_BROKEN_ITEM_SALE_MULTIPLIER,
  BROKEN_ITEM_SALE_MULTIPLIER_MIN,
  BROKEN_ITEM_SALE_MULTIPLIER_MAX,
} from '../../config/market.mjs'
import { parseLocationConfigMap } from './location-config.mjs'
import { logger } from '../../utils/logger.mjs'

/**
 * Foundry settings key for Market enabled sources.
 * Stored as a JSON-serialised array of source type keys.
 * @type {string}
 */
export const SETTING_MARKET_ENABLED_SOURCES = 'marketEnabledSources'

/**
 * Foundry settings key for Market allowed item types.
 * Stored as a JSON-serialised array of item type keys.
 * @type {string}
 */
export const SETTING_MARKET_ALLOWED_ITEM_TYPES = 'marketAllowedItemTypes'

/**
 * Foundry settings key for Market deduplication strategy.
 * Stored as a plain string matching one of DEDUP_STRATEGIES values.
 * @type {string}
 */
export const SETTING_MARKET_DEDUP_STRATEGY = 'marketDedupStrategy'

/**
 * Foundry settings key for Market manually excluded item UUIDs.
 * Stored as a JSON-serialised array of item UUID strings.
 * @type {string}
 */
export const SETTING_MARKET_EXCLUDED_ITEMS = 'marketExcludedItems'

/**
 * Foundry settings key for Market per-type price modifiers.
 * Stored as a JSON-serialised object: { weapon: { priceModifier: 0.1 }, ... }
 * @type {string}
 */
export const SETTING_MARKET_TYPE_MODIFIERS = 'marketTypeModifiers'

/**
 * Foundry settings key for Market global price modifier (%).
 * Stored as a number (-100 to +100).
 * @type {string}
 */
export const SETTING_MARKET_GLOBAL_PRICE_MOD = 'marketGlobalPriceModifier'

/**
 * Foundry settings key for Market location configurations.
 * Stored as a JSON-serialised LocationConfigMap.
 * @type {string}
 */
export const SETTING_MARKET_LOCATION_CONFIGS = 'marketLocationConfigs'

/**
 * Foundry settings key controlling whether broken items can be sold.
 * Stored as a boolean.
 * @type {string}
 */
export const SETTING_MARKET_ALLOW_BROKEN_ITEM_SALE = 'marketAllowBrokenItemSale'

/**
 * Foundry settings key for the broken item sale price multiplier (percentage, 0–100).
 * Applied to the normal resale value when broken item sale is allowed.
 * Stored as a number.
 * @type {string}
 */
export const SETTING_MARKET_BROKEN_ITEM_SALE_MULTIPLIER = 'marketBrokenItemSaleMultiplier'

/* -------------------------------------------- */

/**
 * Register all Market settings with Foundry.
 * Must be called once during system initialisation (init hook), after `game.settings` is available.
 *
 * @param {string} systemId  The system ID (e.g. 'swerpg')
 */
export function registerMarketSettings(systemId) {
  game.settings.register(systemId, SETTING_MARKET_ENABLED_SOURCES, {
    name: 'SWERPG.SETTINGS.MARKET_ENABLED_SOURCES_NAME',
    hint: 'SWERPG.SETTINGS.MARKET_ENABLED_SOURCES_HINT',
    scope: 'world',
    config: false,
    type: String,
    default: JSON.stringify(DEFAULT_MARKET_CONFIG.enabledSources),
  })

  game.settings.register(systemId, SETTING_MARKET_ALLOWED_ITEM_TYPES, {
    name: 'SWERPG.SETTINGS.MARKET_ALLOWED_ITEM_TYPES_NAME',
    hint: 'SWERPG.SETTINGS.MARKET_ALLOWED_ITEM_TYPES_HINT',
    scope: 'world',
    config: false,
    type: String,
    default: JSON.stringify(DEFAULT_MARKET_CONFIG.allowedItemTypes),
  })

  game.settings.register(systemId, SETTING_MARKET_DEDUP_STRATEGY, {
    name: 'SWERPG.SETTINGS.MARKET_DEDUP_STRATEGY_NAME',
    hint: 'SWERPG.SETTINGS.MARKET_DEDUP_STRATEGY_HINT',
    scope: 'world',
    config: false,
    type: String,
    default: DEFAULT_MARKET_CONFIG.dedupStrategy,
  })

  game.settings.register(systemId, SETTING_MARKET_EXCLUDED_ITEMS, {
    name: 'SWERPG.SETTINGS.MARKET_EXCLUDED_ITEMS_NAME',
    hint: 'SWERPG.SETTINGS.MARKET_EXCLUDED_ITEMS_HINT',
    scope: 'world',
    config: false,
    type: String,
    default: JSON.stringify([]),
  })

  game.settings.register(systemId, SETTING_MARKET_TYPE_MODIFIERS, {
    name: 'SWERPG.SETTINGS.MARKET_TYPE_MODIFIERS_NAME',
    hint: 'SWERPG.SETTINGS.MARKET_TYPE_MODIFIERS_HINT',
    scope: 'world',
    config: false,
    type: String,
    default: JSON.stringify({}),
  })

  game.settings.register(systemId, SETTING_MARKET_GLOBAL_PRICE_MOD, {
    name: 'SWERPG.SETTINGS.MARKET_GLOBAL_PRICE_MOD_NAME',
    hint: 'SWERPG.SETTINGS.MARKET_GLOBAL_PRICE_MOD_HINT',
    scope: 'world',
    config: false,
    type: Number,
    default: 0,
  })

  game.settings.register(systemId, SETTING_MARKET_LOCATION_CONFIGS, {
    name: 'SWERPG.SETTINGS.MARKET_LOCATION_CONFIGS_NAME',
    hint: 'SWERPG.SETTINGS.MARKET_LOCATION_CONFIGS_HINT',
    scope: 'world',
    config: false,
    type: String,
    default: JSON.stringify({}),
  })

  game.settings.register(systemId, SETTING_MARKET_ALLOW_BROKEN_ITEM_SALE, {
    name: 'SWERPG.SETTINGS.MARKET_ALLOW_BROKEN_ITEM_SALE_NAME',
    hint: 'SWERPG.SETTINGS.MARKET_ALLOW_BROKEN_ITEM_SALE_HINT',
    scope: 'world',
    config: false,
    type: Boolean,
    default: DEFAULT_ALLOW_BROKEN_ITEM_SALE,
  })

  game.settings.register(systemId, SETTING_MARKET_BROKEN_ITEM_SALE_MULTIPLIER, {
    name: 'SWERPG.SETTINGS.MARKET_BROKEN_ITEM_SALE_MULTIPLIER_NAME',
    hint: 'SWERPG.SETTINGS.MARKET_BROKEN_ITEM_SALE_MULTIPLIER_HINT',
    scope: 'world',
    config: false,
    type: Number,
    default: DEFAULT_BROKEN_ITEM_SALE_MULTIPLIER,
  })
}

/* -------------------------------------------- */

/**
 * Read and resolve the current Market configuration from Foundry settings.
 * Falls back to `DEFAULT_MARKET_CONFIG` values on any parse or access error.
 *
 * This function is the single entry point for reading the Market runtime config.
 * Pure domain code must not call `game.settings` directly — use this helper.
 *
 * @param {string} systemId  The system ID (e.g. 'swerpg')
 * @returns {import('../../config/market.mjs').MarketConfig} Resolved configuration (never null/undefined)
 */
export function readMarketConfig(systemId) {
  let enabledSources = DEFAULT_MARKET_CONFIG.enabledSources
  let allowedItemTypes = DEFAULT_MARKET_CONFIG.allowedItemTypes
  let dedupStrategy = DEFAULT_MARKET_CONFIG.dedupStrategy

  try {
    const rawSources = game.settings.get(systemId, SETTING_MARKET_ENABLED_SOURCES)
    if (typeof rawSources === 'string' && rawSources.length > 0) {
      const parsed = JSON.parse(rawSources)
      if (Array.isArray(parsed)) enabledSources = parsed
    }
  } catch (err) {
    logger.warn(`[Market] Could not read setting "${SETTING_MARKET_ENABLED_SOURCES}", using default`, err)
  }

  try {
    const rawTypes = game.settings.get(systemId, SETTING_MARKET_ALLOWED_ITEM_TYPES)
    if (typeof rawTypes === 'string' && rawTypes.length > 0) {
      const parsed = JSON.parse(rawTypes)
      if (Array.isArray(parsed)) allowedItemTypes = parsed
    }
  } catch (err) {
    logger.warn(`[Market] Could not read setting "${SETTING_MARKET_ALLOWED_ITEM_TYPES}", using default`, err)
  }

  try {
    const rawStrategy = game.settings.get(systemId, SETTING_MARKET_DEDUP_STRATEGY)
    if (typeof rawStrategy === 'string' && rawStrategy.length > 0) {
      dedupStrategy = rawStrategy
    }
  } catch (err) {
    logger.warn(`[Market] Could not read setting "${SETTING_MARKET_DEDUP_STRATEGY}", using default`, err)
  }

  return { enabledSources, allowedItemTypes, dedupStrategy }
}

/* -------------------------------------------- */

/**
 * Check whether a Foundry Item document is explicitly excluded from the Market.
 *
 * The exclusion is stored as a flag in the `swerpg` namespace on the item document.
 * This adapter translates the Foundry flag into the `nonPurchasable` boolean expected
 * by `evaluateEligibility`.
 *
 * @param {Item} item  A Foundry Item document
 * @returns {boolean}  True if the item is explicitly excluded from the Market
 */
export function isItemMarketExcluded(item) {
  try {
    return item.getFlag(MARKET_FLAG_NAMESPACE, MARKET_EXCLUDED_FLAG) === true
  } catch (err) {
    logger.warn(`[Market] Could not read marketExcluded flag on item "${item?.name}"`, err)
    return false
  }
}

/**
 * Mark a Foundry Item document as excluded from the Market.
 * Requires the item to be owned by the current user.
 *
 * @param {Item}    item      A Foundry Item document
 * @param {boolean} excluded  True to exclude, false to restore eligibility
 * @returns {Promise<Item>}
 */
export async function setItemMarketExcluded(item, excluded) {
  return item.setFlag(MARKET_FLAG_NAMESPACE, MARKET_EXCLUDED_FLAG, excluded === true)
}

/* -------------------------------------------- */

/**
 * Read the list of manually excluded item UUIDs from Foundry settings.
 * Falls back to an empty array on any parse or access error.
 *
 * @param {string} systemId  The system ID (e.g. 'swerpg')
 * @returns {string[]}  Array of item UUIDs excluded from the Market
 */
export function readMarketExcludedItems(systemId) {
  try {
    const raw = game.settings.get(systemId, SETTING_MARKET_EXCLUDED_ITEMS)
    if (typeof raw === 'string' && raw.length > 0) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (err) {
    logger.warn(`[Market] Could not read setting "${SETTING_MARKET_EXCLUDED_ITEMS}", using default`, err)
  }
  return []
}

/**
 * Write the list of manually excluded item UUIDs to Foundry settings.
 *
 * @param {string}   systemId  The system ID (e.g. 'swerpg')
 * @param {string[]} items     Array of item UUIDs to exclude
 * @returns {Promise<void>}
 */
export async function writeMarketExcludedItems(systemId, items) {
  return game.settings.set(systemId, SETTING_MARKET_EXCLUDED_ITEMS, JSON.stringify(items))
}

/* -------------------------------------------- */

/**
 * Read per-type price modifiers from Foundry settings.
 * Returns an object mapping item type keys to { priceModifier: number }.
 * Falls back to an empty object on any parse or access error.
 *
 * @param {string} systemId  The system ID (e.g. 'swerpg')
 * @returns {Record<string, { priceModifier: number }>}
 */
export function readMarketTypeModifiers(systemId) {
  try {
    const raw = game.settings.get(systemId, SETTING_MARKET_TYPE_MODIFIERS)
    if (typeof raw === 'string' && raw.length > 0) {
      const parsed = JSON.parse(raw)
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) return parsed
    }
  } catch (err) {
    logger.warn(`[Market] Could not read setting "${SETTING_MARKET_TYPE_MODIFIERS}", using default`, err)
  }
  return {}
}

/**
 * Write per-type price modifiers to Foundry settings.
 *
 * @param {string} systemId  The system ID (e.g. 'swerpg')
 * @param {Record<string, { priceModifier: number }>} modifiers
 * @returns {Promise<void>}
 */
export async function writeMarketTypeModifiers(systemId, modifiers) {
  return game.settings.set(systemId, SETTING_MARKET_TYPE_MODIFIERS, JSON.stringify(modifiers))
}

/* -------------------------------------------- */

/**
 * Read the global price modifier (%) from Foundry settings.
 * Returns 0 on any access error.
 *
 * @param {string} systemId  The system ID (e.g. 'swerpg')
 * @returns {number}  Percentage modifier (-100 to +100)
 */
export function readMarketGlobalPriceModifier(systemId) {
  try {
    const raw = game.settings.get(systemId, SETTING_MARKET_GLOBAL_PRICE_MOD)
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  } catch (err) {
    logger.warn(`[Market] Could not read setting "${SETTING_MARKET_GLOBAL_PRICE_MOD}", using default`, err)
  }
  return 0
}

/**
 * Write the global price modifier (%) to Foundry settings.
 *
 * @param {string} systemId  The system ID (e.g. 'swerpg')
 * @param {number} modifier  Percentage modifier (-100 to +100)
 * @returns {Promise<void>}
 */
export async function writeMarketGlobalPriceModifier(systemId, modifier) {
  return game.settings.set(systemId, SETTING_MARKET_GLOBAL_PRICE_MOD, modifier)
}

/* -------------------------------------------- */

/**
 * Read the location configurations from Foundry settings.
 * Returns an empty object on any parse or access error.
 *
 * @param {string} systemId  The system ID (e.g. 'swerpg')
 * @returns {import('./location-config.mjs').LocationConfigMap}
 */
export function readMarketLocationConfigs(systemId) {
  try {
    const raw = game.settings.get(systemId, SETTING_MARKET_LOCATION_CONFIGS)
    return parseLocationConfigMap(raw)
  } catch (err) {
    logger.warn(`[Market] Could not read setting "${SETTING_MARKET_LOCATION_CONFIGS}", using default`, err)
  }
  return {}
}

/**
 * Write the location configurations to Foundry settings.
 *
 * @param {string} systemId  The system ID (e.g. 'swerpg')
 * @param {import('./location-config.mjs').LocationConfigMap} configs
 * @returns {Promise<void>}
 */
export async function writeMarketLocationConfigs(systemId, configs) {
  return game.settings.set(systemId, SETTING_MARKET_LOCATION_CONFIGS, JSON.stringify(configs))
}

/* -------------------------------------------- */

/**
 * Write the base Market configuration (sources, item types, dedup strategy) to Foundry settings.
 * Groups the three settings into a single update operation.
 *
 * @param {string} systemId  The system ID (e.g. 'swerpg')
 * @param {import('../../config/market.mjs').MarketConfig} config
 * @returns {Promise<void>}
 */
export async function writeMarketConfig(systemId, config) {
  await game.settings.set(systemId, SETTING_MARKET_ENABLED_SOURCES, JSON.stringify(config.enabledSources))
  await game.settings.set(systemId, SETTING_MARKET_ALLOWED_ITEM_TYPES, JSON.stringify(config.allowedItemTypes))
  await game.settings.set(systemId, SETTING_MARKET_DEDUP_STRATEGY, config.dedupStrategy)
}

/* -------------------------------------------- */

/**
 * Read whether broken items are allowed to be sold from Foundry settings.
 * Falls back to `DEFAULT_ALLOW_BROKEN_ITEM_SALE` on any access error.
 *
 * @param {string} systemId  The system ID (e.g. 'swerpg')
 * @returns {boolean}
 */
export function readMarketAllowBrokenItemSale(systemId) {
  try {
    const raw = game.settings.get(systemId, SETTING_MARKET_ALLOW_BROKEN_ITEM_SALE)
    if (typeof raw === 'boolean') return raw
  } catch (err) {
    logger.warn(`[Market] Could not read setting "${SETTING_MARKET_ALLOW_BROKEN_ITEM_SALE}", using default`, err)
  }
  return DEFAULT_ALLOW_BROKEN_ITEM_SALE
}

/**
 * Write the broken item sale flag to Foundry settings.
 *
 * @param {string}  systemId  The system ID (e.g. 'swerpg')
 * @param {boolean} allowed   Whether broken items may be sold
 * @returns {Promise<void>}
 */
export async function writeMarketAllowBrokenItemSale(systemId, allowed) {
  return game.settings.set(systemId, SETTING_MARKET_ALLOW_BROKEN_ITEM_SALE, allowed === true)
}

/* -------------------------------------------- */

/**
 * Read the broken item sale multiplier (%) from Foundry settings.
 * The value is clamped to [BROKEN_ITEM_SALE_MULTIPLIER_MIN, BROKEN_ITEM_SALE_MULTIPLIER_MAX].
 * Falls back to `DEFAULT_BROKEN_ITEM_SALE_MULTIPLIER` on any access or range error.
 *
 * @param {string} systemId  The system ID (e.g. 'swerpg')
 * @returns {number}  Percentage multiplier (0–100)
 */
export function readMarketBrokenItemSaleMultiplier(systemId) {
  try {
    const raw = game.settings.get(systemId, SETTING_MARKET_BROKEN_ITEM_SALE_MULTIPLIER)
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return Math.min(BROKEN_ITEM_SALE_MULTIPLIER_MAX, Math.max(BROKEN_ITEM_SALE_MULTIPLIER_MIN, Math.round(raw)))
    }
  } catch (err) {
    logger.warn(`[Market] Could not read setting "${SETTING_MARKET_BROKEN_ITEM_SALE_MULTIPLIER}", using default`, err)
  }
  return DEFAULT_BROKEN_ITEM_SALE_MULTIPLIER
}

/**
 * Write the broken item sale multiplier (%) to Foundry settings.
 * The value is clamped to [BROKEN_ITEM_SALE_MULTIPLIER_MIN, BROKEN_ITEM_SALE_MULTIPLIER_MAX] before writing.
 *
 * @param {string} systemId    The system ID (e.g. 'swerpg')
 * @param {number} multiplier  Percentage multiplier (0–100)
 * @returns {Promise<void>}
 */
export async function writeMarketBrokenItemSaleMultiplier(systemId, multiplier) {
  const clamped = Math.min(BROKEN_ITEM_SALE_MULTIPLIER_MAX, Math.max(BROKEN_ITEM_SALE_MULTIPLIER_MIN, Math.round(multiplier)))
  return game.settings.set(systemId, SETTING_MARKET_BROKEN_ITEM_SALE_MULTIPLIER, clamped)
}
