// characteristic-factory.test.mjs
import '../../setupTests.js';
import {describe, expect, test} from 'vitest'
import CharacteristicFactory from "../../../module/lib/characteristics/characteristic-factory.mjs";
import {createActor} from "../../utils/actors/actor.mjs";
import TrainedCharacteristic from "../../../module/lib/characteristics/trained-characteristic.mjs";
import ErrorCharacteristic from "../../../module/lib/characteristics/error-characteristic.mjs";

describe("CharacteristicFactory build()", () => {
    describe("during creation time", () => {
        const characteristicId = "brawn";
        describe("should create a TrainedCharacteristic", () => {
            const expectTrainedClassCharacteristic = TrainedCharacteristic;
            describe("action is train", () => {
                const action = "train";
                test('click on train a characteristic', () => {
                    const actor = createActor();
                    const params = {
                        action: action,
                        isCreation: true,
                    };
                    const options = {};
                    const characteristic = CharacteristicFactory.build(actor, characteristicId, params, options);
                    expect(characteristic).toBeInstanceOf(expectTrainedClassCharacteristic);
                });
            });
            describe("action is forget", () => {
                const action = "forget";
                test('click on forget a characteristic with trained points', () => {
                    const actor = createActor();
                    actor.system.characteristics.brawn.rank.trained = 1;
                    actor.experiencePoints.spent = 10;
                    const params = {
                        action: action,
                        isCreation: true,
                    };
                    const options = {};
                    const characteristic = CharacteristicFactory.build(actor, characteristicId, params, options);
                    expect(characteristic).toBeInstanceOf(expectTrainedClassCharacteristic);
                });
            });
        });
        describe("should create a ErrorCharacteristic", () => {
            const expectClassCharacteristic = ErrorCharacteristic;
            describe("action is train", () => {
                const action = "train";
                test('click on train a characteristic and not in creation mode', () => {
                    const actor = createActor();
                    const params = {
                        action: action,
                        isCreation: false,
                    };
                    const options = {};
                    const characteristic = CharacteristicFactory.build(actor, characteristicId, params, options);
                    expect(characteristic).toBeInstanceOf(expectClassCharacteristic);
                    expect(characteristic.options.message).toBe("you can't modify your characteristics at this time!");
                });
            });
            describe("action is forget", () => {
                const action = "forget";
                test('click on forget a characteristic and not in creation mode', () => {
                    const actor = createActor();
                    actor.system.characteristics.brawn.rank.trained = 1;
                    const params = {
                        action: action,
                        isCreation: false,
                    };
                    const options = {};
                    const characteristic = CharacteristicFactory.build(actor, characteristicId, params, options);
                    expect(characteristic).toBeInstanceOf(expectClassCharacteristic);
                    expect(characteristic.options.message).toBe("you can't modify your characteristics at this time!");
                });
            });
        });
    });
});
