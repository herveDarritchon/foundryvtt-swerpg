import { SYSTEM } from '../config/system.mjs'
import { buildQualitySchema } from './qualities-schema.mjs'
import SwerpgCombatItem from './combat.mjs'

/**
 * Data schema, attributes, and methods specific to Armor type Items.
 */
export default class SwerpgArmor extends SwerpgCombatItem {
  /** @override */
  static ITEM_CATEGORIES = SYSTEM.ARMOR.CATEGORIES

  /** @override */
  static DEFAULT_CATEGORY = 'medium'

  /** @override */
  static ITEM_QUALITIES = SYSTEM.ARMOR.PROPERTIES

  /** @override */
  static LOCALIZATION_PREFIXES = ['ITEM', 'ARMOR']

  /* -------------------------------------------- */
  /*  Data Schema                                 */

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    const fields = foundry.data.fields
    return foundry.utils.mergeObject(super.defineSchema(), {
      defense: new fields.SchemaField({
        base: new fields.NumberField({ integer: true, nullable: false, initial: 0, min: 0 }),
      }),
      qualities: new fields.ArrayField(buildQualitySchema()),
      soak: new fields.SchemaField({
        base: new fields.NumberField({ integer: true, nullable: false, initial: 0, min: 0 }),
      }),
    })
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Weapon configuration data.
   * @type {{category: WeaponCategory, quality: ItemQualityTier, enchantment: ItemEnchantmentTier}}
   */
  config

  /**
   * Item rarity score.
   * @type {number}
   */
  rarity

  /* -------------------------------------------- */

  /**
   * Prepare derived data specific to the weapon type.
   */
  prepareBaseData() {
    // Armor Category
    const categoryId = this.category in SYSTEM.ARMOR.CATEGORIES ? this.category : this.constructor.DEFAULT_CATEGORY
    const category = SYSTEM.ARMOR.CATEGORIES[categoryId]

    // Armor Quality
    const qualities = SYSTEM.QUALITY_TIERS
    const quality = qualities[this.quality] || qualities.standard

    // Armor Configuration
    this.config = { category, quality }
    this.rarity = quality.rarity

    // Armor Defense
    this.defense.base = Math.clamp(this.defense.base, category.defense.min, category.defense.max)
    this.defense.bonus = quality.bonus

    // Dodge Defense
    this.soak.base = Math.clamp(this.soak.base, category.soak.min, category.soak.max)
    this.soak.start = category.soak.start

    // Armor Properties
    for (let q of this.qualities) {
      const prop = SYSTEM.ARMOR.PROPERTIES[q.key]
      if (prop && prop.rarity) this.rarity += prop.rarity
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    if (this.broken) {
      this.defense.base = Math.floor(this.defense.base / 2)
      this.defense.bonus = Math.floor(this.defense.bonus / 2)
      this.rarity -= 2
    }
    this.price = this._preparePrice()
  }

  /* -------------------------------------------- */
  /*  Helper Methods                              */

  /* -------------------------------------------- */

  /**
   * Return an object of string formatted tag data which describes this item type.
   * @param {string} [scope="full"]       The scope of tags being retrieved, "full" or "short"
   * @returns {Object<string, string>}    The tags which describe this weapon
   */
  getTags(scope = 'full') {
    const tags = {}
    tags.category = game.i18n.localize(this.config.category.label)

    if (this.restrictionLevel && this.restrictionLevel !== 'none') {
      tags.restricted = game.i18n.localize(SYSTEM.RESTRICTION_LEVELS[this.restrictionLevel].label)
    }

    for (let q of this.qualities) {
      const prop = SYSTEM.ARMOR.PROPERTIES[q.key]
      if (prop) tags[q.key] = prop.label
    }
    tags.defense = `${this.defense.base + this.defense.bonus} Armor`
    const actor = this.parent.parent
    if (!actor) tags.soak = `${this.soak.base}+ Dodge`
    else {
      const soakBonus = Math.max(actor.system.characteristics.agility.value - this.soak.start, 0)
      tags.soak = `${this.soak.base + soakBonus} Dodge`
      tags.total = `${this.defense.base + this.defense.bonus + this.soak.base + soakBonus} Defense`
    }
    return tags
  }
}
