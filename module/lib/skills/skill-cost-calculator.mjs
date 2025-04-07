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
     * @returns {number} - The cost of the skill.
     */
    calculateCost(action) {
        let cost = 0;
        if (this.skill instanceof TrainedSkill) {
            if (action === "train") {
                cost = this.#calculateTrainCost();
            } else if (action === "forget") {
                cost = this.#calculateForgetCost();
            }
        }
        return cost;
    }

    #calculateTrainCost(value = this.skill.skill.rank.value) {
        const baseCost = value * 5;
        if (this.isSpecialized) {
            return baseCost;
        }
        return baseCost + 5;
    }

    #calculateForgetCost() {
        return this.#calculateTrainCost(this.skill.skill.rank.value + 1);
    }

    #skillIsSpecialized() {
        return this.skill.isCareer || this.skill.isSpecialization;
    }
}