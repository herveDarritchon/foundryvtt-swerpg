// talent-factory.test.mjs
import '../../setupTests.js';
import {describe, expect, test} from 'vitest'
import TalentFactory from "../../../module/lib/talents/talent-factory.mjs";
import {createActor} from "../../utils/actors/actor.mjs";
import TrainedTalent from "../../../module/lib/talents/trained-talent.mjs";
import ErrorTalent from "../../../module/lib/talents/error-talent.mjs";
import RankedTrainedTalent from "../../../module/lib/talents/ranked-trained-talent.mjs";
import {createTalentData} from "../../utils/talents/talent.mjs";

describe("TalentFactory build()", () => {
    describe("should create a TrainedTalent", () => {
        const expectedTrainedClassTalent = TrainedTalent;
        const action = "train";
        test('drop a talent', () => {
            const actor = createActor();
            const params = {
                action: action,
                isCreation: true,
            };
            const options = {};
            const droppedItem = createTalentData("1");

            const talent = TalentFactory.build(actor, droppedItem, params, options);
            expect(talent).toBeInstanceOf(expectedTrainedClassTalent);
        });
    });
    describe("should create a RankedTrainedTalent", () => {
        const expectedTrainedClassTalent = RankedTrainedTalent;
        const action = "train";
        test('drop a ranked talent', () => {
            const actor = createActor();
            const params = {
                action: action,
                isCreation: true,
            };
            const options = {};
            const droppedItem = createTalentData("1", {
                isRanked: true,
            })

            const talent = TalentFactory.build(actor, droppedItem, params, options);
            expect(talent).toBeInstanceOf(expectedTrainedClassTalent);
        });
    });
    describe("should create an ErrorTalent", () => {
        const expectClassTalent = ErrorTalent;
        const action = "train";
        test('drop a ranked talent and not in creation mode', () => {
            const actor = createActor();
            const params = {
                action: action,
                isCreation: false,
            };
            const options = {};
            const droppedItem = createTalentData("1");

            const talent = TalentFactory.build(actor, droppedItem, params, options);
            expect(talent).toBeInstanceOf(expectClassTalent);
            expect(talent.options.message).toBe("You can train or forget a talent only at creation!");
        });
        test('drop an item that is not a talent', () => {
            const actor = createActor();
            const params = {
                action: action,
                isCreation: true,
            };
            const options = {};
            const droppedItem = createTalentData("1",
                {type: 'not-talent'}
            );

            const talent = TalentFactory.build(actor, droppedItem, params, options);
            expect(talent).toBeInstanceOf(expectClassTalent);
            expect(talent.options.message).toBe("Item dropped (talent-name) is not a talent!");
        });
    });
});
