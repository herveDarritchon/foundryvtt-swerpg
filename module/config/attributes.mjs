
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
export const ABILITIES = Object.freeze({
  wisdom: {
    id: "wisdom",
    label: "ABILITIES.Wisdom",
    abbreviation: "ABILITIES.WisdomAbbr",
    type: "mental",
    color: Color.from("#FF00FF"),
    sheetOrder: 2,
    nodeId: "wis"
  },
  presence: {
    id: "presence",
    label: "ABILITIES.Presence",
    abbreviation: "ABILITIES.PresenceAbbr",
    type: "mental",
    color: Color.from("#0000FF"),
    sheetOrder: 4,
    nodeId: "pre"
  },
  intellect: {
    id: "intellect",
    label: "ABILITIES.Intellect",
    abbreviation: "ABILITIES.IntellectAbbr",
    type: "mental",
    color: Color.from("#00FFFF"),
    sheetOrder: 6,
    nodeId: "int"
  },
  strength: {
    id: "strength",
    label: "ABILITIES.Strength",
    abbreviation: "ABILITIES.StrengthAbbr",
    type: "physical",
    color: Color.from("#FF0000"),
    sheetOrder: 1,
    nodeId: "str"
  },
  toughness: {
    id: "toughness",
    label: "ABILITIES.Toughness",
    abbreviation: "ABILITIES.ToughnessAbbr",
    type: "physical",
    color: Color.from("#FFFF00"),
    sheetOrder: 3,
    nodeId: "tou"
  },
  dexterity: {
    id: "dexterity",
    label: "ABILITIES.Dexterity",
    abbreviation: "ABILITIES.DexterityAbbr",
    type: "physical",
    color: Color.from("#00FF00"),
    sheetOrder: 5,
    nodeId: "dex"
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
  melee: {
    id: "melee",
    label: "SKILLS.Melee",
    abbreviation: "SKILLS.MeleeAbbr",
    color: Color.from("#ff0015"),
    sheetOrder: 1,
    nodeId: "mel"
  },
  knowledge: {
    id: "knowledge",
    label: "SKILLS.Knowledge",
    abbreviation: "SKILLS.KnowledgeAbbr",
    color: Color.from("#00FFFF"),
    sheetOrder: 2,
    nodeId: "kno"
  },
  stealth: {
    id: "stealth",
    label: "SKILLS.Stealth",
    abbreviation: "SKILLS.StealthAbbr",
    color: Color.from("#8032d8"),
    sheetOrder: 3,
    nodeId: "ste"
  },
  endurance: {
    id: "endurance",
    label: "SKILLS.Endurance",
    abbreviation: "SKILLS.EnduranceAbbr",
    color: Color.from("#4090c1"),
    sheetOrder: 4,
    nodeId: "end"
  },
  strength: {
    id: "strength",
    label: "SKILLS.Strength",
    abbreviation: "SKILLS.StrengthAbbr",
    color: Color.from("#dc7818"),
    sheetOrder: 5,
    nodeId: "str"
  },
  dexterity: {
    id: "dexterity",
    label: "SKILLS.Dexterity",
    abbreviation: "SKILLS.DexterityAbbr",
    color: Color.from("#00FF00"),
    sheetOrder: 6,
    nodeId: "dex"
  },
  magic: {
    id: "magic",
    label: "SKILLS.Magic",
    abbreviation: "SKILLS.MagicAbbr",
    color: Color.from("#b1b1b1"),
    sheetOrder: 7,
    nodeId: "mag"
  },
  athletics: {
    id: "athletics",
    label: "SKILLS.Athletics",
    abbreviation: "SKILLS.AthleticsAbbr",
    color: Color.from("#47331f"),
    sheetOrder: 8,
    nodeId: "ath"
  },
  perception: {
    id: "perception",
    label: "SKILLS.Perception",
    abbreviation: "SKILLS.PerceptionAbbr",
    color: Color.from("#0e55d3"),
    sheetOrder: 9,
    nodeId: "per"
  },
  sociability: {
    id: "sociability",
    label: "SKILLS.Sociability",
    abbreviation: "SKILLS.SociabilityAbbr",
    color: Color.from("#d039d8"),
    sheetOrder: 10,
    nodeId: "soc"
  },
  survival: {
    id: "survival",
    label: "SKILLS.Survival",
    abbreviation: "SKILLS.SurvivalAbbr",
    type: "physical",
    color: Color.from("#0b3514"),
    sheetOrder: 11,
    nodeId: "sur"
  },
  marksmanship: {
    id: "marksmanship",
    label: "SKILLS.Marksmanship",
    abbreviation: "SKILLS.MarksmanshipAbbr",
    color: Color.from("#ecbd6c"),
    sheetOrder: 12,
    nodeId: "mar"
  },
  willpower: {
    id: "willpower",
    label: "SKILLS.Willpower",
    abbreviation: "SKILLS.WillpowerAbbr",
    color: Color.from("#350963"),
    sheetOrder: 13,
    nodeId: "wil"
  }
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
  vitality: {
    id: "vitality",
    label: "SECONDARY_ATTRIBUTES.Vitality",
    abbreviation: "SECONDARY_ATTRIBUTES.VitalityAbbr",
    color: Color.from("#e62b4c"),
    sheetOrder: 2,
    nodeId: "vit"
  },
  resolve: {
    id: "resolve",
    label: "SECONDARY_ATTRIBUTES.Resolve",
    abbreviation: "SECONDARY_ATTRIBUTES.ResolveAbbr",
    color: Color.from("#460b87"),
    sheetOrder: 3,
    nodeId: "res"
  },
  fortune: {
    id: "fortune",
    label: "SECONDARY_ATTRIBUTES.Fortune",
    abbreviation: "SECONDARY_ATTRIBUTES.FortuneAbbr",
    color: Color.from("#8ac6ec"),
    sheetOrder: 4,
    nodeId: "for"
  }
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

