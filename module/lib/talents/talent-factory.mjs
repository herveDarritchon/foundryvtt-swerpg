import { SYSTEM } from '../../config/system.mjs'
import { logger } from '../../utils/logger.mjs'
import TrainedTalent from '../talents/trained-talent.mjs'
import ErrorTalent from '../talents/error-talent.mjs'
import RankedTrainedTalent from './ranked-trained-talent.mjs'

const DEPR = () => SYSTEM.DEPRECATION.crucible.isCreation

/**
 * @deprecated Crucible legacy — use talent-node/purchase flow via purchaseTalentNode() instead.
 *   Will be removed in a future version.
 *   This factory builds TrainedTalent/RankedTrainedTalent instances for the legacy Crucible
 *   train/forget flow. The V1 Edge system uses purchaseTalentNode() directly.
 */

/**
 * @typedef {Object} Talent
 * @property {SwerpgActor} actor - The actor instance.
 * @property {Talent} data - The talent instance.
 * @property {boolean} isCreation - (deprecated Crucible legacy) Indicates if the talent is in the creation phase.
 * @property {string} action - The action to be performed on the talent.
 * @property {TalentOptions} options - Additional options for the talent.
 *
 **/

/**
 * @typedef {Object} TalentOptions
 * @property
 **/

/**
 * @typedef {Object} TalentParams
 * @property {"train" | "forget"} action the action to be performed on the talent
 * @property {boolean} isCreation whether we are in the creation process phase
 * @property {boolean} [isCareer=false] - Indicates if this is a career talent.
 * @property {boolean} [isSpecialization=false] - Indicates if this is a specialization talent.
 */

/**
 * @deprecated Crucible legacy — use purchaseTalentNode() instead.
 */
export default class TalentFactory {
  /**
   * Builds a talent object based on a context.
   * @param actor {SwerpgActor} an Actor instance
   * @param item {Item} a Swerpg Item instance
   * @param params {TalentParams} the params to be used to build the talent
   * @param params.action
   * @param params.isCreation
   * @param options {TalentOptions} additional options
   * @returns {TrainedTalent|RankedTrainedTalent|ErrorTalent} a talent object
   */
  /**
   * Build a talent domain object.
   * @deprecated Crucible legacy — use purchaseTalentNode() instead.
   * @param {SwerpgActor} actor
   * @param {Item} item
   * @param {TalentParams} params
   * @param {object} [options]
   * @returns {TrainedTalent|RankedTrainedTalent|ErrorTalent}
   */
  static build(actor, item, { action /** @type {"train" | "forget"} */ = 'train', isCreation = false } = {}, options = {}) {
    if (DEPR().warn) {
      logger.deprecated('talent-factory', `TalentFactory.build() called (isCreation=${isCreation})`, 'Use purchaseTalentNode() from talent-node-purchase instead.')
    }

    if (item.type !== 'talent') {
      options.message = `Item dropped (${item.name}) is not a talent!`
      return new ErrorTalent(
        actor,
        item,
        {
          action,
          isCreation: isCreation,
        },
        options,
      )
    }
    const talent = foundry.utils.deepClone(item)

    if (!isCreation) {
      options.message = `You can train or forget a talent only at creation!`
      return new ErrorTalent(
        actor,
        talent,
        {
          action,
          isCreation: isCreation,
        },
        options,
      )
    }

    if (!DEPR().enabled) {
      return new ErrorTalent(
        actor,
        talent,
        { action, isCreation },
        { message: `Talent purchase via TalentFactory is disabled (Crucible legacy). Use specialization-tree instead.` },
      )
    }

    if (talent.system.isRanked) {
      return new RankedTrainedTalent(actor, talent, { action, isCreation }, options)
    }

    return new TrainedTalent(actor, talent, { action, isCreation }, options)
  }
}
