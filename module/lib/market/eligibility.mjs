import { PURCHASABLE_ITEM_TYPES, SOURCE_TYPES } from '../../config/market.mjs'

/**
 * @typedef {Object} EligibilityResult
 * @property {boolean}     eligible             Whether the item passes all eligibility rules
 * @property {string|null} reason               Machine-readable reason code if not eligible, null otherwise
 */

/**
 * @typedef {Object} EligibilityConfig
 * @property {typeof PURCHASABLE_ITEM_TYPES} purchasableItemTypes  Registry of allowed item types
 * @property {typeof SOURCE_TYPES}           sourceTypes           Registry of known source types
 * @property {boolean}                       [allowUntrustedSources]  Override: allow items from untrusted sources
 */

/**
 * @typedef {Object} EligibilityItem
 * @property {string}      itemType            Canonical item type key
 * @property {string}      name                Display name
 * @property {number|null} basePrice           Base price (must be a finite number >= 0)
 * @property {string}      sourceType          Source type key
 * @property {boolean}     [nonPurchasable]    If true, the item has been explicitly excluded
 * @property {boolean}     [broken]            If true, the item is broken
 */

/**
 * Eligibility reasons — exhaustive set of machine-readable reason codes.
 * Non-enumerable so Object.values(ELIGIBILITY_REASONS) is not accidentally iterated
 * by consumers who may expect only domain-rule strings.
 */
export const ELIGIBILITY_REASONS = Object.freeze({
  TYPE_NOT_PURCHASABLE: 'type-not-purchasable',
  MISSING_NAME: 'missing-name',
  MISSING_PRICE: 'missing-price',
  UNTRUSTED_SOURCE: 'untrusted-source',
  EXPLICITLY_EXCLUDED: 'explicitly-excluded',
  ITEM_BROKEN: 'item-broken',
})

/* -------------------------------------------- */

/**
 * Evaluate whether a Market item is eligible for purchase.
 *
 * Decision matrix:
 * - type not in purchasableItemTypes → { eligible: false, reason: 'type-not-purchasable' }
 * - name absent/empty               → { eligible: false, reason: 'missing-name' }
 * - price absent/NaN/null           → { eligible: false, reason: 'missing-price' }
 * - untrusted source (no override)  → { eligible: false, reason: 'untrusted-source' }
 * - item marked nonPurchasable      → { eligible: false, reason: 'explicitly-excluded' }
 * - item broken                     → { eligible: false, reason: 'item-broken' }
 * - all pass                        → { eligible: true, reason: null }
 *
 * No Foundry dependencies — accepts plain objects only.
 *
 * @param {EligibilityItem} item   The item to evaluate
 * @param {EligibilityConfig} [config]  Optional config override (defaults to canonical constants)
 * @returns {EligibilityResult}
 */
export function evaluateEligibility(item, config = {}) {
  const purchasableItemTypes = config.purchasableItemTypes ?? PURCHASABLE_ITEM_TYPES
  const sourceTypes = config.sourceTypes ?? SOURCE_TYPES
  const allowUntrustedSources = config.allowUntrustedSources ?? false

  if (!(item.itemType in purchasableItemTypes)) {
    return { eligible: false, reason: ELIGIBILITY_REASONS.TYPE_NOT_PURCHASABLE }
  }

  if (!item.name || typeof item.name !== 'string' || item.name.trim().length === 0) {
    return { eligible: false, reason: ELIGIBILITY_REASONS.MISSING_NAME }
  }

  if (item.basePrice === null || item.basePrice === undefined || !Number.isFinite(item.basePrice)) {
    return { eligible: false, reason: ELIGIBILITY_REASONS.MISSING_PRICE }
  }

  if (!allowUntrustedSources) {
    const sourceTypeDef = sourceTypes[item.sourceType]
    if (!sourceTypeDef || !sourceTypeDef.trusted) {
      return { eligible: false, reason: ELIGIBILITY_REASONS.UNTRUSTED_SOURCE }
    }
  }

  if (item.nonPurchasable === true) {
    return { eligible: false, reason: ELIGIBILITY_REASONS.EXPLICITLY_EXCLUDED }
  }

  if (item.broken === true) {
    return { eligible: false, reason: ELIGIBILITY_REASONS.ITEM_BROKEN }
  }

  return { eligible: true, reason: null }
}
