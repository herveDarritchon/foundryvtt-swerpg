import SwerpgBaseItemSheet from './base-item.mjs'
import { logger } from '../../utils/logger.mjs'

export default class DutySheet extends SwerpgBaseItemSheet {
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
      type: 'duty',
    },
    actions: {},
  }

  static {
    this._initializeItemSheetClass()
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    logger.debug(`[${this.constructor.name}] Context prepared:`, context)
    return context
  }

  _processFormData(event, form, formData) {
    return super._processFormData(event, form, formData)
  }
}
