import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupFoundryMock } from '../../helpers/mock-foundry.mjs'

vi.mock('../../../module/utils/logger.mjs', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../module/lib/jauges/jauge-factory.mjs', () => ({
  default: { build: vi.fn(() => ({ create: vi.fn(() => ({})) })) },
}))
vi.mock('../../../module/lib/featured-equipment.mjs', () => ({
  computeFeaturedEquipment: vi.fn(() => []),
}))
vi.mock('../../../module/lib/skills/skill-factory.mjs', () => ({ default: {} }))
vi.mock('../../../module/lib/talents/talent-factory.mjs', () => ({ default: {} }))

/**
 * Non-regression tests for the creditBudget context contract exposed by
 * CharacterSheet._prepareContext(). These tests document the two visible states
 * (normal budget, over-budget) and verify that the compact credits block receives
 * the correct data without recalculating it at the UI layer.
 */
describe('CharacterSheet creditBudget context (inventory compact synthesis)', () => {
  let CharacterSheet
  let SwerpgBaseActorSheet

  beforeEach(async () => {
    vi.clearAllMocks()
    if (!globalThis.game.system.tree) globalThis.game.system.tree = {}
    globalThis.game.system.tree.actor = null
    CharacterSheet = (await import('../../../module/applications/sheets/character-sheet.mjs')).default
    SwerpgBaseActorSheet = (await import('../../../module/applications/sheets/base-actor-sheet.mjs')).default
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  /**
   * Build a minimal character actor mock with a configurable creditBudget.
   * @param {object} creditBudgetOverrides Overrides for the creditBudget data model fields.
   * @returns {object}
   */
  function buildCharacterActor(creditBudgetOverrides = {}) {
    const defaultBudget = {
      startingCredits: 500,
      obligationBonus: 0,
      manualAdjustment: 0,
      totalBudget: 500,
      totalSpent: 200,
      availableCredits: 300,
      isOverBudget: false,
    }

    const actor = {
      name: 'Test Character',
      img: 'systems/swerpg/assets/portraits/default.webp',
      type: 'character',
      system: {
        skills: {},
        credits: 300,
        characteristics: {
          agility: { rank: { value: 2 } },
          brawn: { rank: { value: 2 } },
          intellect: { rank: { value: 2 } },
          cunning: { rank: { value: 2 } },
          presence: { rank: { value: 2 } },
          willpower: { rank: { value: 2 } },
        },
        progression: {
          experience: { available: 50, spent: 50, gained: 100, total: 100 },
          freeSkillRanks: {
            career: { spent: 0, gained: 4, available: 4 },
            specialization: { spent: 0, gained: 2, available: 2 },
          },
          credits: { starting: 500, obligationBonus: 0, totalStarting: 500 },
        },
        details: {
          species: { name: 'Human' },
          career: null,
          specializations: new Set(),
        },
        resources: {
          wounds: { value: 0, threshold: 10 },
          strain: { value: 0, threshold: 10 },
          encumbrance: { value: 0, threshold: 5 },
        },
        creditBudget: { ...defaultBudget, ...creditBudgetOverrides },
      },
      items: [],
      hasFreeSkillsAvailable: () => false,
    }

    actor.toObject = () => ({
      name: actor.name,
      img: actor.img,
      system: {
        ...JSON.parse(JSON.stringify({ ...actor.system, creditBudget: actor.system.creditBudget })),
        details: {
          ...JSON.parse(JSON.stringify(actor.system.details)),
          specializations: Array.from(actor.system.details.specializations || []),
        },
      },
    })

    return actor
  }

  /**
   * Build the mocked base sheet context consumed by CharacterSheet.
   * @param {object} actor
   * @returns {object}
   */
  function buildBaseContext(actor) {
    return {
      actor,
      source: actor.toObject(),
      incomplete: {},
      progression: {
        experience: actor.system.progression.experience,
        freeSkillRanks: {
          career: { ...actor.system.progression.freeSkillRanks.career },
          specialization: { ...actor.system.progression.freeSkillRanks.specialization },
        },
      },
      tabs: [{ id: 'inventory', group: 'sheet' }],
      skillCategories: {},
    }
  }

  /**
   * Render the CharacterSheet context with the mocked base actor sheet.
   * @param {object} actor
   * @returns {Promise<object>}
   */
  async function getContext(actor) {
    vi.spyOn(SwerpgBaseActorSheet.prototype, '_prepareContext').mockResolvedValue(buildBaseContext(actor))

    const sheet = new CharacterSheet({ document: actor })
    sheet.actor = actor
    sheet.document = actor

    return await sheet._prepareContext({})
  }

  describe('nominal budget state', () => {
    it('exposes creditBudget with all required display fields', async () => {
      const actor = buildCharacterActor()
      const context = await getContext(actor)

      expect(context.creditBudget).toBeDefined()
      expect(context.creditBudget).toHaveProperty('starting')
      expect(context.creditBudget).toHaveProperty('obligationBonus')
      expect(context.creditBudget).toHaveProperty('manualAdjustment')
      expect(context.creditBudget).toHaveProperty('totalBudget')
      expect(context.creditBudget).toHaveProperty('totalSpent')
      expect(context.creditBudget).toHaveProperty('available')
      expect(context.creditBudget).toHaveProperty('isOverBudget')
    })

    it('maps creditBudget values correctly from the data model', async () => {
      const actor = buildCharacterActor({
        startingCredits: 1000,
        obligationBonus: 250,
        manualAdjustment: 0,
        totalBudget: 1250,
        totalSpent: 400,
        availableCredits: 850,
        isOverBudget: false,
      })
      const context = await getContext(actor)

      expect(context.creditBudget.starting).toBe(1000)
      expect(context.creditBudget.obligationBonus).toBe(250)
      expect(context.creditBudget.manualAdjustment).toBe(0)
      expect(context.creditBudget.totalBudget).toBe(1250)
      expect(context.creditBudget.totalSpent).toBe(400)
      expect(context.creditBudget.available).toBe(850)
      expect(context.creditBudget.isOverBudget).toBe(false)
    })

    it('exposes isOverBudget as false when available credits are positive', async () => {
      const actor = buildCharacterActor({ availableCredits: 300, isOverBudget: false })
      const context = await getContext(actor)

      expect(context.creditBudget.isOverBudget).toBe(false)
      expect(context.creditBudget.available).toBe(300)
    })
  })

  describe('over-budget state', () => {
    it('exposes isOverBudget as true when spending exceeds the budget', async () => {
      const actor = buildCharacterActor({
        totalBudget: 500,
        totalSpent: 700,
        availableCredits: -200,
        isOverBudget: true,
      })
      const context = await getContext(actor)

      expect(context.creditBudget.isOverBudget).toBe(true)
    })

    it('exposes a negative available value when over budget', async () => {
      const actor = buildCharacterActor({
        totalBudget: 500,
        totalSpent: 700,
        availableCredits: -200,
        isOverBudget: true,
      })
      const context = await getContext(actor)

      expect(context.creditBudget.available).toBe(-200)
      expect(context.creditBudget.totalBudget).toBe(500)
      expect(context.creditBudget.totalSpent).toBe(700)
    })
  })

  describe('safe defaults', () => {
    it('defaults missing creditBudget fields to 0 and false', async () => {
      const actor = buildCharacterActor()
      // Remove creditBudget entirely to test fallback paths
      actor.system.creditBudget = undefined

      const context = await getContext(actor)

      expect(context.creditBudget.starting).toBe(0)
      expect(context.creditBudget.obligationBonus).toBe(0)
      expect(context.creditBudget.manualAdjustment).toBe(0)
      expect(context.creditBudget.totalBudget).toBe(0)
      expect(context.creditBudget.totalSpent).toBe(0)
      expect(context.creditBudget.available).toBe(0)
      expect(context.creditBudget.isOverBudget).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// Feature #635: empty inventory sections must expose a dropzone emptyState
// contract so the template can render an actionable drop affordance.
// ---------------------------------------------------------------------------

import { computeFeaturedEquipment as computeFeaturedEquipmentForDropzoneTests } from '../../../module/lib/featured-equipment.mjs'

describe('Inventory empty-section dropzone contract (issue #635)', () => {
  let SwerpgBaseActorSheetDropzone

  function buildMockDocumentDropzone(itemsArray = []) {
    return {
      id: 'actor-dropzone',
      name: 'Dropzone Actor',
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

  async function buildSheetDropzone(itemsArray = []) {
    const Sheet = SwerpgBaseActorSheetDropzone
    const actor = buildMockDocumentDropzone(itemsArray)

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
    SwerpgBaseActorSheetDropzone = (await import('../../../module/applications/sheets/base-actor-sheet.mjs')).default
    vi.mocked(computeFeaturedEquipmentForDropzoneTests).mockReturnValue([])
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('empty equipment section exposes emptyState with message and hint', async () => {
    setupFoundryMock({
      translations: {
        'ACTOR.LABELS.EQUIPMENT_HINT': 'No equipped items yet.',
        'ACTOR.LABELS.EQUIPMENT_DROP_HINT': 'Equip weapons or armor from your Backpack using the shield icon.',
        'ACTOR.LABELS.BACKPACK_HINT': 'Your backpack is empty.',
        'ACTOR.LABELS.BACKPACK_DROP_HINT': 'Drop items here from the compendiums, the Items directory, or the Market.',
      },
    })
    const instance = await buildSheetDropzone([])
    const ctx = await instance._prepareContext({})

    expect(ctx.inventory.equipment.emptyState).toBeDefined()
    expect(ctx.inventory.equipment.emptyState.message).toBe('No equipped items yet.')
    expect(ctx.inventory.equipment.emptyState.hint).toBe('Equip weapons or armor from your Backpack using the shield icon.')
  })

  it('empty backpack section exposes emptyState with message and hint', async () => {
    setupFoundryMock({
      translations: {
        'ACTOR.LABELS.EQUIPMENT_HINT': 'No equipped items yet.',
        'ACTOR.LABELS.EQUIPMENT_DROP_HINT': 'Equip weapons or armor from your Backpack using the shield icon.',
        'ACTOR.LABELS.BACKPACK_HINT': 'Your backpack is empty.',
        'ACTOR.LABELS.BACKPACK_DROP_HINT': 'Drop items here from the compendiums, the Items directory, or the Market.',
      },
    })
    const instance = await buildSheetDropzone([])
    const ctx = await instance._prepareContext({})

    expect(ctx.inventory.backpack.emptyState).toBeDefined()
    expect(ctx.inventory.backpack.emptyState.message).toBe('Your backpack is empty.')
    expect(ctx.inventory.backpack.emptyState.hint).toBe('Drop items here from the compendiums, the Items directory, or the Market.')
  })

  it('equipment section with items still carries emptyState for structural consistency', async () => {
    const weaponItem = {
      id: 'weapon-dz-1',
      name: 'Blaster Pistol',
      img: '',
      type: 'weapon',
      system: { equipped: true, quantity: 1 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheetDropzone([weaponItem])
    const ctx = await instance._prepareContext({})

    // The section always carries emptyState so the template can reference it
    expect(ctx.inventory.equipment.emptyState).toBeDefined()
    // But it now has items, so the template should render items, not the dropzone
    expect(ctx.inventory.equipment.items).toHaveLength(1)
  })

  it('backpack section with gear still carries emptyState for structural consistency', async () => {
    const gearItem = {
      id: 'gear-dz-1',
      name: 'Medpac',
      img: '',
      type: 'gear',
      system: { quantity: 2 },
      getTags: vi.fn(() => ({})),
      actions: { at: () => null },
    }
    const instance = await buildSheetDropzone([gearItem])
    const ctx = await instance._prepareContext({})

    expect(ctx.inventory.backpack.emptyState).toBeDefined()
    expect(ctx.inventory.backpack.items).toHaveLength(1)
  })

  it('equipment and backpack emptyState messages are distinct', async () => {
    setupFoundryMock({ translations: {} })
    const instance = await buildSheetDropzone([])
    const ctx = await instance._prepareContext({})

    // The two sections must have different hint keys so they provide contextual guidance
    expect(ctx.inventory.equipment.emptyState.message).not.toBe(ctx.inventory.backpack.emptyState.message)
    expect(ctx.inventory.equipment.emptyState.hint).not.toBe(ctx.inventory.backpack.emptyState.hint)
  })
})
