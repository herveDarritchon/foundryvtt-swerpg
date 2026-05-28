import { DEFAULT_MARKET_CONFIG, MARKET_FLAG_NAMESPACE, MARKET_EXCLUDED_FLAG } from '../../config/market.mjs'
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
