import Talent from './talent.mjs'
import ErrorTalent from './error-talent.mjs'
import TalentCostCalculator from './talent-cost-calculator.mjs'

/**
 * @deprecated Crucible legacy — use purchaseTalentNode() instead.
 *   This class handles train/forget of non-ranked talents using the legacy Crucible flow.
 *   Will be removed in a future version.
 */
export default class TrainedTalent extends Talent {
  constructor(actor, data, params, options) {
    super(actor, data, params, options)
    this.talentCostCalculator = new TalentCostCalculator(this)
  }

  async process() {
    let experiencePointsSpent = this.actor.system.progression.experience.spent
    const talent = this.data
    const row = talent.system.row

    if (this.action === 'train' && this.actor.hasItem(talent.id)) {
      const message = `Talent '${talent.name}' (ID: '${talent.id})' is already owned by the actor.`
      return new ErrorTalent(this.actor, talent, {}, { message: message })
    }

    const alreadyOwned = this.actor.items.some((i) => i.name === talent.name)

    if (alreadyOwned && this.action === 'train') {
      return new ErrorTalent(this.actor, talent, {}, { message: `you already own this talent ('${talent.name}') and it is not a Ranked Talent!` })
    }

    if (!alreadyOwned && this.action === 'forget') {
      return new ErrorTalent(this.actor, talent, {}, { message: `you can't forget a talent ('${talent.name}') you don't own!` })
    }

    let cost
    if (this.action === 'train') {
      cost = this.talentCostCalculator.calculateCost('train', row)
      experiencePointsSpent = experiencePointsSpent + cost
    }

    if (this.action === 'forget') {
      cost = this.talentCostCalculator.calculateCost('forget', row)
      experiencePointsSpent = experiencePointsSpent - cost
      cost = 0
    }

    if (experiencePointsSpent > this.actor.system.progression.experience.total) {
      return new ErrorTalent(this.actor, talent, {}, { message: "you can't spend more experience than your total!" })
    }

    await this.actor.updateExperiencePoints({ spent: experiencePointsSpent })

    talent.system.rank = {
      idx: 0,
      cost: cost,
    }
    this.evaluated = true
    return this
  }

  /**
   * @inheritDoc
   * @override
   */
  async updateState() {
    if (!this.evaluated) {
      return new Promise((resolve, _) => {
        resolve(new ErrorTalent(this.actor, this.data, {}, { message: 'you must evaluate the talent before updating it!' }))
      })
    }
    try {
      if (this.action === 'train') {
        await this.actor.createEmbeddedDocuments('Item', [this.data.toObject()])
      } else {
        const id = this.data.id
        await this.actor.deleteEmbeddedDocuments('Item', [id])
      }
      return this
    } catch (e) {
      return new Promise((resolve, _) => {
        resolve(new ErrorTalent(this.actor, this.data, {}, { message: e.toString() }))
      })
    }
  }
}
