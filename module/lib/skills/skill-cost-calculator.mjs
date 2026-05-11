import TrainedSkill from './trained-skill.mjs'

export default class SkillCostCalculator {
  constructor(skillTransaction) {
    this.skillTransaction = skillTransaction
    this.isSpecialized = this.#skillIsSpecialized()
  }

  /**
   * Pure static cost computation — usable without a TrainedSkill instance.
   * @param {{ action: 'train'|'forget', rankValue: number, isSpecialized: boolean }} param
   * @returns {number} XP cost (positive) or refund (positive, for forget).
   */
  static computeCost({ action, rankValue, isSpecialized }) {
    if (action === 'train') {
      return isSpecialized ? rankValue * 5 : rankValue * 5 + 5
    }

    if (action === 'forget') {
      // forget cost = train cost at (rankAfterDecrease + 1)
      return isSpecialized ? (rankValue + 1) * 5 : (rankValue + 1) * 5 + 5
    }

    return 0
  }

  calculateCost(action, rankValue) {
    if (!(this.skillTransaction instanceof TrainedSkill)) {
      return 0
    }

    if (action === 'train') {
      return this.#calculateTrainCost(rankValue)
    }

    if (action === 'forget') {
      return this.#calculateForgetCost(rankValue)
    }

    return 0
  }

  #calculateTrainCost(rankValue) {
    return SkillCostCalculator.computeCost({ action: 'train', rankValue, isSpecialized: this.isSpecialized })
  }

  #calculateForgetCost(rankAfterDecrease) {
    return SkillCostCalculator.computeCost({ action: 'forget', rankValue: rankAfterDecrease, isSpecialized: this.isSpecialized })
  }

  #skillIsSpecialized() {
    return this.skillTransaction.isCareer || this.skillTransaction.isSpecialization
  }
}
