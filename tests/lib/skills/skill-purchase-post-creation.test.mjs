// Skill-purchase-post-creation.test.mjs
import '../../setupTests.js'
import { describe, expect, test, vi } from 'vitest'

import SkillFactory from '../../../module/lib/skills/skill-factory.mjs'
import TrainedSkill from '../../../module/lib/skills/trained-skill.mjs'
import CareerFreeSkill from '../../../module/lib/skills/career-free-skill.mjs'
import SpecializationFreeSkill from '../../../module/lib/skills/specialization-free-skill.mjs'
import ErrorSkill from '../../../module/lib/skills/error-skill.mjs'
import { createActor } from '../../utils/actors/actor.mjs'

describe('SkillFactory post-creation (isCreation=false)', () => {
  describe('action: train', () => {
    test('returns TrainedSkill', () => {
      const actor = createActor()
      const skill = SkillFactory.build(actor, 'brawl', { action: 'train', isCreation: false, isCareer: false, isSpecialization: false })
      expect(skill).toBeInstanceOf(TrainedSkill)
    })
  })

  describe('action: forget', () => {
    test('careerFree > 0 returns CareerFreeSkill', () => {
      const actor = createActor()
      actor.system.skills.brawl.rank.careerFree = 1
      actor.system.skills.brawl.rank.value = 1
      const skill = SkillFactory.build(actor, 'brawl', { action: 'forget', isCreation: false, isCareer: true, isSpecialization: false })
      expect(skill).toBeInstanceOf(CareerFreeSkill)
    })

    test('specializationFree > 0 returns SpecializationFreeSkill', () => {
      const actor = createActor()
      actor.system.skills.brawl.rank.specializationFree = 1
      actor.system.skills.brawl.rank.value = 1
      const skill = SkillFactory.build(actor, 'brawl', { action: 'forget', isCreation: false, isCareer: false, isSpecialization: true })
      expect(skill).toBeInstanceOf(SpecializationFreeSkill)
    })

    test('trained > 0 returns TrainedSkill', () => {
      const actor = createActor()
      actor.system.skills.brawl.rank.trained = 1
      actor.system.skills.brawl.rank.value = 1
      const skill = SkillFactory.build(actor, 'brawl', { action: 'forget', isCreation: false, isCareer: false, isSpecialization: false })
      expect(skill).toBeInstanceOf(TrainedSkill)
    })

    test('base > 0 only returns ErrorSkill', () => {
      const actor = createActor()
      actor.system.skills.brawl.rank.base = 1
      actor.system.skills.brawl.rank.value = 1
      const skill = SkillFactory.build(actor, 'brawl', { action: 'forget', isCreation: false, isCareer: false, isSpecialization: false })
      expect(skill).toBeInstanceOf(ErrorSkill)
    })

    test('no ranks returns TrainedSkill (default fallback)', () => {
      const actor = createActor()
      const skill = SkillFactory.build(actor, 'brawl', { action: 'forget', isCreation: false, isCareer: false, isSpecialization: false })
      expect(skill).toBeInstanceOf(TrainedSkill)
    })
  })
})

describe('Post-creation forget integration', () => {
  test('CareerFreeSkill forget process + updateState', async () => {
    const actor = createActor()
    actor.system.skills.brawl.rank.careerFree = 1
    actor.system.skills.brawl.rank.value = 1
    actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
    actor.update = vi.fn().mockResolvedValue({})

    const skill = SkillFactory.build(actor, 'brawl', { action: 'forget', isCreation: false, isCareer: true, isSpecialization: false })
    expect(skill).toBeInstanceOf(CareerFreeSkill)

    const processed = await skill.process()
    expect(processed.data.rank.careerFree).toBe(0)
    expect(processed.data.rank.value).toBe(0)

    const updated = await processed.updateState()
    expect(updated).toBeInstanceOf(CareerFreeSkill)
    expect(actor.update).toHaveBeenCalledWith({
      'system.skills.brawl.rank': {
        base: 0, careerFree: 0, specializationFree: 0, trained: 0, value: 0,
      },
    })
  })

  test('SpecializationFreeSkill forget process + updateState', async () => {
    const actor = createActor({ specializationSpent: 1 })
    actor.system.skills.brawl.rank.specializationFree = 1
    actor.system.skills.brawl.rank.value = 1
    actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)
    actor.update = vi.fn().mockResolvedValue({})

    const skill = SkillFactory.build(actor, 'brawl', { action: 'forget', isCreation: false, isCareer: false, isSpecialization: true })
    expect(skill).toBeInstanceOf(SpecializationFreeSkill)

    const processed = await skill.process()
    expect(processed.data.rank.specializationFree).toBe(0)
    expect(processed.data.rank.value).toBe(0)

    const updated = await processed.updateState()
    expect(updated).toBeInstanceOf(SpecializationFreeSkill)
    expect(actor.updateFreeSkillRanks).toHaveBeenCalledWith('specialization', { spent: 0 })
  })

  test('TrainedSkill forget process + updateState', async () => {
    const actor = createActor()
    actor.system.skills.brawl.rank.trained = 2
    actor.system.skills.brawl.rank.value = 2
    actor.system.progression.experience.spent = 25
    actor.system.progression.experience.gained = 100
    actor.updateExperiencePoints = vi.fn().mockResolvedValue(actor)
    actor.update = vi.fn().mockResolvedValue({})

    const skill = SkillFactory.build(actor, 'brawl', { action: 'forget', isCreation: false, isCareer: true, isSpecialization: false })
    expect(skill).toBeInstanceOf(TrainedSkill)

    const processed = await skill.process()
    expect(processed.data.rank.trained).toBe(1)
    expect(processed.data.rank.value).toBe(1)
    expect(actor.updateExperiencePoints).toHaveBeenCalledWith({ spent: 15 })
  })

  test('TrainedSkill train process + updateState (post-creation)', async () => {
    const actor = createActor()
    actor.system.skills.brawl.rank.trained = 1
    actor.system.skills.brawl.rank.value = 1
    actor.system.progression.experience.spent = 10
    actor.system.progression.experience.gained = 100
    actor.updateExperiencePoints = vi.fn().mockResolvedValue(actor)
    actor.update = vi.fn().mockResolvedValue({})

    const skill = SkillFactory.build(actor, 'brawl', { action: 'train', isCreation: false, isCareer: true, isSpecialization: false })
    expect(skill).toBeInstanceOf(TrainedSkill)

    const processed = await skill.process()
    expect(processed.data.rank.trained).toBe(2)
    expect(processed.data.rank.value).toBe(2)
    expect(actor.updateExperiencePoints).toHaveBeenCalledWith({ spent: 20 })
  })
})
