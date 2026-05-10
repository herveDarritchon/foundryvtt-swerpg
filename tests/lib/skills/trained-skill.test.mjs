// Trained-skill.test.mjs
import '../../setupTests.js'
import { describe, expect, test, vi } from 'vitest'

import { createActor } from '../../utils/actors/actor.mjs'
import { createSkillData } from '../../utils/skills/skill.mjs'
import TrainedSkill from '../../../module/lib/skills/trained-skill.mjs'
import ErrorSkill from '../../../module/lib/skills/error-skill.mjs'

describe('trained skill tests', () => {
  describe('process', () => {
    test('should prepare trained rank and spent XP when training a career skill', async () => {
      const actor = createActor()

      const data = createSkillData({
        base: 0,
        careerFree: 1,
        specializationFree: 1,
        trained: 0,
        value: 2,
      })

      const trainedSkill = new TrainedSkill(
        actor,
        data,
        {
          action: 'train',
          isCreation: false,
          isCareer: true,
          isSpecialization: true,
        },
        {},
      )

      const result = await trainedSkill.process()

      expect(result).toBeInstanceOf(TrainedSkill)
      expect(result.evaluated).toBe(true)

      expect(result.data.rank).toEqual({
        base: 0,
        careerFree: 1,
        specializationFree: 1,
        trained: 1,
        value: 3,
      })

      expect(result.updateData).toEqual({
        'system.progression.experience.spent': 15,
        'system.skills.cool.rank': {
          base: 0,
          careerFree: 1,
          specializationFree: 1,
          trained: 1,
          value: 3,
        },
      })
    })
  })

  describe('getCost', () => {
    test('should return 15 XP for a career skill trained from rank 2 to rank 3', () => {
      const actor = createActor()

      const data = createSkillData({
        careerFree: 1,
        specializationFree: 1,
        trained: 0,
        value: 2,
      })

      const trainedSkill = new TrainedSkill(
        actor,
        data,
        {
          action: 'train',
          isCareer: true,
          isSpecialization: true,
        },
        {},
      )

      expect(trainedSkill.getCost(2)).toBe(15)
    })

    test('should return 20 XP for a non-career skill trained from rank 2 to rank 3', () => {
      const actor = createActor()

      const data = createSkillData({
        careerFree: 0,
        specializationFree: 0,
        trained: 2,
        value: 2,
      })

      const trainedSkill = new TrainedSkill(
        actor,
        data,
        {
          action: 'train',
          isCareer: false,
          isSpecialization: false,
        },
        {},
      )

      expect(trainedSkill.getCost(2)).toBe(20)
    })

    test('should return 15 XP refund when forgetting a career skill from rank 3 to rank 2', () => {
      const actor = createActor()

      const data = createSkillData({
        careerFree: 1,
        specializationFree: 1,
        trained: 1,
        value: 3,
      })

      const trainedSkill = new TrainedSkill(
        actor,
        data,
        {
          action: 'forget',
          isCareer: true,
          isSpecialization: true,
        },
        {},
      )

      expect(trainedSkill.getCost(3)).toBe(15)
    })
  })

  describe('updateState', () => {
    test('should persist prepared updateData and return the skill', async () => {
      const actor = createActor()
      const updateMock = vi.fn().mockResolvedValue({})

      actor.update = updateMock

      const data = createSkillData({
        careerFree: 1,
        specializationFree: 1,
        trained: 0,
        value: 2,
      })

      const trainedSkill = new TrainedSkill(
        actor,
        data,
        {
          action: 'train',
          isCreation: false,
          isCareer: true,
          isSpecialization: true,
        },
        {},
      )

      const processed = await trainedSkill.process()
      const updated = await processed.updateState()

      expect(updated).toBeInstanceOf(TrainedSkill)
      expect(updateMock).toHaveBeenCalledTimes(1)
      expect(updateMock).toHaveBeenCalledWith(processed.updateData)
    })

    test('should not persist when the skill has not been evaluated', async () => {
      const actor = createActor()
      const updateMock = vi.fn().mockResolvedValue({})

      actor.update = updateMock

      const data = createSkillData({
        careerFree: 1,
        specializationFree: 1,
        trained: 1,
      })

      const trainedSkill = new TrainedSkill(actor, data, {}, {})

      const result = await trainedSkill.updateState()

      expect(updateMock).not.toHaveBeenCalled()
      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toContain('you must evaluate the skill before updating it!')
    })

    test('should return an ErrorSkill when actor update fails', async () => {
      const actor = createActor()
      const updateMock = vi.fn().mockRejectedValueOnce(new Error('Erreur sur update'))

      actor.update = updateMock

      const data = createSkillData({
        careerFree: 1,
        specializationFree: 1,
        trained: 1,
        value: 3,
      })

      const trainedSkill = new TrainedSkill(
        actor,
        data,
        {
          action: 'train',
          isCreation: false,
          isCareer: true,
          isSpecialization: true,
        },
        {},
      )

      await trainedSkill.process()

      const result = await trainedSkill.updateState()

      expect(updateMock).toHaveBeenCalledTimes(1)
      expect(result).toBeInstanceOf(ErrorSkill)
      expect(result.options.message).toContain('Erreur sur update')
    })
  })
})
