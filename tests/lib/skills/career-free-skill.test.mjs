// Career-free-skill.test.mjs
import '../../setupTests.js'
import { describe, expect, test, vi } from 'vitest'

import { createActor } from '../../utils/actors/actor.mjs'
import { createSkillData } from '../../utils/skills/skill.mjs'
import CareerFreeSkill from '../../../module/lib/skills/career-free-skill.mjs'
import ErrorSkill from '../../../module/lib/skills/error-skill.mjs'

describe('Career Free Skill', () => {
  describe('process a skill', () => {
    describe('should return an error skill if', () => {
      describe('you train a skill', () => {
        test('and career free skill rank is greater than 1', async () => {
          const actor = createActor()
          actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
          const data = createSkillData({ careerFree: 2 })
          const params = {}
          const options = {}

          const careerFreeSkill = new CareerFreeSkill(actor, data, params, options)
          const errorSkill = await careerFreeSkill.process()

          expect(errorSkill).toBeInstanceOf(ErrorSkill)
          expect(errorSkill.options.message).toBe("you can't use more than 1 career free skill rank into the same skill!")
          expect(errorSkill.evaluated).toBe(false)
        })

        test('after train free skill rank available is less than 0', async () => {
          const actor = createActor({ careerSpent: 5 })
          actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
          const data = createSkillData({ careerFree: 1 })
          const params = {}
          const options = {}

          const careerFreeSkill = new CareerFreeSkill(actor, data, params, options)
          const errorSkill = await careerFreeSkill.process()

          expect(errorSkill).toBeInstanceOf(ErrorSkill)
          expect(errorSkill.options.message).toBe("you can't use free skill rank anymore. You have used all!")
          expect(errorSkill.evaluated).toBe(false)
        })
      })

      describe('you forget a skill', () => {
        test('and career free skill rank is less than 0', async () => {
          const actor = createActor()
          const data = createSkillData({ careerFree: -1 })
          const params = {}
          const options = {}

          const careerFreeSkill = new CareerFreeSkill(actor, data, params, options)
          const errorSkill = await careerFreeSkill.process()

          expect(errorSkill).toBeInstanceOf(ErrorSkill)
          expect(errorSkill.options.message).toBe("you can't forget this rank because it was not trained but free!")
          expect(errorSkill.evaluated).toBe(false)
        })

        test('and career free skill rank is greater than career free skill rank gained', async () => {
          const actor = createActor({ careerSpent: -1 })
          const data = createSkillData({ careerFree: 0 })
          const params = {}
          const options = {}

          const careerFreeSkill = new CareerFreeSkill(actor, data, params, options)
          const errorSkill = await careerFreeSkill.process()

          expect(errorSkill).toBeInstanceOf(ErrorSkill)
          expect(errorSkill.options.message).toBe("you can't get more than 4 free skill ranks!")
          expect(errorSkill.evaluated).toBe(false)
        })
      })
    })

    describe('should return a career free skill if', () => {
    test('career free skill rank is 1 and only 1', async () => {
        const actor = createActor()
        actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
        const data = createSkillData({ careerFree: 0, trained: 0, value: 0 })
        const params = {
          action: 'train',
          isCareer: true,
        }
        const options = {}

        const careerFreeSkill = new CareerFreeSkill(actor, data, params, options)
        const evaluatedSkill = await careerFreeSkill.process()
        expect(evaluatedSkill).toBeInstanceOf(CareerFreeSkill)
        expect(evaluatedSkill.data.rank.careerFree).toBe(1)
        expect(evaluatedSkill.data.rank.value).toBe(1)
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
      const data = createSkillData({ careerFree: 0, trained: 0, value: 0 })
      const params = {
        action: 'train',
        isCreation: false,
        isCareer: true,
      }
      const options = {}

      const careerFreeSkill = new CareerFreeSkill(actor, data, params, options)
      const processedSkill = await careerFreeSkill.process()
      expect(processedSkill).toBeInstanceOf(CareerFreeSkill)
      const updatedSkill = await careerFreeSkill.updateState()

      expect(updatedSkill).toBeInstanceOf(CareerFreeSkill)
      expect(updateMock).toHaveBeenCalledTimes(1)
      expect(updateMock).toHaveBeenCalledWith({
        [`system.skills.skill-id.rank`]: {
          base: 0,
          careerFree: 1,
          specializationFree: 0,
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

        const data = createSkillData({ specializationFree: 1, careerFree: 1, trained: 1 })
        const params = {}
        const options = {}

        const careerFreeSkill = new CareerFreeSkill(actor, data, params, options)
        const result = await careerFreeSkill.updateState()

        expect(updateMock).toHaveBeenCalledTimes(0)
        expect(result).toBeInstanceOf(ErrorSkill)
        expect(result.options.message).toContain('you must evaluate the skill before updating it!')
      })

      test('free skill ranks update fails', async () => {
        const actor = createActor()
        actor.updateFreeSkillRanks = vi.fn().mockImplementation(async (type, params) => {
          throw new Error('Error on free skill ranks update')
        })
        const data = createSkillData({ careerFree: 0 })
        const params = {
          action: 'train',
          isCreation: false,
          isCareer: true,
        }
        const options = {}

        const careerFreeSkill = new CareerFreeSkill(actor, data, params, options)
        await expect(careerFreeSkill.process()).rejects.toThrow('Error on free skill ranks update')
      })

      test('skill rank update fails', async () => {
        const actor = createActor()
        actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
        const updateMock = vi.fn().mockRejectedValue(new Error('Error on skill rank update'))
        actor.update = updateMock
        const data = createSkillData({ careerFree: 0, trained: 0, value: 0 })
        const params = {
          action: 'train',
          isCreation: false,
          isCareer: true,
        }
        const options = {}

        const careerFreeSkill = new CareerFreeSkill(actor, data, params, options)
        await careerFreeSkill.process()
        const result = await careerFreeSkill.updateState()
        expect(updateMock).toHaveBeenCalledTimes(1)
        expect(result).toBeInstanceOf(ErrorSkill)
        expect(result.options.message).toContain('Error on skill rank update')
      })

      test('skill rank update fails', async () => {
        const actor = createActor()
        actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
        const updateMock = vi.fn().mockRejectedValue(new Error('Error on skill rank update'))
        actor.update = updateMock
        const data = createSkillData({ careerFree: 0, trained: 0, value: 0 })
        const params = {
          action: 'train',
          isCreation: false,
          isCareer: true,
        }
        const options = {}
        const careerFreeSkill = new CareerFreeSkill(actor, data, params, options)
        await careerFreeSkill.process()
        const result = await careerFreeSkill.updateState()
        expect(result).toBeInstanceOf(ErrorSkill)
        expect(result.options.message).toContain('Error on skill rank update')
      })
    })
  })
})
