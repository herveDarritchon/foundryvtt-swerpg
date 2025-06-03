/**
 * @abstract
 * @typedef {Object} AbstractJauge
 * @property {number} value
 * @property {number} max
 * @method create() => JaugeDisplayData
 */
export class AbstractJauge {
    constructor(value, max) {
        if (new.target === AbstractJauge) {
            throw new TypeError("Cannot instantiate AbstractJauge directly");
        }
        this.value = value;
        this.max = max;
    }

    /**
     * @returns {JaugeDisplayData}
     */
    create() {
        return {
            extraCss: this.constructor.TYPE,
            type: this.constructor.TYPE,
            label: this.constructor.TYPE,
            value: this.value,
            max: this.max,
            blocks: Array.from({length: this.max}, (_, i) => ({
                cssClass: i < this.value ? "active" : "inactive"
            }))
        };
    }
}
