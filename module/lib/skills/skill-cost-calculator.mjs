import TrainedSkill from "./trained-skill.mjs";

/**
 * SkillCostCalculator class
 * This class is used to calculate the cost of a skill.
 *
 */
export default class SkillCostCalculator {
    constructor(skill) {
        this.skill = foundry.utils.deepClone(skill);
        this.isSpecialized = this.#skillIsSpecialized();
    }

    /**
     * Calculate the cost of the skill.
     * @param {string} action - The action to perform.
     * @param value
     * @returns {number} - The cost of the skill.
     */
    calculateCost(action, value) {
        let cost = 0;
        if (this.skill instanceof TrainedSkill) {
            if (action === "train") {
                cost = this.#calculateTrainCost(value);
            } else if (action === "forget") {
                cost = this.#calculateForgetCost(value);
            }
        }
        return cost;
    }

    #calculateTrainCost(value) {
        const baseCost = value * 5;
        if (this.isSpecialized) {
            return baseCost;
        }
        return baseCost + 5;
    }

    #calculateForgetCost(value) {
        return this.#calculateTrainCost(value + 1);
    }

    #skillIsSpecialized() {
        return this.skill.isCareer || this.skill.isSpecialization;
    }
}