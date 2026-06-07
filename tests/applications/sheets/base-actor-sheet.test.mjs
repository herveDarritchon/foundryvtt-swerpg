// base-actor-sheet.test.mjs
import { describe, expect, test, vi, beforeEach } from 'vitest'

// Mock du logger
vi.mock('../../../module/utils/logger.mjs', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

// Le setup Foundry est maintenant géré globalement dans vitest-setup.js

// Mock JaugeFactory
vi.mock('../../../module/lib/jauges/jauge-factory.mjs', () => ({
  default: {},
}))

// Mock computeFeaturedEquipment
vi.mock('../../../module/lib/featured-equipment.mjs', () => ({
  computeFeaturedEquipment: vi.fn(),
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
        render: vi.fn(),
      },
      system: {
        equipped: false,
      },
    }

    // Mock d'un acteur avec collection d'items
    mockActor = {
      id: 'test-actor-id',
      name: 'Test Actor',
      items: {
        get: vi.fn((id) => {
          if (id === 'test-item-id') return mockItem
          return null
        }),
      },
      equipWeapon: vi.fn(),
      equipArmor: vi.fn(),
    }

    // Mock d'un événement
    mockEvent = {
      target: {
        closest: vi.fn((selector) => {
          if (selector === '.line-item') {
            return {
              dataset: {
                itemId: 'test-item-id',
              },
            }
          }
          return null
        }),
      },
    }

    // Créer une instance mock de la sheet
    sheetInstance = {
      actor: mockActor,
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
            dataset: {},
          })),
        },
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
              itemId: 'non-existent-item-id',
            },
          })),
        },
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
              itemId: 'non-existent-item-id',
            },
          })),
        },
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
        name: 'Test Actor',
        // pas de propriété items
      }

      const sheetWithBrokenActor = {
        actor: actorWithoutItems,
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
          get: vi.fn(() => {
            throw new Error('Database connection lost')
          }),
        },
      }
      const sheetWithBrokenActor = { actor: actorWithBrokenItems }
      // Expect the call not to throw and simply not open any sheet.
      await expect(SwerpgBaseActorSheet.DEFAULT_OPTIONS.actions.itemEdit.call(sheetWithBrokenActor, mockEvent)).resolves.toBeUndefined()
      expect(actorWithBrokenItems.items.get).toHaveBeenCalled()
    })
  })
})

// ---------------------------------------------------------------------------
// Regression: gear items must appear in inventory.backpack (issue #447)
// ---------------------------------------------------------------------------
import { computeFeaturedEquipment as computeFeaturedEquipmentForGearTests } from '../../../module/lib/featured-equipment.mjs'

describe('SwerpgBaseActorSheet #prepareItems — gear inventory classification', () => {
  let SwerpgBaseActorSheetLocal

  /**
   * Build a minimal mock actor/document so that _prepareContext() can run through
   * without throwing.  All helpers that are irrelevant to the inventory test are
   * given their smallest-possible return values.
   *
   * @param {object[]} itemsArray   Array of plain item mocks (id, name, img, type, system, getTags, actions).
   * @returns {{ document: object, actor: object }}
   */
  function buildMockDocument(itemsArray) {
    const actor = {
      id: 'actor-test',
      name: 'Test Actor',
      system: {
        characteristics: {
          brawn: { rank: { base: 2, trained: 0 } },
          agility: { rank: { base: 2, trained: 0 } },
          intellect: { rank: { base: 2, trained: 0 } },
          cunning: { rank: { base: 2, trained: 0 } },
          willpower: { rank: { base: 2, trained: 0 } },
          presence: { rank: { base: 2, trained: 0 } },
        },
        progression: {
          experience: { gained: 0, spent: 0 },
          freeSkillRanks: {
            career: { gained: 0, spent: 0 },
            specialization: { gained: 0, spent: 0 },
          },
        },
        details: {
          biography: { appearance: '', public: '', private: '' },
          commitments: { motivation: '' },
        },
        schema: { fields: {} },
      },
      isOwner: true,
      items: {
        find: vi.fn((fn) => itemsArray.find(fn) || null),
        filter: vi.fn((fn) => itemsArray.filter(fn)),
        get: vi.fn((id) => itemsArray.find((i) => i.id === id) || null),
        [Symbol.iterator]: function* () {
          yield* itemsArray
        },
      },
      effects: [],
      actions: {},
      canPurchaseCharacteristic: vi.fn(() => false),
      toObject: vi.fn(() => ({})),
    }
    return actor
  }

  /**
   * Create a minimal SwerpgBaseActorSheet instance wired to the given items.
   * Must use `new` to initialize private class fields.
   * After construction, document and actor are overwritten with the test mock.
   */
  async function buildSheet(itemsArray) {
    const Sheet = SwerpgBaseActorSheetLocal
    const actor = buildMockDocument(itemsArray)

    // Patch foundry.applications.ux.TextEditor if not yet defined
    if (!globalThis.foundry.applications.ux) {
      globalThis.foundry.applications.ux = {}
    }
    if (!globalThis.foundry.applications.ux.TextEditor) {
      globalThis.foundry.applications.ux.TextEditor = { enrichHTML: vi.fn(async (s) => s || '') }
    }

    // Patch SYSTEM.RESTRICTION_LEVELS if not present (needed by #prepareFeaturedEquipment)
    if (!globalThis.SYSTEM.RESTRICTION_LEVELS) {
      globalThis.SYSTEM.RESTRICTION_LEVELS = {}
    }

    // Use `new` so private class fields are properly initialized
    const instance = new Sheet({})
    // Override document/actor with our test mock after construction
    instance.document = actor
    instance.actor = actor
    instance.tabGroups = { sheet: 'attributes' }
    instance.isEditable = true

    return instance
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    SwerpgBaseActorSheetLocal = (await import('../../../module/applications/sheets/base-actor-sheet.mjs')).default
    vi.mocked(computeFeaturedEquipmentForGearTests).mockReturnValue([])
  })

  test('gear item appears in inventory.backpack', async () => {
    const gearItem = {
      id: 'gear-1',
      name: 'Medpac',
      img: 'icons/gear.webp',
      type: 'gear',
      system: { quantity: 2 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheet([gearItem])
    const ctx = await instance._prepareContext({})

    const backpackItems = ctx.inventory.backpack.items
    expect(backpackItems).toHaveLength(1)
    expect(backpackItems[0].id).toBe('gear-1')
    expect(backpackItems[0].name).toBe('Medpac')
  })

  test('gear item is excluded from inventory.equipment', async () => {
    const gearItem = {
      id: 'gear-1',
      name: 'Medpac',
      img: 'icons/gear.webp',
      type: 'gear',
      system: { quantity: 1 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheet([gearItem])
    const ctx = await instance._prepareContext({})

    expect(ctx.inventory.equipment.items).toHaveLength(0)
  })

  test('gear item is marked canEquip: false', async () => {
    const gearItem = {
      id: 'gear-1',
      name: 'Medpac',
      img: 'icons/gear.webp',
      type: 'gear',
      system: { quantity: 1 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheet([gearItem])
    const ctx = await instance._prepareContext({})

    expect(ctx.inventory.backpack.items[0].canEquip).toBe(false)
  })

  test('equipped weapon appears in inventory.equipment with canEquip: true', async () => {
    const weaponItem = {
      id: 'weapon-1',
      name: 'Blaster Pistol',
      img: 'icons/weapon.webp',
      type: 'weapon',
      system: { equipped: true, quantity: 1 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheet([weaponItem])
    const ctx = await instance._prepareContext({})

    const equipmentItems = ctx.inventory.equipment.items
    expect(equipmentItems).toHaveLength(1)
    expect(equipmentItems[0].id).toBe('weapon-1')
    expect(equipmentItems[0].canEquip).toBe(true)
  })

  test('unequipped armor appears in inventory.backpack with canEquip: true', async () => {
    const armorItem = {
      id: 'armor-1',
      name: 'Light Armor',
      img: 'icons/armor.webp',
      type: 'armor',
      system: { equipped: false, quantity: 1 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheet([armorItem])
    const ctx = await instance._prepareContext({})

    const backpackItems = ctx.inventory.backpack.items
    expect(backpackItems).toHaveLength(1)
    expect(backpackItems[0].id).toBe('armor-1')
    expect(backpackItems[0].canEquip).toBe(true)
  })

  test('mixed inventory: gear goes to backpack, equipped weapon goes to equipment, unequipped armor goes to backpack', async () => {
    const items = [
      {
        id: 'gear-1',
        name: 'Medpac',
        img: '',
        type: 'gear',
        system: { quantity: 3 },
        getTags: vi.fn(() => ({})),
        actions: { at: () => null },
      },
      {
        id: 'weapon-1',
        name: 'Blaster Pistol',
        img: '',
        type: 'weapon',
        system: { equipped: true, quantity: 1 },
        getTags: vi.fn(() => ({})),
        actions: { at: () => null },
      },
      {
        id: 'armor-1',
        name: 'Light Armor',
        img: '',
        type: 'armor',
        system: { equipped: false, quantity: 1 },
        getTags: vi.fn(() => ({})),
        actions: { at: () => null },
      },
    ]
    const instance = await buildSheet(items)
    const ctx = await instance._prepareContext({})

    // Equipment: only equipped weapon
    expect(ctx.inventory.equipment.items).toHaveLength(1)
    expect(ctx.inventory.equipment.items[0].id).toBe('weapon-1')
    expect(ctx.inventory.equipment.items[0].canEquip).toBe(true)

    // Backpack: gear + unequipped armor (sorted by name: Light Armor < Medpac)
    expect(ctx.inventory.backpack.items).toHaveLength(2)
    const backpackIds = ctx.inventory.backpack.items.map((i) => i.id)
    expect(backpackIds).toContain('gear-1')
    expect(backpackIds).toContain('armor-1')

    const gearEntry = ctx.inventory.backpack.items.find((i) => i.id === 'gear-1')
    expect(gearEntry.canEquip).toBe(false)

    const armorEntry = ctx.inventory.backpack.items.find((i) => i.id === 'armor-1')
    expect(armorEntry.canEquip).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Regression: inventory section labels must come from i18n keys (issue #630)
// ---------------------------------------------------------------------------

import { setupFoundryMock as setupFoundryMockForI18n } from '../../helpers/mock-foundry.mjs'
import { computeFeaturedEquipment as computeFeaturedEquipmentForI18nTests } from '../../../module/lib/featured-equipment.mjs'

describe('SwerpgBaseActorSheet #prepareItems — inventory section i18n labels', () => {
  let SwerpgBaseActorSheetI18n

  function buildMockDocumentI18n(itemsArray = []) {
    return {
      id: 'actor-i18n',
      name: 'I18n Actor',
      system: {
        characteristics: {
          brawn: { rank: { base: 2, trained: 0 } },
          agility: { rank: { base: 2, trained: 0 } },
          intellect: { rank: { base: 2, trained: 0 } },
          cunning: { rank: { base: 2, trained: 0 } },
          willpower: { rank: { base: 2, trained: 0 } },
          presence: { rank: { base: 2, trained: 0 } },
        },
        progression: {
          experience: { gained: 0, spent: 0 },
          freeSkillRanks: {
            career: { gained: 0, spent: 0 },
            specialization: { gained: 0, spent: 0 },
          },
        },
        details: {
          biography: { appearance: '', public: '', private: '' },
          commitments: { motivation: '' },
        },
        schema: { fields: {} },
      },
      isOwner: true,
      items: {
        find: vi.fn((fn) => itemsArray.find(fn) || null),
        filter: vi.fn((fn) => itemsArray.filter(fn)),
        get: vi.fn((id) => itemsArray.find((i) => i.id === id) || null),
        [Symbol.iterator]: function* () {
          yield* itemsArray
        },
      },
      effects: [],
      actions: {},
      canPurchaseCharacteristic: vi.fn(() => false),
      toObject: vi.fn(() => ({})),
    }
  }

  async function buildSheetI18n() {
    const Sheet = SwerpgBaseActorSheetI18n
    const actor = buildMockDocumentI18n([])

    if (!globalThis.foundry.applications.ux) {
      globalThis.foundry.applications.ux = {}
    }
    if (!globalThis.foundry.applications.ux.TextEditor) {
      globalThis.foundry.applications.ux.TextEditor = { enrichHTML: vi.fn(async (s) => s || '') }
    }
    if (!globalThis.SYSTEM.RESTRICTION_LEVELS) {
      globalThis.SYSTEM.RESTRICTION_LEVELS = {}
    }

    const instance = new Sheet({})
    instance.document = actor
    instance.actor = actor
    instance.tabGroups = { sheet: 'attributes' }
    instance.isEditable = true
    return instance
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    SwerpgBaseActorSheetI18n = (await import('../../../module/applications/sheets/base-actor-sheet.mjs')).default
    vi.mocked(computeFeaturedEquipmentForI18nTests).mockReturnValue([])
  })

  test('inventory.equipment.label is resolved via i18n key ACTOR.LABELS.EQUIPMENT (English)', async () => {
    // Override translations with English values to verify the key is used
    setupFoundryMockForI18n({
      translations: {
        'ACTOR.LABELS.EQUIPMENT': 'Equipment',
        'ACTOR.LABELS.BACKPACK': 'Backpack',
        'ACTOR.LABELS.EQUIPMENT_HINT': 'Equip weapons and armor from your Backpack toggling the shield icon.',
        'ACTOR.LABELS.BACKPACK_HINT': 'Add Armor, Weapons, or Gear by dropping them from the provided Swerpg system compendium packs.',
      },
    })
    const instance = await buildSheetI18n()
    const ctx = await instance._prepareContext({})

    expect(ctx.inventory.equipment.label).toBe('Equipment')
    expect(ctx.inventory.backpack.label).toBe('Backpack')
  })

  test('inventory.equipment.label is resolved via i18n key ACTOR.LABELS.EQUIPMENT (French)', async () => {
    // Simulate French locale by overriding translations with French values
    setupFoundryMockForI18n({
      translations: {
        'ACTOR.LABELS.EQUIPMENT': 'Équipement',
        'ACTOR.LABELS.BACKPACK': 'Sac à dos',
        'ACTOR.LABELS.EQUIPMENT_HINT': "Équipez vos armes et armures depuis votre sac à dos en activant l'icône de bouclier.",
        'ACTOR.LABELS.BACKPACK_HINT': 'Ajoutez une armure, des armes ou du matériel en les déposant depuis les compendiums du système Swerpg fournis.',
      },
    })
    const instance = await buildSheetI18n()
    const ctx = await instance._prepareContext({})

    expect(ctx.inventory.equipment.label).toBe('Équipement')
    expect(ctx.inventory.backpack.label).toBe('Sac à dos')
  })

  test('inventory.equipment.empty hint is resolved via i18n key (English)', async () => {
    setupFoundryMockForI18n({
      translations: {
        'ACTOR.LABELS.EQUIPMENT': 'Equipment',
        'ACTOR.LABELS.BACKPACK': 'Backpack',
        'ACTOR.LABELS.EQUIPMENT_HINT': 'Equip weapons and armor from your Backpack toggling the shield icon.',
        'ACTOR.LABELS.BACKPACK_HINT': 'Add Armor, Weapons, or Gear by dropping them from the provided Swerpg system compendium packs.',
      },
    })
    const instance = await buildSheetI18n()
    const ctx = await instance._prepareContext({})

    expect(ctx.inventory.equipment.empty).toBe('Equip weapons and armor from your Backpack toggling the shield icon.')
    expect(ctx.inventory.backpack.empty).toBe('Add Armor, Weapons, or Gear by dropping them from the provided Swerpg system compendium packs.')
  })

  test('inventory.equipment.empty hint is resolved via i18n key (French)', async () => {
    setupFoundryMockForI18n({
      translations: {
        'ACTOR.LABELS.EQUIPMENT': 'Équipement',
        'ACTOR.LABELS.BACKPACK': 'Sac à dos',
        'ACTOR.LABELS.EQUIPMENT_HINT': "Équipez vos armes et armures depuis votre sac à dos en activant l'icône de bouclier.",
        'ACTOR.LABELS.BACKPACK_HINT': 'Ajoutez une armure, des armes ou du matériel en les déposant depuis les compendiums du système Swerpg fournis.',
      },
    })
    const instance = await buildSheetI18n()
    const ctx = await instance._prepareContext({})

    expect(ctx.inventory.equipment.empty).toBe("Équipez vos armes et armures depuis votre sac à dos en activant l'icône de bouclier.")
    expect(ctx.inventory.backpack.empty).toBe('Ajoutez une armure, des armes ou du matériel en les déposant depuis les compendiums du système Swerpg fournis.')
  })

  test('inventory section labels are not hardcoded English strings', async () => {
    // When i18n returns the key (no translation found), the label must equal the key, not a hardcoded English word
    // This guards against regression where labels were inlined as 'Equipment' / 'Backpack' in JS
    setupFoundryMockForI18n({ translations: {} })
    const instance = await buildSheetI18n()
    const ctx = await instance._prepareContext({})

    expect(ctx.inventory.equipment.label).toBe('ACTOR.LABELS.EQUIPMENT')
    expect(ctx.inventory.backpack.label).toBe('ACTOR.LABELS.BACKPACK')
  })
})

// ---------------------------------------------------------------------------
// Regression: inventory items must use getTags('short') — issue #631
// ---------------------------------------------------------------------------

import { computeFeaturedEquipment as computeFeaturedEquipmentForTagsTests } from '../../../module/lib/featured-equipment.mjs'

describe('SwerpgBaseActorSheet #prepareItems — compact tags via getTags("short")', () => {
  let SwerpgBaseActorSheetTags

  function buildMockDocumentTags(itemsArray) {
    return {
      id: 'actor-tags',
      name: 'Tags Actor',
      system: {
        characteristics: {
          brawn: { rank: { base: 2, trained: 0 } },
          agility: { rank: { base: 2, trained: 0 } },
          intellect: { rank: { base: 2, trained: 0 } },
          cunning: { rank: { base: 2, trained: 0 } },
          willpower: { rank: { base: 2, trained: 0 } },
          presence: { rank: { base: 2, trained: 0 } },
        },
        progression: {
          experience: { gained: 0, spent: 0 },
          freeSkillRanks: {
            career: { gained: 0, spent: 0 },
            specialization: { gained: 0, spent: 0 },
          },
        },
        details: {
          biography: { appearance: '', public: '', private: '' },
          commitments: { motivation: '' },
        },
        schema: { fields: {} },
      },
      isOwner: true,
      items: {
        find: vi.fn((fn) => itemsArray.find(fn) || null),
        filter: vi.fn((fn) => itemsArray.filter(fn)),
        get: vi.fn((id) => itemsArray.find((i) => i.id === id) || null),
        [Symbol.iterator]: function* () {
          yield* itemsArray
        },
      },
      effects: [],
      actions: {},
      canPurchaseCharacteristic: vi.fn(() => false),
      toObject: vi.fn(() => ({})),
    }
  }

  async function buildSheetTags(itemsArray) {
    const Sheet = SwerpgBaseActorSheetTags
    const actor = buildMockDocumentTags(itemsArray)

    if (!globalThis.foundry.applications.ux) {
      globalThis.foundry.applications.ux = {}
    }
    if (!globalThis.foundry.applications.ux.TextEditor) {
      globalThis.foundry.applications.ux.TextEditor = { enrichHTML: vi.fn(async (s) => s || '') }
    }
    if (!globalThis.SYSTEM.RESTRICTION_LEVELS) {
      globalThis.SYSTEM.RESTRICTION_LEVELS = {}
    }

    const instance = new Sheet({})
    instance.document = actor
    instance.actor = actor
    instance.tabGroups = { sheet: 'attributes' }
    instance.isEditable = true
    return instance
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    SwerpgBaseActorSheetTags = (await import('../../../module/applications/sheets/base-actor-sheet.mjs')).default
    vi.mocked(computeFeaturedEquipmentForTagsTests).mockReturnValue([])
  })

  test('weapon item getTags is called with "short" scope for inventory', async () => {
    const getTagsMock = vi.fn(() => ({ damage: '5 Damage', category: 'Ranged' }))
    const weaponItem = {
      id: 'weapon-short-1',
      name: 'Blaster Pistol',
      img: 'icons/weapon.webp',
      type: 'weapon',
      system: { equipped: false, quantity: 1 },
      getTags: getTagsMock,
      actions: { at: () => null },
    }
    const instance = await buildSheetTags([weaponItem])
    await instance._prepareContext({})

    expect(getTagsMock).toHaveBeenCalledWith('short')
  })

  test('armor item getTags is called with "short" scope for inventory', async () => {
    const getTagsMock = vi.fn(() => ({ category: 'Light Armor', defense: '2 Armor' }))
    const armorItem = {
      id: 'armor-short-1',
      name: 'Light Armor',
      img: 'icons/armor.webp',
      type: 'armor',
      system: { equipped: false, quantity: 1 },
      getTags: getTagsMock,
      actions: { at: () => null },
    }
    const instance = await buildSheetTags([armorItem])
    await instance._prepareContext({})

    expect(getTagsMock).toHaveBeenCalledWith('short')
  })

  test('gear item getTags is called with "short" scope for inventory', async () => {
    const getTagsMock = vi.fn(() => ({}))
    const gearItem = {
      id: 'gear-short-1',
      name: 'Medpac',
      img: 'icons/gear.webp',
      type: 'gear',
      system: { quantity: 2 },
      getTags: getTagsMock,
      actions: { at: () => null },
    }
    const instance = await buildSheetTags([gearItem])
    await instance._prepareContext({})

    expect(getTagsMock).toHaveBeenCalledWith('short')
  })

  test('inventory item tags object reflects short-scope tags returned by getTags', async () => {
    // Short scope for weapon omits range, qualities, block, parry — only damage, category, type
    const shortTags = { damage: '5 Damage', category: 'Ranged' }
    const weaponItem = {
      id: 'weapon-tags-1',
      name: 'Blaster Pistol',
      img: '',
      type: 'weapon',
      system: { equipped: false, quantity: 1 },
      getTags: vi.fn(() => shortTags),
      actions: { at: () => null },
    }
    const instance = await buildSheetTags([weaponItem])
    const ctx = await instance._prepareContext({})

    const item = ctx.inventory.backpack.items.find((i) => i.id === 'weapon-tags-1')
    expect(item).toBeDefined()
    expect(item.tags).toEqual(shortTags)
    // Verify no full-scope-only tags leaked through
    expect(item.tags).not.toHaveProperty('range')
  })

  test('restriction badge tag is preserved in short scope for weapon with restriction', async () => {
    const shortTags = { damage: '5 Damage', restricted: 'Restricted' }
    const weaponItem = {
      id: 'weapon-restricted-1',
      name: 'Heavy Repeating Blaster',
      img: '',
      type: 'weapon',
      system: { equipped: false, quantity: 1, restrictionLevel: 'restricted' },
      getTags: vi.fn(() => shortTags),
      actions: { at: () => null },
    }

    globalThis.SYSTEM.RESTRICTION_LEVELS = {
      restricted: { label: 'SWERPG.Restriction.Restricted' },
    }
    globalThis.game.i18n.localize = (key) => key

    const instance = await buildSheetTags([weaponItem])
    const ctx = await instance._prepareContext({})

    const item = ctx.inventory.backpack.items.find((i) => i.id === 'weapon-restricted-1')
    expect(item).toBeDefined()
    expect(item.restrictionBadge).toBeDefined()
    expect(item.restrictionBadge.level).toBe('restricted')
  })
})

// ---------------------------------------------------------------------------
// Feature #633: inventory line items must expose quantity, encumbrance, price
// ---------------------------------------------------------------------------

import { computeFeaturedEquipment as computeFeaturedEquipmentForMetricsTests } from '../../../module/lib/featured-equipment.mjs'

describe('SwerpgBaseActorSheet #prepareItems — inventory line item metrics (issue #633)', () => {
  let SwerpgBaseActorSheetMetrics

  function buildMockDocumentMetrics(itemsArray) {
    return {
      id: 'actor-metrics',
      name: 'Metrics Actor',
      system: {
        characteristics: {
          brawn: { rank: { base: 2, trained: 0 } },
          agility: { rank: { base: 2, trained: 0 } },
          intellect: { rank: { base: 2, trained: 0 } },
          cunning: { rank: { base: 2, trained: 0 } },
          willpower: { rank: { base: 2, trained: 0 } },
          presence: { rank: { base: 2, trained: 0 } },
        },
        progression: {
          experience: { gained: 0, spent: 0 },
          freeSkillRanks: {
            career: { gained: 0, spent: 0 },
            specialization: { gained: 0, spent: 0 },
          },
        },
        details: {
          biography: { appearance: '', public: '', private: '' },
          commitments: { motivation: '' },
        },
        schema: { fields: {} },
      },
      isOwner: true,
      items: {
        find: vi.fn((fn) => itemsArray.find(fn) || null),
        filter: vi.fn((fn) => itemsArray.filter(fn)),
        get: vi.fn((id) => itemsArray.find((i) => i.id === id) || null),
        [Symbol.iterator]: function* () {
          yield* itemsArray
        },
      },
      effects: [],
      actions: {},
      canPurchaseCharacteristic: vi.fn(() => false),
      toObject: vi.fn(() => ({})),
    }
  }

  async function buildSheetMetrics(itemsArray) {
    const Sheet = SwerpgBaseActorSheetMetrics
    const actor = buildMockDocumentMetrics(itemsArray)

    if (!globalThis.foundry.applications.ux) {
      globalThis.foundry.applications.ux = {}
    }
    if (!globalThis.foundry.applications.ux.TextEditor) {
      globalThis.foundry.applications.ux.TextEditor = { enrichHTML: vi.fn(async (s) => s || '') }
    }
    if (!globalThis.SYSTEM.RESTRICTION_LEVELS) {
      globalThis.SYSTEM.RESTRICTION_LEVELS = {}
    }

    const instance = new Sheet({})
    instance.document = actor
    instance.actor = actor
    instance.tabGroups = { sheet: 'attributes' }
    instance.isEditable = true
    return instance
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    SwerpgBaseActorSheetMetrics = (await import('../../../module/applications/sheets/base-actor-sheet.mjs')).default
    vi.mocked(computeFeaturedEquipmentForMetricsTests).mockReturnValue([])
  })

  test('gear item exposes quantity, encumbrance and price in inventory view-model', async () => {
    const gearItem = {
      id: 'gear-metrics-1',
      name: 'Medpac',
      img: 'icons/gear.webp',
      type: 'gear',
      system: { quantity: 3, encumbrance: 1, price: 25 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheetMetrics([gearItem])
    const ctx = await instance._prepareContext({})

    const item = ctx.inventory.backpack.items.find((i) => i.id === 'gear-metrics-1')
    expect(item).toBeDefined()
    expect(item.quantity).toBe(3)
    expect(item.encumbrance).toBe(1)
    expect(item.price).toBe(25)
  })

  test('weapon item exposes quantity, encumbrance and price in inventory view-model', async () => {
    const weaponItem = {
      id: 'weapon-metrics-1',
      name: 'Blaster Pistol',
      img: 'icons/weapon.webp',
      type: 'weapon',
      system: { equipped: false, quantity: 1, encumbrance: 2, price: 400 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheetMetrics([weaponItem])
    const ctx = await instance._prepareContext({})

    const item = ctx.inventory.backpack.items.find((i) => i.id === 'weapon-metrics-1')
    expect(item).toBeDefined()
    expect(item.quantity).toBe(1)
    expect(item.encumbrance).toBe(2)
    expect(item.price).toBe(400)
  })

  test('armor item exposes quantity, encumbrance and price in inventory view-model', async () => {
    const armorItem = {
      id: 'armor-metrics-1',
      name: 'Light Armor',
      img: 'icons/armor.webp',
      type: 'armor',
      system: { equipped: false, quantity: 1, encumbrance: 3, price: 500 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheetMetrics([armorItem])
    const ctx = await instance._prepareContext({})

    const item = ctx.inventory.backpack.items.find((i) => i.id === 'armor-metrics-1')
    expect(item).toBeDefined()
    expect(item.quantity).toBe(1)
    expect(item.encumbrance).toBe(3)
    expect(item.price).toBe(500)
  })

  test('quantity=1 item still exposes quantity in view-model (no stack suppression)', async () => {
    const gearItem = {
      id: 'gear-qty-one',
      name: 'Stim Pack',
      img: '',
      type: 'gear',
      system: { quantity: 1, encumbrance: 0, price: 10 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheetMetrics([gearItem])
    const ctx = await instance._prepareContext({})

    const item = ctx.inventory.backpack.items.find((i) => i.id === 'gear-qty-one')
    expect(item).toBeDefined()
    expect(item.quantity).toBe(1)
  })

  test('quantity>1 item exposes quantity without a separate showStack flag', async () => {
    const gearItem = {
      id: 'gear-qty-stack',
      name: 'Stim Pack',
      img: '',
      type: 'gear',
      system: { quantity: 5, encumbrance: 0, price: 10 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheetMetrics([gearItem])
    const ctx = await instance._prepareContext({})

    const item = ctx.inventory.backpack.items.find((i) => i.id === 'gear-qty-stack')
    expect(item).toBeDefined()
    expect(item.quantity).toBe(5)
    expect(item.showStack).toBeUndefined()
  })

  test('equipped weapon also exposes metrics in the equipment section', async () => {
    const weaponItem = {
      id: 'weapon-equipped-metrics',
      name: 'Heavy Blaster',
      img: '',
      type: 'weapon',
      system: { equipped: true, quantity: 1, encumbrance: 4, price: 1200 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheetMetrics([weaponItem])
    const ctx = await instance._prepareContext({})

    const item = ctx.inventory.equipment.items.find((i) => i.id === 'weapon-equipped-metrics')
    expect(item).toBeDefined()
    expect(item.quantity).toBe(1)
    expect(item.encumbrance).toBe(4)
    expect(item.price).toBe(1200)
  })
})

// ---------------------------------------------------------------------------
// Feature #634: inventory line item controls — declarative contract for
// accessible equip/unequip label and equipped state fields
// ---------------------------------------------------------------------------

import { computeFeaturedEquipment as computeFeaturedEquipmentForControlsTests } from '../../../module/lib/featured-equipment.mjs'

describe('SwerpgBaseActorSheet #prepareItems — inventory line item controls contract (issue #634)', () => {
  let SwerpgBaseActorSheetControls

  function buildMockDocumentControls(itemsArray) {
    return {
      id: 'actor-controls',
      name: 'Controls Actor',
      system: {
        characteristics: {
          brawn: { rank: { base: 2, trained: 0 } },
          agility: { rank: { base: 2, trained: 0 } },
          intellect: { rank: { base: 2, trained: 0 } },
          cunning: { rank: { base: 2, trained: 0 } },
          willpower: { rank: { base: 2, trained: 0 } },
          presence: { rank: { base: 2, trained: 0 } },
        },
        progression: {
          experience: { gained: 0, spent: 0 },
          freeSkillRanks: {
            career: { gained: 0, spent: 0 },
            specialization: { gained: 0, spent: 0 },
          },
        },
        details: {
          biography: { appearance: '', public: '', private: '' },
          commitments: { motivation: '' },
        },
        schema: { fields: {} },
      },
      isOwner: true,
      items: {
        find: vi.fn((fn) => itemsArray.find(fn) || null),
        filter: vi.fn((fn) => itemsArray.filter(fn)),
        get: vi.fn((id) => itemsArray.find((i) => i.id === id) || null),
        [Symbol.iterator]: function* () {
          yield* itemsArray
        },
      },
      effects: [],
      actions: {},
      canPurchaseCharacteristic: vi.fn(() => false),
      toObject: vi.fn(() => ({})),
    }
  }

  async function buildSheetControls(itemsArray) {
    const Sheet = SwerpgBaseActorSheetControls
    const actor = buildMockDocumentControls(itemsArray)

    if (!globalThis.foundry.applications.ux) {
      globalThis.foundry.applications.ux = {}
    }
    if (!globalThis.foundry.applications.ux.TextEditor) {
      globalThis.foundry.applications.ux.TextEditor = { enrichHTML: vi.fn(async (s) => s || '') }
    }
    if (!globalThis.SYSTEM.RESTRICTION_LEVELS) {
      globalThis.SYSTEM.RESTRICTION_LEVELS = {}
    }

    const instance = new Sheet({})
    instance.document = actor
    instance.actor = actor
    instance.tabGroups = { sheet: 'attributes' }
    instance.isEditable = true
    return instance
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    SwerpgBaseActorSheetControls = (await import('../../../module/applications/sheets/base-actor-sheet.mjs')).default
    vi.mocked(computeFeaturedEquipmentForControlsTests).mockReturnValue([])
  })

  test('equipped weapon exposes isEquipped: true', async () => {
    const weaponItem = {
      id: 'weapon-ctrl-1',
      name: 'Blaster Pistol',
      img: '',
      type: 'weapon',
      system: { equipped: true, quantity: 1 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheetControls([weaponItem])
    const ctx = await instance._prepareContext({})

    const item = ctx.inventory.equipment.items.find((i) => i.id === 'weapon-ctrl-1')
    expect(item).toBeDefined()
    expect(item.isEquipped).toBe(true)
  })

  test('unequipped armor exposes isEquipped: false', async () => {
    const armorItem = {
      id: 'armor-ctrl-1',
      name: 'Light Armor',
      img: '',
      type: 'armor',
      system: { equipped: false, quantity: 1 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheetControls([armorItem])
    const ctx = await instance._prepareContext({})

    const item = ctx.inventory.backpack.items.find((i) => i.id === 'armor-ctrl-1')
    expect(item).toBeDefined()
    expect(item.isEquipped).toBe(false)
  })

  test('gear item exposes isEquipped: false', async () => {
    const gearItem = {
      id: 'gear-ctrl-1',
      name: 'Medpac',
      img: '',
      type: 'gear',
      system: { quantity: 2 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheetControls([gearItem])
    const ctx = await instance._prepareContext({})

    const item = ctx.inventory.backpack.items.find((i) => i.id === 'gear-ctrl-1')
    expect(item).toBeDefined()
    expect(item.isEquipped).toBe(false)
  })

  test('equipped weapon exposes dynamic equipActionLabel pointing to unequip key', async () => {
    // game.i18n.localize returns the key when no translation is registered
    const weaponItem = {
      id: 'weapon-ctrl-2',
      name: 'Heavy Blaster',
      img: '',
      type: 'weapon',
      system: { equipped: true, quantity: 1 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheetControls([weaponItem])
    const ctx = await instance._prepareContext({})

    const item = ctx.inventory.equipment.items.find((i) => i.id === 'weapon-ctrl-2')
    expect(item).toBeDefined()
    // When equipped, the action should label the "Unequip" action
    expect(item.equipActionLabel).toBe('ACTOR.LABELS.UNEQUIP_ITEM')
  })

  test('unequipped weapon exposes dynamic equipActionLabel pointing to equip key', async () => {
    const weaponItem = {
      id: 'weapon-ctrl-3',
      name: 'Blaster Carbine',
      img: '',
      type: 'weapon',
      system: { equipped: false, quantity: 1 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheetControls([weaponItem])
    const ctx = await instance._prepareContext({})

    const item = ctx.inventory.backpack.items.find((i) => i.id === 'weapon-ctrl-3')
    expect(item).toBeDefined()
    expect(item.equipActionLabel).toBe('ACTOR.LABELS.EQUIP_ITEM')
  })

  test('equipped weapon exposes equippedStateLabel pointing to equipped-state key', async () => {
    const weaponItem = {
      id: 'weapon-ctrl-4',
      name: 'Vibroblade',
      img: '',
      type: 'weapon',
      system: { equipped: true, quantity: 1 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheetControls([weaponItem])
    const ctx = await instance._prepareContext({})

    const item = ctx.inventory.equipment.items.find((i) => i.id === 'weapon-ctrl-4')
    expect(item).toBeDefined()
    expect(item.equippedStateLabel).toBe('ACTOR.LABELS.EQUIPPED_STATE')
  })

  test('unequipped armor exposes equippedStateLabel pointing to unequipped-state key', async () => {
    const armorItem = {
      id: 'armor-ctrl-2',
      name: 'Heavy Armor',
      img: '',
      type: 'armor',
      system: { equipped: false, quantity: 1 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheetControls([armorItem])
    const ctx = await instance._prepareContext({})

    const item = ctx.inventory.backpack.items.find((i) => i.id === 'armor-ctrl-2')
    expect(item).toBeDefined()
    expect(item.equippedStateLabel).toBe('ACTOR.LABELS.UNEQUIPPED_STATE')
  })

  test('gear item has no equipActionLabel (canEquip: false)', async () => {
    const gearItem = {
      id: 'gear-ctrl-2',
      name: 'Stim Pack',
      img: '',
      type: 'gear',
      system: { quantity: 1 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheetControls([gearItem])
    const ctx = await instance._prepareContext({})

    const item = ctx.inventory.backpack.items.find((i) => i.id === 'gear-ctrl-2')
    expect(item).toBeDefined()
    expect(item.canEquip).toBe(false)
    // No equip action label for non-equippable items
    expect(item.equipActionLabel).toBeUndefined()
    expect(item.equippedStateLabel).toBeUndefined()
  })
})
