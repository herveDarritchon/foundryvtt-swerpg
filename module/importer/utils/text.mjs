import { logger } from '../../utils/logger.mjs'

/**
 * Nettoie et sanitize une description de talent
 * Empêche l'injection de code HTML/JS et normalise les espaces
 * @param {string} description - Description brute
 * @param {number} maxLength - Longueur maximale (défaut: 2000)
 * @returns {string} Description nettoyée
 */
export function sanitizeDescription(description, maxLength = 2000) {
    if (!description) {
        return ''
    }

    try {
        let cleaned = String(description)

        // Supprimer les balises script et style
        cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

        // Normaliser les espaces multiples
        cleaned = cleaned.replace(/\s+/g, ' ')

        // Trim
        cleaned = cleaned.trim()

        // Limiter la longueur
        if (cleaned.length > maxLength) {
            cleaned = cleaned.substring(0, maxLength - 3) + '...'
        }

        return cleaned
    } catch (error) {
        logger.error('[TalentDieModifiersMap] Error sanitizing description:', error)
        return ''
    }
}
