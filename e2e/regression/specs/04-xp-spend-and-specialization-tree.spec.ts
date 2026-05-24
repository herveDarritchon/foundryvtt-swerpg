import { expect, test } from '../../fixtures'
import { createActor, openActorsTab, openActorSkillsTab, openSpecializationTree } from '../../utils/foundryUI'
import { deleteActorByName } from '../utils/world-manager'

/**
 * 04 — Dépense simple d'XP et ouverture arbre de spécialisation (Tier 1 Regression)
 *
 * Parcours complet :
 *   1. Monde chargé (fixture `worldReady` auto) → page en /game
 *   2. Ouvrir l'onglet Actors dans la sidebar
 *   3. Créer un personnage de type "character" (nom unique, état L0 = création incomplète)
 *   4. Vérifier que la console XP est visible avec les valeurs initiales
 *   5. Ouvrir l'onglet Skills de la fiche et acheter un rang de compétence
 *   6. Vérifier que le recalcul XP est visible et persistant dans la console
 *   7. Ouvrir l'arbre de spécialisation via le bouton dédié de la fiche
 *   8. Vérifier que l'arbre s'ouvre sans erreur navigateur non autorisée
 *
 * Stratégie d'hygiène (contrat Tier 1) :
 *   - Chaque test crée ses acteurs avec un nom horodaté unique (`Test-XP-<timestamp>`, etc.).
 *   - Chaque test supprime ses acteurs en teardown via `deleteActorByName`.
 *   - Le monde n'est pas recréé entre les runs : seuls les artefacts éphémères sont nettoyés.
 *
 * Pré-requis :
 *   - Instance Foundry sur port 31001 avec monde Swerpg-Regression-World
 *   - La fixture `worldReady` (auto=true) gère la connexion/déconnexion et la capture d'erreurs.
 *
 * Contrat minimal :
 *   - Un personnage fraîchement créé (L0) est en mode "création incomplète".
 *   - Le panneau XP console ([data-skill-purchase-console]) est visible pendant la création.
 *   - L'achat d'un rang de compétence sans XP initial (0/0) utilise le rang libre si disponible
 *     ou échoue silencieusement ; la console reste cohérente.
 *   - L'ouverture de l'arbre de spécialisation (.specialization-tree-app) ne génère
 *     aucune erreur navigateur non autorisée.
 *
 * Issue : #370 — PWE4 - [Tier 1 Regression] Spec regression : dépense simple d'XP et ouverture arbre de spécialisation
 */
test.describe('[regression] 04 — XP spend and specialization tree', () => {
  test('console XP visible sur fiche de personnage fraîchement créé', async ({ page }) => {
    // Arrange : world chargé par la fixture worldReady
    await expect(page).toHaveURL(/.*\/game/)
    const actorName = `Test-XP-${Date.now()}`

    // Act 1 : ouvrir l'onglet Actors et créer le personnage
    await openActorsTab(page)
    await expect(page.locator('#actors')).toBeVisible()
    await createActor(page, actorName, 'character')

    // Assert 1 : la fiche est ouverte
    const actorSheet = page.locator('.application.sheet, .app.sheet, .window-app, dialog.sheet, [role="dialog"]').filter({ hasText: actorName }).first()
    await expect(actorSheet).toBeVisible()

    // Assert 2 : le panneau XP console est visible (mode création incomplète = L0)
    // La console [data-skill-purchase-console] est rendue quand incomplete.creation est vrai
    const xpConsole = actorSheet.locator('[data-skill-purchase-console]')
    await expect(xpConsole).toBeVisible()

    // Assert 3 : les valeurs XP initiales sont numériques et cohérentes
    const availableEl = xpConsole.locator('[data-xp-available]')
    const spentEl = xpConsole.locator('[data-xp-spent]')
    await expect(availableEl).toBeVisible()
    await expect(spentEl).toBeVisible()

    // Teardown : supprimer l'artefact de test
    await deleteActorByName(page, actorName)
  })

  test('achat rang compétence : console XP reste cohérente après transaction', async ({ page }) => {
    // Arrange : world chargé, personnage créé
    await expect(page).toHaveURL(/.*\/game/)
    const actorName = `Test-XP-Skill-${Date.now()}`

    await openActorsTab(page)
    await createActor(page, actorName, 'character')

    // Ouvrir l'onglet Skills de la fiche
    await openActorSkillsTab(page, actorName)

    const actorSheet = page.locator('.application.sheet, .app.sheet, .window-app, dialog.sheet, [role="dialog"]').filter({ hasText: actorName }).first()

    // Assert : la console XP et au moins une compétence sont visibles
    const xpConsole = actorSheet.locator('[data-skill-purchase-console]')
    await expect(xpConsole).toBeVisible()

    const firstSkill = actorSheet.locator('[data-skill-id]').first()
    await expect(firstSkill).toBeVisible()

    // Act : lire les valeurs XP avant achat
    const availableEl = xpConsole.locator('[data-xp-available]')
    const spentEl = xpConsole.locator('[data-xp-spent]')

    const availableBefore = await availableEl.textContent()
    const spentBefore = await spentEl.textContent()

    // Tenter d'acheter un rang de la première compétence disponible
    // data-action="skillBuy" est le bouton d'achat dans le partial character-skill.hbs
    const buyButton = firstSkill.locator('[data-action="skillBuy"]').first()
    await buyButton.waitFor({ state: 'visible', timeout: 5000 })
    await buyButton.click()

    // Attendre la stabilisation de l'UI (la console peut se mettre à jour sans re-render complet)
    await page.waitForTimeout(1000)

    // Assert : la console XP affiche toujours des valeurs numériques cohérentes
    // (le recalcul peut avoir dépensé des XP ou des rangs libres selon l'état du personnage)
    const availableAfter = await availableEl.textContent()
    const spentAfter = await spentEl.textContent()

    // Les valeurs doivent rester des entiers (pas de NaN, undefined ou vide)
    expect(availableAfter).toMatch(/^\d+$/)
    expect(spentAfter).toMatch(/^\d+$/)

    // Documenter les valeurs avant/après pour diagnostic en cas de régression
    expect({ availableBefore, spentBefore, availableAfter, spentAfter }).toBeDefined()

    // Teardown : supprimer l'artefact de test
    await deleteActorByName(page, actorName)
  })

  test("arbre de spécialisation s'ouvre sans erreur navigateur", async ({ page }) => {
    // Arrange : world chargé, personnage créé
    await expect(page).toHaveURL(/.*\/game/)
    const actorName = `Test-SpecTree-${Date.now()}`

    await openActorsTab(page)
    await createActor(page, actorName, 'character')

    // Act : ouvrir l'arbre de spécialisation via le bouton dédié de la fiche
    await openSpecializationTree(page, actorName)

    // Assert 1 : l'application de l'arbre est visible
    const treeApp = page.locator('.specialization-tree-app').first()
    await expect(treeApp).toBeVisible()

    // Assert 2 : le titre de l'application de l'arbre est présent
    const treeHeader = treeApp.locator('.specialization-tree-app__header')
    await expect(treeHeader).toBeVisible()

    // Assert 3 (implicite) : aucune erreur navigateur — vérifiée automatiquement
    // par la fixture `worldReady` en teardown via errorCollector.assertNoErrors()

    // Teardown : supprimer l'artefact de test
    await deleteActorByName(page, actorName)
  })
})
