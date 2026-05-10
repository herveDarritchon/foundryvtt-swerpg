// skill-base.test.mjs - Tests for abstract Skill base class
import '../../setupTests.js'
import { describe, expect, test } from 'vitest'

import Skill from '../../../module/lib/skills/skill.mjs'
import { createSkillData } from '../../utils/skills/skill.mjs'
import { createActor } from '../../utils/actors/actor.mjs'

describe('Skill Base Class', () => {
  describe('abstract methods', () => {
    test('process() should throw error when called on base class', () => {
      const skill = new Skill({}, {}, {}, {})
      expect(() => skill.process()).toThrow("Method 'process()' must be implemented.")
    })

    test('updateState() should return an error when skill has not been evaluated', async () => {
      const actor = createActor()
      const data = createSkillData()

      const skill = new Skill(actor, data, {}, {})

      expect(() => skill.updateState()).toThrow
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

    test('should only deep clone data', () => {
      const actor = { id: 'actor-1', nested: { value: 1 } }
      const data = { rank: { trained: 1 }, nested: { value: 2 } }
      const params = { action: 'train', isCreation: false, isCareer: false, isSpecialization: false }
      const options = {}

      const skill = new Skill(actor, data, params, options)

      // Modifying original should not affect cloned
      actor.id = 'modified'
      data.rank.trained = 999

      expect(skill.actor.id).toBe('modified')
      expect(skill.data.rank.trained).toBe(1)
    })
  })
})
