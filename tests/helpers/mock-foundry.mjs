/**
 * Central helper to mock the minimal Foundry VTT globals required by unit tests.
 * Fail-fast philosophy: production code assumes presence of Foundry; tests must provide it.
 */
import { vi } from 'vitest'

const defaultTranslations = {
  'SWERPG.ERRORS.InvalidEvent': 'Invalid event: Unable to process the UI interaction.',
  'SWERPG.ERRORS.InvalidActor': 'Invalid actor: Unable to access character data.',
  'SWERPG.ERRORS.NoItemId': 'No item selected: Please click on a valid item.',
  'SWERPG.ERRORS.NoItemsCollection': 'Character data error: Items collection is missing.',
  'SWERPG.ERRORS.ItemNotFound': 'Item not found: The selected item may have been deleted.',
  'SWERPG.ERRORS.UnexpectedError': 'An unexpected error occurred. Please check the console for details.'
}

let previous = null

/**
 * Setup Foundry mock environment.
 * @param {object} [options]
 * @param {Record<string,string>} [options.translations] Additional/override translations.
 * @param {object} [options.foundryPatch] Extra properties merged into globalThis.foundry.
 * @returns {void}
 */
export function setupFoundryMock(options = {}) {
  const { translations = {}, foundryPatch = {} } = options
  // Preserve any existing globals (unlikely in test but defensive for nested usage).
  previous = {
    foundry: globalThis.foundry,
    game: globalThis.game,
    ui: globalThis.ui
  }

  const mergedTranslations = { ...defaultTranslations, ...translations }

  globalThis.foundry = {
    applications: {
      api: {
        HandlebarsApplicationMixin: (base) => base
      },
      sheets: {
        ActorSheetV2: class MockActorSheetV2 {
          constructor(options = {}) {
            this.options = options
          }
          render() { /* noop stub */ }
        }
      }
    },
    ...foundryPatch
  }

  globalThis.game = {
    i18n: {
      localize: vi.fn((key) => mergedTranslations[key] || key)
    },
    system: {
      config: {}
    },
    combat: undefined,
    packs: new Map()
  }

  globalThis.ui = {
    notifications: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn()
    }
  }
}

/**
 * Teardown Foundry mock environment, restoring previous globals if they existed.
 * @returns {void}
 */
export function teardownFoundryMock() {
  if (previous) {
    if (previous.foundry === undefined) delete globalThis.foundry; else globalThis.foundry = previous.foundry
    if (previous.game === undefined) delete globalThis.game; else globalThis.game = previous.game
    if (previous.ui === undefined) delete globalThis.ui; else globalThis.ui = previous.ui
  }
  previous = null
}

/**
 * Utility to extend the existing mock (e.g., add combat object mid-test).
 * @param {object} patch
 */
export function extendFoundryMock(patch) {
  if (!globalThis.foundry) throw new Error('Foundry mock not initialized')
  Object.assign(globalThis.foundry, patch)
}

/**
 * Configure (or reconfigure) a simple combat mock.
 * @param {object} [options]
 * @param {number} [options.round=1] Current combat round
 * @param {Array<{id:string,actor:any}>} [options.combatants=[]] Combatant like objects
 * @returns {void}
 */
export function setCombatMock({ round = 1, combatants = [] } = {}) {
  if (!globalThis.game) throw new Error('Game mock not initialized')
  globalThis.game.combat = {
    round,
    getCombatantByActor: (actor) => combatants.find((c) => c.actor === actor) ?? null
  }
}

/**
 * Add mock compendium packs to game.packs.
 * Each pack definition: { id, documents: Array<{id,name}> }
 * @param {Array<{id:string, documents?:Array<object>}>} packs
 */
export function addPacksMock(packs = []) {
  if (!globalThis.game) throw new Error('Game mock not initialized')
  const map = globalThis.game.packs
  for (const { id, documents = [] } of packs) {
    if (!id) continue
    const packObj = {
      metadata: { id },
      index: documents.map((d) => ({ _id: d.id, name: d.name })),
      getDocument: vi.fn(async (docId) => documents.find((d) => d.id === docId) ?? null)
    }
    map.set(id, packObj)
  }
}

// Expose a convenience aggregate for tests wanting programmatic access
export const foundryTestUtils = {
  setupFoundryMock,
  teardownFoundryMock,
  extendFoundryMock,
  setCombatMock,
  addPacksMock
}

