import { test, expect } from '../fixtures'

test.describe('OggDude importer', () => {
  test('should open the OggDude import interface', async ({ page }) => {
    await test.step('Open system settings or module menu', async () => {
      await page.getByRole('button', { name: /Settings/i }).click()
    })

    await test.step('Open OggDude importer application', async () => {
      await page.getByRole('button', { name: /OggDude Import/i }).click()
    })

    await test.step('Verify importer UI skeleton', async () => {
      await expect(page.getByRole('heading', { name: /OggDude Import/i })).toBeVisible()
    })
  })
})

