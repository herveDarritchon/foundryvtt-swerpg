/**
 * Market chat integration — produces a Foundry ChatMessage data object after a successful purchase.
 *
 * This module is a pure data builder: it renders the template and returns a plain ChatMessage data
 * object. The caller is responsible for calling `ChatMessage.create(data)`.
 *
 * No mutation is performed here.
 *
 * @module market-chat
 */

import { logger } from '../../utils/logger.mjs'

/* -------------------------------------------- */
/*  Typedefs                                    */
/* -------------------------------------------- */

/**
 * @typedef {Object} PurchaseChatContext
 * @property {object}   buyer                  Buyer actor (must have `name` and `id`).
 * @property {import('../../lib/market/market-entry.mjs').MarketEntry} entry  The purchased market entry.
 * @property {import('../../lib/market/negotiation.mjs').NegotiationResult|null} [outcome]  Negotiation outcome, if any.
 * @property {string[]} consequencesAccepted   Array of accepted consequence type keys.
 * @property {number}   negotiatedPrice        The final price paid.
 */

/* -------------------------------------------- */
/*  Template path                               */
/* -------------------------------------------- */

const PURCHASE_CHAT_TEMPLATE = 'systems/swerpg/templates/market/purchase-chat.hbs'

/* -------------------------------------------- */
/*  Public API                                  */
/* -------------------------------------------- */

/**
 * Build a Foundry ChatMessage data object for a completed market purchase.
 *
 * Renders the `purchase-chat.hbs` template and returns the message data.
 * The caller decides whether to create the message via `ChatMessage.create()`.
 *
 * Returns `null` if template rendering fails (graceful degradation).
 *
 * @param {PurchaseChatContext} context
 * @returns {Promise<object|null>}  ChatMessage creation data, or null on failure.
 */
export async function buildPurchaseChatData({ buyer, entry, outcome = null, consequencesAccepted = [], negotiatedPrice }) {
  if (!buyer || !entry) {
    logger.warn('[MarketChat] buildPurchaseChatData called with missing buyer or entry')
    return null
  }

  // Build the template context
  const templateContext = {
    itemName: entry.name ?? '',
    itemImg: entry.img ?? '',
    itemType: entry.itemType ?? entry.type ?? '',
    pricePaid: negotiatedPrice,
    originalPrice: entry.priceResult?.basePrice ?? entry.priceResult?.finalPrice ?? negotiatedPrice,
    marketType: entry.priceResult?.marketType ?? '',
    buyer: {
      name: buyer.name ?? '',
      id: buyer.id ?? '',
    },
    negotiationOutcome: outcome?.outcome ?? null,
    consequencesAccepted,
    hasConsequences: consequencesAccepted.length > 0,
    wasNegotiated: outcome !== null && outcome?.outcome !== undefined,
  }

  let content
  try {
    content = await renderTemplate(PURCHASE_CHAT_TEMPLATE, templateContext)
  } catch (err) {
    logger.warn('[MarketChat] Failed to render purchase chat template', err)
    return null
  }

  return {
    content,
    speaker: ChatMessage.getSpeaker({ actor: buyer }),
    flavor: game.i18n.localize('MARKET.Chat.PurchaseTitle'),
    // Note: No `type` field - Foundry v14 uses `type` for document types, not message styles.
    // Use `style: CONST.CHAT_MESSAGE_STYLES.IC` if specific styling is needed.
  }
}
