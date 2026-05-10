// specialization-free-skill-additional.test.mjs
import '../../setupTests.js'
import { describe, expect, test, vi } from 'vitest'

import { createActor } from '../../utils/actors/actor.mjs'
import { createSkillData, TEST_SKILL_ID } from '../../utils/skills/skill.mjs'
import SpecializationFreeSkill from '../../../module/lib/skills/specialization-free-skill.mjs'
import ErrorSkill from '../../../module/lib/skills/error-skill.mjs'

describe('SpecializationFreeSkill - Additional Coverage', () => {
  describe('process validation errors', () => {
    test('should return ErrorSkill when forgetting with no specialization free rank', async () => {
      const actor = createActor()

      const data = createSkillData({
        specializationFree: 0,
        value: 0,
      })

      const specializationFreeSkill = new SpecializationFreeSkill(
        actor,
        data,
        {
          action: 'forget',
          isCreation: true,
          isCareer: false,
          isSpecialization: true,
        },
        {},
      )

      const result = await specializationFreeSkill.process()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe("you can't forget this specialization free rank because this skill has no specialization free rank!")
      expect(result.evaluated).toBe(false)
    })

    test('should return ErrorSkill when training would exceed one specialization free rank in the same skill', async () => {
      const actor = createActor()

      const data = createSkillData({
        specializationFree: 1,
        value: 1,
      })

      const specializationFreeSkill = new SpecializationFreeSkill(
        actor,
        data,
        {
          action: 'train',
          isCreation: true,
          isCareer: false,
          isSpecialization: true,
        },
        {},
      )

      const result = await specializationFreeSkill.process()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe("you can't use more than 1 specialization free skill rank into the same skill!")
      expect(result.evaluated).toBe(false)
    })

    test('should return ErrorSkill when no specialization free rank is available', async () => {
      const actor = createActor({
        specializationSpent: 2,
      })

      const data = createSkillData({
        specializationFree: 0,
        value: 0,
      })

      const specializationFreeSkill = new SpecializationFreeSkill(
        actor,
        data,
        {
          action: 'train',
          isCreation: true,
          isCareer: false,
          isSpecialization: true,
        },
        {},
      )

      const result = await specializationFreeSkill.process()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe('you cannot use more specialization free skill ranks. You have used them all!')
      expect(result.evaluated).toBe(false)
    })

    test('should return ErrorSkill when spent specialization free ranks would become negative', async () => {
      const actor = createActor({
        specializationSpent: 0,
      })

      const data = createSkillData({
        specializationFree: 1,
        value: 1,
      })

      const specializationFreeSkill = new SpecializationFreeSkill(
        actor,
        data,
        {
          action: 'forget',
          isCreation: true,
          isCareer: false,
          isSpecialization: true,
        },
        {},
      )

      const result = await specializationFreeSkill.process()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe("specialization free skill ranks spent can't be negative!")
      expect(result.evaluated).toBe(false)
    })
  })

  describe('process success cases', () => {
    test('should prepare updateData when training a specialization free rank', async () => {
      const actor = createActor()

      const data = createSkillData({
        specializationFree: 0,
        value: 0,
      })

      const specializationFreeSkill = new SpecializationFreeSkill(
        actor,
        data,
        {
          action: 'train',
          isCreation: true,
          isCareer: false,
          isSpecialization: true,
        },
        {},
      )

      const result = await specializationFreeSkill.process()

      expect(result).toBeInstanceOf(SpecializationFreeSkill)
      expect(result.evaluated).toBe(true)
      expect(result.data.rank.specializationFree).toBe(1)
      expect(result.data.rank.value).toBe(1)

      expect(result.updateData).toEqual({
        'system.progression.freeSkillRanks.specialization.spent': 1,
        [`system.skills.${TEST_SKILL_ID}.rank`]: {
          base: 0,
          careerFree: 0,
          specializationFree: 1,
          trained: 0,
          value: 1,
        },
      })
    })

    test('should prepare updateData when forgetting a specialization free rank', async () => {
      const actor = createActor({
        specializationSpent: 1,
      })

      const data = createSkillData({
        specializationFree: 1,
        value: 1,
      })

      const specializationFreeSkill = new SpecializationFreeSkill(
        actor,
        data,
        {
          action: 'forget',
          isCreation: true,
          isCareer: false,
          isSpecialization: true,
        },
        {},
      )

      const result = await specializationFreeSkill.process()

      expect(result).toBeInstanceOf(SpecializationFreeSkill)
      expect(result.evaluated).toBe(true)
      expect(result.data.rank.specializationFree).toBe(0)
      expect(result.data.rank.value).toBe(0)

      expect(result.updateData).toEqual({
        'system.progression.freeSkillRanks.specialization.spent': 0,
        [`system.skills.${TEST_SKILL_ID}.rank`]: {
          base: 0,
          careerFree: 0,
          specializationFree: 0,
          trained: 0,
          value: 0,
        },
      })
    })

    test('should not persist anything during process', async () => {
      const actor = createActor()

      actor.update = vi.fn().mockResolvedValue({})
      actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)

      const data = createSkillData({
        specializationFree: 0,
        value: 0,
      })

      const specializationFreeSkill = new SpecializationFreeSkill(
        actor,
        data,
        {
          action: 'train',
          isCreation: true,
          isCareer: false,
          isSpecialization: true,
        },
        {},
      )

      const result = await specializationFreeSkill.process()

      expect(result).toBeInstanceOf(SpecializationFreeSkill)
      expect(actor.update).not.toHaveBeenCalled()
      expect(actor.updateFreeSkillRanks).not.toHaveBeenCalled()
    })
  })

  describe('getCost', () => {
    test('should always return 0', () => {
      const actor = createActor()
      const data = createSkillData()

      const specializationFreeSkill = new SpecializationFreeSkill(
        actor,
        data,
        {
          action: 'train',
          isCreation: true,
          isCareer: false,
          isSpecialization: true,
        },
        {},
      )

      expect(specializationFreeSkill.getCost()).toBe(0)
    })
  })
})
