/**
 * Pure domain logic for evaluating narrative market consequences.
 *
 * Consequences are _proposals_ to the GM, never automatic mutations.
 * Each consequence has:
 *   - `type`         : machine-readable type key.
 *   - `descriptionKey`: i18n key for GM-facing description.
 *   - `automatic`    : if true, no GM confirmation required (e.g. Imperial flag logging).
 *   - `playerChoice` : if true, the player is offered a choice (e.g. accept a debt).
 *
 * Consequence types:
 *   - `imperialSuspicion` : buying restricted/black-market items signals the Empire.
 *   - `blackMarketDebt`   : buying at black market creates a vendor debt.
 *   - `complication`      : any risky purchase may trigger a narrative complication.
 *
 * No Foundry dependencies — accepts plain objects only.
 */

/* -------------------------------------------- */
/*  Constants                                   */
/* -------------------------------------------- */

/**
 * Canonical consequence type keys.
 * @enum {string}
 */
export const CONSEQUENCE_TYPES = Object.freeze({
  imperialSuspicion: 'imperialSuspicion',
  blackMarketDebt: 'blackMarketDebt',
  complication: 'complication',
})

/**
 * Restriction level values that trigger imperial suspicion.
 * @type {ReadonlyArray<string>}
 */
export const RESTRICTED_RESTRICTION_LEVELS = Object.freeze(['restricted', 'illegal'])

/**
 * Availability status keys that trigger black-market debt.
 * @type {ReadonlyArray<string>}
 */
export const BLACK_MARKET_AVAILABILITY_KEYS = Object.freeze(['blackMarket', 'restricted'])

/**
 * Market type key that triggers the black-market debt consequence.
 * @type {string}
 */
export const BLACK_MARKET_TYPE_KEY = 'black-market'

/* -------------------------------------------- */
/*  Typedefs                                    */
/* -------------------------------------------- */

/**
 * @typedef {Object} MarketConsequence
 * @property {string}  type             Machine-readable consequence type (one of CONSEQUENCE_TYPES).
 * @property {string}  descriptionKey   i18n key for the GM-facing description.
 * @property {boolean} automatic        If true, no GM confirmation required.
 * @property {boolean} playerChoice     If true, the player is offered a choice before applying.
 * @property {object}  [metadata]       Optional extra data for rendering (amount, vendorName, etc.).
 */

/**
 * @typedef {Object} ConsequenceInput
 * @property {{ availability?: string, restrictionLevel?: string, rarity?: number, name?: string }} entry       Market entry data.
 * @property {string} marketType    Active market type key.
 * @property {{ id?: string, name?: string }} [actor]  Buyer actor (plain object — optional).
 */

/* -------------------------------------------- */
/*  Public API                                  */
/* -------------------------------------------- */

/**
 * Evaluate which narrative consequences should be proposed for a market purchase.
 *
 * Rules (evaluated independently, each may produce a consequence):
 * 1. Imperial suspicion: triggered when entry has a `restricted` or `illegal` restriction level.
 * 2. Black-market debt: triggered when market type is `black-market` OR entry availability is `blackMarket`/`restricted`.
 * 3. Complication: triggered when rarity >= 8 OR market type is `black-market`.
 *
 * The function returns a (possibly empty) array of consequences.
 * Returns an empty array when no consequences apply (standard, non-risky purchases).
 *
 * No side effects. No Foundry dependencies.
 *
 * @param {ConsequenceInput} input
 * @returns {MarketConsequence[]}
 */
export function evaluateMarketConsequences({ entry, marketType, actor } = {}) {
  const consequences = []

  if (!entry || typeof entry !== 'object') return consequences

  const restrictionLevel = entry.restrictionLevel ?? ''
  const availability = entry.availability ?? ''
  const rarity = typeof entry.rarity === 'number' ? entry.rarity : 0
  const isBlackMarket = marketType === BLACK_MARKET_TYPE_KEY

  // 1. Imperial suspicion: restricted or illegal items
  if (RESTRICTED_RESTRICTION_LEVELS.includes(restrictionLevel)) {
    consequences.push({
      type: CONSEQUENCE_TYPES.imperialSuspicion,
      descriptionKey: 'MARKET.Consequence.ImperialSuspicion.Description',
      automatic: false,
      playerChoice: false,
      metadata: {
        itemName: entry.name ?? '',
        restrictionLevel,
        actorName: actor?.name ?? '',
      },
    })
  }

  // 2. Black-market debt: black-market purchase or restricted/blackMarket availability
  if (isBlackMarket || BLACK_MARKET_AVAILABILITY_KEYS.includes(availability)) {
    consequences.push({
      type: CONSEQUENCE_TYPES.blackMarketDebt,
      descriptionKey: 'MARKET.Consequence.BlackMarketDebt.Description',
      automatic: false,
      playerChoice: true,
      metadata: {
        itemName: entry.name ?? '',
        actorName: actor?.name ?? '',
      },
    })
  }

  // 3. Complication: very rare items or black-market
  if (rarity >= 8 || isBlackMarket) {
    consequences.push({
      type: CONSEQUENCE_TYPES.complication,
      descriptionKey: 'MARKET.Consequence.Complication.Description',
      automatic: false,
      playerChoice: true,
      metadata: {
        itemName: entry.name ?? '',
        rarity,
      },
    })
  }

  return consequences
}
