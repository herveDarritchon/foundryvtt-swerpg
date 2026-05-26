import TrainedCharacteristic from './trained-characteristic.mjs'
import { CHARACTERISTIC_RANK_COST_MULTIPLIER } from '../../config/progression.mjs'

/**
 * CharacteristicCostCalculator class
 * This class is used to calculate the cost of a characteristic.
 *
 */
export default class CharacteristicCostCalculator {
  constructor(characteristic) {
    this.characteristic = foundry.utils.deepClone(characteristic)
  }

  /**
   * Calculate the cost of the characteristic.
   * @param {string} action The action to perform.
   * @param value
   * @returns {number} - The cost of the characteristic.
   */
  calculateCost(action, value) {
    let cost = 0
    if (this.characteristic instanceof TrainedCharacteristic) {
      if (action === 'train') {
        cost = this.#calculateTrainCost(value)
      } else if (action === 'forget') {
        cost = this.#calculateForgetCost(value)
      }
    }
    return cost
  }

  #calculateTrainCost(value) {
    return value * CHARACTERISTIC_RANK_COST_MULTIPLIER
  }

  #calculateForgetCost(value) {
    return this.#calculateTrainCost(value + 1)
  }
}
