import SwerpgBaseItemSheet from './base-item.mjs'

/**
 * A SwerpgBaseItemSheet subclass used to configure Items of the "species" type.
 * @extends SwerpgBaseItemSheet
 */
export default class SpeciesSheet extends SwerpgBaseItemSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    position: {
      width: 600,
      height: 'auto',
    },
    window: {
      minimizable: true,
      resizable: true,
    },
    item: {
      type: 'species',
    },
    actions: {
      // Actions spécifiques à SpeciesSheet
    },
  }

  // Initialize subclass options
  static {
    this._initializeItemSheetClass()
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    return context
  }

  /* -------------------------------------------- */

  /** @override */
  _processFormData(event, form, formData) {
    const submitData = super._processFormData(event, form, formData)
    return submitData
  }
}
