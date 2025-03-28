import SwerpgBaseItemSheet from "./base-item.mjs";

/**
 * A SwerpgBaseItemSheet subclass used to configure Items of the "ancestry" type.
 */
export default class SpeciesSheet extends SwerpgBaseItemSheet {

    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        item: {
            type: "species"
        },
        position: {
            width: 600,
            height: "auto",
        },
        window: {
            minimizable: true,
            resizable: true,
        },
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

    /** @override */
    _processFormData(event, form, formData) {
        const submitData = super._processFormData(event, form, formData);
        return submitData;
    }
}
