import TrainedCharacteristic from "./trained-characteristic.mjs";
import ErrorCharacteristic from "./error-characteristic.mjs";

/**
 * @typedef {Object} Characteristic
 * @property {SwerpgActor} actor - The actor instance.
 * @property {Characteristic} data - The characteristic instance.
 * @property {boolean} isCreation - Indicates if the characteristic is in the creation phase.
 * @property {string} action - The action to be performed on the characteristic.
 * @property {CharacteristicOptions} options - Additional options for the characteristic.
 * @property {boolean} evaluated - Indicates if the characteristic has been evaluated.
 *
 **/

/**
 * @typedef {Object} CharacteristicOptions
 **/

/**
 * @typedef {Object} CharacteristicParams
 * @property {"train" | "forget"} action the action to be performed on the characteristic
 * @property {boolean} isCreation whether we are in the creation process phase
 */

export default class CharacteristicFactory {

    /**
     * Builds a characteristic object based on a context.
     * @param actor {SwerpgActor} an Actor instance
     * @param characteristicId {string} a characteristic id from the list of characteristics
     * @param params {CharacteristicParams} the params to be used to build the characteristic
     * @param options {CharacteristicOptions} additional options
     * @returns {TrainedCharacteristic|ErrorCharacteristic} a characteristic object
     */
    static build(
        actor,
        characteristicId,
        {
            action /** @type {"train" | "forget"} */ = ("train"),
            isCreation = false,
        } = {},
        options = {}) {

        const characteristic = foundry.utils.getProperty(actor.system.characteristics, characteristicId);
        characteristic.id = characteristicId;

        if (isCreation) {
            return new TrainedCharacteristic(actor, characteristic, {action, isCreation}, options);
        }

        options.message = "you can't modify your characteristics at this time!";
        return new ErrorCharacteristic(actor, characteristic, {
            action,
            isCreation: true,
        }, options);
    }
}