// specialization-free-skill.test.mjs
import '../../setupTests.js';
import {describe, expect, test} from 'vitest'
import {createActor} from "../../utils/actors/actor.mjs";
import {createSkill} from "../../utils/skills/skill.mjs";
import SpecializationFreeSkill from "../../../module/lib/skills/specialization-free-skill.mjs";

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

});