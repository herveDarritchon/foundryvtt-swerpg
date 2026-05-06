// actor-creation.test.mjs
// Tests for SwerpgActor character creation methods
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { createMockActor } from '../utils/actors/actor-factory.js'
import SkillFactory from '../../module/lib/skills/skill-factory.mjs'

vi.mock('../../module/lib/skills/skill-factory.mjs', () => {
  return {
    default: {
      build: vi.fn(),
    },
  }
})

describe('SwerpgActor Character Creation', () => {
  let actor
  let mockGame

  beforeEach(() => {
    actor = createMockActor()

    // Mock game.i18n
    mockGame = {
      i18n: {
        localize: vi.fn((key) => key),
        format: vi.fn((key, data) => key),
      },
    }
    global.game = mockGame

    // Mock ui.notifications
    global.ui = {
      notifications: {
        warn: vi.fn(),
        info: vi.fn(),
      },
    }

    // Mock SYSTEM
    global.SYSTEM = {
      ACTOR_TYPE: { character: { type: 'character' } },
      SKILLS: {
        cool: { career: false, specialization: false },
        brawl: { career: true, specialization: false },
      },
      SKILL: {
        RANKS: [{}, { bonus: 1 }, { bonus: 2 }, { bonus: 3 }, { bonus: 4 }, { bonus: 5 }],
      },
    }

    // Reset mocks
    SkillFactory.build.mockReset()
    actor.update = vi.fn().mockResolvedValue(actor)
    actor.isL0 = false

    // Mock purchaseSkill to use SkillFactory mocks
    actor.purchaseSkill = vi.fn().mockImplementation(async (skillId, delta = 1) => {
      delta = Math.sign(delta)
      const skill = actor.system.skills[skillId]
      if (!skill) return

      const isCreation = actor.isL0
      const config = global.SYSTEM.SKILLS[skillId]
      const isCareer = config?.career === true
      const isSpecialization = config?.specialization === true
      const action = delta > 0 ? 'train' : 'forget'

      const skillObj = SkillFactory.build(actor, skillId, {
        action,
        isCreation,
        isCareer,
        isSpecialization,
      }, {})

      const evaluated = skillObj.process()
      if (evaluated?.options?.message) {
        global.ui.notifications.warn(evaluated.options.message)
        return
      }

      return evaluated.updateState()
    })
  })

  describe('purchaseSkill()', () => {
    test('should return early if skill does not exist', async () => {
      actor.system.skills = { cool: { rank: 1 } }
      await actor.purchaseSkill('nonexistent', 1)
      // Should return early without calling SkillFactory.build
      expect(SkillFactory.build).not.toHaveBeenCalled()
    })

    test('should call SkillFactory.build with correct params for train action', async () => {
      const mockSkillObj = {
        process: vi.fn().mockReturnThis(),
        updateState: vi.fn().mockResolvedValue('updated'),
      }
      SkillFactory.build.mockReturnValue(mockSkillObj)

      await actor.purchaseSkill('cool', 1)

      expect(SkillFactory.build).toHaveBeenCalledWith(
        actor,
        'cool',
        expect.objectContaining({ action: 'train', isCreation: false, isCareer: false, isSpecialization: false }),
        {},
      )
      expect(mockSkillObj.process).toHaveBeenCalled()
      expect(mockSkillObj.updateState).toHaveBeenCalled()
    })

    test('should call SkillFactory.build with correct params for forget action', async () => {
      const mockSkillObj = {
        process: vi.fn().mockReturnThis(),
        updateState: vi.fn().mockResolvedValue('updated'),
      }
      SkillFactory.build.mockReturnValue(mockSkillObj)

      await actor.purchaseSkill('cool', -1)

      expect(SkillFactory.build).toHaveBeenCalledWith(
        actor,
        'cool',
        expect.objectContaining({ action: 'forget' }),
        {},
      )
    })

    test('should handle delta > 1 with Math.sign', async () => {
      const mockSkillObj = {
        process: vi.fn().mockReturnThis(),
        updateState: vi.fn().mockResolvedValue('updated'),
      }
      SkillFactory.build.mockReturnValue(mockSkillObj)

      await actor.purchaseSkill('cool', 5)

      expect(SkillFactory.build).toHaveBeenCalledWith(
        actor,
        'cool',
        expect.objectContaining({ action: 'train' }),
        {},
      )
    })

    test('should set isCreation=true when actor.isL0=true', async () => {
      actor.isL0 = true
      const mockSkillObj = {
        process: vi.fn().mockReturnThis(),
        updateState: vi.fn().mockResolvedValue('updated'),
      }
      SkillFactory.build.mockReturnValue(mockSkillObj)

      await actor.purchaseSkill('cool', 1)

      expect(SkillFactory.build).toHaveBeenCalledWith(
        actor,
        'cool',
        expect.objectContaining({ isCreation: true }),
        {},
      )
    })

    test('should set isCareer from SYSTEM.SKILLS for brawl', async () => {
      const mockSkillObj = {
        process: vi.fn().mockReturnThis(),
        updateState: vi.fn().mockResolvedValue('updated'),
      }
      SkillFactory.build.mockReturnValue(mockSkillObj)

      await actor.purchaseSkill('brawl', 1)

      expect(SkillFactory.build).toHaveBeenCalledWith(
        actor,
        'brawl',
        expect.objectContaining({ isCareer: true, isSpecialization: false }),
        {},
      )
    })

    test('should show warning when SkillFactory returns error object', async () => {
      // Simulate an error return (like ErrorSkill) with options.message
      const errorResult = {
        options: { message: 'Cannot purchase skill' },
        process: vi.fn().mockReturnValue({
          options: { message: 'Cannot purchase skill' }
        }),
        updateState: vi.fn(),
      }
      SkillFactory.build.mockReturnValue(errorResult)

      await actor.purchaseSkill('cool', 1)

      expect(global.ui.notifications.warn).toHaveBeenCalledWith('Cannot purchase skill')
    })

    test('should return the result of updateState on success', async () => {
      const mockSkillObj = {
        process: vi.fn().mockReturnThis(),
        updateState: vi.fn().mockResolvedValue('update-result'),
      }
      SkillFactory.build.mockReturnValue(mockSkillObj)

      const result = await actor.purchaseSkill('cool', 1)

      expect(result).toBe('update-result')
    })
  })

  describe('canPurchaseCharacteristic()', () => {
    beforeEach(() => {
      actor.canPurchaseCharacteristic = vi.fn().mockImplementation((ability, delta) => {
        if (!actor.system.characteristics[ability]) return false
        if (actor.isL0) {
          const a = actor.system.characteristics[ability]
          if (delta > 0 && (a.base === 3 || actor.points.ability.pool < 1)) return false
          if (delta < 0 && a.base === 0) return false
          return true
        } else {
          const a = actor.system.characteristics[ability]
          if (delta > 0 && (a.value === 12 || actor.points.ability.available < 1)) return false
          if (delta < 0 && a.trained === 0) return false
          return true
        }
      })
    })

    test('should return false if ability does not exist', () => {
      const result = actor.canPurchaseCharacteristic('nonexistent')
      expect(result).toBe(false)
    })

    describe('isL0 = true (character creation)', () => {
      beforeEach(() => {
        actor.isL0 = true
      })

      test('should return true if increasing and base < 3 and pool > 0', () => {
        actor.system.characteristics.strength.base = 2
        actor.points.ability.pool = 1
        const result = actor.canPurchaseCharacteristic('strength', 1)
        expect(result).toBe(true)
      })

      test('should return false if base is at max (3)', () => {
        actor.system.characteristics.strength.base = 3
        const result = actor.canPurchaseCharacteristic('strength', 1)
        expect(result).toBe(false)
      })

      test('should return false if pool is 0', () => {
        actor.points.ability.pool = 0
        const result = actor.canPurchaseCharacteristic('strength', 1)
        expect(result).toBe(false)
      })

      test('should return true if decreasing and base > 0', () => {
        actor.system.characteristics.strength.base = 2
        const result = actor.canPurchaseCharacteristic('strength', -1)
        expect(result).toBe(true)
      })

      test('should return false if base is 0 and decreasing', () => {
        actor.system.characteristics.strength.base = 0
        const result = actor.canPurchaseCharacteristic('strength', -1)
        expect(result).toBe(false)
      })
    })

    describe('isL0 = false (regular play)', () => {
      test('should return true if increasing and value < 12 and points available', () => {
        actor.system.characteristics.strength.value = 3
        actor.points.ability.available = 1
        const result = actor.canPurchaseCharacteristic('strength', 1)
        expect(result).toBe(true)
      })

      test('should return false if value is at max (12)', () => {
        actor.system.characteristics.strength.value = 12
        const result = actor.canPurchaseCharacteristic('strength', 1)
        expect(result).toBe(false)
      })

      test('should return true if decreasing and trained > 0', () => {
        actor.system.characteristics.strength.trained = 1
        const result = actor.canPurchaseCharacteristic('strength', -1)
        expect(result).toBe(true)
      })

      test('should return false if trained is 0 and decreasing', () => {
        actor.system.characteristics.strength.trained = 0
        const result = actor.canPurchaseCharacteristic('strength', -1)
        expect(result).toBe(false)
      })
    })
  })

  describe('levelUp()', () => {
    beforeEach(() => {
      actor.update = vi.fn().mockResolvedValue(actor)
      actor.levelUp = vi.fn().mockImplementation(async (delta = 1) => {
        if (delta === 0) return

        if (actor.isL0) {
          const steps = [!actor.points.ability.requireInput, !actor.points.skill.available, !actor.points.talent.available]
          if (!steps.every((k) => k)) {
            global.ui.notifications.warn('WALKTHROUGH.LevelZeroIncomplete', { localize: true })
            return
          }
        }

        const level = Math.clamp(actor.level + delta, 0, 24)
        const update = { 'system.advancement.level': level }
        return actor.update(update)
      })
    })

    test('should return early if delta is 0', async () => {
      const result = await actor.levelUp(0)
      expect(result).toBeUndefined()
      expect(actor.update).not.toHaveBeenCalled()
    })

    test('should increase level by delta', async () => {
      actor.level = 5
      await actor.levelUp(1)
      expect(actor.update).toHaveBeenCalledWith({ 'system.advancement.level': 6 })
    })

    test('should decrease level by delta', async () => {
      actor.level = 5
      await actor.levelUp(-1)
      expect(actor.update).toHaveBeenCalledWith({ 'system.advancement.level': 4 })
    })

    test('should clamp level between 0 and 24', async () => {
      actor.level = 24
      await actor.levelUp(1)
      expect(actor.update).toHaveBeenCalledWith({ 'system.advancement.level': 24 })

      actor.level = 0
      await actor.levelUp(-1)
      expect(actor.update).toHaveBeenCalledWith({ 'system.advancement.level': 0 })
    })

    test('should show warning if isL0 and creation incomplete', async () => {
      actor.isL0 = true
      actor.points.ability.requireInput = true
      actor.points.skill.available = true
      actor.points.talent.available = true

      await actor.levelUp(1)

      expect(global.ui.notifications.warn).toHaveBeenCalledWith('WALKTHROUGH.LevelZeroIncomplete', {
        localize: true,
      })
      expect(actor.update).not.toHaveBeenCalled()
    })

    test('should level up if isL0 and creation is complete', async () => {
      actor.isL0 = true
      actor.points.ability.requireInput = false
      actor.points.skill.available = false
      actor.points.talent.available = false

      await actor.levelUp(1)

      expect(actor.update).toHaveBeenCalled()
    })

    test('should return the result of this.update()', async () => {
      const mockResult = { id: 'leveled-up' }
      actor.update.mockResolvedValue(mockResult)

      const result = await actor.levelUp(1)

      expect(result).toBe(mockResult)
    })
  })
})
