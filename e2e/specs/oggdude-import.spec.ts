import { expect, test } from '../fixtures'
import { navigateToSystemSettings } from '../utils/foundryUI'

test.describe('OggDude importer', () => {
  test('should open the OggDude import interface', async ({ page, browserName }, testInfo) => {
    console.log(`[oggdude-import] 🧪 Démarrage du test sur ${browserName}`)

    // Vérifier l'URL
    await expect(page).toHaveURL(/.*game/)

    // 1-3) Navigation vers System Settings (refactorisé via helper)
    await navigateToSystemSettings(page, 'Star Wars Edge RPG')

    // 4) Cliquer sur la section OggDude Data Importer
    const oggDudeSection = page
      .locator('section')
      .filter({ hasText: /OggDude Data Importer/i })
      .first()
    await oggDudeSection.click()

    // 5) Ouvrir la fenêtre d'import OggDude
    const importButton = page.getByRole('button', { name: /Import data from OggDude/i })
    await importButton.waitFor({ state: 'visible', timeout: 10000 })

    await importButton.click()

    // 6) Vérifier que l'interface d'import OggDude est bien affichée
    const fileInput = page.getByRole('button', { name: 'OggDude Zip Data File' })
    await expect(fileInput).toBeVisible()

    console.log(`[oggdude-import] ✅ Fin du test sur ${browserName}`)
  })
})
