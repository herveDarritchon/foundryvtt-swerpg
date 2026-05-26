export const checkDifficulties = {
  10: 'Trivial',
  15: 'Easy',
  20: 'Moderate',
  25: 'Challenging',
  30: 'Difficult',
  35: 'Formidable',
  45: 'Impossible',
}

export const passiveCheck = 10

export const MAX_BOONS = 6
export const MAX_BANES = 6
export const DIE_STEP = 2
export const MIN_DIE = 4
export const MAX_DIE = 12

/**
 * Default margin above DC required for a critical success (standard checks).
 * A roll is a critical success when total > dc + CRITICAL_SUCCESS_THRESHOLD.
 * @type {number}
 */
export const CRITICAL_SUCCESS_THRESHOLD = 6

/**
 * Default margin below DC required for a critical failure (standard checks).
 * A roll is a critical failure when total < dc - CRITICAL_FAILURE_THRESHOLD.
 * @type {number}
 */
export const CRITICAL_FAILURE_THRESHOLD = 6

/**
 * Critical success threshold override for weapons with the "keen" property.
 * Keen weapons score a critical success at a narrower margin (total > dc + 4).
 * @type {number}
 */
export const CRITICAL_SUCCESS_THRESHOLD_KEEN = 4

/**
 * Critical failure threshold override for weapons with the "reliable" property.
 * Reliable weapons score a critical failure only at a wider margin (total < dc - 4).
 * @type {number}
 */
export const CRITICAL_FAILURE_THRESHOLD_RELIABLE = 4
