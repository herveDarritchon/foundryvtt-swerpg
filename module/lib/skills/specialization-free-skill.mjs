import Skill from './skill.mjs'
import ErrorSkill from './error-skill.mjs'

export default class SpecializationFreeSkill extends Skill {
  getCost() {
    return 0
  }

  createError(message) {
    return new ErrorSkill(this.actor, this.data, {}, { message })
  }

  async process() {
    const specialization = this.actor.system.progression.freeSkillRanks.specialization

    const specializationFreeRankGained = specialization.gained
    let specializationFreeRankSpent = specialization.spent
    let specializationFree = this.data.rank.specializationFree

    if (this.action === 'train') {
      specializationFree += 1
      specializationFreeRankSpent += 1
    } else if (this.action === 'forget') {
      specializationFree -= 1
      specializationFreeRankSpent -= 1
    } else {
      return this.createError(`Unknown skill action: ${this.action}`)
    }

    const specializationFreeRankAvailable = specializationFreeRankGained - specializationFreeRankSpent

    if (specializationFree < 0) {
      return this.createError("you can't forget this specialization free rank because this skill has no specialization free rank!")
    }

    if (specializationFree > 1) {
      return this.createError("you can't use more than 1 specialization free skill rank into the same skill!")
    }

    if (specializationFreeRankSpent < 0) {
      return this.createError("specialization free skill ranks spent can't be negative!")
    }

    if (specializationFreeRankAvailable < 0) {
      return this.createError('you cannot use more specialization free skill ranks. You have used them all!')
    }

    if (specializationFreeRankAvailable > specializationFreeRankGained) {
      return this.createError(`you can't get more than ${specializationFreeRankGained} specialization free skill ranks!`)
    }

    this.data.rank.specializationFree = specializationFree
    this.data.rank.value = this.computeRankValue()

    this.updateData['system.progression.freeSkillRanks.specialization.spent'] = specializationFreeRankSpent
    this.prepareRankUpdate()

    this.evaluated = true
    return this
  }
}
