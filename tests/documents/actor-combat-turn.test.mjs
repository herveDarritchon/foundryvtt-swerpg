import { describe, test, expect, beforeEach, vi } from 'vitest'
import { TurnMixin } from '../../module/documents/actor-mixins/combat/turn.mixin.mjs'

class TestActor {
  constructor() {
    this.id = 'test-actor'
    this.flags = { swerpg: {} }
    this.talentIds = new Set()
    this.isIncapacitated = false
    this.isWeakened = false
    this.isBroken = false
    this.system = { resources: { action: { value: 1 } }}
    this._sheet = { render: vi.fn() }
    this.effects = new Map()

    this.reset = vi.fn()
    this.update = vi.fn().mockResolvedValue(this)
    this.expireEffects = vi.fn().mockResolvedValue()
    this.applyDamageOverTime = vi.fn().mockResolvedValue()
    this.alterResources = vi.fn().mockResolvedValue()
  }
}

class ActorWithTurn extends TurnMixin(TestActor) {}

describe('TurnMixin', () => {
  let actor

  beforeEach(() => {
    actor = new ActorWithTurn()

    global.game = {
      combat: {
        round: 1,
        turn: 0,
        combatant: { initiative: 10 }
      }
    }
  })

  test('onStartTurn should call reset', async () => {
    await actor.onStartTurn()
    expect(actor.reset).toHaveBeenCalled()
  })

  test('onEndTurn should call reset', async () => {
    await actor.onEndTurn()
    expect(actor.reset).toHaveBeenCalled()
  })

  test('onLeaveCombat should call update', async () => {
    actor.flags.swerpg.delay = { round: 1, from: 10, to: 5 }
    await actor.onLeaveCombat()
    expect(actor.update).toHaveBeenCalled()
  })
})
