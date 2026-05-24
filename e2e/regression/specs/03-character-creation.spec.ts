import { expect, test } from '../../fixtures'
import { createActor, openActorsTab } from '../../utils/foundryUI'

/**
 * 03 — Création de personnage et ouverture de fiche (Tier 1 Regression)
 *
 * Parcours complet :
 *   1. Monde chargé (fixture `worldReady` auto) → page en /game
 *   2. Ouvrir l'onglet Actors dans la sidebar
 *   3. Créer un personnage (nom unique, type "character")
 *   4. Vérifier que la fiche s'ouvre (fenêtre de sheet visible avec le bon titre)
 *   5. Vérifier l'absence d'erreur navigateur (contrôle assuré automatiquement
 *      par la fixture `worldReady` en teardown via `assertNoErrors`)
 *
 * Pré-requis :
 *   - Instance Foundry sur port 31001 avec monde Swerpg-Regression-World
 *   - La fixture `worldReady` (auto=true) gère la connexion/déconnexion et la capture d'erreurs.
 *
 * Issue : #369 — PWE3 - [Tier 1 Regression] Spec regression : création personnage et ouverture de fiche
 */
test.describe('[regression] 03 — character creation', () => {
  test('onglet Actors accessible depuis la sidebar', async ({ page }) => {
    // Arrange : world chargé par la fixture worldReady
    await expect(page).toHaveURL(/.*\/game/)

    // Act : ouvrir l'onglet Actors
    await openActorsTab(page)

    // Assert : la section #actors est visible
    await expect(page.locator('#actors')).toBeVisible()
  })

  test('création personnage et ouverture de fiche sans erreur navigateur', async ({ page }) => {
    // Arrange : world chargé, on génère un nom unique pour éviter les collisions entre runs
    await expect(page).toHaveURL(/.*\/game/)
    const actorName = `Test-Personnage-${Date.now()}`

    // Act 1 : ouvrir l'onglet Actors
    await openActorsTab(page)
    await expect(page.locator('#actors')).toBeVisible()

    // Act 2 : créer l'acteur de type "character"
    await createActor(page, actorName, 'character')

    // Assert 1 : l'acteur créé est visible dans la directory Actors
    const actorEntry = page.locator('#actors').getByText(actorName)
    await expect(actorEntry).toBeVisible()

    // Assert 2 : la fiche de l'acteur est ouverte et affiche le bon titre
    // Foundry v14 ApplicationV2 rend : <form class="application sheet ...">
    const actorSheet = page
      .locator('.application.sheet, .app.sheet, .window-app, dialog.sheet, [role="dialog"]')
      .filter({ hasText: actorName })
      .first()
    await expect(actorSheet).toBeVisible()

    // Assert 3 (implicite) : aucune erreur navigateur — vérifiée automatiquement
    // par la fixture `worldReady` en teardown via errorCollector.assertNoErrors()
  })
})
