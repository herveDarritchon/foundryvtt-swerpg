// skill-cost-calculator-additional.test.mjs - Additional tests for SkillCostCalculator
import '../../setupTests.js'
import { describe, expect, test } from 'vitest'

import { createActor } from '../../utils/actors/actor.mjs'
import { createSkillData } from '../../utils/skills/skill.mjs'
import TrainedSkill from '../../../module/lib/skills/trained-skill.mjs'
import CareerFreeSkill from '../../../module/lib/skills/career-free-skill.mjs'
import SpecializationFreeSkill from '../../../module/lib/skills/specialization-free-skill.mjs'
import ErrorSkill from '../../../module/lib/skills/error-skill.mjs'
import SkillCostCalculator from '../../../module/lib/skills/skill-cost-calculator.mjs'

describe('SkillCostCalculator - Additional Coverage', () => {
  describe('calculateCost() edge cases', () => {
    test('should return 0 for CareerFreeSkill regardless of action', () => {
      const actor = createActor()
      const data = createSkillData({ careerFree: 1, value: 1 })
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: true,
        isSpecialization: false,
      }
      const options = {}

      const skill = new CareerFreeSkill(actor, data, params, options)
      const calculator = new SkillCostCalculator(skill)

      expect(calculator.calculateCost('train', 1)).toBe(0)
      expect(calculator.calculateCost('forget', 1)).toBe(0)
      expect(calculator.calculateCost('invalid', 1)).toBe(0)
    })

    test('should return 0 for SpecializationFreeSkill regardless of action', () => {
      const actor = createActor()
      const data = createSkillData({ specializationFree: 1, value: 1 })
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: false,
        isSpecialization: true,
      }
      const options = {}

      const skill = new SpecializationFreeSkill(actor, data, params, options)
      const calculator = new SkillCostCalculator(skill)

      expect(calculator.calculateCost('train', 1)).toBe(0)
      expect(calculator.calculateCost('forget', 1)).toBe(0)
    })

    test('should return 0 for ErrorSkill regardless of action', () => {
      const actor = createActor()
      const data = createSkillData({ base: 1, value: 1 })
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: false,
        isSpecialization: false,
      }
      const options = {}

      const skill = new ErrorSkill(actor, data, params, options)
      const calculator = new SkillCostCalculator(skill)

      expect(calculator.calculateCost('train', 1)).toBe(0)
      expect(calculator.calculateCost('forget', 1)).toBe(0)
    })

    test('should calculate correct cost for TrainedSkill with specialized=true (isCareer)', () => {
      const actor = createActor()
      const data = createSkillData()
      const params = {
        action: 'train',
        isCreation: false,
        isCareer: true,
        isSpecialization: false,
      }
      const options = {}

      const skill = new TrainedSkill(actor, data, params, options)
      const calculator = new SkillCostCalculator(skill)

      // Rank 0 -> 1: cost = 1 * 5 = 5 (specialized)
      expect(calculator.calculateCost('train', 1)).toBe(5)

      // Rank 1 -> 2: cost = 2 * 5 = 10 (specialized)
      expect(calculator.calculateCost('train', 2)).toBe(10)

      // Rank 4 -> 5: cost = 5 * 5 = 25 (specialized)
      expect(calculator.calculateCost('train', 5)).toBe(25)
    })

    test('should calculate correct cost for TrainedSkill with specialized=true (isSpecialization)', () => {
      const actor = createActor()
      const data = createSkillData()
      const params = {
        action: 'train',
        isCreation: false,
        isCareer: false,
        isSpecialization: true,
      }
      const options = {}

      const skill = new TrainedSkill(actor, data, params, options)
      const calculator = new SkillCostCalculator(skill)

      // Rank 0 -> 1: cost = 1 * 5 = 5 (specialized)
      expect(calculator.calculateCost('train', 1)).toBe(5)
    })

    test('should calculate correct cost for TrainedSkill with specialized=false', () => {
      const actor = createActor()
      const data = createSkillData()
      const params = {
        action: 'train',
        isCreation: false,
        isCareer: false,
        isSpecialization: false,
      }
      const options = {}

      const skill = new TrainedSkill(actor, data, params, options)
      const calculator = new SkillCostCalculator(skill)

      // Rank 0 -> 1: cost = 1 * 5 + 5 = 10 (not specialized)
      expect(calculator.calculateCost('train', 1)).toBe(10)

      // Rank 1 -> 2: cost = 2 * 5 + 5 = 15 (not specialized)
      expect(calculator.calculateCost('train', 2)).toBe(15)
    })

    test('should calculate forget cost correctly (specialized)', () => {
      const actor = createActor()
      const data = createSkillData()
      const params = {
        action: 'forget',
        isCreation: false,
        isCareer: true, // specialized
        isSpecialization: false,
      }
      const options = {}

      const skill = new TrainedSkill(actor, data, params, options)
      const calculator = new SkillCostCalculator(skill)

      // Forget from rank 1 to 0: cost = calculateForgetCost(0) = calculateTrainCost(1) = 1 * 5 = 5
      expect(calculator.calculateCost('forget', 0)).toBe(5)

      // Forget from rank 2 to 1: cost = calculateForgetCost(1) = calculateTrainCost(2) = 2 * 5 = 10
      expect(calculator.calculateCost('forget', 1)).toBe(10)
    })

    test('should calculate forget cost correctly (not specialized)', () => {
      const actor = createActor()
      const data = createSkillData()
      const params = {
        action: 'forget',
        isCreation: false,
        isCareer: false, // not specialized
        isSpecialization: false,
      }
      const options = {}

      const skill = new TrainedSkill(actor, data, params, options)
      const calculator = new SkillCostCalculator(skill)

      // Forget from rank 1 to 0: cost = calculateForgetCost(0) = calculateTrainCost(1) = 1 * 5 + 5 = 10
      expect(calculator.calculateCost('forget', 0)).toBe(10)
    })

    test('should return 0 for unknown action', () => {
      const actor = createActor()
      const data = createSkillData()
      const params = {
        action: 'invalid',
        isCreation: false,
        isCareer: true,
        isSpecialization: false,
      }
      const options = {}

      const skill = new TrainedSkill(actor, data, params, options)
      const calculator = new SkillCostCalculator(skill)

      expect(calculator.calculateCost('invalid', 1)).toBe(0)
    })
  })

  describe('isSpecialized property', () => {
    test('should be true when isCareer is true', () => {
      const actor = createActor()
      const data = createSkillData()
      const params = {
        action: 'train',
        isCreation: false,
        isCareer: true,
        isSpecialization: false,
      }
      const options = {}

      const skill = new TrainedSkill(actor, data, params, options)
      const calculator = new SkillCostCalculator(skill)

      expect(calculator.isSpecialized).toBe(true)
    })

    test('should be true when isSpecialization is true', () => {
      const actor = createActor()
      const data = createSkillData()
      const params = {
        action: 'train',
        isCreation: false,
        isCareer: false,
        isSpecialization: true,
      }
      const options = {}

      const skill = new TrainedSkill(actor, data, params, options)
      const calculator = new SkillCostCalculator(skill)

      expect(calculator.isSpecialized).toBe(true)
    })

    test('should be false when both isCareer and isSpecialization are false', () => {
      const actor = createActor()
      const data = createSkillData()
      const params = {
        action: 'train',
        isCreation: false,
        isCareer: false,
        isSpecialization: false,
      }
      const options = {}

      const skill = new TrainedSkill(actor, data, params, options)
      const calculator = new SkillCostCalculator(skill)

      expect(calculator.isSpecialized).toBe(false)
    })
  })
})
