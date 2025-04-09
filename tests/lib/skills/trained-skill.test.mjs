// trained-skill.test.mjs
import '../../setupTests.js';
import {describe, expect, test, vi} from 'vitest'
import {createActor} from "../../utils/actors/actor.mjs";
import {createSkill} from "../../utils/skills/skill.mjs";
import TrainedSkill from "../../../module/lib/skills/trained-skill.mjs";
import ErrorSkill from "../../../module/lib/skills/error-skill.mjs";

describe('Trained Skill', () => {
    describe('train a skill', () => {
        test('should increase the trained skill rank', () => {
            const actor = createActor();
            const skill = createSkill();
            const params = {
                action: "train",
                isCreation: true,
                isCareer: false,
                isSpecialization: true
            };
            const options = {};

            const trainedSkill = new TrainedSkill(actor, skill, params, options);
            const trainTrainedSkill = trainedSkill.process();

            expect(trainTrainedSkill.skill.rank.trained).toBe(1);
            expect(trainTrainedSkill.skill.rank.specializationFree).toBe(0);
            expect(trainTrainedSkill.actor.freeSkillRanks.specialization.spent).toBe(0);
            expect(trainTrainedSkill.actor.freeSkillRanks.career.spent).toBe(0);
            expect(trainTrainedSkill.skill.rank.careerFree).toBe(0);
            expect(trainedSkill.actor.experiencePoints.spent).toBe(5);
        });
    });
    describe('forget a skill', () => {
        test('should decrease the trained skill rank', () => {
            const actor = createActor();
            actor.experiencePoints.spent = 20;
            actor.experiencePoints.gained = 100;
            actor.experiencePoints.available = 80;
            const skill = createSkill({trained: 1});
            const params = {
                action: "forget",
                isCreation: true,
                isCareer: false,
                isSpecialization: false
            };
            const options = {};

            const trainedSkill = new TrainedSkill(actor, skill, params, options);
            const forgetTrainedSkill = trainedSkill.process();

            expect(forgetTrainedSkill.skill.rank.trained).toBe(0);
            expect(forgetTrainedSkill.skill.rank.specializationFree).toBe(0);
            expect(forgetTrainedSkill.actor.freeSkillRanks.specialization.spent).toBe(0);
            expect(forgetTrainedSkill.actor.freeSkillRanks.career.spent).toBe(0);
            expect(forgetTrainedSkill.skill.rank.careerFree).toBe(0);
            expect(trainedSkill.actor.experiencePoints.spent).toBe(10);
        });
    });
    describe('evaluate a skill', () => {
        describe('should return an error skill if', () => {
            test('trained skill rank is less than 0', () => {
                const actor = createActor();
                const skill = createSkill({trained: -1});
                const params = {
                    action: "forget",
                    isCreation: true,
                    isCareer: false,
                    isSpecialization: false};
                const options = {};

                const trainedSkill = new TrainedSkill(actor, skill, params, options);
                const errorSkill = trainedSkill.process();

                expect(errorSkill).toBeInstanceOf(ErrorSkill);
                expect(errorSkill.options.message).toBe("you can't forget this rank because it was not trained but free!");
                expect(errorSkill.evaluated).toBe(false);
            });
            test('trained skill rank is greater than 2 and isCreation is true', () => {
                const actor = createActor();
                const skill = createSkill({trained: 3});
                const params = {
                    action: "train",
                    isCreation: true,
                    isCareer: false,
                    isSpecialization: false
                };
                const options = {};

                const trainedSkill = new TrainedSkill(actor, skill, params, options);
                const errorSkill = trainedSkill.process();

                expect(errorSkill).toBeInstanceOf(ErrorSkill);
                expect(errorSkill.options.message).toBe("you can't have more than 2 rank at creation!");
                expect(errorSkill.evaluated).toBe(false);
            });
            test('trained skill rank is greater than 5 and isCreation is false', () => {
                const actor = createActor();
                const skill = createSkill({trained: 6});
                const params = {
                    action: "train",
                    isCreation: false,
                    isCareer: false,
                    isSpecialization: false
                };
                const options = {};

                const trainedSkill = new TrainedSkill(actor, skill, params, options);
                const errorSkill = trainedSkill.process();

                expect(errorSkill).toBeInstanceOf(ErrorSkill);
                expect(errorSkill.options.message).toBe("you can't have more than 5 rank!");
                expect(errorSkill.evaluated).toBe(false);
            });
        });
        describe('should return a trained skill if', () => {
            test('trained skill rank is 1 and only 1', () => {
                const actor = createActor();
                actor.experiencePoints.spent = 10;
                actor.experiencePoints.gained = 100;
                actor.experiencePoints.available = 90;
                const skill = createSkill({careerFree: 1, specializationFree: 0, trained: 0, value: 1})
                const params = {
                    action: "train",
                    isCreation: true,
                    isCareer: true,
                    isSpecialization: true
                };
                const options = {};
                const trainedFreeSkill = new TrainedSkill(actor, skill, params, options);
                const evaluatedSkill = trainedFreeSkill.process();
                expect(evaluatedSkill).toBeInstanceOf(TrainedSkill);
                expect(evaluatedSkill.skill.rank.trained).toBe(1);
                expect(evaluatedSkill.skill.rank.value).toBe(2);
                expect(evaluatedSkill.evaluated).toBe(true);
            });
        });
    });
    describe('updateState a skill', () => {
        test('should update the state of the skill and return the skill', async () => {
            const actor = createActor();
            const updateMock = vi.fn().mockResolvedValue({});
            actor.update = updateMock;
            const skill = createSkill({careerFree: 1, specializationFree: 1, trained: 1});
            const params = {};
            const options = {};
            const trainedFreeSkill = new TrainedSkill(actor, skill, params, options);
            trainedFreeSkill.process();
            const updatedSkill = await trainedFreeSkill.updateState();
            expect(updatedSkill).toBeInstanceOf(TrainedSkill);
            expect(updateMock).toHaveBeenCalledTimes(2);
            expect(updateMock).toHaveBeenNthCalledWith(2, {
                'system.skills.skill-id.rank': {
                    "base": 0,
                    "careerFree": 1,
                    "specializationFree": 1,
                    "trained": 1,
                    "value": 3,
                },
            });
            expect(updateMock).toHaveBeenNthCalledWith(1, {
                'system.progression.experience.spent': 0
            });
        });
        describe('should return an Error Skill if any update fails', () => {
            test('should not update the state of the skill if the skill evaluated state is false', async () => {
                const actor = createActor();
                const updateMock = vi.fn()
                    .mockResolvedValue({});
                actor.update = updateMock;
                const skill = createSkill({careerFree: 1, specializationFree: 1, trained: 1});
                const params = {};
                const options = {};
                const trainedFreeSkill = new TrainedSkill(actor, skill, params, options);
                const result = await trainedFreeSkill.updateState();
                expect(updateMock).toHaveBeenCalledTimes(0);
                expect(result).toBeInstanceOf(ErrorSkill);
                expect(result.options.message).toContain('you must evaluate the skill before updating it!');
            });
            test('free skill ranks update fails', async () => {
                const actor = createActor();
                const updateMock = vi.fn()
                    .mockRejectedValueOnce(new Error('Erreur sur premier update'));
                actor.update = updateMock;
                const skill = createSkill({trainedFree: 1, specializationFree: 1, trained: 1});
                const params = {};
                const options = {};
                const trainedFreeSkill = new TrainedSkill(actor, skill, params, options);
                trainedFreeSkill.process();
                const result = await trainedFreeSkill.updateState();
                expect(updateMock).toHaveBeenCalledTimes(1);
                expect(result).toBeInstanceOf(ErrorSkill);
                expect(result.options.message).toContain('Erreur sur premier update');
            });
            test('skill rank update fails', async () => {
                const actor = createActor();
                const updateMock = vi.fn()
                    .mockResolvedValueOnce({})
                    .mockRejectedValueOnce(new Error('Erreur sur deuxième update'));
                actor.update = updateMock;
                const skill = createSkill({trainedFree: 1, specializationFree: 1, trained: 1});
                const params = {};
                const options = {};
                const trainedFreeSkill = new TrainedSkill(actor, skill, params, options);
                trainedFreeSkill.process();
                const result = await trainedFreeSkill.updateState();
                expect(updateMock).toHaveBeenCalledTimes(2);
                expect(result).toBeInstanceOf(ErrorSkill);
                expect(result.options.message).toContain('Erreur sur deuxième update');
            });
        });
    });
});