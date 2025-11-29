import { test, expect } from '../fixtures'

test.describe('Swerpg bootstrap', () => {
  test('should load Foundry world and display Swerpg UI element', async ({ page }) => {
    await expect(page).toHaveURL(/.*game/)

    await expect(page.getByRole('img', { name: /Swerpg/i })).toBeVisible()
  })
})

