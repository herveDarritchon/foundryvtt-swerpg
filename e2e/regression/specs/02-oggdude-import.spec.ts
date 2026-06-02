import { expect, test } from '../../fixtures'
import { closeOggDudeDialogs, openOggDudeImporterDialog } from '../utils/oggdude-importer'

/**
 * 02 — Smoke dialog OggDude importer
 *
 * Vérifie uniquement que le dialog OggDude s'ouvre correctement depuis les
 * System Settings et expose les contrôles attendus.
 *
 * Ce test remplace l'ancienne spec mixte (world + compendium dans un seul test)
 * qui portait un contrat contradictoire : import `toCompendium: false` suivi d'une
 * vérification de compendium.
 *
 * Les suites de regression d'import réelles sont dans :
 *   - 02-oggdude-import-world.spec.ts     (flux world, assertions game.items)
 *   - 02b-oggdude-import-compendium.spec.ts (flux compendium, assertions game.packs)
 *
 * Pré-requis :
 *   - Instance Foundry sur port 31001 avec monde Swerpg-Regression-World
 *
 * La fixture `worldReady` (auto=true) gère la connexion/déconnexion autour de chaque test.
 */
test.describe('[regression] 02 — OggDude importer dialog smoke', () => {
  test("dialog OggDude s'ouvre depuis les settings système [ci]", async ({ page }) => {
    await expect(page).toHaveURL(/.*\/game/)

    await openOggDudeImporterDialog(page)

    // Vérifier les éléments clés du dialog
    await expect(page.getByRole('button', { name: /OggDude Zip Data File/i })).toBeVisible()
    await expect(page.getByRole('checkbox', { name: /Import to Compendium/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Load$/i })).toBeVisible()

    await closeOggDudeDialogs(page)
  })
})
