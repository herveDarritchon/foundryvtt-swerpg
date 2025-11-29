import { test, expect } from '@playwright/test'

test.describe('Diagnostic Admin Auth', () => {
  test('should authenticate with admin password', async ({ page }) => {
    const baseURL = process.env.E2E_FOUNDRY_BASE_URL || 'http://localhost:30000'
    const adminPassword = process.env.E2E_FOUNDRY_ADMIN_PASSWORD || ''

    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 })

    // Attendre un peu pour voir l'état de la page
    await page.waitForTimeout(2000)

    // Prendre un screenshot pour diagnostic
    await page.screenshot({ path: 'test-results/admin-auth-before.png', fullPage: true })

    // Chercher le champ de mot de passe admin
    const passwordInput = page.locator('input[name="adminPassword"], input[type="password"]').first()
    const isVisible = await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)

    console.log('Admin password field visible:', isVisible)

    if (isVisible) {
      await passwordInput.fill(adminPassword)

      // Screenshot après remplissage
      await page.screenshot({ path: 'test-results/admin-auth-filled.png', fullPage: true })

      const loginButton = page.getByRole('button', { name: /LOG IN/i })
      await loginButton.click()

      // Attendre le chargement
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(3000)

      // Screenshot après login
      await page.screenshot({ path: 'test-results/admin-auth-after.png', fullPage: true })

      // Vérifier qu'on arrive bien sur le setup
      const setupTitle = page.getByRole('heading', { name: /Foundry Virtual Tabletop/i })
      const hasSetupTitle = await setupTitle.isVisible({ timeout: 10000 }).catch(() => false)

      console.log('Setup page visible:', hasSetupTitle)
      expect(hasSetupTitle).toBeTruthy()
    } else {
      console.log('No admin auth page detected')
      await page.screenshot({ path: 'test-results/no-admin-auth.png', fullPage: true })
    }
  })
})

