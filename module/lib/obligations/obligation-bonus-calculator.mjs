import {
  STARTING_CREDITS,
  OBLIGATION_EXTRA_CREDITS_5,
  OBLIGATION_EXTRA_CREDITS_10,
  OBLIGATION_EXTRA_XP_5,
  OBLIGATION_EXTRA_XP_10,
  OBLIGATION_EXTRA_COST_5,
  OBLIGATION_EXTRA_COST_10,
} from '../../config/progression.mjs'

/**
 * @typedef {Object} ObligationBonusInput
 * Plain-object representation of an obligation item used for bonus calculations.
 * No Foundry dependency — callers must map Item documents to this shape before calling.
 *
 * @property {boolean} isExtra      - Whether the obligation provides extra starting resources.
 * @property {number}  extraCredits - Extra credits granted when isExtra is true.
 * @property {number}  extraXp      - Extra XP granted when isExtra is true.
 * @property {number}  value        - The Obligation point cost of this item (base obligation value).
 */

/**
 * @typedef {Object} ObligationCreationOption
 * One recognized official bonus option from the FFG/Edge creation rules.
 *
 * @property {'xp_5'|'xp_10'|'credits_1000'|'credits_2500'} key  - Canonical key for the option.
 * @property {number} xp          - XP bonus granted by this option (0 if none).
 * @property {number} credits     - Credits bonus granted by this option (0 if none).
 * @property {number} obligationCost - Extra Obligation points consumed by this option.
 */

/**
 * @typedef {'narrative'|'official'|'legacy'} ObligationBonusState
 * Classification of a single obligation item for expert-fallback rendering.
 *
 * - `narrative`  — isExtra is false; standard narrative obligation, no bonus.
 * - `official`   — isExtra is true and the (extraXp, extraCredits) pair matches an official option exactly.
 * - `legacy`     — isExtra is true but the amounts do not match any official option (non-official combination).
 */

/**
 * @typedef {Object} ObligationStateResult
 * Resolution of a single obligation's bonus state.
 *
 * @property {ObligationBonusState}        state          - Classification of the obligation.
 * @property {ObligationCreationOption|null} officialOption - The matched official option, or null for narrative/legacy.
 */

/**
 * @typedef {Object} ObligationBonusSelectOption
 * UI-ready annotated bonus option for a guided selector.
 *
 * @property {'xp_5'|'xp_10'|'credits_1000'|'credits_2500'} key      - Canonical key for the option.
 * @property {number}  xp                 - XP bonus granted by this option (0 if none).
 * @property {number}  credits            - Credits bonus granted by this option (0 if none).
 * @property {number}  obligationCost     - Extra Obligation points consumed.
 * @property {boolean} isAlreadyTaken     - True when the character has already selected this option.
 * @property {boolean} isExceedsCap       - True when selecting this option would exceed the remaining cap.
 * @property {boolean} isAvailable        - True when the option can be chosen right now.
 * @property {string|null} unavailableReason - Human-readable reason why the option is unavailable, or null.
 */

/**
 * @typedef {Object} ObligationCreationSummary
 * Canonical result of analysing the extra-obligation bonus selections for a character.
 *
 * @property {number}   totalXp               - Total official XP bonus from recognized options.
 * @property {number}   totalCredits           - Total official credits bonus from recognized options.
 * @property {number}   totalObligationConsumed - Extra Obligation points consumed across all recognized options.
 * @property {ObligationCreationOption[]} recognizedOptions - Official options detected in the input.
 * @property {string[]} errors                 - Human-readable diagnostic messages for non-conformant obligations.
 * @property {boolean}  isConformant           - True when all extra obligations use official options, no duplicates, and the cap is not exceeded.
 */

/**
 * Official bonus options defined by the FFG/Edge Studio creation rules.
 * Each option may be selected at most once per character.
 * @type {readonly ObligationCreationOption[]}
 */
const OFFICIAL_OPTIONS = Object.freeze([
  { key: 'xp_5', xp: OBLIGATION_EXTRA_XP_5, credits: 0, obligationCost: OBLIGATION_EXTRA_COST_5 },
  { key: 'xp_10', xp: OBLIGATION_EXTRA_XP_10, credits: 0, obligationCost: OBLIGATION_EXTRA_COST_10 },
  { key: 'credits_1000', xp: 0, credits: OBLIGATION_EXTRA_CREDITS_5, obligationCost: OBLIGATION_EXTRA_COST_5 },
  { key: 'credits_2500', xp: 0, credits: OBLIGATION_EXTRA_CREDITS_10, obligationCost: OBLIGATION_EXTRA_COST_10 },
])

/**
 * Pure domain calculator for obligation-sourced starting bonuses.
 *
 * Inputs are plain objects ({ isExtra, extraCredits, extraXp, value }), never Foundry Items.
 * All outputs are plain values or plain objects.
 *
 * Business rules (Star Wars FFG / Edge Studio — "Aux Confins de l'Empire"):
 * - A character starts with STARTING_CREDITS (500) credits.
 * - Taking +5 Obligation grants either +5 XP OR +1 000 credits (not both in the same obligation).
 * - Taking +10 Obligation grants either +10 XP OR +2 500 credits (not both).
 * - Each official option may only be chosen once per character.
 * - The total extra Obligation taken must not exceed the character's base starting Obligation.
 * - Only official (xp, credits) pairs are recognized; non-official amounts flag an error.
 */
export default class ObligationBonusCalculator {
  /* -------------------------------------------- */
  /*  Legacy raw-sum accessors (preserved)        */
  /* -------------------------------------------- */

  /**
   * Sum the extra credits granted by obligations marked as "extra".
   *
   * This method intentionally sums raw values without canonical validation.
   * Callers that need conformance checking should use `computeCreationSummary` instead.
   *
   * @param {ObligationBonusInput[]} obligations Array of plain obligation objects.
   * @returns {number} Total bonus credits. Returns 0 for an empty or all-non-extra array.
   */
  static computeObligationBonusCredits(obligations) {
    return obligations.filter((o) => o.isExtra === true).reduce((total, o) => total + (o.extraCredits || 0), 0)
  }

  /**
   * Sum the extra XP granted by obligations marked as "extra".
   *
   * This method intentionally sums raw values without canonical validation.
   * Callers that need conformance checking should use `computeCreationSummary` instead.
   *
   * @param {ObligationBonusInput[]} obligations Array of plain obligation objects.
   * @returns {number} Total bonus XP. Returns 0 for an empty or all-non-extra array.
   */
  static computeObligationBonusXp(obligations) {
    return obligations.filter((o) => o.isExtra === true).reduce((total, o) => total + (o.extraXp || 0), 0)
  }

  /**
   * The base starting credits constant, exposed for callers that need it without
   * importing progression.mjs directly.
   * @type {number}
   */
  static get STARTING_CREDITS() {
    return STARTING_CREDITS
  }

  /* -------------------------------------------- */
  /*  Canonical creation-bonus analysis           */
  /* -------------------------------------------- */

  /**
   * Analyse the extra obligations and return a canonical summary of the creation bonuses.
   *
   * The summary distinguishes:
   * - recognized official options (matched against OFFICIAL_OPTIONS by (xp, credits) pair);
   * - non-conformant obligations (amounts not matching any official option);
   * - duplicate official options (each key can appear at most once);
   * - whether the total extra Obligation cost exceeds the allowed cap.
   *
   * The `baseObligationValue` parameter is the character's *starting* Obligation value
   * (from the group-size table). The total extra Obligation taken must not exceed this value.
   * Pass `Infinity` if no cap check is needed (e.g. when called without actor context).
   *
   * @param {ObligationBonusInput[]} obligations     All obligation items (extra and non-extra).
   * @param {number}                 [baseObligationValue=Infinity] The character's base starting Obligation for cap checks.
   * @returns {ObligationCreationSummary}
   */
  static computeCreationSummary(obligations, baseObligationValue = Infinity) {
    const extraObligations = obligations.filter((o) => o.isExtra === true)

    const recognizedOptions = []
    const errors = []
    const usedKeys = new Set()

    for (const obl of extraObligations) {
      const xp = obl.extraXp || 0
      const credits = obl.extraCredits || 0

      const match = OFFICIAL_OPTIONS.find((opt) => opt.xp === xp && opt.credits === credits)

      if (!match) {
        errors.push(`Non-official bonus combination: xp=${xp}, credits=${credits}`)
        continue
      }

      if (usedKeys.has(match.key)) {
        errors.push(`Duplicate official option detected: ${match.key}`)
        continue
      }

      usedKeys.add(match.key)
      recognizedOptions.push(match)
    }

    const totalXp = recognizedOptions.reduce((sum, opt) => sum + opt.xp, 0)
    const totalCredits = recognizedOptions.reduce((sum, opt) => sum + opt.credits, 0)
    const totalObligationConsumed = recognizedOptions.reduce((sum, opt) => sum + opt.obligationCost, 0)

    if (Number.isFinite(baseObligationValue) && totalObligationConsumed > baseObligationValue) {
      errors.push(`Extra Obligation consumed (${totalObligationConsumed}) exceeds the allowed cap (${baseObligationValue})`)
    }

    return {
      totalXp,
      totalCredits,
      totalObligationConsumed,
      recognizedOptions,
      errors,
      isConformant: errors.length === 0,
    }
  }

  /**
   * The official bonus options catalogue, exposed for callers that need to build
   * option pickers or selection UIs without importing progression.mjs directly.
   * @type {readonly ObligationCreationOption[]}
   */
  static get OFFICIAL_OPTIONS() {
    return OFFICIAL_OPTIONS
  }

  /* -------------------------------------------- */
  /*  Expert-fallback state resolution             */
  /* -------------------------------------------- */

  /**
   * Resolve the bonus state of a single obligation item.
   *
   * This is the canonical classifier used by the item sheet to determine which rendering
   * mode to apply:
   * - `narrative`  → isExtra is false; show only description and value.
   * - `official`   → isExtra is true and amounts match an official option.
   * - `legacy`     → isExtra is true but amounts are non-official; display an expert warning.
   *
   * The function is pure: it accepts a plain obligation object and returns a plain result.
   * No Foundry APIs are used.
   *
   * @param {ObligationBonusInput} obligation Plain obligation data object.
   * @returns {ObligationStateResult}
   */
  static resolveObligationState(obligation) {
    if (!obligation.isExtra) {
      return { state: 'narrative', officialOption: null }
    }

    const xp = obligation.extraXp || 0
    const credits = obligation.extraCredits || 0
    const match = OFFICIAL_OPTIONS.find((opt) => opt.xp === xp && opt.credits === credits)

    if (match) {
      return { state: 'official', officialOption: match }
    }

    return { state: 'legacy', officialOption: null }
  }

  /* -------------------------------------------- */
  /*  Guided selector helpers                      */
  /* -------------------------------------------- */

  /**
   * Build a UI-ready annotated list of official bonus options for a guided selector.
   *
   * Each option is annotated with:
   * - `isAlreadyTaken`  — the character already has this option selected;
   * - `isExceedsCap`    — selecting it would exceed the remaining obligation cap;
   * - `isAvailable`     — the option can be chosen (not taken and within cap);
   * - `unavailableReason` — a short English reason key when unavailable, or `null`.
   *
   * The method is pure: callers must map their Foundry Items to `ObligationBonusInput[]`
   * before calling, and must pass the creation state summary separately so no Foundry
   * dependency leaks into this layer.
   *
   * @param {ObligationBonusInput[]} obligations        All obligation items for the character.
   * @param {number}                 remainingObligationCap Remaining obligation cap after existing selections.
   * @returns {ObligationBonusSelectOption[]}
   */
  static buildObligationBonusOptions(obligations, remainingObligationCap) {
    const extraObligations = obligations.filter((o) => o.isExtra === true)

    const takenKeys = new Set()
    for (const obl of extraObligations) {
      const xp = obl.extraXp || 0
      const credits = obl.extraCredits || 0
      const match = OFFICIAL_OPTIONS.find((opt) => opt.xp === xp && opt.credits === credits)
      if (match) takenKeys.add(match.key)
    }

    const cap = Number.isFinite(remainingObligationCap) ? remainingObligationCap : Infinity

    return OFFICIAL_OPTIONS.map((opt) => {
      const isAlreadyTaken = takenKeys.has(opt.key)
      const isExceedsCap = !isAlreadyTaken && opt.obligationCost > cap
      const isAvailable = !isAlreadyTaken && !isExceedsCap

      let unavailableReason = null
      if (isAlreadyTaken) unavailableReason = 'already-taken'
      else if (isExceedsCap) unavailableReason = 'exceeds-cap'

      return {
        key: opt.key,
        xp: opt.xp,
        credits: opt.credits,
        obligationCost: opt.obligationCost,
        isAlreadyTaken,
        isExceedsCap,
        isAvailable,
        unavailableReason,
      }
    })
  }
}
