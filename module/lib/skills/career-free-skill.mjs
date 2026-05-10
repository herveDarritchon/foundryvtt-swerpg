import ErrorSkill from './error-skill.mjs'
import Skill from './skill.mjs'

export default class CareerFreeSkill extends Skill {
  getCost() {
    return 0
  }

  createError(message) {
    return new ErrorSkill(this.actor, this.data, {}, { message })
  }

  async process() {
    const career = this.actor.system.progression.freeSkillRanks.career

    const careerFreeRankGained = career.gained
    let careerFreeRankSpent = career.spent
    let careerFree = this.data.rank.careerFree

    if (this.action === 'train') {
      careerFree += 1
      careerFreeRankSpent += 1
    } else if (this.action === 'forget') {
      careerFree -= 1
      careerFreeRankSpent -= 1
    } else {
      return this.createError(`Unknown skill action: ${this.action}`)
    }

    const careerFreeRankAvailable = careerFreeRankGained - careerFreeRankSpent

    if (careerFree < 0) {
      return this.createError("you can't forget this career free rank because this skill has no career free rank!")
    }

    if (careerFree > 1) {
      return this.createError("you can't use more than 1 career free skill rank into the same skill!")
    }

    if (careerFreeRankSpent < 0) {
      return this.createError("career free skill ranks spent can't be negative!")
    }

    if (careerFreeRankAvailable < 0) {
      return this.createError('you cannot use more career free skill ranks. You have used them all!')
    }

    if (careerFreeRankAvailable > careerFreeRankGained) {
      return this.createError(`you can't get more than ${careerFreeRankGained} career free skill ranks!`)
    }

    this.data.rank.careerFree = careerFree
    this.data.rank.value = this.computeRankValue()

    this.updateData['system.progression.freeSkillRanks.career.spent'] = careerFreeRankSpent
    this.prepareRankUpdate()

    this.evaluated = true
    return this
  }
}
