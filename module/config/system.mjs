import * as ATTRIBUTES from "./attributes.mjs";
import * as ACTION from "./action.mjs";
import * as ADVERSARY from "./adversaries.mjs";
import * as ARMOR from "./armor.mjs";
import * as dice from "./dice.mjs";
import * as EFFECTS from "./effects.mjs";
import * as SKILL from "./skills.mjs"
import * as SPELL from "./spellcraft.mjs";
import * as WEAPON from "./weapon.mjs";
import {ENCHANTMENT_TIERS, QUALITY_TIERS} from "./items.mjs";
import {ASCII, ASCII_DEV_MODE, DEV_MODE} from "../applications/system/constants.mjs";

export const SYSTEM_ID = "swerpg";

/* -------------------------------------------- */

/**
 * The amount of damage resistance granted by ancestries.
 * @type {object}
 */
export const ANCESTRIES = {
    primaryAbilityStart: 3,
    secondaryAbilityStart: 2,
    resistanceAmount: 5
}

/* -------------------------------------------- */

/**
 * The compendium pack IDs which should be used as the source for character creation materials.
 * @enum {string}
 */
export const COMPENDIUM_PACKS = {
    ancestry: "swerpg.ancestry",
    archetype: "swerpg.archetype",
    background: "swerpg.background",
    origin: "swerpg.origin",
    spell: "swerpg.spells",
    spellExtensions: null,
    talent: "swerpg.talent",
    talentExtensions: null,
    taxonomy: "swerpg.taxonomy"
}

/* -------------------------------------------- */

/**
 * The threat levels that an adversary may have.
 * @enum {number}
 */
export const THREAT_LEVELS = {
    minion: {
        id: "minion",
        actionMax: 4,
        label: "ADVERSARY.ThreatMinion",
        scaling: 0.5,
        icon: "fa-solid fa-chevron-down"
    },
    normal: {
        id: "normal",
        actionMax: 6,
        label: "ADVERSARY.ThreatNormal",
        scaling: 1.0,
        icon: "fa-solid fa-chevron-up"
    },
    elite: {
        id: "elite",
        actionMax: 8,
        label: "ADVERSARY.ThreatElite",
        scaling: 1.5,
        icon: "fa-solid fa-chevrons-up"
    },
    boss: {
        id: "boss",
        actionMax: 10,
        label: "ADVERSARY.ThreatBoss",
        scaling: 2.0,
        icon: "fa-solid fa-skull"
    }
};

/* -------------------------------------------- */

/**
 * Define the actor preparation hooks which are supported for Talent configuration.
 * @enum {{signature: string, argNames: string[]}}
 */
export const ACTOR_HOOKS = Object.freeze({

    // Action Usage
    prepareStandardCheck: {
        group: "TALENT.HOOKS.GROUP_ACTION",
        argNames: ["rollData"]
    },
    prepareWeaponAttack: {
        group: "TALENT.HOOKS.GROUP_ACTION",
        argNames: ["action", "target", "rollData"]
    },
    applyCriticalEffects: {
        group: "TALENT.HOOKS.GROUP_ACTION",
        argNames: ["action", "outcome", "self"]
    },
    defendSkillAttack: {
        group: "TALENT.HOOKS.GROUP_ACTION",
        argNames: ["action", "origin", "rollData"]
    },
    defendSpellAttack: {
        group: "TALENT.HOOKS.GROUP_ACTION",
        argNames: ["spell", "origin", "rollData"]
    },
    defendWeaponAttack: {
        group: "TALENT.HOOKS.GROUP_ACTION",
        argNames: ["action", "origin", "rollData"]
    },
    applyActionOutcome: {
        group: "TALENT.HOOKS.GROUP_ACTION",
        argNames: ["action", "outcome", "options"]
    },

    // Data Preparation
    prepareActions: {
        group: "TALENT.HOOKS.GROUP_PREPARATION",
        argNames: ["actions"]
    },
    prepareResources: {
        group: "TALENT.HOOKS.GROUP_PREPARATION",
        argNames: ["resources"]
    },
    prepareDefenses: {
        group: "TALENT.HOOKS.GROUP_PREPARATION",
        argNames: ["defenses"]
    },
    prepareInitiativeCheck: {
        group: "TALENT.HOOKS.GROUP_PREPARATION",
        argNames: ["rollData"]
    },
    prepareMovement: {
        group: "TALENT.HOOKS.GROUP_PREPARATION",
        argNames: ["movement"]
    },
    prepareResistances: {
        group: "TALENT.HOOKS.GROUP_PREPARATION",
        argNames: ["resistances"]
    },
    prepareSkillCheck: {
        group: "TALENT.HOOKS.GROUP_PREPARATION",
        argNames: ["skill", "rollData"]
    },
    prepareSkillAttack: {
        group: "TALENT.HOOKS.GROUP_PREPARATION",
        argNames: ["action", "target", "rollData"]
    },
    prepareSpellAttack: {
        group: "TALENT.HOOKS.GROUP_PREPARATION",
        argNames: ["spell", "target", "rollData"]
    },
    prepareTraining: {
        group: "TALENT.HOOKS.GROUP_PREPARATION",
        argNames: ["training"]
    }
});


/* -------------------------------------------- */

/**
 * Define the Action life-cycle hooks which are supported for an Action.
 * @enum {Readonly<Object<{argNames: string[]}>>}
 */
export const ACTION_HOOKS = Object.freeze({
    prepare: {
        argNames: []
    },
    displayOnSheet: {
        argNames: ["combatant"]
    },
    canUse: {
        argNames: ["targets"]
    },
    preActivate: {
        argNames: ["targets"],
        async: true
    },
    roll: {
        argNames: ["target", "rolls"],
        async: true
    },
    postActivate: {
        argNames: ["outcome"],
        async: true
    },
    confirm: {
        argNames: [],
        async: true
    }
});

/* -------------------------------------------- */

/**
 * Include all constant definitions within the SYSTEM global export
 * @type {Object}
 */
export const SYSTEM = {
    id: SYSTEM_ID,
    ABILITIES: ATTRIBUTES.ABILITIES,
    ACTION,
    ACTOR_HOOKS,
    ACTION_HOOKS,
    ADVERSARY,
    ANCESTRIES,
    ARMOR,
    ASCII,
    ASCII_DEV_MODE,
    COMPENDIUM_PACKS,
    DAMAGE_CATEGORIES: ATTRIBUTES.DAMAGE_CATEGORIES,
    DAMAGE_TYPES: ATTRIBUTES.DAMAGE_TYPES,
    DEFENSES: ATTRIBUTES.DEFENSES,
    DEV_MODE,
    EFFECTS,
    ENCHANTMENT_TIERS,
    PASSIVE_BASE: ATTRIBUTES.PASSIVE_BASE,
    QUALITY_TIERS,
    RESOURCES: ATTRIBUTES.RESOURCES,
    SKILL,
    SKILLS: ATTRIBUTES.SKILLS,
    SECONDARY_ATTRIBUTES: ATTRIBUTES.SECONDARY_ATTRIBUTES,
    SPELL,
    THREAT_LEVELS,
    WEAPON,
    activeCheckFormula: "3d8",
    dice: dice,
};
