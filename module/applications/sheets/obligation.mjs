import SwerpgBaseItemSheet from "./base-item.mjs";

/**
 * A SwerpgBaseItemSheet subclass used to configure Items of the "ancestry" type.
 */
export default class ObligationSheet extends SwerpgBaseItemSheet {

    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        item: {
            type: "obligation"
        },
        position: {
            width: 600,
            height: "auto",
        },
        window: {
            minimizable: true,
            resizable: true,
        },
        actions: {
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
        console.log(`ObligationSheet._prepareContext ${context.name}:`, context);
        return context;
    }


    /* -------------------------------------------- */

    /** @override */
    _processFormData(event, form, formData) {
        const submitData = super._processFormData(event, form, formData);
        return submitData;
    }
}
