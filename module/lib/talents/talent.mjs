export default class Talent {
    constructor(actor, data, params, options) {
        this.actor = foundry.utils.deepClone(actor);
        this.data = foundry.utils.deepClone(data);
        this.isCreation = params.isCreation;
        this.action = params.action;
        this.options = options;
        this.evaluated = false;
    }

    /**
     * Processes the action on the talent.
     * @abstract
     * return {Talent} the result of the action
     */
    process() {
        throw new Error("Method 'process()' must be implemented.");
    }

    /**
     * Save the talent elements in the Database.
     * @abstract
     * @async
     * return {Promise<Talent>} the result of the action
     */
    async updateState() {
        throw new Error("Method 'updateState()' must be implemented.");
    }
}