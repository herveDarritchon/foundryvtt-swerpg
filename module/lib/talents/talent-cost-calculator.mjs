import { SYSTEM } from '../../config/system.mjs'
import { logger } from '../../utils/logger.mjs'
import TrainedTalent from './trained-talent.mjs'

const DEPR = () => SYSTEM.DEPRECATION.crucible.rankTimes5

/**
 * TalentCostCalculator class
 *
 * @deprecated Crucible legacy — use nodeData.cost from specialization-tree instead.
 *   Will be removed in a future version.
 *   This class calculates talent cost as rank * 5, a pattern inherited from Crucible.
 *   The V1 Edge system uses the cost defined on the specialization-tree node.
 */
export default class TalentCostCalculator {
  constructor(talent) {
    this.talent = foundry.utils.deepClone(talent)
  }

  /**
   * Calculate the cost of the talent.
   * @deprecated Crucible legacy — use nodeData.cost from specialization-tree instead.
   *   Will be removed in a future version.
   * @param {string} action The action to perform.
   * @param {number} rank The rank of the talent in the tree (row).
   * @returns {number} - The cost of the talent.
   */
  calculateCost(action, rank) {
    if (DEPR().warn) {
      logger.deprecated('talent-cost-calculator', 'rank * 5 cost calculation', 'Use node-based cost from specialization-tree instead.')
    }
    if (!DEPR().enabled) return 0

    let cost = 0
    if (this.talent instanceof TrainedTalent) {
      if (action === 'train') {
        cost = this.#calculateTrainCost(rank)
      } else if (action === 'forget') {
        cost = this.#calculateForgetCost(rank)
      }
    }
    return cost
  }

  /** @deprecated Crucible legacy */
  #calculateTrainCost(rank) {
    return rank * 5
  }

  /** @deprecated Crucible legacy */
  #calculateForgetCost(rank) {
    return this.#calculateTrainCost(rank)
  }
}
