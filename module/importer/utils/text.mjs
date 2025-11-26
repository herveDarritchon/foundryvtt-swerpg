import { logger } from '../../utils/logger.mjs'

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
