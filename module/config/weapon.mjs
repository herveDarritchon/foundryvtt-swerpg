/**
 * @typedef {Object} ActivationType    A weapon quality activation type
 * @property {string} id               The activation type id
 * @property {string} abrev            The activation type abbreviation
 * @property {string} label            The localized label for the activation type
 */

/**
 * @typedef {Object} RangeCategory     A weapon range category
 * @property {string} id               The range category id
 * @property {string} abrev            The range category abbreviation
 * @property {string} label            The localized label for the range category
 */

/**
 * @typedef {Object} RangeType     A weapon range type
 * @property {string} id               The range category id
 * @property {string} abrev            The range category abbreviation
 * @property {string} label            The localized label for the range category
 * @property {RangeCategory} rangeCategory   The range category of the weapon, used for attack rolls ("ranged" or "melee")
 */

/**
 * @typedef {Object} WeaponSkill                A skill used of with a weapon
 * @property {string} id                        The skill id
 * @property {string} abrev                     The skill abbreviation
 * @property {string} label                     The localized label for the skill
 * @property {RangeCategory} rangeCategory      The range category of the skill, used for attack rolls ("ranged" or "melee")
 */

/**
 * @typedef {Object} Quality                    A weapon quality
 * @property {string} id                            The quality id
 * @property {string} abrev                         The quality abbreviation
 * @property {string} label                          The localized label for the quality
 * @property {string} tooltip                        The localized tooltip for the quality
 * @property {ActivationType} activationType               The activation type of the quality, used for attack rolls
 */

/**
 * Enumerate the weapon quality activation type that is used by the system.
 * Record certain mechanical metadata which applies to skill.
 * @enum {ActivationType}
 */
export const ACTIVATION_TYPE = {

    active: {
        id: "active",
        abrev: "ACT",
        label: "WEAPON.ACTIVATION_TYPE.ACTIVE",
    },
    passive: {
        id: "passive",
        abrev: "PAS",
        label: "WEAPON.ACTIVATION_TYPE.PASSIVE",
    },

};

/**
 * Enumerate the weapon range category that is used by the system.
 * Record certain mechanical metadata which applies to skill.
 * @enum {RangeCategory}
 */
export const RANGE_CATEGORY = {

    melee: {
        id: "melee",
        abrev: "MEL",
        label: "WEAPON.RANGE_CATEGORY.MELEE",
    },
    distant: {
        id: "distant",
        abrev: "DIS",
        label: "WEAPON.RANGE_CATEGORY.DISTANT",
    },

};

/**
 * Enumerate the weapon range category that is used by the system.
 * Record certain mechanical metadata which applies to skill.
 * @enum {RangeType}
 */
export const RANGETYPES = {

    engaged: {
        id: "engaged",
        abrev: "ENG",
        label: "WEAPON.RANGE_TYPES.Engaged",
        rangeCategory: RANGE_CATEGORY.melee,
    },
    short: {
        id: "short",
        abrev: "SHO",
        label: "WEAPON.RANGE_TYPES.Short",
        rangeCategory: RANGE_CATEGORY.distant,
    },
    medium: {
        id: "medium",
        abrev: "MED",
        label: "WEAPON.RANGE_TYPES.Medium",
        rangeCategory: RANGE_CATEGORY.distant,
    },
    long: {
        id: "long",
        abrev: "LON",
        label: "WEAPON.RANGE_TYPES.Long",
        rangeCategory: RANGE_CATEGORY.distant,
    },
    extreme: {
        id: "extreme",
        abrev: "EXT",
        label: "WEAPON.RANGE_TYPES.Extreme",
        rangeCategory: RANGE_CATEGORY.distant,
    },

};

/**
 * Enumerate the weapon skills which are used to roll an attack by the system.
 * Record certain mechanical metadata which applies to skill.
 * @enum {WeaponSkill}
 */
export const SKILLS = {

    // Natural Attacks
    rangedLight: {
        id: "rangedLight",
        abrev: "RAL",
        label: "WEAPON.SKILLS.RangedLight",
        rangeCategory: RANGE_CATEGORY.distant,
    },
    rangedHeavy: {
        id: "rangedHeavy",
        abrev: "RAH",
        label: "WEAPON.SKILLS.RangedHeavy",
        rangeCategory: RANGE_CATEGORY.distant,
    },
    gunnery: {
        id: "gunnery",
        abrev: "GUN",
        label: "WEAPON.SKILLS.Gunnery",
        rangeCategory: RANGE_CATEGORY.distant,
    },

    brawl: {
        id: "brawl",
        abrev: "BRA",
        label: "WEAPON.SKILLS.Brawl",
        rangeCategory: RANGE_CATEGORY.melee,
    },

    melee:{
        id: "melee",
        abrev: "MEL",
        label: "WEAPON.SKILLS.Melee",
        rangeCategory: RANGE_CATEGORY.melee,
    },
    lightSaber:{
        id: "lightSaber",
        abrev: "LIS",
        label: "WEAPON.SKILLS.LightSaber",
        rangeCategory: RANGE_CATEGORY.melee,
    }

};

/**
 * The boolean properties which a Weapon may have.
 * @enum {Quality}
 */
export const QUALITIES = {
    accurate: {
        id: "accurate",
        abrev: "ACC",
        label: "WEAPON.QUALITIES.Accurate",
        tooltip: "WEAPON.QUALITIES.AccurateTooltip",
        activationType: ACTIVATION_TYPE.passive,
    },
    autoFire: {
        id: "autoFire",
        abrev: "AUF",
        label: "WEAPON.QUALITIES.AutoFire",
        tooltip: "WEAPON.QUALITIES.AutoFireTooltip",
        activationType: ACTIVATION_TYPE.active,
    },
    breach: {
        id: "breach",
        abrev: "BRE",
        label: "WEAPON.QUALITIES.Breach",
        tooltip: "WEAPON.QUALITIES.BreachTooltip",
        activationType: ACTIVATION_TYPE.passive,
    },
    burn: {
        id: "burn",
        abrev: "BUR",
        label: "WEAPON.QUALITIES.Burn",
        tooltip: "WEAPON.QUALITIES.BurnTooltip",
        activationType: ACTIVATION_TYPE.active,
    },
    blast: {
        id: "blast",
        abrev: "BLA",
        label: "WEAPON.QUALITIES.Blast",
        tooltip: "WEAPON.QUALITIES.BlastTooltip",
        activationType: ACTIVATION_TYPE.active,
    },
    concussive: {
        id: "concussive",
        abrev: "CON",
        label: "WEAPON.QUALITIES.Concussive",
        tooltip: "WEAPON.QUALITIES.ConcussiveTooltip",
        activationType: ACTIVATION_TYPE.active,
    },
    cortosis: {
        id: "cortosis",
        abrev: "COR",
        label: "WEAPON.QUALITIES.Cortosis",
        tooltip: "WEAPON.QUALITIES.CortosisTooltip",
        activationType: ACTIVATION_TYPE.passive,
    },
    cumbersome: {
        id: "cumbersome",
        abrev: "CUM",
        label: "WEAPON.QUALITIES.Cumbersome",
        tooltip: "WEAPON.QUALITIES.CumbersomeTooltip",
        activationType: ACTIVATION_TYPE.passive,
    },
    defensive: {
        id: "defensive",
        abrev: "DEF",
        label: "WEAPON.QUALITIES.Defensive",
        tooltip: "WEAPON.QUALITIES.DefensiveTooltip",
        activationType: ACTIVATION_TYPE.passive,
    },
    deflection: {
        id: "deflection",
        abrev: "DEF",
        label: "WEAPON.QUALITIES.Deflection",
        tooltip: "WEAPON.QUALITIES.DeflectionTooltip",
        activationType: ACTIVATION_TYPE.passive,
    },
    disorient: {
        id: "disorient",
        abrev: "DIS",
        label: "WEAPON.QUALITIES.Disorient",
        tooltip: "WEAPON.QUALITIES.DisorientTooltip",
        activationType: ACTIVATION_TYPE.active,
    },
    ensnare: {
        id: "ensnare",
        abrev: "ENS",
        label: "WEAPON.QUALITIES.Ensnare",
        tooltip: "WEAPON.QUALITIES.EnsnareTooltip",
        activationType: ACTIVATION_TYPE.active,
    },
    guided: {
        id: "guided",
        abrev: "GUI",
        label: "WEAPON.QUALITIES.Guided",
        tooltip: "WEAPON.QUALITIES.GuidedTooltip",
        activationType: ACTIVATION_TYPE.active,
    },
    knockdown: {
        id: "knockdown",
        abrev: "KNO",
        label: "WEAPON.QUALITIES.Knockdown",
        tooltip: "WEAPON.QUALITIES.KnockdownTooltip",
        activationType: ACTIVATION_TYPE.active,
    },
    inaccurate: {
        id: "inaccurate",
        abrev: "INA",
        label: "WEAPON.QUALITIES.Inaccurate",
        tooltip: "WEAPON.QUALITIES.InaccurateTooltip",
        activationType: ACTIVATION_TYPE.passive,
    },
    inferior: {
        id: "inferior",
        abrev: "INF",
        label: "WEAPON.QUALITIES.Inferior",
        tooltip: "WEAPON.QUALITIES.InferiorTooltip",
        activationType: ACTIVATION_TYPE.passive,
    },
    ion: {
        id: "ion",
        abrev: "ION",
        label: "WEAPON.QUALITIES.Ion",
        tooltip: "WEAPON.QUALITIES.IonTooltip",
        activationType: ACTIVATION_TYPE.passive,
    },
    limitedAmmo: {
        id: "limitedAmmo",
        abrev: "LIA",
        label: "WEAPON.QUALITIES.LimitedAmmo",
        tooltip: "WEAPON.QUALITIES.LimitedAmmoTooltip",
        activationType: ACTIVATION_TYPE.passive,
    },
    linked: {
        id: "linked",
        abrev: "LIN",
        label: "WEAPON.QUALITIES.Linked",
        tooltip: "WEAPON.QUALITIES.LinkedTooltip",
        activationType: ACTIVATION_TYPE.passive,
    },
    pierce: {
        id: "pierce",
        abrev: "PIE",
        label: "WEAPON.QUALITIES.Pierce",
        tooltip: "WEAPON.QUALITIES.PierceTooltip",
        activationType: ACTIVATION_TYPE.passive,
    },
    prepare: {
        id: "prepare",
        abrev: "PRE",
        label: "WEAPON.QUALITIES.Prepare",
        tooltip: "WEAPON.QUALITIES.PrepareTooltip",
        activationType: ACTIVATION_TYPE.passive,
    },
    slowFiring: {
        id: "slowFiring",
        abrev: "SLF",
        label: "WEAPON.QUALITIES.SlowFiring",
        tooltip: "WEAPON.QUALITIES.SlowFiringTooltip",
        activationType: ACTIVATION_TYPE.passive,
    },
    stun: {
        id: "stun",
        abrev: "STU",
        label: "WEAPON.QUALITIES.Stun",
        tooltip: "WEAPON.QUALITIES.StunTooltip",
        activationType: ACTIVATION_TYPE.active,
    },
    stunSetting: {
        id: "stunSetting",
        abrev: "STD",
        label: "WEAPON.QUALITIES.StunSetting",
        tooltip: "WEAPON.QUALITIES.StunSettingTooltip",
        activationType: ACTIVATION_TYPE.active,
    },
    stunDamage: {
        id: "stunDamage",
        abrev: "STD",
        label: "WEAPON.QUALITIES.StunDamage",
        tooltip: "WEAPON.QUALITIES.StunDamageTooltip",
        activationType: ACTIVATION_TYPE.passive,
    },
    sunder: {
        id: "sunder",
        abrev: "SUN",
        label: "WEAPON.QUALITIES.Sunder",
        tooltip: "WEAPON.QUALITIES.SunderTooltip",
        activationType: ACTIVATION_TYPE.active,
    },
    superior: {
        id: "superior",
        abrev: "SUP",
        label: "WEAPON.QUALITIES.Superior",
        tooltip: "WEAPON.QUALITIES.SuperiorTooltip",
        activationType: ACTIVATION_TYPE.passive,
    },
    tractor: {
        id: "tractor",
        abrev: "TRA",
        label: "WEAPON.QUALITIES.Tractor",
        tooltip: "WEAPON.QUALITIES.TractorTooltip",
        activationType: ACTIVATION_TYPE.passive,
    },
    vicious: {
        id: "vicious",
        abrev: "VIC",
        label: "WEAPON.QUALITIES.Vicious",
        tooltip: "WEAPON.QUALITIES.ViciousTooltip",
        activationType: ACTIVATION_TYPE.passive,
    },
};

/* -------------------------------------------- */

/**
 * Valid weapon animation types supported by the JB2A library
 * @type {string[]}
 */
export const ANIMATION_TYPES = Object.freeze([
    "explosion",
    "laser_shot",
    "laser_sword",
    "double_bladed_laser_sword",
    "throwable"
]);
