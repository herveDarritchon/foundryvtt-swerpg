import { expect, test } from '../../fixtures'
import { cleanupCharacter, createCompleteCharacter } from '../utils/character-factory'

/**
 * 06 — Création complète d'un personnage Bothan Spy Slicer (Tier 1 Regression)
 *
 * Parcours complet :
 *   1. Monde chargé (fixture `worldReady` auto) → page en /game
 *   2. Créer un acteur de type "character" nommé Bothan-<timestamp>
 *   3. Assigner la species "Bothan" par drag-drop depuis le compendium swerpg-species
 *   4. Assigner la career "Spy" par drag-drop depuis le compendium swerpg-careers
 *   5. Assigner la specialization "Slicer" par drag-drop depuis le compendium swerpg-specializations
 *   6. Vérifier que les trois champs sont affichés sur la fiche
 *
 * Stratégie d'hygiène (contrat Tier 1) :
 *   - Acteur nommé `Bothan-<timestamp>` pour éviter les collisions entre runs.
 *   - Suppression de l'acteur en teardown via `cleanupCharacter`.
 *
 * Pré-requis :
 *   - Instance Foundry sur port 31001 avec monde Swerpg-Regression-World
 *   - Compendiums swerpg-species, swerpg-careers, swerpg-specializations présents et peuplés
 *   - La fixture `worldReady` (auto=true) gère la connexion/déconnexion et la capture d'erreurs.
 *
 * Issue : #549
 */
test.describe('[regression] 06 — character complete creation (Bothan Spy Slicer)', () => {
  test('assigner species, career et specialization par drag-drop depuis compendium', async ({ page }) => {
    await expect(page).toHaveURL(/.*\/game/)
    const actorName = `Bothan-${Date.now()}`

    const sheet = await createCompleteCharacter(page, actorName, {
      species: { searchTerm: 'bothan', itemName: 'Bothan' },
      career: { searchTerm: 'spy', itemName: 'Spy' },
      specialization: { searchTerm: 'slicer', itemName: 'Slicer' },
    })

    await expect(sheet.locator('[data-action="editSpecies"]')).toContainText('Bothan')
    await expect(sheet.locator('[data-action="editCareer"]')).toContainText('Spy')
    await expect(sheet.locator('[data-action="editSpecializations"]')).toContainText('Slicer')

    await cleanupCharacter(page, actorName)
  })
})
