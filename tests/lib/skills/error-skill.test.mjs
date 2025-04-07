// error-free-skill.test.mjs
import '../../setupTests.js';
import {describe, expect, test} from 'vitest'
import {createActor} from "../../utils/actors/actor.mjs";
import {createSkill} from "../../utils/skills/skill.mjs";
import ErrorSkill from "../../../module/lib/skills/error-skill.mjs";

describe('Error Skill', () => {
    describe('train a skill', () => {
        test('should create an error skill with correct message', () => {
            const actor = createActor();
            const skill = createSkill();
            const params = {};
            const options = {};

            const errorSkill = new ErrorSkill(actor, skill, params, options);
            const trainErrorSkill = errorSkill.train();

            expect(trainErrorSkill.options.message).toBe("Train not implemented. Should not be used!");
        });
    });
    describe('forget a skill', () => {
        test('should create an error skill with correct message', () => {
            const actor = createActor({careerSpent: 1});
            const skill = createSkill({careerFree: 1});
            const params = {};
            const options = {};

            const errorSkill = new ErrorSkill(actor, skill, params, options);
            const forgetErrorSkill = errorSkill.forget();

            expect(forgetErrorSkill.options.message).toBe("Forget not implemented. Should not be used!");
        });
    });
    describe('evaluate a skill', () => {
        test('should create an error skill with correct message', () => {
            const actor = createActor({careerSpent: 1});
            const skill = createSkill({careerFree: 1});
            const params = {};
            const options = {};

            const errorSkill = new ErrorSkill(actor, skill, params, options);
            const forgetErrorSkill = errorSkill.evaluate();

            expect(forgetErrorSkill.options.message).toBe("Evaluate not implemented. Should not be used!");
        });
    });
    describe('updateState a skill', () => {
        test('should create an error skill with correct message', async () => {
            const actor = createActor({careerSpent: 1});
            const skill = createSkill({careerFree: 1});
            const params = {};
            const options = {};

            const errorSkill = new ErrorSkill(actor, skill, params, options);
            const forgetErrorSkill = await errorSkill.updateState();

            expect(forgetErrorSkill.options.message).toBe("UpdateState not implemented. Should not be used!");
        });
    });
});