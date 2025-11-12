/**
 * Clamp a numeric value between min and max bounds.
 * @param {number|string|null|undefined} value - The value to clamp
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {number} defaultValue - Default value if input is invalid
 * @returns {number} Clamped numeric value
 */
export function clampNumber(value, min, max, defaultValue) {
  const numericValue = Number(value)

  if (Number.isNaN(numericValue) || value === null || value === undefined) {
    return defaultValue
  }

  return Math.min(Math.max(numericValue, min), max)
}

/**
 * Sanitize text input to prevent XSS injection.
 * Trims whitespace and neutralizes script tags.
 * @param {string|null|undefined} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return ''
  }

  return text
    .trim()
    .replaceAll(/<script/gi, '&lt;script')
    .replaceAll(/<\/script>/gi, '&lt;/script&gt;')
}
