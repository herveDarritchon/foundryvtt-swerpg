import * as path from 'path'
import { expect, test } from '../../fixtures'
import {
  closeOggDudeDialogs,
  openOggDudeImporterDialog,
  triggerOggDudeImport,
  uploadOggDudeZip,
  verifyOggDudeCompendiums,
  waitForOggDudeImportComplete,
} from '../utils/oggdude-importer'

/**
 * Chemin vers le fichier ZIP OggDude de test.
 * Configurer via E2E_OGGDUDE_ZIP_PATH ou placer le fichier à l'emplacement par défaut.
 */
const OGGDUDE_ZIP_PATH = process.env.E2E_OGGDUDE_ZIP_PATH ?? path.resolve(process.cwd(), 'e2e/fixtures/oggdude-data.zip')

/**
 * 02 — Import OggDude de non-régression
 *
 * Parcours complet :
 *   1. Naviguer vers System Settings → Star Wars Edge RPG
 *   2. Ouvrir l'import OggDude
 *   3. Uploader le ZIP OggDude
 *   4. Sélectionner toutes les catégories
 *   5. Déclencher l'import
 *   6. Vérifier l'absence d'erreur
 *   7. Vérifier que les compendiums OggDude sont présents
 *
 * Pré-requis :
 *   - Instance Foundry sur port 31001 avec monde Swerpg-Regression-World
 *   - Fichier ZIP OggDude accessible via E2E_OGGDUDE_ZIP_PATH ou e2e/fixtures/oggdude-data.zip
 *
 * La fixture `worldReady` (auto=true) gère la connexion/déconnexion autour de chaque test.
 */
test.describe('[regression] 02 — OggDude import', () => {
  test("dialog OggDude s'ouvre depuis les settings système", async ({ page }) => {
    await expect(page).toHaveURL(/.*\/game/)

    await openOggDudeImporterDialog(page)

    // Vérifier les éléments clés du dialog
    await expect(page.getByRole('button', { name: /OggDude Zip Data File/i })).toBeVisible()
    await expect(page.getByRole('checkbox', { name: /Import to Compendium/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Load$/i })).toBeVisible()

    await closeOggDudeDialogs(page)
  })

  test('import complet depuis un ZIP OggDude', async ({ page }) => {
    await expect(page).toHaveURL(/.*\/game/)

    // Étape 1 : ouvrir le dialog
    await openOggDudeImporterDialog(page)

    // Étape 2 : uploader le ZIP et configurer les options
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

    // Étape 6 : vérifier que les compendiums OggDude sont présents
    await verifyOggDudeCompendiums(page)
  })
})
