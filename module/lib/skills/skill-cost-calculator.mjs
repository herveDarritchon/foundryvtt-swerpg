import TrainedSkill from './trained-skill.mjs'

export default class SkillCostCalculator {
  constructor(skillTransaction) {
    this.skillTransaction = skillTransaction
    this.isSpecialized = this.#skillIsSpecialized()
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
    const baseCost = rankValue * 5

    if (this.isSpecialized) {
      return baseCost
    }

    return baseCost + 5
  }

  #calculateForgetCost(rankAfterDecrease) {
    return this.#calculateTrainCost(rankAfterDecrease + 1)
  }

  #skillIsSpecialized() {
    return this.skillTransaction.isCareer || this.skillTransaction.isSpecialization
  }
}
