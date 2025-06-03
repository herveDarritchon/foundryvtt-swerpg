import WoundsJauge from "./wounds-jauge.mjs";
import StrainJauge from "./strain-jauge.mjs";
import EncumbranceJauge from "./encumbrance-jauge.mjs";

/**
 * @typedef {WoundsJauge | StrainJauge | EncumbranceJauge} JaugeInstance
 */

/**
 * @typedef {Object} JaugeBlock
 * Represents a block in a jauge, typically used to visually represent the state of the jauge.
 *
 * @property {string} cssClass - The CSS class applied to the block, used for styling purposes.
 *
 */

/**
 * @typedef {Object} JaugeDisplayData
 * Represents the data structure used to render a jauge on the character sheet.
 *
 * @property {string} extraCss - The type of jauge (e.g., "wounds", "strain", "encumbrance").
 * @property {string} type - The type of jauge, which is typically the same as `extraCss`.
 * @property {number} value - The current value of the jauge.
 * @property {number} max - The maximum value of the jauge.
 * @property {string} label - The label for the jauge, typically the same as the type.
 * @property {JaugeBlock[]} blocks - An array of blocks representing the jauge's visual state.
 */

export default class JaugeFactory {
    /**
     * Creates a jauge display data object based on the provided parameters.
     * @param {string} type - The type of jauge (e.g., "wounds", "strain", "encumbrance").
     * @param {number} value - The current value of the jauge.
     * @param {number} max - The maximum value of the jauge.
     * @returns {JaugeInstance} The jauge display data object.
     */
    static build(type, value, max) {
        switch (type) {
            case "wounds":
                return new WoundsJauge(value, max);
            case "strain":
                return new StrainJauge(value, max);
            case "encumbrance":
                return new EncumbranceJauge(value, max);
            default:
                throw new Error(`Unknown jauge type: ${type}`);
        }
    }
}