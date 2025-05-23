/**
 * The cost in skill points to obtain the next skill rank.
 * @enum {Readonly<{
 *  id: string,
 *  rank: number,
 *  label: string,
 *  description: string,
 *  cost: number,
 *  spent: number,
 *  bonus: number,
 *  path: boolean
 * }>}
 */
export const RANKS = {
    0: {
        id: "untrained",
        rank: 0,
        label: "SKILL.RANKS.UNTRAINED.label",
        description: "SKILL.RANKS.UNTRAINED.hint",
        cost: 0,
        spent: 0,
        bonus: -4,
        path: false
    },
    1: {
        id: "novice",
        rank: 1,
        label: "SKILL.RANKS.NOVICE.label",
        description: "SKILL.RANKS.NOVICE.hint",
        cost: 1,
        spent: 1,
        bonus: 0,
        path: false
    },
    2: {
        id: "apprentice",
        rank: 2,
        label: "SKILL.RANKS.APPRENTICE.label",
        description: "SKILL.RANKS.APPRENTICE.hint",
        cost: 1,
        spent: 2,
        bonus: 2,
        path: false
    },
    3: {
        id: "specialist",
        rank: 3,
        label: "SKILL.RANKS.SPECIALIST.label",
        description: "SKILL.RANKS.SPECIALIST.hint",
        cost: 2,
        spent: 4,
        bonus: 4,
        path: true
    },
    4: {
        id: "adept",
        rank: 4,
        label: "SKILL.RANKS.ADEPT.label",
        description: "SKILL.RANKS.ADEPT.hint",
        cost: 4,
        spent: 8,
        bonus: 8,
        path: false
    },
    5: {
        id: "master",
        rank: 5,
        label: "SKILL.RANKS.MASTER.label",
        description: "SKILL.RANKS.MASTER.hint",
        cost: 4,
        spent: 12,
        bonus: 12,
        path: true
    }
};

/**
 * A reverse mapping of skill rank IDs to rank numbers.
 * @enum {Readonly<number>}
 */
export const RANK_IDS = Object.freeze({
    untrained: 0,
    novice: 1,
    apprentice: 2,
    specialist: 3,
    adept: 4,
    master: 5
});

/**
 * The thematic categories of skills. Each skill belongs to one of these categories.
 * @type {Record<string, {label: string, hint: string, defaultIcon: string, color: Color}>}
 */
export const CATEGORIES = {
    "exp": {
        label: "SKILL.CATEGORY.EXPLORATION.label",
        hint: "SKILL.CATEGORY.EXPLORATION.hint",
        defaultIcon: "icons/skills/no-exp.jpg",
        color: Color.from("#81cc44")
    },
    "kno": {
        label: "SKILL.CATEGORY.KNOWLEDGE.label",
        hint: "SKILL.CATEGORY.KNOWLEDGE.hint",
        defaultIcon: "icons/skills/no-kno.jpg",
        color: Color.from("#6c6cff")
    },
    "soc": {
        label: "SKILL.CATEGORY.SOCIAL.label",
        hint: "SKILL.CATEGORY.SOCIAL.hint",
        defaultIcon: "icons/skills/no-soc.jpg",
        color: Color.from("#ab3fe8")
    }
};

/**
 * The skills configured for the system.
 * @type {Record<string, {id: string, category: string, abilities: [string, string]}>}
 */
export const SKILLS = {

    // Exploration Skills
    athletics: {
        id: "athletics",
        category: "exp",
        characteristics: ["strength", "dexterity"]
    },
    awareness: {
        id: "awareness",
        category: "exp",
        characteristics: ["intellect", "wisdom"]
    },
    stealth: {
        id: "stealth",
        category: "exp",
        characteristics: ["dexterity", "intellect"]
    },
    wilderness: {
        id: "wilderness",
        category: "exp",
        characteristics: ["toughness", "wisdom"]
    },

    // Knowledge Skills
    arcana: {
        id: "arcana",
        category: "kno",
        characteristics: ["intellect", "presence"]
    },
    medicine: {
        id: "medicine",
        category: "kno",
        characteristics: ["toughness", "wisdom"]
    },
    science: {
        id: "science",
        category: "kno",
        characteristics: ["intellect", "wisdom"]
    },
    society: {
        id: "society",
        category: "kno",
        characteristics: ["presence", "wisdom"]
    },

    // Social Skills
    deception: {
        id: "deception",
        category: "soc",
        characteristics: ["intellect", "presence"]
    },
    diplomacy: {
        id: "diplomacy",
        category: "soc",
        characteristics: ["wisdom", "presence"]
    },
    intimidation: {
        id: "intimidation",
        category: "soc",
        characteristics: ["strength", "presence"]
    },
    performance: {
        id: "performance",
        category: "soc",
        characteristics: ["dexterity", "presence"]
    }
};

/**
 * The UUID of the journal entry which provides skill definitions to the system.
 * @type {string}
 */
export let JOURNAL_ID = "Compendium.swerpg.rules.JournalEntry.SwerpgSkills00";
