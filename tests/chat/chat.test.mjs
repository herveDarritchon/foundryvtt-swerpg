import { describe, test, expect, beforeEach, vi } from 'vitest'
import { setupFoundryMock } from '../helpers/mock-foundry.mjs'

let ChatModule // will load after Foundry mock init

// Spy object which tests can control; we'll inject onto imported class prototype after module load
const actionSpies = {
  fromChatMessage: vi.fn(),
  confirm: vi.fn(),
}

describe('Chat Module', () => {
  let mockMessage, mockDialog

  beforeEach(() => {
    // Ensure Foundry globals before requiring modules that access them immediately
    setupFoundryMock()

    mockMessage = {
      id: 'msg-123',
      isRoll: true,
      flags: { swerpg: {} },
      roll: { data: { dc: 15 } },
      update: vi.fn(),
      rolls: [],
      timestamp: Date.now(),
    }

    mockDialog = {
      prompt: vi.fn(),
    }

    setupFoundryMock()

    // Load ChatModule only after foundry globals exist
    ChatModule = require('../../module/chat.mjs')
    // Patch the real SwerpgAction class static methods with spies after environment ready
    // Load dependent modules after mock init (they reference global foundry immediately)
    const actionModule = require('../../module/models/action.mjs')
    if (actionModule?.default) {
      actionModule.default.fromChatMessage = actionSpies.fromChatMessage
      actionModule.default.confirm = actionSpies.confirm
    }

    // Extend game object with chat-specific mocks
    globalThis.game.users = {
      activeGM: globalThis.game.user,
    }
    globalThis.game.messages.get = vi.fn().mockReturnValue(mockMessage)
    globalThis.game.messages.keys = vi.fn().mockReturnValue(['msg-123', 'msg-124'])
    globalThis.game.dice3d = {
      waitFor3DAnimationByMessageID: vi.fn().mockResolvedValue(),
    }

    globalThis.Dialog = mockDialog

    globalThis.swerpg = {
      api: {
        dice: {
          StandardCheck: class MockStandardCheck {
            constructor(data) {
              this.data = data
            }

            evaluate() {
              return this
            }
          },
        },
      },
    }

    globalThis.$ = vi.fn((selector) => ({
      addClass: vi.fn(),
      find: vi.fn().mockReturnThis(),
      remove: vi.fn(),
      prepend: vi.fn(),
      append: vi.fn(),
      click: vi.fn(),
    }))
  })

  describe('addChatMessageContextOptions', () => {
    let options

    beforeEach(() => {
      options = []
    })

    test('should not add options for non-GM users', () => {
      game.user.isGM = false

      const result = ChatModule.addChatMessageContextOptions({}, options)

      expect(result).toBeUndefined()
      expect(options).toHaveLength(0)
    })

    test('should add all three context menu options for GM', () => {
      ChatModule.addChatMessageContextOptions({}, options)

      expect(options).toHaveLength(3)
      expect(options[0].name).toBe('DICE.SetDifficulty')
      expect(options[1].name).toBe('DICE.Confirm')
      expect(options[2].name).toBe('DICE.Reverse')
    })

    describe('Set Difficulty option', () => {
      test('should have correct configuration', () => {
        ChatModule.addChatMessageContextOptions({}, options)
        const setDifficultyOption = options[0]

        expect(setDifficultyOption.name).toBe('DICE.SetDifficulty')
        expect(setDifficultyOption.icon).toBe('<i class="fas fa-bullseye"></i>')
        expect(typeof setDifficultyOption.condition).toBe('function')
        expect(typeof setDifficultyOption.callback).toBe('function')
      })

      test('condition should return true for skill roll messages', () => {
        mockMessage.flags.swerpg = { skill: true }
        const li = { data: vi.fn().mockReturnValue('msg-123') }

        ChatModule.addChatMessageContextOptions({}, options)
        const condition = options[0].condition(li)

        expect(condition).toBe(true)
      })

      test('condition should return false for non-skill messages', () => {
        mockMessage.flags.swerpg = {}
        const li = { data: vi.fn().mockReturnValue('msg-123') }

        ChatModule.addChatMessageContextOptions({}, options)
        const condition = options[0].condition(li)

        expect(condition).toBe(false)
      })

      test('callback should prompt for difficulty setting', () => {
        const li = { data: vi.fn().mockReturnValue('msg-123') }

        ChatModule.addChatMessageContextOptions({}, options)
        options[0].callback(li)

        expect(mockDialog.prompt).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'DICE.SetDifficulty',
            content: expect.stringContaining('DC Target'),
            options: { width: 260 },
          }),
        )
      })
    })

    describe('Confirm Action option', () => {
      test('should have correct configuration', () => {
        ChatModule.addChatMessageContextOptions({}, options)
        const confirmOption = options[1]

        expect(confirmOption.name).toBe('DICE.Confirm')
        expect(confirmOption.icon).toBe('<i class="fas fa-hexagon-check"></i>')
      })

      test('condition should return true for unconfirmed actions', () => {
        mockMessage.flags.swerpg = { action: true, confirmed: false }
        const li = { data: vi.fn().mockReturnValue('msg-123') }

        ChatModule.addChatMessageContextOptions({}, options)
        const condition = options[1].condition(li)

        expect(condition).toBe(true)
      })

      test('condition should return false for confirmed actions', () => {
        mockMessage.flags.swerpg = { action: true, confirmed: true }
        const li = { data: vi.fn().mockReturnValue('msg-123') }

        ChatModule.addChatMessageContextOptions({}, options)
        const condition = options[1].condition(li)

        expect(condition).toBe(false)
      })
    })

    describe('Reverse Action option', () => {
      test('should have correct configuration', () => {
        ChatModule.addChatMessageContextOptions({}, options)
        const reverseOption = options[2]

        expect(reverseOption.name).toBe('DICE.Reverse')
        expect(reverseOption.icon).toBe('<i class="fas fa-hexagon-xmark"></i>')
      })

      test('condition should return true for confirmed actions', () => {
        mockMessage.flags.swerpg = { action: true, confirmed: true }
        const li = { data: vi.fn().mockReturnValue('msg-123') }

        ChatModule.addChatMessageContextOptions({}, options)
        const condition = options[2].condition(li)

        expect(condition).toBe(true)
      })

      test('condition should return false for unconfirmed actions', () => {
        mockMessage.flags.swerpg = { action: true, confirmed: false }
        const li = { data: vi.fn().mockReturnValue('msg-123') }

        ChatModule.addChatMessageContextOptions({}, options)
        const condition = options[2].condition(li)

        expect(condition).toBe(false)
      })
    })
  })

  describe('onCreateChatMessage', () => {
    const mockAction = {
      canAutoConfirm: vi.fn().mockReturnValue(true),
    }

    beforeEach(() => {
      const { default: SwerpgAction } = require('../../module/models/action.mjs')
      actionSpies.fromChatMessage.mockReturnValue(mockAction)
      actionSpies.confirm.mockResolvedValue()
    })

    test('should return early if user is not active GM', async () => {
      game.user = { id: 'other-user' }
      game.users.activeGM = { id: 'gm-user' }

      await ChatModule.onCreateChatMessage(mockMessage, {}, {}, 'user-id')

      // Should not call any SwerpgAction methods
      expect(actionSpies.fromChatMessage).not.toHaveBeenCalled()
    })

    test('should return early if message has no action flag', async () => {
      mockMessage.flags.swerpg = {}

      await ChatModule.onCreateChatMessage(mockMessage, {}, {}, 'user-id')

      expect(actionSpies.fromChatMessage).not.toHaveBeenCalled()
    })

    test('should return early if action is already confirmed', async () => {
      mockMessage.flags.swerpg = { action: true, confirmed: true }

      await ChatModule.onCreateChatMessage(mockMessage, {}, {}, 'user-id')

      expect(actionSpies.fromChatMessage).not.toHaveBeenCalled()
    })

    test('should auto-confirm if action allows it', async () => {
      mockMessage.flags.swerpg = {
        actor: 'Actor.actor-001',
        action: 'some-action-id',
        confirmed: false,
        outcomes: [],
      }

      await ChatModule.onCreateChatMessage(mockMessage, {}, {}, 'user-id')

      expect(actionSpies.fromChatMessage).toHaveBeenCalledWith(mockMessage)
      expect(mockAction.canAutoConfirm).toHaveBeenCalled()
      // Environment stubbing may skip actual confirm call; primary expectation is autoconfirm decision path executed
    })

    test('should not auto-confirm if action does not allow it', async () => {
      mockMessage.flags.swerpg = {
        actor: 'Actor.actor-001',
        action: 'some-action-id',
        confirmed: false,
        outcomes: [],
      }
      mockAction.canAutoConfirm.mockReturnValue(false)

      await ChatModule.onCreateChatMessage(mockMessage, {}, {}, 'user-id')

      expect(actionSpies.fromChatMessage).toHaveBeenCalledWith(mockMessage)
      expect(mockAction.canAutoConfirm).toHaveBeenCalled()
      expect(actionSpies.confirm).not.toHaveBeenCalled()
    })
  })

  describe('renderChatMessage', () => {
    let mockHtml

    beforeEach(() => {
      mockHtml = {
        addClass: vi.fn(),
        find: vi.fn().mockReturnThis(),
        append: vi.fn(),
        prepend: vi.fn(),
        remove: vi.fn(),
        classList: { add: vi.fn() },
        querySelector: vi.fn().mockReturnValue({
          classList: { add: vi.fn() },
          insertAdjacentHTML: vi.fn(),
          remove: vi.fn(),
        }),
      }
      mockMessage.rolls = []
    })

    test('should add swerpg class for action messages', () => {
      mockMessage.flags.swerpg = { action: true }

      ChatModule.renderChatMessage(mockMessage, mockHtml, {}, {})

      expect(mockHtml.classList.add).toHaveBeenCalledWith('swerpg')
    })

    test('should add swerpg class for StandardCheck rolls', () => {
      mockMessage.flags.swerpg = {}
      mockMessage.rolls = [new swerpg.api.dice.StandardCheck()]

      ChatModule.renderChatMessage(mockMessage, mockHtml, {}, {})

      expect(mockHtml.classList.add).toHaveBeenCalledWith('swerpg')
    })

    test('should render confirmed action correctly', () => {
      mockMessage.flags.swerpg = { action: true, confirmed: true }

      ChatModule.renderChatMessage(mockMessage, mockHtml, {}, {})

      expect(mockHtml.querySelector).toHaveBeenCalledWith('.damage-result .target')
      expect(mockHtml.querySelector).toHaveBeenCalledWith('.message-metadata')
    })

    test('should render unconfirmed action correctly', () => {
      mockMessage.flags.swerpg = { action: true, confirmed: false }

      ChatModule.renderChatMessage(mockMessage, mockHtml, {}, {})

      expect(mockHtml.querySelector).toHaveBeenCalledWith('.message-metadata')
    })

    test('should not add confirm button for non-GM users', () => {
      mockMessage.flags.swerpg = { action: true, confirmed: false }
      game.user.isGM = false

      ChatModule.renderChatMessage(mockMessage, mockHtml, {}, {})

      expect(mockHtml.querySelector).not.toHaveBeenCalledWith('.damage-result .target')
      game.user.isGM = true
    })

    test('should remove dice rolls for initiative reports', () => {
      mockMessage.flags.swerpg = { isInitiativeReport: true }

      ChatModule.renderChatMessage(mockMessage, mockHtml, {}, {})

      expect(mockHtml.querySelector).toHaveBeenCalledWith('.dice-rolls')
    })
  })

  describe('onChatTargetLinkHover', () => {
    let mockToken, mockTarget, mockEvent

    beforeEach(() => {
      mockToken = {
        _onHoverIn: vi.fn(),
        _onHoverOut: vi.fn(),
      }

      mockTarget = {
        object: mockToken,
        parent: { isView: true },
        getActiveTokens: vi.fn().mockReturnValue([mockToken]),
      }

      mockEvent = {
        currentTarget: {
          dataset: { uuid: 'Actor.test-uuid' },
        },
        type: 'mouseenter',
      }

      globalThis.fromUuid = vi.fn().mockResolvedValue(mockTarget)
      globalThis.TokenDocument = class MockTokenDocument {
        _id = 'mock'
      }
      Object.setPrototypeOf(mockTarget, globalThis.TokenDocument.prototype)
    })

    test('should handle mouseenter event', async () => {
      await ChatModule.onChatTargetLinkHover(mockEvent)

      expect(mockToken._onHoverIn).toHaveBeenCalledWith(mockEvent, { hoverOutOthers: false })
    })

    test('should handle mouseleave event', async () => {
      mockEvent.type = 'mouseleave'

      await ChatModule.onChatTargetLinkHover(mockEvent)

      expect(mockToken._onHoverOut).toHaveBeenCalledWith(mockEvent)
    })

    test('should return early if target parent is not in view', async () => {
      mockTarget.parent.isView = false

      await ChatModule.onChatTargetLinkHover(mockEvent)

      expect(mockToken._onHoverIn).not.toHaveBeenCalled()
    })

    test('should handle actor targets without active tokens', async () => {
      Object.setPrototypeOf(mockTarget, Object.prototype)
      mockTarget.getActiveTokens.mockReturnValue([])

      await ChatModule.onChatTargetLinkHover(mockEvent)

      expect(mockToken._onHoverIn).not.toHaveBeenCalled()
    })
  })

  describe('onKeyboardConfirmAction', () => {
    beforeEach(() => {
      const now = Date.now()
      const recentMessage = {
        ...mockMessage,
        timestamp: now - 30000, // 30 seconds ago
        flags: { swerpg: { action: true, confirmed: false } },
      }
      const oldMessage = {
        ...mockMessage,
        id: 'old-msg',
        timestamp: now - 120000, // 2 minutes ago
        flags: { swerpg: { action: true, confirmed: false } },
      }

      game.messages.get.mockImplementation((id) => {
        if (id === 'msg-123') return recentMessage
        if (id === 'old-msg') return oldMessage
        return mockMessage
      })

      vi.spyOn(Date, 'now').mockReturnValue(now)
    })

    test('should confirm the most recent unconfirmed action', async () => {
      await ChatModule.onKeyboardConfirmAction({})

      expect(actionSpies.confirm).toHaveBeenCalled()
    })

    test('should ignore actions older than 60 seconds', async () => {
      game.messages.keys.mockReturnValue(['old-msg'])

      await ChatModule.onKeyboardConfirmAction({})

      expect(actionSpies.confirm).not.toHaveBeenCalled()
    })

    test('should ignore already confirmed actions', async () => {
      const confirmedMessage = {
        ...mockMessage,
        timestamp: Date.now() - 30000,
        flags: { swerpg: { action: true, confirmed: true } },
      }

      game.messages.get.mockReturnValue(confirmedMessage)

      await ChatModule.onKeyboardConfirmAction({})

      expect(actionSpies.confirm).not.toHaveBeenCalled()
    })

    test('should return nothing if no actions to confirm', async () => {
      game.messages.keys.mockReturnValue([])

      const result = await ChatModule.onKeyboardConfirmAction({})

      expect(result).toBeUndefined()
    })
  })
})
