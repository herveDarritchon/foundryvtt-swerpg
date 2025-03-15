/**
 * Increment or decrement a value within a range, controlling the final value inside the range.
 * @param {number} initialValue Initial value to be incremented or decremented.
 * @param {number} step Increment or decrement value.
 * @param {number} min Minimum value. Initial value will not minimal number.
 * @param {number} max Maximum value. Initial value will be the maximum number.
 * @returns The new value. If the new value is greater than the maximum value, the maximum value is returned. If the new value is less than the minimum value, the minimum value is returned.
 */
export function shiftValue(initialValue, step, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
    return Math.min(Math.max(initialValue + step, min), max);
}