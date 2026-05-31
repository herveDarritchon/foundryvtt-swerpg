/**
 * Pure domain logic for computing price modifiers and narrative outcomes
 * based on Star Wars Edge narrative dice results.
 *
 * No Foundry globals. All inputs are plain objects. All outputs are plain objects or primitives.
 */

/* -------------------------------------------- */
/*  Price modifier constants                    */
/* -------------------------------------------- */

/**
 * Price modifier applied when Advantage dominates: −10%.
 * @type {number}
 */
export const COMMERCE_OUTCOME_PRICE_ADVANTAGE = -0.1

/**
 * Price modifier applied when Threat dominates: +10%.
 * @type {number}
 */
export const COMMERCE_OUTCOME_PRICE_THREAT = 0.1

/**
 * Price modifier applied on Disaster (scam): +10%.
 * @type {number}
 */
export const COMMERCE_OUTCOME_PRICE_DISASTER = 0.1

/* -------------------------------------------- */
/*  Outcome label constants                     */
/* -------------------------------------------- */

/**
 * Canonical outcome labels for commerce test results.
 * @enum {string}
 */
export const COMMERCE_OUTCOMES = Object.freeze({
  SUCCESS: 'success',
  ADVANTAGE: 'advantage',
  THREAT: 'threat',
  TRIUMPH: 'triumph',
  DISASTER: 'disaster',
})

/* -------------------------------------------- */
/*  Consequence type constants                  */
/* -------------------------------------------- */

/**
 * Canonical consequence type keys produced by commerce test outcomes.
 * @enum {string}
 */
export const COMMERCE_CONSEQUENCE_TYPES = Object.freeze({
  CONTACT: 'contact',
  SUPERIOR_ITEM: 'superior',
  BONUS_INFO: 'info',
  SCAM: 'scam',
  AMBUSH: 'ambush',
  TRACKED: 'tracked',
  IMPERIAL: 'imperial',
})

/* -------------------------------------------- */
/*  JSDoc typedefs                              */
/* -------------------------------------------- */

/**
 * @typedef {Object} CommerceTestResult
 * @property {number}  [netAdvantage=0]  Count of net advantages (positive = advantages dominate)
 * @property {number}  [netThreat=0]     Count of net threats (positive = threats dominate)
 * @property {boolean} [hasTriumph=false] Whether the result contains a Triumph symbol
 * @property {boolean} [hasDespair=false] Whether the result contains a Despair symbol
 */

/**
 * @typedef {Object} CommerceOutcome
 * @property {number}      priceModifier    Fractional price modifier to apply (e.g. −0.10 = −10%)
 * @property {string[]}    narrativeKeys    I18n keys for displaying the outcome in chat
 * @property {string|null} consequenceType  Consequence type to persist as actor flag, or null
 * @property {string}      outcomeLabel     One of the COMMERCE_OUTCOMES values
 */

/* -------------------------------------------- */
/*  Main function                               */
/* -------------------------------------------- */

/**
 * Compute the commerce outcome (price modifier, narrative keys, consequence type, label)
 * from a narrative dice test result.
 *
 * Resolution priority:
 * 1. Despair/Disaster — always wins even over Triumph
 * 2. Triumph
 * 3. Net Threats > 0
 * 4. Net Advantages > 0
 * 5. Success (neutral)
 *
 * @param {CommerceTestResult} [testResult={}]
 * @returns {CommerceOutcome}
 */
export function computeCommerceOutcome(testResult = {}) {
  const { netAdvantage = 0, netThreat = 0, hasTriumph = false, hasDespair = false } = testResult

  // Despair takes absolute priority (even over Triumph)
  if (hasDespair) {
    return {
      priceModifier: COMMERCE_OUTCOME_PRICE_DISASTER,
      narrativeKeys: [
        'MARKET.CommerceOutcome.Disaster.Scam',
        'MARKET.CommerceOutcome.Disaster.Ambush',
        'MARKET.CommerceOutcome.Disaster.TrackedItem',
        'MARKET.CommerceOutcome.Disaster.ImperialIntervention',
      ],
      consequenceType: COMMERCE_CONSEQUENCE_TYPES.TRACKED,
      outcomeLabel: COMMERCE_OUTCOMES.DISASTER,
    }
  }

  // Triumph second
  if (hasTriumph) {
    return {
      priceModifier: 0,
      narrativeKeys: [
        'MARKET.CommerceOutcome.Triumph.LastingContact',
        'MARKET.CommerceOutcome.Triumph.SuperiorItem',
        'MARKET.CommerceOutcome.Triumph.BonusInfo',
      ],
      consequenceType: COMMERCE_CONSEQUENCE_TYPES.CONTACT,
      outcomeLabel: COMMERCE_OUTCOMES.TRIUMPH,
    }
  }

  // Threats dominate
  if (netThreat > 0) {
    return {
      priceModifier: COMMERCE_OUTCOME_PRICE_THREAT,
      narrativeKeys: [
        'MARKET.CommerceOutcome.Threat.PriceIncrease',
        'MARKET.CommerceOutcome.Threat.Delay',
        'MARKET.CommerceOutcome.Threat.VendorTalkative',
        'MARKET.CommerceOutcome.Threat.Surveillance',
      ],
      consequenceType: null,
      outcomeLabel: COMMERCE_OUTCOMES.THREAT,
    }
  }

  // Advantages dominate
  if (netAdvantage > 0) {
    return {
      priceModifier: COMMERCE_OUTCOME_PRICE_ADVANTAGE,
      narrativeKeys: ['MARKET.CommerceOutcome.Advantage.Discount', 'MARKET.CommerceOutcome.Advantage.GoodCondition'],
      consequenceType: null,
      outcomeLabel: COMMERCE_OUTCOMES.ADVANTAGE,
    }
  }

  // Neutral success
  return {
    priceModifier: 0,
    narrativeKeys: [],
    consequenceType: null,
    outcomeLabel: COMMERCE_OUTCOMES.SUCCESS,
  }
}
