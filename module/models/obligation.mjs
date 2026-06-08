/**
 * Data schema, attributes, and methods specific to Obligation type Items.
 *
 * An Obligation represents a personal debt or responsibility taken on by a character.
 * Characters may voluntarily take on extra obligations (isExtra = true) in exchange
 * for bonus starting credits or experience points, following the Star Wars FFG rules.
 */
export default class SwerpgObligation extends foundry.abstract.TypeDataModel {
  /* -------------------------------------------- */
  /*  Data Schema                                 */

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    const fields = foundry.data.fields
    const schema = {}

    schema.description = new fields.HTMLField({ required: false, initial: undefined })

    schema.value = new fields.NumberField({
      required: true,
      integer: true,
      nullable: false,
      min: 0,
      max: 50,
      initial: 10,
      step: 5,
    })

    schema.isExtra = new fields.BooleanField({
      required: false,
      nullable: false,
      initial: false,
    })

    schema.extraXp = new fields.NumberField({
      required: true,
      integer: true,
      nullable: false,
      min: 0,
      max: 20,
      initial: 0,
      step: 5,
    })

    schema.extraCredits = new fields.NumberField({
      required: true,
      integer: true,
      nullable: false,
      min: 0,
      max: 5000,
      initial: 0,
      step: 500,
    })

    // Campaign evolution fields — distinct from character-creation bonuses.
    // campaignDelta: net change applied in campaign (negative = reduction, positive = aggravation).
    schema.campaignDelta = new fields.NumberField({
      required: true,
      integer: true,
      nullable: false,
      min: -50,
      max: 50,
      initial: 0,
    })

    // campaignNote: narrative justification for the latest evolution (GM/player note).
    schema.campaignNote = new fields.StringField({
      required: false,
      nullable: true,
      initial: null,
      blank: false,
    })

    // transformedTo: when an Obligation changes nature, this stores the new narrative type.
    schema.transformedTo = new fields.StringField({
      required: false,
      nullable: true,
      initial: null,
      blank: false,
    })

    return schema
  }

  /** @override */
  static LOCALIZATION_PREFIXES = ['OBLIGATION']

  /* -------------------------------------------- */

  /**
   * Joint validation for the Obligation data model.
   *
   * No cross-field constraint is enforced at this level: field-level constraints
   * (min/max/integer) are already declared in defineSchema(). This override is
   * intentionally a no-op and is kept to document that joint validation was
   * considered and found unnecessary for the current rule set.
   *
   * @inheritdoc
   */
  static validateJoint(data) {
    // No cross-field invariants to enforce.
  }
}
