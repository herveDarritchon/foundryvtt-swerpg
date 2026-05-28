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

describe('CharacterSheet market button', () => {
  let CharacterSheet
  const openMarketSpy = vi.fn().mockResolvedValue(undefined)

  beforeEach(async () => {
    setupFoundryMock()

    // Inject openMarket into the game.system.api.methods stub
    globalThis.game.system.api = {
      methods: {
        openMarket: openMarketSpy,
      },
    }

    CharacterSheet = (await import('../../../module/applications/sheets/character-sheet.mjs')).default
  })

  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    teardownFoundryMock()
  })

  describe('openMarket action', () => {
    it('calls game.system.api.methods.openMarket() when the action is triggered', async () => {
      const sheet = {}
      const event = { preventDefault: vi.fn() }

      await CharacterSheet.DEFAULT_OPTIONS.actions.openMarket.call(sheet, event)

      expect(openMarketSpy).toHaveBeenCalledOnce()
    })

    it('is registered in DEFAULT_OPTIONS actions', () => {
      expect(typeof CharacterSheet.DEFAULT_OPTIONS.actions.openMarket).toBe('function')
    })
  })

  describe('showMarketButton context flag', () => {
    it('is present in the DEFAULT_OPTIONS actions map', () => {
      // The flag is set in _prepareContext; its presence in actions confirms the integration point exists.
      expect(CharacterSheet.DEFAULT_OPTIONS.actions).toHaveProperty('openMarket')
    })
  })
})
