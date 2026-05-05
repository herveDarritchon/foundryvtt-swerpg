// actor-resources.test.mjs
// Tests for SwerpgActor resource-related methods
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { createMockActor } from '../utils/actors/actor-factory.js'

describe('SwerpgActor Resources', () => {
  let actor

  beforeEach(() => {
    actor = createMockActor()
  })

  describe('computeResourceValue()', () => {
    test('should increase value by 1 when action is increase and below threshold', () => {
      const resource = { value: 2, threshold: 6 }
      const result = actor.computeResourceValue(resource, 'increase')
      expect(result).toBe(3)
    })

    test('should cap at threshold when increasing', () => {
      const resource = { value: 5, threshold: 6 }
      const result = actor.computeResourceValue(resource, 'increase')
      expect(result).toBe(6)
    })

    test('should decrease value by 1 when action is decrease and above 0', () => {
      const resource = { value: 3, threshold: 6 }
      const result = actor.computeResourceValue(resource, 'decrease')
      expect(result).toBe(2)
    })

    test('should not go below 0 when decreasing', () => {
      const resource = { value: 0, threshold: 6 }
      const result = actor.computeResourceValue(resource, 'decrease')
      expect(result).toBe(0)
    })

    test('should throw error for invalid action', () => {
      const resource = { value: 3, threshold: 6, type: 'action' }
      expect(() => actor.computeResourceValue(resource, 'invalid')).toThrow(
        'Invalid action "invalid" for jauge type "action"',
      )
    })

    test('should throw error with correct message including resource type', () => {
      const resource = { value: 3, threshold: 6, type: 'focus' }
      expect(() => actor.computeResourceValue(resource, 'bad')).toThrow(
        'Invalid action "bad" for jauge type "focus"',
      )
    })
  })

  describe('modifyResource()', () => {
    beforeEach(() => {
      actor.update = vi.fn().mockResolvedValue(actor)
    })

    test('should compute new value and update resource.value', async () => {
      const resource = { value: 2, threshold: 6 }
      actor.system.resources.action = resource

      await actor.modifyResource('action', 'increase')

      expect(resource.value).toBe(3)
    })

    test('should call this.update with correct data on increase', async () => {
      const resource = { value: 2, threshold: 6 }
      actor.system.resources.action = resource

      await actor.modifyResource('action', 'increase')

      expect(actor.update).toHaveBeenCalledWith({ 'system.resources.action': resource })
    })

    test('should call this.update with correct data on decrease', async () => {
      const resource = { value: 3, threshold: 6 }
      actor.system.resources.action = resource

      await actor.modifyResource('action', 'decrease')

      expect(actor.update).toHaveBeenCalledWith({ 'system.resources.action': resource })
    })

    test('should return the result of this.update', async () => {
      const resource = { value: 2, threshold: 6 }
      actor.system.resources.action = resource
      const mockResult = { id: 'updated-actor' }
      actor.update.mockResolvedValue(mockResult)

      const result = await actor.modifyResource('action', 'increase')

      expect(result).toBe(mockResult)
    })
  })

  describe('alterResources()', () => {
    beforeEach(() => {
      actor.update = vi.fn().mockResolvedValue(actor)
      actor.system.resources = {
        health: { value: 10, max: 20 },
        morale: { value: 15, max: 20 },
        action: { value: 3, max: 6 },
      }
    })

    test('should update multiple resources at once', async () => {
      await actor.alterResources({ health: 5, morale: -3 }, {}, {})

      expect(actor.update).toHaveBeenCalledWith({
        'system.resources.health.value': 15,
        'system.resources.morale.value': 12,
      })
    })

    test('should skip resources with zero delta', async () => {
      await actor.alterResources({ health: 0, action: 2 }, {}, {})

      expect(actor.update).toHaveBeenCalledWith({
        'system.resources.action.value': 5,
      })
    })

    test('should clamp values to min 0 and max', async () => {
      await actor.alterResources({ health: -15, morale: 10 }, {}, {})

      expect(actor.update).toHaveBeenCalledWith({
        'system.resources.health.value': 0,
        'system.resources.morale.value': 20,
      })
    })

    test('should handle reverse option', async () => {
      await actor.alterResources({ health: 5 }, {}, { reverse: true })

      expect(actor.update).toHaveBeenCalledWith({
        'system.resources.health.value': 5,
      })
    })

    test('should merge actorUpdates', async () => {
      const actorUpdates = { 'system.status.rested': true }
      await actor.alterResources({ action: -1 }, actorUpdates, {})

      expect(actor.update).toHaveBeenCalledWith({
        'system.resources.action.value': 2,
        'system.status.rested': true,
      })
    })
  })

  describe('getters', () => {
    beforeEach(() => {
      actor.system.resources = {
        health: { value: 10, threshold: 5, max: 20 },
        wounds: { value: 2, max: 10 },
        morale: { value: 12, threshold: 6, max: 20 },
        madness: { value: 3, max: 10 },
      }
    })

    test('isWeakened should be true when health is at or below threshold', () => {
      actor.system.resources.health.value = 5
      expect(actor.isWeakened).toBe(true)

      actor.system.resources.health.value = 3
      expect(actor.isWeakened).toBe(true)

      actor.system.resources.health.value = 6
      expect(actor.isWeakened).toBe(false)
    })

    test('isBroken should be true when morale is at or below threshold', () => {
      actor.system.resources.morale.value = 6
      expect(actor.isBroken).toBe(true)

      actor.system.resources.morale.value = 4
      expect(actor.isBroken).toBe(true)

      actor.system.resources.morale.value = 7
      expect(actor.isBroken).toBe(false)
    })

    test('isDead should be true when health is 0 or below', () => {
      actor.system.resources.health.value = 0
      expect(actor.isDead).toBe(true)

      actor.system.resources.health.value = -1
      expect(actor.isDead).toBe(true)

      actor.system.resources.health.value = 10
      expect(actor.isDead).toBe(false)
    })

    test('isInsane should be true when madness is at max', () => {
      actor.system.resources.madness.value = 10
      expect(actor.isInsane).toBe(true)

      actor.system.resources.madness.value = 5
      expect(actor.isInsane).toBe(false)
    })

    test('isIncapacitated should be true when dead or insane', () => {
      actor.system.resources.health.value = 0
      expect(actor.isIncapacitated).toBe(true)

      actor.system.resources.health.value = 10
      actor.system.resources.madness.value = 10
      expect(actor.isIncapacitated).toBe(true)

      actor.system.resources.madness.value = 5
      expect(actor.isIncapacitated).toBe(false)
    })
  })

  describe('toggleStatusEffect()', () => {
    beforeEach(() => {
      actor.createEmbeddedDocuments = vi.fn().mockResolvedValue([])
      actor.deleteEmbeddedDocuments = vi.fn().mockResolvedValue([])
      actor.effects = new Map()
    })

    test('should create effect when active is true and effect does not exist', async () => {
      CONFIG.statusEffects = [{ id: 'weakened', name: 'Weakened' }]

      await actor.toggleStatusEffect('weakened', { active: true })

      expect(actor.createEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [
        CONFIG.statusEffects[0],
      ])
    })

    test('should delete effect when active is false and effect exists', async () => {
      const mockEffect = { id: 'effect1' }
      actor.effects.set('weakened', mockEffect)

      await actor.toggleStatusEffect('weakened', { active: false })

      expect(actor.deleteEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', ['effect1'])
    })

    test('should not create effect if already exists', async () => {
      const mockEffect = { id: 'effect1' }
      actor.effects.set('weakened', mockEffect)

      await actor.toggleStatusEffect('weakened', { active: true })

      expect(actor.createEmbeddedDocuments).not.toHaveBeenCalled()
    })

    test('should not delete effect if does not exist', async () => {
      await actor.toggleStatusEffect('weakened', { active: false })

      expect(actor.deleteEmbeddedDocuments).not.toHaveBeenCalled()
    })
  })

  describe('rest() and _getRestData()', () => {
    beforeEach(() => {
      actor.update = vi.fn().mockResolvedValue(actor)
      actor.system.resources = {
        health: { value: 5, max: 20, type: 'active' },
        morale: { value: 8, max: 20, type: 'passive' },
        action: { value: 2, max: 6, type: 'active' },
      }
    })

    test('_getRestData should return data to restore resources', () => {
      const restData = actor._getRestData()

      expect(restData).toEqual({
        'system.resources.health.value': 20,
        'system.resources.morale.value': 20,
        'system.resources.action.value': 6,
      })
    })

    test('rest() should update actor with rest data', async () => {
      await actor.rest()

      expect(actor.update).toHaveBeenCalledWith({
        'system.resources.health.value': 20,
        'system.resources.morale.value': 20,
        'system.resources.action.value': 6,
      })
    })

    test('_getRestData should return null if no resources to restore', () => {
      actor.system.resources = {
        health: { value: 20, max: 20, type: 'active' },
      }

      const restData = actor._getRestData()
      expect(restData).toBeNull()
    })
  })
})
