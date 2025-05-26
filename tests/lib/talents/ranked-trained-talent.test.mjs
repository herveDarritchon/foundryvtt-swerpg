// ranked-trained-talent.test.mjs
import '../../setupTests.js';
import {describe, expect, test, vi} from 'vitest'
import {createActor} from "../../utils/actors/actor.mjs";
import {createTalentData} from "../../utils/talents/talent.mjs";
import RankedTrainedTalent from "../../../module/lib/talents/ranked-trained-talent.mjs";
import ErrorTalent from "../../../module/lib/talents/error-talent.mjs";
import TrainedTalent from "../../../module/lib/talents/trained-talent.mjs";

describe('Ranked Trained Talent', () => {
    describe('train a ranked talent', () => {
        test('should add a new ranked trained talent with idx 0, row 1 and spend 5xp', () => {
            const data = createTalentData("1",{isRanked: true});
            const existingTalents = [createTalentData("2",{name: 'talent-1'})];
            const actor = createActor({items: existingTalents});
            const params = {
                action: "train",
                isCreation: true,
            };
            const options = {};

            const trainedTalent = new RankedTrainedTalent(actor, data, params, options);
            const trainRankedTrainedTalent = trainedTalent.process();

            expect(trainRankedTrainedTalent).toBeInstanceOf(RankedTrainedTalent);
            expect(trainRankedTrainedTalent.data._source.system.rank.idx).toBe(1);
            expect(trainRankedTrainedTalent.data._source.system.rank.cost).toBe(5);
            expect(trainedTalent.actor.experiencePoints.spent).toBe(5);
        });
        test('should add an existing ranked trained talent with idx 1, row 2 and spend 10xp', () => {
            const data = createTalentData("2",{isRanked: true, row: 2});
            const existingTalents = [createTalentData("1",{isRanked: true, row: 1})];
            const actor = createActor({items: existingTalents});
            const params = {
                action: "train",
                isCreation: true,
            };
            const options = {};

            const trainedTalent = new RankedTrainedTalent(actor, data, params, options);
            const trainRankedTrainedTalent = trainedTalent.process();

            expect(trainRankedTrainedTalent).toBeInstanceOf(RankedTrainedTalent);
            expect(trainRankedTrainedTalent.data._source.system.rank.idx).toBe(2);
            expect(trainRankedTrainedTalent.data._source.system.rank.cost).toBe(10);
            expect(trainedTalent.actor.experiencePoints.spent).toBe(10);
        });

    });
    describe('forget a ranked talent', () => {
        test('should remove a new trained talent, row 1 and regain 5xp', () => {
            const data = createTalentData("2",{isRanked: true, row: 1});
            const existingTalents = [data];
            const actor = createActor({items: existingTalents});
            actor.experiencePoints.spent = 30;
            actor.experiencePoints.gained = 100;
            actor.experiencePoints.available = 80;
            const params = {
                action: "forget",
                isCreation: true,
            };
            const options = {};

            const trainedTalent = new RankedTrainedTalent(actor, data, params, options);
            const forgetRankedTrainedTalent = trainedTalent.process();

            expect(forgetRankedTrainedTalent).toBeInstanceOf(RankedTrainedTalent);
            expect(forgetRankedTrainedTalent.data._source.system.rank.idx).toBe(0);
            expect(forgetRankedTrainedTalent.data._source.system.rank.cost).toBe(0);
            expect(forgetRankedTrainedTalent.actor.experiencePoints.spent).toBe(25);
        });
    });
    describe('process a ranked talent', () => {
        describe('should return an error talent if', () => {
            test('trained a talent costs more than experience points available', () => {
                const data = createTalentData("2",{row: 3});
                const existingTalents = [createTalentData("1",{name: 'talent-1'})];
                const actor = createActor({items: existingTalents});

                actor.experiencePoints.spent = 90;
                actor.experiencePoints.gained = 100;
                actor.experiencePoints.available = 10;
                const params = {
                    action: "train",
                    isCreation: false,
                };
                const options = {};

                const trainedTalent = new RankedTrainedTalent(actor, data, params, options);
                const errorTalent = trainedTalent.process();

                expect(errorTalent).toBeInstanceOf(ErrorTalent);
                expect(errorTalent.options.message).toBe("you can't spend more experience than your total!");
                expect(errorTalent.evaluated).toBe(false);
            });
        });
    });
    describe('updateState a ranked talent', () => {
        test('should return a TalentError is TrainedError is not evaluated', async () => {
            const data = createTalentData("1");
            const existingTalents = [createTalentData("2",{name: 'talent-1'})];
            const actor = createActor({items: existingTalents});

            const updateMock = vi.fn().mockResolvedValue({});
            actor.update = updateMock;

            const createEmbeddedDocumentsMock = vi.fn().mockResolvedValue([data.toObject()]);
            actor.createEmbeddedDocuments = createEmbeddedDocumentsMock;

            const params = {
                action: "train",
                isCreation: true,
            };
            const options = {};

            const trainedFreeTalent = new RankedTrainedTalent(actor, data, params, options);
            const updatedTalent = await trainedFreeTalent.updateState();

            expect(updatedTalent).toBeInstanceOf(ErrorTalent);
            expect(updateMock).toHaveBeenCalledTimes(0);
            expect(createEmbeddedDocumentsMock).toHaveBeenCalledTimes(0);
        });
        test('should update the state of the train talent and return the talent', async () => {
            const data = createTalentData("1");
            const existingTalents = [createTalentData("2",{name: 'talent-1'})];
            const actor = createActor({items: existingTalents});

            const updateMock = vi.fn().mockResolvedValue({});
            actor.update = updateMock;

            const createEmbeddedDocumentsMock = vi.fn()
                .mockResolvedValue([data.toObject()]);
            actor.createEmbeddedDocuments = createEmbeddedDocumentsMock;

            const params = {
                action: "train",
                isCreation: true,
            };
            const options = {};

            const trainedFreeTalent = new RankedTrainedTalent(actor, data, params, options);
            const processedRankedTrainedTalent = trainedFreeTalent.process();
            await processedRankedTrainedTalent.updateState();

            expect(updateMock).toHaveBeenCalledTimes(1);
            expect(updateMock).toHaveBeenNthCalledWith(1, {
                "system.progression.experience.spent": 5,
            });
            expect(createEmbeddedDocumentsMock).toHaveBeenCalledWith("Item", [data.toObject()]);
        });
        test('should update the state of the forget talent and return the talent', async () => {
            const data = createTalentData("1", {name: 'talent-1'});
            const existingTalents = [data];
            const actor = createActor({items: existingTalents});

            const updateMock = vi.fn()
                .mockResolvedValue({});
            actor.update = updateMock;

            const deleteEmbeddedDocumentsMock = vi.fn()
                .mockResolvedValue(["1"]);
            actor.deleteEmbeddedDocuments = deleteEmbeddedDocumentsMock;

            const params = {
                action: "forget",
                isCreation: true,
            };
            const options = {};

            const trainedFreeTalent = new RankedTrainedTalent(actor, data, params, options);
            const processedTrainedTalent = trainedFreeTalent.process();
            await processedTrainedTalent.updateState();

            expect(updateMock).toHaveBeenCalledTimes(1);
            expect(updateMock).toHaveBeenNthCalledWith(1, {
                "system.progression.experience.spent": -5,
            });
            expect(deleteEmbeddedDocumentsMock).toHaveBeenCalledWith("Item", ["1"]);
        });
        describe('should return an Error Talent if any update fails', () => {
            test('create embedded fails', async () => {
                const data = createTalentData("1");
                const existingTalents = [createTalentData("2",{name: 'talent-1'})];
                const actor = createActor({items: existingTalents});

                const updateMock = vi.fn().mockResolvedValue({});
                actor.update = updateMock;

                const createEmbeddedDocumentsMock = vi.fn()
                    .mockRejectedValueOnce(new Error('Erreur sur create embedded'));
                actor.createEmbeddedDocuments = createEmbeddedDocumentsMock;

                const params = {
                    action: "train",
                    isCreation: true,
                };
                const options = {};

                const trainedFreeTalent = new RankedTrainedTalent(actor, data, params, options);
                const processedRankedTrainedTalent = trainedFreeTalent.process();
                const result = await processedRankedTrainedTalent.updateState();

                expect(createEmbeddedDocumentsMock).toHaveBeenCalledTimes(1);
                expect(updateMock).toHaveBeenCalledTimes(1);
                expect(result).toBeInstanceOf(ErrorTalent);
                expect(result.options.message).toContain('Erreur sur create embedded');
            });

            test('talent rank update fails', async () => {
                const data = createTalentData("1");
                const existingTalents = [createTalentData("2",{name: 'talent-1'})];
                const actor = createActor({items: existingTalents});

                const updateMock = vi.fn()
                    .mockRejectedValueOnce(new Error('Erreur sur update'));
                actor.update = updateMock;

                const createEmbeddedDocumentsMock = vi.fn()
                    .mockResolvedValue([data.toObject()]);
                actor.createEmbeddedDocuments = createEmbeddedDocumentsMock;

                const params = {
                    action: "train",
                    isCreation: true,
                };
                const options = {};

                const trainedFreeTalent = new RankedTrainedTalent(actor, data, params, options);
                const processedRankedTrainedTalent = trainedFreeTalent.process();
                const result = await processedRankedTrainedTalent.updateState();

                expect(createEmbeddedDocumentsMock).toHaveBeenCalledTimes(0);
                expect(updateMock).toHaveBeenCalledTimes(1);
                expect(result).toBeInstanceOf(ErrorTalent);
                expect(result.options.message).toContain('Erreur sur update');
            });
            test('forget talent rank update fails', async () => {
                const data = createTalentData("1", {name: 'talent-1'});
                const existingTalents = [data];
                const actor = createActor({items: existingTalents});

                const updateMock = vi.fn()
                    .mockResolvedValue({});
                actor.update = updateMock;

                const deleteEmbeddedDocumentsMock = vi.fn()
                    .mockRejectedValueOnce(new Error('Erreur sur deleteEmbeddedDocuments'));
                actor.deleteEmbeddedDocuments = deleteEmbeddedDocumentsMock;

                const params = {
                    action: "forget",
                    isCreation: true,
                };
                const options = {};

                const trainedFreeTalent = new TrainedTalent(actor, data, params, options);
                const processedTrainedTalent = trainedFreeTalent.process();
                const result = await processedTrainedTalent.updateState();

                expect(updateMock).toHaveBeenCalledTimes(1);
                expect(updateMock).toHaveBeenNthCalledWith(1, {
                    "system.progression.experience.spent": -5,
                });
                expect(deleteEmbeddedDocumentsMock).toHaveBeenCalledWith("Item", ["1"]);
                expect(result).toBeInstanceOf(ErrorTalent);
                expect(result.options.message).toContain('Erreur sur deleteEmbeddedDocuments');
            });
        });
    });
});