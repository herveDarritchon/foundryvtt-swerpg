import SwerpgBaseItemSheet from './base-item.mjs'

export default class SpecializationTreeSheet extends SwerpgBaseItemSheet {
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
      type: 'specialization-tree',
      includesActions: false,
      includesHooks: false,
    },
  }

  static {
    this._initializeItemSheetClass()
  }
}
