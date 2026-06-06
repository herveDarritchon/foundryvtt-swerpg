/**
 * Centralised business constants for character progression (XP, ranks, costs).
 *
 * These constants replace all inline literals in skill, characteristic and
 * specialisation calculators so that every rule has a single named source of
 * truth (ADR-0018).
 *
 * Do NOT import this file from inside module/config/skills.mjs — skills.mjs
 * already defines MAX_RANK_AT_CREATION and MAX_RANK which are the canonical
 * source for skill rank caps and are re-exported via SYSTEM.SKILLS.
 */

/* -------------------------------------------- */
/*  Skill XP costs                              */
/* -------------------------------------------- */

/**
 * Multiplier applied to rank value to compute the base XP cost of training a
 * career (or specialisation) skill rank.
 *
 * Formula: cost = SKILL_RANK_COST_MULTIPLIER * rankValue
 *
 * @type {number}
 */
export const SKILL_RANK_COST_MULTIPLIER = 5

/**
 * Flat XP surcharge added when training a skill that is neither a career skill
 * nor a specialisation skill.
 *
 * Formula: cost = SKILL_RANK_COST_MULTIPLIER * rankValue + SKILL_NON_CAREER_SURCHARGE
 *
 * @type {number}
 */
export const SKILL_NON_CAREER_SURCHARGE = 5

/* -------------------------------------------- */
/*  Skill rank limits                           */
/* -------------------------------------------- */

/**
 * Maximum number of times a character may apply a career-free rank to the
 * same skill.
 * @type {number}
 */
export const SKILL_MAX_CAREER_FREE_RANK_PER_SKILL = 1

/**
 * Maximum number of times a character may apply a specialisation-free rank to
 * the same skill.
 * @type {number}
 */
export const SKILL_MAX_SPECIALIZATION_FREE_RANK_PER_SKILL = 1

/* -------------------------------------------- */
/*  Characteristic XP costs                    */
/* -------------------------------------------- */

/**
 * Multiplier applied to the new characteristic value to compute the XP cost of
 * raising a characteristic by one rank.
 *
 * Formula: cost = CHARACTERISTIC_RANK_COST_MULTIPLIER * newValue
 *
 * @type {number}
 */
export const CHARACTERISTIC_RANK_COST_MULTIPLIER = 10

/* -------------------------------------------- */
/*  Characteristic rank limits                 */
/* -------------------------------------------- */

/**
 * Maximum characteristic value a character may reach during character
 * creation.
 * @type {number}
 */
export const CHARACTERISTIC_MAX_RANK_AT_CREATION = 5

/**
 * Absolute maximum characteristic value a character may ever reach.
 * @type {number}
 */
export const CHARACTERISTIC_MAX_RANK = 6

/* -------------------------------------------- */
/*  Specialisation XP costs                    */
/* -------------------------------------------- */

/**
 * Base XP cost for the first specialisation (index 0 → 1).
 * The first specialisation is always free.
 * @type {number}
 */
export const SPECIALIZATION_FIRST_COST = 0

/**
 * Multiplier applied to the total number of owned specialisations (after
 * acquisition) to compute the base XP cost for every specialisation beyond
 * the first.
 *
 * Formula: baseCost = SPECIALIZATION_RANK_COST_MULTIPLIER * ownedCountAfter
 *
 * @type {number}
 */
export const SPECIALIZATION_RANK_COST_MULTIPLIER = 10

/**
 * Flat XP penalty applied when the acquired specialisation is neither a career
 * specialisation nor a universal specialisation.
 * @type {number}
 */
export const SPECIALIZATION_NON_CAREER_PENALTY = 10

/* -------------------------------------------- */
/*  Actor derived attributes                   */
/* -------------------------------------------- */

/**
 * Flat bonus added to the Brawn characteristic value when computing the
 * encumbrance threshold.
 *
 * Formula: encumbranceThreshold = brawn + ENCUMBRANCE_BASE_BONUS
 *
 * @type {number}
 */
export const ENCUMBRANCE_BASE_BONUS = 5

/* -------------------------------------------- */
/*  Career skill list limits                    */
/* -------------------------------------------- */

/**
 * Maximum number of career skills that can be assigned to a single career.
 * Matches SwerpgCareer schema validation (careerSkills.length <= CAREER_MAX_SKILL_COUNT).
 * @type {number}
 */
export const CAREER_MAX_SKILL_COUNT = 8

/**
 * Default value for the free skill rank granted by a career at character creation.
 * Matches SwerpgCareer schema initial value for freeSkillRank.
 * @type {number}
 */
export const CAREER_DEFAULT_FREE_SKILL_RANK = 4

/**
 * Minimum value for the free skill rank granted by a career.
 * Matches SwerpgCareer schema min for freeSkillRank.
 * @type {number}
 */
export const CAREER_MIN_FREE_SKILL_RANK = 0

/**
 * Maximum value for the free skill rank granted by a career.
 * Matches SwerpgCareer schema max for freeSkillRank.
 * @type {number}
 */
export const CAREER_MAX_FREE_SKILL_RANK = 8

/* -------------------------------------------- */
/*  Talent purchase audit defaults              */
/* -------------------------------------------- */

/**
 * Default XP cost recorded in a `talent.purchase` audit entry when the talent
 * item does not expose a `system.cost` value.
 *
 * This fallback matches the canonical career-skill rank-1 base cost and is
 * intentionally a named constant so the audit trail remains readable and
 * testable (ADR-0018).
 *
 * @type {number}
 */
export const TALENT_PURCHASE_DEFAULT_COST = 5

/**
 * Default rank count recorded in a `talent.purchase` audit entry when the
 * talent item does not expose a `system.ranks` value.
 *
 * @type {number}
 */
export const TALENT_PURCHASE_DEFAULT_RANKS = 1

/* -------------------------------------------- */
/*  Starting Resources                          */
/* -------------------------------------------- */

/**
 * Starting credits granted to a new character at creation.
 * @type {number}
 */
export const STARTING_CREDITS = 500

/**
 * Extra credits bonus for +5 Obligation during character creation.
 * @type {number}
 */
export const OBLIGATION_EXTRA_CREDITS_5 = 1000

/**
 * Extra credits bonus for +10 Obligation during character creation.
 * @type {number}
 */
export const OBLIGATION_EXTRA_CREDITS_10 = 2500
