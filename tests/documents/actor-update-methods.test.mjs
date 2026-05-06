// actor-update-methods.test.mjs
// Tests for SwerpgActor update methods (Phase 1: Anti-pattern fix)

import { describe, expect, test, vi, beforeEach } from 'vitest'
import { createMockActor } from '../utils/actors/actor-factory.js'

describe('SwerpgActor Update Methods', () => {
  let actor

  beforeEach(() => {
    actor = createMockActor()
    actor.update = vi.fn().mockResolvedValue(actor)
  })

  describe('updateExperiencePoints()', () => {
    test('should update spent experience points', async () => {
      await actor.updateExperiencePoints({ spent: 20 })

      expect(actor.update).toHaveBeenCalledWith({
        'system.progression.experience.spent': 20,
      })
    })

    test('should update gained experience points', async () => {
      await actor.updateExperiencePoints({ gained: 50 })

      expect(actor.update).toHaveBeenCalledWith({
        'system.progression.experience.gained': 50,
      })
    })

    test('should update total experience points', async () => {
      await actor.updateExperiencePoints({ total: 150 })

      expect(actor.update).toHaveBeenCalledWith({
        'system.progression.experience.total': 150,
      })
    })

    test('should update multiple properties at once', async () => {
      await actor.updateExperiencePoints({ spent: 30, gained: 80, total: 120 })

      expect(actor.update).toHaveBeenCalledWith({
        'system.progression.experience.spent': 30,
        'system.progression.experience.gained': 80,
        'system.progression.experience.total': 120,
      })
    })

    test('should not call update if no parameters provided', async () => {
      await actor.updateExperiencePoints({})

      expect(actor.update).toHaveBeenCalledWith({})
    })

    test('should return the result of this.update()', async () => {
      const result = await actor.updateExperiencePoints({ spent: 10 })

      expect(result).toBe(actor)
    })
  })

  describe('updateFreeSkillRanks()', () => {
    test('should update career spent ranks', async () => {
      await actor.updateFreeSkillRanks('career', { spent: 2 })

      expect(actor.update).toHaveBeenCalledWith({
        'system.progression.freeSkillRanks.career.spent': 2,
      })
    })

    test('should update career gained ranks', async () => {
      await actor.updateFreeSkillRanks('career', { gained: 5 })

      expect(actor.update).toHaveBeenCalledWith({
        'system.progression.freeSkillRanks.career.gained': 5,
      })
    })

    test('should update specialization spent ranks', async () => {
      await actor.updateFreeSkillRanks('specialization', { spent: 1 })

      expect(actor.update).toHaveBeenCalledWith({
        'system.progression.freeSkillRanks.specialization.spent': 1,
      })
    })

    test('should update specialization gained ranks', async () => {
      await actor.updateFreeSkillRanks('specialization', { gained: 3 })

      expect(actor.update).toHaveBeenCalledWith({
        'system.progression.freeSkillRanks.specialization.gained': 3,
      })
    })

    test('should update multiple properties for a type', async () => {
      await actor.updateFreeSkillRanks('career', { spent: 3, gained: 6 })

      expect(actor.update).toHaveBeenCalledWith({
        'system.progression.freeSkillRanks.career.spent': 3,
        'system.progression.freeSkillRanks.career.gained': 6,
      })
    })

    test('should return the result of this.update()', async () => {
      const result = await actor.updateFreeSkillRanks('specialization', { spent: 1 })

      expect(result).toBe(actor)
    })
  })
})
