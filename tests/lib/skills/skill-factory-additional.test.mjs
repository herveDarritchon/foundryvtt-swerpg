// skill-factory-additional.test.mjs - Additional tests for SkillFactory
import '../../setupTests.js'
import { describe, expect, test } from 'vitest'

import SkillFactory from '../../../module/lib/skills/skill-factory.mjs'
import { createActor } from '../../utils/actors/actor.mjs'
import TrainedSkill from '../../../module/lib/skills/trained-skill.mjs'
import CareerFreeSkill from '../../../module/lib/skills/career-free-skill.mjs'
import SpecializationFreeSkill from '../../../module/lib/skills/specialization-free-skill.mjs'
import ErrorSkill from '../../../module/lib/skills/error-skill.mjs'

describe('SkillFactory - Additional Coverage', () => {
  describe('edge cases during creation', () => {
    test('should return TrainedSkill when isCareer and isSpecialization but no free ranks and has XP', () => {
      const actor = createActor({ careerSpent: 4, specializationSpent: 2 })
      actor.system.progression.experience.gained = 100
      actor.system.progression.experience.total = 100
      actor.system.progression.experience.spent = 0

      const skillId = 'brawl'
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: true,
        isSpecialization: true,
      }
      const options = {}

      const skill = SkillFactory.build(actor, skillId, params, options)
      expect(skill).toBeInstanceOf(TrainedSkill)
    })

    test('should return ErrorSkill when has both free ranks but clicks on non-free skill during creation', () => {
      const actor = createActor() // Has free career and specialization ranks
      const skillId = 'brawl'
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: false, // Neither career nor specialization
        isSpecialization: false,
      }
      const options = {}

      const skill = SkillFactory.build(actor, skillId, params, options)
      expect(skill).toBeInstanceOf(ErrorSkill)
      expect(skill.options.message).toBe('you have to spend free skill points first during character creation!')
    })

    test('should return CareerFreeSkill when both free ranks available, careerFree is 0, action train', () => {
      const actor = createActor()
      const skillId = 'brawl'
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: true,
        isSpecialization: false,
      }
      const options = {}

      const skill = SkillFactory.build(actor, skillId, params, options)
      expect(skill).toBeInstanceOf(CareerFreeSkill)
    })

    test('should return SpecializationFreeSkill when both free ranks available, specializationFree is 0, action train', () => {
      const actor = createActor()
      const skillId = 'brawl'
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: false,
        isSpecialization: true,
      }
      const options = {}

      const skill = SkillFactory.build(actor, skillId, params, options)
      expect(skill).toBeInstanceOf(SpecializationFreeSkill)
    })
  })

  describe('edge cases not during creation', () => {
    test('should always return TrainedSkill when isCreation is false', () => {
      const actor = createActor()
      const skillId = 'brawl'

      // Test all combinations with isCreation = false
      const combinations = [
        { isCareer: true, isSpecialization: true },
        { isCareer: true, isSpecialization: false },
        { isCareer: false, isSpecialization: true },
        { isCareer: false, isSpecialization: false },
      ]

      for (const params of combinations) {
        const skill = SkillFactory.build(actor, skillId, { ...params, action: 'train', isCreation: false }, {})
        expect(skill).toBeInstanceOf(TrainedSkill)
      }
    })

    test('should return TrainedSkill for forget action when not in creation', () => {
      const actor = createActor()
      actor.system.progression.experience.spent = 10
      actor.system.progression.experience.gained = 100
      actor.system.progression.experience.total = 100
      const skillId = 'brawl'
      const params = {
        action: 'forget',
        isCreation: false,
        isCareer: true,
        isSpecialization: false,
      }
      const options = {}

      const skill = SkillFactory.build(actor, skillId, params, options)
      expect(skill).toBeInstanceOf(TrainedSkill)
    })
  })

  describe('factory builds correct skill types', () => {
    test('should build TrainedSkill when not in creation and has XP', () => {
      const actor = createActor()
      actor.system.progression.experience.gained = 100
      actor.system.progression.experience.total = 100
      actor.system.progression.experience.available = 100
      const skillId = 'brawl'
      const params = {
        action: 'train',
        isCreation: false,
        isCareer: false,
        isSpecialization: false,
      }
      const options = {}

      const skill = SkillFactory.build(actor, skillId, params, options)
      expect(skill).toBeInstanceOf(TrainedSkill)
    })

    test('should build ErrorSkill when in creation and tries to train a non-free skill', () => {
      const actor = createActor() // Has free ranks available
      const skillId = 'brawl'
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: false, // Non-free skill
        isSpecialization: false,
      }
      const options = {}

      const skill = SkillFactory.build(actor, skillId, params, options)
      expect(skill).toBeInstanceOf(ErrorSkill)
      expect(skill.options.message).toBe('you have to spend free skill points first during character creation!')
    })
  })
})
