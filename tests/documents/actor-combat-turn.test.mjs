/**
 * Tests for Turn Lifecycle Mixin
 * Chantier 04 - Combat refactoring (Issue #48)
 */

// Mock base class for testing mixins
class MockBase {
  constructor(data = {}) {
    this.id = data.id || 'test-actor'
    this.flags = data.flags || { swerpg: {} }
    this.talentIds = new Set(data.talents || [])
    this.isIncapacitated = data.isIncapacitated || false
    this.isWeakened = data.isWeakened || false
    this.isBroken = data.isBroken || false
    this.system = data.system || { resources: { action: { value: 1 } } }
    this._sheet = { render: jest.fn() }
    this.effects = new Map()

    this.reset = jest.fn()
    this.update = jest.fn().mockResolvedValue(this)
    this.expireEffects = jest.fn().mockResolvedValue()
    this.applyDamageOverTime = jest.fn().mockResolvedValue()
    this.alterResources = jest.fn().mockResolvedValue()
  }
}

// Import the mixin
import { TurnMixin } from '../../module/documents/actor-mixins/combat/turn.mixin.mjs'

class TestActor extends TurnMixin(MockBase) {}

describe('TurnMixin', () => {
  let actor

  beforeEach(() => {
    actor = new TestActor()

    // Mock game.combat
    global.game = {
      combat: {
        round: 1,
        turn: 0,
        combatant: { initiative: 10 }
      }
    }
  })

  describe('onStartTurn()', () => {
    test('should reset actor and render sheet', async () => {
      await actor.onStartTurn()
      expect(actor.reset).toHaveBeenCalled()
      expect(actor._sheet.render).toHaveBeenCalledWith(false)
    })

    test('should call expireEffects and applyDamageOverTime', async () => {
      await actor.onStartTurn()
      expect(actor.expireEffects).toHaveBeenCalledWith(true)
      expect(actor.applyDamageOverTime).toHaveBeenCalled()
    })

    test('should recover action resource', async () => {
      await actor.onStartTurn()
      expect(actor.alterResources).toHaveBeenCalled()
    })

    test('should apply lesser regeneration talent', async () => {
      actor.talentIds = new Set(['lesserregenerati'])
      actor.isWeakened = false
      await actor.onStartTurn()
      expect(actor.alterResources).toHaveBeenCalledWith(
        expect.objectContaining({ health: 1 }),
        expect.any(Object)
      )
    })
  })

  describe('onEndTurn()', () => {
    test('should reset actor and render sheet', async () => {
      await actor.onEndTurn()
      expect(actor.reset).toHaveBeenCalled()
      expect(actor._sheet.render).toHaveBeenCalledWith(false)
    })

    test('should call expireEffects with false', async () => {
      await actor.onEndTurn()
      expect(actor.expireEffects).toHaveBeenCalledWith(false)
    })

    test('should apply conserve effort talent', async () => {
      actor.talentIds = new Set(['conserveeffort00'])
      actor.system.resources.action = { value: 2 }
      await actor.onEndTurn()
      expect(actor.alterResources).toHaveBeenCalledWith(
        { focus: 1 },
        {},
        { statusText: 'Conserve Effort' }
      )
    })
  })

  describe('onLeaveCombat()', () => {
    test('should clear delay flags and reset', async () => {
      actor.flags.swerpg.delay = { round: 1, from: 10, to: 5 }
      await actor.onLeaveCombat()
      expect(actor.update).toHaveBeenCalledWith({ 'flags.swerpg.-=delay': null })
      expect(actor.reset).toHaveBeenCalled()
    })
  })

  describe('delay()', () => {
    beforeEach(() => {
      global.game.combat.getCombatantByActor = jest.fn().mockReturnValue({
        initiative: 10,
        getDelayMaximum: () => 20
      })
    })

    test('should throw error if no combatant found', async () => {
      global.game.combat.getCombatantByActor.mockReturnValue(null)
      await expect(actor.delay(15)).rejects.toThrow('no Combatant')
    })

    test('should throw error if initiative out of range', async () => {
      await expect(actor.delay(25)).rejects.toThrow('between 1 and 20')
    })

    test('should update actor flags and combat', async () => {
      global.game.combat.update = jest.fn().mockResolvedValue()
      await actor.delay(15)

      expect(actor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          'flags.swerpg.delay': expect.any(Object)
        })
      )
      expect(global.game.combat.update).toHaveBeenCalled()
    })
  })
})
