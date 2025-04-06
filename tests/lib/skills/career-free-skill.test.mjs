// career-free-skill.test.mjs
import '../../setupTests.js';
import {describe, expect, test} from 'vitest'
import {createActor} from "../../utils/actors/actor.mjs";
import {createSkill} from "../../utils/skills/skill.mjs";
import CareerFreeSkill from "../../../module/lib/skills/career-free-skill.mjs";
import ErrorSkill from "../../../module/lib/skills/error-skill.mjs";

describe('Career Free Skill', () => {
    describe('train a skill', () => {
        test('should increase the career free skill rank', () => {
            const actor = createActor();
            const skill = createSkill();
            const params = {};
            const options = {};

            const careerFreeSkill = new CareerFreeSkill(actor, skill, params, options);
            const trainedSkill = careerFreeSkill.train();

            expect(trainedSkill.skill.rank.careerFree).toBe(1);
            expect(trainedSkill.actor.freeSkillRanks.career.spent).toBe(1);
            expect(trainedSkill.actor.freeSkillRanks.specialization.spent).toBe(0);
            expect(trainedSkill.skill.rank.specializationFree).toBe(0);
        });
    });
    describe('forget a skill', () => {
        test('should decrease the career free skill rank', () => {
            const actor = createActor({careerSpent: 1});
            const skill = createSkill({careerFree: 1});
            const params = {};
            const options = {};

            const careerFreeSkill = new CareerFreeSkill(actor, skill, params, options);
            const trainedSkill = careerFreeSkill.forget();

            expect(trainedSkill.skill.rank.careerFree).toBe(0);
            expect(trainedSkill.actor.freeSkillRanks.career.spent).toBe(0);
            expect(trainedSkill.actor.freeSkillRanks.specialization.spent).toBe(0);
            expect(trainedSkill.skill.rank.specializationFree).toBe(0);
        });
    });
    describe('evaluate a skill', () => {
        describe('should return an error skill if', () => {
            describe('you train a skill', () => {
                test('and career free skill rank is greater than 1', () => {
                    const actor = createActor();
                    const skill = createSkill({careerFree: 2});
                    const params = {};
                    const options = {};

                    const careerFreeSkill = new CareerFreeSkill(actor, skill, params, options);
                    const errorSkill = careerFreeSkill.evaluate();

                    expect(errorSkill).toBeInstanceOf(ErrorSkill);
                    expect(errorSkill.options.message).toBe("you can't use more than 1 free skill rank into the same skill!");
                    expect(errorSkill.evaluated).toBe(false);
                });
                test('after train free skill rank available is less than 0', () => {
                    const actor = createActor({careerSpent: 5});
                    const skill = createSkill({careerFree: 1});
                    const params = {};
                    const options = {};

                    const careerFreeSkill = new CareerFreeSkill(actor, skill, params, options);
                    const errorSkill = careerFreeSkill.evaluate();

                    expect(errorSkill).toBeInstanceOf(ErrorSkill);
                    expect(errorSkill.options.message).toBe("you can't use free skill rank anymore. You have used all!");
                    expect(errorSkill.evaluated).toBe(false);
                });
            });
            describe('you forget a skill', () => {
                test('and career free skill rank is less than 0', () => {
                    const actor = createActor();
                    const skill = createSkill({careerFree: -1});
                    const params = {};
                    const options = {};

                    const careerFreeSkill = new CareerFreeSkill(actor, skill, params, options);
                    const errorSkill = careerFreeSkill.evaluate();

                    expect(errorSkill).toBeInstanceOf(ErrorSkill);
                    expect(errorSkill.options.message).toBe("you can't forget this rank because it comes from species free bonus!");
                    expect(errorSkill.evaluated).toBe(false);
                });
                test('and career free skill rank is greater than career free skill rank gained', () => {
                    const actor = createActor({careerSpent: -1});
                    const skill = createSkill({careerFree: 0});
                    const params = {};
                    const options = {};

                    const careerFreeSkill = new CareerFreeSkill(actor, skill, params, options);
                    const errorSkill = careerFreeSkill.evaluate();

                    expect(errorSkill).toBeInstanceOf(ErrorSkill);
                    expect(errorSkill.options.message).toBe("you can't get more than 4 free skill ranks!");
                    expect(errorSkill.evaluated).toBe(false);
                });
            });
        });
        describe('should return a career free skill if', () => {
           test('career free skill rank is 1 and only 1', () => {
                const actor = createActor();
                const skill = createSkill({careerFree:1})
                const params = {};
                const options = {};
                const careerFreeSkill = new CareerFreeSkill(actor, skill, params, options);
                const evaluatedSkill = careerFreeSkill.evaluate();
                expect(evaluatedSkill).toBeInstanceOf(CareerFreeSkill);
                expect(evaluatedSkill.skill.rank.careerFree).toBe(1);
                expect(evaluatedSkill.skill.rank.value).toBe(1);
                expect(evaluatedSkill.evaluated).toBe(true);
           });
        });
    });
});