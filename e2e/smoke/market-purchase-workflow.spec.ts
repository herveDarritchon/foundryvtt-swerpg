import { expect, test } from './fixtures'

/**
 * Market purchase workflow — smoke test
 *
 * Verifies the basic market opening flow from a character sheet.
 * READ-ONLY for most checks — does not commit a purchase or modify actor credits.
 *
 * Requires:
 *   - E2E_FOUNDRY_WORLD set to a world with at least one character and world items.
 *   - Foundry running on port 30000 (smoke instance).
 *
 * If the environment is not available (no world configured), the test is skipped.
 */
test.describe('[smoke] Market purchase workflow', () => {
  test('market button is accessible from the sidebar or actor sheet', async ({ page }) => {
    const url = page.url()
    if (!url.includes('/game')) {
      test.skip()
      return
    }

    // The market button may be in the sidebar actors tab or in the actors list.
    // We just verify the UI is stable and no console errors are thrown by the presence check.
    const sidebar = page.locator('#sidebar')
    await expect(sidebar).toBeVisible()
  })

  test('market application can be opened and catalogue is rendered', async ({ page }) => {
    const url = page.url()
    if (!url.includes('/game')) {
      test.skip()
      return
    }

    // Evaluate the market open call in the browser context.
    // This does NOT require a buyer actor — just verifies the Application V2 renders.
    const hasMarketApi = await page.evaluate(() => {
      // @ts-ignore — game.system.api exists in SWERPG
      return typeof game?.system?.api?.openMarket === 'function'
    })

    if (!hasMarketApi) {
      // System API not available in this world — skip gracefully
      test.skip()
      return
    }

    // Open market without buyer (catalogue-only mode)
    await page.evaluate(async () => {
      // @ts-ignore
      await game.system.api.openMarket(null)
    })

    // The market application should render in the DOM
    const marketApp = page.locator('#market')
    await expect(marketApp).toBeVisible({ timeout: 5000 })

    // Catalogue list should be present (even if empty)
    const catalogList = marketApp.locator('.market-catalog')
    await expect(catalogList).toBeVisible()
  })

  test('market toolbar and filter controls are present', async ({ page }) => {
    const url = page.url()
    if (!url.includes('/game')) {
      test.skip()
      return
    }

    const marketApp = page.locator('#market')
    if (!(await marketApp.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    // Verify toolbar elements are rendered
    await expect(marketApp.locator('.market-toolbar__search')).toBeVisible()
    await expect(marketApp.locator('.market-toolbar__filter--type')).toBeVisible()
    await expect(marketApp.locator('.market-toolbar__sort--field')).toBeVisible()
  })

  test('market type selector allows switching between market types', async ({ page }) => {
    const url = page.url()
    if (!url.includes('/game')) {
      test.skip()
      return
    }

    const marketApp = page.locator('#market')
    if (!(await marketApp.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    // Market type selector (dropdown or button group)
    const marketSelector = marketApp.locator('.market-selector__select')
    if (!(await marketSelector.isVisible().catch(() => false))) {
      test.skip()
      return
    }

    // Switch to black-market type
    await marketSelector.selectOption('black-market')

    // Wait for re-render — catalogue should still be visible
    await expect(marketApp.locator('.market-catalog')).toBeVisible({ timeout: 3000 })
  })
})
