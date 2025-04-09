export default class Skill {
    constructor(actor, data, params, options) {
        this.actor = foundry.utils.deepClone(actor);
        this.data = foundry.utils.deepClone(data);
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
    process() {
        throw new Error("Method 'process()' must be implemented.");
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