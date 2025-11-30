import {expect, test} from '../fixtures'

test.describe('Swerpg bootstrap', () => {
    test('should load Foundry world and display Swerpg UI element', async ({page}) => {
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

