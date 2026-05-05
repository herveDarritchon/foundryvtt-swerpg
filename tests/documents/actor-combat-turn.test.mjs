/**
 * Tests for Turn Lifecycle Mixin
 * Chantier 04 - Combat refactoring (Issue #48)
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { TurnMixin } from '../../module/documents/actor-mixins/combat/turn.mixin.mjs'

// Minimal mock class
class TestActor {
  constructor(data = {}) {
    this.id = data.id || 'test-actor'
    this.flags = data.flags || { swerpg: {} }
    this.talentIds = new Set(data.talents || [])
    this.isIncapacitated = data.isIncapacitated || false
    this.isWeakened = data.isWeakened || false
    this.isBroken = data.isBroken || false
    this.system = data.system || { resources: { action: { value: 1 } }
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

describe('TurnMixin - onStartTurn()', () => {
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

  test('should call reset and render sheet', async () => {
    await actor.onStartTurn()
    expect(actor.reset).toHaveBeenCalled()
    expect(actor._sheet.render).toHaveBeenCalledWith(false)
  })

  test('should call expireEffects and applyDamageOverTime', async () => {
    await actor.onStartTurn()
    expect(actor.expireEffects).toHaveBeenCalledWith(true)
    expect(actor.applyDamageOverTime).toHaveBeenCalled()
  })
})

describe('TurnMixin - onEndTurn()', () => {
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

  test('should call reset and render sheet', async () => {
    await actor.onEndTurn()
    expect(actor.reset).toHaveBeenCalled()
    expect(actor._sheet.render).toHaveBeenCalledWith(false)
  })

  test('should call expireEffects with false', async () => {
    await actor.onEndTurn()
    expect(actor.expireEffects).toHaveBeenCalledWith(false)
  })
})

describe('TurnMixin - onLeaveCombat()', () => {
  let actor

  beforeEach(() => {
    actor = new ActorWithTurn()
  })

  test('should clear delay flags and reset', async () => {
    actor.flags.swerpg.delay = { round: 1, from: 10, to: 5 }
    const updateSpy = vi.spyOn(actor, 'update')
    await actor.onLeaveCombat()
    expect(updateSpy).toHaveBeenCalledWith({ 'flags.swerpg.-=delay': null })
  })
})

describe('TurnMixin - delay()', () => {
  let actor

  beforeEach(() => {
    actor = new ActorWithTurn()

    global.game = {
      combat: {
        round: 1,
        turn: 0,
        combatant: { initiative: 10 },
        getCombatantByActor: vi.fn().mockReturnValue({
          initiative: 10,
          getDelayMaximum: () => 20
        }),
        update: vi.fn().mockResolvedValue()
      }
    }
  })

  test('should throw error if no combatant found', async () => {
    global.game.combat.getCombatantByActor.mockReturnValue(null)
    await expect(actor.delay(15)).rejects.toThrow('no Combatant')
  })

  test('should throw error if initiative out of range', async () => {
    await expect(actor.delay(25)).rejects.toThrow('between 1 and 20')
  })

  test('should update actor flags and combat', async () => {
    await actor.delay(15)
    expect(actor.update).toHaveBeenCalled()
    expect(global.game.combat.update).toHaveBeenCalled()
  })
})
