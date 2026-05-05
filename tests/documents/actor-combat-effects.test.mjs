import { describe, test, expect, beforeEach, vi } from 'vitest'
import { EffectsMixin } from '../../module/documents/actor-mixins/combat/effects.mixin.mjs'

class TestActor {
  constructor() {
    this.effects = new Map()
    this.isWeakened = false
    this.isBroken = false
    this.isIncapacitated = false
    this.resistances = {}
    this.system = {}
  }
  
  async alterResources() {}
  async deleteEmbeddedDocuments() {}
  async updateEmbeddedDocuments() {}
  async createEmbeddedDocuments() {}
  callActorHooks() {}
}

class ActorWithEffects extends EffectsMixin(TestActor) {}

describe('EffectsMixin', () => {
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

  test('applyDamageOverTime should not throw', async () => {
    actor.effects.set('dot-1', {
      flags: { swerpg: { dot: { health: 5, damageType: 'poison' } } }
    })
    actor.resistances = { poison: { total: 2 } }
    await actor.applyDamageOverTime()
    expect(true).toBe(true)
  })

  test('_isEffectExpired returns false for turn-based at start', () => {
    const effect = { duration: { turns: 2, startRound: 1 } }
    const result = actor._isEffectExpired(effect, true)
    expect(result).toBe(false)
  })

  test('_isEffectExpired returns true for turns elapsed', () => {
    const effect = { duration: { turns: 1, startRound: 1 } }
    const result = actor._isEffectExpired(effect, false)
    expect(result).toBe(true)
  })

  test('expireEffects should not throw', async () => {
    actor.effects.set('effect-1', { id: 'effect-1', duration: { turns: 1, startRound: 0 } })
    await actor.expireEffects(true)
    expect(true).toBe(true)
  })

  test('_trackHeroismDamage should track damage', async () => {
    global.game.settings.get.mockReturnValue(0)
    await actor._trackHeroismDamage({ health: 5, morale: 3 })
    expect(global.game.settings.set).toHaveBeenCalledWith(
      'swerpg',
      'heroism',
      8
    )
  })
})
