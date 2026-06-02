import SwerpgActorType from './actor-type.mjs'
import { logger } from '../utils/logger.mjs'
import SwerpgSpeciality from './speciality.mjs'
import { SwerpgSpecies } from './_module.mjs'
import SwerpgCareer from './career.mjs'
import SwerpgSpecialization from './specialization.mjs'
import { getSkillPurchaseState } from '../utils/skill-costs.mjs'
import ObligationBonusCalculator from '../lib/obligations/obligation-bonus-calculator.mjs'
import { STARTING_CREDITS } from '../config/progression.mjs'
import { computeCreditBudget } from '../lib/credits/credit-calculator.mjs'

/**
 * Tracks experience points for a Character actor.
 *
 * Convention — persisted vs. derived fields
 * ------------------------------------------
 * Only `spent` and `gained` are part of the Foundry schema and are written to
 * the database. All other fields on this object are computed at runtime during
 * `prepareDerivedData` and are never saved. They enrich the prepared data object
 * for sheet rendering and skill-cost calculations without widening the schema.
 *
 * Persisted (schema fields, saved to database):
 * @typedef {Object} Experience
 * @property {number} spent  - XP already spent on skills, talents, etc. Persisted.
 * @property {number} gained - XP explicitly awarded to the character. Persisted.
 *
 * Derived (not persisted — computed in `_prepareExperience` and friends):
 * @property {number} startingExperience - Species starting XP. Set in `#prepareSpecies()` from `details.species.startingExperience`. Not persisted.
 * @property {number} obligationXpBonus  - Extra XP granted by "extra" obligation items. Set in `SwerpgCharacter._prepareExperience()`. Not persisted.
 * @property {number} total              - Full XP pool: `startingExperience + gained + obligationXpBonus`. Not persisted.
 * @property {number} available          - Remaining spendable XP: `total - spent`. Not persisted.
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

    // Credits — persisted integer balance, always >= 0
    schema.credits = new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 0,
      min: 0,
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
      /**
       * Canonical source for all owned specializations.
       *
       * Persisted as a Set of specialization entries; each entry is normalised
       * by `getOwnedSpecializations` from `module/lib/specializations/owned-specializations.mjs`
       * before being consumed by business-layer code.
       *
       * This field is the single source of truth for "what specializations does
       * the character own". The currently displayed tree key
       * (`SpecializationTreeApp#selectedTreeKey`) is a UI-only display context
       * and must never influence ownership nor cost calculations.
       */
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
   * Enrich the experience object with Character-specific derived fields.
   *
   * This method runs after `SwerpgActorType._prepareExperience()`, which already
   * sets the base derived fields (`startingExperience`, `total`, `available`) from
   * the species data. Here we layer in the Character-only obligation bonus before
   * recomputing `total` and `available`.
   *
   * All fields written here are derived (not persisted). They extend the prepared
   * data object in memory and are never written back to the database. See the
   * `Experience` typedef above for the full list of persisted vs. derived fields.
   *
   * @override
   */
  _prepareExperience() {
    // Base pass: sets startingExperience, total = startingExperience + gained, available = total - spent.
    super._prepareExperience()

    const e = this.progression.experience

    // Derived (not persisted): extra XP from obligation items marked as "extra".
    const obligationData = SwerpgCharacter.#extractObligationData(this.parent)
    e.obligationXpBonus = ObligationBonusCalculator.computeObligationBonusXp(obligationData)

    // Derived (not persisted): final XP pool and remaining budget, incorporating the obligation bonus.
    e.total = e.total + e.obligationXpBonus
    e.available = e.total - e.spent

    logger.debug(`[character-sheet] _prepareExperience - experience for ${this.parent.name} is :`, this.progression.experience)
  }

  /* -------------------------------------------- */

  /**
   * Return the additive wound bonus sourced from the character's species.
   *
   * `details.species.woundThreshold.modifier` is the species-specific additive
   * contribution to the wound threshold formula. It is **not** the final wound
   * threshold — the absolute final value is computed in
   * `SwerpgActorType.#calculateWoundThreshold` as:
   *   `brawn rank + _getWoundThresholdBonus()`
   * and written to `resources.wounds.threshold`.
   *
   * Note: there is no intermediate `thresholds.wounds` field on the Character
   * model. The only runtime output consumed by the rest of the system is
   * `resources.wounds.threshold`.
   *
   * @override
   * @returns {number} Additive bonus from the species formula. Defaults to 0 when no species is set.
   */
  _getWoundThresholdBonus() {
    return this.details.species?.woundThreshold?.modifier ?? 0
  }

  /* -------------------------------------------- */

  /**
   * Return the additive strain bonus sourced from the character's species.
   *
   * `details.species.strainThreshold.modifier` is the species-specific additive
   * contribution to the strain threshold formula. It is **not** the final strain
   * threshold — the absolute final value is computed in
   * `SwerpgActorType.#calculateStrainThreshold` as:
   *   `willpower rank + _getStrainThresholdBonus()`
   * and written to `resources.strain.threshold`.
   *
   * Note: there is no intermediate `thresholds.strain` field on the Character
   * model. The only runtime output consumed by the rest of the system is
   * `resources.strain.threshold`.
   *
   * @override
   * @returns {number} Additive bonus from the species formula. Defaults to 0 when no species is set.
   */
  _getStrainThresholdBonus() {
    return this.details.species?.strainThreshold?.modifier ?? 0
  }

  /* -------------------------------------------- */

  /**
   * Extract obligation data as plain objects from a Foundry actor's items.
   * This is the Foundry-adapter bridge: maps Item documents → plain ObligationBonusInput objects
   * that the pure domain ObligationBonusCalculator can consume without Foundry dependencies.
   *
   * @param {SwerpgActor} actor The parent actor whose items are searched.
   * @returns {{ isExtra: boolean, extraCredits: number, extraXp: number }[]} Plain obligation data.
   */
  static #extractObligationData(actor) {
    return actor.items
      .filter((item) => item.type === 'obligation')
      .map((item) => ({
        isExtra: item.system.isExtra,
        extraCredits: item.system.extraCredits,
        extraXp: item.system.extraXp,
      }))
  }

  /**
   * Prepare the full credit budget for the character.
   *
   * All fields written here are derived (not persisted). They extend the prepared
   * data object in memory and are never written back to the database.
   *
   * Derived fields set on `this.progression.credits`:
   * - `starting`       — base starting credits (STARTING_CREDITS constant, always 500)
   * - `obligationBonus`— extra credits from obligation items marked as "extra"
   * - `totalStarting`  — sum of starting + obligationBonus
   *
   * Derived field set on `this.creditBudget` (full budget breakdown):
   * - `startingCredits`   — base pool
   * - `obligationBonus`   — obligation bonus applied
   * - `manualAdjustment`  — system.credits persisted value (GM adjustments: rewards, fines, etc.)
   * - `totalBudget`       — startingCredits + obligationBonus + manualAdjustment
   * - `totalSpent`        — sum of (price × quantity) for all owned physical items
   * - `availableCredits`  — totalBudget − totalSpent (can be negative = debt)
   * - `isOverBudget`      — availableCredits < 0
   */
  _prepareCredits() {
    const obligationData = SwerpgCharacter.#extractObligationData(this.parent)
    const obligationBonus = ObligationBonusCalculator.computeObligationBonusCredits(obligationData)

    // Derived (not persisted): credits breakdown for character creation display.
    this.progression.credits = {
      starting: STARTING_CREDITS,
      obligationBonus,
      totalStarting: STARTING_CREDITS + obligationBonus,
    }

    // Derived (not persisted): full credit budget including owned items and manual adjustments.
    // Read _source (schema raw values, before prepareDerivedData() overrides) so that a broken
    // _preparePrice() on an item cannot propagate NaN into the credit calculation.
    const ownedItems = this.parent.items
      .filter((item) => ['weapon', 'armor', 'gear'].includes(item.type))
      .map((item) => ({
        price: item.system._source?.price ?? item.system.price ?? 0,
        quantity: item.system._source?.quantity ?? item.system.quantity ?? 1,
      }))

    const nanItems = ownedItems.filter((i) => !Number.isFinite(i.price))
    if (nanItems.length > 0) {
      logger.warn(`[SwerpgCharacter] _prepareCredits - item with NaN price detected for ${this.parent.name}`, nanItems)
    }

    this.creditBudget = computeCreditBudget({
      startingCredits: STARTING_CREDITS,
      obligationBonusCredits: obligationBonus,
      manualAdjustment: this.credits,
      ownedItems,
    })

    logger.debug(`[SwerpgCharacter] _prepareCredits - credits for ${this.parent.name}:`, this.progression.credits, this.creditBudget)
  }

  /* -------------------------------------------- */

  /**
   * Validate a characteristic attribute field.
   * @param {{ value: number }} attr The characteristic object. Must have a `value` between 1 and 6 inclusive.
   * @throws {Error} If `attr.value` is less than 1 or greater than 6.
   */
  static #validateAttribute(attr) {
    if (attr.value < 1 || attr.value > 6) throw new Error(`Characteristic cannot be lower than 1 and cannot exceed 6`)
  }

  /* -------------------------------------------- */
  /*  Derived Attributes                          */
  /* -------------------------------------------- */

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
   * Extend the base derived data preparation with Character-specific computations.
   * Adds `_prepareCredits()` after the base pass so that obligation items (available
   * only during `prepareDerivedData`) can be accessed.
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData()
    this._prepareCredits()
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

    // Derived (not persisted): species starting XP used as the base of the XP pool.
    // Read by `SwerpgActorType._prepareExperience()` when computing `total`.
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
      if (this.details.species?.freeSkills.has(skillId)) {
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
      totalFreeRanks += specialization.freeSkillRank || 0
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

    // Wounds: max derived from the final wound threshold (resources.wounds.threshold).
    // resources.wounds.threshold is set by _prepareDerivedAttributes via _getWoundThresholdBonus().
    r.wounds.max = Math.ceil(1.5 * r.wounds.threshold)
    r.wounds.value = Math.clamp(r.wounds.value, 0, r.wounds.max)

    // Strain: max derived from the final strain threshold (resources.strain.threshold).
    // resources.strain.threshold is set by _prepareDerivedAttributes via _getStrainThresholdBonus().
    r.strain.max = Math.ceil(1.5 * r.strain.threshold)
    r.strain.value = Math.clamp(r.strain.value, 0, r.strain.max)
  }

  /* -------------------------------------------- */
  /*  Helper Methods                              */

  /* -------------------------------------------- */

  /**
   * Delegate an item application to `Actor._applyDetailItem` with the common
   * options shared by all detail-item wrappers, merged with any caller-specific
   * overrides.
   *
   * @param {SwerpgItem} item            The item to apply to the actor.
   * @param {object}     [extraOptions]  Additional options merged on top of the common ones.
   * @returns {Promise<void>}
   */
  async #applyDetailItem(item, extraOptions = {}) {
    await this.parent._applyDetailItem(item, {
      canApply: true,
      canClear: true,
      ...extraOptions,
    })
  }

  /**
   * Apply a Species item to this Character Actor.
   * @param {SwerpgItem} species     The species Item to apply to the Actor.
   * @returns {Promise<void>}
   */
  async applySpecies(species) {
    await this.#applyDetailItem(species)
  }

  /**
   * Apply a Career item to this Character Actor.
   * @param {SwerpgCareer} career     The career Item to apply to the Actor.
   * @returns {Promise<void>}
   */
  async applyCareer(career) {
    await this.#applyDetailItem(career)
  }

  /**
   * Apply a Specialization item to this Character Actor.
   * @param {SwerpgSpeciality} specialization     The specialization Item to apply to the Actor.
   * @returns {Promise<void>}
   */
  async applySpecialization(specialization) {
    await this.#applyDetailItem(specialization, {
      isCollection: true,
      collectionKey: 'specializations',
    })
  }
}
