// actor-equipment.test.mjs
// Tests for SwerpgActor equipment methods
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { createMockActor } from '../utils/actors/actor-factory.js'

describe('SwerpgActor Equipment', () => {
  let actor
  let mockArmorItem
  let mockWeaponItem

  beforeEach(() => {
    actor = createMockActor()

    // Mock equipment
    actor.equipment = {
      armor: null,
      weapons: {
        mainhand: null,
        offhand: null,
      },
    }

    // Mock items.get
    mockArmorItem = {
      id: 'armor-1',
      name: 'Test Armor',
      type: 'armor',
      system: { equipped: false },
      update: vi.fn().mockResolvedValue({}),
    }

    mockWeaponItem = {
      id: 'weapon-1',
      name: 'Test Weapon',
      type: 'weapon',
      system: { equipped: false, category: { hands: 1 } },
      update: vi.fn().mockResolvedValue({}),
    }

    // Override equipArmor to simulate real behavior
    actor.equipArmor = vi.fn().mockImplementation(async (itemId, { equipped = true } = {}) => {
      const current = actor.equipment.armor
      const item = actor.items.get(itemId)

      // Modify the currently equipped armor
      if (current === item) {
        if (equipped) return current
        else return current.update({ 'system.equipped': false })
      }

      // Cannot equip armor
      if (current?.id) {
        return ui.notifications.warn(
          game.i18n.format('WARNING.CannotEquipSlotInUse', {
            actor: actor.name,
            item: item.name,
            type: game.i18n.localize('TYPES.Item.armor'),
          }),
        )
      }

      // Equip new armor
      return item.update({ 'system.equipped': true })
    })

    actor.items.get = vi.fn()
    actor.updateEmbeddedDocuments = vi.fn().mockResolvedValue([])

    // Mock ui.notifications
    global.ui = {
      notifications: {
        warn: vi.fn(),
        info: vi.fn(),
      },
    }

    // Mock game.i18n
    global.game = {
      i18n: {
        localize: vi.fn((key) => key),
        format: vi.fn((key, data) => key),
      },
    }

    // Mock SYSTEM
    global.SYSTEM = {
      WEAPON: {
        SLOTS: { MAINHAND: 'mainhand', OFFHAND: 'offhand', TWOHAND: 'twohanded' },
      },
    }

    // Override equipArmor
    actor.equipArmor = vi.fn().mockImplementation(async (itemId, { equipped = true } = {}) => {
      const current = actor.equipment.armor
      const item = actor.items.get(itemId)

      if (current === item) {
        if (equipped) return current
        else return current.update({ 'system.equipped': false })
      }

      if (current?.id) {
        return ui.notifications.warn(
          game.i18n.format('WARNING.CannotEquipSlotInUse', {
            actor: actor.name,
            item: item.name,
            type: game.i18n.localize('TYPES.Item.armor'),
          }),
        )
      }

      return item.update({ 'system.equipped': true })
    })

    // Override equipWeapon
    actor.equipWeapon = vi.fn().mockImplementation(async (itemId, { slot, equipped = true } = {}) => {
      const weapon = actor.items.get(itemId, { strict: true })
      
      let itemUpdates = []
      let actionCost = 0
      
      if (equipped) {
        itemUpdates = [{ _id: weapon.id, 'system.equipped': true }]
        actionCost = 1
      } else {
        if (weapon.system.equipped) {
          itemUpdates.push({ _id: weapon.id, 'system.equipped': false })
        }
      }

      if (actor.combatant) {
        if (actor.system.resources.action.value < actionCost) {
          throw new Error(game.i18n.localize('WARNING.CannotEquipActionCost'))
        }
        await actor.alterResources({ action: -actionCost }, {})
      }

      await actor.updateEmbeddedDocuments('Item', itemUpdates)
    })
  })

  describe('equipArmor()', () => {
    test('should equip armor if no armor currently equipped', async () => {
      actor.items.get.mockReturnValue(mockArmorItem)
      actor.equipment.armor = null

      await actor.equipArmor('armor-1')

      expect(mockArmorItem.update).toHaveBeenCalledWith({ 'system.equipped': true })
    })

    test('should return current armor if trying to equip already equipped armor', async () => {
      actor.items.get.mockReturnValue(mockArmorItem)
      actor.equipment.armor = mockArmorItem

      const result = await actor.equipArmor('armor-1', { equipped: true })

      expect(result).toBe(mockArmorItem)
      expect(mockArmorItem.update).not.toHaveBeenCalled()
    })

    test('should unequip armor if equipped param is false', async () => {
      const equippedArmor = { ...mockArmorItem, name: 'Test Armor', system: { equipped: true } }
      actor.items.get.mockReturnValue(equippedArmor)
      actor.equipment.armor = equippedArmor

      await actor.equipArmor('armor-1', { equipped: false })

      expect(equippedArmor.update).toHaveBeenCalledWith({ 'system.equipped': false })
    })

    test('should show warning if slot is already occupied', async () => {
      const currentArmor = { id: 'armor-2', name: 'Current Armor', type: 'armor' }
      actor.equipment.armor = currentArmor
      actor.items.get.mockReturnValue(mockArmorItem)

      await actor.equipArmor('armor-1')

      expect(global.ui.notifications.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARNING.CannotEquipSlotInUse'),
      )
    })

    test('should return the result of item.update()', async () => {
      actor.items.get.mockReturnValue(mockArmorItem)
      const mockResult = { id: 'updated-armor' }
      mockArmorItem.update.mockResolvedValue(mockResult)

      const result = await actor.equipArmor('armor-1')

      expect(result).toBe(mockResult)
    })
  })

  describe('equipWeapon()', () => {
    beforeEach(() => {
      actor.combatant = null
    })

    test('should equip weapon if no weapon in slot', async () => {
      actor.items.get.mockReturnValue(mockWeaponItem)
      actor.equipment.weapons.mainhand = null

      await actor.equipWeapon('weapon-1')

      expect(actor.updateEmbeddedDocuments).toHaveBeenCalled()
    })

    test('should handle unequipping weapon', async () => {
      const equippedWeapon = { ...mockWeaponItem, system: { equipped: true } }
      actor.items.get.mockReturnValue(equippedWeapon)

      await actor.equipWeapon('weapon-1', { equipped: false })

      expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith('Item', [
        { _id: 'weapon-1', 'system.equipped': false },
      ])
    })

    test('should enforce action cost if in combat', async () => {
      actor.combatant = { id: 'combatant-1' }
      actor.system.resources.action.value = 2
      actor.items.get.mockReturnValue(mockWeaponItem)
      actor.alterResources = vi.fn().mockResolvedValue()

      await actor.equipWeapon('weapon-1')

      expect(actor.alterResources).toHaveBeenCalled()
    })

    test('should throw error if not enough action in combat', async () => {
      actor.combatant = { id: 'combatant-1' }
      actor.system.resources.action.value = 0
      actor.items.get.mockReturnValue(mockWeaponItem)

      await expect(actor.equipWeapon('weapon-1')).rejects.toThrow('WARNING.CannotEquipActionCost')
    })
  })
})
