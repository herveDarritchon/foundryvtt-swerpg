import { expect, test } from './fixtures'

/**
 * 02 — Smoke prod : surfaces UI critiques
 *
 * Vérifie que les surfaces UI principales sont visibles et exploitables
 * sans crash ni clé i18n brute.
 *
 * LECTURE SEULE — aucune création, édition, suppression ou import.
 * Exécution manuelle uniquement, post-déploiement.
 */
test.describe('[smoke] 02 — surfaces', () => {
  /**
   * Vérifie que ce test tourne bien en /game.
   * Si le monde n'est pas configuré (E2E_FOUNDRY_WORLD vide), on skip.
   */
  async function requireGame(page: import('@playwright/test').Page): Promise<boolean> {
    if (!page.url().includes('/game')) {
      test.skip()
      return false
    }
    return true
  }

  test('sidebar affiche les onglets principaux sans clé i18n brute', async ({ page }) => {
    if (!(await requireGame(page))) return

    const sidebar = page.locator('#sidebar')
    await expect(sidebar).toBeVisible()

    // Vérifier qu'aucune clé SWERPG.* brute n'est visible dans la sidebar
    const sidebarText = await sidebar.textContent()
    const rawKeys = (sidebarText ?? '').match(/SWERPG\.[A-Z][A-Za-z.]+/g) ?? []
    expect(rawKeys, `Clés i18n brutes dans la sidebar : ${rawKeys.join(', ')}`).toHaveLength(0)
  })

  test('aucun placeholder cassé visible dans la sidebar (undefined, null)', async ({ page }) => {
    if (!(await requireGame(page))) return

    const sidebar = page.locator('#sidebar')
    await expect(sidebar).toBeVisible()

    const sidebarText = await sidebar.textContent()
    // Détecter les valeurs "undefined" ou "null" visibles comme du texte utilisateur
    expect(sidebarText).not.toMatch(/\bundefined\b/)
    expect(sidebarText).not.toMatch(/\bnull\b/)
  })

  test('onglet Actors visible et accessible en lecture', async ({ page }) => {
    if (!(await requireGame(page))) return

    const sidebar = page.locator('#sidebar')
    await expect(sidebar).toBeVisible()

    // Ouvrir l'onglet Actors sans mutation
    const actorsTab = sidebar
      .locator('[role="tab"][data-tab="actors"]')
      .or(sidebar.getByRole('tab', { name: /Actors/i }))
      .first()

    await actorsTab.waitFor({ state: 'visible', timeout: 10000 })
    await actorsTab.click()

    // Vérifier que la section Actors s'affiche
    const actorsSection = page.locator('#sidebar #actors')
    await expect(actorsSection).toBeVisible()
  })

  test('onglet Items visible et accessible en lecture', async ({ page }) => {
    if (!(await requireGame(page))) return

    const sidebar = page.locator('#sidebar')
    await expect(sidebar).toBeVisible()

    const itemsTab = sidebar
      .locator('[role="tab"][data-tab="items"]')
      .or(sidebar.getByRole('tab', { name: /Items/i }))
      .first()

    await itemsTab.waitFor({ state: 'visible', timeout: 10000 })
    await itemsTab.click()

    const itemsSection = page.locator('#sidebar #items')
    await expect(itemsSection).toBeVisible()
  })

  test('onglet Settings visible et accessible en lecture', async ({ page }) => {
    if (!(await requireGame(page))) return

    const sidebar = page.locator('#sidebar')
    await expect(sidebar).toBeVisible()

    const settingsTab = sidebar
      .locator('[role="tab"][data-tab="settings"]')
      .or(sidebar.getByRole('tab', { name: /Settings/i }))
      .first()

    await settingsTab.waitFor({ state: 'visible', timeout: 10000 })
    await settingsTab.click()

    const settingsSection = page.locator('#sidebar #settings')
    await expect(settingsSection).toBeVisible()
  })
})
