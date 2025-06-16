import SwerpgPhysicalItem from "./physical.mjs";
import {SYSTEM} from "../config/system.mjs";

/**
 * Data schema, attributes, and methods specific to Armor type Items.
 */
export default class SwerpgGear extends SwerpgPhysicalItem {

    /** @override */
    static LOCALIZATION_PREFIXES = ["ITEM", "GEAR"];

    /* -------------------------------------------- */
    /*  Data Schema                                 */

    /* -------------------------------------------- */

    /** @inheritDoc */
    static defineSchema() {
        return super.defineSchema();
    }

    /* -------------------------------------------- */
    /*  Data Preparation                            */
    /* -------------------------------------------- */

    /**
     * Weapon configuration data.
     * @type {{category: WeaponCategory, quality: ItemQualityTier, enchantment: ItemEnchantmentTier}}
     */
    config;

    /**
     * Item rarity score.
     * @type {number}
     */
    rarity;

    /* -------------------------------------------- */

    /**
     * Prepare derived data specific to the weapon type.
     */
    prepareBaseData() {
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    prepareDerivedData() {
        if (this.broken) {
            this.defense.base = Math.floor(this.defense.base / 2);
            this.defense.bonus = Math.floor(this.defense.bonus / 2);
            this.rarity -= 2;
        }
        this.price = this._preparePrice();
    }

    /* -------------------------------------------- */
    /*  Helper Methods                              */

    /* -------------------------------------------- */

    /**
     * Return an object of string formatted tag data which describes this item type.
     * @param {string} [scope="full"]       The scope of tags being retrieved, "full" or "short"
     * @returns {Object<string, string>}    The tags which describe this weapon
     */
    getTags(scope = "full") {
        const tags = {};
        return tags;
    }
}
