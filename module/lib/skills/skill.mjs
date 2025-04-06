/**
 * @typedef {Object} SkillResult
 * @property {boolean} success - Indicates whether the skill creation was successful.
 * @property {CareerFreeSkill|SpecializationFreeSkill|TrainedSkill|ErrorSkill} [data] - The created skill instance.
 * @property {string|null} [error] - An error message if skill creation failed.
 */

export default class Skill {
    constructor(actor, skill, params, options) {
        this.actor = foundry.utils.deepClone(actor);
        this.skill = foundry.utils.deepClone(skill);
        this.isCreation = params.isCreation;
        this.isCareer = params.isCareer;
        this.isSpecialization = params.isSpecialization;
        this.action = params.action;
        this.options = options;
        this.evaluated = false;
    }

    /**
     * Processes the action on the skill.
     * @abstract
     * return {Skill} the result of the action
     */
    train() {
        throw new Error("Method 'train()' must be implemented.");
    }

    /**
     * Processes the action on the skill.
     * @abstract
     * return {Skill} the result of the action
     */
    forget() {
        throw new Error("Method 'forget()' must be implemented.");
    }

    /**
     * Evaluate the skill.
     * @abstract
     * return {Skill} the result of the action
     */
    evaluate() {
        throw new Error("Method 'evaluate()' must be implemented.");
    }

    /**
     * Save the skill elements in the Database.
     * @abstract
     * @async
     * return {Promise<Skill>} the result of the action
     */
    async updateState() {
        throw new Error("Method 'updateState()' must be implemented.");
    }

    /**
     * Compute the free skill rank available.
     * @abstract
     * @private
     * return {number} the free skill rank available
     */
    #computeFreeSkillRankAvailable() {
        throw new Error("Method 'computeFreeSkillRankAvailable' must be implemented.");
    }
}