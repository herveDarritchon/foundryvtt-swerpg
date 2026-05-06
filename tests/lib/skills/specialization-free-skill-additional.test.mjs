// specialization-free-skill-additional.test.mjs - Additional tests for SpecializationFreeSkill
import '../../setupTests.js'
import { describe, expect, test, vi } from 'vitest'

import { createActor } from '../../utils/actors/actor.mjs'
import { createSkillData } from '../../utils/skills/skill.mjs'
import SpecializationFreeSkill from '../../../module/lib/skills/specialization-free-skill.mjs'
import ErrorSkill from '../../../module/lib/skills/error-skill.mjs'

describe('Specialization Free Skill - Additional Coverage', () => {
  describe('process() edge cases', () => {
    test('should return ErrorSkill when training with specializationFree already at 1', async () => {
      const actor = createActor()
      actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
      const data = createSkillData({ specializationFree: 1 })
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: false,
        isSpecialization: true,
      }
      const options = {}

      const skill = new SpecializationFreeSkill(actor, data, params, options)
      const result = await skill.process()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe("you can't use more than 1 specialization free skill rank into the same skill!")
    })

    test('should return ErrorSkill when forgetting with specializationFree at 0', async () => {
      const actor = createActor()
      actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
      const data = createSkillData({ specializationFree: 0 })
      const params = {
        action: 'forget',
        isCreation: true,
        isCareer: false,
        isSpecialization: true,
      }
      const options = {}

      const skill = new SpecializationFreeSkill(actor, data, params, options)
      const result = await skill.process()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe("you can't forget this rank because it comes from species free bonus!")
    })

    test('should return SpecializationFreeSkill when freeSkillRanks.specialization.gained is 0 but spent is also 0', async () => {
      const actor = createActor()
      actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
      actor.system.progression.freeSkillRanks.specialization.gained = 0
      actor.system.progression.freeSkillRanks.specialization.available = 0
      actor.system.progression.freeSkillRanks.specialization.spent = 0

      const data = createSkillData()
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: false,
        isSpecialization: true,
      }
      const options = {}

      const skill = new SpecializationFreeSkill(actor, data, params, options)
      const result = await skill.process()

      // freeSkillRankAvailable = 0 - 0 = 0, which is not < 0, so it proceeds
      expect(result).toBeInstanceOf(SpecializationFreeSkill)
    })

    test('should return ErrorSkill when freeSkillRankAvailable < 0 (overspent)', async () => {
      const actor = createActor({ specializationSpent: 3 }) // spent (3) > gained (2)
      actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
      // Manually update available to reflect overspent
      actor.system.progression.freeSkillRanks.specialization.available = -1

      const data = createSkillData({ specializationFree: 0 }) // Start with 0 so it doesn't trigger > 1 check
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: false,
        isSpecialization: true,
      }
      const options = {}

      const skill = new SpecializationFreeSkill(actor, data, params, options)
      const result = await skill.process()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe("you can't use free skill rank anymore. You have used all!")
    })

    test('should succeed training when specializationFree is 0 and free ranks available', async () => {
      const actor = createActor()
      actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
      const data = createSkillData()
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: false,
        isSpecialization: true,
      }
      const options = {}

      const skill = new SpecializationFreeSkill(actor, data, params, options)
      const result = await skill.process()

      expect(result).toBeInstanceOf(SpecializationFreeSkill)
      expect(result.data.rank.specializationFree).toBe(1)
      expect(result.data.rank.value).toBe(1)
      expect(result.evaluated).toBe(true)
    })

    test('should succeed forgetting when specializationFree is 1', async () => {
      const actor = createActor({ specializationSpent: 1 })
      actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
      const data = createSkillData({ specializationFree: 1, value: 1 })
      const params = {
        action: 'forget',
        isCreation: true,
        isCareer: false,
        isSpecialization: true,
      }
      const options = {}

      const skill = new SpecializationFreeSkill(actor, data, params, options)
      const result = await skill.process()

      expect(result).toBeInstanceOf(SpecializationFreeSkill)
      expect(result.data.rank.specializationFree).toBe(0)
      expect(result.data.rank.value).toBe(0)
      expect(result.evaluated).toBe(true)
    })

    test('should update rank.value correctly with base rank present', async () => {
      const actor = createActor()
      actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
      const data = createSkillData({ base: 1, trained: 1, value: 2 })
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: false,
        isSpecialization: true,
      }
      const options = {}

      const skill = new SpecializationFreeSkill(actor, data, params, options)
      const result = await skill.process()

      // value = base(1) + careerFree(0) + specializationFree(0->1) + trained(1) = 3
      expect(result).toBeInstanceOf(SpecializationFreeSkill)
      expect(result.data.rank.value).toBe(3)
    })
  })

  describe('freeSkillRankAvailable', () => {
    test('should compute correctly when no free ranks spent', () => {
      const actor = createActor()
      const data = createSkillData()
      const params = {}
      const options = {}

      const skill = new SpecializationFreeSkill(actor, data, params, options)
      expect(skill.freeSkillRankAvailable).toBe(2) // gained(2) - spent(0)
    })

    test('should compute correctly when some free ranks spent', () => {
      const actor = createActor({ specializationSpent: 1 })
      const data = createSkillData()
      const params = {}
      const options = {}

      const skill = new SpecializationFreeSkill(actor, data, params, options)
      expect(skill.freeSkillRankAvailable).toBe(1) // gained(2) - spent(1)
    })

    test('should be negative when overspent (edge case)', () => {
      const actor = createActor({ specializationSpent: 5 }) // spent > gained
      const data = createSkillData()
      const params = {}
      const options = {}

      const skill = new SpecializationFreeSkill(actor, data, params, options)
      expect(skill.freeSkillRankAvailable).toBe(-3) // gained(2) - spent(5)
    })
  })

  describe('updateState() edge cases', () => {
    test('should return ErrorSkill when updating without process', async () => {
      const actor = createActor()
      const updateMock = vi.fn()
      actor.update = updateMock

      const data = createSkillData()
      const params = {}
      const options = {}

      const skill = new SpecializationFreeSkill(actor, data, params, options)
      // NOT calling process() before updateState()
      const result = await skill.updateState()

      expect(updateMock).toHaveBeenCalledTimes(0)
      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe('you must evaluate the skill before updating it!')
    })

    test('should handle update failure gracefully', async () => {
      const actor = createActor()
      const updateMock = vi.fn().mockRejectedValue(new Error('Update failed'))
      actor.update = updateMock
      actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)

      const data = createSkillData()
      const params = {
        action: 'train',
        isCreation: false,
        isCareer: false,
        isSpecialization: true,
      }
      const options = {}

      const skill = new SpecializationFreeSkill(actor, data, params, options)
      await skill.process()
      const result = await skill.updateState()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toContain('Update failed')
    })
  })
})
