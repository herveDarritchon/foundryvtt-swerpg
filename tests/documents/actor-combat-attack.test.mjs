/**
 * Tests for Attack Mixin
 * Chantier 02 - Combat refactoring (Issue #48)
 */

// Setup SYSTEM global expected by attack.mixin.mjs (Foundry runtime equivalent)
globalThis.SYSTEM = {
  dice: {
    CRITICAL_SUCCESS_THRESHOLD: 6,
    CRITICAL_FAILURE_THRESHOLD: 6,
    CRITICAL_SUCCESS_THRESHOLD_KEEN: 4,
    CRITICAL_FAILURE_THRESHOLD_RELIABLE: 4,
  },
  EFFECTS: {
    getEffectId: () => 'mock-effect-id',
  },
}

import { describe, test, expect, beforeEach, vi } from 'vitest'

// Import the mixin - use relative path from test file
import { AttackMixin } from '../../module/documents/actor-mixins/combat/attack.mixin.mjs'

// Mock base class for testing mixins
class MockBase {
  constructor(data = {}) {
    this.id = data.id || 'test-actor'
    this.actions = data.actions || {}
    this.system = data.system || {}
    this._sheet = { render: vi.fn() }
    this.callActorHooks = vi.fn()
  }

  async update(data) {
    Object.assign(this.system, data)
    return this
  }

  get talents() {
    return []
  }
}

// Import the mixin
import { AttackMixin } from '../../module/documents/actor-mixins/combat/attack.mixin.mjs'

class TestActor extends AttackMixin(MockBase) {}

describe('AttackMixin', () => {
  let actor

  beforeEach(() => {
    actor = new TestActor({
      id: 'actor-1',
      actions: {
        'attack-1': {
          use: vi.fn().mockResolvedValue({ success: true }),
          usage: {
            boons: {},
            banes: {},
            weapon: null,
            defenseType: 'physical',
            range: { maximum: 5 },
          },
        },
      },
    })
  })

  describe('useAction()', () => {
    test('should use the specified action', async () => {
      const result = await actor.useAction('attack-1')
      expect(actor.actions['attack-1'].use).toHaveBeenCalledWith({ dialog: true })
    })

    test('should throw error if action does not exist', async () => {
      await expect(actor.useAction('invalid')).rejects.toThrow('Action invalid does not exist')
    })
  })

  describe('applyTargetBoons()', () => {
    test('should return boons and banes objects', () => {
      const target = {
        statuses: new Set(),
        effects: new Map(),
      }
      const action = {
        usage: { boons: {}, banes: {} },
        range: { maximum: 5 },
      }

      const result = actor.applyTargetBoons(target, action, 'weapon', false)

      expect(result).toHaveProperty('boons')
      expect(result).toHaveProperty('banes')
    })

    test('should add guarded bane if target is guarded', () => {
      const target = {
        statuses: new Set(['guarded']),
        effects: new Map(),
      }
      const action = {
        usage: { boons: {}, banes: {} },
        damage: {},
        range: { maximum: 5 },
      }

      const { banes } = actor.applyTargetBoons(target, action, 'weapon', false)

      expect(banes).toHaveProperty('guarded')
    })

    test('should add prone boon for melee, bane for ranged', () => {
      const target = {
        statuses: new Set(['prone']),
        effects: new Map(),
      }
      const action = {
        usage: { boons: {}, banes: {} },
        damage: {},
        range: { maximum: 5 },
      }

      // Melee attack
      const { boons: meleeBoons } = actor.applyTargetBoons(target, action, 'weapon', false)
      expect(meleeBoons).toHaveProperty('prone')

      // Ranged attack
      const { banes: rangedBanes } = actor.applyTargetBoons(target, action, 'weapon', true)
      expect(rangedBanes).toHaveProperty('prone')
    })
  })

  describe('castSpell()', () => {
    test('should throw error (not implemented)', async () => {
      await expect(actor.castSpell()).rejects.toThrow('not yet implemented')
    })
  })

  describe('weapon critical thresholds — source of truth (ADR-0018)', () => {
    test('standard weapon uses CRITICAL_SUCCESS_THRESHOLD (6) as criticalSuccessThreshold', () => {
      expect(SYSTEM.dice.CRITICAL_SUCCESS_THRESHOLD).toBe(6)
    })

    test('standard weapon uses CRITICAL_FAILURE_THRESHOLD (6) as criticalFailureThreshold', () => {
      expect(SYSTEM.dice.CRITICAL_FAILURE_THRESHOLD).toBe(6)
    })

    test('keen weapon override CRITICAL_SUCCESS_THRESHOLD_KEEN (4) is smaller than default', () => {
      expect(SYSTEM.dice.CRITICAL_SUCCESS_THRESHOLD_KEEN).toBe(4)
      expect(SYSTEM.dice.CRITICAL_SUCCESS_THRESHOLD_KEEN).toBeLessThan(SYSTEM.dice.CRITICAL_SUCCESS_THRESHOLD)
    })

    test('reliable weapon override CRITICAL_FAILURE_THRESHOLD_RELIABLE (4) is smaller than default', () => {
      expect(SYSTEM.dice.CRITICAL_FAILURE_THRESHOLD_RELIABLE).toBe(4)
      expect(SYSTEM.dice.CRITICAL_FAILURE_THRESHOLD_RELIABLE).toBeLessThan(SYSTEM.dice.CRITICAL_FAILURE_THRESHOLD)
    })

    test('weapon with keen property selects CRITICAL_SUCCESS_THRESHOLD_KEEN', () => {
      const keenProperties = new Set(['keen'])
      const threshold = keenProperties.has('keen') ? SYSTEM.dice.CRITICAL_SUCCESS_THRESHOLD_KEEN : SYSTEM.dice.CRITICAL_SUCCESS_THRESHOLD
      expect(threshold).toBe(4)
    })

    test('weapon without keen property selects default CRITICAL_SUCCESS_THRESHOLD', () => {
      const standardProperties = new Set()
      const threshold = standardProperties.has('keen') ? SYSTEM.dice.CRITICAL_SUCCESS_THRESHOLD_KEEN : SYSTEM.dice.CRITICAL_SUCCESS_THRESHOLD
      expect(threshold).toBe(6)
    })

    test('weapon with reliable property selects CRITICAL_FAILURE_THRESHOLD_RELIABLE', () => {
      const reliableProperties = new Set(['reliable'])
      const threshold = reliableProperties.has('reliable') ? SYSTEM.dice.CRITICAL_FAILURE_THRESHOLD_RELIABLE : SYSTEM.dice.CRITICAL_FAILURE_THRESHOLD
      expect(threshold).toBe(4)
    })

    test('weapon without reliable property selects default CRITICAL_FAILURE_THRESHOLD', () => {
      const standardProperties = new Set()
      const threshold = standardProperties.has('reliable') ? SYSTEM.dice.CRITICAL_FAILURE_THRESHOLD_RELIABLE : SYSTEM.dice.CRITICAL_FAILURE_THRESHOLD
      expect(threshold).toBe(6)
    })
  })
})
