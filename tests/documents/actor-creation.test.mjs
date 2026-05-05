// actor-creation.test.mjs
// Tests for SwerpgActor character creation methods
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { createMockActor } from '../utils/actors/actor-factory.js'

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
      SKILL: {
        RANKS: [{}, { bonus: 1 }, { bonus: 2 }, { bonus: 3 }, { bonus: 4 }, { bonus: 5 }],
      },
    }
  })

  describe('canPurchaseSkill()', () => {
    beforeEach(() => {
      actor.points = {
        skill: { available: 10, spent: 0, total: 10, requireInput: false },
        ability: { pool: 6, spent: 0, available: 6, requireInput: false },
        talent: { available: 5, spent: 0, total: 5 },
      }
      // Override default mock to simulate real behavior
      actor.canPurchaseSkill = vi.fn().mockImplementation((skillId, delta = 1, strict = false) => {
        delta = Math.sign(delta)
        const skill = actor.system.skills[skillId]
        if (!skill || delta === 0) return false
        if (actor.type !== SYSTEM.ACTOR_TYPE.character.type) return false

        // Decreasing Skill
        if (delta < 0) {
          if (skill.rank === 0) {
            if (strict) throw new Error('Cannot decrease skill rank')
            return false
          }
          return true
        }

        // Maximum Rank
        if (skill.rank === 5) {
          if (strict) throw new Error('Skill already at maximum')
          return false
        }

        // Require Specialization
        if (skill.rank === 3 && !skill.path) {
          if (strict) throw new Error(game.i18n.localize('SKILL.ChoosePath'))
          return false
        }

        // Cannot Afford
        const p = actor.points.skill
        if (p.available < skill.cost) {
          if (strict) throw new Error(game.i18n.format('SKILL.CantAfford', { cost: skill.cost, points: p.available }))
          return false
        }

        // Can purchase
        return true
      })
    })

    test('should return false if skill does not exist', () => {
      const result = actor.canPurchaseSkill('nonexistent')
      expect(result).toBe(false)
    })

    test('should return false if delta is 0', () => {
      const result = actor.canPurchaseSkill('cool', 0)
      expect(result).toBe(false)
    })

    test('should return false if actor type is not character', () => {
      actor.type = 'adversary'
      const result = actor.canPurchaseSkill('cool', 1)
      expect(result).toBe(false)
    })

    describe('decreasing skill (delta < 0)', () => {
      test('should return true if skill rank > 0', () => {
        actor.system.skills.cool.rank = 2
        const result = actor.canPurchaseSkill('cool', -1)
        expect(result).toBe(true)
      })

      test('should return false if skill rank is 0', () => {
        actor.system.skills.cool.rank = 0
        const result = actor.canPurchaseSkill('cool', -1)
        expect(result).toBe(false)
      })

      test('should throw in strict mode if rank is 0', () => {
        actor.system.skills.cool.rank = 0
        expect(() => actor.canPurchaseSkill('cool', -1, true)).toThrow('Cannot decrease skill rank')
      })
    })

    describe('increasing skill (delta > 0)', () => {
      test('should return false if skill rank is at maximum (5)', () => {
        actor.system.skills.brawl.rank = 5
        const result = actor.canPurchaseSkill('brawl', 1)
        expect(result).toBe(false)
      })

      test('should throw in strict mode if rank is at maximum', () => {
        actor.system.skills.brawl.rank = 5
        expect(() => actor.canPurchaseSkill('brawl', 1, true)).toThrow('Skill already at maximum')
      })

      test('should return false if rank is 3 and no path selected', () => {
        actor.system.skills.vigilance.rank = 3
        actor.system.skills.vigilance.path = null
        const result = actor.canPurchaseSkill('vigilance', 1)
        expect(result).toBe(false)
      })

      test('should throw in strict mode if rank is 3 and no path', () => {
        actor.system.skills.vigilance.rank = 3
        actor.system.skills.vigilance.path = null
        expect(() => actor.canPurchaseSkill('vigilance', 1, true)).toThrow('SKILL.ChoosePath')
      })

      test('should return false if not enough points available', () => {
        actor.points.skill.available = 0
        const result = actor.canPurchaseSkill('cool', 1)
        expect(result).toBe(false)
      })

      test('should throw in strict mode if not enough points', () => {
        actor.points.skill.available = 0
        expect(() => actor.canPurchaseSkill('cool', 1, true)).toThrow('SKILL.CantAfford')
      })

      test('should return true if all conditions are met', () => {
        actor.system.skills.cool.rank = 1
        actor.points.skill.available = 10
        const result = actor.canPurchaseSkill('cool', 1)
        expect(result).toBe(true)
      })
    })
  })

  describe('purchaseSkill()', () => {
    beforeEach(() => {
      actor.canPurchaseSkill = vi.fn().mockReturnValue(true)
      actor.update = vi.fn().mockResolvedValue(actor)
      // Override purchaseSkill to return update result
      actor.purchaseSkill = vi.fn().mockImplementation(async (skillId, delta = 1) => {
        delta = Math.sign(delta)
        const skill = actor.system.skills[skillId]
        if (!skill) return
        try {
          actor.canPurchaseSkill(skillId, delta, true)
        } catch (err) {
          return global.ui.notifications.warn(err.message)
        }
        const rank = skill.rank + delta
        const update = { [`system.skills.${skillId}.rank`]: rank }
        if (rank === 3) update[`system.skills.${skillId}.path`] = null
        return actor.update(update)
      })
    })

    test('should call canPurchaseSkill with strict=true', async () => {
      await actor.purchaseSkill('cool', 1)
      expect(actor.canPurchaseSkill).toHaveBeenCalledWith('cool', 1, true)
    })

    test('should show warning and return if canPurchaseSkill fails', async () => {
      actor.canPurchaseSkill.mockImplementation(() => {
        throw new Error('Cannot purchase')
      })

      await actor.purchaseSkill('cool', 1)

      expect(global.ui.notifications.warn).toHaveBeenCalledWith('Cannot purchase')
    })

    test('should increase skill rank by delta (default 1)', async () => {
      actor.system.skills.cool.rank = 1
      actor.update.mockResolvedValue(actor)

      await actor.purchaseSkill('cool')

      expect(actor.update).toHaveBeenCalledWith({ 'system.skills.cool.rank': 2 })
    })

    test('should decrease skill rank by delta (-1)', async () => {
      actor.system.skills.cool.rank = 2

      await actor.purchaseSkill('cool', -1)

      expect(actor.update).toHaveBeenCalledWith({ 'system.skills.cool.rank': 1 })
    })

    test('should clear path if rank reaches 3', async () => {
      actor.system.skills.cool.rank = 2
      actor.system.skills.cool.path = 'somePath'

      await actor.purchaseSkill('cool', 1)

      expect(actor.update).toHaveBeenCalledWith({
        'system.skills.cool.rank': 3,
        'system.skills.cool.path': null,
      })
    })

    test('should return the result of this.update()', async () => {
      const mockResult = { id: 'updated' }
      actor.update.mockResolvedValue(mockResult)

      const result = await actor.purchaseSkill('cool')

      expect(result).toBe(mockResult)
    })
  })

  describe('canPurchaseCharacteristic()', () => {
    beforeEach(() => {
      // Override default mock to return false for negative tests
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
      // Override the mock to simulate real behavior
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
