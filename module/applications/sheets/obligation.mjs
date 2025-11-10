import SwerpgBaseItemSheet from './base-item.mjs'
import { logger } from '../../utils/logger.mjs'

/**
 * A SwerpgBaseItemSheet subclass used to configure Items of the "obligation" type.
 * @extends SwerpgBaseItemSheet
 */
export default class ObligationSheet extends SwerpgBaseItemSheet {
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
      type: 'obligation',
    },
    actions: {
      // Actions spécifiques à ObligationSheet
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

    // ✅ Debug conditionnel uniquement si nécessaire
      logger.debug(`[${this.constructor.name}] Context prepared:`, context)


    return context
  }

  /* -------------------------------------------- */

  /** @override */
  _processFormData(event, form, formData) {
    const submitData = super._processFormData(event, form, formData)
    return submitData
  }
}
