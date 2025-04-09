// trained-skill.test.mjs
import '../../setupTests.js';
import {describe, expect, test} from 'vitest'
import {createSkillData} from "../../utils/skills/skill.mjs";
import TrainedSkill from "../../../module/lib/skills/trained-skill.mjs";
import CareerFreeSkill from "../../../module/lib/skills/career-free-skill.mjs";
import SpecializationFreeSkill from "../../../module/lib/skills/specialization-free-skill.mjs";
import ErrorSkill from "../../../module/lib/skills/error-skill.mjs";
import SkillCostCalculator from "../../../module/lib/skills/skill-cost-calculator.mjs";
import {createActor} from "../../utils/actors/actor.mjs";

describe('Skills Calculator', () => {
    describe('train a skill', () => {
        const action = 'train';
        const actor = createActor();
        const params = {
            action: action,
            isCreation: true,
            isCareer: true,
            isSpecialization: true
        };
        const options = {};
        describe('of type career free skill', () => {
            test('should return a cost of 0', () => {
                const data = createSkillData({
                    careerFree: 1,
                    value: 1
                });

                const skill = new CareerFreeSkill(actor, data, params, options);
                const skillCostCalculator = new SkillCostCalculator(skill);
                const cost = skillCostCalculator.calculateCost(action, data.rank.value);
                expect(cost).toBe(0);
            })
        });
        describe('of type specialization free skill', () => {
            test('should return a cost of 0', () => {
                const data = createSkillData({
                    specializationFree: 1,
                    value: 1
                });

                const skill = new SpecializationFreeSkill(actor, data, params, options);
                const skillCostCalculator = new SkillCostCalculator(skill);
                const cost = skillCostCalculator.calculateCost(action, data.rank.value);
                expect(cost).toBe(0);

            });
        });
        describe('of type error skill', () => {
            test('should return a cost of 0', () => {
                const data = createSkillData({
                    base: 1,
                    value: 1
                });

                const skill = new ErrorSkill(actor, data, params, options);
                const skillCostCalculator = new SkillCostCalculator(skill);
                const cost = skillCostCalculator.calculateCost(action, data.rank.value);
                expect(cost).toBe(0);

            });
        });
        describe('of type trained skill', () => {
            describe('skill is specialized (career or specialization', () => {
                test('should return 5 if new rank is 1', () => {
                    const data = createSkillData({
                        trained: 1,
                        value: 1
                    });
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: false,
                    };
                    const skill = new TrainedSkill(actor, data, params, options);
                    const skillCostCalculator = new SkillCostCalculator(skill);
                    const cost = skillCostCalculator.calculateCost(action, data.rank.value);
                    expect(cost).toBe(5);
                });
                test('should return 10 if new rank is 2', () => {
                    const data = createSkillData({
                        career: 1,
                        trained: 1,
                        value: 2
                    });
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: false,
                        isSpecialization: true,
                    };
                    const skill = new TrainedSkill(actor, data, params, options);
                    const skillCostCalculator = new SkillCostCalculator(skill);
                    const cost = skillCostCalculator.calculateCost(action, data.rank.value);
                    expect(cost).toBe(10);
                });
            });
            describe('skill is not specialized (neither career nor specialization)', () => {
                test('should return 10 if new rank is 1', () => {
                    const data = createSkillData({
                        trained: 1,
                        value: 1
                    });
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: false,
                        isSpecialization: false,
                    };
                    const skill = new TrainedSkill(actor, data, params, options);
                    const skillCostCalculator = new SkillCostCalculator(skill);
                    const cost = skillCostCalculator.calculateCost(action, data.rank.value);
                    expect(cost).toBe(10);
                });
                test('should return 15 if new rank is 2', () => {
                    const data = createSkillData({
                        career: 1,
                        trained: 1,
                        value: 2
                    });
                    const params = {
                        action: action,
                        isCreation: false,
                        isCareer: false,
                        isSpecialization: false,
                    };
                    const skill = new TrainedSkill(actor, data, params, options);
                    const skillCostCalculator = new SkillCostCalculator(skill);
                    const cost = skillCostCalculator.calculateCost(action, data.rank.value);
                    expect(cost).toBe(15);
                });
            });
        });
    });
    describe('forget a skill', () => {
        const action = 'forget';
        const actor = createActor();
        const params = {
            action: action,
            isCreation: true,
            isCareer: true,
            isSpecialization: true
        };
        const options = {};
        describe('of type career free skill', () => {
            test('should return a cost of 0', () => {
                const data = createSkillData({
                    careerFree: 1,
                    value: 1
                });

                const skill = new CareerFreeSkill(actor, data, params, options);
                const skillCostCalculator = new SkillCostCalculator(skill);
                const cost = skillCostCalculator.calculateCost(action, data.rank.value);
                expect(cost).toBe(0);
            })
        });
        describe('of type specialization free skill', () => {
            test('should return a cost of 0', () => {
                const data = createSkillData({
                    specializationFree: 1,
                    value: 1
                });

                const skill = new SpecializationFreeSkill(actor, data, params, options);
                const skillCostCalculator = new SkillCostCalculator(skill);
                const cost = skillCostCalculator.calculateCost(action, data.rank.value);
                expect(cost).toBe(0);

            });
        });
        describe('of type error skill', () => {
            test('should return a cost of 0', () => {
                const data = createSkillData({
                    base: 1,
                    value: 1
                });

                const skill = new ErrorSkill(actor, data, params, options);
                const skillCostCalculator = new SkillCostCalculator(skill);
                const cost = skillCostCalculator.calculateCost(action, data.rank.value);
                expect(cost).toBe(0);

            });
        });
        describe('of type trained skill', () => {
            describe('skill is specialized (career or specialization', () => {
                test('should return 5 if new rank is 0 with no free rank', () => {
                    const data = createSkillData();
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: true,
                        isSpecialization: false,
                    };
                    const skill = new TrainedSkill(actor, data, params, options);
                    const skillCostCalculator = new SkillCostCalculator(skill);
                    const cost = skillCostCalculator.calculateCost(action, data.rank.value);
                    expect(cost).toBe(5);
                });
                test('should return 10 if new rank is 1', () => {
                    const data = createSkillData({
                        career: 0,
                        trained: 1,
                        value: 1
                    });
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: false,
                        isSpecialization: true,
                    };
                    const skill = new TrainedSkill(actor, data, params, options);
                    const skillCostCalculator = new SkillCostCalculator(skill);
                    const cost = skillCostCalculator.calculateCost(action, data.rank.value);
                    expect(cost).toBe(10);
                });
            });
            describe('skill is not specialized (neither career nor specialization)', () => {
                test('should return 10 if new rank is 0', () => {
                    const data = createSkillData({
                        trained: 0,
                        value: 0,
                    });
                    const params = {
                        action: action,
                        isCreation: true,
                        isCareer: false,
                        isSpecialization: false,
                    };
                    const skill = new TrainedSkill(actor, data, params, options);
                    const skillCostCalculator = new SkillCostCalculator(skill);
                    const cost = skillCostCalculator.calculateCost(action, data.rank.value);
                    expect(cost).toBe(10);
                });
                test('should return 15 if new rank is 1', () => {
                    const data = createSkillData({
                        career: 0,
                        trained: 1,
                        value: 1
                    });
                    const params = {
                        action: action,
                        isCreation: false,
                        isCareer: false,
                        isSpecialization: false,
                    };
                    const skill = new TrainedSkill(actor, data, params, options);
                    const skillCostCalculator = new SkillCostCalculator(skill);
                    const cost = skillCostCalculator.calculateCost(action, data.rank.value);
                    expect(cost).toBe(15);
                });
                test('should return 20 if new rank is 2 with a career free', () => {
                    const data = createSkillData({
                        career: 1,
                        trained: 1,
                        value: 2
                    });
                    const params = {
                        action: action,
                        isCreation: false,
                        isCareer: false,
                        isSpecialization: false,
                    };
                    const skill = new TrainedSkill(actor, data, params, options);
                    const skillCostCalculator = new SkillCostCalculator(skill);
                    const cost = skillCostCalculator.calculateCost(action, data.rank.value);
                    expect(cost).toBe(20);
                });
            });
        });
    })
})