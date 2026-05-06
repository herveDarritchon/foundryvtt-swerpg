// Specialization-free-skill.test.mjs
import '../../setupTests.js'
import { describe, expect, test, vi } from 'vitest'

import { createActor } from '../../utils/actors/actor.mjs'
import { createSkillData } from '../../utils/skills/skill.mjs'
import SpecializationFreeSkill from '../../../module/lib/skills/specialization-free-skill.mjs'
import ErrorSkill from '../../../module/lib/skills/error-skill.mjs'

describe('Specialization Free Skill', () => {
  describe('train a skill', () => {
    test('should increase the specialization free skill rank', async () => {
      const actor = createActor()
      actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
      const data = createSkillData()
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: true,
        isSpecialization: true,
      }
      const options = {}

      const specializationFreeSkill = new SpecializationFreeSkill(actor, data, params, options)
      const trainedSkill = await specializationFreeSkill.process()

      expect(trainedSkill.data.rank.specializationFree).toBe(1)
      expect(actor.updateFreeSkillRanks).toHaveBeenCalledWith('specialization', { spent: 1 })
      expect(trainedSkill.data.rank.careerFree).toBe(0)
    })
  })

  describe('forget a skill', () => {
    test('should decrease the specialization free skill rank', async () => {
      const actor = createActor({ specializationSpent: 1 })
      actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
      const data = createSkillData({ specializationFree: 1 })
      const params = {
        action: 'forget',
        isCreation: true,
        isCareer: true,
        isSpecialization: true,
      }
      const options = {}

      const specializationFreeSkill = new SpecializationFreeSkill(actor, data, params, options)
      const trainedSkill = await specializationFreeSkill.process()

      expect(trainedSkill.data.rank.specializationFree).toBe(0)
      expect(actor.updateFreeSkillRanks).toHaveBeenCalledWith('specialization', { spent: 0 })
      expect(trainedSkill.data.rank.careerFree).toBe(0)
    })
  })

  describe('evaluate a skill', () => {
    describe('should return an error skill if', () => {
      test('you train a skill and specialization free skill rank is greater than 1', async () => {
        const actor = createActor()
        actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
        const data = createSkillData({ specializationFree: 2 })
        const params = {}
        const options = {}

        const specializationFreeSkill = new SpecializationFreeSkill(actor, data, params, options)
        const errorSkill = await specializationFreeSkill.process()

        expect(errorSkill).toBeInstanceOf(ErrorSkill)
        expect(errorSkill.options.message).toBe("you can't use more than 1 specialization free skill rank into the same skill!")
        expect(errorSkill.evaluated).toBe(false)
      })

      test('after train free skill rank available is less than 0', async () => {
        const actor = createActor({ specializationSpent: 5 })
        actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
        const data = createSkillData({ specializationFree: 1 })
        const params = {}
        const options = {}

        const specializationFreeSkill = new SpecializationFreeSkill(actor, data, params, options)
        const errorSkill = await specializationFreeSkill.process()

        expect(errorSkill).toBeInstanceOf(ErrorSkill)
        expect(errorSkill.options.message).toBe("you can't use free skill rank anymore. You have used all!")
        expect(errorSkill.evaluated).toBe(false)
      })

      describe('you forget a skill', () => {
        test('and specialization free skill rank is less than 0', async () => {
          const actor = createActor()
          const data = createSkillData({ specializationFree: -1 })
          const params = {}
          const options = {}

          const specializationFreeSkill = new SpecializationFreeSkill(actor, data, params, options)
          const errorSkill = await specializationFreeSkill.process()

          expect(errorSkill).toBeInstanceOf(ErrorSkill)
          expect(errorSkill.options.message).toBe("you can't forget this rank because it comes from species free bonus!")
          expect(errorSkill.evaluated).toBe(false)
        })

        test('and specialization free skill rank is greater than specialization free skill rank gained', async () => {
          const actor = createActor({ specializationSpent: -1 })
          const data = createSkillData({ specializationFree: 0 })
          const params = {}
          const options = {}

          const specializationFreeSkill = new SpecializationFreeSkill(actor, data, params, options)
          const errorSkill = await specializationFreeSkill.process()

          expect(errorSkill).toBeInstanceOf(ErrorSkill)
          expect(errorSkill.options.message).toBe("you can't get more than 2 free skill ranks!")
          expect(errorSkill.evaluated).toBe(false)
        })
      })
    })

    describe('should return a specialization free skill if', () => {
      test('specialization free skill rank is 1 and only 1', async () => {
        const actor = createActor()
        actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
        const data = createSkillData({ careerFree: 1, specializationFree: 1 })
        const params = {}
        const options = {}

        const specializationFreeSkill = new SpecializationFreeSkill(actor, data, params, options)
        const evaluatedSkill = await specializationFreeSkill.process()
        expect(evaluatedSkill).toBeInstanceOf(SpecializationFreeSkill)
        expect(evaluatedSkill.data.rank.specializationFree).toBe(1)
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
      actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
      const data = createSkillData({ specializationFree: 0, trained: 0, value: 0 })
      const params = {
        action: 'train',
        isCreation: false,
        isCareer: false,
        isSpecialization: true,
      }
      const options = {}
      const specializationFreeSkill = new SpecializationFreeSkill(actor, data, params, options)
      const processedSkill = await specializationFreeSkill.process()
      expect(processedSkill).toBeInstanceOf(SpecializationFreeSkill)
      const updatedSkill = await specializationFreeSkill.updateState()
      expect(updatedSkill).toBeInstanceOf(SpecializationFreeSkill)
      expect(updateMock).toHaveBeenCalledTimes(1)
      expect(updateMock).toHaveBeenCalledWith({
        [`system.skills.skill-id.rank`]: {
          base: 0,
          careerFree: 0,
          specializationFree: 1,
          trained: 0,
          value: 1,
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
        const specializationFreeSkill = new SpecializationFreeSkill(actor, data, params, options)
        const result = await specializationFreeSkill.updateState()
        expect(updateMock).toHaveBeenCalledTimes(0)
        expect(result).toBeInstanceOf(ErrorSkill)
        expect(result.options.message).toContain('you must evaluate the skill before updating it!')
      })

      test('free skill ranks update fails', async () => {
        const actor = createActor()
        actor.updateFreeSkillRanks = vi.fn().mockRejectedValue(new Error('Error on free skill ranks update'))
        const data = createSkillData({ specializationFree: 0, trained: 0, value: 0 })
        const params = {
          action: 'train',
          isCreation: false,
          isSpecialization: true,
        }
        const options = {}
        const specializationFreeSkill = new SpecializationFreeSkill(actor, data, params, options)
        await expect(specializationFreeSkill.process()).rejects.toThrow('Error on free skill ranks update')
      })

      test('skill rank update fails', async () => {
        const actor = createActor()
        actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
        const updateMock = vi.fn().mockRejectedValue(new Error('Error on skill rank update'))
        actor.update = updateMock
        const data = createSkillData({ specializationFree: 0, trained: 0, value: 0 })
        const params = {
          action: 'train',
          isCreation: false,
          isSpecialization: true,
        }
        const options = {}
        const specializationFreeSkill = new SpecializationFreeSkill(actor, data, params, options)
        await specializationFreeSkill.process()
        const result = await specializationFreeSkill.updateState()
        expect(updateMock).toHaveBeenCalledTimes(1)
        expect(result).toBeInstanceOf(ErrorSkill)
        expect(result.options.message).toContain('Error on skill rank update')
      })
    })
  })
})
