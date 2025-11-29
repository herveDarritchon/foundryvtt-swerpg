import { test, expect } from '../fixtures'

test.describe('OggDude importer', () => {
  test('should open the OggDude import interface', async ({ page }) => {
      // worldReady a déjà :
      // - loggué l’admin
      // - lancé le world swerpg-e2e
      // - rejoint la partie comme Gamemaster
      // Tu es donc déjà sur /game avec le système Swerpg chargé.

      // 1) Ouvrir Game Settings
      await page.getByRole('tab', { name: /Game Settings/i }).click()

      // 2) Ouvrir Configure Settings
      await page.getByRole('button', { name: /Configure Settings/i }).click()

      // 3) Aller dans les réglages du système "Star Wars Edge RPG"
      await page.getByRole('button', { name: /Star Wars Edge RPG/i }).click()

      // 4) Cliquer sur la section OggDude Data Importer
      const oggDudeSection = page
          .locator('section')
          .filter({ hasText: /OggDude Data Importer/i })
          .first()
      await oggDudeSection.click()

      // 5) Ouvrir la fenêtre d'import OggDude
      await page.getByRole('button', { name: /Import data from OggDude/i }).click()

      // 6) Vérifier que l’interface d’import OggDude est bien affichée
      const importerWindow = page
          .locator('.window-app')
          .filter({ hasText: /OggDude Zip Data File/i })

      await expect(importerWindow).toBeVisible()
      await expect(
          importerWindow.getByRole('button', { name: /OggDude Zip Data File/i })
      ).toBeVisible()

  })
})

