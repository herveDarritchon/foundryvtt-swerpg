import { Page } from '@playwright/test'

/**
 * Summary returned by runOggDudePreImportCleanup.
 * Useful for test diagnostics and logging.
 */
export interface OggDudeCleanupSummary {
  worldId: string
  itemsDeleted: number
  packsDeleted: number
  packsSkipped: number
}

/**
 * Deterministic pre-import cleanup for OggDude regression suites.
 *
 * Executed inside the browser context via page.evaluate() to avoid UI timing issues.
 *
 * What it does:
 * 1. Resolves the active world ID via `game.world.id` — throws if absent.
 * 2. Deletes all world items via `Item.deleteDocuments(itemIds)`.
 * 3. Deletes all compendium packs belonging to the active world
 *    (packageType === 'world' && packageName === worldId).
 *    Unlocks locked packs before deletion when necessary.
 *
 * Pré-condition : page is on /game with `game` initialised.
 *
 * @param page - Playwright page
 * @returns Cleanup summary for diagnostic output
 * @throws If game.world.id is not resolvable (Foundry not ready)
 */
export async function runOggDudePreImportCleanup(page: Page): Promise<OggDudeCleanupSummary> {
  return page.evaluate(async (): Promise<OggDudeCleanupSummary> => {
    // Resolve active world ID — fail explicitly if Foundry is not ready
    const worldId = game?.world?.id
    if (!worldId) {
      throw new Error('[oggdude-cleanup] game.world.id is not available — Foundry may not be fully initialised')
    }

    // -------------------------------------------------------------------------
    // 1. Delete all world items
    // -------------------------------------------------------------------------
    const allItems = game?.items?.contents ?? []
    const itemIds = allItems.map((item) => item.id).filter(Boolean) as string[]

    let itemsDeleted = 0
    if (itemIds.length > 0) {
      await Item.deleteDocuments(itemIds)
      itemsDeleted = itemIds.length
    }

    // -------------------------------------------------------------------------
    // 2. Delete world-owned compendium packs
    // -------------------------------------------------------------------------
    const allPacks = game?.packs?.contents ?? []
    const worldPacks = allPacks.filter(
      (pack) => pack.metadata.packageType === 'world' && pack.metadata.packageName === worldId,
    )

    let packsDeleted = 0
    let packsSkipped = 0

    for (const pack of worldPacks) {
      try {
        // Unlock locked pack before deletion
        if (pack.locked) {
          await pack.configure({ locked: false })
        }
        await pack.deleteCompendium()
        packsDeleted++
      } catch (err) {
        // Non-fatal: skip this pack but keep a count for diagnostics
        packsSkipped++
      }
    }

    return { worldId, itemsDeleted, packsDeleted, packsSkipped }
  })
}
