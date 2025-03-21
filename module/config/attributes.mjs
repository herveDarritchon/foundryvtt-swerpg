/* -------------------------------------------- */

export const CARACTERISTICS_TYPE = Object.freeze({
    physical:{
        id: "physical",
        label: "SKILL_TYPE.Physical",
        abbreviation: "SKILL_TYPE.PhysicalAbbr",
        color: Color.from("#1d32b1"),
    },
    mental:{
        id: "mental",
        label: "SKILL_TYPE.Mental",
        abbreviation: "SKILL_TYPE.MentalAbbr",
        color: Color.from("#4354b8"),
    },
});

/* -------------------------------------------- */
/**
 * The primary attributes which are called abilities.
 * @type {{
 *   strength: {id: string, label: string, abbreviation: string},
 *   toughness: {id: string, label: string, abbreviation: string},
 *   dexterity: {id: string, label: string, abbreviation: string},
 *   intellect: {id: string, label: string, abbreviation: string},
 *   presence: {id: string, label: string, abbreviation: string},
 *   wisdom: {id: string, label: string, abbreviation: string}
 * }}
 */
export const CHARACTERISTICS = Object.freeze({
    brawn: {
        id: "brawn",
        label: "CHARACTERISTICS.Brawn",
        abbreviation: "CHARACTERISTICS.BrawnAbbr",
        type: CARACTERISTICS_TYPE.physical,
        color: Color.from("#870321"),
        sheetOrder: 1,
        nodeId: "bra"
    },
    agility: {
        id: "agility",
        label: "CHARACTERISTICS.Agility",
        abbreviation: "CHARACTERISTICS.AgilityAbbr",
        type: CARACTERISTICS_TYPE.physical,
        color: Color.from("#113c1b"),
        sheetOrder: 2,
        nodeId: "agi"
    },
    intellect: {
        id: "intellect",
        label: "CHARACTERISTICS.Intellect",
        abbreviation: "CHARACTERISTICS.IntellectAbbr",
        type: CARACTERISTICS_TYPE.mental,
        color: Color.from("#00FFFF"),
        sheetOrder: 3,
        nodeId: "int"
    },
    cunning: {
        id: "cunning",
        label: "CHARACTERISTICS.Cunning",
        abbreviation: "CHARACTERISTICS.CunningAbbr",
        type: CARACTERISTICS_TYPE.mental,
        color: Color.from("#dc7818"),
        sheetOrder: 4,
        nodeId: "cun"
    },
    willpower: {
        id: "willpower",
        label: "CHARACTERISTICS.Willpower",
        abbreviation: "CHARACTERISTICS.WillpowerAbbr",
        type: CARACTERISTICS_TYPE.mental,
        color: Color.from("#8a8a17"),
        sheetOrder: 5,
        nodeId: "wil"
    },
    presence: {
        id: "presence",
        label: "CHARACTERISTICS.Presence",
        abbreviation: "CHARACTERISTICS.PresenceAbbr",
        type: CARACTERISTICS_TYPE.mental,
        color: Color.from("#640c88"),
        sheetOrder: 5,
        nodeId: "pre"
    }
});


/* -------------------------------------------- */

export const SKILL_TYPE = Object.freeze({
    general:{
        id: "general",
        label: "SKILL_TYPE.General",
        abbreviation: "SKILL_TYPE.GeneralAbbr",
        color: Color.from("#1d32b1"),
    },
    knowledge:{
        id: "knowledge",
        label: "SKILL_TYPE.Knowledge",
        abbreviation: "SKILL_TYPE.KnowledgeAbbr",
        color: Color.from("#4354b8"),
    },
    combat:{
        id: "combat",
        label: "SKILL_TYPE.Combat",
        abbreviation: "SKILL_TYPE.CombatAbbr",
        color: Color.from("#c82678"),
    }
});

/* -------------------------------------------- */

/**
 * A character is first defined by thirteen skills, which represent their strengths and weaknesses.
 * These skills are rated on a scale of 100 and are sufficient to cover all tests required in the game.
 * Their abbreviations are shown in brackets.
 * @type {{
 *  melee: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string},
 *  knowledge: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string},
 *  stealth: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string},
 *  endurance: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string},
 *  strength: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string},
 *  dexterity: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string},
 *  magic: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string},
 *  athletics: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string},
 *  perception: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string},
 *  sociability: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string},
 *  survival: {id: string, label: string, abbreviation: string, type: string, color: Color, sheetOrder: number, nodeId: string},
 *  marksmanship: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string},
 *  willpower: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string}
 * }}
 */
export const SKILLS = Object.freeze({
    cool: {
        id: "cool",
        label: "SKILLS.Cool",
        abbreviation: "SKILLS.CoolAbbr",
        color: Color.from("#ec7bf1"),
        sheetOrder: 1,
        nodeId: "coo",
        characteristics: CHARACTERISTICS.presence,
        type: SKILL_TYPE.general
    },
    discipline: {
        id: "discipline",
        label: "SKILLS.Discipline",
        abbreviation: "SKILLS.DisciplineAbbr",
        color: Color.from("#00FFFF"),
        sheetOrder: 2,
        nodeId: "dis",
        characteristics: CHARACTERISTICS.willpower,
        type: SKILL_TYPE.general
    },
    negotiation: {
        id: "negotiation",
        label: "SKILLS.Negotiation",
        abbreviation: "SKILLS.NegotiationAbbr",
        color: Color.from("#8032d8"),
        sheetOrder: 3,
        nodeId: "neg",
        characteristics: CHARACTERISTICS.presence,
        type: SKILL_TYPE.general
    },
    perception: {
        id: "perception",
        label: "SKILLS.Perception",
        abbreviation: "SKILLS.PerceptionAbbr",
        color: Color.from("#0e55d3"),
        sheetOrder: 4,
        nodeId: "per",
        characteristics: CHARACTERISTICS.cunning,
        type: SKILL_TYPE.general
    },
    vigilance: {
        id: "vigilance",
        label: "SKILLS.Vigilance",
        abbreviation: "SKILLS.VigilanceAbbr",
        color: Color.from("#4090c1"),
        sheetOrder: 5,
        nodeId: "vig",
        characteristics: CHARACTERISTICS.willpower,
        type: SKILL_TYPE.general
    },
    brawl: {
        id: "brawl",
        label: "SKILLS.Brawl",
        abbreviation: "SKILLS.BrawlAbbr",
        color: Color.from("#dc7818"),
        sheetOrder: 6,
        nodeId: "bra",
        characteristics: CHARACTERISTICS.brawn,
        type: SKILL_TYPE.combat
    },
    melee: {
        id: "melee",
        label: "SKILLS.Melee",
        abbreviation: "SKILLS.MeleeAbbr",
        color: Color.from("#00FF00"),
        sheetOrder: 7,
        nodeId: "mel",
        characteristics: CHARACTERISTICS.brawn,
        type: SKILL_TYPE.combat
    },
    rangedlight: {
        id: "rangedlight",
        label: "SKILLS.RangedLight",
        abbreviation: "SKILLS.RangedLightAbbr",
        color: Color.from("#f61c1c"),
        sheetOrder: 8,
        nodeId: "rgl",
        characteristics: CHARACTERISTICS.agility,
        type: SKILL_TYPE.combat
    },
    rangedheavy: {
        id: "rangedheavy",
        label: "SKILLS.RangedHeavy",
        abbreviation: "SKILLS.RangedHeavyAbbr",
        color: Color.from("#7e0808"),
        sheetOrder: 9,
        nodeId: "rgh",
        characteristics: CHARACTERISTICS.agility,
        type: SKILL_TYPE.combat
    },
    gunnery: {
        id: "gunnery",
        label: "SKILLS.Gunnery",
        abbreviation: "SKILLS.GunneryAbbr",
        color: Color.from("#2c0303"),
        sheetOrder: 10,
        nodeId: "gun",
        characteristics: CHARACTERISTICS.agility,
        type: SKILL_TYPE.combat
    },
    astrogation: {
        id: "astrogation",
        label: "SKILLS.Astrogation",
        abbreviation: "SKILLS.AstrogationAbbr",
        color: Color.from("#085560"),
        sheetOrder: 11,
        nodeId: "ast",
        characteristics: CHARACTERISTICS.intellect,
        type: SKILL_TYPE.general
    },
    athletics: {
        id: "athletics",
        label: "SKILLS.Athletics",
        abbreviation: "SKILLS.AthleticsAbbr",
        color: Color.from("#47331f"),
        sheetOrder: 12,
        nodeId: "ath",
        characteristics: CHARACTERISTICS.brawn,
        type: SKILL_TYPE.general
    },
    charm: {
        id: "charm",
        label: "SKILLS.Charm",
        abbreviation: "SKILLS.CharmAbbr",
        color: Color.from("#ecbd6c"),
        sheetOrder: 13,
        nodeId: "cha",
        characteristics: CHARACTERISTICS.presence,
        type: SKILL_TYPE.general
    },
    coercion: {
        id: "coercion",
        label: "SKILLS.Coercion",
        abbreviation: "SKILLS.CoercionAbbr",
        color: Color.from("#350963"),
        sheetOrder: 14,
        nodeId: "coe",
        characteristics: CHARACTERISTICS.willpower,
        type: SKILL_TYPE.general
    },
    computers: {
        id: "computers",
        label: "SKILLS.Computers",
        abbreviation: "SKILLS.ComputersAbbr",
        color: Color.from("#350963"),
        sheetOrder: 15,
        nodeId: "com",
        characteristics: CHARACTERISTICS.intellect,
        type: SKILL_TYPE.general
    },
    coordination: {
        id: "coordination",
        label: "SKILLS.Coordination",
        abbreviation: "SKILLS.CoordinationAbbr",
        color: Color.from("#350963"),
        sheetOrder: 16,
        nodeId: "cod",
        characteristics: CHARACTERISTICS.agility,
        type: SKILL_TYPE.general
    },
    deception: {
        id: "deception",
        label: "SKILLS.Deception",
        abbreviation: "SKILLS.DeceptionAbbr",
        color: Color.from("#350963"),
        sheetOrder: 17,
        nodeId: "dec",
        characteristics: CHARACTERISTICS.cunning,
        type: SKILL_TYPE.general
    },
    leadership: {
        id: "leadership",
        label: "SKILLS.Leadership",
        abbreviation: "SKILLS.LeadershipAbbr",
        color: Color.from("#350963"),
        sheetOrder: 18,
        nodeId: "lea",
        characteristics: CHARACTERISTICS.presence,
        type: SKILL_TYPE.general
    },
    mechanics: {
        id: "mechanics",
        label: "SKILLS.Mechanics",
        abbreviation: "SKILLS.MechanicsAbbr",
        color: Color.from("#350963"),
        sheetOrder: 19,
        nodeId: "mec",
        characteristics: CHARACTERISTICS.intellect,
        type: SKILL_TYPE.general
    },
    medicine: {
        id: "medicine",
        label: "SKILLS.Medicine",
        abbreviation: "SKILLS.MedicineAbbr",
        color: Color.from("#350963"),
        sheetOrder: 20,
        nodeId: "med",
        characteristics: CHARACTERISTICS.intellect,
        type: SKILL_TYPE.general
    },
    pilotingplanetary: {
        id: "pilotingplanetary",
        label: "SKILLS.PilotingPlanetary",
        abbreviation: "SKILLS.PilotingPlanetaryAbbr",
        color: Color.from("#350963"),
        sheetOrder: 21,
        nodeId: "pip",
        characteristics: CHARACTERISTICS.agility,
        type: SKILL_TYPE.general
    },
    pilotingspace: {
        id: "pilotingspace",
        label: "SKILLS.PilotingSpace",
        abbreviation: "SKILLS.PilotingSpaceAbbr",
        color: Color.from("#350963"),
        sheetOrder: 22,
        nodeId: "pis",
        characteristics: CHARACTERISTICS.agility,
        type: SKILL_TYPE.general
    },
    resilience: {
        id: "resilience",
        label: "SKILLS.Resilience",
        abbreviation: "SKILLS.ResilienceAbbr",
        color: Color.from("#350963"),
        sheetOrder: 23,
        nodeId: "res",
        characteristics: CHARACTERISTICS.brawn,
        type: SKILL_TYPE.general
    },
    skulduggery: {
        id: "skulduggery",
        label: "SKILLS.Skulduggery",
        abbreviation: "SKILLS.SkulduggeryAbbr",
        color: Color.from("#350963"),
        sheetOrder: 24,
        nodeId: "sku",
        characteristics: CHARACTERISTICS.cunning,
        type: SKILL_TYPE.general
    },
    stealth: {
        id: "stealth",
        label: "SKILLS.Stealth",
        abbreviation: "SKILLS.StealthAbbr",
        color: Color.from("#350963"),
        sheetOrder: 25,
        nodeId: "ste",
        characteristics: CHARACTERISTICS.agility,
        type: SKILL_TYPE.general
    },
    streetwise: {
        id: "streetwise",
        label: "SKILLS.StreetWise",
        abbreviation: "SKILLS.StreetWiseAbbr",
        color: Color.from("#350963"),
        sheetOrder: 26,
        nodeId: "stw",
        characteristics: CHARACTERISTICS.cunning,
        type: SKILL_TYPE.general
    },
    survival: {
        id: "survival",
        label: "SKILLS.Survival",
        abbreviation: "SKILLS.SurvivalAbbr",
        color: Color.from("#0b3514"),
        sheetOrder: 27,
        nodeId: "sur",
        characteristics: CHARACTERISTICS.cunning,
        type: SKILL_TYPE.general
    },
    coreworlds: {
        id: "coreworlds",
        label: "SKILLS.CoreWorlds",
        abbreviation: "SKILLS.CoreWorldsAbbr",
        color: Color.from("#0b3514"),
        sheetOrder: 29,
        nodeId: "cor",
        characteristics: CHARACTERISTICS.intellect,
        type: SKILL_TYPE.knowledge
    },
    lore: {
        id: "lore",
        label: "SKILLS.Lore",
        abbreviation: "SKILLS.LoreAbbr",
        color: Color.from("#0b3514"),
        sheetOrder: 30,
        nodeId: "lor",
        characteristics: CHARACTERISTICS.intellect,
        type: SKILL_TYPE.knowledge
    },
    outerrim: {
        id: "outerrim",
        label: "SKILLS.OuterRim",
        abbreviation: "SKILLS.OuterRimAbbr",
        color: Color.from("#0b3514"),
        sheetOrder: 31,
        nodeId: "out",
        characteristics: CHARACTERISTICS.intellect,
        type: SKILL_TYPE.knowledge
    },
    underworld: {
        id: "underworld",
        label: "SKILLS.Underworld",
        abbreviation: "SKILLS.UnderworldAbbr",
        color: Color.from("#0b3514"),
        sheetOrder: 32,
        nodeId: "out",
        characteristics: CHARACTERISTICS.intellect,
        type: SKILL_TYPE.knowledge
    },
    xenology: {
        id: "xenology",
        label: "SKILLS.Xenology",
        abbreviation: "SKILLS.XenologyAbbr",
        color: Color.from("#0b3514"),
        sheetOrder: 33,
        nodeId: "out",
        characteristics: CHARACTERISTICS.intellect,
        type: SKILL_TYPE.knowledge
    },
    education: {
        id: "education",
        label: "SKILLS.Education",
        abbreviation: "SKILLS.EducationAbbr",
        color: Color.from("#0b3514"),
        sheetOrder: 33,
        nodeId: "edu",
        characteristics: CHARACTERISTICS.intellect,
        type: SKILL_TYPE.knowledge
    },
});

/**
 * Secondary attributes complete the character: Initiative, Vitality, Composure, and Fate.
 * These four scores will fluctuate throughout the adventures.
 * @type {{
 * initiative: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string},
 * vitality: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string},
 * resolve: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string},
 * fortune: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string},
 * }}
 */
export const SECONDARY_ATTRIBUTES = Object.freeze({
    initiative: {
        id: "initiative",
        label: "SECONDARY_ATTRIBUTES.Initiative",
        abbreviation: "SECONDARY_ATTRIBUTES.InitiativeAbbr",
        color: Color.from("#d6d30c"),
        sheetOrder: 1,
        nodeId: "ini"
    },
    soak: {
        id: "soak",
        label: "SECONDARY_ATTRIBUTES.Soak",
        abbreviation: "SECONDARY_ATTRIBUTES.SoakAbbr",
        color: Color.from("#e62b4c"),
        sheetOrder: 1,
        hasThreshold: false,
        nodeId: "soa"
    },
    wounds: {
        id: "wounds",
        label: "SECONDARY_ATTRIBUTES.Wounds",
        abbreviation: "SECONDARY_ATTRIBUTES.WoundsAbbr",
        color: Color.from("#460b87"),
        sheetOrder: 2,
        hasThreshold: true,
        nodeId: "wou"
    },
    strain: {
        id: "strain",
        label: "SECONDARY_ATTRIBUTES.Strain",
        abbreviation: "SECONDARY_ATTRIBUTES.StrainAbbr",
        color: Color.from("#8ac6ec"),
        sheetOrder: 3,
        hasThreshold: true,
        nodeId: "str"
    },
    defense: {
        id: "defense",
        label: "SECONDARY_ATTRIBUTES.Defense",
        abbreviation: "SECONDARY_ATTRIBUTES.DefenseAbbr",
        color: Color.from("#8ac6ec"),
        sheetOrder: 4,
        hasThreshold: false,
        nodeId: "def"
    },

});

/**
 * Secondary attributes complete the character: Initiative, Vitality, Composure, and Fate.
 * These four scores will fluctuate throughout the adventures.
 * @type {{
 * initiative: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string},
 * vitality: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string},
 * resolve: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string},
 * fortune: {id: string, label: string, abbreviation: string, color: Color, sheetOrder: number, nodeId: string},
 * }}
 */
export const DERIVED_CHARACTERISTICS = Object.freeze({
    initiative: {
        id: "initiative",
        label: "SECONDARY_CHARACTERISTICS.Initiative",
        abbreviation: "SECONDARY_CHARACTERISTICS.InitiativeAbbr",
        color: Color.from("#d6d30c"),
        sheetOrder: 1,
        nodeId: "ini"
    },
    soak: {
        id: "soak",
        label: "SECONDARY_CHARACTERISTICS.Soak",
        abbreviation: "SECONDARY_CHARACTERISTICS.SoakAbbr",
        color: Color.from("#e62b4c"),
        sheetOrder: 1,
        hasThreshold: false,
        nodeId: "soa"
    },
    wounds: {
        id: "wounds",
        label: "SECONDARY_CHARACTERISTICS.Wounds",
        abbreviation: "SECONDARY_CHARACTERISTICS.WoundsAbbr",
        color: Color.from("#460b87"),
        sheetOrder: 2,
        hasThreshold: true,
        nodeId: "wou"
    },
    strain: {
        id: "strain",
        label: "SECONDARY_CHARACTERISTICS.Strain",
        abbreviation: "SECONDARY_CHARACTERISTICS.StrainAbbr",
        color: Color.from("#8ac6ec"),
        sheetOrder: 3,
        hasThreshold: true,
        nodeId: "str"
    },
    defense: {
        id: "defense",
        label: "SECONDARY_CHARACTERISTICS.Defense",
        abbreviation: "SECONDARY_CHARACTERISTICS.DefenseAbbr",
        color: Color.from("#8ac6ec"),
        sheetOrder: 4,
        hasThreshold: false,
        nodeId: "def"
    },

});

/* -------------------------------------------- */

/**
 * Define the top level damage categories.
 * @enum {{id: string, label: string}}
 */
export const DAMAGE_CATEGORIES = Object.freeze({
    physical: {
        id: "physical",
        label: "DAMAGE.Physical"
    },
    elemental: {
        id: "elemental",
        label: "DAMAGE.Elemental"
    },
    spiritual: {
        id: "spiritual",
        label: "DAMAGE.Spiritual"
    }
});

/* -------------------------------------------- */

/**
 * Define the individual damage types within each damage category.
 * @enum {{id: string, label: string, type: string}}
 */
export const DAMAGE_TYPES = Object.freeze({
    bludgeoning: {
        id: "bludgeoning",
        label: "DAMAGE.Bludgeoning",
        type: "physical"
    },
    corruption: {
        id: "corruption",
        label: "DAMAGE.Corruption",
        type: "spiritual"
    },
    piercing: {
        id: "piercing",
        label: "DAMAGE.Piercing",
        type: "physical"
    },
    slashing: {
        id: "slashing",
        label: "DAMAGE.Slashing",
        type: "physical"
    },
    poison: {
        id: "poison",
        label: "DAMAGE.Poison",
        type: "physical"
    },
    acid: {
        id: "acid",
        label: "DAMAGE.Acid",
        type: "elemental"
    },
    fire: {
        id: "fire",
        label: "DAMAGE.Fire",
        type: "elemental"
    },
    cold: {
        id: "cold",
        label: "DAMAGE.Cold",
        type: "elemental"
    },
    electricity: {
        id: "electricity",
        label: "DAMAGE.Electricity",
        type: "elemental"
    },
    psychic: {
        id: "psychic",
        label: "DAMAGE.Psychic",
        type: "spiritual"
    },
    radiant: {
        id: "radiant",
        label: "DAMAGE.Radiant",
        type: "spiritual"
    },
    void: {
        id: "void",
        label: "DAMAGE.Void",
        type: "spiritual"
    }
});


/* -------------------------------------------- */

/**
 * @typedef {Object}  SwerpgResource    A resource pool available to an Actor within the system
 * @property {string} id                  The resource id
 * @property {string} label               The localized full label for the resource
 * @property {string} abbreviation        The localized abbreviation for the resource
 * @property {string} type                The type of resource, "active" or "reserve"
 * @property {string} tooltip             The tooltip formula for the resource
 * @property {{high: number, low: number, heal: number}} color  Displayed colors for the resource
 */

/**
 * Define the resource pools which are tracked for each character
 * @enum {SwerpgResource}
 */
export const RESOURCES = Object.freeze({
    health: {
        id: "health",
        label: "RESOURCES.HEALTH",
        type: "active",
        tooltip: "(6 &times; Level) + (4 &times; Toughness) + (2 &times; Strength)",
        color: {
            high: Color.from("#d72828"),
            low: Color.from("#5e0000"),
            heal: Color.from("#48c248")
        },
    },
    wounds: {
        id: "wounds",
        label: "RESOURCES.WOUNDS",
        type: "reserve",
        tooltip: "Health &times; 1.5",
        color: {
            high: Color.from("#d72828"),
            low: Color.from("#5e0000"),
            heal: Color.from("#48c248")
        },
    },
    morale: {
        id: "morale",
        label: "RESOURCES.MORALE",
        type: "active",
        tooltip: "(6 &times; Level) + (4 &times; Presence) + (2 &times; Wisdom)",
        color: {
            high: Color.from("#7550ff"),
            low: Color.from("#3c037e"),
            heal: Color.from("#cd4fff")
        }
    },
    madness: {
        id: "madness",
        label: "RESOURCES.MADNESS",
        tooltip: "Morale &times; 1.5",
        type: "reserve",
        color: {
            high: Color.from("#7550ff"),
            low: Color.from("#3c037e"),
            heal: Color.from("#cd4fff")
        }
    },
    action: {
        id: "action",
        label: "RESOURCES.ACTION",
        tooltip: "3 + Action Bonus",
        type: "active",
        color: Color.from("#FF9900"),
        max: 12
    },
    focus: {
        id: "focus",
        label: "RESOURCES.FOCUS",
        tooltip: "(Wisdom + Presence + Intellect) / 2",
        type: "active",
        color: Color.from("#3385ff"),
        max: 24
    },
    heroism: {
        id: "heroism",
        label: "RESOURCES.HEROISM",
        tooltip: "Maximum 3",
        type: "active",
        color: Color.from("#ff0059"),
        max: 3
    }
});

/* -------------------------------------------- */

/**
 * The base threshold for passive checks onto which bonuses are added.
 * @type {number}
 */
export const PASSIVE_BASE = 12;

/* -------------------------------------------- */

/**
 * The defense types which can be used to counter an attack roll.
 * @type {object}
 */
export const DEFENSES = {
    physical: {
        id: "physical",
        label: "DEFENSES.Physical",
        type: "physical"
    },
    armor: {
        id: "armor",
        label: "DEFENSES.Armor",
        type: "physical"
    },
    block: {
        id: "block",
        label: "DEFENSES.Block",
        type: "physical"
    },
    dodge: {
        id: "dodge",
        label: "DEFENSES.Dodge",
        type: "physical"
    },
    parry: {
        id: "parry",
        label: "DEFENSES.Parry",
        type: "physical"
    },
    fortitude: {
        id: "fortitude",
        label: "DEFENSES.Fortitude",
        abilities: ["strength", "wisdom"],
        tooltip: `${PASSIVE_BASE} + Strength + Wisdom`,
        type: "save"
    },
    willpower: {
        id: "willpower",
        label: "DEFENSES.Willpower",
        abilities: ["toughness", "presence"],
        tooltip: `${PASSIVE_BASE} + Toughness + Presence`,
        type: "save"
    },
    reflex: {
        id: "reflex",
        label: "DEFENSES.Reflex",
        abilities: ["dexterity", "intellect"],
        tooltip: `${PASSIVE_BASE} + Dexterity + Intellect`,
        type: "save"
    },
    wounds: {
        id: "wounds",
        label: "DEFENSES.Wounds",
        tooltip: `${PASSIVE_BASE} + (Wounds / 10)`,
        type: "threshold"
    },
    madness: {
        id: "madness",
        label: "DEFENSES.Madness",
        tooltip: `${PASSIVE_BASE} + (Madness / 10)`,
        type: "threshold"
    }
}

