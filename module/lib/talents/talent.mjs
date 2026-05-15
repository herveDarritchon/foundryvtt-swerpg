/**
 * @deprecated Crucible legacy — use talent-node/purchase flow via purchaseTalentNode() instead.
 *   Will be removed in a future version.
 *   This base class and its subclasses implement the Crucible talent train/forget flow.
 *   The V1 Edge system uses purchaseTalentNode() with specialization-tree node cost.
 */
export default class Talent {
  constructor(actor, data, params, options) {
    this.actor = foundry.utils.deepClone(actor)
    this.data = foundry.utils.deepClone(data)
    /** @deprecated Crucible legacy — isCreation is not used in V1 Edge flow */
    this.isCreation = params.isCreation
    this.action = params.action
    this.options = options
    this.evaluated = false
  }

  /**
   * Processes the action on the talent.
   * @abstract
   * return {Talent} the result of the action
   */
  process() {
    throw new Error("Method 'process()' must be implemented.")
  }

  /**
   * Save the talent elements in the Database.
   * @abstract
   * @async
   * return {Promise<Talent>} the result of the action
   */
  async updateState() {
    throw new Error("Method 'updateState()' must be implemented.")
  }
}
