/**
 * function getItemsOf should return an array of items from game where the item type is equal to the type passed in.
 * @description This module provides utility functions to manage items in a collection.
 * @module utils/items
 * @param {Array} items - The array of items to filter.
 * @param {string} type - The type of items to filter for.
 * @returns {Array} - An array of items that match the specified type.
 */
export function getItemsOf(items, type) {
  return items?.filter((item) => item.type === type) ?? [];
}