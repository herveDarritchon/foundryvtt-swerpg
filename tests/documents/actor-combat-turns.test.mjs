// actor-combat-turns.test.mjs
// Tests for SwerpgActor combat turn methods
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { createMockActor } from '../utils/actors/actor-factory.js'

describe('SwerpgActor Combat Turns', () => {
  let actor

  beforeEach(() => {
    actor = createMockActor()

    // Mock game.combat
    global.game = {
      combat: {
        active: true,
        round: 1,
        combatant: { initiative: 10 },
      },
      settings: {
        get: vi.fn().mockReturnValue(0),
        set: vi.fn().mockResolvedValue(),
      },
      system: { version: '1.0.0' },
    }

    // Mock ui.notifications
    global.ui = {
      notifications: {
        warn: vi.fn(),
        info: vi.fn(),
      },
    }
  })

  describe('onStartTurn()', () => {
    beforeEach(() => {
      actor.update = vi.fn().mockResolvedValue(actor)
      // Override onStartTurn to simulate real behavior
      actor.onStartTurn = vi.fn().mockImplementation(async () => {
        // Skip cases where the actor delayed, and it is now their turn again
        const { round, from, to } = actor.flags.swerpg?.delay || {}
        if (from && round === game.combat.round && game.combat.combatant?.initiative === to) {
          return
        }

        // Re-prepare data and re-render the actor sheet
        actor.reset()
        actor._sheet?.render(false)

        // Clear system statuses
        await actor.update({ 'system.status': null })

        // Remove Active Effects which expire at the start of a turn (round)
        await actor.expireEffects(true)

        // Apply damage-over-time before recovery
        await actor.applyDamageOverTime()

        // Recover resources
        const resources = {}
        const updates = {}
        if (!actor.isIncapacitated) {
          resources.action = Infinity // Try to recover as much action as possible, in case your maximum trained
          if (actor.talentIds.has('lesserregenerati') && !actor.isWeakened) resources.health = 1
          if (actor.talentIds.has('irrepressiblespi') && !actor.isBroken) resources.morale = 1
        }
        await actor.alterResources(resources, updates)
      })
    })

    test('should call reset() and render sheet', async () => {
      await actor.onStartTurn()

      expect(actor.reset).toHaveBeenCalled()
      expect(actor._sheet.render).toHaveBeenCalledWith(false)
    })

    test('should update system.status to null', async () => {
      await actor.onStartTurn()

      expect(actor.update).toHaveBeenCalledWith({ 'system.status': null })
    })

    test('should call expireEffects(true) for start of turn', async () => {
      await actor.onStartTurn()

      expect(actor.expireEffects).toHaveBeenCalledWith(true)
    })

    test('should call applyDamageOverTime()', async () => {
      await actor.onStartTurn()

      expect(actor.applyDamageOverTime).toHaveBeenCalled()
    })

    test('should recover resources if not incapacited', async () => {
      actor.isIncapacitated = false
      actor.talentIds = new Set()

      await actor.onStartTurn()

      expect(actor.alterResources).toHaveBeenCalledWith(
        expect.objectContaining({ action: Infinity }),
        expect.any(Object),
      )
    })

    test('should include health recovery if has lessserregenerati and not weakened', async () => {
      actor.isIncapacitated = false
      actor.isWeakened = false
      actor.talentIds = new Set(['lesserregenerati'])

      await actor.onStartTurn()

      expect(actor.alterResources).toHaveBeenCalledWith(
        expect.objectContaining({ action: Infinity, health: 1 }),
        expect.any(Object),
      )
    })

    test('should include morale recovery if has irrepressiblespi and not broken', async () => {
      actor.isIncapacitated = false
      actor.isBroken = false
      actor.talentIds = new Set(['irrepressiblespi'])

      await actor.onStartTurn()

      expect(actor.alterResources).toHaveBeenCalledWith(
        expect.objectContaining({ action: Infinity, morale: 1 }),
        expect.any(Object),
      )
    })

    test('should skip resource recovery if incapacitated', async () => {
      actor.isIncapacitated = true

      await actor.onStartTurn()

      const callArgs = actor.alterResources.mock.calls[0][0]
      expect(callArgs).not.toHaveProperty('health')
      expect(callArgs).not.toHaveProperty('morale')
    })

    test('should return early if delayed and conditions met', async () => {
      actor.flags = {
        swerpg: { delay: { round: 1, from: 5, to: 10 } },
      }
      global.game.combat.combatant.initiative = 10

      await actor.onStartTurn()

      expect(actor.reset).not.toHaveBeenCalled()
    })
  })

  describe('onEndTurn()', () => {
    beforeEach(() => {
      actor.update = vi.fn().mockResolvedValue(actor)
      // Override onEndTurn to simulate real behavior
      actor.onEndTurn = vi.fn().mockImplementation(async () => {
        actor.reset()
        actor._sheet?.render(false)

        // Skip cases where the turn is over because the actor delayed
        const { round, from, to } = actor.flags.swerpg?.delay || {}
        if (from && round === game.combat.round && game.combat.combatant?.initiative > to) return

        // Conserve Effort
        if (actor.talentIds.has('conserveeffort00') && actor.system.resources.action.value) {
          await actor.alterResources({ focus: 1 }, {}, { statusText: 'Conserve Effort' })
        }

        // Remove active effects which expire at the end of a turn
        await actor.expireEffects(false)

        // Clear delay flags
        if (actor.flags.swerpg?.delay) await actor.update({ 'flags.swerpg.-=delay': null })
      })
    })

    test('should call reset() and render sheet', async () => {
      await actor.onEndTurn()

      expect(actor.reset).toHaveBeenCalled()
      expect(actor._sheet.render).toHaveBeenCalledWith(false)
    })

    test('should call expireEffects(false) for end of turn', async () => {
      await actor.onEndTurn()

      expect(actor.expireEffects).toHaveBeenCalledWith(false)
    })

    test('should clear delay flags if present', async () => {
      actor.flags = { swerpg: { delay: { round: 1, from: 5, to: 10 } } }

      await actor.onEndTurn()

      expect(actor.update).toHaveBeenCalledWith({ 'flags.swerpg.-=delay': null })
    })

    test('should recover focus if has conserveeffort00 and action > 0', async () => {
      actor.system.resources.action.value = 2
      actor.talentIds = new Set(['conserveeffort00'])

      await actor.onEndTurn()

      expect(actor.alterResources).toHaveBeenCalledWith(
        { focus: 1 },
        {},
        { statusText: 'Conserve Effort' },
      )
    })

    test('should not recover focus if no action resources', async () => {
      actor.system.resources.action.value = 0
      actor.talentIds = new Set(['conserveeffort00'])

      await actor.onEndTurn()

      expect(actor.alterResources).not.toHaveBeenCalled()
    })
  })
})
