import { expect, Page } from '@playwright/test'
import { navigateToSystemSettings, ensureSessionActive } from '../../utils/foundryUI'

/**
 * Semantic import mode.
 * - 'world': items are imported into game.items — the "Import to Compendium" checkbox
 *   is NOT interacted with (left unchecked by default).
 * - 'compendium': items are imported into world compendium packs — the checkbox is checked.
 */
export type ImportMode = 'world' | 'compendium'

export interface OggDudeImportOptions {
  /** Chemin absolu vers le fichier ZIP OggDude */
  zipPath: string
  /** Mode d'import sémantique (défaut: 'world') */
  importMode?: ImportMode
  /** Sélectionner toutes les catégories (défaut: true) */
  selectAll?: boolean
}

/**
 * Ouvre le dialog OggDude Data Importer depuis les System Settings.
 * Pré-condition : page sur /game.
 * Post-condition : dialog ouvert, bouton "OggDude Zip Data File" visible.
 */
export async function openOggDudeImporterDialog(page: Page): Promise<void> {
  await ensureSessionActive(page)

  // navigateToSystemSettings : Settings tab → Game Settings → Star Wars Edge RPG
  await navigateToSystemSettings(page, 'Star Wars Edge RPG')

  // La section "OggDude Data Importer" peut être collapsée — cliquer pour l'ouvrir
  const oggDudeSection = page
    .locator('section')
    .filter({ hasText: /OggDude Data Importer/i })
    .first()
  const sectionCount = await oggDudeSection.count()
  if (sectionCount > 0) {
    await oggDudeSection.click()
  }

  const importButton = page.getByRole('button', { name: /Import data from OggDude/i })
  await importButton.waitFor({ state: 'visible', timeout: 10000 })
  await importButton.click()

  // Vérifier que le dialog d'import est ouvert
  await expect(page.getByRole('button', { name: /OggDude Zip Data File/i })).toBeVisible()
}

/**
 * Upload le ZIP OggDude et déclenche l'import.
 * Pré-condition : dialog OggDude ouvert (voir openOggDudeImporterDialog).
 *
 * Le bouton "OggDude Zip Data File" déclenche un file chooser natif —
 * on utilise waitForEvent('filechooser') pour intercepter la sélection
 * sans ouvrir de dialog système.
 */
export async function uploadOggDudeZip(page: Page, options: OggDudeImportOptions): Promise<void> {
  const { zipPath, importMode = 'world', selectAll = true } = options

  const toCompendiumCheckbox = page.getByRole('checkbox', { name: /Import to Compendium/i })
  await toCompendiumCheckbox.waitFor({ state: 'visible', timeout: 10000 })

  if (importMode === 'compendium') {
    // Compendium mode: explicitly check the checkbox
    await toCompendiumCheckbox.check()
  } else {
    // World mode: assert the checkbox is unchecked — do NOT interact with it.
    // The dialog opens with this checkbox unchecked by default.
    await expect(toCompendiumCheckbox).not.toBeChecked()
  }

  // Upload du ZIP via le file chooser natif
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10000 }),
    page.getByRole('button', { name: /OggDude Zip Data File/i }).click(),
  ])
  await fileChooser.setFiles(zipPath)

  // Après sélection du fichier, les catégories disponibles apparaissent
  if (selectAll) {
    const selectAllCheckbox = page.getByRole('checkbox', { name: /Select All/i })
    await selectAllCheckbox.waitFor({ state: 'visible', timeout: 10000 })
    await selectAllCheckbox.check()
  }
}

/**
 * Déclenche le chargement des données OggDude.
 * Enregistre le listener Hooks.once('oggdudeImport.completed') AVANT le clic
 * pour éviter toute condition de course avec l'import asynchrone.
 * Pré-condition : ZIP sélectionné, options configurées (voir uploadOggDudeZip).
 */
export async function triggerOggDudeImport(page: Page): Promise<void> {
  // Register completion flag before clicking — avoids race where import finishes
  // before waitForOggDudeImportComplete sets up its listener.
  await page.evaluate(() => {
    ;(window as unknown as Record<string, unknown>)['__oggdudeImportDone'] = false
    Hooks.once('oggdudeImport.completed', () => {
      ;(window as unknown as Record<string, unknown>)['__oggdudeImportDone'] = true
    })
  })
  await page.getByRole('button', { name: /^Load$/i }).click()
}

/**
 * Attend la fin de l'import OggDude en sondant le flag posé par triggerOggDudeImport.
 *
 * Stratégie : le hook Foundry `oggdudeImport.completed` est le seul signal fiable
 * de fin d'import. `networkidle` ne fonctionne pas car la page est déjà idle au
 * moment où les requêtes de création de documents démarrent.
 *
 * @param timeout en ms (défaut: 120s — l'import complet peut être long)
 */
export async function waitForOggDudeImportComplete(page: Page, timeout = 120_000): Promise<void> {
  await page.waitForFunction(() => (window as unknown as Record<string, unknown>)['__oggdudeImportDone'] === true, undefined, { timeout })
  await page.evaluate(() => {
    delete (window as unknown as Record<string, unknown>)['__oggdudeImportDone']
  })

  // Vérifier absence d'erreur : aucune notification d'erreur dans #notifications
  const errorNotification = page.locator('#notifications .notification.error')
  const hasError = await errorNotification.isVisible().catch(() => false)
  if (hasError) {
    const errorText = await errorNotification.textContent().catch(() => 'unknown error')
    throw new Error(`[oggdude-import] Import failed with error: ${errorText}`)
  }
}

/**
 * Ferme le dialog OggDude et le dialog Game Settings.
 * Pré-condition : import terminé, dialog OggDude encore ouvert.
 */
export async function closeOggDudeDialogs(page: Page): Promise<void> {
  // Fermer le formulaire OggDude settings (#swerpgSettings-form)
  const closeSwerpg = page.locator('#swerpgSettings-form').getByRole('button', { name: /Close Window/i })
  if ((await closeSwerpg.count()) > 0) {
    await closeSwerpg.click()
    await page.waitForTimeout(300)
  }

  // Fermer le dialog Game Settings parent (si encore ouvert)
  const closeGame = page.getByRole('button', { name: /Close Window/i }).first()
  if (await closeGame.isVisible().catch(() => false)) {
    await closeGame.click()
  }
}

/**
 * Vérifie que les compendiums OggDude ont été créés/mis à jour.
 * Navigue vers l'onglet Compendium Packs et cherche la section "SWERPG OggDude Import".
 * Pré-condition : dialogs fermés, page sur /game.
 */
export async function verifyOggDudeCompendiums(page: Page): Promise<void> {
  await page.getByRole('tab', { name: /Compendium/i }).click()

  // Section "SWERPG OggDude Import" dans la liste des compendiums
  const oggDudeSection = page
    .locator('header, h3, .directory-header, li')
    .filter({ hasText: /SWERPG OggDude Import/i })
    .first()
  await expect(oggDudeSection).toBeVisible({ timeout: 10000 })
}

// ---------------------------------------------------------------------------
// High-level import scenario helper
// ---------------------------------------------------------------------------

/**
 * Runs the full OggDude import sequence in a single call.
 *
 * Chains: openOggDudeImporterDialog → uploadOggDudeZip → triggerOggDudeImport
 *         → waitForOggDudeImportComplete → closeOggDudeDialogs
 *
 * Assertions are intentionally NOT included — keep them in the spec
 * to preserve the separation between execution and verification.
 *
 * @param page - Playwright page (must be on /game)
 * @param options - zipPath and importMode
 * @param timeout - wait timeout for import completion in ms (default: 120s)
 */
export async function runOggDudeImportScenario(
  page: Page,
  options: { importMode: ImportMode; zipPath: string },
  timeout = 120_000,
): Promise<void> {
  const { importMode, zipPath } = options
  await openOggDudeImporterDialog(page)
  await uploadOggDudeZip(page, { zipPath, importMode, selectAll: true })
  await triggerOggDudeImport(page)
  await waitForOggDudeImportComplete(page, timeout)
  await closeOggDudeDialogs(page)
}

// ---------------------------------------------------------------------------
// Sentinel constants — locked by plan decision
// ---------------------------------------------------------------------------

/**
 * The three sentinel items used to validate an OggDude import.
 * These must be present in the imported data ZIP (e2e/fixtures/oggdude-data.zip).
 */
export const OGGDUDE_SENTINELS = [
  { name: 'Holdout Blaster', type: 'weapon' },
  { name: 'Armored Clothing', type: 'armor' },
  { name: 'Bothan', type: 'species' },
] as const

// ---------------------------------------------------------------------------
// World assertions
// ---------------------------------------------------------------------------

/**
 * Verifies that the three OggDude sentinel items exist in `game.items` (world scope)
 * with their expected name and type.
 *
 * Pré-condition : dialogs closed, page on /game, world import completed.
 *
 * @throws If any sentinel is missing or has the wrong type.
 */
export async function verifyOggDudeWorldItems(page: Page): Promise<void> {
  for (const sentinel of OGGDUDE_SENTINELS) {
    const found = await page.evaluate(
      ({ sentinelName, sentinelType }: { sentinelName: string; sentinelType: string }) => {
        const items = game?.items?.contents ?? []
        const item = items.find((i) => i.name === sentinelName)
        if (!item) return { found: false, reason: 'not found in game.items' }
        if (item.type !== sentinelType) return { found: false, reason: `wrong type: expected ${sentinelType}, got ${item.type}` }
        return { found: true, reason: '' }
      },
      { sentinelName: sentinel.name, sentinelType: sentinel.type },
    )

    if (!found.found) {
      throw new Error(`[oggdude-assert] Sentinel "${sentinel.name}" (${sentinel.type}) not found in world: ${found.reason}`)
    }
  }
}

// ---------------------------------------------------------------------------
// Compendium assertions
// ---------------------------------------------------------------------------

/**
 * Pack name suffixes for the three sentinel compendium packs created by OggDude import.
 * Full collection ID = `<worldId>.<packName>` — worldId may differ from `game.world.id`
 * when the world was imported/copied (e.g. 'swerpg-e2e-world'). Lookups use
 * metadata.name to remain world-ID-agnostic.
 */
export const OGGDUDE_SENTINEL_PACKS = {
  weapons: 'swerpg-weapons',
  armors: 'swerpg-armors',
  species: 'swerpg-species',
} as const

/**
 * Verifies that the three OggDude sentinel packs exist and contain the expected items.
 *
 * Looks up packs by metadata.name (world-ID-agnostic) to handle worlds whose
 * pack collection prefix differs from game.world.id.
 *
 * Pré-condition : dialogs closed, page on /game, compendium import completed.
 *
 * @throws If any pack is missing or does not contain the expected sentinel.
 */
export async function verifyOggDudeCompendiumItems(page: Page): Promise<void> {
  type SentinelCheck = { packName: string; name: string }
  const checks: SentinelCheck[] = [
    { packName: OGGDUDE_SENTINEL_PACKS.weapons, name: 'Holdout Blaster' },
    { packName: OGGDUDE_SENTINEL_PACKS.armors, name: 'Armored Clothing' },
    { packName: OGGDUDE_SENTINEL_PACKS.species, name: 'Bothan' },
  ]

  for (const check of checks) {
    const result = await page.evaluate(
      async ({ packName, sentinelName }: { packName: string; sentinelName: string }) => {
        const pack = game?.packs?.contents?.find((p) => p.metadata.name === packName && p.metadata.packageType === 'world')
        if (!pack) return { found: false, reason: `world pack with name "${packName}" not found in game.packs` }

        const item = await pack.getName(sentinelName)
        if (!item) return { found: false, reason: `"${sentinelName}" not found in pack "${packName}"` }

        return { found: true, reason: '' }
      },
      { packName: check.packName, sentinelName: check.name },
    )

    if (!result.found) {
      throw new Error(`[oggdude-assert] Compendium check failed: ${result.reason}`)
    }
  }
}
