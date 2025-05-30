import SwerpgActorType from "./actor-type.mjs";
import SwerpgAncestry from "./ancestry.mjs";
import SwerpgBackground from "./background.mjs";

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
        for (const abilityField of Object.values(schema.abilities.fields)) {
            abilityField.options.validate = SwerpgCharacter.#validateAttribute;
        }

        // Advancement
        schema.advancement = new fields.SchemaField({
            level: new fields.NumberField({
                ...requiredInteger,
                initial: 0,
                min: 0,
                max: 24,
                label: "ADVANCEMENT.Level"
            }),
            progress: new fields.NumberField({...requiredInteger, initial: 0, min: 0, label: "ADVANCEMENT.Progress"})
        });

        // Details
        schema.details = new fields.SchemaField({
            ancestry: new fields.SchemaField({
                name: new fields.StringField({blank: false}),
                img: new fields.StringField(),
                ...SwerpgAncestry.defineSchema()
            }, {required: true, nullable: true, initial: null}),
            background: new fields.SchemaField({
                name: new fields.StringField({blank: false}),
                img: new fields.StringField(),
                ...SwerpgBackground.defineSchema()
            }, {required: true, nullable: true, initial: null}),
            biography: new fields.SchemaField({
                appearance: new fields.HTMLField(),
                age: new fields.StringField(),
                height: new fields.StringField(),
                weight: new fields.StringField(),
                public: new fields.HTMLField(),
                private: new fields.HTMLField()
            })
        });
        return schema;
    }

    /* -------------------------------------------- */

    /**
     * Validate an attribute field
     * @param {{base: number, trained: number, bonus: number}} attr     The attribute value
     */
    static #validateAttribute(attr) {
        if ((attr.base + attr.trained) > 12) throw new Error(`Attribute base + bonus cannot exceed 12`);
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
        this.#prepareAdvancement();
        this.size = (this.details.ancestry?.size || 3) + this.details.size;
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

    /* -------------------------------------------- */

    /**
     * Prepare character details for the Character subtype specifically.
     * @override
     */
    _prepareDetails() {

        // Initialize default ancestry or background data
        const a = this.details.ancestry ||= this.schema.getField("details.ancestry").initialize({});
        this.details.background ||= this.schema.getField("details.background").initialize({});

        // Threat level
        this.advancement.threatLevel = this.advancement.level;
        this.advancement.threatFactor = 1;

        // Base Resistances
        const res = this.resistances;
        for (const r of Object.values(res)) r.base = 0;
        if (a.resistance) res[a.resistance].base += SYSTEM.ANCESTRIES.resistanceAmount;
        if (a.vulnerability) res[a.vulnerability].base -= SYSTEM.ANCESTRIES.resistanceAmount;
    }

    /* -------------------------------------------- */

    /**
     * Prepare abilities data for the Character subtype specifically.
     * @override
     */
    _prepareSpecies() {
        const points = this.points.ability;
        const ancestry = this.details.ancestry;

        // Ability Scores
        let abilityPointsBought = 0;
        let abilityPointsSpent = 0;
        for (let a in SYSTEM.CHARACTERISTICS) {
            const ability = this.abilities[a];

            // Configure initial value
            ability.initial = 1;
            if (a === ancestry.primary) ability.initial = SYSTEM.ANCESTRIES.primaryAbilityStart;
            else if (a === ancestry.secondary) ability.initial = SYSTEM.ANCESTRIES.secondaryAbilityStart;
            ability.value = Math.clamp(ability.initial + ability.base + ability.trained + ability.bonus, 0, 12);

            // Track points spent
            abilityPointsBought += ability.base;
            abilityPointsSpent += ability.trained;
        }

        // Track spent ability points
        points.bought = abilityPointsBought;
        points.pool = 9 - points.bought;
        points.spent = abilityPointsSpent;
        points.available = points.total - abilityPointsSpent;
        points.requireInput = (this.advancement.level === 0) ? (points.pool > 0) : (points.available !== 0);
    }

    /* -------------------------------------------- */

    /**
     * Prepare skills data for the Character subtype specifically.
     * @override
     */
    _prepareSkills() {
        let pointsSpent = 0;
        for (const [skillId, skill] of Object.entries(this.skills)) {
            this._prepareSkill(skillId, skill);
            pointsSpent += skill.spent;
        }
        const points = this.points;
        points.skill.spent = pointsSpent;
        points.skill.available = points.skill.total - points.skill.spent;
    }

    /* -------------------------------------------- */

    /**
     * Prepare a single skill for the Character subtype specifically.
     * @inheritDoc
     */
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

    /* -------------------------------------------- */

    /**
     * Preparation of resource pools for the Character subtype specifically.
     * @inheritDoc
     */
    _prepareResources() {
        super._prepareResources();
        const r = this.resources;

        // Wounds
        r.wounds.max = Math.ceil(1.5 * r.health.max);
        r.wounds.value = Math.clamp(r.wounds.value, 0, r.wounds.max);

        // Madness
        r.madness.max = Math.ceil(1.5 * r.morale.max);
        r.madness.value = Math.clamp(r.madness.value, 0, r.madness.max);
    }

    /* -------------------------------------------- */
    /*  Helper Methods                              */

    /* -------------------------------------------- */

    /**
     * Apply an Ancestry item to this Character Actor.
     * @param {SwerpgItem} ancestry     The ancestry Item to apply to the Actor.
     * @returns {Promise<void>}
     */
    async applyAncestry(ancestry) {
        const actor = this.parent;
        await actor._applyDetailItem(ancestry, {
            canApply: actor.isL0 && !actor.points.ability.spent,
            canClear: actor.isL0
        });
    }

    /**
     * Apply an Origin item to this Character Actor.
     * @param {SwerpgItem} origin     The origin Item to apply to the Actor.
     * @returns {Promise<void>}
     */
    async applyOrigin(origin) {
        const actor = this.parent;
        await actor._applyDetailItem(origin, {
            canApply: actor.isL0 && !actor.points.ability.spent,
            canClear: actor.isL0
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
