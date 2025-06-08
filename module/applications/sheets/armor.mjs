import SwerpgBaseItemSheet from "./base-item.mjs";

/**
 * A SwerpgBaseItemSheet subclass used to configure Items of the "armor" type.
 */
export default class ArmorSheet extends SwerpgBaseItemSheet {

    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        item: {
            type: "armor",
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
        Object.assign(context, {
            defenseWidget: this.#defenseWidget.bind(this),
            soakWidget: this.#soakWidget.bind(this),
            propertiesWidget: this.#propertiesWidget.bind(this),
            scaledPrice: new foundry.data.fields.StringField({label: game.i18n.localize("ARMOR.SHEET.SCALED_PRICE")})
        });
        return context;
    }

    /* -------------------------------------------- */

    /**
     * A custom form field widget for rendering armor defense.
     */
    #defenseWidget(field, groupConfig, inputConfig) {
        const config = this.document.system.config.category.defense;
        const {widget, fields} = ArmorSheet.#createWidget(field, groupConfig, inputConfig, config);
        fields.appendChild(ArmorSheet._createElement("label", {innerText: game.i18n.localize("ARMOR.SHEET.ARMOR_BONUS")}));
        const defenseBonus = this.document.system.defense.bonus;
        fields.appendChild(foundry.applications.fields.createNumberInput({value: defenseBonus, disabled: true}));
        return widget;
    }

    /* -------------------------------------------- */

    /**
     * A custom form field widget for rendering dodge defense.
     */
    #soakWidget(field, groupConfig, inputConfig) {
        const config = this.document.system.config.category.soak;
        const {widget, fields} = ArmorSheet.#createWidget(field, groupConfig, inputConfig, config);
        fields.appendChild(ArmorSheet._createElement("label", {innerText: game.i18n.localize("ARMOR.SHEET.DODGE_SCALING")}));
        const soakStart = `${this.document.system.soak.start} ${swerpg.CONST.CHARACTERISTICS.agility.abbreviation}`;
        fields.appendChild(foundry.applications.fields.createTextInput({value: soakStart, disabled: true}));
        return widget;
    }

    /* -------------------------------------------- */

    /**
     * Render the properties field as a multi-checkboxes element.
     * @returns {HTMLMultiCheckboxElement}
     */
    #propertiesWidget(field, groupConfig, inputConfig) {
        inputConfig.name = field.fieldPath;
        inputConfig.options = Object.entries(SYSTEM.ARMOR.PROPERTIES).map(([k, v]) => ({value: k, label: v.label}));
        inputConfig.type = "checkboxes";
        return foundry.applications.fields.createMultiSelectInput(inputConfig);
    }

    /* -------------------------------------------- */

    /**
     * Logic common to both the armor and dodge widgets.
     * @returns {widget: HTMLDivElement, fields: HTMLDivElement}
     */
    static #createWidget(field, groupConfig, inputConfig, config) {
        const widget = ArmorSheet._createElement("div", {className: "form-group slim defense"});
        widget.appendChild(ArmorSheet._createElement("label", {innerText: field.label}));
        const fields = widget.appendChild(ArmorSheet._createElement("div", {className: "form-fields"}));
        fields.appendChild(ArmorSheet._createElement("label", {innerText: field.fields.base.label}));
        fields.appendChild(field.fields.base.toInput({value: inputConfig.value.base}));
        return {widget, fields}
    }
}
