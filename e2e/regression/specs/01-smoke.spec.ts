import { expect, test } from '../../fixtures'

/**
 * 01 — Smoke test de non-régression
 *
 * Vérifie que l'instance Foundry sur port 31001 démarre correctement,
 * charge le monde Swerpg-Regression-World et affiche l'UI du système swerpg.
 *
 * Le monde est créé automatiquement par le globalSetup si absent.
 * La fixture `worldReady` gère la connexion/déconnexion pour chaque test.
 */
test.describe('[regression] 01 — smoke', () => {
  test('monde chargé avec système swerpg', async ({ page }) => {
    await expect(page).toHaveURL(/.*\/game/)
    await expect(page.locator('body.system-swerpg')).toHaveCount(1)
    await expect(page.locator('#sidebar')).toBeVisible()
  })

  test('sidebar contient les sections principales', async ({ page }) => {
    const sidebar = page.locator('#sidebar')
    await expect(sidebar).toBeVisible()

    // Vérifier les onglets (buttons de navigation, role="tab") présents dans la sidebar
    await expect(sidebar.getByRole('tab', { name: /Actors/i })).toBeVisible()
    await expect(sidebar.getByRole('tab', { name: /Items/i })).toBeVisible()
    await expect(sidebar.getByRole('tab', { name: /Settings/i })).toBeVisible()
  })
})
