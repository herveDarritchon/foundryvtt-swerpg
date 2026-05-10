import '../../setupTests.js'
import { describe, expect, test, vi } from 'vitest'

import { createActor } from '../../utils/actors/actor.mjs'
import { createSkillData, TEST_SKILL_ID } from '../../utils/skills/skill.mjs'
import CareerFreeSkill from '../../../module/lib/skills/career-free-skill.mjs'
import SpecializationFreeSkill from '../../../module/lib/skills/specialization-free-skill.mjs'
import TrainedSkill from '../../../module/lib/skills/trained-skill.mjs'

describe('Post-creation forget integration', () => {
  test('CareerFreeSkill forget process + updateState', async () => {
    const actor = createActor({ careerSpent: 1 })

    actor.update = vi.fn().mockResolvedValue(actor)
    actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)

    const data = createSkillData({
      careerFree: 1,
      value: 1,
    })

    const skill = new CareerFreeSkill(
      actor,
      data,
      {
        action: 'forget',
        isCreation: false,
        isCareer: true,
        isSpecialization: false,
      },
      {},
    )

    const processed = await skill.process()

    expect(processed).toBeInstanceOf(CareerFreeSkill)
    expect(processed.data.rank.careerFree).toBe(0)
    expect(processed.data.rank.value).toBe(0)

    expect(processed.updateData).toEqual({
      'system.progression.freeSkillRanks.career.spent': 0,
      [`system.skills.${TEST_SKILL_ID}.rank`]: {
        base: 0,
        careerFree: 0,
        specializationFree: 0,
        trained: 0,
        value: 0,
      },
    })

    const updated = await processed.updateState()

    expect(updated).toBeInstanceOf(CareerFreeSkill)
    expect(actor.updateFreeSkillRanks).not.toHaveBeenCalled()
    expect(actor.update).toHaveBeenCalledWith(processed.updateData)
  })

  test('SpecializationFreeSkill forget process + updateState', async () => {
    const actor = createActor({ specializationSpent: 1 })

    actor.update = vi.fn().mockResolvedValue(actor)
    actor.updateFreeSkillRanks = vi.fn().mockResolvedValue(actor)

    const data = createSkillData({
      specializationFree: 1,
      value: 1,
    })

    const skill = new SpecializationFreeSkill(
      actor,
      data,
      {
        action: 'forget',
        isCreation: false,
        isCareer: false,
        isSpecialization: true,
      },
      {},
    )

    const processed = await skill.process()

    expect(processed).toBeInstanceOf(SpecializationFreeSkill)
    expect(processed.data.rank.specializationFree).toBe(0)
    expect(processed.data.rank.value).toBe(0)

    expect(processed.updateData).toEqual({
      'system.progression.freeSkillRanks.specialization.spent': 0,
      [`system.skills.${TEST_SKILL_ID}.rank`]: {
        base: 0,
        careerFree: 0,
        specializationFree: 0,
        trained: 0,
        value: 0,
      },
    })

    const updated = await processed.updateState()

    expect(updated).toBeInstanceOf(SpecializationFreeSkill)
    expect(actor.updateFreeSkillRanks).not.toHaveBeenCalled()
    expect(actor.update).toHaveBeenCalledWith(processed.updateData)
  })

  test('TrainedSkill forget process + updateState', async () => {
    const actor = createActor()

    actor.system.progression.experience.spent = 30
    actor.system.progression.experience.total = 100

    actor.update = vi.fn().mockResolvedValue(actor)
    actor.updateExperiencePoints = vi.fn().mockResolvedValue(actor)

    const data = createSkillData({
      trained: 2,
      value: 2,
    })

    const skill = new TrainedSkill(
      actor,
      data,
      {
        action: 'forget',
        isCreation: false,
        isCareer: false,
        isSpecialization: false,
      },
      {},
    )

    const processed = await skill.process()

    expect(processed).toBeInstanceOf(TrainedSkill)
    expect(processed.data.rank.trained).toBe(1)
    expect(processed.data.rank.value).toBe(1)
    expect(processed.updateData['system.progression.experience.spent']).toBe(15)

    const updated = await processed.updateState()

    expect(updated).toBeInstanceOf(TrainedSkill)
    expect(actor.updateExperiencePoints).not.toHaveBeenCalled()
    expect(actor.update).toHaveBeenCalledWith(processed.updateData)
  })

  test('TrainedSkill train process + updateState post-creation', async () => {
    const actor = createActor()

    actor.system.progression.experience.spent = 10
    actor.system.progression.experience.total = 100

    actor.update = vi.fn().mockResolvedValue(actor)
    actor.updateExperiencePoints = vi.fn().mockResolvedValue(actor)

    const data = createSkillData({
      trained: 1,
      value: 1,
    })

    const skill = new TrainedSkill(
      actor,
      data,
      {
        action: 'train',
        isCreation: false,
        isCareer: false,
        isSpecialization: false,
      },
      {},
    )

    const processed = await skill.process()

    expect(processed).toBeInstanceOf(TrainedSkill)
    expect(processed.data.rank.trained).toBe(2)
    expect(processed.data.rank.value).toBe(2)
    expect(processed.updateData['system.progression.experience.spent']).toBe(25)

    const updated = await processed.updateState()

    expect(updated).toBeInstanceOf(TrainedSkill)
    expect(actor.updateExperiencePoints).not.toHaveBeenCalled()
    expect(actor.update).toHaveBeenCalledWith(processed.updateData)
  })
})
