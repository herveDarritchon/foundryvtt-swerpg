import Characteristic from "./characteristic.mjs";

export default class ErrorCharacteristic extends Characteristic {
    constructor(actor, data, params, options) {
        super(actor, data, params, options);
    }

    /**
     * @inheritDoc
     * @override
     */
    process() {
        this.options.message = ("Process not implemented. Should not be used!");
        return this;
    }

    /**
     * @inheritDoc
     * @override
     */
    async updateState() {
        this.options.message = ("UpdateState not implemented. Should not be used!");
        return new Promise((resolve, _) => {
            resolve(this);
        });
    }
}
