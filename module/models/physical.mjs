import SwerpgAction from './action.mjs'
import { SYSTEM } from '../config/system.mjs'
/**
 * A data structure which is shared by all physical items.
 */
export default class SwerpgPhysicalItem extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    return {
      category: new fields.StringField({
        required: true,
        choices: this.ITEM_CATEGORIES,
        initial: this.DEFAULT_CATEGORY,
      }),
      quantity: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 1, min: 0 }),
      price: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
      quality: new fields.StringField({ required: true, choices: SYSTEM.QUALITY_TIERS, initial: 'standard' }),
      restrictionLevel: new fields.StringField({ required: true, choices: SYSTEM.RESTRICTION_LEVELS, initial: 'none' }),
      encumbrance: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 1, min: 0 }),
      rarity: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 1, min: 0 }),
      broken: new fields.BooleanField({ initial: false }),
      description: new fields.SchemaField({
        public: new fields.HTMLField(),
        secret: new fields.HTMLField(),
      }),
      actions: new fields.ArrayField(new fields.EmbeddedDataField(SwerpgAction)),
    }
  }

  /**
   * Allowed categories for this item type.
   * @type {Record<string, {id: string, label: string}>}
   */
  static ITEM_CATEGORIES

  /**
   * The default category for new items of this type
   * @type {string}
   */
  static DEFAULT_CATEGORY = ''

  /**
   * Define the set of property tags which can be applied to this item type.
   * @type {string[]}
   */
  static ITEM_PROPERTIES = []

  /* -------------------------------------------- */

  _preparePrice() {
    const rarity = this.rarity
    if (rarity < 0) return Math.floor(this.price / Math.abs(rarity - 1))
    else return this.price * Math.pow(rarity + 1, 3)
  }
}
