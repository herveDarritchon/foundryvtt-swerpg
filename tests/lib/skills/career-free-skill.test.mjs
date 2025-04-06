// career-free-skill.test.mjs
import '../../setupTests.js';
import {describe, expect, test} from 'vitest'
import {createActor} from "../../utils/actors/actor.mjs";
import {createSkill} from "../../utils/skills/skill.mjs";
import CareerFreeSkill from "../../../module/lib/skills/career-free-skill.mjs";

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

});