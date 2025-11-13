import { logger } from '../../utils/logger.mjs'

/**
 * Exécute une fonction asynchrone avec retry exponentiel simple.
 * @param {Function} fn - fonction asynchrone à exécuter
 * @param {Object} [options]
 * @param {number} [options.maxAttempts=3]
 * @param {number} [options.initialDelay=100] - ms
 * @param {Function} [options.shouldRetry] - (error)=>boolean pour filtrer erreurs transitoires
 * @returns {Promise<*>}
 */
export async function withRetry(fn, options = {}) {
  const { maxAttempts = 3, initialDelay = 100, shouldRetry = () => true } = options
  let attempt = 0
  let delay = initialDelay
  while (attempt < maxAttempts) {
    try {
      return await fn()
    } catch (e) {
      attempt += 1
      logger.warn('[Retry] Tentative échouée', { attempt, maxAttempts, error: e?.message })
      if (attempt >= maxAttempts || !shouldRetry(e)) throw e
      await new Promise((res) => setTimeout(res, delay))
      delay *= 2
    }
  }
}
