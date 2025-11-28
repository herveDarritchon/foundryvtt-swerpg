import { logger } from '../../utils/logger.mjs'

/**
 * Clamp a number between min and max
 * @param {*} value - The value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} defaultValue - Default value if input is invalid
 * @returns {number} The clamped value
 */
export function clampNumber(value, min, max, defaultValue = 0) {
  const num = parseInt(value)
  if (isNaN(num)) {
    return defaultValue
  }
  return Math.max(min, Math.min(max, num))
}

/**
 * Sanitize text to prevent HTML injection (basic sanitization)
 * For rich text with markup, use sanitizeDescription instead.
 * @param {string} str - The string to sanitize
 * @returns {string} The sanitized string
 */
export function sanitizeText(str) {
  if (!str || typeof str !== 'string') {
    return ''
  }

  return str
    .trim()
    .replace(/<script/gi, '&lt;script')
    .replace(/<\/script>/gi, '&lt;/script&gt;')
    .replace(/<style/gi, '&lt;style')
    .replace(/<\/style>/gi, '&lt;/style&gt;')
}

/**
 * Nettoie et sanitize une description riche en conservant une typographie lisible.
 * Empêche l'injection de code HTML/JS et harmonise les espaces sans détruire la structure.
 *
 * @param {string} description - Description brute
 * @param {number} maxLength - Longueur maximale (défaut: 2000)
 * @param {{preserveLineBreaks?: boolean}} [options]
 * @returns {string} Description nettoyée
 */
export function sanitizeDescription(description, maxLength = 2000, { preserveLineBreaks = true } = {}) {
  if (!description) {
    return ''
  }

  try {
    let cleaned = String(description)

    // Normaliser les retours chariot avant nettoyage
    cleaned = cleaned.replace(/\r\n/g, '\n')

    // Supprimer les balises script et style
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

    if (preserveLineBreaks) {
      // Réduire les espaces horizontaux consécutifs mais conserver les retours à la ligne
      cleaned = cleaned.replace(/[ \t]+/g, ' ')
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
    } else {
      cleaned = cleaned.replace(/\s+/g, ' ')
    }

    cleaned = cleaned.trim()

    if (cleaned.length > maxLength) {
      cleaned = `${cleaned.substring(0, maxLength - 3).trimEnd()}...`
    }

    return cleaned
  } catch (error) {
    logger.error('[TextUtils] Error sanitizing description', { error })
    return ''
  }
}
