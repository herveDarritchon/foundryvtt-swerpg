import { describe, test, expect, beforeEach, vi } from 'vitest'
import { setupFoundryMock } from '../../helpers/mock-foundry.mjs'
import { registerSystemSettings } from '../../../module/applications/settings/settings.js'

// Mock the chat module
vi.mock('../../../module/chat.mjs', () => ({
  onKeyboardConfirmAction: vi.fn()
}))

describe('System Settings Registration', () => {
  let mockGameSettings
  let mockKeybindings

  beforeEach(() => {
    // Setup mock game object
    mockGameSettings = {
      register: vi.fn()
    }
    
    mockKeybindings = {
      register: vi.fn()
    }

    setupFoundryMock({
      game: {
        settings: mockGameSettings,
        keybindings: mockKeybindings
      }
    })

    // Setup global SYSTEM
    globalThis.SYSTEM = {
      id: 'swerpg'
    }
  })

  describe('registerSystemSettings function', () => {
    test('should register all system settings', () => {
      registerSystemSettings()

      // Verify all settings were registered
      expect(mockGameSettings.register).toHaveBeenCalledTimes(7) // 7 settings total
      expect(mockKeybindings.register).toHaveBeenCalledTimes(1) // 1 keybinding
    })

    describe('Core System Settings', () => {
      test('should register systemMigrationVersion setting', () => {
        registerSystemSettings()

        expect(mockGameSettings.register).toHaveBeenCalledWith('swerpg', 'systemMigrationVersion', {
          name: 'System Migration Version',
          scope: 'world',
          config: false,
          type: String,
          default: ''
        })
      })

      test('should register worldKey setting', () => {
        registerSystemSettings()

        expect(mockGameSettings.register).toHaveBeenCalledWith('swerpg', 'worldKey', {
          name: 'Unique world key for world tracking',
          scope: 'world',
          config: false,
          type: String,
          default: ''
        })
      })

      test('should register devMode setting', () => {
        registerSystemSettings()

        expect(mockGameSettings.register).toHaveBeenCalledWith('swerpg', 'devMode', {
          name: 'A setting to enable or disable dev mode',
          scope: 'world',
          config: false,
          type: Boolean,
          default: false
        })
      })
    })

    describe('Feature Settings', () => {
      test('should register actionAnimations setting', () => {
        registerSystemSettings()

        expect(mockGameSettings.register).toHaveBeenCalledWith('swerpg', 'actionAnimations', {
          name: 'Enable Action Animations',
          hint: 'Enable automatic action animations using Sequencer and JB2A. Both modules must be installed and enabled for this feature to work.',
          scope: 'world',
          config: true,
          type: Boolean,
          default: true
        })
      })

      test('should register autoConfirm setting with choices', () => {
        registerSystemSettings()

        expect(mockGameSettings.register).toHaveBeenCalledWith('swerpg', 'autoConfirm', {
          name: 'SETTINGS.AutoConfirmName',
          hint: 'SETTINGS.AutoConfirmHint',
          scope: 'world',
          config: true,
          type: Number,
          choices: {
            0: 'SETTINGS.AutoConfirmNone',
            1: 'SETTINGS.AutoConfirmSelf',
            2: 'SETTINGS.AutoConfirmAll'
          }
        })
      })

      test('should register welcome setting', () => {
        registerSystemSettings()

        expect(mockGameSettings.register).toHaveBeenCalledWith('swerpg', 'welcome', {
          scope: 'client',
          config: false,
          type: Boolean,
          default: false
        })
      })

      test('should register heroism setting', () => {
        registerSystemSettings()

        expect(mockGameSettings.register).toHaveBeenCalledWith('swerpg', 'heroism', {
          scope: 'world',
          config: false,
          type: Number,
          default: 0
        })
      })
    })

    describe('Keybinding Registration', () => {
      test('should register confirm keybinding', () => {
        registerSystemSettings()

        expect(mockKeybindings.register).toHaveBeenCalledWith('swerpg', 'confirm', {
          name: 'KEYBINDINGS.ConfirmAction',
          hint: 'KEYBINDINGS.ConfirmActionHint',
          editable: [{ key: 'KeyX' }],
          restricted: true,
          onDown: expect.any(Function)
        })
      })
    })

    describe('Setting Configuration Validation', () => {
      test('should have correct scope configurations', () => {
        registerSystemSettings()

        const calls = mockGameSettings.register.mock.calls

        // World-scoped settings
        const worldSettings = calls.filter(call => call[2].scope === 'world')
        expect(worldSettings).toHaveLength(6)

        // Client-scoped settings
        const clientSettings = calls.filter(call => call[2].scope === 'client')
        expect(clientSettings).toHaveLength(1)
        expect(clientSettings[0][1]).toBe('welcome') // Should be the welcome setting
      })

      test('should have correct config visibility', () => {
        registerSystemSettings()

        const calls = mockGameSettings.register.mock.calls

        // Hidden settings (config: false)
        const hiddenSettings = calls.filter(call => call[2].config === false)
        expect(hiddenSettings).toHaveLength(5)

        // Visible settings (config: true)
        const visibleSettings = calls.filter(call => call[2].config === true)
        expect(visibleSettings).toHaveLength(2)
        
        // Check that actionAnimations and autoConfirm are visible
        const visibleSettingNames = visibleSettings.map(call => call[1])
        expect(visibleSettingNames).toContain('actionAnimations')
        expect(visibleSettingNames).toContain('autoConfirm')
      })

      test('should have correct data types', () => {
        registerSystemSettings()

        const calls = mockGameSettings.register.mock.calls

        // String settings
        const stringSettings = calls.filter(call => call[2].type === String)
        expect(stringSettings).toHaveLength(2)
        expect(stringSettings.map(call => call[1])).toEqual(expect.arrayContaining(['systemMigrationVersion', 'worldKey']))

        // Boolean settings
        const booleanSettings = calls.filter(call => call[2].type === Boolean)
        expect(booleanSettings).toHaveLength(3)
        expect(booleanSettings.map(call => call[1])).toEqual(expect.arrayContaining(['devMode', 'actionAnimations', 'welcome']))

        // Number settings
        const numberSettings = calls.filter(call => call[2].type === Number)
        expect(numberSettings).toHaveLength(2)
        expect(numberSettings.map(call => call[1])).toEqual(expect.arrayContaining(['autoConfirm', 'heroism']))
      })

      test('should have correct default values', () => {
        registerSystemSettings()

        const calls = mockGameSettings.register.mock.calls

        // Check specific default values
        const settingsWithDefaults = calls.reduce((acc, call) => {
          acc[call[1]] = call[2].default
          return acc
        }, {})

        expect(settingsWithDefaults.systemMigrationVersion).toBe('')
        expect(settingsWithDefaults.worldKey).toBe('')
        expect(settingsWithDefaults.devMode).toBe(false)
        expect(settingsWithDefaults.actionAnimations).toBe(true)
        expect(settingsWithDefaults.welcome).toBe(false)
        expect(settingsWithDefaults.heroism).toBe(0)
        expect(settingsWithDefaults.autoConfirm).toBeUndefined() // This setting doesn't have a default
      })
    })

    describe('AutoConfirm Setting Choices', () => {
      test('should have correct choice options for autoConfirm', () => {
        registerSystemSettings()

        const autoConfirmCall = mockGameSettings.register.mock.calls.find(call => call[1] === 'autoConfirm')
        expect(autoConfirmCall).toBeDefined()

        const choices = autoConfirmCall[2].choices
        expect(choices).toEqual({
          0: 'SETTINGS.AutoConfirmNone',
          1: 'SETTINGS.AutoConfirmSelf',
          2: 'SETTINGS.AutoConfirmAll'
        })

        // Verify all choice keys are numbers
        const choiceKeys = Object.keys(choices)
        expect(choiceKeys).toEqual(['0', '1', '2'])

        // Verify all choice values are localization keys
        const choiceValues = Object.values(choices)
        for (const value of choiceValues) {
          expect(value).toMatch(/^SETTINGS\.AutoConfirm/)
        }
      })
    })

    describe('Error Handling', () => {
      test('should not throw when SYSTEM.id is available', () => {
        globalThis.SYSTEM = { id: 'swerpg' }

        expect(() => {
          registerSystemSettings()
        }).not.toThrow()
      })

      test('should handle multiple registrations gracefully', () => {
        // Register settings twice to test idempotency
        registerSystemSettings()
        registerSystemSettings()

        // Should have been called twice for each setting
        expect(mockGameSettings.register).toHaveBeenCalledTimes(14) // 7 settings x 2 calls
        expect(mockKeybindings.register).toHaveBeenCalledTimes(2) // 1 keybinding x 2 calls
      })
    })

    describe('Integration Tests', () => {
      test('should register all expected setting keys', () => {
        registerSystemSettings()

        const registeredKeys = mockGameSettings.register.mock.calls.map(call => call[1])
        const expectedKeys = [
          'systemMigrationVersion',
          'worldKey', 
          'devMode',
          'actionAnimations',
          'autoConfirm',
          'welcome',
          'heroism'
        ]

        for (const key of expectedKeys) {
          expect(registeredKeys).toContain(key)
        }
      })

      test('should use consistent system ID across all registrations', () => {
        registerSystemSettings()

        const systemIds = mockGameSettings.register.mock.calls.map(call => call[0])
        
        // All system settings should use 'swerpg' as the namespace
        for (const systemId of systemIds) {
          expect(systemId).toBe('swerpg')
        }

        // Keybinding should also use 'swerpg'
        expect(mockKeybindings.register.mock.calls[0][0]).toBe('swerpg')
      })
    })
  })
})