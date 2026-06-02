import * as path from 'path'
import { expect, test } from '../../fixtures'
import {
  closeOggDudeDialogs,
  openOggDudeImporterDialog,
  triggerOggDudeImport,
  uploadOggDudeZip,
  waitForOggDudeImportComplete,
  verifyOggDudeCompendiumItems,
  OGGDUDE_SENTINEL_PACKS,
} from '../utils/oggdude-importer'
import { runOggDudePreImportCleanup } from '../utils/oggdude-cleanup'

/**
 * Chemin vers le fichier ZIP OggDude de test.
 * Configurer via E2E_OGGDUDE_ZIP_PATH ou placer le fichier à l'emplacement par défaut.
 */
const OGGDUDE_ZIP_PATH = process.env.E2E_OGGDUDE_ZIP_PATH ?? path.resolve(process.cwd(), 'e2e/fixtures/oggdude-data.zip')

/**
 * 02b — Import OggDude : mode compendium (non-régression)
 *
 * Prouve que l'import `toCompendium: true` crée les packs world attendus et que
 * les sentinelles sont présentes dans chaque pack.
 *
 * Packs vérifiés :
 *   - world.swerpg-weapons  → Holdout Blaster
 *   - world.swerpg-armors   → Armored Clothing
 *   - world.swerpg-species  → Bothan
 *
 * Pré-requis :
 *   - Instance Foundry sur port 31001 avec monde Swerpg-Regression-World
 *   - Fichier ZIP OggDude accessible via E2E_OGGDUDE_ZIP_PATH ou e2e/fixtures/oggdude-data.zip
 *
 * La fixture `worldReady` (auto=true) gère la connexion/déconnexion autour de chaque test.
 * Le cleanup OggDude s'exécute en beforeEach pour garantir un état propre avant chaque run.
 */
test.describe('[regression] 02b — OggDude import (compendium)', () => {
  test.beforeEach(async ({ page }) => {
    await expect(page).toHaveURL(/.*\/game/)
    const summary = await runOggDudePreImportCleanup(page)
    // eslint-disable-next-line no-console
    console.log(`[oggdude-compendium] Pre-import cleanup: worldId=${summary.worldId} items=${summary.itemsDeleted} packs=${summary.packsDeleted} skipped=${summary.packsSkipped}`)
  })

  test('import compendium crée les packs world OggDude avec les sentinelles [ci]', async ({ page }) => {
    await expect(page).toHaveURL(/.*\/game/)

    // Étape 1 : ouvrir le dialog
    await openOggDudeImporterDialog(page)

    // Étape 2 : uploader le ZIP — mode compendium, toutes catégories sélectionnées
    await uploadOggDudeZip(page, {
      zipPath: OGGDUDE_ZIP_PATH,
      toCompendium: true,
      selectAll: true,
    })

    // Étape 3 : déclencher l'import
    await triggerOggDudeImport(page)

    // Étape 4 : attendre la fin (peut prendre plusieurs dizaines de secondes)
    await waitForOggDudeImportComplete(page, 120_000)

    // Étape 5 : fermer les dialogs
    await closeOggDudeDialogs(page)

    // Étape 6 : vérifier l'existence des packs world OggDude
    const packIds = Object.values(OGGDUDE_SENTINEL_PACKS)
    for (const packId of packIds) {
      const exists = await page.evaluate((id: string) => {
        return Boolean(game?.packs?.get(id))
      }, packId)

      if (!exists) {
        throw new Error(`[oggdude-compendium] Expected pack "${packId}" not found in game.packs`)
      }
    }

    // Étape 7 : vérifier les sentinelles dans les packs — aucune assertion game.items monde
    await verifyOggDudeCompendiumItems(page)
  })
})
