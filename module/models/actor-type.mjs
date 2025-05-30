/**
 * @typedef {Object} SwerpgActorSkill
 * @param {number} rank
 * @param {string} path
 * @param {number} [abilityBonus]
 * @param {number} [skillBonus]
 * @param {number} [enchantmentBonus]
 * @param {number} [score]
 * @param {number} [passive]
 * @param {number} [spent]
 * @param {number} [cost]
 */

/**
 * @typedef {Object} DefenseAttributes
 * @property {number} melee Difficulty to hit a character with a melee attack.
 * @property {number} ranged Difficulty to hit a character with a ranged attack.
 */

/**
 * @typedef {Object} DerivedAttributes
 * @property {number} woundThreshold Amount of Wounds a character can withstand before being knocked out.
 * @property {number} strainThreshold Amount of Strain a character can withstand before being stunned.
 * @property {number} encumbranceThreshold Amount of Encumbrance a character can carry before being encumbered.
 * @property {DefenseAttributes} defense Determines how difficult it is to hit a character with an attack.
 * @property {number} soakValue Determines how much incoming damage a character can shrug off before being seriously wounded.
 */

/**
 * This class defines data schema, methods, and properties shared by all Actor subtypes in the Swerpg system.
 *
 * @property {Object<string, SwerpgActorSkill>} skills
 */
export default class SwerpgActorType extends foundry.abstract.TypeDataModel {

    /* -------------------------------------------- */
    /*  Data Schema                                 */

    /* -------------------------------------------- */

    /**
     * Define shared schema elements used by every Actor sub-type in Swerpg.
     * This method is extended by subclasses to add type-specific fields.
     * @override
     */
    static defineSchema() {
        const fields = foundry.data.fields;
        const requiredInteger = {required: true, nullable: false, integer: true};
        const schema = {};

        // Ability Scores
        schema.characteristics = new fields.SchemaField(Object.values(SYSTEM.CHARACTERISTICS).reduce((obj, ability) => {
            obj[ability.id] = new fields.SchemaField({
                rank: new fields.SchemaField({
                    base: new fields.NumberField({...requiredInteger, initial: 1, min: 1, max: 5}),
                    trained: new fields.NumberField({...requiredInteger, initial: 0, min: 0, max: 4}),
                    bonus: new fields.NumberField({...requiredInteger, initial: 0, min: 0, max: 1})
                }, {validate: SwerpgActorType.#validateCharacteristicRank, label: ability.name}),
            }, {label: ability.label});
            return obj;
        }, {}));

        // Defenses
        schema.defenses = new fields.SchemaField(Object.values(SYSTEM.DEFENSES).reduce((obj, defense) => {
            if (defense.id !== "physical") obj[defense.id] = new fields.SchemaField({
                bonus: new fields.NumberField({...requiredInteger, initial: 0})
            }, {label: defense.label});
            return obj;
        }, {}));

        // Resistances
        schema.resistances = new fields.SchemaField(Object.values(SYSTEM.DAMAGE_TYPES).reduce((obj, damageType) => {
            obj[damageType.id] = new fields.SchemaField({
                bonus: new fields.NumberField({...requiredInteger, initial: 0})
            }, {label: damageType.label});
            return obj;
        }, {}));

        // Resource Pools
        schema.resources = new fields.SchemaField(Object.values(SYSTEM.RESOURCES).reduce((obj, resource) => {
            obj[resource.id] = new fields.SchemaField({
                value: new fields.NumberField({...requiredInteger, initial: 0, min: 0, max: resource.max}),
                threshold: new fields.NumberField({...requiredInteger, initial: 0, min: 0, max: resource.max})
            }, {label: resource.label});
            return obj
        }, {}));

        // Skills
        schema.skills = new fields.SchemaField(Object.values(SYSTEM.SKILLS).reduce((obj, skill) => {
            obj[skill.id] = new fields.SchemaField({
                rank: new fields.SchemaField({
                    base: new fields.NumberField({...requiredInteger, initial: 0, max: 5}),
                    careerFree: new fields.NumberField({...requiredInteger, initial: 0, max: 5}),
                    specializationFree: new fields.NumberField({...requiredInteger, initial: 0, max: 5}),
                    trained: new fields.NumberField({...requiredInteger, initial: 0, max: 5})
                }, {validate: SwerpgActorType.#validateSkillRank, label: skill.name}),
                path: new fields.StringField({required: false, initial: undefined, blank: false})
            }, {label: skill.name})
            return obj;
        }, {}));

        // Movement Attributes
        schema.movement = new fields.SchemaField({
            sizeBonus: new fields.NumberField({...requiredInteger, initial: 0}),
            strideBonus: new fields.NumberField({...requiredInteger, initial: 0}),
            engagementBonus: new fields.NumberField({...requiredInteger, initial: 0})
        });

        // Status
        schema.status = new fields.ObjectField({nullable: true, initial: null});
        schema.favorites = new fields.SetField(new fields.StringField({blank: false}));
        return schema;
    }

    /** @override */
    static LOCALIZATION_PREFIXES = ["ACTOR"];

    /* -------------------------------------------- */

    /**
     * Validate a characteristic field
     * @param {{base: number, trained: number}} attr     The attribute value
     */
    static #validateCharacteristicRank(attr) {
        const value = attr.base + attr.trained;
        if (value < 1 || value > 6) throw new Error(`Characteristic Rank cannot exceed 6 or be less than 1.`);
    }

    /**
     * Validate a skill field
     * @param {{base: number, careerFree: number, specializationFree: number, trained: number}} attr     The attribute value
     */
    static #validateSkillRank(attr) {
        const value = attr.base + attr.careerFree + attr.specializationFree + attr.trained;
        if (value < 0 || value > 5) throw new Error(`Skill Rank cannot exceed 5 or be less than 0.`);
    }


    /* -------------------------------------------- */
    /*  Data Preparation                            */

    /* -------------------------------------------- */

    /**
     * Base data preparation workflows used by all Actor subtypes.
     * @override
     */
    prepareBaseData() {
        this.status ||= {};
        this._prepareDetails();
        //this._prepareSkills();
    }

    /* -------------------------------------------- */

    /**
     * Prepare creature details for all Actor subtypes.
     * @protected
     */
    _prepareDetails() {

    }

    /* -------------------------------------------- */

    /**
     * Prepare skills data for all Actor subtypes.
     * @protected
     */
    _prepareSkills() {
        for (const skill of Object.entries(this.skills)) {
            this._prepareSkill(...skill);
        }
    }

    /* -------------------------------------------- */

    /**
     * Prepare a single Skill for all Actor subtypes.
     * @param {string} skillId                The ID of the skill being configured
     * @param {SwerpgActorSkill} skill      Source data of the skill being configured
     * @protected
     */
    _prepareSkill(skillId, skill) {
        const config = SYSTEM.SKILLS[skillId];
        const r = skill.rank ||= 0;
        const ab = skill.abilityBonus = this.parent.getAbilityBonus(config.abilities);
        const sb = skill.skillBonus = SYSTEM.SKILL.RANKS[r].bonus;
        const eb = skill.enchantmentBonus = 0;
        const s = skill.score = ab + sb + eb;
        skill.passive = SYSTEM.PASSIVE_BASE + s;
    }

    /* -------------------------------------------- */

    /**
     * Derived data preparation workflows used by all Actor subtypes.
     * @override
     */
    prepareDerivedData() {

        //TODO Reactive if necessary

        // Resource pools
        this._prepareResources();
        this._prepareExperience();
        this._prepareDerivedAttributes();
        this._prepareFreeSkillRanks();
        this.parent.callActorHooks("prepareResources", this.resources);

        // Defenses
        //this.#prepareDefenses();
        //this.parent.callActorHooks("prepareDefenses", this.defenses);
        //this.#prepareTotalDefenses();

        // Resistances
        //this.parent.callActorHooks("prepareResistances", this.resistances);
        //this.#prepareTotalResistances();

        // Movement
        //this._prepareMovement();
        //this.parent.callActorHooks("prepareMovement", this.movement);
    }

    /**
     * Prepare formatted experience scores for display on the Actor sheet.
     * @return {object[]}
     */
    _prepareFreeSkillRanks() {
        const freeSkillRanks = this.progression.freeSkillRanks;

        let c = freeSkillRanks.career;
        c.available = c.gained - c.spent;
        freeSkillRanks.career = c;

        let s = freeSkillRanks.specialization;
        s.available = s.gained - s.spent;
        freeSkillRanks.specialization = s;
    }

    _prepareExperience() {
        const e = this.progression.experience;
        e.total = e.startingExperience + e.gained
        e.available = e.total - e.spent;
    }

    /**
     * Prepare derived attributes for all Actor subtypes.
     * @returns {DerivedAttributes}
     * @private
     */
    _prepareDerivedAttributes() {
        const c = this.combat = {};
        const r = this.resources;

        const woundThreshold = SwerpgActorType.#calculateWoundThreshold(this);
        const strainThreshold = SwerpgActorType.#calculateStrainThreshold(this);
        const encumbranceThreshold = SwerpgActorType.#calculateEncumbranceThreshold(this);
        const defense = SwerpgActorType.#calculateDefense(this);
        const soakValue = SwerpgActorType.#calculateSoakValue(this);

        r.wounds.threshold = woundThreshold;
        r.strain.threshold = strainThreshold;
        r.encumbrance.threshold = encumbranceThreshold;

        c.defense = defense;
        c.soakValue = soakValue;
    }

    /* -------------------------------------------- */

    /**
     * Preparation of resource pools for all Actor subtypes.
     * @protected
     */
    _prepareResources() {
        const {isIncapacitated, isWeakened, statuses} = this.parent;
        //const {level: l, threatFactor, maxAction=6} = this.advancement;
        const {level: l, threatFactor, maxAction = 6} = {level: 1, threatFactor: 1, maxAction: 6};
        const r = this.resources;
        const a = this.characteristics;

        // Action
        r.action.max = maxAction;
        if (statuses.has("stunned")) r.action.max -= 4;
        else if (statuses.has("staggered")) r.action.max -= 2;
        if (this.status.impetus) r.action.max += 1;
        if (isWeakened) r.action.max -= 2;
        if (isIncapacitated) r.action.max = 0;
        r.action.max = Math.max(r.action.max, 0);
        r.action.value = Math.clamp(r.action.value, 0, r.action.max);
    }

    /* -------------------------------------------- */

    /**
     * Preparation of defenses for all Actor subtypes.
     * @private
     */
    #prepareDefenses() {
        this.#preparePhysicalDefenses();
        this.#prepareSaveDefenses();
        this.#prepareHealingThresholds();
    }

    /* -------------------------------------------- */

    /**
     * The wound threshold determines how much damage a character can take
     * before experiencing significant negative effects.
     *
     * This is a private method and meant to be accessed only within the class.
     *
     * @private
     * @method
     * @returns {number} The calculated wound threshold value.
     */
    static #calculateWoundThreshold(actor) {
        const {characteristics, thresholds} = actor;
        const brawn = characteristics?.brawn?.rank?.value ?? 0;
        const wounds = thresholds?.wounds ?? 0;
        const result = brawn + wounds;
        console.log(`Calculating Wound Threshold for actor: ${result}`, actor);
        return result;
    }

    /**
     * The strain threshold determines how much strain a character can take
     * before experiencing significant negative effects.
     *
     * This is a private method and meant to be accessed only within the class.
     *
     * @private
     * @method
     * @returns {number} The calculated strain threshold value.
     */
    static #calculateStrainThreshold(actor) {
        const {characteristics, thresholds} = actor;
        const willpower = characteristics?.willpower?.rank?.value ?? 0;
        const strain = thresholds?.strain ?? 0;
        const result = willpower + strain;
        console.log(`Calculating Strain Threshold for actor: ${result}`, actor);
        return result;
    }

    /**
     * The encumbrance threshold determines how much weight a character can carry
     * before being encumbered.
     *
     * This is a private method and meant to be accessed only within the class.
     *
     * @private
     * @method
     * @returns {number} The calculated encumbrance threshold value.
     */
    static #calculateEncumbranceThreshold(actor) {
        const {characteristics} = actor;
        const brawn = characteristics?.brawn?.rank?.value ?? 0;
        const result = brawn + 5;
        console.log(`Calculating Encumbrance Threshold for actor: ${result}`, actor);
        return result;
    }

    /**
     * The defense value determines how difficult it is to hit a character with an attack.
     *
     * This is a private method and meant to be accessed only within the class.
     *
     * @private
     * @method
     * @returns {DefenseAttributes} The calculated defense value.
     */
    static #calculateDefense(actor) {
        const defense = {
            melee: 0,
            ranged: 0
        };
        console.log(`Calculating Defense for actor: ${defense}`, actor);
        return defense
    }

    /**
     * The soak value determines how much incoming damage a character can shrug off
     *
     * This is a private method and meant to be accessed only within the class.
     *
     * @private
     * @method
     * @returns {number} The calculated soak value.
     */
    static #calculateSoakValue(actor) {
        const {characteristics} = actor;
        const brawn = characteristics?.brawn?.rank?.value ?? 0;
        console.log(`Calculating Soak Value for actor: ${brawn}`, actor);
        return brawn;
    }

    /**
     * Prepare Physical Defenses.
     */
    #preparePhysicalDefenses() {
        const {equipment, statuses} = this.parent;
        const {abilities, defenses} = this;

        // Armor and Dodge from equipped Armor
        const armorData = equipment.armor.system;
        defenses.armor.base = armorData.armor.base;
        defenses.armor.bonus = armorData.armor.bonus;
        defenses.dodge.base = armorData.dodge.base;
        defenses.dodge.bonus = Math.max(abilities.dexterity.value - armorData.dodge.start, 0);
        defenses.dodge.max = defenses.dodge.base + (12 - armorData.dodge.start);

        // Block and Parry from equipped Weapons
        const weaponData = [equipment.weapons.mainhand.system];
        if (!equipment.weapons.twoHanded) weaponData.push(equipment.weapons.offhand.system);
        defenses.block = {base: 0, bonus: 0};
        defenses.parry = {base: 0, bonus: 0};
        for (let wd of weaponData) {
            for (let d of ["block", "parry"]) {
                defenses[d].base += wd.defense[d];
            }
        }

        // Status Conditions
        if (statuses.has("exposed")) defenses.armor.base = Math.max(defenses.armor.base - 2, 0);
    }

    /* -------------------------------------------- */

    /**
     * Prepare non-physical defenses.
     */
    #prepareSaveDefenses() {

        // Defense base is the system passive base of 12
        const l = this.details.threatLevel;
        let base = SYSTEM.PASSIVE_BASE;
        const {equipment, talentIds} = this.parent;

        // Adversary save penalty plus further reduction for threat level below zero
        let penalty = 0;
        if (this.parent.type === "adversary") {
            penalty = 2;
            if (l < 1) penalty += (1 - l);
        }

        // Prepare save defenses
        for (let [k, sd] of Object.entries(SYSTEM.DEFENSES)) {
            if (sd.type !== "save") continue;
            let d = this.defenses[k];
            d.base = sd.abilities.reduce((t, a) => t + this.abilities[a].value, base);
            if (this.parent.isIncapacitated) d.base = base;
            d.bonus = 0 - penalty;
            if ((k !== "fortitude") && talentIds.has("monk000000000000") && equipment.unarmored) d.bonus += 2;
        }
    }

    /* -------------------------------------------- */

    /**
     * Prepare healing thresholds for Wounds and Madness.
     */
    #prepareHealingThresholds() {
        const {defenses, resources} = this;
        const wounds = resources.wounds?.value ?? ((resources.health.max - resources.health.value) * 2);
        defenses.wounds = {base: SYSTEM.PASSIVE_BASE + Math.floor(wounds / 10), bonus: 0};
        const madness = resources.madness?.value ?? ((resources.morale.max - resources.morale.value) * 2);
        defenses.madness = {base: SYSTEM.PASSIVE_BASE + Math.floor(madness / 10), bonus: 0};
    }

    /* -------------------------------------------- */

    /**
     * Compute total defenses as base + bonus.
     */
    #prepareTotalDefenses() {
        const defenses = this.defenses;
        const {isIncapacitated, statuses} = this.parent;

        // Compute defense totals
        for (const defense of Object.values(defenses)) {
            defense.total = defense.base + defense.bonus;
        }

        // Cannot parry or block while enraged
        if (statuses.has("enraged")) defenses.parry.total = defenses.block.total = 0;

        // Cannot dodge, block, or parry while incapacitated
        if (isIncapacitated) defenses.dodge.total = defenses.parry.total = defenses.block.total = 0;

        // Aggregate total Physical Defense
        defenses.physical = {
            total: defenses.armor.total + defenses.dodge.total + defenses.parry.total + defenses.block.total
        };
    }

    /* -------------------------------------------- */

    /**
     * Preparation of resistances for all Actor subtypes.
     */
    #prepareTotalResistances() {
        for (const r of Object.values(this.resistances)) r.total = r.base + r.bonus;
    }

    /* -------------------------------------------- */

    /**
     * Preparation of derived movement for all Actor subtypes.
     */
    _prepareMovement() {
        const m = this.movement;
        m.free = m.stride;
        m.engagement = 1; // Default engagement is size-2 with a minimum of 1.
        const {shield, offhand} = this.parent.equipment.weapons;
        if (shield && offhand.system.properties.has("engaging")) m.engagement += 1;
    }
}
