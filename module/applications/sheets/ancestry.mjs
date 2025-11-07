import SwerpgBaseItemSheet from './base-item.mjs'

/**
 * A SwerpgBaseItemSheet subclass used to configure Items of the "ancestry" type.
 * @extends SwerpgBaseItemSheet
 */
export default class AncestrySheet extends SwerpgBaseItemSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ['swerpg', 'sheet', 'item', 'ancestry'],
    position: {
      width: 600,
      height: 'auto',
    },
    window: {
      minimizable: true,
      resizable: true,
    },
    item: {
      type: 'ancestry',
    },
    actions: {
      // Actions spécifiques à AncestrySheet
    },
  }

  // Initialize subclass options
  static {
    this._initializeItemSheetClass()
  }

  /* -------------------------------------------- */

  /** @override */
  _processFormData(event, form, formData) {
    const submitData = super._processFormData(event, form, formData)

    // Only allow (primary,secondary) or (resistance,vulnerability) to be submitted if both are defined
    const pairs = [
      ['primary', 'secondary'],
      ['resistance', 'vulnerability'],
    ]
    for (const [a, b] of pairs) {
      if (!(submitData.system[a] && submitData.system[b])) {
        delete submitData.system[a]
        delete submitData.system[b]
      }
    }
    return submitData
  }
}
