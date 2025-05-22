// error-talent.test.mjs
import '../../setupTests.js';
import {describe, expect, test} from 'vitest'
import {createActor} from "../../utils/actors/actor.mjs";
import {createTalentData} from "../../utils/talents/talent.mjs";
import ErrorTalent from "../../../module/lib/talents/error-talent.mjs";

describe('Error Talent', () => {
    describe('process a talent', () => {
        test('should create an error talent with correct message', () => {
            const actor = createActor();
            const data = createTalentData();
            const params = {};
            const options = {};

            const errorTalent = new ErrorTalent(actor, data, params, options);
            const processedErrorTalent = errorTalent.process();

            expect(processedErrorTalent.options.message).toBe("Process not implemented. Should not be used!");
        });
    });
    describe('updateState a talent', () => {
        test('should create an error talent with correct message', async () => {
            const actor = createActor({careerSpent: 1});
            const data = createTalentData();
            const params = {};
            const options = {};

            const errorTalent = new ErrorTalent(actor, data, params, options);
            const processedErrorTalent = await errorTalent.updateState();

            expect(processedErrorTalent.options.message).toBe("UpdateState not implemented. Should not be used!");
        });
    });
});