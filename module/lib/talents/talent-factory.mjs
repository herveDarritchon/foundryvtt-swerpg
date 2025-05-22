import TrainedTalent from "../talents/trained-talent.mjs";
import ErrorTalent from "../talents/error-talent.mjs";
import RankedTrainedTalent from "./ranked-trained-talent.mjs";

/**
 * @typedef {Object} Talent
 * @property {SwerpgActor} actor - The actor instance.
 * @property {Talent} data - The talent instance.
 * @property {boolean} isCreation - Indicates if the talent is in the creation phase.
 * @property {string} action - The action to be performed on the talent.
 * @property {TalentOptions} options - Additional options for the talent.
 *
 **/

/**
 * @typedef {Object} TalentOptions
 **/

/**
 * @typedef {Object} TalentParams
 * @property {"train" | "forget"} action the action to be performed on the talent
 * @property {boolean} isCreation whether we are in the creation process phase
 * @property {boolean} [isCareer=false] - Indicates if this is a career talent.
 * @property {boolean} [isSpecialization=false] - Indicates if this is a specialization talent.
 */

export default class TalentFactory {

    /**
     * Builds a talent object based on a context.
     * @param actor {SwerpgActor} an Actor instance
     * @param item {Item} a Swerpg Item instance
     * @param params {TalentParams} the params to be used to build the talent
     * @param options {TalentOptions} additional options
     * @returns {TrainedTalent|RankedTrainedTalent|ErrorTalent} a talent object
     */
    static build(
        actor,
        item,
        {
            action /** @type {"train" | "forget"} */ = ("train"),
            isCreation = false,
        } = {},
        options = {}) {

        if (item.type !== "talent") {
            options.message = `Item dropped (${item.name}) is not a talent!`;
            return new ErrorTalent(actor, item, {
                action,
                isCreation: isCreation,
            }, options);
        }
        const talent = foundry.utils.deepClone(item);

        if (!isCreation) {
            options.message = `You can train or forget a talent only at creation!`;
            return new ErrorTalent(actor, talent, {
                action,
                isCreation: isCreation,
            }, options);
        }

        if (talent.system.isRanked) {
            return new RankedTrainedTalent(actor, talent, {action, isCreation}, options);
        }

        return new TrainedTalent(actor, talent, {action, isCreation}, options);
    }

}