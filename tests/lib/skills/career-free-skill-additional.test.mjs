// career-free-skill-additional.test.mjs - Additional tests for CareerFreeSkill
import '../../setupTests.js'
import { describe, expect, test, vi } from 'vitest'

import { createActor } from '../../utils/actors/actor.mjs'
import { createSkillData } from '../../utils/skills/skill.mjs'
import CareerFreeSkill from '../../../module/lib/skills/career-free-skill.mjs'
import ErrorSkill from '../../../module/lib/skills/error-skill.mjs'

describe('Career Free Skill - Additional Coverage', () => {
  describe('process() edge cases', () => {
    test('should return ErrorSkill when training with careerFree already at 1', async () => {
      const actor = createActor()
      actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
      const data = createSkillData({ careerFree: 1 })
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: true,
        isSpecialization: false,
      }
      const options = {}

      const skill = new CareerFreeSkill(actor, data, params, options)
      const result = await skill.process()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe("you can't use more than 1 career free skill rank into the same skill!")
    })

    test('should return ErrorSkill when forgetting with careerFree at 0', async () => {
      const actor = createActor()
      actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
      const data = createSkillData({ careerFree: 0 })
      const params = {
        action: 'forget',
        isCreation: true,
        isCareer: true,
        isSpecialization: false,
      }
      const options = {}

      const skill = new CareerFreeSkill(actor, data, params, options)
      const result = await skill.process()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe("you can't forget this rank because it was not trained but free!")
    })

    test('should return CareerFreeSkill when freeSkillRanks.career.gained is 0 but spent is also 0', async () => {
      const actor = createActor()
      actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
      actor.system.progression.freeSkillRanks.career.gained = 0
      actor.system.progression.freeSkillRanks.career.available = 0
      actor.system.progression.freeSkillRanks.career.spent = 0
      const data = createSkillData({})
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: true,
        isSpecialization: false,
      }
      const options = {}

      const skill = new CareerFreeSkill(actor, data, params, options)
      const result = await skill.process()

      expect(result).toBeInstanceOf(CareerFreeSkill)
      expect(actor.updateFreeSkillRanks).toHaveBeenCalledWith('career', { spent: 1 })
    })

    test('should return CareerFreeSkill when freeSkillRanks.career.available is -1 (special case)', async () => {
      const actor = createActor()
      actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
      actor.system.progression.freeSkillRanks.career.available = -1
      const data = createSkillData({})
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: true,
        isSpecialization: false,
      }
      const options = {}

      const skill = new CareerFreeSkill(actor, data, params, options)
      const result = await skill.process()

      expect(result).toBeInstanceOf(CareerFreeSkill)
      expect(result.data.rank.careerFree).toBe(1)
      expect(actor.updateFreeSkillRanks).toHaveBeenCalledWith('career', { spent: 1 })
    })
  })
})
