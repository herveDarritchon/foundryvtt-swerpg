/**
 * @abstract
 * @typedef {Object} AbstractJauge
 * @property {number} value
 * @property {number} max
 * @function create() => JaugeDisplayData
 */
export class AbstractJauge {
  constructor(value, max) {
    if (new.target === AbstractJauge) {
      throw new TypeError('Cannot instantiate AbstractJauge directly')
    }
    this.value = value
    this.max = max
  }

  /**
   * Build and return the display data object for this gauge.
   * @returns {JaugeDisplayData}
   */
  create() {
    return {
      extraCss: this.constructor.TYPE,
      type: this.constructor.TYPE,
      label: this.constructor.TYPE,
      value: this.value,
      max: this.max,
      blocks: Array.from({ length: this.max }, (_, i) => ({
        cssClass: i < this.value ? 'active' : 'inactive',
      })),
    }
  }
}
