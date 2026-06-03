import * as path from 'path'
import { Page } from '@playwright/test'
import { test as base, expect } from '../../fixtures'
import { runOggDudeImportScenario, ImportMode } from '../utils/oggdude-importer'
import { runOggDudePreImportCleanup, OGGDUDE_TARGET_PACK_NAMES } from '../utils/oggdude-cleanup'

/**
 * Context provided by the oggdudeReady fixture to specs.
 * Encapsulates the ZIP path and the high-level import runner.
 */
export interface OggDudeContext {
  /** Absolute path to the OggDude ZIP file */
  zipPath: string
  /**
   * Runs the full OggDude import scenario.
   * Assertions are NOT included — keep them in the spec.
   *
   * @param page - Playwright page (must be on /game)
   * @param mode - 'world' or 'compendium'
   */
  runImport(page: Page, mode: ImportMode): Promise<void>
}

/**
 * Default ZIP path: resolved from the project root under resources/oggdude-data.zip.
 * Override via E2E_OGGDUDE_ZIP_PATH environment variable.
 */
const DEFAULT_ZIP_PATH = process.env.E2E_OGGDUDE_ZIP_PATH ?? path.resolve(process.cwd(), 'resources/oggdude-data.zip')

/**
 * Timeout for import completion — world mode (default 120s).
 */
const WORLD_IMPORT_TIMEOUT = 120_000

/**
 * Timeout for import completion — compendium mode (longer, packs creation involved).
 */
const COMPENDIUM_IMPORT_TIMEOUT = 180_000

/**
 * OggDude fixture extending the shared worldReady fixture.
 *
 * Responsibilities:
 * - resolves the ZIP path (env var or default resources/ location)
 * - runs pre-import cleanup in beforeEach:
 *     - always deletes all game.items
 *     - deletes OggDude target packs only in compendium mode (cleanPacks=true)
 *       — world mode does not touch packs
 * - exposes an OggDudeContext to the spec via the `oggdude` fixture
 *
 * The beforeEach strategy uses a shared mutable flag so the cleanup options
 * can be set by the spec's test body before the beforeEach executes. Because
 * Playwright runs beforeEach before the test body, we instead perform the cleanup
 * inside runImport itself — prior to the actual import — so each call to runImport
 * gets a fresh world state regardless of import mode.
 *
 * Usage in specs:
 *   import { test, expect } from '../fixtures/oggdude'
 *   test('...', async ({ page, oggdude }) => {
 *     await oggdude.runImport(page, 'world')
 *     // assertions here
 *   })
 */
export const test = base.extend<{ oggdude: OggDudeContext }>({
  oggdude: async ({ page }, use) => {
    const zipPath = DEFAULT_ZIP_PATH

    // Pre-import cleanup runs before every import regardless of mode.
    // Items are always cleared; packs are only cleared in compendium mode.
    // We wrap runImport to inject cleanup with the right options.
    const context: OggDudeContext = {
      zipPath,

      async runImport(importPage: Page, mode: ImportMode): Promise<void> {
        await expect(importPage).toHaveURL(/.*\/game/)

        // Cleanup: always delete world items; delete OggDude packs only for compendium mode
        const summary = await runOggDudePreImportCleanup(importPage, {
          cleanPacks: mode === 'compendium',
          targetPackNames: OGGDUDE_TARGET_PACK_NAMES,
        })
        // eslint-disable-next-line no-console
        console.log(
          `[oggdude-fixture] Pre-import cleanup (${mode}): worldId=${summary.worldId} items=${summary.itemsDeleted} packsTargeted=${summary.packsTargeted} packsDeleted=${summary.packsDeleted} skipped=${summary.packsSkipped}`,
        )

        const timeout = mode === 'compendium' ? COMPENDIUM_IMPORT_TIMEOUT : WORLD_IMPORT_TIMEOUT
        await runOggDudeImportScenario(importPage, { importMode: mode, zipPath }, timeout)
      },
    }

    await use(context)
  },
})

export { expect }
