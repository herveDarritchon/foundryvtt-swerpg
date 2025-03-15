import SwerpgTalentNode from "../../config/talent-tree.mjs";
import SwerpgBaseItemSheet from "./base-item.mjs";

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
    }
  };

  // Initialize subclass options
  static {
    this._initializeItemSheetClass()
  }
}
