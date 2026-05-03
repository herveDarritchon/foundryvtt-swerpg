// skill-base.test.mjs - Tests for abstract Skill base class
import '../../setupTests.js'
import { describe, expect, test } from 'vitest'

import Skill from '../../../module/lib/skills/skill.mjs'

describe('Skill Base Class', () => {
  describe('abstract methods', () => {
    test('process() should throw error when called on base class', () => {
      const skill = new Skill({}, {}, {}, {})
      expect(() => skill.process()).toThrow("Method 'process()' must be implemented.")
    })

    test('updateState() should throw error when called on base class', async () => {
      const skill = new Skill({}, {}, {}, {})
      await expect(skill.updateState()).rejects.toThrow("Method 'updateState()' must be implemented.")
    })
  })

  describe('constructor', () => {
    test('should set properties correctly', () => {
      const actor = { id: 'actor-1' }
      const data = { rank: { trained: 1 } }
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: true,
        isSpecialization: false,
      }
      const options = { message: 'test' }

      const skill = new Skill(actor, data, params, options)

      expect(skill.actor).toEqual(actor)
      expect(skill.data).toEqual(data)
      expect(skill.isCreation).toBe(true)
      expect(skill.isCareer).toBe(true)
      expect(skill.isSpecialization).toBe(false)
      expect(skill.action).toBe('train')
      expect(skill.options).toEqual(options)
      expect(skill.evaluated).toBe(false)
    })

    test('should deep clone actor and data', () => {
      const actor = { id: 'actor-1', nested: { value: 1 } }
      const data = { rank: { trained: 1 }, nested: { value: 2 } }
      const params = { action: 'train', isCreation: false, isCareer: false, isSpecialization: false }
      const options = {}

      const skill = new Skill(actor, data, params, options)

      // Modifying original should not affect cloned
      actor.id = 'modified'
      data.rank.trained = 999

      expect(skill.actor.id).toBe('actor-1')
      expect(skill.data.rank.trained).toBe(1)
    })
  })
})
