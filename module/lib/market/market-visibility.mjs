import { MARKET_TYPES, DEFAULT_MARKET_TYPE } from '../../config/market.mjs'
import { resolveMarketCatalogVisibility } from './market-entry.mjs'

/**
 * @typedef {Object} MarketItemVisibility
 * @property {boolean}     visible  Whether this entry is visible in the active market
 * @property {string|null} reason   Machine-readable reason for hiding, null if visible
 */

/**
 * Resolve whether a MarketEntry is visible in the given market type.
 *
 * Combines two independent axes:
 * - Availability (rarity/supply): delegates to `resolveMarketCatalogVisibility`
 * - Restriction level (legality): checks `allowedRestrictionLevels` on the market type
 *
 * Both axes must pass for the entry to be visible (AND logic).
 *
 * Rules:
 * - If the market type is unknown, the entry is visible (permissive fallback).
 * - Availability is checked first; if blocked, returns immediately without checking restriction.
 * - If `allowedRestrictionLevels` includes `'*'`, all restriction levels are allowed.
 * - If `entry.restrictionLevel` is not in `allowedRestrictionLevels`, the entry is hidden.
 *
 * This function is a pure domain rule — no Foundry dependencies.
 *
 * @param {import('./market-entry.mjs').MarketEntry} entry        A market entry (plain object)
 * @param {string} [marketTypeKey]                                 Active market type key (key of MARKET_TYPES)
 * @returns {MarketItemVisibility}
 */
export function isItemVisibleForMarket(entry, marketTypeKey = DEFAULT_MARKET_TYPE) {
  const marketDef = MARKET_TYPES[marketTypeKey]

  // Unknown market type → permissive fallback: everything visible
  if (!marketDef) {
    return { visible: true, reason: null }
  }

  // Check availability axis first (existing logic in resolveMarketCatalogVisibility)
  const availabilityResult = resolveMarketCatalogVisibility(entry, marketTypeKey)
  if (!availabilityResult.visible) {
    return { visible: false, reason: availabilityResult.reason ?? 'availability-not-allowed' }
  }

  // Check restriction level axis
  const { allowedRestrictionLevels } = marketDef

  // Wildcard: all restriction levels allowed
  if (Array.isArray(allowedRestrictionLevels) && allowedRestrictionLevels.includes('*')) {
    return { visible: true, reason: null }
  }

  // Determine the entry's restriction level; default to 'none' (fully legal) when absent
  const entryRestrictionLevel = entry.restrictionLevel ?? 'none'
  const isAllowed = Array.isArray(allowedRestrictionLevels) && allowedRestrictionLevels.includes(entryRestrictionLevel)

  if (!isAllowed) {
    return { visible: false, reason: 'restriction-not-allowed' }
  }

  return { visible: true, reason: null }
}
