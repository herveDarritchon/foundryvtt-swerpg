import SwerpgActorType from './actor-type.mjs'
import { logger } from '../utils/logger.mjs'
import SwerpgSpeciality from './speciality.mjs'
import { SwerpgSpecies } from './_module.mjs'
import SwerpgCareer from './career.mjs'
import SwerpgSpecialization from './specialization.mjs'
import { getSkillPurchaseState } from '../utils/skill-costs.mjs'

/**
 * @typedef {Object} Experience
 * @property {number} spent - The number of experience points spent
 * @property {number} gained - The number of experience points gained
 * @property {number} [startingExperience] - Derived (not persisted): species starting XP, populated during prepareBaseData
 * @property {number} [obligationXpBonus] - Derived (not persisted): total extra XP granted by obligations
 * @property {number} [total] - Derived (not persisted): startingExperience + gained + obligationXpBonus
 * @property {number} [available] - Derived (not persisted): total - spent
 */

/**
 * @typedef {Object} Progression
 * @property {FreeSkillRanks} freeSkillRanks - The free skill ranks
 * @property {Experience} experience - The experience
 */

/**
 * @typedef {Object} CareerFreeRank
 * @property {string} id - The id of the career
 * @property {string} name - The name of the career
 * @property {number} spent - The number of ranks spent
 * @property {number} gained - The number of ranks gained at creation
 * @property {number} available - The maximum number of ranks available to spend
 */

/**
 * @typedef {Object} SpecializationFreeRank
 * @property {string} id - The id of the specialization
 * @property {string} name - The name of the specialization
 * @property {number} spent - The number of ranks spent
 * @property {number} gained - The number of ranks gained at creation
 * @property {number} available - The maximum number of ranks available to spend
 */

/**
 * @typedef {Object} FreeSkillRanks
 * @property {CareerFreeRank} career - The career free ranks
 * @property {SpecializationFreeRank} specialization - The specialization free ranks
 */

/**
 * Data schema, attributes, and methods specific to Character type Actors.
 */
export default class SwerpgCharacter extends SwerpgActorType {
  /* -------------------------------------------- */
  /*  Data Schema                                 */

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = super.defineSchema()

    // Extra validation for abilities
    for (const characteristicField of Object.values(schema.characteristics.fields)) {
      characteristicField.options.validate = SwerpgCharacter.#validateAttribute
    }

    // Experience/Advancement
    schema.progression = new fields.SchemaField({
      freeSkillRanks: new fields.SchemaField({
        career: new fields.SchemaField({
          id: new fields.StringField({ required: true, initial: '' }),
          name: new fields.StringField({ required: true, initial: '' }),
          spent: new fields.NumberField(
            {
              required: true,
              integer: true,
              initial: 0,
              min: 0,
              max: 2000,
              step: 1,
            },
            { label: 'EXPERIENCE.FreeSkillRank.Spent' },
          ),
          gained: new fields.NumberField(
            {
              required: true,
              integer: true,
              initial: 0,
              min: 0,
              max: 2000,
              step: 1,
            },
            { label: 'EXPERIENCE.FreeSkillRank.Gained' },
          ),
        }),
        specialization: new fields.SchemaField({
          id: new fields.StringField({ required: true, initial: '' }),
          name: new fields.StringField({ required: true, initial: '' }),
          spent: new fields.NumberField(
            {
              required: true,
              integer: true,
              initial: 0,
              min: 0,
              max: 2000,
              step: 1,
            },
            { label: 'EXPERIENCE.FreeSkillRank.Spent' },
          ),
          gained: new fields.NumberField(
            {
              required: true,
              integer: true,
              initial: 0,
              min: 0,
              max: 2000,
              step: 1,
            },
            { label: 'EXPERIENCE.FreeSkillRank.Gained' },
          ),
        }),
      }),
      experience: new fields.SchemaField({
        spent: new fields.NumberField(
          {
            required: true,
            integer: true,
            initial: 0,
            min: 0,
            max: 2000,
            step: 1,
          },
          { label: 'EXPERIENCE.Spent' },
        ),
        gained: new fields.NumberField(
          {
            required: true,
            integer: true,
            initial: 0,
            min: 0,
            max: 2000,
            step: 1,
          },
          { label: 'EXPERIENCE.Gained' },
        ),
      }),
      talentPurchases: new fields.ArrayField(
        new fields.SchemaField({
          treeId: new fields.StringField({ required: true, blank: false }),
          treeUuid: new fields.StringField({ required: false, nullable: true, blank: false, initial: null }),
          nodeId: new fields.StringField({ required: true, blank: false }),
          talentId: new fields.StringField({ required: true, blank: false }),
          talentUuid: new fields.StringField({ required: false, nullable: true, blank: false, initial: null }),
          specializationId: new fields.StringField({ required: true, blank: false }),
        }),
        { required: false, initial: [] },
      ),
    })

    schema.details = new fields.SchemaField({
      species: new fields.SchemaField(
        {
          name: new fields.StringField({ blank: false }),
          img: new fields.StringField(),
          ...SwerpgSpecies.defineSchema(),
        },
        { required: true, nullable: true, initial: null },
      ),
      career: new fields.SchemaField(
        {
          name: new fields.StringField({ blank: false }),
          img: new fields.StringField(),
          ...SwerpgCareer.defineSchema(),
        },
        { required: true, nullable: true, initial: null },
      ),
      specializations: new fields.SetField(
        new fields.SchemaField({
          specializationId: new fields.StringField({ required: false, blank: false, initial: undefined }),
          treeUuid: new fields.DocumentUUIDField({ type: 'Item', required: false, nullable: true, initial: undefined }),
          name: new fields.StringField({ blank: false }),
          img: new fields.StringField(),
          ...SwerpgSpecialization.defineSchema(),
        }),
        { required: true, nullable: false, initial: [] },
      ),
      specialities: new fields.ArrayField(
        new fields.SchemaField({
          ...SwerpgSpeciality.defineSchema(),
        }),
        { required: true, nullable: true, initial: null },
      ),

      biography: new fields.SchemaField({
        notableFeatures: new fields.HTMLField({
          required: false,
          initial: undefined,
        }),
        age: new fields.StringField({ required: false, initial: undefined }),
        gender: new fields.StringField({ required: false, initial: undefined }),
        height: new fields.StringField({ required: false, initial: undefined }),
        build: new fields.StringField({ required: false, initial: undefined }),
        hair: new fields.StringField({ required: false, initial: undefined }),
        eyes: new fields.StringField({ required: false, initial: undefined }),
        public: new fields.HTMLField(),
        private: new fields.HTMLField(),
      }),

      commitments: new fields.SchemaField({
        motivation: new fields.HTMLField(),
      }),
    })

    return schema
  }

  /* -------------------------------------------- */

  /**
   * @override
   */
  _prepareExperience() {
    super._prepareExperience()
    const e = this.progression.experience
    e.obligationXpBonus = SwerpgCharacter.#computeObligationBonusExperience(this.parent)
    e.total = e.total + e.obligationXpBonus
    e.available = e.total - e.spent
    logger.debug(`[character-sheet] _prepareExperience - experience for ${this.parent.name} is :`, this.progression.experience)
  }

  /* -------------------------------------------- */

  /**
   * Return the wound threshold bonus sourced from the character's species.
   * Reads `details.species.woundThreshold.modifier` and defaults to 0 when no
   * species is set or the modifier is absent.
   *
   * @override
   * @returns {number}
   */
  _getWoundThresholdBonus() {
    return this.details.species?.woundThreshold?.modifier ?? 0
  }

  /* -------------------------------------------- */

  /**
   * Return the strain threshold bonus sourced from the character's species.
   * Reads `details.species.strainThreshold.modifier` and defaults to 0 when no
   * species is set or the modifier is absent.
   *
   * @override
   * @returns {number}
   */
  _getStrainThresholdBonus() {
    return this.details.species?.strainThreshold?.modifier ?? 0
  }

  /* -------------------------------------------- */

  /**
   * Validate an attribute field
   * @param actor
   */
  static #computeObligationBonusExperience(actor) {
    return actor.items.filter((item) => item.type === 'obligation' && item.system.isExtra === true).reduce((total, item) => total + item.system.extraXp, 0)
  }

  /* -------------------------------------------- */

  /**
   * Validate an attribute field
   * @param {{base: number, trained: number, bonus: number}} attr     The attribute value
   */
  static #validateAttribute(attr) {
    if (attr.value < 1 || attr.value > 6) throw new Error(`Characteristic cannot be lower than 1 and cannot exceed 6`)
  }

  /* -------------------------------------------- */
  /*  Derived Attributes                          */
  /* -------------------------------------------- */

  /**
   * Advancement points that are available to spend and have been spent.
   * @type {{
   *   ability: {pool: number, total: number, bought: number, spent: number, available: number },
   *   skill: {total: number, spent: number, available: number },
   *   talent: {total: number, spent: number, available: number }
   * }}
   */
  points

  /**
   * Character actor size.
   * @type {number}
   */
  size

  /* -------------------------------------------- */
  /*  Data Preparation                            */

  /* -------------------------------------------- */

  /** @override */
  prepareBaseData() {
    this.size = 3 + (this.details?.size || 0)
    this.#prepareSpecies()
    this.#prepareCareer()
    this.#prepareSpecializations()
    this.#prepareBaseMovement()
    super.prepareBaseData()
  }

  /* -------------------------------------------- */

  /**
   * Prepare base movement attributes.
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
   * Prepare character details for the Character subtype specifically.
   * @override
   */
  _prepareDetails() {
    if (!this.details.species) {
      const speciesDefaults = swerpg.api.models.SwerpgSpecies.schema.getInitialValue()
      this.details.species = this.schema.getField('details.species').initialize(speciesDefaults)
    }

    if (!this.details.career) {
      const careerDefaults = swerpg.api.models.SwerpgCareer.schema.getInitialValue()
      this.details.career = this.schema.getField('details.career').initialize(careerDefaults)
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare abilities data for the Character subtype specifically.
   * @override
   */
  #prepareSpecies() {
    const species = this.details.species

    for (let a in SYSTEM.CHARACTERISTICS) {
      const characteristic = this.characteristics[a]
      characteristic.rank.base = species?.characteristics[a] || 1
      characteristic.rank.value = Math.clamp(characteristic.rank.base + characteristic.rank.trained + characteristic.rank.bonus, 1, 6)
    }

    this._applyFreeSkillSpecies(this.skills)

    this.progression.experience.startingExperience = species?.startingExperience || 0
  }

  /* -------------------------------------------- */
  /**
   * Prepare skills data for Character Actor subtypes.
   * @protected
   * @param {Set<Object>} skills The skills object to prepare
   */
  _applyFreeSkillSpecies(skills) {
    Object.entries(skills).forEach(([skillId, skill]) => {
      if (this.details.species?.freeSkills?.has(skillId)) {
        skill.rank.base = 1
      }
    })
  }

  /* -------------------------------------------- */

  /**
   * Prepare a single skill for the Character subtype specifically.
   * Enriches with purchase state, free rank status, and next rank cost.
   * @inheritDoc
   */
  _prepareSkill(skillId, skill) {
    super._prepareSkill(skillId, skill)

    const freeStatus = this.#getFreeSkillStatus(skillId)
    skill.freeRank = {
      isCareer: freeStatus.isCareer,
      isSpecialization: freeStatus.isSpecialization,
    }

    const progression = this.progression
    const isCreation = this.parent?.isL0 ?? false
    const purchaseState = getSkillPurchaseState({
      rank: skill.rank.value,
      isCareer: freeStatus.isCareer,
      isSpecialization: freeStatus.isSpecialization,
      availableXp: progression.experience.available,
      freeCareerSkillsLeft: progression.freeSkillRanks.career.available,
      freeSpecializationSkillsLeft: progression.freeSkillRanks.specialization.available,
      careerFreeRank: skill.rank.careerFree,
      specializationFreeRank: skill.rank.specializationFree,
      maxRank: isCreation ? SYSTEM.SKILLS.MAX_RANK_AT_CREATION : SYSTEM.SKILLS.MAX_RANK,
    })

    skill.nextRank = purchaseState.nextRank
    skill.nextCost = purchaseState.nextCost
    skill.purchaseReason = purchaseState.reason
    skill.isFreePurchase = purchaseState.isFreePurchase
    skill.canPurchase = purchaseState.canPurchase
  }

  /* -------------------------------------------- */

  /**
   * Determine whether a skill is a free career or specialization skill.
   * @param {string} skillId
   * @returns {{ isCareer: boolean, isSpecialization: boolean }}
   */
  #getFreeSkillStatus(skillId) {
    const career = this.details.career
    const isCareer = career ? Array.from(career.careerSkills || []).some((s) => s.id === skillId) : false

    const specializations = Array.from(this.details.specializations)
    const isSpecialization = specializations.some((spec) => Array.from(spec.specializationSkills || []).some((s) => s.id === skillId))

    return { isCareer, isSpecialization }
  }

  /* -------------------------------------------- */

  /**
   * Prepare abilities data for the Character subtype specifically.
   * @override
   */
  #prepareSpecializations() {
    let totalFreeRanks = 0
    for (const specialization of Array.from(this.details.specializations)) {
      totalFreeRanks += specialization?.freeSkillRank || 0
    }

    this.progression.freeSkillRanks.specialization.gained = totalFreeRanks
  }

  /* -------------------------------------------- */

  /**
   * Prepare abilities data for the Character subtype specifically.
   * @override
   */
  #prepareCareer() {
    const career = this.details.career
    this.progression.freeSkillRanks.career.gained = career?.freeSkillRank || 0
  }

  /* -------------------------------------------- */

  /**
   * Preparation of resource pools for the Character subtype specifically.
   * @inheritDoc
   */
  _prepareResources() {
    super._prepareResources()
    const r = this.resources

    // Wounds
    r.wounds.max = Math.ceil(1.5 * r.wounds.threshold)
    r.wounds.value = Math.clamp(r.wounds.value, 0, r.wounds.max)

    // Madness
    r.strain.max = Math.ceil(1.5 * r.strain.threshold)
    r.strain.value = Math.clamp(r.strain.value, 0, r.strain.max)
  }

  /* -------------------------------------------- */
  /*  Helper Methods                              */

  /* -------------------------------------------- */

  /**
   * Apply a Species item to this Character Actor.
   * @param {SwerpgItem} species     The species Item to apply to the Actor.
   * @returns {Promise<void>}
   */
  async applySpecies(species) {
    const actor = this.parent
    await actor._applyDetailItem(species, {
      // TODO Change this when points are used for experience
      // canApply: actor.isL0 && !actor.points.ability.spent,
      canApply: true,
      // CanClear: actor.isL0
      canClear: true,
    })
  }

  /**
   * Apply a Career item to this Character Actor.
   * @param {SwerpgCareer} career     The career Item to apply to the Actor.
   * @returns {Promise<void>}
   */
  async applyCareer(career) {
    const actor = this.parent
    await actor._applyDetailItem(career, {
      // TODO Change this when points are used for experience
      // canApply: actor.isL0 && !actor.points.ability.spent,
      canApply: true,
      // CanClear: actor.isL0
      canClear: true,
    })
  }

  /**
   * Apply a Specialization item to this Character Actor.
   * @param {SwerpgSpeciality} specialization     The specialization Item to apply to the Actor.
   * @returns {Promise<void>}
   */
  async applySpecialization(specialization) {
    const actor = this.parent
    await actor._applyDetailItem(specialization, {
      // TODO Change this when points are used for experience
      // canApply: actor.isL0 && !actor.points.ability.spent,
      canApply: true,
      // CanClear: actor.isL0
      canClear: true,
      isCollection: true,
      collectionKey: 'specializations',
    })
  }

  /**
   * Acquire a specialization post-creation without granting free skill ranks.
   * Used by the specialization purchase flow (drop on character sheet).
   *
   * Differs from applySpecialization by zeroing freeSkillRank to prevent
   * free skill rank attribution during prepareBaseData.
   *
   * @param {object} specialization The specialization Item to acquire
   * @param {object} [options]                Options
   * @param {number} [options.xpCost=0]        XP cost to deduct in the same update
   * @returns {Promise<void>}
   */
  async acquireSpecialization(specialization, { xpCost = 0 } = {}) {
    const actor = this.parent
    const itemData = specialization.toObject()

    const acquiredSpecialization = {
      ...itemData.system,
      name: itemData.name,
      img: itemData.img,
      freeSkillRank: 0,
    }

    const specializations = Array.from(this.details.specializations)
    const updateData = {
      'system.details.specializations': [...specializations, acquiredSpecialization],
    }

    if (xpCost > 0) {
      updateData['system.progression.experience.spent'] = (this.progression.experience.spent || 0) + xpCost
    }

    await actor.update(updateData, { keepEmbeddedIds: true })
  }

  /**
   * Remove a specialization post-creation.
   *
   * Retire la spécialisation correspondant à la clé fournie de la liste
   * des spécialisations possédées. Ne gère pas le fallback de l'arbre
   * courant — ce recalage est assuré par la couche applicative.
   *
   * @param {string} specializationKey - Clé de la spécialisation à retirer
   *        (specializationId, treeUuid, ou name)
   * @returns {Promise<void>}
   */
  async removeSpecialization(specializationKey) {
    const actor = this.parent
    const specializations = Array.from(this.details.specializations)
    const remaining = specializations.filter((spec) => {
      const key = spec.specializationId || spec.treeUuid || spec.name
      return key !== specializationKey
    })

    await actor.update(
      {
        'system.details.specializations': remaining,
      },
      { keepEmbeddedIds: true },
    )
  }
}
