// trained-characteristic.test.mjs
import '../../setupTests.js';
import {describe, expect, test, vi} from 'vitest'
import {createActor} from "../../utils/actors/actor.mjs";
import {createCharacteristicData} from "../../utils/characteristics/characteristic.mjs";
import TrainedCharacteristic from "../../../module/lib/characteristics/trained-characteristic.mjs";
import ErrorCharacteristic from "../../../module/lib/characteristics/error-characteristic.mjs";

describe('Trained Characteristic', () => {
    describe('train a characteristic', () => {
        test('should increase the trained characteristic rank to 1 and spend 20xp', () => {
            const actor = createActor();
            const data = createCharacteristicData();
            const params = {
                action: "train",
                isCreation: true,
            };
            const options = {};

            const trainedCharacteristic = new TrainedCharacteristic(actor, data, params, options);
            const trainTrainedCharacteristic = trainedCharacteristic.process();

            expect(trainTrainedCharacteristic.data.rank.trained).toBe(1);
            expect(trainTrainedCharacteristic.data.rank.value).toBe(2);
            expect(trainedCharacteristic.actor.experiencePoints.spent).toBe(20);
        });
    });
    describe('forget a characteristic', () => {
        test('should decrease the trained characteristic rank to 1 and regain 20xp', () => {
            const actor = createActor();
            actor.experiencePoints.spent = 30;
            actor.experiencePoints.gained = 100;
            actor.experiencePoints.available = 80;
            const data = createCharacteristicData({trained: 1, value: 2});
            const params = {
                action: "forget",
                isCreation: true,
            };
            const options = {};

            const trainedCharacteristic = new TrainedCharacteristic(actor, data, params, options);
            const forgetTrainedCharacteristic = trainedCharacteristic.process();

            expect(forgetTrainedCharacteristic.data.rank.trained).toBe(0);
            expect(forgetTrainedCharacteristic.data.rank.value).toBe(1);
            expect(forgetTrainedCharacteristic.actor.experiencePoints.spent).toBe(10);
        });
    });
    describe('evaluate a characteristic', () => {
        describe('should return an error characteristic if', () => {
            test('trained characteristic rank is less than 0', () => {
                const actor = createActor();
                const data = createCharacteristicData({trained: -1});
                const params = {
                    action: "forget",
                    isCreation: true,
                };
                const options = {};

                const trainedCharacteristic = new TrainedCharacteristic(actor, data, params, options);
                const errorCharacteristic = trainedCharacteristic.process();

                expect(errorCharacteristic).toBeInstanceOf(ErrorCharacteristic);
                expect(errorCharacteristic.options.message).toBe("you can't forget this rank anymore because you are at & (minimal value)!");
                expect(errorCharacteristic.evaluated).toBe(false);
            });
            test('trained a characteristic costs more than experience points available', () => {
                const actor = createActor();
                actor.experiencePoints.spent = 90;
                actor.experiencePoints.gained = 100;
                actor.experiencePoints.available = 10;
                const data = createCharacteristicData({careerFree: 1, trained: 1, value: 2});
                const params = {
                    action: "train",
                    isCreation: false,
                };
                const options = {};

                const trainedCharacteristic = new TrainedCharacteristic(actor, data, params, options);
                const errorCharacteristic = trainedCharacteristic.process();

                expect(errorCharacteristic).toBeInstanceOf(ErrorCharacteristic);
                expect(errorCharacteristic.options.message).toBe("you can't spend more experience than your total!");
                expect(errorCharacteristic.evaluated).toBe(false);
            });
            test('characteristic rank value is greater than 5 and isCreation is true', () => {
                const actor = createActor();
                const data = createCharacteristicData({trained: 5});
                const params = {
                    action: "train",
                    isCreation: true,
                };
                const options = {};

                const trainedCharacteristic = new TrainedCharacteristic(actor, data, params, options);
                const errorCharacteristic = trainedCharacteristic.process();

                expect(errorCharacteristic).toBeInstanceOf(ErrorCharacteristic);
                expect(errorCharacteristic.options.message).toBe("you can't have more than 5 rank during creation!");
                expect(errorCharacteristic.evaluated).toBe(false);
            });
            test('characteristic rank value is greater than 6 and isCreation is false', () => {
                const actor = createActor();
                const data = createCharacteristicData({trained: 6});
                const params = {
                    action: "train",
                    isCreation: false,
                };
                const options = {};

                const trainedCharacteristic = new TrainedCharacteristic(actor, data, params, options);
                const errorCharacteristic = trainedCharacteristic.process();

                expect(errorCharacteristic).toBeInstanceOf(ErrorCharacteristic);
                expect(errorCharacteristic.options.message).toBe("you can't have more than 6 rank!");
                expect(errorCharacteristic.evaluated).toBe(false);
            });
        });
        describe('should return a trained characteristic if', () => {
            test('trained characteristic rank is 1 and only 1', () => {
                const actor = createActor();
                actor.experiencePoints.spent = 10;
                actor.experiencePoints.gained = 100;
                actor.experiencePoints.available = 90;
                const data = createCharacteristicData({careerFree: 1, specializationFree: 0, trained: 0, value: 1})
                const params = {
                    action: "train",
                    isCreation: true,
                };
                const options = {};
                const trainedFreeCharacteristic = new TrainedCharacteristic(actor, data, params, options);
                const evaluatedCharacteristic = trainedFreeCharacteristic.process();
                expect(evaluatedCharacteristic).toBeInstanceOf(TrainedCharacteristic);
                expect(evaluatedCharacteristic.data.rank.trained).toBe(1);
                expect(evaluatedCharacteristic.data.rank.value).toBe(2);
                expect(evaluatedCharacteristic.evaluated).toBe(true);
            });
        });
    });
    describe('updateState a characteristic', () => {
        test('should update the state of the characteristic and return the characteristic', async () => {
            const actor = createActor();
            const updateMock = vi.fn().mockResolvedValue({});
            actor.update = updateMock;
            const data = createCharacteristicData({trained: 1, value: 2});
            const params = {
                action: "train",
                isCreation: false,
            };
            const options = {};
            const trainedFreeCharacteristic = new TrainedCharacteristic(actor, data, params, options);
            const processedTrainedCharacteristic = trainedFreeCharacteristic.process();
            const updatedCharacteristic = await processedTrainedCharacteristic.updateState();
            expect(updatedCharacteristic).toBeInstanceOf(TrainedCharacteristic);
            expect(updateMock).toHaveBeenCalledTimes(2);
            expect(updateMock).toHaveBeenNthCalledWith(2, {
                'system.characteristics.characteristic-id.rank': {
                    "base": 1,
                    "trained": 2,
                    "value": 3,
                },
            });
            expect(updateMock).toHaveBeenNthCalledWith(1, {
                'system.progression.experience.spent': 30
            });
        });
        describe('should return an Error Characteristic if any update fails', () => {
            test('should not update the state of the characteristic if the characteristic evaluated state is false', async () => {
                const actor = createActor();
                const updateMock = vi.fn()
                    .mockResolvedValue({});
                actor.update = updateMock;
                const data = createCharacteristicData({careerFree: 1, specializationFree: 1, trained: 1});
                const params = {};
                const options = {};
                const trainedFreeCharacteristic = new TrainedCharacteristic(actor, data, params, options);
                const result = await trainedFreeCharacteristic.updateState();
                expect(updateMock).toHaveBeenCalledTimes(0);
                expect(result).toBeInstanceOf(ErrorCharacteristic);
                expect(result.options.message).toContain('you must evaluate the characteristic before updating it!');
            });
            test('free characteristic ranks update fails', async () => {
                const actor = createActor();
                const updateMock = vi.fn()
                    .mockRejectedValueOnce(new Error('Erreur sur premier update'));
                actor.update = updateMock;
                const data = createCharacteristicData({trainedFree: 1, specializationFree: 1, trained: 1});
                const params = {};
                const options = {};
                const trainedFreeCharacteristic = new TrainedCharacteristic(actor, data, params, options);
                trainedFreeCharacteristic.process();
                const result = await trainedFreeCharacteristic.updateState();
                expect(updateMock).toHaveBeenCalledTimes(1);
                expect(result).toBeInstanceOf(ErrorCharacteristic);
                expect(result.options.message).toContain('Erreur sur premier update');
            });
            test('characteristic rank update fails', async () => {
                const actor = createActor();
                const updateMock = vi.fn()
                    .mockResolvedValueOnce({})
                    .mockRejectedValueOnce(new Error('Erreur sur deuxième update'));
                actor.update = updateMock;
                const data = createCharacteristicData({trainedFree: 1, specializationFree: 1, trained: 1});
                const params = {};
                const options = {};
                const trainedFreeCharacteristic = new TrainedCharacteristic(actor, data, params, options);
                trainedFreeCharacteristic.process();
                const result = await trainedFreeCharacteristic.updateState();
                expect(updateMock).toHaveBeenCalledTimes(2);
                expect(result).toBeInstanceOf(ErrorCharacteristic);
                expect(result.options.message).toContain('Erreur sur deuxième update');
            });
        });
    });
});