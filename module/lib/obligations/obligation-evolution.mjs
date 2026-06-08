/**
 * @typedef {Object} ObligationEvolutionInput
 * Plain-object snapshot of the obligation fields required for evolution operations.
 * No Foundry dependency — callers must map the document before passing it here.
 *
 * @property {number}      value         - The base creation value (≥ 0).
 * @property {number}      campaignDelta - Net campaign adjustment accumulated so far.
 * @property {string|null} campaignNote  - Last recorded narrative note (may be null).
 * @property {string|null} transformedTo - Narrative type the obligation was transformed into (null if not transformed).
 */

/**
 * @typedef {Object} ObligationEvolutionResult
 * Proposed new values for the obligation after an evolution operation.
 * Callers should persist these via `document.update({ 'system.campaignDelta': …, … })`.
 *
 * @property {number}      campaignDelta - Updated net adjustment.
 * @property {string|null} campaignNote  - Updated narrative note.
 * @property {string|null} transformedTo - Updated transformation label (null when not transformed).
 */

/**
 * Compute the effective current value of an obligation, clamped to 0.
 * The effective value is the sum of the base creation value and the campaign delta.
 *
 * @param {ObligationEvolutionInput} obligation Plain obligation snapshot.
 * @returns {number} Non-negative effective value.
 */
export function computeEffectiveValue(obligation) {
  return Math.max(0, obligation.value + obligation.campaignDelta)
}

/**
 * Reduce an obligation value by the given amount.
 *
 * Guards:
 * - `amount` must be a strictly positive integer.
 * - The resulting effective value cannot go below 0; the delta is clamped accordingly.
 *
 * @param {ObligationEvolutionInput} obligation Plain obligation snapshot.
 * @param {number} amount Positive integer reduction amount.
 * @param {string|null} [note=null] Optional narrative note to record with this reduction.
 * @returns {ObligationEvolutionResult} Proposed new field values.
 * @throws {RangeError} If `amount` is not a strictly positive integer.
 */
export function reduceObligation(obligation, amount, note = null) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new RangeError(`reduceObligation: amount must be a strictly positive integer, got ${amount}`)
  }

  const currentEffective = computeEffectiveValue(obligation)
  // Clamp so the effective value never goes below 0.
  const actualReduction = Math.min(amount, currentEffective)
  const newDelta = obligation.campaignDelta - actualReduction

  return {
    campaignDelta: newDelta,
    campaignNote: note ?? obligation.campaignNote,
    transformedTo: obligation.transformedTo,
  }
}

/**
 * Aggravate (increase) an obligation value by the given amount.
 *
 * Guards:
 * - `amount` must be a strictly positive integer.
 *
 * @param {ObligationEvolutionInput} obligation Plain obligation snapshot.
 * @param {number} amount Positive integer aggravation amount.
 * @param {string|null} [note=null] Optional narrative note to record with this aggravation.
 * @returns {ObligationEvolutionResult} Proposed new field values.
 * @throws {RangeError} If `amount` is not a strictly positive integer.
 */
export function aggravateObligation(obligation, amount, note = null) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new RangeError(`aggravateObligation: amount must be a strictly positive integer, got ${amount}`)
  }

  return {
    campaignDelta: obligation.campaignDelta + amount,
    campaignNote: note ?? obligation.campaignNote,
    transformedTo: obligation.transformedTo,
  }
}

/**
 * Transform an obligation into a different narrative type.
 *
 * A transformation records that the problem has changed nature rather than
 * disappearing. The `transformedTo` label must be a non-empty string.
 *
 * Guards:
 * - `transformedTo` must be a non-empty, non-blank string.
 *
 * @param {ObligationEvolutionInput} obligation Plain obligation snapshot.
 * @param {string} transformedTo Non-empty narrative type label for the new obligation nature.
 * @param {string|null} [note=null] Optional narrative note to record with this transformation.
 * @returns {ObligationEvolutionResult} Proposed new field values.
 * @throws {TypeError} If `transformedTo` is not a non-empty string.
 */
export function transformObligation(obligation, transformedTo, note = null) {
  if (typeof transformedTo !== 'string' || transformedTo.trim() === '') {
    throw new TypeError(`transformObligation: transformedTo must be a non-empty string, got ${JSON.stringify(transformedTo)}`)
  }

  return {
    campaignDelta: obligation.campaignDelta,
    campaignNote: note ?? obligation.campaignNote,
    transformedTo: transformedTo.trim(),
  }
}
