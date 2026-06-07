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
