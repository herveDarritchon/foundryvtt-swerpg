// specialization-free-skill.test.mjs
import '../../setupTests.js';
import {describe, expect, test, vi} from 'vitest'
import {createActor} from "../../utils/actors/actor.mjs";
import {createSkill} from "../../utils/skills/skill.mjs";
import SpecializationFreeSkill from "../../../module/lib/skills/specialization-free-skill.mjs";
import ErrorSkill from "../../../module/lib/skills/error-skill.mjs";

describe('Specialization Free Skill', () => {
    describe('train a skill', () => {
        test('should increase the specialization free skill rank', () => {
            const actor = createActor();
            const skill = createSkill();
            const params = {};
            const options = {};

            const specializationFreeSkill = new SpecializationFreeSkill(actor, skill, params, options);
            const trainedSkill = specializationFreeSkill.train();

            expect(trainedSkill.skill.rank.specializationFree).toBe(1);
            expect(trainedSkill.actor.freeSkillRanks.specialization.spent).toBe(1);
            expect(trainedSkill.actor.freeSkillRanks.career.spent).toBe(0);
            expect(trainedSkill.skill.rank.careerFree).toBe(0);
        });
    });
    describe('forget a skill', () => {
        test('should decrease the specialization free skill rank', () => {
            const actor = createActor({specializationSpent: 1});
            const skill = createSkill({specializationFree: 1});
            const params = {};
            const options = {};

            const specializationFreeSkill = new SpecializationFreeSkill(actor, skill, params, options);
            const trainedSkill = specializationFreeSkill.forget();

            expect(trainedSkill.skill.rank.specializationFree).toBe(0);
            expect(trainedSkill.actor.freeSkillRanks.specialization.spent).toBe(0);
            expect(trainedSkill.actor.freeSkillRanks.career.spent).toBe(0);
            expect(trainedSkill.skill.rank.careerFree).toBe(0);
        });
    });
    describe('evaluate a skill', () => {
        describe('should return an error skill if', () => {
            describe('you train a skill', () => {
                test('and specialization free skill rank is greater than 1', () => {
                    const actor = createActor();
                    const skill = createSkill({specializationFree: 2});
                    const params = {};
                    const options = {};

                    const specializationFreeSkill = new SpecializationFreeSkill(actor, skill, params, options);
                    const errorSkill = specializationFreeSkill.evaluate();

                    expect(errorSkill).toBeInstanceOf(ErrorSkill);
                    expect(errorSkill.options.message).toBe("you can't use more than 1 free skill rank into the same skill!");
                    expect(errorSkill.evaluated).toBe(false);
                });
                test('after train free skill rank available is less than 0', () => {
                    const actor = createActor({specializationSpent: 5});
                    const skill = createSkill({specializationFree: 1});
                    const params = {};
                    const options = {};

                    const specializationFreeSkill = new SpecializationFreeSkill(actor, skill, params, options);
                    const errorSkill = specializationFreeSkill.evaluate();

                    expect(errorSkill).toBeInstanceOf(ErrorSkill);
                    expect(errorSkill.options.message).toBe("you can't use free skill rank anymore. You have used all!");
                    expect(errorSkill.evaluated).toBe(false);
                });
            });
            describe('you forget a skill', () => {
                test('and specialization free skill rank is less than 0', () => {
                    const actor = createActor();
                    const skill = createSkill({specializationFree: -1});
                    const params = {};
                    const options = {};

                    const specializationFreeSkill = new SpecializationFreeSkill(actor, skill, params, options);
                    const errorSkill = specializationFreeSkill.evaluate();

                    expect(errorSkill).toBeInstanceOf(ErrorSkill);
                    expect(errorSkill.options.message).toBe("you can't forget this rank because it comes from species free bonus!");
                    expect(errorSkill.evaluated).toBe(false);
                });
                test('and specialization free skill rank is greater than specialization free skill rank gained', () => {
                    const actor = createActor({specializationSpent: -1});
                    const skill = createSkill({specializationFree: 0});
                    const params = {};
                    const options = {};

                    const specializationFreeSkill = new SpecializationFreeSkill(actor, skill, params, options);
                    const errorSkill = specializationFreeSkill.evaluate();

                    expect(errorSkill).toBeInstanceOf(ErrorSkill);
                    expect(errorSkill.options.message).toBe("you can't get more than 2 free skill ranks!");
                    expect(errorSkill.evaluated).toBe(false);
                });
            });
        });
        describe('should return a specialization free skill if', () => {
            test('specialization free skill rank is 1 and only 1', () => {
                const actor = createActor();
                const skill = createSkill({careerFree: 1, specializationFree: 1})
                const params = {};
                const options = {};
                const specializationFreeSkill = new SpecializationFreeSkill(actor, skill, params, options);
                const evaluatedSkill = specializationFreeSkill.evaluate();
                expect(evaluatedSkill).toBeInstanceOf(SpecializationFreeSkill);
                expect(evaluatedSkill.skill.rank.specializationFree).toBe(1);
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
            const skill = createSkill({careerFree: 1, specializationFree: 1});
            const params = {};
            const options = {};
            const specializationFreeSkill = new SpecializationFreeSkill(actor, skill, params, options);
            specializationFreeSkill.evaluate();
            const updatedSkill = await specializationFreeSkill.updateState();
            expect(updatedSkill).toBeInstanceOf(SpecializationFreeSkill);
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
                    "specializationFree": 1,
                    "trained": 0,
                    "value": 2,
                },
            });
        });
        describe('should return an Error Skill if any update fails', () => {
            test('should not update the state of the skill if the skill evaluated state is false', async () => {
                const actor = createActor();
                const updateMock = vi.fn()
                    .mockResolvedValue({});
                actor.update = updateMock;
                const skill = createSkill({careerFree: 1, specializationFree: 1});
                const params = {};
                const options = {};
                const specializationFreeSkill = new SpecializationFreeSkill(actor, skill, params, options);
                const result = await specializationFreeSkill.updateState();
                expect(updateMock).toHaveBeenCalledTimes(0);
                expect(result).toBeInstanceOf(ErrorSkill);
                expect(result.options.message).toContain('you must evaluate the skill before updating it!');
            });
            test('free skill ranks update fails', async () => {
                const actor = createActor();
                const updateMock = vi.fn()
                    .mockRejectedValueOnce(new Error('Erreur sur premier update'));
                actor.update = updateMock;
                const skill = createSkill({specializationFree: 1});
                const params = {};
                const options = {};
                const specializationFreeSkill = new SpecializationFreeSkill(actor, skill, params, options);
                specializationFreeSkill.evaluate();
                const result = await specializationFreeSkill.updateState();
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
                const skill = createSkill({specializationFree: 1});
                const params = {};
                const options = {};
                const specializationFreeSkill = new SpecializationFreeSkill(actor, skill, params, options);
                specializationFreeSkill.evaluate();
                const result = await specializationFreeSkill.updateState();
                expect(updateMock).toHaveBeenCalledTimes(2);
                expect(result).toBeInstanceOf(ErrorSkill);
                expect(result.options.message).toContain('Erreur sur deuxième update');
            });
        });
    });

});