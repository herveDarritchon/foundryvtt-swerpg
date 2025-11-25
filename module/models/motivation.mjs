/**
 * Data schema, attributes, and methods specific to Motivation type Items.
 */
export default class SwerpgMotivation extends foundry.abstract.TypeDataModel {
  /* -------------------------------------------- */
  /*  Data Schema                                 */

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    const fields = foundry.data.fields
    const schema = {}

    schema.description = new fields.HTMLField({ required: false, initial: undefined })
    schema.category = new fields.StringField({ required: false, initial: '' })

    return schema
  }

  /** @override */
  static LOCALIZATION_PREFIXES = ['MOTIVATION']

  /** @override */
  static get metadata() {
    return {
      label: 'Motivation',
      img: 'systems/swerpg/assets/icons/motivation.svg',
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static validateJoint(data) {}
}
