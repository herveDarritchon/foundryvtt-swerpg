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

/**
 * Convertit une valeur XML OggDude en booléen fiable.
 * Supporte les valeurs booléennes, numériques et chaînes.
 * @param {unknown} value
 * @returns {boolean}
 */
export function parseOggDudeBoolean(value) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return ['true', 'yes', 'y', '1', 'on'].includes(normalized)
  }

  return false
}

/**
 * Nettoie la description OggDude en supprimant les balises propriétaires
 * tout en préservant les retours à la ligne significatifs.
 * @param {unknown} description
 * @returns {string}
 */
export function sanitizeOggDudeWeaponDescription(description) {
  if (!description) {
    return ''
  }

  let normalized = String(description)
  normalized = normalized.replaceAll('\r\n', '\n')

  // Conversion des balises de mise en forme OggDude
  normalized = normalized.replaceAll(/\[(?:br|BR)\]/g, '\n')
  normalized = normalized.replaceAll(/\[(?:hr|HR)\]/g, '\n---\n')
  normalized = normalized.replaceAll(/\[\/?h\d+\]/gi, '')
  normalized = normalized.replaceAll(/\[\/?(?:b|i|u|center|left|right)\]/gi, '')
  normalized = normalized.replaceAll(/\[\/?(?:list|ul|ol|li)\]/gi, '')
  normalized = normalized.replaceAll(/\[color=.*?\]/gi, '')
  normalized = normalized.replaceAll(/\[\/color\]/gi, '')

  // Nettoyage des espaces superflus
  normalized = normalized
    .split('\n')
    .map((line) => sanitizeText(line))
    .join('\n')

  normalized = normalized.replaceAll(/\n{3,}/g, '\n\n')

  return sanitizeText(normalized)
}
