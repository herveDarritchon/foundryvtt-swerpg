import { expect, test } from '../fixtures'

/**
 * [ci] Swerpg bootstrap — spec legacy
 *
 * Vérifie que le monde Swerpg se charge correctement et que l'UI système est présente.
 * Tag [ci] : exécuté en CI via `pnpm e2e:ci`.
 *
 * La fixture `worldReady` (auto=true) gère la connexion, la capture d'erreurs navigateur,
 * et le tearDown pour chaque test.
 */
test.describe('[ci] Swerpg bootstrap', () => {
  test('should load Foundry world and display Swerpg UI element', async ({ page }) => {
    // Vérifier l'URL
    await expect(page).toHaveURL(/.*game/)

    // Vérifier la classe système sur body
    const body = page.locator('body.system-swerpg')
    await expect(body).toHaveCount(1)

    // Vérifier qu'un élément UI critique est présent (sidebar)
    const sidebar = page.locator('#sidebar')
    await expect(sidebar).toBeVisible()
  })
})
