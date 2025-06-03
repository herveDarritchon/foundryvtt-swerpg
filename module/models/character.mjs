import SwerpgActorType from "./actor-type.mjs";
import SwerpgSpeciality from "./speciality.mjs";
import {SwerpgSpecies} from "./_module.mjs";
import SwerpgCareer from "./career.mjs";
import SwerpgSpecialization from "./specialization.mjs";

/**
 * @typedef {Object} Thresholds
 * @property {number} wounds - The wounds threshold
 * @property {number} strain - The strain threshold
 */

/**
 * @typedef {Object} Experience
 * @property {number} spent - The number of experience points spent
 * @property {number} gained - The number of experience points gained
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
        const fields = foundry.data.fields;
        const requiredInteger = {required: true, nullable: false, integer: true};
        const schema = super.defineSchema();

        // Extra validation for abilities
        for (const characteristicField of Object.values(schema.characteristics.fields)) {
            characteristicField.options.validate = SwerpgCharacter.#validateAttribute;
        }

        schema.thresholds = new fields.SchemaField({
            wounds: new fields.NumberField({
                required: true,
                integer: true,
                initial: 0,
                min: 0,
                max: 2000,
                step: 1,
            }, {label: "THRESHOLD.Wounds"}),
            strain: new fields.NumberField({
                required: true,
                integer: true,
                initial: 0,
                min: 0,
                max: 2000,
                step: 1,
            }, {label: "THRESHOLD.Strain"}),
        });

        // Experience/Advancement
        schema.progression = new fields.SchemaField({
            freeSkillRanks: new fields.SchemaField({
                career: new fields.SchemaField({
                    id: new fields.StringField({required: true, initial: ""}),
                    name: new fields.StringField({required: true, initial: ""}),
                    spent: new fields.NumberField({
                        required: true,
                        integer: true,
                        initial: 0,
                        min: 0,
                        max: 2000,
                        step: 1,

                    }, {label: "EXPERIENCE.FreeSkillRank.Spent"}),
                    gained: new fields.NumberField({
                        required: true,
                        integer: true,
                        initial: 0,
                        min: 0,
                        max: 2000,
                        step: 1,

                    }, {label: "EXPERIENCE.FreeSkillRank.Gained"}),
                }),
                specialization: new fields.SchemaField({
                    id: new fields.StringField({required: true, initial: ""}),
                    name: new fields.StringField({required: true, initial: ""}),
                    spent: new fields.NumberField({
                        required: true,
                        integer: true,
                        initial: 0,
                        min: 0,
                        max: 2000,
                        step: 1,

                    }, {label: "EXPERIENCE.FreeSkillRank.Spent"}),
                    gained: new fields.NumberField({
                        required: true,
                        integer: true,
                        initial: 0,
                        min: 0,
                        max: 2000,
                        step: 1,

                    }, {label: "EXPERIENCE.FreeSkillRank.Gained"}),
                }),
            }),
            experience: new fields.SchemaField({
                spent: new fields.NumberField({
                    required: true,
                    integer: true,
                    initial: 0,
                    min: 0,
                    max: 2000,
                    step: 1,

                }, {label: "EXPERIENCE.Spent"}),
                gained: new fields.NumberField({
                    required: true,
                    integer: true,
                    initial: 0,
                    min: 0,
                    max: 2000,
                    step: 1,

                }, {label: "EXPERIENCE.Gained"}),
            }),
        });

        schema.details = new fields.SchemaField({
            species: new fields.SchemaField({
                name: new fields.StringField({blank: false}),
                img: new fields.StringField(),
                ...SwerpgSpecies.defineSchema()
            }, {required: true, nullable: true, initial: null}),
            career: new fields.SchemaField({
                name: new fields.StringField({blank: false}),
                img: new fields.StringField(),
                ...SwerpgCareer.defineSchema()
            }, {required: true, nullable: true, initial: null}),
            specializations: new fields.SetField(new fields.SchemaField({
                name: new fields.StringField({blank: false}),
                img: new fields.StringField(),
                ...SwerpgSpecialization.defineSchema()
            }, {required: true, nullable: true, initial: null}),),
            specialities: new fields.ArrayField(new fields.SchemaField({
                ...SwerpgSpeciality.defineSchema()
            }), {required: true, nullable: true, initial: null}),

            biography: new fields.SchemaField({
                notableFeatures: new fields.HTMLField({
                    required: false,
                    initial: undefined
                }),
                age: new fields.StringField({required: false, initial: undefined}),
                gender: new fields.StringField({required: false, initial: undefined}),
                height: new fields.StringField({required: false, initial: undefined}),
                build: new fields.StringField({required: false, initial: undefined}),
                hair: new fields.StringField({required: false, initial: undefined}),
                eyes: new fields.StringField({required: false, initial: undefined}),
                public: new fields.HTMLField(),
                private: new fields.HTMLField()
            }),

            commitments: new fields.SchemaField({
                motivation: new fields.HTMLField()
            })
        });

        return schema;
    }

    /* -------------------------------------------- */

    /**
     * @override jsdoc
     */
    _prepareExperience() {
        super._prepareExperience();
        const e = this.progression.experience;
        e.obligationXpBonus = SwerpgCharacter.#computeObligationBonusExperience(this.parent);
        e.total = e.total + e.obligationXpBonus;
        e.available = e.total - e.spent;
        console.log(`[character-sheet] _prepareExperience - experience for ${this.parent.name} is :`, this.progression.experience);
    }

    /* -------------------------------------------- */

    /**
     * Validate an attribute field
     * @param actor
     */
    static #computeObligationBonusExperience(actor) {
        return actor.items
            .filter(item => item.type === "obligation" && item.system.isExtra === true)
            .reduce((total, item) => total + item.system.extraXp, 0);
    }

    /* -------------------------------------------- */

    /**
     * Validate an attribute field
     * @param {{base: number, trained: number, bonus: number}} attr     The attribute value
     */
    static #validateAttribute(attr) {
        if (attr.value < 1 || attr.value > 6) throw new Error(`Characteristic cannot be lower than 1 and cannot exceed 6`);
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
    points;

    /**
     * Character actor size is determined by their ancestry and size modifier.
     * @type {number}
     */
    size;

    /* -------------------------------------------- */
    /*  Data Preparation                            */

    /* -------------------------------------------- */

    /** @override */
    prepareBaseData() {
        //this.#prepareAdvancement();
        //this.#prepareExperience();
        this.size = (this.details?.ancestry?.size || 3) + (this.details?.size || 0);
        this.#prepareSpecies();
        this.#prepareCareer();
        this.#prepareSpecializations();
        this.#prepareBaseMovement();
        super.prepareBaseData();
    }

    /* -------------------------------------------- */

    /**
     * Prepare base movement attributes that are defined by the Character's Ancestry and bonuses.
     */
    #prepareBaseMovement() {
        const m = this.movement;
        const {size = 3, stride = 10} = this.details.ancestry || {};
        m.size = size + m.sizeBonus;
        m.stride = stride + m.strideBonus;
    }

    /* -------------------------------------------- */

    /**
     * Compute the available points which can be spent to advance this character
     */
    #prepareAdvancement() {
        const adv = this.advancement;
        const effectiveLevel = Math.max(adv.level, 1) - 1;
        this.points = {
            ability: {pool: 9, total: effectiveLevel, bought: null, spent: null, available: null},
            skill: {total: 2 + (effectiveLevel * 2), spent: null, available: null},
            talent: {total: 2 + (effectiveLevel * 2), spent: 0, available: null}
        };
        adv.progress = adv.progress ?? 0;
        adv.next = (2 * adv.level) + 1;
        adv.pct = Math.clamp(Math.round(adv.progress * 100 / adv.next), 0, 100);
    }

    /**
     * Compute the experience points which can be spent to advance this character
     */
    #prepareExperience() {

        /*        this.points = {
                    ability: {pool: 9, total: effectiveLevel, bought: null, spent: null, available: null},
                    skill: {total: 2 + (effectiveLevel * 2), spent: null, available: null},
                    talent: {total: 2 + (effectiveLevel * 2), spent: 0, available: null}
                };*/
    }

    /* -------------------------------------------- */

    /**
     * Prepare character details for the Character subtype specifically.
     * @override
     */
    _prepareDetails() {
        // Default Species data
        if (!this.details.species) {
            const speciesDefaults = swerpg.api.models.SwerpgSpecies.schema.getInitialValue();
            this.details.species = this.schema.getField("details.species").initialize(speciesDefaults);
        }

        if (!this.details.career) {
            const careerDefaults = swerpg.api.models.SwerpgCareer.schema.getInitialValue();
            this.details.career = this.schema.getField("details.career").initialize(careerDefaults);
        }

        //this.details.background ||= this.schema.getField("details.background").initialize({});

        // Threat level
        /*        this.advancement.threatLevel = this.advancement.level;
                this.advancement.threatFactor = 1;*/

        // Base Resistances
        /*        const res = this.resistances;
                for (const r of Object.values(res)) r.base = 0;
                if (a.resistance) res[a.resistance].base += SYSTEM.ANCESTRIES.resistanceAmount;
                if (a.vulnerability) res[a.vulnerability].base -= SYSTEM.ANCESTRIES.resistanceAmount;*/
    }

    /* -------------------------------------------- */

    /**
     * Prepare abilities data for the Character subtype specifically.
     * @override
     */
    #prepareSpecies() {
//        const points = this.points.ability;
        const species = this.details.species;
        const thresholds = this.thresholds;

        // FIXME this is some Stubs for the moment
        thresholds.strain = 2;
        thresholds.wounds = 3;

        // Ability Scores
        let abilityPointsBought = 0;
        let abilityPointsSpent = 0;
        for (let a in SYSTEM.CHARACTERISTICS) {
            const characteristic = this.characteristics[a];

            // Configure initial value
            characteristic.rank.base = species?.characteristics[a] || 1;
            characteristic.rank.value = Math.clamp(characteristic.rank.base + characteristic.rank.trained + characteristic.rank.bonus, 1, 6);

            // Track points spent
            abilityPointsBought += characteristic.rank.base;
            abilityPointsSpent += characteristic.rank.trained;
        }

        this._applyFreeSkillSpecies(this.skills);

        this.progression.experience.startingExperience = species?.startingExperience || 0;

        // TODO to be reactivated when experience is used.
        // Track spent ability points
        /*        points.bought = abilityPointsBought;
                points.pool = 9 - points.bought;
                points.spent = abilityPointsSpent;
                points.available = points.total - abilityPointsSpent;
                points.requireInput = (this.advancement.level === 0) ? (points.pool > 0) : (points.available !== 0);*/
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
                skill.rank.base = 1;
            }
        });
    }

    /* -------------------------------------------- */
    /**
     * Prepare skills data for Character Actor subtypes.
     * @protected
     * @param {Set<Object>} skills The skills object to prepare
     */
    _prepareSkills(skills) {
        /*        for (const skill of Object.entries(skills)) {
                    this._prepareSkill(...skill);
                }*/

    }


    /* -------------------------------------------- */

    /**
     * Prepare a single skill for the Character subtype specifically.
     * @inheritDoc
     */
    _prepareSkill(skillId, skill) {

        // Adjust base skill rank
        let base = skill?.base || 0;
        let careerFree = skill?.careerFree || 0;
        let specializationFree = skill?.specializationFree || 0;
        let trained = skill?.trained || 0;

        if (this.details.species?.freeSkills?.has(skillId)) {
            base++;
        }

        skill.rank = {
            base: base,
            careerFree: careerFree,
            specializationFree: specializationFree,
            trained: trained
        };

        return skill;
        // Standard skill preparation
        //super._prepareSkill(skillId, skill);

        // Record point cost
        /*        const ranks = SYSTEM.SKILL.RANKS;
                const rank = ranks[skill.rank];
                skill.spent = rank.spent - base;
                const next = ranks[skill.rank + 1] || {cost: null};
                skill.cost = next.cost;*/
    }


    /* -------------------------------------------- */

    /**
     * Prepare abilities data for the Character subtype specifically.
     * @override
     */
    #prepareSpecializations() {
        const specialization = Array.from(this.details.specializations)[0];
        this.progression.freeSkillRanks.specialization.gained = specialization?.freeSkillRank || 0;
    }

    /* -------------------------------------------- */

    /**
     * Prepare abilities data for the Character subtype specifically.
     * @override
     */
    #prepareCareer() {
        const career = this.details.career;
        this.progression.freeSkillRanks.career.gained = career?.freeSkillRank || 0;
    }

    /* -------------------------------------------- */

    /**
     * Prepare skills data for the Character subtype specifically.
     * @override
     */
    /*    _prepareSkills() {
            // TODO Sans doute à voir comment on l'intègre dans la suite du système avec la gestion des points
            let pointsSpent = 0;
            for (const [skillId, skill] of Object.entries(this.skills)) {
                this._prepareSkill(skillId, skill);
                pointsSpent += skill.spent;
            }
            const points = this.points;
            points.skill.spent = pointsSpent;
            points.skill.available = points.skill.total - points.skill.spent;
        }*/

    /* -------------------------------------------- */

    /**
     * Prepare a single skill for the Character subtype specifically.
     * @inheritDoc
     */
    /*
        _prepareSkill(skillId, skill) {

            // Adjust base skill rank
            let base = 0;
            if (this.details.background?.skills?.has(skillId)) base++;
            skill.rank = Math.max(skill.rank || 0, base);

            // Standard skill preparation
            super._prepareSkill(skillId, skill);

            // Record point cost
            const ranks = SYSTEM.SKILL.RANKS;
            const rank = ranks[skill.rank];
            skill.spent = rank.spent - base;
            const next = ranks[skill.rank + 1] || {cost: null};
            skill.cost = next.cost;
        }
    */

    /* -------------------------------------------- */

    /**
     * Preparation of resource pools for the Character subtype specifically.
     * @inheritDoc
     */
    _prepareResources() {
        super._prepareResources();
        const r = this.resources;

        // Wounds
        r.wounds.max = Math.ceil(1.5 * r.wounds.threshold);
        r.wounds.value = Math.clamp(r.wounds.value, 0, r.wounds.max);

        // Madness
        r.strain.max = Math.ceil(1.5 * r.strain.threshold);
        r.strain.value = Math.clamp(r.strain.value, 0, r.strain.max);
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
        const actor = this.parent;
        await actor._applyDetailItem(species, {
            // TODO Change this when points are used for experience
            //canApply: actor.isL0 && !actor.points.ability.spent,
            canApply: true,
            //canClear: actor.isL0
            canClear: true
        });
    }

    /**
     * Apply a Career item to this Character Actor.
     * @param {SwerpgCareer} career     The career Item to apply to the Actor.
     * @returns {Promise<void>}
     */
    async applyCareer(career) {
        const actor = this.parent;
        await actor._applyDetailItem(career, {
            // TODO Change this when points are used for experience
            //canApply: actor.isL0 && !actor.points.ability.spent,
            canApply: true,
            //canClear: actor.isL0
            canClear: true
        });
    }

    /**
     * Apply a Specialization item to this Character Actor.
     * @param {SwerpgSpeciality} specialization     The specialization Item to apply to the Actor.
     * @returns {Promise<void>}
     */
    async applySpecialization(specialization) {
        const actor = this.parent;
        await actor._applyDetailItem(specialization, {
            // TODO Change this when points are used for experience
            //canApply: actor.isL0 && !actor.points.ability.spent,
            canApply: true,
            //canClear: actor.isL0
            canClear: true,
            isCollection: true,
            collectionKey: "specializations"
        });
    }

    /* -------------------------------------------- */

    /**
     * Apply a Background item to this Character Actor.
     * @param {SwerpgItem} background     The background Item to apply to the Actor.
     * @returns {Promise<void>}
     */
    async applyBackground(background) {
        const actor = this.parent;
        await actor._applyDetailItem(background, {
            canApply: actor.isL0 && !actor.points.skill.spent,
            canClear: actor.isL0
        });
    }
}
