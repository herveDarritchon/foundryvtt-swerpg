export default class Skill {
  constructor(actor, data, params = {}, options = {}) {
    // Important: do not deepClone a Foundry Document.
    // Keep the live Actor reference and clone only mutable skill data.
    this.actor = actor
    this.data = foundry.utils.deepClone(data)

    this.isCreation = params.isCreation ?? false
    this.isCareer = params.isCareer ?? false
    this.isSpecialization = params.isSpecialization ?? false
    this.action = params.action ?? 'train'

    this.options = options
    this.evaluated = false

    /**
     * Flat Foundry update payload prepared by process().
     * updateState() is the only method allowed to persist it.
     *
     * @type {Record<string, unknown>}
     */
    this.updateData = {}
  }

  /**
   * Evaluates the transaction and prepares updateData.
   * Must not persist anything.
   *
   * @abstract
   * @returns {Promise<Skill>|Skill}
   */
  process() {
    throw new Error("Method 'process()' must be implemented.")
  }

  /**
   * Persists the evaluated transaction in one Actor update.
   *
   * @returns {Promise<Skill>}
   */
  async updateState() {
    if (!this.evaluated) {
      return this.createError('you must evaluate the skill before updating it!')
    }

    try {
      await this.actor.update(this.updateData)
      return this
    } catch (error) {
      return this.createError(error.toString())
    }
  }

  /**
   * Returns the XP cost or refund amount for this transaction.
   * Free skill transactions return 0 by default.
   *
   * @param {number} _oldRank
   * @returns {number}
   */
  getCost(_oldRank) {
    return 0
  }

  /**
   * Recomputes the total skill rank from rank components.
   *
   * @returns {number}
   */
  computeRankValue() {
    return this.data.rank.base + this.data.rank.careerFree + this.data.rank.specializationFree + this.data.rank.trained
  }

  /**
   * Prepares the skill rank update path.
   */
  prepareRankUpdate() {
    this.updateData[`system.skills.${this.data.id}.rank`] = this.data.rank
  }

  /**
   * Creates an ErrorSkill without importing it in the base class.
   * Subclasses override if needed.
   *
   * @param {string} message
   * @returns {Error}
   */
  createError(message) {
    throw new Error(message)
  }
}
