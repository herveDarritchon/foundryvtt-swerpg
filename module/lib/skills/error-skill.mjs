import Skill from './skill.mjs'

export default class ErrorSkill extends Skill {
  getCost() {
    return 0
  }

  process() {
    return this
  }

  async updateState() {
    return this
  }

  createError(message) {
    this.options.message = message
    return this
  }
}
