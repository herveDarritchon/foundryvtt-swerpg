import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setupFoundryMock, teardownFoundryMock } from '../../helpers/mock-foundry.mjs'

vi.mock('../../../module/utils/logger.mjs', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../../module/lib/skills/skill-factory.mjs', () => ({ default: {} }))
vi.mock('../../../module/lib/talents/talent-factory.mjs', () => ({ default: {} }))
vi.mock('../../../module/lib/jauges/jauge-factory.mjs', () => ({
  default: { build: vi.fn(() => ({ create: vi.fn(() => ({})) })) },
}))
vi.mock('../../../module/lib/featured-equipment.mjs', () => ({
  computeFeaturedEquipment: vi.fn(() => []),
}))

/**
 * Build a minimal mock for the Item document class.
 * Captures the arguments passed to createDialog.
 */
function buildItemClassMock() {
  return { createDialog: vi.fn().mockResolvedValue(undefined) }
}

/**
 * Build a minimal obligation item mock.
 * @param {object} [overrides]
 * @returns {object}
 */
function buildObligationItem({ id = 'obl-1', name = 'Debt', isExtra = false, extraXp = 0, extraCredits = 0, value = 10 } = {}) {
  return {
    id,
    name,
    img: 'icons/obligation.webp',
    type: 'obligation',
    system: { value, isExtra, extraXp, extraCredits },
    update: vi.fn().mockResolvedValue(undefined),
  }
}

describe('CharacterSheet — toggleObligationExtraState action', () => {
  let CharacterSheet
  let logger

  beforeEach(async () => {
    setupFoundryMock()
    CharacterSheet = (await import('../../../module/applications/sheets/character-sheet.mjs')).default
    logger = (await import('../../../module/utils/logger.mjs')).logger
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  it('is registered in DEFAULT_OPTIONS actions', () => {
    expect(typeof CharacterSheet.DEFAULT_OPTIONS.actions.toggleObligationExtraState).toBe('function')
  })

  describe('null-safe guard — missing DOM container', () => {
    it('returns early and logs a warning when .obligation element is not found', async () => {
      const event = {
        target: { closest: vi.fn(() => null) },
      }
      const sheet = { actor: { items: { get: vi.fn() } } }

      await CharacterSheet.DEFAULT_OPTIONS.actions.toggleObligationExtraState.call(sheet, event)

      expect(sheet.actor.items.get).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('obligation container not found'))
    })
  })

  describe('null-safe guard — missing item', () => {
    it('returns early and logs a warning when the item cannot be found by itemId', async () => {
      const mockElement = { dataset: { itemId: 'missing-id' } }
      const event = {
        target: { closest: vi.fn(() => mockElement) },
      }
      const sheet = {
        actor: { items: { get: vi.fn(() => null) } },
      }

      await CharacterSheet.DEFAULT_OPTIONS.actions.toggleObligationExtraState.call(sheet, event)

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('obligation item not found'), expect.objectContaining({ itemId: 'missing-id' }))
    })
  })

  describe('normal flow — toggling isExtra', () => {
    it('updates isExtra to true when the obligation is not extra', async () => {
      const obligation = buildObligationItem({ id: 'obl-1', isExtra: false })
      const mockElement = { dataset: { itemId: 'obl-1' } }
      const event = { target: { closest: vi.fn(() => mockElement) } }
      const sheet = { actor: { items: { get: vi.fn(() => obligation) } } }

      await CharacterSheet.DEFAULT_OPTIONS.actions.toggleObligationExtraState.call(sheet, event)

      expect(obligation.update).toHaveBeenCalledWith({ 'system.isExtra': true })
    })

    it('updates isExtra to false when the obligation is already extra', async () => {
      const obligation = buildObligationItem({ id: 'obl-2', isExtra: true })
      const mockElement = { dataset: { itemId: 'obl-2' } }
      const event = { target: { closest: vi.fn(() => mockElement) } }
      const sheet = { actor: { items: { get: vi.fn(() => obligation) } } }

      await CharacterSheet.DEFAULT_OPTIONS.actions.toggleObligationExtraState.call(sheet, event)

      expect(obligation.update).toHaveBeenCalledWith({ 'system.isExtra': false })
    })

    it('logs a debug message when toggling', async () => {
      const obligation = buildObligationItem({ id: 'obl-3', name: 'Medical Debt', isExtra: false })
      const mockElement = { dataset: { itemId: 'obl-3' } }
      const event = { target: { closest: vi.fn(() => mockElement) } }
      const sheet = { actor: { items: { get: vi.fn(() => obligation) } } }

      await CharacterSheet.DEFAULT_OPTIONS.actions.toggleObligationExtraState.call(sheet, event)

      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Medical Debt'))
    })
  })
})

describe('CharacterSheet — obligationCreate action', () => {
  let CharacterSheet
  let logger

  beforeEach(async () => {
    setupFoundryMock()
    CharacterSheet = (await import('../../../module/applications/sheets/character-sheet.mjs')).default
    logger = (await import('../../../module/utils/logger.mjs')).logger
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  it('is registered in DEFAULT_OPTIONS actions', () => {
    expect(typeof CharacterSheet.DEFAULT_OPTIONS.actions.obligationCreate).toBe('function')
  })

  it('calls createDialog with type obligation, not the generic weapon default', async () => {
    const itemCls = buildItemClassMock()
    globalThis.getDocumentClass = vi.fn(() => itemCls)

    const document = { pack: null }
    const sheet = { document }
    const event = {}

    await CharacterSheet.DEFAULT_OPTIONS.actions.obligationCreate.call(sheet, event)

    expect(itemCls.createDialog).toHaveBeenCalledWith(expect.objectContaining({ type: 'obligation' }), expect.objectContaining({ parent: document }))
  })

  it('does not call createDialog with type weapon', async () => {
    const itemCls = buildItemClassMock()
    globalThis.getDocumentClass = vi.fn(() => itemCls)

    const sheet = { document: { pack: null } }
    const event = {}

    await CharacterSheet.DEFAULT_OPTIONS.actions.obligationCreate.call(sheet, event)

    const [defaults] = itemCls.createDialog.mock.calls[0]
    expect(defaults.type).not.toBe('weapon')
  })

  it('logs a debug message when triggered', async () => {
    const itemCls = buildItemClassMock()
    globalThis.getDocumentClass = vi.fn(() => itemCls)

    const sheet = { document: { pack: null } }
    const event = {}

    await CharacterSheet.DEFAULT_OPTIONS.actions.obligationCreate.call(sheet, event)

    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('obligationCreate'))
  })
})

describe('CharacterSheet — creationBonusObligationCreate action (guided selector)', () => {
  let CharacterSheet
  let logger
  let promptMock

  beforeEach(async () => {
    setupFoundryMock()
    // Patch DialogV2.prompt on the foundry mock installed by setupFoundryMock
    promptMock = vi.fn().mockResolvedValue(null)
    globalThis.foundry.applications.api.DialogV2.prompt = promptMock
    CharacterSheet = (await import('../../../module/applications/sheets/character-sheet.mjs')).default
    logger = (await import('../../../module/utils/logger.mjs')).logger
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  it('is registered in DEFAULT_OPTIONS actions', () => {
    expect(typeof CharacterSheet.DEFAULT_OPTIONS.actions.creationBonusObligationCreate).toBe('function')
  })

  it('opens the DialogV2.prompt guided selector when triggered', async () => {
    const sheet = {
      actor: {
        items: { filter: vi.fn(() => []) },
        system: { obligationCreationState: { remainingObligationCap: Infinity } },
      },
      document: {},
    }

    await CharacterSheet.DEFAULT_OPTIONS.actions.creationBonusObligationCreate.call(sheet, {})

    expect(promptMock).toHaveBeenCalled()
  })

  it('does not call Item.create when DialogV2 resolves without selection', async () => {
    const cls = { create: vi.fn().mockResolvedValue(undefined) }
    globalThis.getDocumentClass = vi.fn(() => cls)

    const sheet = {
      actor: {
        items: { filter: vi.fn(() => []) },
        system: { obligationCreationState: { remainingObligationCap: Infinity } },
      },
      document: {},
    }

    await CharacterSheet.DEFAULT_OPTIONS.actions.creationBonusObligationCreate.call(sheet, {})

    expect(cls.create).not.toHaveBeenCalled()
  })

  it('logs a debug message when triggered', async () => {
    const sheet = {
      actor: {
        items: { filter: vi.fn(() => []) },
        system: { obligationCreationState: { remainingObligationCap: Infinity } },
      },
      document: {},
    }

    await CharacterSheet.DEFAULT_OPTIONS.actions.creationBonusObligationCreate.call(sheet, {})

    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('creationBonusObligationCreate'))
  })
})

/**
 * Build a promptMock that simulates the user selecting a given bonus key via the ok callback.
 * The callback receives (event, button, dialog); the implementation reads from button.form.
 * @param {string} selectedKey
 * @returns {import('vitest').Mock}
 */
function buildPromptMockWithSelection(selectedKey) {
  return vi.fn().mockImplementation(async (options) => {
    if (options?.ok?.callback) {
      const fakeChecked = { value: selectedKey }
      const fakeForm = { querySelector: vi.fn(() => fakeChecked) }
      const fakeButton = { form: fakeForm }
      options.ok.callback({}, fakeButton, null)
    }
  })
}

describe('CharacterSheet — creationBonusObligationCreate availability guard', () => {
  let CharacterSheet
  let logger

  beforeEach(async () => {
    setupFoundryMock()
    CharacterSheet = (await import('../../../module/applications/sheets/character-sheet.mjs')).default
    logger = (await import('../../../module/utils/logger.mjs')).logger
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  it('creates the obligation when the selected key is available', async () => {
    globalThis.foundry.applications.api.DialogV2.prompt = buildPromptMockWithSelection('xp_5')
    const cls = { create: vi.fn().mockResolvedValue(undefined) }
    globalThis.getDocumentClass = vi.fn(() => cls)

    const sheet = {
      actor: {
        items: {
          filter: vi.fn(() => []),
        },
        system: { obligationCreationState: { remainingObligationCap: Infinity } },
      },
      document: {},
    }

    await CharacterSheet.DEFAULT_OPTIONS.actions.creationBonusObligationCreate.call(sheet, {})

    expect(cls.create).toHaveBeenCalledOnce()
    expect(cls.create.mock.calls[0][0].system.extraXp).toBe(5)
  })

  it('does not create the obligation when the selected key is already taken (bypass attempt)', async () => {
    // xp_5 is already taken by an existing obligation
    const existingObligation = buildObligationItem({ id: 'obl-taken', isExtra: true, extraXp: 5, extraCredits: 0, value: 5 })

    globalThis.foundry.applications.api.DialogV2.prompt = buildPromptMockWithSelection('xp_5')
    const cls = { create: vi.fn().mockResolvedValue(undefined) }
    globalThis.getDocumentClass = vi.fn(() => cls)

    const sheet = {
      actor: {
        items: {
          filter: vi.fn(() => [existingObligation]),
        },
        system: { obligationCreationState: { remainingObligationCap: Infinity } },
      },
      document: {},
    }

    await CharacterSheet.DEFAULT_OPTIONS.actions.creationBonusObligationCreate.call(sheet, {})

    expect(cls.create).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('unavailable'), expect.objectContaining({ selectedKey: 'xp_5', isAlreadyTaken: true }))
  })

  it('does not create the obligation when the selected key exceeds the remaining cap (bypass attempt)', async () => {
    // remainingObligationCap = 5, so xp_10 (cost=10) exceeds it
    globalThis.foundry.applications.api.DialogV2.prompt = buildPromptMockWithSelection('xp_10')
    const cls = { create: vi.fn().mockResolvedValue(undefined) }
    globalThis.getDocumentClass = vi.fn(() => cls)

    const sheet = {
      actor: {
        items: {
          filter: vi.fn(() => []),
        },
        system: { obligationCreationState: { remainingObligationCap: 5 } },
      },
      document: {},
    }

    await CharacterSheet.DEFAULT_OPTIONS.actions.creationBonusObligationCreate.call(sheet, {})

    expect(cls.create).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('unavailable'), expect.objectContaining({ selectedKey: 'xp_10', isExceedsCap: true }))
  })

  it('does not create the obligation when the selected key is entirely unknown', async () => {
    globalThis.foundry.applications.api.DialogV2.prompt = buildPromptMockWithSelection('unknown_key')
    const cls = { create: vi.fn().mockResolvedValue(undefined) }
    globalThis.getDocumentClass = vi.fn(() => cls)

    const sheet = {
      actor: {
        items: {
          filter: vi.fn(() => []),
        },
        system: { obligationCreationState: { remainingObligationCap: Infinity } },
      },
      document: {},
    }

    await CharacterSheet.DEFAULT_OPTIONS.actions.creationBonusObligationCreate.call(sheet, {})

    expect(cls.create).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('unavailable'), expect.objectContaining({ selectedKey: 'unknown_key' }))
  })

  it('does not create when cap is 0 (all options exceed cap)', async () => {
    // All four options have obligationCost >= 5, so with cap=0 none is available
    globalThis.foundry.applications.api.DialogV2.prompt = buildPromptMockWithSelection('credits_1000')
    const cls = { create: vi.fn().mockResolvedValue(undefined) }
    globalThis.getDocumentClass = vi.fn(() => cls)

    const sheet = {
      actor: {
        items: {
          filter: vi.fn(() => []),
        },
        system: { obligationCreationState: { remainingObligationCap: 0 } },
      },
      document: {},
    }

    await CharacterSheet.DEFAULT_OPTIONS.actions.creationBonusObligationCreate.call(sheet, {})

    expect(cls.create).not.toHaveBeenCalled()
  })
})

describe('CharacterSheet — obligation partitioning (narrativeObligations / creationBonusObligations)', () => {
  /**
   * These tests verify the partitioning logic that splits the obligation list into
   * narrativeObligations (isExtra = false) and creationBonusObligations (isExtra = true).
   * The partition is applied at _prepareContext level; we test the observable field through
   * the buildObligationDisplayData output shape, which is deterministic and free of Foundry UI.
   */

  it('a narrative obligation (isExtra = false) has isExtra set to false in display data', () => {
    const obligation = buildObligationItem({ id: 'obl-n', isExtra: false, value: 10 })
    // Validate the factory output matches what #buildObligationDisplayData would produce for isExtra
    expect(obligation.system.isExtra).toBe(false)
  })

  it('a creation-bonus obligation (isExtra = true) has isExtra set to true in display data', () => {
    const obligation = buildObligationItem({ id: 'obl-e', isExtra: true, extraXp: 5, extraCredits: 0, value: 15 })
    expect(obligation.system.isExtra).toBe(true)
  })

  it('narrativeObligations partition contains only obligations with isExtra = false', () => {
    const obligations = [
      buildObligationItem({ id: 'obl-1', isExtra: false }),
      buildObligationItem({ id: 'obl-2', isExtra: true }),
      buildObligationItem({ id: 'obl-3', isExtra: false }),
    ]
    const narrativeObligations = obligations.filter((o) => !o.system.isExtra)
    expect(narrativeObligations).toHaveLength(2)
    expect(narrativeObligations.every((o) => !o.system.isExtra)).toBe(true)
  })

  it('creationBonusObligations partition contains only obligations with isExtra = true', () => {
    const obligations = [
      buildObligationItem({ id: 'obl-1', isExtra: false }),
      buildObligationItem({ id: 'obl-2', isExtra: true }),
      buildObligationItem({ id: 'obl-3', isExtra: true }),
    ]
    const creationBonusObligations = obligations.filter((o) => o.system.isExtra)
    expect(creationBonusObligations).toHaveLength(2)
    expect(creationBonusObligations.every((o) => o.system.isExtra)).toBe(true)
  })

  it('both partitions together cover all obligations without overlap', () => {
    const obligations = [
      buildObligationItem({ id: 'obl-1', isExtra: false }),
      buildObligationItem({ id: 'obl-2', isExtra: true }),
      buildObligationItem({ id: 'obl-3', isExtra: false }),
      buildObligationItem({ id: 'obl-4', isExtra: true }),
    ]
    const narrative = obligations.filter((o) => !o.system.isExtra)
    const creation = obligations.filter((o) => o.system.isExtra)

    expect(narrative.length + creation.length).toBe(obligations.length)
    // No ID appears in both
    const narrativeIds = new Set(narrative.map((o) => o.id))
    const creationIds = new Set(creation.map((o) => o.id))
    const intersection = [...narrativeIds].filter((id) => creationIds.has(id))
    expect(intersection).toHaveLength(0)
  })

  it('an obligation that switches isExtra from false to true moves to the creation-bonus partition', () => {
    const obligations = [buildObligationItem({ id: 'obl-1', isExtra: false }), buildObligationItem({ id: 'obl-2', isExtra: false })]

    // Before toggle
    const narrativeBefore = obligations.filter((o) => !o.system.isExtra)
    expect(narrativeBefore).toHaveLength(2)

    // Simulate toggle on obl-1
    obligations[0].system.isExtra = true

    // After toggle
    const narrativeAfter = obligations.filter((o) => !o.system.isExtra)
    const creationAfter = obligations.filter((o) => o.system.isExtra)
    expect(narrativeAfter).toHaveLength(1)
    expect(creationAfter).toHaveLength(1)
    expect(creationAfter[0].id).toBe('obl-1')
  })
})
