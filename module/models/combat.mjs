import SwerpgAction from "./action.mjs";
import SwerpgPhysicalItem from "./physical.mjs";

/**
 * A data structure which is shared by all physical items.
 */
export default class SwerpgCombatItem extends SwerpgPhysicalItem {
    static defineSchema() {
        const fields = foundry.data.fields;
        return foundry.utils.mergeObject(super.defineSchema(), {
            hardPoints: new fields.NumberField({required: true, nullable: false, integer: true, initial: 0, min: 0}),
            equipped: new fields.BooleanField(),
        });
    }

    /**
     * Allowed categories for this item type.
     * @type {Record<string, {id: string, label: string}>}
     */
    static ITEM_CATEGORIES;

    /**
     * The default category for new items of this type
     * @type {string}
     */
    static DEFAULT_CATEGORY = "";

    /**
     * Define the set of property tags which can be applied to this item type.
     * @type {string[]}
     */
    static ITEM_PROPERTIES = [];

    /* -------------------------------------------- */

    _preparePrice() {
        const rarity = this.rarity;
        if (rarity < 0) return Math.floor(this.price / Math.abs(rarity - 1));
        else return this.price * Math.pow(rarity + 1, 3);
    }
}
