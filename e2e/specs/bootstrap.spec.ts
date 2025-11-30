import {expect, test} from '../fixtures'

test.describe('Swerpg bootstrap', () => {
    test('should load Foundry world and display Swerpg UI element', async ({page}) => {
        await expect(page).toHaveURL(/.*game/)

        const body = page.locator('body.system-swerpg')
        await expect(body).toHaveCount(1)
    })
})

