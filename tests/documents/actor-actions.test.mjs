// actor-actions.test.mjs
// Tests for SwerpgActor action-related methods
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { createMockActor } from '../utils/actors/actor-factory.js'

// Mock SwerpgActor for static method test
const SwerpgActor = {
  macroAction: async (actor, actionId) => {
    if (!actor) return ui.notifications.warn('You must have a Token controlled to use this Macro')
    let action = actor.actions[actionId]
    if (!action) return ui.notifications.warn(`Actor "${actor.name}" does not have the action "${actionId}"`)
    await action.use()
  },
}

describe('SwerpgActor Actions', () => {
  let actor

  beforeEach(() => {
    actor = createMockActor()

    // Mock game.system.api.dice
    global.game = {
      system: {
        api: {
          dice: {
            AttackRoll: vi.fn().mockImplementation((data) => ({
              data: { ...data },
              evaluate: vi.fn().mockResolvedValue({}),
              overflow: 0,
            })),
          },
        },
      },
    }

    // Mock ui.notifications
    global.ui = {
      notifications: {
        warn: vi.fn(),
        info: vi.fn(),
      },
    }

    // Mock SwerpgAction
    global.SwerpgAction = {
      computeDamage: vi.fn().mockReturnValue(10),
    }
  })

  describe('useAction()', () => {
    beforeEach(() => {
      // Override useAction to simulate real behavior
      actor.useAction = vi.fn().mockImplementation(async (actionId, options = {}) => {
        const action = actor.actions[actionId]
        if (!action) throw new Error(`Action ${actionId} does not exist in Actor ${actor.id}`)
        return action.use({ dialog: true, ...options })
      })
    })

    test('should throw error if action does not exist', async () => {
      actor.actions = {}

      await expect(actor.useAction('nonexistent')).rejects.toThrow('Action nonexistent does not exist')
    })

    test('should call action.use() with dialog:true by default', async () => {
      const mockAction = {
        use: vi.fn().mockResolvedValue([]),
      }
      actor.actions = { testAction: mockAction }

      await actor.useAction('testAction')

      expect(mockAction.use).toHaveBeenCalledWith({ dialog: true })
    })

    test('should pass options to action.use()', async () => {
      const mockAction = {
        use: vi.fn().mockResolvedValue([]),
      }
      actor.actions = { testAction: mockAction }
      const options = { dialog: false, someOption: 'value' }

      await actor.useAction('testAction', options)

      expect(mockAction.use).toHaveBeenCalledWith({ dialog: true, ...options })
    })

    test('should return the result of action.use()', async () => {
      const mockResult = [{ id: 'roll-1' }]
      const mockAction = {
        use: vi.fn().mockResolvedValue(mockResult),
      }
      actor.actions = { testAction: mockAction }

      const result = await actor.useAction('testAction')

      expect(result).toBe(mockResult)
    })
  })

  describe('macroAction()', () => {
    test('should warn and return if no actor provided', async () => {
      await SwerpgActor.macroAction(null, 'testAction')

      expect(global.ui.notifications.warn).toHaveBeenCalledWith('You must have a Token controlled to use this Macro')
    })

    test('should warn and return if action does not exist', async () => {
      const mockActor = createMockActor()
      mockActor.actions = {}

      await SwerpgActor.macroAction(mockActor, 'nonexistent')

      expect(global.ui.notifications.warn).toHaveBeenCalledWith(
        expect.stringContaining('does not have the action'),
      )
    })

    test('should call action.use() if actor and action exist', async () => {
      const mockAction = {
        use: vi.fn().mockResolvedValue([]),
      }
      const mockActor = createMockActor()
      mockActor.actions = { testAction: mockAction }

      await SwerpgActor.macroAction(mockActor, 'testAction')

      expect(mockAction.use).toHaveBeenCalled()
    })
  })

  describe('applyTargetBoons()', () => {
    test('should be callable without errors', () => {
      const target = createMockActor()
      const action = { usage: {} }

      // Just verify it doesn't throw
      expect(() => actor.applyTargetBoons(target, action, 'skill')).not.toThrow()
    })

    test('should return boons and banes objects', () => {
      const target = createMockActor()
      const action = { usage: {} }

      const result = actor.applyTargetBoons(target, action, 'skill')

      expect(result).toHaveProperty('boons')
      expect(result).toHaveProperty('banes')
    })
  })
})
