// trained-skill.test.mjs
import '../../setupTests.js';
import {describe, expect, test} from 'vitest'
import {createActor} from "../../utils/actors/actor.mjs";
import {createSkill} from "../../utils/skills/skill.mjs";
import TrainedSkill from "../../../module/lib/skills/trained-skill.mjs";
import ErrorSkill from "../../../module/lib/skills/error-skill.mjs";

describe('Specialization Free Skill', () => {
    describe('train a skill', () => {
        test('should increase the specialization free skill rank', () => {
            const actor = createActor();
            const skill = createSkill();
            const params = {};
            const options = {};

            const trainedSkill = new TrainedSkill(actor, skill, params, options);
            const trainTrainedSkill = trainedSkill.train();

            expect(trainTrainedSkill.skill.rank.trained).toBe(1);
            expect(trainTrainedSkill.skill.rank.specializationFree).toBe(0);
            expect(trainTrainedSkill.actor.freeSkillRanks.specialization.spent).toBe(0);
            expect(trainTrainedSkill.actor.freeSkillRanks.career.spent).toBe(0);
            expect(trainTrainedSkill.skill.rank.careerFree).toBe(0);
        });
    });
    describe('forget a skill', () => {
        test('should decrease the specialization free skill rank', () => {
            const actor = createActor();
            const skill = createSkill({trained: 1});
            const params = {};
            const options = {};

            const trainedSkill = new TrainedSkill(actor, skill, params, options);
            const forgetTrainedSkill = trainedSkill.forget();

            expect(forgetTrainedSkill.skill.rank.trained).toBe(0);
            expect(forgetTrainedSkill.skill.rank.specializationFree).toBe(0);
            expect(forgetTrainedSkill.actor.freeSkillRanks.specialization.spent).toBe(0);
            expect(forgetTrainedSkill.actor.freeSkillRanks.career.spent).toBe(0);
            expect(forgetTrainedSkill.skill.rank.careerFree).toBe(0);
        });
    });
    describe('evaluate a skill', () => {
        describe('should return an error skill if', () => {
            describe('you forget a skill', () => {
                test('and trained skill rank is less than 0', () => {
                    const actor = createActor();
                    const skill = createSkill({trained: -1});
                    const params = {};
                    const options = {};

                    const trainedSkill = new TrainedSkill(actor, skill, params, options);
                    const errorSkill = trainedSkill.evaluate();

                    expect(errorSkill).toBeInstanceOf(ErrorSkill);
                    expect(errorSkill.options.message).toBe("you can't forget this rank because it was not trained but free!");
                    expect(errorSkill.evaluated).toBe(false);
                });
            });
        });
        describe('should return a trained skill if', () => {
            test('trained skill rank is 1 and only 1', () => {
                const actor = createActor();
                const skill = createSkill({careerFree: 1, specializationFree: 1, trained: 1})
                const params = {};
                const options = {};
                const trainedFreeSkill = new TrainedSkill(actor, skill, params, options);
                const evaluatedSkill = trainedFreeSkill.evaluate();
                expect(evaluatedSkill).toBeInstanceOf(TrainedSkill);
                expect(evaluatedSkill.skill.rank.trained).toBe(1);
                expect(evaluatedSkill.skill.rank.value).toBe(3);
                expect(evaluatedSkill.evaluated).toBe(true);
            });
        });

    });
});