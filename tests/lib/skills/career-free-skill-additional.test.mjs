// career-free-skill-additional.test.mjs - Additional tests for CareerFreeSkill
import '../../setupTests.js'
import { describe, expect, test, vi } from 'vitest'

import { createActor } from '../../utils/actors/actor.mjs'
import { createSkillData } from '../../utils/skills/skill.mjs'
import CareerFreeSkill from '../../../module/lib/skills/career-free-skill.mjs'
import ErrorSkill from '../../../module/lib/skills/error-skill.mjs'

describe('Career Free Skill - Additional Coverage', () => {
  describe('process() edge cases', () => {
    test('should return ErrorSkill when training with careerFree already at 1', () => {
      const actor = createActor()
      const data = createSkillData({ careerFree: 1 })
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: true,
        isSpecialization: false,
      }
      const options = {}

      const skill = new CareerFreeSkill(actor, data, params, options)
      const result = skill.process()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe("you can't use more than 1 career free skill rank into the same skill!")
    })

    test('should return ErrorSkill when forgetting with careerFree at 0', () => {
      const actor = createActor()
      const data = createSkillData({ careerFree: 0 })
      const params = {
        action: 'forget',
        isCreation: true,
        isCareer: true,
        isSpecialization: false,
      }
      const options = {}

      const skill = new CareerFreeSkill(actor, data, params, options)
      const result = skill.process()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe("you can't forget this rank because it comes from species free bonus!")
    })

    test('should return CareerFreeSkill when freeSkillRanks.career.gained is 0 but spent is also 0', () => {
      const actor = createActor()
      actor.freeSkillRanks.career.gained = 0
      actor.freeSkillRanks.career.available = 0
      actor.freeSkillRanks.career.spent = 0

      const data = createSkillData()
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: true,
        isSpecialization: false,
      }
      const options = {}

      const skill = new CareerFreeSkill(actor, data, params, options)
      const result = skill.process()

      // freeSkillRankAvailable = 0 - 0 = 0, which is not < 0, so it proceeds
      expect(result).toBeInstanceOf(CareerFreeSkill)
    })

    test('should return ErrorSkill when freeSkillRankAvailable < 0 (overspent)', () => {
      const actor = createActor({ careerSpent: 5 }) // spent (5) > gained (4)
      // Manually update available to reflect overspent
      actor.freeSkillRanks.career.available = -1

      const data = createSkillData({ careerFree: 0 }) // Start with 0 so it doesn't trigger > 1 check
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: true,
        isSpecialization: false,
      }
      const options = {}

      const skill = new CareerFreeSkill(actor, data, params, options)
      const result = skill.process()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe("you can't use free skill rank anymore. You have used all!")
    })

    test('should succeed training when careerFree is 0 and free ranks available', () => {
      const actor = createActor()
      const data = createSkillData()
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: true,
        isSpecialization: false,
      }
      const options = {}

      const skill = new CareerFreeSkill(actor, data, params, options)
      const result = skill.process()

      expect(result).toBeInstanceOf(CareerFreeSkill)
      expect(result.data.rank.careerFree).toBe(1)
      expect(result.data.rank.value).toBe(1)
      expect(result.actor.freeSkillRanks.career.spent).toBe(1)
      expect(result.evaluated).toBe(true)
    })

    test('should succeed forgetting when careerFree is 1', () => {
      const actor = createActor({ careerSpent: 1 })
      const data = createSkillData({ careerFree: 1, value: 1 })
      const params = {
        action: 'forget',
        isCreation: true,
        isCareer: true,
        isSpecialization: false,
      }
      const options = {}

      const skill = new CareerFreeSkill(actor, data, params, options)
      const result = skill.process()

      expect(result).toBeInstanceOf(CareerFreeSkill)
      expect(result.data.rank.careerFree).toBe(0)
      expect(result.data.rank.value).toBe(0)
      expect(result.actor.freeSkillRanks.career.spent).toBe(0)
      expect(result.evaluated).toBe(true)
    })

    test('should update rank.value correctly with multiple rank sources', () => {
      const actor = createActor()
      const data = createSkillData({ base: 1, trained: 2, value: 3 })
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: true,
        isSpecialization: false,
      }
      const options = {}

      const skill = new CareerFreeSkill(actor, data, params, options)
      const result = skill.process()

      expect(result).toBeInstanceOf(CareerFreeSkill)
      // value = base(1) + careerFree(0->1) + specializationFree(0) + trained(2) = 4
      expect(result.data.rank.value).toBe(4)
    })
  })

  describe('freeSkillRankAvailable', () => {
    test('should compute correctly when no free ranks spent', () => {
      const actor = createActor()
      const data = createSkillData()
      const params = {}
      const options = {}

      const skill = new CareerFreeSkill(actor, data, params, options)
      expect(skill.freeSkillRankAvailable).toBe(4) // gained(4) - spent(0)
    })

    test('should compute correctly when some free ranks spent', () => {
      const actor = createActor({ careerSpent: 2 })
      const data = createSkillData()
      const params = {}
      const options = {}

      const skill = new CareerFreeSkill(actor, data, params, options)
      expect(skill.freeSkillRankAvailable).toBe(2) // gained(4) - spent(2)
    })

    test('should be negative when overspent (edge case)', () => {
      const actor = createActor({ careerSpent: 5 }) // spent > gained
      const data = createSkillData()
      const params = {}
      const options = {}

      const skill = new CareerFreeSkill(actor, data, params, options)
      expect(skill.freeSkillRankAvailable).toBe(-1)
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

      const skill = new CareerFreeSkill(actor, data, params, options)
      const result = await skill.updateState()

      expect(updateMock).toHaveBeenCalledTimes(0)
      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe('you must evaluate the skill before updating it!')
    })

    test('should handle update failure gracefully', async () => {
      const actor = createActor()
      const updateMock = vi.fn().mockRejectedValue(new Error('Update failed'))
      actor.update = updateMock

      const data = createSkillData()
      const params = {}
      const options = {}

      const skill = new CareerFreeSkill(actor, data, params, options)
      skill.process()
      const result = await skill.updateState()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toContain('Update failed')
    })
  })
})
