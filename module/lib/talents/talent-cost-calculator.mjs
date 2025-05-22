import TrainedTalent from "./trained-talent.mjs";
import RankedTrainedTalent from "./ranked-trained-talent.mjs";

/**
 * TalentCostCalculator class
 * This class is used to calculate the cost of a talent.
 *
 */
export default class TalentCostCalculator {
    constructor(talent) {
        this.talent = foundry.utils.deepClone(talent);
    }

    /**
     * Calculate the cost of the talent.
     * @param {string} action - The action to perform.
     * @param {number} rank - The rank of the talent in the tree (row).
     * @returns {number} - The cost of the talent.
     */
    calculateCost(action, rank) {
        let cost = 0;
        if (this.talent instanceof TrainedTalent || this.talent instanceof RankedTrainedTalent) {
            if (action === "train") {
                cost = this.#calculateTrainCost(rank);
            } else if (action === "forget") {
                cost = this.#calculateForgetCost(rank);
            }
        }
        return cost;
    }

    #calculateTrainCost(rank) {
        return rank * 5;
    }

    #calculateForgetCost(rank) {
        return this.#calculateTrainCost(rank);
    }

}