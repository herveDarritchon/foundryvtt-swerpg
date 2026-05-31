/**
 * Pure domain logic for market availability checks.
 *
 * An availability check is a mandatory skill test that must succeed before
 * a purchase can proceed, triggered by item rarity or restriction level.
 *
 * Rules:
 *   - Items with a restrictionLevel of 'restricted', 'military', or 'illegal' always require a check.
 *   - Legal items (restrictionLevel === 'none') with rarity >= AVAILABILITY_CHECK_RARITY_THRESHOLD
 *     require a Negotiation check.
 *   - Restricted/military/illegal items require a Streetwise check.
 *
 * No Foundry dependencies — accepts plain objects and returns plain values.
 */

import { rarityToDifficulty } from './negotiation.mjs'

/* -------------------------------------------- */
/*  Constants                                   */
/* -------------------------------------------- */

/**
 * Minimum rarity value (inclusive) for a legal item to require an availability check.
 * Stored in config so it can be made GM-configurable in a future version.
 * @type {number}
 */
export const AVAILABILITY_CHECK_RARITY_THRESHOLD = 4

/**
 * Restriction levels that are considered non-legal and always require an availability check.
 * @type {ReadonlyArray<string>}
 */
export const AVAILABILITY_CHECK_RESTRICTED_LEVELS = Object.freeze(['restricted', 'military', 'illegal'])

/**
 * Mapping from availability check trigger type to the canonical skill key required.
 * @type {Readonly<{restriction: string, rarity: string}>}
 */
export const AVAILABILITY_CHECK_SKILLS = Object.freeze({
  restriction: 'streetwise',
  rarity: 'negotiation',
})

/* -------------------------------------------- */
/*  Typedefs                                    */
/* -------------------------------------------- */

/**
 * @typedef {Object} AvailabilityCheckSpec
 * @property {true}   required          Whether a check is required.
 * @property {string} skillKey          Canonical skill key: 'negotiation' or 'streetwise'.
 * @property {number} difficulty        FFG difficulty level (1–5).
 * @property {number} rarity            Item rarity (0–10), used for description context.
 * @property {string} restrictionLevel  Item restriction level, used for description context.
 * @property {string} descriptionKey    i18n key for the narrative description shown in the dialog.
 */

/**
 * @typedef {{ required: false }} AvailabilityCheckNotRequired
 */

/* -------------------------------------------- */
/*  Public API                                  */
/* -------------------------------------------- */

/**
 * Determine whether an availability check is required before purchasing an item.
 *
 * @param {object} params
 * @param {number} params.rarity            Item rarity score (0–10).
 * @param {string} params.restrictionLevel  Item restriction level key (e.g. 'none', 'restricted', 'military', 'illegal').
 * @returns {boolean} True if a check must be passed before the purchase can proceed.
 */
export function isAvailabilityCheckRequired({ rarity, restrictionLevel }) {
  if (AVAILABILITY_CHECK_RESTRICTED_LEVELS.includes(restrictionLevel)) return true
  return restrictionLevel === 'none' && rarity >= AVAILABILITY_CHECK_RARITY_THRESHOLD
}

/**
 * Resolve the full specification for an availability check.
 *
 * Returns `{ required: false }` when no check is needed.
 * Returns a full {@link AvailabilityCheckSpec} when a check is required.
 *
 * An optional `effectiveRarity` may be provided for future contextual rarity support (post-#477).
 * When omitted, `rarity` is used as-is.
 *
 * @param {object} params
 * @param {number}      params.rarity            Base item rarity (0–10).
 * @param {string}      params.restrictionLevel  Item restriction level key.
 * @param {number|null} [params.effectiveRarity]  Optional contextual rarity override (post-#477 slot).
 * @returns {AvailabilityCheckSpec | AvailabilityCheckNotRequired}
 */
export function resolveAvailabilityCheck({ rarity, restrictionLevel, effectiveRarity = null }) {
  const finalRarity = effectiveRarity ?? rarity

  if (!isAvailabilityCheckRequired({ rarity: finalRarity, restrictionLevel })) {
    return { required: false }
  }

  const isRestricted = AVAILABILITY_CHECK_RESTRICTED_LEVELS.includes(restrictionLevel)
  const skillKey = isRestricted ? AVAILABILITY_CHECK_SKILLS.restriction : AVAILABILITY_CHECK_SKILLS.rarity
  const difficulty = rarityToDifficulty(finalRarity)

  const descriptionKey = isRestricted
    ? `MARKET.AvailabilityCheck.Description.${restrictionLevel.charAt(0).toUpperCase()}${restrictionLevel.slice(1)}`
    : 'MARKET.AvailabilityCheck.Description.Rarity'

  return {
    required: true,
    skillKey,
    difficulty,
    rarity: finalRarity,
    restrictionLevel,
    descriptionKey,
  }
}
