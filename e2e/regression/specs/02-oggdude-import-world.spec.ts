import * as path from 'path'
import { expect, test } from '../../fixtures'
import {
  closeOggDudeDialogs,
  openOggDudeImporterDialog,
  triggerOggDudeImport,
  uploadOggDudeZip,
  waitForOggDudeImportComplete,
  verifyOggDudeWorldItems,
} from '../utils/oggdude-importer'
import { runOggDudePreImportCleanup } from '../utils/oggdude-cleanup'

/**
 * Chemin vers le fichier ZIP OggDude de test.
 * Configurer via E2E_OGGDUDE_ZIP_PATH ou placer le fichier à l'emplacement par défaut.
 */
const OGGDUDE_ZIP_PATH = process.env.E2E_OGGDUDE_ZIP_PATH ?? path.resolve(process.cwd(), 'e2e/fixtures/oggdude-data.zip')

/**
 * 02 — Import OggDude : mode world (non-régression)
 *
 * Prouve que l'import `toCompendium: false` crée les objets attendus dans `game.items`
 * du monde actif.
 *
 * Sentinelles vérifiées :
 *   - Holdout Blaster  (weapon)
 *   - Armored Clothing (armor)
 *   - Bothan           (species)
 *
 * Pré-requis :
 *   - Instance Foundry sur port 31001 avec monde Swerpg-Regression-World
 *   - Fichier ZIP OggDude accessible via E2E_OGGDUDE_ZIP_PATH ou e2e/fixtures/oggdude-data.zip
 *
 * La fixture `worldReady` (auto=true) gère la connexion/déconnexion autour de chaque test.
 * Le cleanup OggDude s'exécute en beforeEach pour garantir un état propre avant chaque run.
 */
test.describe('[regression] 02 — OggDude import (world)', () => {
  test.beforeEach(async ({ page }) => {
    await expect(page).toHaveURL(/.*\/game/)
    const summary = await runOggDudePreImportCleanup(page)
    // eslint-disable-next-line no-console
    console.log(`[oggdude-world] Pre-import cleanup: worldId=${summary.worldId} items=${summary.itemsDeleted} packs=${summary.packsDeleted} skipped=${summary.packsSkipped}`)
  })

  test('import world crée les sentinelles dans game.items [ci]', async ({ page }) => {
    await expect(page).toHaveURL(/.*\/game/)

    // Étape 1 : ouvrir le dialog
    await openOggDudeImporterDialog(page)

    // Étape 2 : uploader le ZIP — mode world, toutes catégories sélectionnées
    await uploadOggDudeZip(page, {
      zipPath: OGGDUDE_ZIP_PATH,
      toCompendium: false,
      selectAll: true,
    })

    // Étape 3 : déclencher l'import
    await triggerOggDudeImport(page)

    // Étape 4 : attendre la fin (peut prendre plusieurs dizaines de secondes)
    await waitForOggDudeImportComplete(page, 120_000)

    // Étape 5 : fermer les dialogs
    await closeOggDudeDialogs(page)

    // Étape 6 : vérifier les sentinelles dans game.items (monde) — aucune assertion compendium
    await verifyOggDudeWorldItems(page)
  })
})
