// error-skill.test.mjs
import '../../setupTests.js'
import { describe, expect, test } from 'vitest'

import { createActor } from '../../utils/actors/actor.mjs'
import { createSkillData } from '../../utils/skills/skill.mjs'
import ErrorSkill from '../../../module/lib/skills/error-skill.mjs'

describe('ErrorSkill', () => {
  test('should keep the original error message', () => {
    const actor = createActor()
    const data = createSkillData()
    const params = {}
    const options = {
      message: 'Original business error',
    }

    const errorSkill = new ErrorSkill(actor, data, params, options)

    expect(errorSkill).toBeInstanceOf(ErrorSkill)
    expect(errorSkill.options.message).toBe('Original business error')
  })

  test('process should return the same ErrorSkill without changing the message', () => {
    const actor = createActor()
    const data = createSkillData()
    const params = {}
    const options = {
      message: 'Original business error',
    }

    const errorSkill = new ErrorSkill(actor, data, params, options)

    const result = errorSkill.process()

    expect(result).toBe(errorSkill)
    expect(result).toBeInstanceOf(ErrorSkill)
    expect(result.options.message).toBe('Original business error')
  })

  test('updateState should return the same ErrorSkill without changing the message', async () => {
    const actor = createActor()
    const data = createSkillData()
    const params = {}
    const options = {
      message: 'Original business error',
    }

    const errorSkill = new ErrorSkill(actor, data, params, options)

    const result = await errorSkill.updateState()

    expect(result).toBe(errorSkill)
    expect(result).toBeInstanceOf(ErrorSkill)
    expect(result.options.message).toBe('Original business error')
  })

  test('getCost should return 0', () => {
    const actor = createActor()
    const data = createSkillData()
    const params = {}
    const options = {
      message: 'Original business error',
    }

    const errorSkill = new ErrorSkill(actor, data, params, options)

    expect(errorSkill.getCost()).toBe(0)
  })

  test('createError should update the message and return itself', () => {
    const actor = createActor()
    const data = createSkillData()
    const params = {}
    const options = {
      message: 'Original business error',
    }

    const errorSkill = new ErrorSkill(actor, data, params, options)

    const result = errorSkill.createError('New error message')

    expect(result).toBe(errorSkill)
    expect(result.options.message).toBe('New error message')
  })
})
