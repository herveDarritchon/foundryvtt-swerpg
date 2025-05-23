// talent-cost-calculator.test.mjs
import '../../setupTests.js';
import {describe, expect, test} from 'vitest'
import {createTalentData} from "../../utils/talents/talent.mjs";
import TrainedTalent from "../../../module/lib/talents/trained-talent.mjs";
import ErrorTalent from "../../../module/lib/talents/error-talent.mjs";
import TalentCostCalculator from "../../../module/lib/talents/talent-cost-calculator.mjs";
import {createActor} from "../../utils/actors/actor.mjs";

describe('Talents Calculator', () => {
    describe('train a talent', () => {
        const action = 'train';
        const actor = createActor();
        const params = {
            action: action,
            isCreation: true,
        };
        const options = {};
        describe('of type trained talent', () => {
            test('should return a cost of 5 if row value is 1', () => {
                const data = createTalentData(
                    "1",
                    {
                        row: 1
                    }
                );

                const talent = new TrainedTalent(actor, data, params, options);
                const talentCostCalculator = new TalentCostCalculator(talent);
                const cost = talentCostCalculator.calculateCost(action, data.system.row);
                expect(cost).toBe(5);
            });
            test('should return a cost of 10 if row value is 2', () => {
                const data = createTalentData(
                    "1",
                    {
                        row: 2
                    }
                );

                const talent = new TrainedTalent(actor, data, params, options);
                const talentCostCalculator = new TalentCostCalculator(talent);
                const cost = talentCostCalculator.calculateCost(action, data.system.row);
                expect(cost).toBe(10);
            })
        });
        describe('of type error talent', () => {
            test('should return a cost of 0', () => {
                const data = createTalentData("1");

                const talent = new ErrorTalent(actor, data, params, options);
                const talentCostCalculator = new TalentCostCalculator(talent);
                const cost = talentCostCalculator.calculateCost(action, data.system.row);
                expect(cost).toBe(0);

            });
        });
    });
    describe('forget a talent', () => {
        const action = 'forget';
        const actor = createActor("1");
        const params = {
            action: action,
            isCreation: true,
        };
        const options = {};
        describe('of type trained talent', () => {
            test('should return a cost of 10 if current row is 2', () => {
                const data = createTalentData(
                    "1",
                    {
                        row: 2
                    });

                const talent = new TrainedTalent(actor, data, params, options);
                const talentCostCalculator = new TalentCostCalculator(talent);
                const cost = talentCostCalculator.calculateCost(action, data.system.row);
                expect(cost).toBe(10);
            })
        });
        ;
        describe('of type error talent', () => {
            test('should return a cost of 0', () => {
                const data = createTalentData("1", {
                    base: 1,
                    value: 1
                });

                const talent = new ErrorTalent(actor, data, params, options);
                const talentCostCalculator = new TalentCostCalculator(talent);
                const cost = talentCostCalculator.calculateCost(action, data.system.row);
                expect(cost).toBe(0);

            });
        });
    })
})