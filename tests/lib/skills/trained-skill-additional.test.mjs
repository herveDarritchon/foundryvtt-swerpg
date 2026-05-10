// trained-skill-additional.test.mjs - Additional tests for TrainedSkill
import '../../setupTests.js'
import { describe, expect, test, vi } from 'vitest'

import { createActor } from '../../utils/actors/actor.mjs'
import { createSkillData } from '../../utils/skills/skill.mjs'
import TrainedSkill from '../../../module/lib/skills/trained-skill.mjs'
import ErrorSkill from '../../../module/lib/skills/error-skill.mjs'

describe('Trained Skill - Additional Coverage', () => {
  describe('process() edge cases', () => {
    test('should return ErrorSkill when spent XP would exceed total XP after training', async () => {
      const actor = createActor()
      actor.system.progression.experience.spent = 95
      actor.system.progression.experience.gained = 100
      actor.system.progression.experience.total = 100
      actor.system.progression.experience.available = 5

      const data = createSkillData({ trained: 0 })
      const params = {
        action: 'train',
        isCreation: false,
        isCareer: false,
        isSpecialization: false,
      }
      const options = {}

      const trainedSkill = new TrainedSkill(actor, data, params, options)
      const result = await trainedSkill.process()

      // Rank 0 -> 1, cost = 1 * 5 + 5 = 10 (non-specialized)
      // 95 + 10 = 105 > 100 total, should fail
      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe("you can't spend more experience than your total!")
    })

    test('should succeed when spent XP equals total exactly after training', async () => {
      const actor = createActor()
      actor.system.progression.experience.spent = 95
      actor.system.progression.experience.total = 100

      const data = createSkillData({ trained: 0, value: 0 })

      const trainedSkill = new TrainedSkill(
        actor,
        data,
        {
          action: 'train',
          isCreation: false,
          isCareer: true,
          isSpecialization: false,
        },
        {},
      )

      const result = await trainedSkill.process()

      expect(result).toBeInstanceOf(TrainedSkill)
      expect(result.data.rank.trained).toBe(1)
      expect(result.updateData['system.progression.experience.spent']).toBe(100)
    })
    test('should return ErrorSkill when forgetting with no trained rank', async () => {
      const actor = createActor()
      const data = createSkillData({ trained: 0, value: 0 })

      const trainedSkill = new TrainedSkill(
        actor,
        data,
        {
          action: 'forget',
          isCreation: false,
          isCareer: false,
          isSpecialization: false,
        },
        {},
      )

      const result = await trainedSkill.process()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe("you can't forget this rank because it was not trained!")
    })

    test('should handle training at rank 5 during creation (isCreation=true)', async () => {
      const actor = createActor()
      actor.system.progression.experience.gained = 1000
      actor.system.progression.experience.total = 1000
      actor.system.progression.experience.available = 1000
      actor.updateExperiencePoints = vi.fn().mockResolvedValue(actor)

      const data = createSkillData({ trained: 1, value: 1 })
      const params = {
        action: 'train',
        isCreation: true, // Creation mode, max rank 2
        isCareer: false,
        isSpecialization: false,
      }
      const options = {}

      const trainedSkill = new TrainedSkill(actor, data, params, options)
      const result = await trainedSkill.process()

      // Value becomes 2, which is allowed during creation
      expect(result).toBeInstanceOf(TrainedSkill)
      expect(result.data.rank.value).toBe(2)
    })

    test('should return ErrorSkill when training beyond rank 2 during creation', async () => {
      const actor = createActor()
      actor.updateExperiencePoints = vi.fn().mockResolvedValue(actor)

      const data = createSkillData({ trained: 2, value: 2 })
      const params = {
        action: 'train',
        isCreation: true, // Creation mode, max rank 2
        isCareer: false,
        isSpecialization: false,
      }
      const options = {}

      const trainedSkill = new TrainedSkill(actor, data, params, options)
      const result = await trainedSkill.process()

      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toBe("you can't have more than 2 ranks at creation!")
    })

    test('should prepare XP spent decrease when forgetting a trained career skill', async () => {
      const actor = createActor()
      actor.system.progression.experience.spent = 15
      actor.system.progression.experience.total = 100

      const data = createSkillData({
        careerFree: 1,
        trained: 1,
        value: 2,
      })

      const trainedSkill = new TrainedSkill(
        actor,
        data,
        {
          action: 'forget',
          isCreation: false,
          isCareer: true,
          isSpecialization: false,
        },
        {},
      )

      const result = await trainedSkill.process()

      expect(result).toBeInstanceOf(TrainedSkill)
      expect(result.data.rank.trained).toBe(0)
      expect(result.data.rank.value).toBe(1)

      expect(result.updateData).toEqual({
        'system.progression.experience.spent': 5,
        'system.skills.cool.rank': {
          base: 0,
          careerFree: 1,
          specializationFree: 0,
          trained: 0,
          value: 1,
        },
      })
    })
  })
})
