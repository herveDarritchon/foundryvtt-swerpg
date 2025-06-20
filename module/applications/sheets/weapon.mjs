import SwerpgBaseItemSheet from "./base-item.mjs";

/**
 * A SwerpgBaseItemSheet subclass used to configure Items of the "weapon" type.
 */
export default class WeaponSheet extends SwerpgBaseItemSheet {

    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        item: {
            type: "weapon",
            includesActions: true,
            advancedDescription: true,
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
        const allowedSlots = this.document.system.getAllowedEquipmentSlots();
        Object.assign(context, {

            qualitiesWidget: this.#qualitiesWidget.bind(this),
            scaledPrice: new foundry.data.fields.StringField({label: game.i18n.localize("WEAPON.SHEET.SCALED_PRICE")}),
            animations: SYSTEM.WEAPON.ANIMATION_TYPES.reduce((obj, v) => {
                obj[v] = v;
                return obj;
            }, {})
        });
        return context;
    }

    /* -------------------------------------------- */

    /**
     * Render the properties field as a multi-checkboxes element.
     * @returns {HTMLMultiCheckboxElement}
     */
    #qualitiesWidget(field, groupConfig, inputConfig) {
        inputConfig.name = field.fieldPath;
        inputConfig.options = Object.entries(SYSTEM.WEAPON.QUALITIES).map(([k, v]) => ({value: k, label: v.label}));
        inputConfig.type = "checkboxes";
        return foundry.applications.fields.createMultiSelectInput(inputConfig);
    }
}
