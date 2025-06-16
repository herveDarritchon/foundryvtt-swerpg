import SwerpgBaseItemSheet from "./base-item.mjs";

/**
 * A SwerpgBaseItemSheet subclass used to configure Items of the "armor" type.
 */
export default class GearSheet extends SwerpgBaseItemSheet {

    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        item: {
            type: "gear",
            includesActions: true,
            advancedDescription: true
        }
    };

    // Initialize subclass options
    static {
        this._initializeItemSheetClass()
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        return context;
    }

    /* -------------------------------------------- */
}
