import Skill from './skill.mjs'
import ErrorSkill from './error-skill.mjs'
import SkillCostCalculator from './skill-cost-calculator.mjs'

export default class TrainedSkill extends Skill {
  getCost(oldRank) {
    const calculator = new SkillCostCalculator(this)

    if (this.action === 'train') {
      return calculator.calculateCost('train', oldRank + 1)
    }

    if (this.action === 'forget') {
      return calculator.calculateCost('forget', oldRank - 1)
    }

    return 0
  }

  createError(message) {
    return new ErrorSkill(this.actor, this.data, {}, { message })
  }

  async process() {
    const oldRank = this.data.rank.value
    const cost = this.getCost(oldRank)

    let trained = this.data.rank.trained
    let experiencePointsSpent = this.actor.system.progression.experience.spent

    if (this.action === 'train') {
      trained += 1
      experiencePointsSpent += cost
    } else if (this.action === 'forget') {
      trained -= 1
      experiencePointsSpent -= cost
    } else {
      return this.createError(`Unknown skill action: ${this.action}`)
    }

    if (trained < 0) {
      return this.createError("you can't forget this rank because it was not trained!")
    }

    if (experiencePointsSpent < 0) {
      return this.createError("spent experience can't be negative!")
    }

    if (experiencePointsSpent > this.actor.system.progression.experience.total) {
      return this.createError("you can't spend more experience than your total!")
    }

    this.data.rank.trained = trained
    this.data.rank.value = this.computeRankValue()

    if (this.isCreation && this.data.rank.value > 2) {
      return this.createError("you can't have more than 2 ranks at creation!")
    }

    if (!this.isCreation && this.data.rank.value > 5) {
      return this.createError("you can't have more than 5 ranks!")
    }

    this.updateData['system.progression.experience.spent'] = experiencePointsSpent
    this.prepareRankUpdate()

    this.evaluated = true
    return this
  }
}
