import SwerpgBaseItemSheet from './base-item.mjs'
import { logger } from '../../utils/logger.mjs'

/**
 * A SwerpgBaseItemSheet subclass used to configure Items of the "motivation-category" type.
 * @extends SwerpgBaseItemSheet
 */
export default class MotivationCategorySheet extends SwerpgBaseItemSheet {
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
      type: 'motivation-category',
    },
    actions: {
      // Actions spécifiques à MotivationCategorySheet
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
