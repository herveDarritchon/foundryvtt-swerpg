/**
 * Pure domain helpers for serializing and deserializing market consequences to/from actor flags.
 *
 * Consequences are stored as plain objects under `flags.swerpg.marketConsequences` (array).
 * Each serialized consequence is a flat, JSON-safe record with no circular references.
 *
 * No Foundry dependencies — all inputs/outputs are plain values.
 *
 * @module consequence-persistence
 */

import { CONSEQUENCE_TYPES } from './consequences.mjs'

/* -------------------------------------------- */
/*  Constants                                   */
/* -------------------------------------------- */

/**
 * The set of valid consequence type keys.
 * Used for validation during deserialization.
 * @type {ReadonlySet<string>}
 */
const VALID_CONSEQUENCE_TYPES = new Set(Object.values(CONSEQUENCE_TYPES))

/* -------------------------------------------- */
/*  Typedefs                                    */
/* -------------------------------------------- */

/**
 * @typedef {Object} SerializedConsequence
 * @property {string}  type           Consequence type key (one of CONSEQUENCE_TYPES).
 * @property {string}  descriptionKey i18n key for the description.
 * @property {boolean} automatic      Whether the consequence was automatic.
 * @property {boolean} playerChoice   Whether the consequence was a player choice.
 * @property {object}  [metadata]     Optional extra data (amount, vendorName, itemName, etc.).
 * @property {string}  dateAccepted   ISO 8601 timestamp of when the consequence was accepted.
 * @property {string}  [actorId]      ID of the actor who accepted the consequence.
 */

/* -------------------------------------------- */
/*  Public API                                  */
/* -------------------------------------------- */

/**
 * Serialize a MarketConsequence into a flat, JSON-safe record suitable for storage as an actor flag.
 *
 * The serialized form adds `dateAccepted` (ISO timestamp) and an optional `actorId`.
 *
 * @param {import('./consequences.mjs').MarketConsequence} consequence  Consequence to serialize.
 * @param {object} [options]
 * @param {string} [options.actorId]  ID of the actor accepting the consequence.
 * @returns {SerializedConsequence}
 * @throws {TypeError} If consequence is not an object or is missing a valid `type`.
 */
export function serializeConsequence(consequence, { actorId } = {}) {
  if (!consequence || typeof consequence !== 'object') {
    throw new TypeError('serializeConsequence: consequence must be a non-null object')
  }
  if (!VALID_CONSEQUENCE_TYPES.has(consequence.type)) {
    throw new TypeError(`serializeConsequence: unknown consequence type "${consequence.type}"`)
  }

  return {
    type: consequence.type,
    descriptionKey: consequence.descriptionKey ?? '',
    automatic: consequence.automatic === true,
    playerChoice: consequence.playerChoice === true,
    metadata: consequence.metadata ? { ...consequence.metadata } : {},
    dateAccepted: new Date().toISOString(),
    ...(actorId !== undefined ? { actorId } : {}),
  }
}

/**
 * Deserialize an array of stored flag records back into MarketConsequence-shaped objects.
 *
 * Invalid or unrecognized records are silently filtered out (graceful degradation).
 * Returns an empty array when given null/undefined or an empty array.
 *
 * @param {unknown} serialized  The value stored under `flags.swerpg.marketConsequences`.
 * @returns {SerializedConsequence[]}
 */
export function deserializeConsequences(serialized) {
  if (!Array.isArray(serialized)) return []

  return serialized.filter((record) => {
    if (!record || typeof record !== 'object') return false
    if (!VALID_CONSEQUENCE_TYPES.has(record.type)) return false
    if (typeof record.dateAccepted !== 'string') return false
    return true
  })
}

/**
 * Read all stored market consequences from an actor's flags.
 *
 * Accepts a Foundry actor (or any object with a `getFlag(scope, key)` method).
 * Returns an empty array when no consequences are stored or the actor is absent.
 *
 * @param {object} actor  A Foundry Actor document (or compatible object with `getFlag`).
 * @returns {SerializedConsequence[]}
 */
export function getMarketConsequences(actor) {
  if (!actor || typeof actor.getFlag !== 'function') return []
  const stored = actor.getFlag('swerpg', 'marketConsequences')
  return deserializeConsequences(stored)
}

/**
 * Remove all stored consequences of a given type from an actor's flags.
 *
 * Accepts a Foundry actor (must have `getFlag` and `setFlag`).
 * Returns without error when no consequences of that type are stored.
 *
 * @param {object} actor   A Foundry Actor document (must have `getFlag` / `setFlag`).
 * @param {string} type    Consequence type key to remove.
 * @returns {Promise<void>}
 */
export async function clearMarketConsequence(actor, type) {
  if (!actor || typeof actor.getFlag !== 'function' || typeof actor.setFlag !== 'function') return
  const existing = deserializeConsequences(actor.getFlag('swerpg', 'marketConsequences'))
  const filtered = existing.filter((c) => c.type !== type)
  await actor.setFlag('swerpg', 'marketConsequences', filtered)
}
