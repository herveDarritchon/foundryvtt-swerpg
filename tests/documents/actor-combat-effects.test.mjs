/**
 * Tests for Effects Manager Mixin
 * Chantier 05 - Combat refactoring (Issue #48)
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { EffectsMixin } from '../../module/documents/actor-mixins/combat/effects.mixin.mjs'

// Minimal mock class
class TestActor {
  constructor(data = {}) {
    this.effects = new Map()
    this.isWeakened = data.isWeakened || false
    this.isBroken = data.isBroken || false
    this.isIncapacitated = data.isIncapacitated || false
    this.resistances = data.resistances || {}
    this.system = data.system || {}

    this.callActorHooks = vi.fn()
    this.alterResources = vi.fn().mockResolvedValue()
    this.deleteEmbeddedDocuments = vi.fn().mockResolvedValue()
    this.updateEmbeddedDocuments = vi.fn().mockResolvedValue()
    this.createEmbeddedDocuments = vi.fn().mockResolvedValue()
  }
}

class ActorWithEffects extends EffectsMixin(TestActor) {}

describe('EffectsMixin - applyDamageOverTime()', () => {
  let actor

  beforeEach(() => {
    actor = new ActorWithEffects()

    global.game = {
      combat: { round: 1, active: true },
      settings: {
        get: vi.fn().mockReturnValue(0),
        set: vi.fn().mockResolvedValue()
      }
    }
  })

  test('should apply DOT from effects', async () => {
    actor.effects.set('dot-1', {
      flags: { swerpg: { dot: { health: 5, damageType: 'poison' } } }
    })
    actor.resistances = { poison: { total: 2 } }

    const alterSpy = vi.spyOn(actor, 'alterResources')
    await actor.applyDamageOverTime()
    expect(alterSpy).toHaveBeenCalled()
  })

  test('should skip effects without dot flag', async () => {
    actor.effects.set('no-dot', {
      flags: {}
    })

    const alterSpy = vi.spyOn(actor, 'alterResources')
    await actor.applyDamageOverTime()
    expect(alterSpy).not.toHaveBeenCalled()
  })
})

describe('EffectsMixin - _isEffectExpired()', () => {
  let actor

  beforeEach(() => {
    actor = new ActorWithEffects()

    global.game = {
      combat: { round: 2 }
    }
  })

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

describe('EffectsMixin - expireEffects()', () => {
  let actor

  beforeEach(() => {
    actor = new ActorWithEffects()
    actor.effects.set('effect-1', { id: 'effect-1', duration: { turns: 1, startRound: 0 } })
    actor.effects.set('effect-2', { id: 'effect-2', duration: { turns: 5, startRound: 1 } })
  })

  test('should delete expired effects', async () => {
    const deleteSpy = vi.spyOn(actor, 'deleteEmbeddedDocuments')
    await actor.expireEffects(true)
    expect(deleteSpy).toHaveBeenCalled()
  })
})

describe('EffectsMixin - _trackHeroismDamage()', () => {
  let actor

  beforeEach(() => {
    actor = new ActorWithEffects()

    global.game = {
      combat: { round: 1, active: true },
      settings: {
        get: vi.fn().mockReturnValue(0),
        set: vi.fn().mockResolvedValue()
      }
    }
  })

  test('should not track if combat not active', async () => {
    global.game.combat.active = false
    await actor._trackHeroismDamage({ health: -5 })
    expect(global.game.settings.set).not.toHaveBeenCalled()
  })

  test('should track positive damage', async () => {
    global.game.settings.get.mockReturnValue(0)
    await actor._trackHeroismDamage({ health: 5, morale: 3 })
    expect(global.game.settings.set).toHaveBeenCalledWith(
      'swerpg',
      'heroism',
      8  // 0 + 5 + 3
    )
  })

  test('should reverse damage if requested', async () => {
    await actor._trackHeroismDamage({ health: -5 }, true)
    expect(global.game.settings.set).toHaveBeenCalledWith(
      'swerpg',
      'heroism',
      5  // 0 - (-5)
    )
  })
})
