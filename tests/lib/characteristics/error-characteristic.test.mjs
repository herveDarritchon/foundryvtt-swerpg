// error-characteristic.test.mjs
import '../../setupTests.js';
import {describe, expect, test} from 'vitest'
import {createActor} from "../../utils/actors/actor.mjs";
import {createCharacteristicData} from "../../utils/characteristics/characteristic.mjs";
import ErrorCharacteristic from "../../../module/lib/characteristics/error-characteristic.mjs";

describe('Error Characteristic', () => {
    describe('process a characteristic', () => {
        test('should create an error characteristic with correct message', () => {
            const actor = createActor({trained: 1});
            const data = createCharacteristicData({trained: 1});
            const params = {};
            const options = {};

            const errorCharacteristic = new ErrorCharacteristic(actor, data, params, options);
            const forgetErrorCharacteristic = errorCharacteristic.process();

            expect(forgetErrorCharacteristic.options.message).toBe("Process not implemented. Should not be used!");
        });
    });
    describe('updateState a characteristic', () => {
        test('should create an error characteristic with correct message', async () => {
            const actor = createActor({careerSpent: 1});
            const data = createCharacteristicData({careerFree: 1});
            const params = {};
            const options = {};

            const errorCharacteristic = new ErrorCharacteristic(actor, data, params, options);
            const forgetErrorCharacteristic = await errorCharacteristic.updateState();

            expect(forgetErrorCharacteristic.options.message).toBe("UpdateState not implemented. Should not be used!");
        });
    });
});