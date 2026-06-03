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
  packsTargeted: number
}

/**
 * Options for runOggDudePreImportCleanup.
 *
 * cleanPacks: when true, also deletes OggDude target packs (compendium mode).
 *             when false (default), only world items are removed (world mode).
 * targetPackNames: list of pack metadata.name values to delete when cleanPacks=true.
 *                  Derived from module/utils/oggdude-mapping-config.mjs.
 */
export interface OggDudeCleanupOptions {
  cleanPacks?: boolean
  targetPackNames?: string[]
}

/**
 * Canonical OggDude pack names sourced from module/utils/oggdude-mapping-config.mjs.
 * Used by the compendium cleanup to restrict deletion to known OggDude packs only.
 */
export const OGGDUDE_TARGET_PACK_NAMES: string[] = [
  'swerpg-careers',
  'swerpg-species',
  'swerpg-specializations',
  'swerpg-specialization-trees',
  'swerpg-obligations',
  'swerpg-motivations',
  'swerpg-motivation-categories',
  'swerpg-talents',
  'swerpg-duties',
  'swerpg-armors',
  'swerpg-gears',
  'swerpg-weapons',
]

/**
 * Deterministic pre-import cleanup for OggDude regression suites.
 *
 * Executed inside the browser context via page.evaluate() to avoid UI timing issues.
 *
 * What it does:
 * 1. Resolves the active world ID via `game.world.id` — throws if absent.
 * 2. Deletes all world items via `Item.deleteDocuments(itemIds)`.
 * 3. When options.cleanPacks=true, deletes only the OggDude target packs
 *    (filtered by options.targetPackNames). Packs not in the list are left untouched.
 *    When options.cleanPacks=false (default, world mode), packs are not touched.
 *
 * Pré-condition : page is on /game with `game` initialised.
 *
 * @param page - Playwright page
 * @param options - Cleanup options (cleanPacks, targetPackNames)
 * @returns Cleanup summary for diagnostic output
 * @throws If game.world.id is not resolvable (Foundry not ready)
 */
export async function runOggDudePreImportCleanup(page: Page, options: OggDudeCleanupOptions = {}): Promise<OggDudeCleanupSummary> {
  const { cleanPacks = false, targetPackNames = OGGDUDE_TARGET_PACK_NAMES } = options

  return page.evaluate(
    async ({ cleanPacksArg, targetPackNamesArg }: { cleanPacksArg: boolean; targetPackNamesArg: string[] }): Promise<OggDudeCleanupSummary> => {
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
      // 2. Conditionally delete OggDude target packs (compendium mode only)
      // Only packs whose metadata.name is in targetPackNamesArg are targeted.
      // Packs not in the list are left untouched — world packs from other imports
      // or user-created packs are preserved.
      // -------------------------------------------------------------------------
      let packsDeleted = 0
      let packsSkipped = 0
      let packsTargeted = 0

      if (cleanPacksArg) {
        const allPacks = game?.packs?.contents ?? []
        const targetedPacks = allPacks.filter(
          (pack) => pack.metadata.packageType === 'world' && Boolean(pack.metadata.name) && targetPackNamesArg.includes(pack.metadata.name as string),
        )
        packsTargeted = targetedPacks.length

        for (const pack of targetedPacks) {
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
      }

      return { worldId, itemsDeleted, packsDeleted, packsSkipped, packsTargeted }
    },
    { cleanPacksArg: cleanPacks, targetPackNamesArg: targetPackNames },
  )
}
