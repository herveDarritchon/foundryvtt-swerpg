/**
 * Generic Import Statistics Class
 * Handles common metrics for OggDude data import.
 */
export class ImportStats {
  constructor(initialStats = {}) {
    this._stats = {
      total: 0,
      rejected: 0,
      rejectionReasons: [],
      ...initialStats,
    }
    this._customSets = new Map()
  }

  /**
   * Reset statistics to initial state
   * @param {object} initialStats - Optional initial stats to reset to
   */
  reset(initialStats = {}) {
    this._stats = {
      total: 0,
      rejected: 0,
      rejectionReasons: [],
      ...initialStats,
    }
    this._customSets.clear()
  }

  /**
   * Increment a numeric statistic
   * @param {string} key - The statistic key to increment
   * @param {number} amount - Amount to increment by (default: 1)
   */
  increment(key, amount = 1) {
    if (typeof this._stats[key] === 'undefined') {
      this._stats[key] = 0
    }
    if (typeof this._stats[key] === 'number') {
      this._stats[key] += amount
    }
  }

  /**
   * Add a unique detail to a set-based statistic
   * @param {string} key - The statistic key (e.g., 'unknownSkills')
   * @param {string} detail - The unique detail to add (e.g., skill code)
   * @param {string} setKey - The key for the set in the output object (e.g., 'skillDetails')
   */
  addDetail(key, detail, setKey) {
    this.increment(key)
    
    if (!this._customSets.has(setKey)) {
      this._customSets.set(setKey, new Set())
    }
    this._customSets.get(setKey).add(detail)
  }

  /**
   * Add a rejection reason
   * @param {string} reason - The reason for rejection
   */
  addRejectionReason(reason) {
    this._stats.rejectionReasons.push(reason)
  }

  /**
   * Get the current statistics
   * @returns {object} The statistics object
   */
  getStats() {
    const stats = {
      ...this._stats,
      imported: this._stats.total - this._stats.rejected,
    }

    // Add custom sets as arrays
    for (const [key, set] of this._customSets.entries()) {
      stats[key] = Array.from(set)
    }

    return stats
  }
}

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
 * Sanitize text to prevent HTML injection
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
}
