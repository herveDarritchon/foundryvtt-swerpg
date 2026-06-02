import { expect, Page } from '@playwright/test'
import { navigateToSystemSettings, ensureSessionActive } from '../../utils/foundryUI'

export interface OggDudeImportOptions {
  /** Chemin absolu vers le fichier ZIP OggDude */
  zipPath: string
  /** Importer dans les compendiums (défaut: false) */
  toCompendium?: boolean
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
  const { zipPath, toCompendium = false, selectAll = true } = options

  // Cocher/décocher "Import to Compendium"
  const toCompendiumCheckbox = page.getByRole('checkbox', { name: /Import to Compendium/i })
  await toCompendiumCheckbox.waitFor({ state: 'visible', timeout: 10000 })
  if (toCompendium) {
    await toCompendiumCheckbox.check()
  } else {
    await toCompendiumCheckbox.uncheck()
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
 * Pré-condition : ZIP sélectionné, options configurées (voir uploadOggDudeZip).
 */
export async function triggerOggDudeImport(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Load$/i }).click()
}

/**
 * Attend la fin de l'import OggDude.
 *
 * Stratégie : l'import déclenche des requêtes réseau pour créer les documents
 * Foundry (compendiums, items…). On attend :
 *   1. networkidle — plus de requêtes actives pendant 500ms
 *   2. notification Foundry de succès ou disparition du progress bar
 *
 * @param timeout en ms (défaut: 120s — l'import complet peut être long)
 */
export async function waitForOggDudeImportComplete(page: Page, timeout = 120_000): Promise<void> {
  // Attendre que les requêtes réseau se stabilisent (création des documents Foundry)
  await page.waitForLoadState('networkidle', { timeout })

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
 * Pack identifiers for the three sentinel compendium packs created by OggDude import.
 * The pack collection IDs follow the pattern `world.<packName>`.
 */
export const OGGDUDE_SENTINEL_PACKS = {
  weapons: 'world.swerpg-weapons',
  armors: 'world.swerpg-armors',
  species: 'world.swerpg-species',
} as const

/**
 * Verifies that the three OggDude sentinel packs exist and contain the expected items.
 *
 * Checks:
 * - `world.swerpg-weapons` contains "Holdout Blaster"
 * - `world.swerpg-armors` contains "Armored Clothing"
 * - `world.swerpg-species` contains "Bothan"
 *
 * Pré-condition : dialogs closed, page on /game, compendium import completed.
 *
 * @throws If any pack is missing or does not contain the expected sentinel.
 */
export async function verifyOggDudeCompendiumItems(page: Page): Promise<void> {
  type SentinelCheck = { packId: string; name: string }
  const checks: SentinelCheck[] = [
    { packId: OGGDUDE_SENTINEL_PACKS.weapons, name: 'Holdout Blaster' },
    { packId: OGGDUDE_SENTINEL_PACKS.armors, name: 'Armored Clothing' },
    { packId: OGGDUDE_SENTINEL_PACKS.species, name: 'Bothan' },
  ]

  for (const check of checks) {
    const result = await page.evaluate(
      async ({ packId, sentinelName }: { packId: string; sentinelName: string }) => {
        const pack = game?.packs?.get(packId)
        if (!pack) return { found: false, reason: `pack "${packId}" not found in game.packs` }

        const item = await pack.getName(sentinelName)
        if (!item) return { found: false, reason: `"${sentinelName}" not found in pack "${packId}"` }

        return { found: true, reason: '' }
      },
      { packId: check.packId, sentinelName: check.name },
    )

    if (!result.found) {
      throw new Error(`[oggdude-assert] Compendium check failed: ${result.reason}`)
    }
  }
}
