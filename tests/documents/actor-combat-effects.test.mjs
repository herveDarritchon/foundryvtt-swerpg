/**
 * Tests for Effects Manager Mixin
 * Chantier 05 - Combat refactoring (Issue #48)
 */

// Mock base class for testing mixins
class MockBase {
  constructor(data = {}) {
    this.effects = new Map()
    this.isWeakened = data.isWeakened || false
    this.isBroken = data.isBroken || false
    this.isIncapacitated = data.isIncapacitated || false
    this.resistances = data.resistances || {}
    this.system = data.system || {}

    this.callActorHooks = jest.fn()
    this.alterResources = jest.fn().mockResolvedValue()
    this.deleteEmbeddedDocuments = jest.fn().mockResolvedValue()
    this.updateEmbeddedDocuments = jest.fn().mockResolvedValue()
    this.createEmbeddedDocuments = jest.fn().mockResolvedValue()
  }
}

// Import the mixin
import { EffectsMixin } from '../../module/documents/actor-mixins/combat/effects.mixin.mjs'

class TestActor extends EffectsMixin(MockBase) {}

describe('EffectsMixin', () => {
  let actor

  beforeEach(() => {
    actor = new TestActor()

    // Mock game
    global.game = {
      combat: { round: 1, active: true },
      settings: {
        get: jest.fn().mockReturnValue(0),
        set: jest.fn().mockResolvedValue()
      }
    }
  })

  describe('applyDamageOverTime()', () => {
    test('should apply DOT from effects', async () => {
      actor.effects.set('dot-1', {
        flags: { swerpg: { dot: { health: 5, damageType: 'poison' } } }
      })
      actor.resistances = { poison: { total: 2 } }

      await actor.applyDamageOverTime()

      expect(actor.alterResources).toHaveBeenCalled()
    })

    test('should skip effects without dot flag', async () => {
      actor.effects.set('no-dot', {
        flags: {}
      })

      await actor.applyDamageOverTime()

      expect(actor.alterResources).not.toHaveBeenCalled()
    })
  })

  describe('_isEffectExpired()', () => {
    test('should return false for start turn if turn-based effect', () => {
      const effect = {
        duration: { turns: 2, startRound: 1 }
      }

      // At start of turn, turn-based effects don't expire
      const result = actor._isEffectExpired(effect, true)
      expect(result).toBe(false)
    })

    test('should return true for end turn if turns elapsed', () => {
      const effect = {
        duration: { turns: 1, startRound: 1 }
      }

      // At end of turn, effect with turns=1 should expire
      const result = actor._isEffectExpired(effect, false)
      expect(result).toBe(true)
    })

    test('should return true for start turn if rounds elapsed', () => {
      const effect = {
        duration: { rounds: 1, startRound: 1 }
      }

      // At start of next turn, effect with rounds=1 should expire
      const result = actor._isEffectExpired(effect, true)
      expect(result).toBe(true)
    })
  })

  describe('expireEffects()', () => {
    test('should delete expired effects', async () => {
      const expiredEffect = {
        id: 'effect-1',
        duration: { turns: 1, startRound: 0 },
        _isEffectExpired: true
      }

      actor.effects.set('effect-1', expiredEffect)
      actor.effects.set('effect-2', {
        id: 'effect-2',
        duration: { turns: 5, startRound: 1 }
      })

      // Mock _isEffectExpired
      actor._isEffectExpired = jest.fn((effect, start) => effect.id === 'effect-1')

      await actor.expireEffects(true)

      expect(actor.deleteEmbeddedDocuments).toHaveBeenCalledWith(
        'ActiveEffect',
        ['effect-1']
      )
    })
  })

  describe('_trackHeroismDamage()', () => {
    test('should not track if combat not active', async () => {
      global.game.combat.active = false

      await actor._trackHeroismDamage({ health: -5 })

      expect(global.game.settings.set).not.toHaveBeenCalled()
    })

    test('should track positive damage', async () => {
      await actor._trackHeroismDamage({ health: -5, morale: -3 })

      expect(global.game.settings.set).toHaveBeenCalledWith(
        'swerpg',
        'heroism',
        8
      )
    })

    test('should reverse damage if requested', async () => {
      await actor._trackHeroismDamage({ health: -5 }, true)

      expect(global.game.settings.set).toHaveBeenCalledWith(
        'swerpg',
        'heroism',
        5  // 0 - (-5) = 5
      )
    })
  })
})
