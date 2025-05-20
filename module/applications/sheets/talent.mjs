import SwerpgBaseItemSheet from "./base-item.mjs";
import {getItemsOf} from "../../utils/items.mjs";

/**
 * A SwerpgBaseItemSheet subclass used to configure Items of the "talent" type.
 */
export default class TalentSheet extends SwerpgBaseItemSheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    item: {
      type: "talent",
      includesActions: true,
      includesHooks: true
    },
  };

  // Initialize subclass options
  static {
    this._initializeItemSheetClass()
  }

  /* -------------------------------------------- */
  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return {
      ...context,
      availableSpecializations: getItemsOf(game.items, "specialization"),
    };
  }

}
