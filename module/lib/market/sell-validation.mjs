/**
 * Pure domain module for validating a Market item sale.
 *
 * No Foundry dependencies — accepts plain objects and returns plain values.
 * All mutations are the responsibility of the Foundry adapter layer.
 */

import { PURCHASABLE_ITEM_TYPES } from '../../config/market.mjs'

/* -------------------------------------------- */
/*  Types                                       */
/* -------------------------------------------- */

/**
 * @typedef {Object} SaleValidationResult
 * @property {boolean} canSell       Whether all pre-conditions are satisfied.
 * @property {string}  reason        Machine-readable reason key (empty string when canSell is true).
 * @property {string}  [messageKey]  i18n key for the user-facing message (present when canSell is false).
 * @property {number}  [basePrice]   Resolved base price (present when canSell is true).
 * @property {number}  [maxQuantity] Maximum sellable quantity = item's current stack size (present when canSell is true).
 */

/* -------------------------------------------- */
/*  Pure function                               */
/* -------------------------------------------- */

/**
 * Validate whether an actor can sell an item via the Market.
 *
 * Rules (in order of evaluation):
 * 1. Actor must be a non-null object.
 * 2. Item must be a non-null object.
 * 3. Item type must be listed in `PURCHASABLE_ITEM_TYPES`.
 * 4. Item must be present in the actor's inventory (matched by `id` or `uuid`).
 * 5. Item's `system.price` must be a non-negative number (or 0).
 *
 * The actor's `items` may be any iterable collection with a `.some()` method, or a plain array.
 * This matches both Foundry's `EmbeddedCollection` and plain test stubs.
 *
 * @param {object} params
 * @param {{ items?: { some: Function } }} params.actor  Actor-like plain object.
 * @param {{ id?: string, uuid?: string, type?: string, system?: { price?: number } }} params.item  Item-like plain object.
 * @returns {SaleValidationResult}
 */
export function validateSale({ actor, item } = {}) {
  if (!actor || typeof actor !== 'object') {
    return {
      canSell: false,
      reason: 'missing-actor',
      messageKey: 'MARKET.Sale.Error.MissingActor',
    }
  }

  if (!item || typeof item !== 'object') {
    return {
      canSell: false,
      reason: 'missing-item',
      messageKey: 'MARKET.Sale.Error.MissingItem',
    }
  }

  if (!item.type || !(item.type in PURCHASABLE_ITEM_TYPES)) {
    return {
      canSell: false,
      reason: 'unsellable-type',
      messageKey: 'MARKET.Sale.Error.UnsellableType',
    }
  }

  const items = actor.items
  const hasItem = items && typeof items.some === 'function' ? items.some((i) => i.id === item.id || (item.uuid && i.uuid === item.uuid)) : false

  if (!hasItem) {
    return {
      canSell: false,
      reason: 'not-in-inventory',
      messageKey: 'MARKET.Sale.Error.NotInInventory',
    }
  }

  const basePrice = item.system?._source?.price ?? item.system?.price ?? 0
  if (typeof basePrice !== 'number' || !Number.isFinite(basePrice) || basePrice < 0) {
    return {
      canSell: false,
      reason: 'invalid-price',
      messageKey: 'MARKET.Sale.Error.InvalidPrice',
    }
  }

  const maxQuantity = item.system?.quantity ?? 1

  return {
    canSell: true,
    reason: '',
    basePrice,
    maxQuantity,
  }
}
