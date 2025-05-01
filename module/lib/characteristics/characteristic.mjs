export default class Characteristic {
    constructor(actor, data, params, options) {
        this.actor = foundry.utils.deepClone(actor);
        this.data = foundry.utils.deepClone(data);
        this.isCreation = params.isCreation;
        this.action = params.action;
        this.options = options;
        this.evaluated = false;
    }

    /**
     * Processes the action on the characteristic.
     * @abstract
     * return {Characteristic} the result of the action
     */
    process() {
        throw new Error("Method 'process()' must be implemented.");
    }

    /**
     * Save the characteristic elements in the Database.
     * @abstract
     * @async
     * return {Promise<Characteristic>} the result of the action
     */
    async updateState() {
        throw new Error("Method 'updateState()' must be implemented.");
    }
}