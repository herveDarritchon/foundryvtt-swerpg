import SwerpgActorType from './actor-type.mjs'

/**
 * Data schema, attributes, and methods specific to Adversary type Actors.
 */
export default class SwerpgAdversary extends SwerpgActorType {
  /* -------------------------------------------- */
  /*  Data Schema                                 */

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = super.defineSchema()

    // Advancement
    schema.advancement = new fields.SchemaField({
      level: new fields.NumberField({
        ...requiredInteger,
        initial: 0,
        min: -5,
        max: 24,
        label: 'ADVANCEMENT.Level',
      }),
      threat: new fields.StringField({ required: true, choices: SYSTEM.THREAT_LEVELS, initial: 'normal' }),
    })

    schema.details = new fields.SchemaField({
      biography: new fields.SchemaField({
        appearance: new fields.HTMLField(),
        public: new fields.HTMLField(),
        private: new fields.HTMLField(),
      }),
    })

    // Adversaries do not track ability advancement
    for (const characteristicField of Object.values(schema.characteristics.fields)) {
      delete characteristicField.fields.base
      delete characteristicField.fields.trained
    }

    // Adversaries only use active resource pools
    for (const resource of Object.values(SYSTEM.RESOURCES)) {
      if (resource.type !== 'active') delete schema.resources.fields[resource.id]
    }
    return schema
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */

  /* -------------------------------------------- */

  /** @override */
  prepareBaseData() {
    this.size = 3 + this.details.size
    this.#prepareBaseMovement()
    super.prepareBaseData()
  }

  /* -------------------------------------------- */

  /**
   * Prepare base movement attributes that are defined by the Adversary's Taxonomy.
   */
  #prepareBaseMovement() {
    const m = this.movement
    const size = 3
    const stride = 10
    m.size = size + m.sizeBonus
    m.stride = stride + m.strideBonus
  }

  /* -------------------------------------------- */

  /**
   * Prepare character details for the Adversary subtype specifically.
   * @override
   */
  _prepareDetails() {
    let { level, threat } = this.advancement

    // Compute threat level
    const threatConfig = SYSTEM.THREAT_LEVELS[threat]
    this.advancement.threatFactor = threatConfig?.scaling || 1
    let threatLevel = Math.floor(level * this.advancement.threatFactor)
    if (level === 0) threatLevel = -6
    else if (level < 0) threatLevel = Math.floor(level / this.advancement.threatFactor)
    this.advancement.threatLevel = threatLevel

    // TODO: Automatic skill progression rank (temporary)
    this.advancement._autoSkillRank = Math.clamp(Math.ceil(threatLevel / 6), 0, 5)
    this.advancement.maxAction = threatConfig.actionMax
  }

  /* -------------------------------------------- */

  /**
   * Prepare a single skill for the Adversary subtype specifically.
   * @override
   */
  _prepareSkill(skillId, skill) {
    skill.rank = this.advancement._autoSkillRank
    super._prepareSkill(skillId, skill)
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _prepareMovement() {
    super._prepareMovement()
    this.movement.engagement += Math.max(this.movement.size - 3, 0)
  }
}
