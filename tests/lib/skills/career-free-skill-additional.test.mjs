// career-free-skill-additional.test.mjs
import '../../setupTests.js'
import { describe, expect, test, vi } from 'vitest'

import { createActor } from '../../utils/actors/actor.mjs'
import { createSkillData, TEST_SKILL_ID } from '../../utils/skills/skill.mjs'
import CareerFreeSkill from '../../../module/lib/skills/career-free-skill.mjs'
import ErrorSkill from '../../../module/lib/skills/error-skill.mjs'

describe('CareerFreeSkill - Additional Coverage', () => {
  describe('process validation errors', () => {
    test('should return ErrorSkill when forgetting with no career free rank', async () => {
      const actor = createActor()

      const data = createSkillData({
        careerFree: 0,
        value: 0,
      })

      const careerFreeSkill = new CareerFreeSkill(
        actor,
        data,
        {
          action: 'forget',
          isCreation: true,
          isCareer: true,
          isSpecialization: false,
        },
        {},
      )

      const result = await careerFreeSkill.process()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe("you can't forget this career free rank because this skill has no career free rank!")
      expect(result.evaluated).toBe(false)
    })

    test('should return ErrorSkill when training would exceed one career free rank in the same skill', async () => {
      const actor = createActor()

      const data = createSkillData({
        careerFree: 1,
        value: 1,
      })

      const careerFreeSkill = new CareerFreeSkill(
        actor,
        data,
        {
          action: 'train',
          isCreation: true,
          isCareer: true,
          isSpecialization: false,
        },
        {},
      )

      const result = await careerFreeSkill.process()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe("you can't use more than 1 career free skill rank into the same skill!")
      expect(result.evaluated).toBe(false)
    })

    test('should return ErrorSkill when no career free rank is available', async () => {
      const actor = createActor({
        careerSpent: 4,
      })

      const data = createSkillData({
        careerFree: 0,
        value: 0,
      })

      const careerFreeSkill = new CareerFreeSkill(
        actor,
        data,
        {
          action: 'train',
          isCreation: true,
          isCareer: true,
          isSpecialization: false,
        },
        {},
      )

      const result = await careerFreeSkill.process()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe('you cannot use more career free skill ranks. You have used them all!')
      expect(result.evaluated).toBe(false)
    })

    test('should return ErrorSkill when spent career free ranks would become negative', async () => {
      const actor = createActor({
        careerSpent: 0,
      })

      const data = createSkillData({
        careerFree: 1,
        value: 1,
      })

      const careerFreeSkill = new CareerFreeSkill(
        actor,
        data,
        {
          action: 'forget',
          isCreation: true,
          isCareer: true,
          isSpecialization: false,
        },
        {},
      )

      const result = await careerFreeSkill.process()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe("career free skill ranks spent can't be negative!")
      expect(result.evaluated).toBe(false)
    })
  })

  describe('process success cases', () => {
    test('should prepare updateData when training a career free rank', async () => {
      const actor = createActor()

      actor.update = vi.fn().mockResolvedValue({})
      actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)

      const data = createSkillData({
        careerFree: 0,
        value: 0,
      })

      const careerFreeSkill = new CareerFreeSkill(
        actor,
        data,
        {
          action: 'train',
          isCreation: true,
          isCareer: true,
          isSpecialization: false,
        },
        {},
      )

      const result = await careerFreeSkill.process()

      expect(result).toBeInstanceOf(CareerFreeSkill)
      expect(result.evaluated).toBe(true)
      expect(result.data.rank.careerFree).toBe(1)
      expect(result.data.rank.value).toBe(1)

      expect(actor.update).not.toHaveBeenCalled()
      expect(actor.updateFreeSkillRanks).not.toHaveBeenCalled()

      expect(result.updateData).toEqual({
        'system.progression.freeSkillRanks.career.spent': 1,
        [`system.skills.${TEST_SKILL_ID}.rank`]: {
          base: 0,
          careerFree: 1,
          specializationFree: 0,
          trained: 0,
          value: 1,
        },
      })
    })

    test('should prepare updateData when forgetting a career free rank', async () => {
      const actor = createActor({
        careerSpent: 1,
      })

      const data = createSkillData({
        careerFree: 1,
        value: 1,
      })

      const careerFreeSkill = new CareerFreeSkill(
        actor,
        data,
        {
          action: 'forget',
          isCreation: true,
          isCareer: true,
          isSpecialization: false,
        },
        {},
      )

      const result = await careerFreeSkill.process()

      expect(result).toBeInstanceOf(CareerFreeSkill)
      expect(result.evaluated).toBe(true)
      expect(result.data.rank.careerFree).toBe(0)
      expect(result.data.rank.value).toBe(0)

      expect(result.updateData).toEqual({
        'system.progression.freeSkillRanks.career.spent': 0,
        [`system.skills.${TEST_SKILL_ID}.rank`]: {
          base: 0,
          careerFree: 0,
          specializationFree: 0,
          trained: 0,
          value: 0,
        },
      })
    })
  })

  describe('getCost', () => {
    test('should always return 0', () => {
      const actor = createActor()
      const data = createSkillData()

      const careerFreeSkill = new CareerFreeSkill(
        actor,
        data,
        {
          action: 'train',
          isCreation: true,
          isCareer: true,
          isSpecialization: false,
        },
        {},
      )

      expect(careerFreeSkill.getCost()).toBe(0)
    })
  })
})
