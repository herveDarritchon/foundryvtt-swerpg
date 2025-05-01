// characteristic-cost-calculator.test.mjs
import '../../setupTests.js';
import {describe, expect, test} from 'vitest'
import {createCharacteristicData} from "../../utils/characteristics/characteristic.mjs";
import TrainedCharacteristic from "../../../module/lib/characteristics/trained-characteristic.mjs";
import ErrorCharacteristic from "../../../module/lib/characteristics/error-characteristic.mjs";
import CharacteristicCostCalculator from "../../../module/lib/characteristics/characteristic-cost-calculator.mjs";
import {createActor} from "../../utils/actors/actor.mjs";

describe('Characteristics Calculator', () => {
    describe('train a characteristic', () => {
        const action = 'train';
        const actor = createActor();
        const params = {
            action: action,
            isCreation: true,
        };
        const options = {};
        describe('of type trained characteristic', () => {
            test('should return a cost of 20 if base value is 1', () => {
                const data = createCharacteristicData(
                    {
                        trained: 1,
                        value: 2
                    }
                );

                const characteristic = new TrainedCharacteristic(actor, data, params, options);
                const characteristicCostCalculator = new CharacteristicCostCalculator(characteristic);
                const cost = characteristicCostCalculator.calculateCost(action, data.rank.value);
                expect(cost).toBe(20);
            })
        });
        ;
        describe('of type error characteristic', () => {
            test('should return a cost of 0', () => {
                const data = createCharacteristicData({
                    base: 1,
                    value: 1
                });

                const characteristic = new ErrorCharacteristic(actor, data, params, options);
                const characteristicCostCalculator = new CharacteristicCostCalculator(characteristic);
                const cost = characteristicCostCalculator.calculateCost(action, data.rank.value);
                expect(cost).toBe(0);

            });
        });
    });
    describe('forget a characteristic', () => {
        const action = 'forget';
        const actor = createActor();
        const params = {
            action: action,
            isCreation: true,
        };
        const options = {};
        describe('of type trained characteristic', () => {
            test('should return a cost of 20 if current value is 2', () => {
                const data = createCharacteristicData({
                    trained: 1,
                    value: 1
                });

                const characteristic = new TrainedCharacteristic(actor, data, params, options);
                const characteristicCostCalculator = new CharacteristicCostCalculator(characteristic);
                const cost = characteristicCostCalculator.calculateCost(action, data.rank.value);
                expect(cost).toBe(20);
            })
        });
        ;
        describe('of type error characteristic', () => {
            test('should return a cost of 0', () => {
                const data = createCharacteristicData({
                    base: 1,
                    value: 1
                });

                const characteristic = new ErrorCharacteristic(actor, data, params, options);
                const characteristicCostCalculator = new CharacteristicCostCalculator(characteristic);
                const cost = characteristicCostCalculator.calculateCost(action, data.rank.value);
                expect(cost).toBe(0);

            });
        });
    })
})