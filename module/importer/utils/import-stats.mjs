// Re-export helpers from text.mjs for backward compatibility
export { clampNumber, sanitizeText } from './text.mjs'

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
    if (!this._customSets.has(setKey)) {
      this._customSets.set(setKey, new Set())
    }
    this._customSets.get(setKey).add(detail)

    // Update counter to reflect the actual size of the set (unique entries)
    this._stats[key] = this._customSets.get(setKey).size
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
