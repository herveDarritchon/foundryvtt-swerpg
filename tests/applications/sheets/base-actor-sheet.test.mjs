// base-actor-sheet.test.mjs
import { describe, expect, test, vi, beforeEach } from 'vitest'

// Mock du logger
vi.mock('../../../module/utils/logger.mjs', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}))

// Le setup Foundry est maintenant géré globalement dans vitest-setup.js

// Mock JaugeFactory
vi.mock('../../../module/lib/jauges/jauge-factory.mjs', () => ({
  default: {}
}))

// Mock computeFeaturedEquipment
vi.mock('../../../module/lib/featured-equipment.mjs', () => ({
  computeFeaturedEquipment: vi.fn()
}))

// ATTENTION: Après refactor, le module `base-actor-sheet.mjs` accède immédiatement à
// `globalThis.foundry`. Les mocks Foundry (installés dans vitest-setup.js via beforeEach)
// ne sont pas encore en place au moment des imports statiques. On passe donc à un import
// dynamique post-mock dans le beforeEach pour éviter une erreur d'initialisation.
let SwerpgBaseActorSheet
import { logger } from '../../../module/utils/logger.mjs'

describe('SwerpgBaseActorSheet Bug Fix Integration Tests', () => {
  let mockActor
  let mockItem
  let mockEvent
  let sheetInstance

  beforeEach(async () => {
    // Reset des mocks
    vi.clearAllMocks()
    // Import dynamique après installation des mocks Foundry (effectuée par vitest-setup.js)
    // Garantit que `globalThis.foundry` existe avant l'évaluation du module.
    SwerpgBaseActorSheet = (await import('../../../module/applications/sheets/base-actor-sheet.mjs')).default

    // Mock d'un item
    mockItem = {
      id: 'test-item-id',
      name: 'Test Item',
      type: 'weapon',
      sheet: {
        render: vi.fn()
      },
      system: {
        equipped: false
      }
    }

    // Mock d'un acteur avec collection d'items
    mockActor = {
      id: 'test-actor-id',
      name: 'Test Actor',
      items: {
        get: vi.fn((id) => {
          if (id === 'test-item-id') return mockItem
          return null
        })
      },
      equipWeapon: vi.fn(),
      equipArmor: vi.fn()
    }

    // Mock d'un événement
    mockEvent = {
      target: {
        closest: vi.fn((selector) => {
          if (selector === '.line-item') {
            return {
              dataset: {
                itemId: 'test-item-id'
              }
            }
          }
          return null
        })
      }
    }

    // Créer une instance mock de la sheet
    sheetInstance = {
      actor: mockActor
    }
  })

  // plus besoin de teardown ici, géré globalement

  describe('Integration test for #onItemEdit with error handling', () => {
    test('should handle item edit without crashing when item exists', async () => {
      // Simuler l'appel à #onItemEdit en utilisant call pour définir 'this'
  await SwerpgBaseActorSheet.DEFAULT_OPTIONS.actions.itemEdit.call(sheetInstance, mockEvent)
      
      expect(mockActor.items.get).toHaveBeenCalledWith('test-item-id')
      expect(mockItem.sheet.render).toHaveBeenCalledWith({ force: true })
      expect(ui.notifications.error).not.toHaveBeenCalled()
      expect(ui.notifications.warn).not.toHaveBeenCalled()
    })

  test('should handle item edit gracefully when no itemId in event', async () => {
      const eventWithoutItemId = {
        target: {
          closest: vi.fn(() => ({
            dataset: {}
          }))
        }
      }
      
  await SwerpgBaseActorSheet.DEFAULT_OPTIONS.actions.itemEdit.call(sheetInstance, eventWithoutItemId)
      
      expect(logger.warn).toHaveBeenCalledWith('Missing itemId dataset on .line-item element')
      expect(ui.notifications.warn).toHaveBeenCalledWith('No item selected: Please click on a valid item.')
      expect(mockItem.sheet.render).not.toHaveBeenCalled()
    })

    test('should handle item edit gracefully when item not found', async () => {
      const eventWithInvalidItemId = {
        target: {
          closest: vi.fn(() => ({
            dataset: {
              itemId: 'non-existent-item-id'
            }
          }))
        }
      }
      
  await SwerpgBaseActorSheet.DEFAULT_OPTIONS.actions.itemEdit.call(sheetInstance, eventWithInvalidItemId)
      
      expect(mockActor.items.get).toHaveBeenCalledWith('non-existent-item-id')
      expect(logger.warn).toHaveBeenCalledWith('Item with id non-existent-item-id not found in actor Test Actor')
      expect(ui.notifications.warn).toHaveBeenCalledWith('Item not found: The selected item may have been deleted.')
      expect(mockItem.sheet.render).not.toHaveBeenCalled()
    })
  })

  describe('Integration test for #onItemEquip with error handling', () => {
    test('should handle item equip without crashing when item exists', async () => {
  await SwerpgBaseActorSheet.DEFAULT_OPTIONS.actions.itemEquip.call(sheetInstance, mockEvent)
      
      expect(mockActor.items.get).toHaveBeenCalledWith('test-item-id')
      expect(mockActor.equipWeapon).toHaveBeenCalledWith('test-item-id', { equipped: true })
      expect(ui.notifications.error).not.toHaveBeenCalled()
      expect(ui.notifications.warn).not.toHaveBeenCalled()
    })

    test('should handle item equip gracefully when item not found', async () => {
      const eventWithInvalidItemId = {
        target: {
          closest: vi.fn(() => ({
            dataset: {
              itemId: 'non-existent-item-id'
            }
          }))
        }
      }
      
  await SwerpgBaseActorSheet.DEFAULT_OPTIONS.actions.itemEquip.call(sheetInstance, eventWithInvalidItemId)
      
      expect(mockActor.items.get).toHaveBeenCalledWith('non-existent-item-id')
      expect(logger.warn).toHaveBeenCalledWith('Item with id non-existent-item-id not found in actor Test Actor')
      expect(ui.notifications.warn).toHaveBeenCalledWith('Item not found: The selected item may have been deleted.')
      expect(mockActor.equipWeapon).not.toHaveBeenCalled()
      expect(mockActor.equipArmor).not.toHaveBeenCalled()
    })
  })

  describe('Error boundary testing', () => {
    test('should handle actor without items collection', async () => {
      const actorWithoutItems = {
        id: 'test-actor-id',
        name: 'Test Actor'
        // pas de propriété items
      }
      
      const sheetWithBrokenActor = {
        actor: actorWithoutItems
      }
      
  await SwerpgBaseActorSheet.DEFAULT_OPTIONS.actions.itemEdit.call(sheetWithBrokenActor, mockEvent)
      
      expect(logger.error).toHaveBeenCalledWith('Actor Test Actor (test-actor-id) has no items collection')
      expect(ui.notifications.error).toHaveBeenCalledWith('Character data error: Items collection is missing.')
    })

    test('should not crash when items.get throws (returns null)', async () => {
      const actorWithBrokenItems = {
        id: 'test-actor-id',
        name: 'Test Actor',
        items: {
          get: vi.fn(() => { throw new Error('Database connection lost') })
        }
      }
      const sheetWithBrokenActor = { actor: actorWithBrokenItems }
      // Expect the call not to throw and simply not open any sheet.
      await expect(
        SwerpgBaseActorSheet.DEFAULT_OPTIONS.actions.itemEdit.call(sheetWithBrokenActor, mockEvent)
      ).resolves.toBeUndefined()
      expect(actorWithBrokenItems.items.get).toHaveBeenCalled()
    })
  })
})