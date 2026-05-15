import Talent from './talent.mjs'

/**
 * @deprecated Crucible legacy — used only by TalentFactory in the legacy flow.
 *   Will be removed in a future version.
 */
export default class ErrorTalent extends Talent {
  constructor(actor, data, params, options) {
    super(actor, data, params, options)
  }

  /**
   * @inheritDoc
   * @override
   */
  process() {
    this.options.message = 'Process not implemented. Should not be used!'
    return this
  }

  /**
   * @inheritDoc
   * @override
   */
  async updateState() {
    this.options.message = 'UpdateState not implemented. Should not be used!'
    return new Promise((resolve, _) => {
      resolve(this)
    })
  }
}
