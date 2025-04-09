// career-free-skill.test.mjs
import '../../setupTests.js';
import {describe, expect, test, vi} from 'vitest'
import {createActor} from "../../utils/actors/actor.mjs";
import {createSkill} from "../../utils/skills/skill.mjs";
import CareerFreeSkill from "../../../module/lib/skills/career-free-skill.mjs";
import ErrorSkill from "../../../module/lib/skills/error-skill.mjs";

describe('Career Free Skill', () => {
    describe('process a skill', () => {
        describe('should return an error skill if', () => {
            describe('you train a skill', () => {
                test('and career free skill rank is greater than 1', () => {
                    const actor = createActor();
                    const skill = createSkill({careerFree: 2});
                    const params = {};
                    const options = {};

                    const careerFreeSkill = new CareerFreeSkill(actor, skill, params, options);
                    const errorSkill = careerFreeSkill.process();

                    expect(errorSkill).toBeInstanceOf(ErrorSkill);
                    expect(errorSkill.options.message).toBe("you can't use more than 1 career free skill rank into the same skill!");
                    expect(errorSkill.evaluated).toBe(false);
                });
                test('after train free skill rank available is less than 0', () => {
                    const actor = createActor({careerSpent: 5});
                    const skill = createSkill({careerFree: 1});
                    const params = {};
                    const options = {};

                    const careerFreeSkill = new CareerFreeSkill(actor, skill, params, options);
                    const errorSkill = careerFreeSkill.process();

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
                    const errorSkill = careerFreeSkill.process();

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
                    const errorSkill = careerFreeSkill.process();

                    expect(errorSkill).toBeInstanceOf(ErrorSkill);
                    expect(errorSkill.options.message).toBe("you can't get more than 4 free skill ranks!");
                    expect(errorSkill.evaluated).toBe(false);
                });
            });
        });
        describe('should return a career free skill if', () => {
            describe('train a skill', () => {
                test('should increase the career free skill rank', () => {
                    const actor = createActor();
                    const skill = createSkill();
                    const params = {
                        action: "train",
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: true
                    };
                    const options = {};

                    const careerFreeSkill = new CareerFreeSkill(actor, skill, params, options);
                    const trainedSkill = careerFreeSkill.process();

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
                    const params = {
                        action: "forget",
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: true
                    };
                    const options = {};

                    const careerFreeSkill = new CareerFreeSkill(actor, skill, params, options);
                    const trainedSkill = careerFreeSkill.process();

                    expect(trainedSkill.skill.rank.careerFree).toBe(0);
                    expect(trainedSkill.actor.freeSkillRanks.career.spent).toBe(0);
                    expect(trainedSkill.actor.freeSkillRanks.specialization.spent).toBe(0);
                    expect(trainedSkill.skill.rank.specializationFree).toBe(0);
                });
            });
            test('career free skill rank is 1 and only 1', () => {
                const actor = createActor();
                const skill = createSkill({careerFree: 1})
                const params = {};
                const options = {};
                const careerFreeSkill = new CareerFreeSkill(actor, skill, params, options);
                const evaluatedSkill = careerFreeSkill.process();
                expect(evaluatedSkill).toBeInstanceOf(CareerFreeSkill);
                expect(evaluatedSkill.skill.rank.careerFree).toBe(1);
                expect(evaluatedSkill.skill.rank.value).toBe(1);
                expect(evaluatedSkill.evaluated).toBe(true);
            });
        });
    });
    describe('updateState a skill', () => {
        test('should update the state of the skill and return the skill', async () => {
            const actor = createActor();
            const updateMock = vi.fn().mockResolvedValue({});
            actor.update = updateMock;
            const skill = createSkill({careerFree: 1});
            const params = {};
            const options = {};
            const careerFreeSkill = new CareerFreeSkill(actor, skill, params, options);
            careerFreeSkill.process();
            const updatedSkill = await careerFreeSkill.updateState();
            expect(updatedSkill).toBeInstanceOf(CareerFreeSkill);
            expect(updateMock).toHaveBeenCalledTimes(2);
            expect(updateMock).toHaveBeenNthCalledWith(1, {
                'system.progression.freeSkillRanks': {
                    "career": {
                        "available": 4,
                        "gained": 4,
                        "id": "",
                        "name": "",
                        "spent": 0,
                    },
                    "specialization": {
                        "available": 2,
                        "gained": 2,
                        "id": "",
                        "name": "",
                        "spent": 0,
                    },
                },
            });
            expect(updateMock).toHaveBeenNthCalledWith(2, {
                'system.skills.skill-id.rank': {
                    "base": 0,
                    "careerFree": 1,
                    "specializationFree": 0,
                    "trained": 0,
                    "value": 1,
                },
            });
        });
        describe('should return an Error Skill if any update fails', () => {
            test('should not update the state of the skill if the skill evaluated state is false', async () => {
                const actor = createActor();
                const updateMock = vi.fn()
                    .mockResolvedValue({});
                actor.update = updateMock;
                const skill = createSkill({careerFree: 1});
                const params = {};
                const options = {};
                const careerFreeSkill = new CareerFreeSkill(actor, skill, params, options);
                const result = await careerFreeSkill.updateState();
                expect(updateMock).toHaveBeenCalledTimes(0);
                expect(result).toBeInstanceOf(ErrorSkill);
                expect(result.options.message).toContain('you must evaluate the skill before updating it!');
            });
            test('free skill ranks update fails', async () => {
                const actor = createActor();
                const updateMock = vi.fn()
                    .mockRejectedValueOnce(new Error('Erreur sur premier update'));
                actor.update = updateMock;
                const skill = createSkill({careerFree: 1});
                const params = {};
                const options = {};
                const careerFreeSkill = new CareerFreeSkill(actor, skill, params, options);
                careerFreeSkill.process();
                const result = await careerFreeSkill.updateState();
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
                const skill = createSkill({careerFree: 1});
                const params = {};
                const options = {};
                const careerFreeSkill = new CareerFreeSkill(actor, skill, params, options);
                careerFreeSkill.process();
                const result = await careerFreeSkill.updateState();
                expect(updateMock).toHaveBeenCalledTimes(2);
                expect(result).toBeInstanceOf(ErrorSkill);
                expect(result.options.message).toContain('Erreur sur deuxième update');
            });
        });
    });
});