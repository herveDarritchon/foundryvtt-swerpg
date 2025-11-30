import { test, expect } from '../fixtures'
import { navigateToSystemSettings } from '../utils/foundryUI'

test.describe('OggDude importer', () => {
  test('should open the OggDude import interface', async ({ page, browserName }) => {
      // TODO: Chromium spécifique - Session perdue pendant navigation settings système
      // Investigation nécessaire sur gestion cookies/session Foundry + Chromium
      // Voir: documentation/tests/e2e/playwright-chromium-issues-addendum.md
      test.skip(browserName === 'chromium', 'Chromium: Session timeout during settings navigation - under investigation')

      // worldReady a déjà loggué l'admin et lancé le world swerpg-e2e

      // 1-3) Navigation vers System Settings (refactorisé via helper)
      await navigateToSystemSettings(page, 'Star Wars Edge RPG')

      // 4) Cliquer sur la section OggDude Data Importer
      const oggDudeSection = page
          .locator('section')
          .filter({ hasText: /OggDude Data Importer/i })
          .first()
      await oggDudeSection.click()

      // 5) Ouvrir la fenêtre d'import OggDude
      await page.getByRole('button', { name: /Import data from OggDude/i }).click()

      // 6) Vérifier que l'interface d'import OggDude est bien affichée
      const fileInput = page.getByRole('button', { name: 'OggDude Zip Data File' });
      await expect(fileInput).toBeVisible()
  })
})
