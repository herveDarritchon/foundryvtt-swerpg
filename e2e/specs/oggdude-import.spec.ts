import {expect, test} from '../fixtures'
import {navigateToSystemSettings} from '../utils/foundryUI'

test.describe('OggDude importer', () => {
    test('should open the OggDude import interface', async ({page, browserName}, testInfo) => {
        console.log(`[oggdude-import] 🧪 Démarrage du test sur ${browserName}`)
        console.log(`[oggdude-import] URL initiale: ${page.url()}`)

        // Vérifier l'URL
        await expect(page).toHaveURL(/.*game/)

        await page.screenshot({
            path: testInfo.outputPath('oggdude-import.png'),
            fullPage: true,
        });

        // 1-3) Navigation vers System Settings (refactorisé via helper)
        console.log('[oggdude-import] Navigation vers System Settings...')
        await navigateToSystemSettings(page, 'Star Wars Edge RPG')
        console.log(`[oggdude-import] Après navigation System Settings, URL: ${page.url()}`)

        // 4) Cliquer sur la section OggDude Data Importer
        console.log('[oggdude-import] Recherche de la section OggDude Data Importer...')
        const oggDudeSection = page
            .locator('section')
            .filter({hasText: /OggDude Data Importer/i})
            .first()
        await oggDudeSection.click()
        console.log('[oggdude-import] Section OggDude cliquée')

        // 5) Ouvrir la fenêtre d'import OggDude
        console.log('[oggdude-import] Clic sur le bouton Import data from OggDude...')
        const importButton = page.getByRole('button', {name: /Import data from OggDude/i})
        await importButton.waitFor({state: 'visible', timeout: 10000})
        console.log(`[oggdude-import] Bouton visible, URL avant clic: ${page.url()}`)

        await importButton.click()
        console.log(`[oggdude-import] Bouton cliqué, URL après clic: ${page.url()}`)

        // 6) Vérifier que l'interface d'import OggDude est bien affichée
        console.log('[oggdude-import] Vérification de l\'interface d\'import...')
        const fileInput = page.getByRole('button', {name: 'OggDude Zip Data File'});
        await expect(fileInput).toBeVisible()
        console.log('[oggdude-import] Interface d\'import OggDude affichée correctement')
        console.log(`[oggdude-import] ✅ Fin du test sur ${browserName}`)
    })
})
