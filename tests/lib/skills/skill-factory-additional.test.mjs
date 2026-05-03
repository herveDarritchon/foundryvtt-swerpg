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
      actor.experiencePoints.gained = 100
      actor.experiencePoints.total = 100
      actor.experiencePoints.available = 100

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
      actor.system.skills.brawl.rank.trained = 1
      const skillId = 'brawl'

      const skill = SkillFactory.build(actor, skillId, {
        action: 'forget',
        isCreation: false,
        isCareer: false,
        isSpecialization: false,
      }, {})

      expect(skill).toBeInstanceOf(TrainedSkill)
    })
  })

  describe('private methods coverage', () => {
    test('#hasCareerFreeSkill should return true when available > 0', () => {
      const actor = createActor() // career.available = 4 by default
      const skillId = 'brawl'
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: false,
        isSpecialization: false,
      }
      const options = {}

      // This should return ErrorSkill because hasCareerFreeSkill returns true
      const skill = SkillFactory.build(actor, skillId, params, options)
      expect(skill).toBeInstanceOf(ErrorSkill)
    })

    test('#hasCareerFreeSkill should return false when available = 0', () => {
      const actor = createActor({ careerSpent: 4, specializationSpent: 2 })
      // Need to manually set available since createActor hardcodes it
      actor.freeSkillRanks.career.available = 0
      actor.freeSkillRanks.specialization.available = 0

      const skillId = 'brawl'
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: false,
        isSpecialization: false,
      }
      const options = {}

      // This should return TrainedSkill because hasCareerFreeSkill returns false
      const skill = SkillFactory.build(actor, skillId, params, options)
      expect(skill).toBeInstanceOf(TrainedSkill)
    })

    test('#hasSpecializationFreeSkill should return true when available > 0', () => {
      const actor = createActor() // specialization.available = 2 by default
      const skillId = 'brawl'
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: false,
        isSpecialization: false,
      }
      const options = {}

      // This should return ErrorSkill because hasSpecializationFreeSkill returns true
      const skill = SkillFactory.build(actor, skillId, params, options)
      expect(skill).toBeInstanceOf(ErrorSkill)
    })
  })

  describe('buildCareerOrSpecialization edge cases', () => {
    test('should return TrainedSkill when both free ranks spent and training', () => {
      const actor = createActor({ careerSpent: 4, specializationSpent: 2 })
      actor.experiencePoints.gained = 100
      actor.experiencePoints.total = 100
      actor.experiencePoints.available = 100

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

    test('should prioritize CareerFreeSkill when both free ranks available and careerFree is 0', () => {
      const actor = createActor({ careerSpent: 0, specializationSpent: 0 })
      actor.system.skills.brawl.rank.careerFree = 0
      actor.system.skills.brawl.rank.specializationFree = 0

      const skillId = 'brawl'
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: true,
        isSpecialization: true,
      }
      const options = {}

      const skill = SkillFactory.build(actor, skillId, params, options)
      expect(skill).toBeInstanceOf(CareerFreeSkill)
    })

    test('should return SpecializationFreeSkill when career rank already used', () => {
      const actor = createActor({ careerSpent: 1 })
      actor.system.skills.brawl.rank.careerFree = 1

      const skillId = 'brawl'
      const params = {
        action: 'train',
        isCreation: true,
        isCareer: true,
        isSpecialization: true,
      }
      const options = {}

      const skill = SkillFactory.build(actor, skillId, params, options)
      expect(skill).toBeInstanceOf(SpecializationFreeSkill)
    })
  })
})
