// Trained-talent.test.mjs
import '../../setupTests.js'
import { describe, expect, test, vi } from 'vitest'

import { createActor } from '../../utils/actors/actor.mjs'
import { createTalentData } from '../../utils/talents/talent.mjs'
import TrainedTalent from '../../../module/lib/talents/trained-talent.mjs'
import ErrorTalent from '../../../module/lib/talents/error-talent.mjs'

describe('Trained Talent', () => {
  describe('train a talent', () => {
    test('should add a trained talent with idx 0 and spend 5xp', async () => {
      const data = createTalentData('1')
      const existingTalents = [createTalentData('2', { name: 'talent-1' })]
      const actor = createActor({ items: existingTalents })
      actor.updateExperiencePoints = vi.fn().mockResolvedValue(actor)
      const params = {
        action: 'train',
        isCreation: true,
      }
      const options = {}

      const trainedTalent = new TrainedTalent(actor, data, params, options)
      const trainTrainedTalent = await trainedTalent.process()

      expect(trainTrainedTalent).toBeInstanceOf(TrainedTalent)
      expect(trainTrainedTalent.data.system.rank.idx).toBe(0)
      expect(trainTrainedTalent.data.system.rank.cost).toBe(5)
      expect(actor.updateExperiencePoints).toHaveBeenCalledWith({ spent: 5 })
    })
  })
  describe('forget a talent', () => {
    test('should remove a trained talent and regain 5xp', async () => {
      const data = createTalentData('1')
      const existingTalents = [data]
      const actor = createActor({ items: existingTalents })
      actor.updateExperiencePoints = vi.fn().mockResolvedValue(actor)
      actor.system.progression.experience.spent = 30
      actor.system.progression.experience.gained = 100
      actor.system.progression.experience.total = 100
      const params = {
        action: 'forget',
        isCreation: true,
      }
      const options = {}

      const trainedTalent = new TrainedTalent(actor, data, params, options)
      const forgetTrainedTalent = await trainedTalent.process()

      expect(forgetTrainedTalent).toBeInstanceOf(TrainedTalent)
      expect(forgetTrainedTalent.data.system.rank.idx).toBe(0)
      expect(forgetTrainedTalent.data.system.rank.cost).toBe(0)
      expect(actor.updateExperiencePoints).toHaveBeenCalledWith({ spent: 25 })
    })
  })
  describe('evaluate a talent', () => {
    describe('should return an error talent if', () => {
      test('remove a trained talent not known', async () => {
        const data = createTalentData('1')
        const existingTalents = [createTalentData('2', { name: 'talent-1' })]
        const actor = createActor({ items: existingTalents })
        actor.updateExperiencePoints = vi.fn().mockResolvedValue(actor)
        const params = {
          action: 'forget',
          isCreation: true,
        }
        const options = {}

        const trainedTalent = new TrainedTalent(actor, data, params, options)
        const errorTalent = await trainedTalent.process()

        expect(errorTalent).toBeInstanceOf(ErrorTalent)
        expect(errorTalent.options.message).toBe("you can't forget a talent ('talent-name') you don't own!")
        expect(errorTalent.evaluated).toBe(false)
      })

      test('drop a trained talent already known by id', async () => {
        const data = createTalentData('1')
        const existingTalents = [data]
        const actor = createActor({ items: existingTalents })
        actor.updateExperiencePoints = vi.fn().mockResolvedValue(actor)
        const params = {
          action: 'train',
          isCreation: true,
        }
        const options = {}

        const trainedTalent = new TrainedTalent(actor, data, params, options)
        const errorTalent = await trainedTalent.process()

        expect(errorTalent).toBeInstanceOf(ErrorTalent)
        expect(errorTalent.options.message).toBe("Talent 'talent-name' (ID: '1)' is already owned by the actor.")
        expect(errorTalent.evaluated).toBe(false)
      })

      test('drop a trained talent already known by name', async () => {
        const data = createTalentData('1')
        const existingTalents = [createTalentData('2')]
        const actor = createActor({ items: existingTalents })
        actor.updateExperiencePoints = vi.fn().mockResolvedValue(actor)
        const params = {
          action: 'train',
          isCreation: true,
        }
        const options = {}

        const trainedTalent = new TrainedTalent(actor, data, params, options)
        const errorTalent = await trainedTalent.process()

        expect(errorTalent).toBeInstanceOf(ErrorTalent)
        expect(errorTalent.options.message).toBe("you already own this talent ('talent-name') and it is not a Ranked Talent!")
        expect(errorTalent.evaluated).toBe(false)
      })

      test('trained a talent costs more than experience points available', async () => {
        const data = createTalentData('1', { row: 3 })
        const existingTalents = [createTalentData('2', { name: 'talent-1' })]
        const actor = createActor({ items: existingTalents })
        actor.updateExperiencePoints = vi.fn().mockResolvedValue(actor)
        actor.system.progression.experience.spent = 90
        actor.system.progression.experience.gained = 100
        actor.system.progression.experience.total = 100
        const params = {
          action: 'train',
          isCreation: false,
        }
        const options = {}

        const trainedTalent = new TrainedTalent(actor, data, params, options)
        const errorTalent = await trainedTalent.process()

        expect(errorTalent).toBeInstanceOf(ErrorTalent)
        expect(errorTalent.options.message).toBe("you can't spend more experience than your total!")
        expect(errorTalent.evaluated).toBe(false)
      })
    })
  })
  describe('updateState a talent', () => {
    test('should return a TalentError if TrainedTalent is not evaluated', async () => {
      const data = createTalentData('1')
      const existingTalents = [createTalentData('2', { name: 'talent-1' })]
      const actor = createActor({ items: existingTalents })

      const updateMock = vi.fn().mockResolvedValue({})
      actor.update = updateMock

      const createEmbeddedDocumentsMock = vi.fn().mockResolvedValue([data.toObject()])
      actor.createEmbeddedDocuments = createEmbeddedDocumentsMock

      const params = {
        action: 'train',
        isCreation: true,
      }
      const options = {}

      const trainedTalent = new TrainedTalent(actor, data, params, options)
      const updatedTalent = await trainedTalent.updateState()

      expect(updatedTalent).toBeInstanceOf(ErrorTalent)
      expect(updateMock).toHaveBeenCalledTimes(0)
      expect(createEmbeddedDocumentsMock).toHaveBeenCalledTimes(0)
    })
    test('should update the state of the train talent and return the talent', async () => {
      const data = createTalentData('1')
      const existingTalents = [createTalentData('2', { name: 'talent-1' })]
      const actor = createActor({ items: existingTalents })

      const updateMock = vi.fn().mockResolvedValue({})
      actor.update = updateMock
      actor.updateExperiencePoints = vi.fn().mockResolvedValue(actor)

      const createEmbeddedDocumentsMock = vi.fn().mockResolvedValue([data.toObject()])
      actor.createEmbeddedDocuments = createEmbeddedDocumentsMock

      const params = {
        action: 'train',
        isCreation: true,
      }
      const options = {}

      const trainedTalent = new TrainedTalent(actor, data, params, options)
      const processedTrainedTalent = await trainedTalent.process()
      await processedTrainedTalent.updateState()

      expect(updateMock).toHaveBeenCalledTimes(0)
      expect(actor.updateExperiencePoints).toHaveBeenCalledWith({ spent: 5 })
      expect(createEmbeddedDocumentsMock).toHaveBeenCalledWith('Item', [data.toObject()])
    })
    test('should update the state of the forget talent and return the talent', async () => {
      const data = createTalentData('1', { name: 'talent-1' })
      const existingTalents = [data]
      const actor = createActor({ items: existingTalents })
      actor.system.progression.experience.spent = 30
      actor.system.progression.experience.gained = 100
      actor.system.progression.experience.total = 100

      const updateMock = vi.fn().mockResolvedValue({})
      actor.update = updateMock
      actor.updateExperiencePoints = vi.fn().mockResolvedValue(actor)

      const deleteEmbeddedDocumentsMock = vi.fn().mockResolvedValue(['1'])
      actor.deleteEmbeddedDocuments = deleteEmbeddedDocumentsMock

      const params = {
        action: 'forget',
        isCreation: true,
      }
      const options = {}

      const trainedTalent = new TrainedTalent(actor, data, params, options)
      const processedTrainedTalent = await trainedTalent.process()
      await processedTrainedTalent.updateState()

      expect(updateMock).toHaveBeenCalledTimes(0)
      expect(actor.updateExperiencePoints).toHaveBeenCalledWith({ spent: 25 })
      expect(deleteEmbeddedDocumentsMock).toHaveBeenCalledWith('Item', ['1'])
    })
    describe('should return an Error Talent if any update fails', () => {
      test('talent creation fails', async () => {
        const data = createTalentData('1')
        const existingTalents = [createTalentData('2', { name: 'talent-1' })]
        const actor = createActor({ items: existingTalents })

        actor.updateExperiencePoints = vi.fn().mockResolvedValue(actor)

        const createEmbeddedDocumentsMock = vi.fn().mockRejectedValueOnce(new Error('Erreur création'))
        actor.createEmbeddedDocuments = createEmbeddedDocumentsMock

        const params = {
          action: 'train',
          isCreation: true,
        }
        const options = {}

        const trainedTalent = new TrainedTalent(actor, data, params, options)
        await trainedTalent.process()
        const result = await trainedTalent.updateState()

        expect(createEmbeddedDocumentsMock).toHaveBeenCalledTimes(1)
        expect(result).toBeInstanceOf(ErrorTalent)
        expect(result.options.message).toContain('Erreur création')
      })
    })
  })
})
