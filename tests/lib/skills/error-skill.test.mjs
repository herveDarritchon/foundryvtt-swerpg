// error-free-skill.test.mjs
import '../../setupTests.js';
import {describe, expect, test} from 'vitest'
import {createActor} from "../../utils/actors/actor.mjs";
import {createSkillData} from "../../utils/skills/skill.mjs";
import ErrorSkill from "../../../module/lib/skills/error-skill.mjs";

describe('Error Skill', () => {
    describe('process a skill', () => {
        test('should create an error skill with correct message', () => {
            const actor = createActor({careerSpent: 1});
            const data = createSkillData({careerFree: 1});
            const params = {};
            const options = {};

            const errorSkill = new ErrorSkill(actor, data, params, options);
            const forgetErrorSkill = errorSkill.process();

            expect(forgetErrorSkill.options.message).toBe("Process not implemented. Should not be used!");
        });
        describe('train a skill', () => {
            test('should create an error skill with correct message', () => {
                const actor = createActor();
                const data = createSkillData();
                const params = {
                    action: "train",
                    isCreation: true,
                    isCareer: true,
                    isSpecialization: true
                };
                const options = {};

                const errorSkill = new ErrorSkill(actor, data, params, options);
                const trainErrorSkill = errorSkill.process();

                expect(trainErrorSkill.options.message).toBe("Process not implemented. Should not be used!");
            });
        });
        describe('forget a skill', () => {
            test('should create an error skill with correct message', () => {
                const actor = createActor({careerSpent: 1});
                const data = createSkillData({careerFree: 1});
                const params = {
                    action: "forget",
                    isCreation: true,
                    isCareer: true,
                    isSpecialization: true
                };
                const options = {};

                const errorSkill = new ErrorSkill(actor, data, params, options);
                const forgetErrorSkill = errorSkill.process();

                expect(forgetErrorSkill.options.message).toBe("Process not implemented. Should not be used!");
            });
        });

    });
    describe('updateState a skill', () => {
        test('should create an error skill with correct message', async () => {
            const actor = createActor({careerSpent: 1});
            const data = createSkillData({careerFree: 1});
            const params = {};
            const options = {};

            const errorSkill = new ErrorSkill(actor, data, params, options);
            const forgetErrorSkill = await errorSkill.updateState();

            expect(forgetErrorSkill.options.message).toBe("UpdateState not implemented. Should not be used!");
        });
    });
});