// Trained-skill.test.mjs
import '../../setupTests.js'
import { describe, expect, test, vi } from 'vitest'

import { createActor } from '../../utils/actors/actor.mjs'
import { createSkillData } from '../../utils/skills/skill.mjs'
import TrainedSkill from '../../../module/lib/skills/trained-skill.mjs'
import ErrorSkill from '../../../module/lib/skills/error-skill.mjs'

describe('Trained Skill', () => {
  describe('train a skill', () => {
    test('should increase the trained skill rank', async () => {
      const actor = createActor()
      actor.updateExperiencePoints = vi.fn().mockResolvedValue(actor)
      const data = createSkillData()
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: false,
        isSpecialization: true,
      }
      const options = {}

      const trainedSkill = new TrainedSkill(actor, data, params, options)
      const trainTrainedSkill = await trainedSkill.process()

      expect(trainTrainedSkill.data.rank.trained).toBe(1)
      expect(trainTrainedSkill.data.rank.specializationFree).toBe(0)
      expect(trainTrainedSkill.actor.system.progression.freeSkillRanks.specialization.spent).toBe(0)
      expect(trainTrainedSkill.actor.system.progression.freeSkillRanks.career.spent).toBe(0)
      expect(trainTrainedSkill.data.rank.careerFree).toBe(0)
      expect(actor.updateExperiencePoints).toHaveBeenCalledWith({ spent: 5 })
    })
  })
  describe('forget a skill', () => {
    test('should decrease the trained skill rank', async () => {
      const actor = createActor()
      actor.system.progression.experience.spent = 20
      actor.system.progression.experience.gained = 100
      actor.updateExperiencePoints = vi.fn().mockResolvedValue(actor)
      const data = createSkillData({ trained: 1 })
      const params = {
        action: 'forget',
        isCreation: true,
        isCareer: false,
        isSpecialization: false,
      }
      const options = {}

      const trainedSkill = new TrainedSkill(actor, data, params, options)
      const forgetTrainedSkill = await trainedSkill.process()

      expect(forgetTrainedSkill.data.rank.trained).toBe(0)
      expect(forgetTrainedSkill.data.rank.specializationFree).toBe(0)
      expect(forgetTrainedSkill.actor.system.progression.freeSkillRanks.specialization.spent).toBe(0)
      expect(forgetTrainedSkill.actor.system.progression.freeSkillRanks.career.spent).toBe(0)
      expect(forgetTrainedSkill.data.rank.careerFree).toBe(0)
      expect(actor.updateExperiencePoints).toHaveBeenCalledWith({ spent: 10 })
    })
  })
  describe('evaluate a skill', () => {
    describe('should return an error skill if', () => {
      test('trained skill rank is less than 0', async () => {
        const actor = createActor()
        const data = createSkillData({ trained: -1 })
        const params = {
          action: 'forget',
          isCreation: true,
          isCareer: false,
          isSpecialization: false,
        }
        const options = {}

        const trainedSkill = new TrainedSkill(actor, data, params, options)
        const errorSkill = await trainedSkill.process()

        expect(errorSkill).toBeInstanceOf(ErrorSkill)
        expect(errorSkill.options.message).toBe("you can't forget this rank because it was not trained but free!")
        expect(errorSkill.evaluated).toBe(false)
      })
      test('trained a skill costs more than experience points available', async () => {
        const actor = createActor()
        actor.system.progression.experience.spent = 90
        actor.system.progression.experience.gained = 100
        const data = createSkillData({ careerFree: 1, trained: 1, value: 2 })
        const params = {
          action: 'train',
          isCreation: false,
          isCareer: true,
          isSpecialization: false,
        }
        const options = {}

        const trainedSkill = new TrainedSkill(actor, data, params, options)
        const errorSkill = await trainedSkill.process()

        expect(errorSkill).toBeInstanceOf(ErrorSkill)
        expect(errorSkill.options.message).toBe("you can't spend more experience than your total!")
        expect(errorSkill.evaluated).toBe(false)
      })
      test('trained skill rank is greater than 2 and isCreation is true', async () => {
        const actor = createActor()
        const data = createSkillData({ trained: 3 })
        const params = {
          action: 'train',
          isCreation: true,
          isCareer: false,
          isSpecialization: false,
        }
        const options = {}

        const trainedSkill = new TrainedSkill(actor, data, params, options)
        const errorSkill = await trainedSkill.process()

        expect(errorSkill).toBeInstanceOf(ErrorSkill)
        expect(errorSkill.options.message).toBe("you can't have more than 2 rank at creation!")
        expect(errorSkill.evaluated).toBe(false)
      })
      test('trained skill rank is greater than 5 and isCreation is false', async () => {
        const actor = createActor()
        const data = createSkillData({ trained: 6 })
        const params = {
          action: 'train',
          isCreation: false,
          isCareer: false,
          isSpecialization: false,
        }
        const options = {}

        const trainedSkill = new TrainedSkill(actor, data, params, options)
        const errorSkill = await trainedSkill.process()

        expect(errorSkill).toBeInstanceOf(ErrorSkill)
        expect(errorSkill.options.message).toBe("you can't have more than 5 rank!")
        expect(errorSkill.evaluated).toBe(false)
      })
    })
    describe('should return a trained skill if', () => {
      test('trained skill rank is 1 and only 1', async () => {
        const actor = createActor()
        actor.system.progression.experience.spent = 10
        actor.updateExperiencePoints = vi.fn().mockResolvedValue(actor)
        const data = createSkillData({ careerFree: 1, specializationFree: 0, trained: 0, value: 1 })
        const params = {
          action: 'train',
          isCreation: true,
          isCareer: true,
          isSpecialization: true,
        }
        const options = {}
        const trainedFreeSkill = new TrainedSkill(actor, data, params, options)
        const evaluatedSkill = await trainedFreeSkill.process()
        expect(evaluatedSkill).toBeInstanceOf(TrainedSkill)
        expect(evaluatedSkill.data.rank.trained).toBe(1)
        expect(evaluatedSkill.data.rank.value).toBe(2)
        expect(evaluatedSkill.evaluated).toBe(true)
      })
    })
  })
  describe('updateState a skill', () => {
    test('should update the state of the skill and return the skill', async () => {
      const actor = createActor()
      const updateMock = vi.fn().mockResolvedValue({})
      actor.update = updateMock
      actor.updateExperiencePoints = vi.fn().mockResolvedValue(actor)
      const data = createSkillData({ careerFree: 1, specializationFree: 1, trained: 0, value: 3 })
      const params = {
        action: 'train',
        isCreation: false,
        isCareer: true,
        isSpecialization: true,
      }
      const options = {}
      const trainedFreeSkill = new TrainedSkill(actor, data, params, options)
      const processedTrainedSkill = await trainedFreeSkill.process()
      const updatedSkill = await processedTrainedSkill.updateState()
      expect(updatedSkill).toBeInstanceOf(TrainedSkill)
      expect(updateMock).toHaveBeenCalledTimes(1)
      expect(updateMock).toHaveBeenCalledWith({
        'system.skills.skill-id.rank': {
          base: 0,
          careerFree: 1,
          specializationFree: 1,
          trained: 1,
          value: 3,
        },
      })
    })
    describe('should return an Error Skill if any update fails', () => {
      test('should not update the state of the skill if the skill evaluated state is false', async () => {
        const actor = createActor()
        const updateMock = vi.fn().mockResolvedValue({})
        actor.update = updateMock
        const data = createSkillData({ careerFree: 1, specializationFree: 1, trained: 1 })
        const params = {}
        const options = {}
        const trainedFreeSkill = new TrainedSkill(actor, data, params, options)
        const result = await trainedFreeSkill.updateState()
        expect(updateMock).toHaveBeenCalledTimes(0)
        expect(result).toBeInstanceOf(ErrorSkill)
        expect(result.options.message).toContain('you must evaluate the skill before updating it!')
      })
      test('skill rank update fails', async () => {
        const actor = createActor()
        actor.updateExperiencePoints = vi.fn().mockResolvedValue({})
        const updateMock = vi.fn().mockRejectedValueOnce(new Error('Erreur sur update'))
        actor.update = updateMock
        const data = createSkillData({ careerFree: 1, specializationFree: 1, trained: 1 })
        const params = {
          action: 'train',
          isCreation: false,
          isCareer: true,
          isSpecialization: true,
        }
        const options = {}
        const trainedFreeSkill = new TrainedSkill(actor, data, params, options)
        await trainedFreeSkill.process()
        const result = await trainedFreeSkill.updateState()
        expect(updateMock).toHaveBeenCalledTimes(1)
        expect(result).toBeInstanceOf(ErrorSkill)
        expect(result.options.message).toContain('Erreur sur update')
      })
    })
  })
})
