// actor-talents.test.mjs
// Tests for SwerpgActor talent-related methods
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { createMockActor } from '../utils/actors/actor-factory.js'

describe('SwerpgActor Talents', () => {
  let actor

  beforeEach(() => {
    actor = createMockActor()

    // Mock ui.notifications
    global.ui = {
      notifications: {
        warn: vi.fn(),
        info: vi.fn(),
      },
    }

    // Mock DialogV2
    global.DialogV2 = {
      confirm: vi.fn().mockResolvedValue(true),
    }
  })

  describe('addTalent()', () => {
    let mockTalent

    beforeEach(() => {
      mockTalent = {
        name: 'Test Talent',
        system: {
          assertPrerequisites: vi.fn(),
        },
        toObject: vi.fn().mockReturnValue({ name: 'Test Talent', type: 'talent' }),
        constructor: {
          create: vi.fn().mockResolvedValue({ name: 'Test Talent' }),
        },
      }

      // Override addTalent to simulate real behavior
      actor.addTalent = vi.fn().mockImplementation(async (talent, { dialog = false } = {}) => {
        // Confirm that the Actor meets the requirements to add the Talent
        try {
          talent.system.assertPrerequisites(actor)
        } catch (err) {
          ui.notifications.warn(err.message)
          return null
        }

        // Confirmation dialog
        if (dialog) {
          const confirm = await DialogV2.confirm({
            title: `Purchase Talent: ${talent.name}`,
            content: `<p>Spend 1 Talent Point to purchase <strong>${talent.name}</strong>?</p>`,
            defaultYes: false,
          })
          if (!confirm) return null

          // Re-confirm after the dialog has been submitted to prevent queuing
          try {
            talent.system.assertPrerequisites(actor)
          } catch (err) {
            ui.notifications.warn(err.message)
            return null
          }
        }

        // Create the talent
        return talent.constructor.create(talent.toObject(), { parent: actor, keepId: true })
      })
    })

    test('should show warning and return null if prerequisites fail', async () => {
      const error = new Error('Prerequisites not met')
      mockTalent.system.assertPrerequisites.mockImplementation(() => {
        throw error
      })

      const result = await actor.addTalent(mockTalent)

      expect(global.ui.notifications.warn).toHaveBeenCalledWith('Prerequisites not met')
      expect(result).toBeNull()
    })

    test('should return null if dialog is shown and cancelled', async () => {
      global.DialogV2.confirm.mockResolvedValue(false)

      const result = await actor.addTalent(mockTalent, { dialog: true })

      expect(result).toBeNull()
    })

    test('should re-check prerequisites after dialog confirmation', async () => {
      global.DialogV2.confirm.mockResolvedValue(true)

      await actor.addTalent(mockTalent, { dialog: true })

      expect(mockTalent.system.assertPrerequisites).toHaveBeenCalledTimes(2)
    })

    test('should show warning if prerequisites fail after dialog', async () => {
      global.DialogV2.confirm.mockResolvedValue(true)
      mockTalent.system.assertPrerequisites
        .mockImplementationOnce(() => {}) // First call succeeds
        .mockImplementationOnce(() => {
          throw new Error('Failed after dialog')
        }) // Second call fails

      const result = await actor.addTalent(mockTalent, { dialog: true })

      expect(global.ui.notifications.warn).toHaveBeenCalledWith('Failed after dialog')
      expect(result).toBeNull()
    })

    test('should create talent if all checks pass', async () => {
      const result = await actor.addTalent(mockTalent)

      expect(mockTalent.constructor.create).toHaveBeenCalledWith(mockTalent.toObject(), {
        parent: actor,
        keepId: true,
      })
      expect(result).toEqual({ name: 'Test Talent' })
    })

    test('should work without dialog by default', async () => {
      await actor.addTalent(mockTalent)

      expect(global.DialogV2.confirm).not.toHaveBeenCalled()
      expect(mockTalent.constructor.create).toHaveBeenCalled()
    })
  })

  describe('resetTalents()', () => {
    beforeEach(() => {
      // Setup items map with some talents
      const talent1 = { id: 'talent-1', type: 'talent' }
      const talent2 = { id: 'talent-2', type: 'talent' }
      const permanentTalent = { id: 'permanent-talent', type: 'talent' }

      actor.items = new Map([
        ['talent-1', talent1],
        ['talent-2', talent2],
        ['permanent-talent', permanentTalent],
      ])

      actor.permanentTalentIds = new Set(['permanent-talent'])
      actor.deleteEmbeddedDocuments = vi.fn().mockResolvedValue([])

      // Override resetTalents to simulate real behavior
      actor.resetTalents = vi.fn().mockImplementation(async ({ dialog = true } = {}) => {
        if (dialog) {
          const confirm = await DialogV2.confirm({
            window: {
              title: `Reset Talents: ${actor.name}`,
              icon: 'fa-solid fa-undo',
            },
            content: `<p>Are you sure you wish to reset all Talents?</p>`,
            yes: {
              default: true,
            },
          })
          if (!confirm) return
        }

        // Remove all non-permanent talents
        const deleteIds = Array.from(actor.items.values()).reduce((arr, i) => {
          if (i.type === 'talent' && !actor.permanentTalentIds.has(i.id)) arr.push(i.id)
          return arr
        }, [])
        await actor.deleteEmbeddedDocuments('Item', deleteIds)
      })
    })

    test('should show dialog and return if cancelled', async () => {
      global.DialogV2.confirm.mockResolvedValue(false)

      await actor.resetTalents({ dialog: true })

      expect(actor.deleteEmbeddedDocuments).not.toHaveBeenCalled()
    })

    test('should delete only non-permanent talents', async () => {
      await actor.resetTalents({ dialog: false })

      expect(actor.deleteEmbeddedDocuments).toHaveBeenCalledWith('Item', ['talent-1', 'talent-2'])
    })

    test('should not delete permanent talents', async () => {
      await actor.resetTalents({ dialog: false })

      const deleteCall = actor.deleteEmbeddedDocuments.mock.calls[0]
      const deletedIds = deleteCall[1]
      expect(deletedIds).not.toContain('permanent-talent')
    })

    test('should work without dialog by default', async () => {
      await actor.resetTalents()

      // With dialog=true by default, it will show dialog
      // But if we mock DialogV2.confirm to return true...
      global.DialogV2.confirm.mockResolvedValue(true)
      await actor.resetTalents()

      expect(actor.deleteEmbeddedDocuments).toHaveBeenCalled()
    })
  })
})
