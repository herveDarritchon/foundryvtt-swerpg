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
      // Mock the update method
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
})
