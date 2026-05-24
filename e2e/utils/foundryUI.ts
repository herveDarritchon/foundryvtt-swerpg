import { Page } from '@playwright/test'
import { dismissOverlayIfPresent } from '../helper/overlay'

/**
 * Helpers pour interactions UI Foundry récurrentes dans les tests E2E.
 * Factorise les patterns communs pour éviter duplication dans les specs.
 */

/**
 * Vérifie que la session Foundry est toujours active.
 * Lance une erreur explicite si la page a été redirigée vers /join ou /auth.
 *
 * @param page - Page Playwright
 * @throws {Error} Si la session est perdue ou inactive
 */
export async function ensureSessionActive(page: Page): Promise<void> {
  const currentUrl = page.url()

  if (currentUrl.includes('/join') || currentUrl.includes('/auth') || currentUrl.includes('/setup')) {
    throw new Error(`Session lost: redirected to ${currentUrl}. This may indicate a session timeout or cookies issue.`)
  }

  // Vérifier qu'un élément critique de /game est présent
  try {
    const sidebar = page.locator('#sidebar')
    await sidebar.waitFor({ state: 'attached', timeout: 3000 })
  } catch {
    throw new Error(`Session check failed: sidebar not found. Current URL: ${currentUrl}`)
  }
}

/**
 * Ouvre l'onglet Game Settings dans la sidebar.
 *
 * Foundry VTT v14 a redessiné la sidebar : les onglets sont des icônes sans libellé
 * visible (collapsed par défaut) et utilisent l'attribut data-tab plutôt que des
 * rôles ARIA explicites. On essaie plusieurs sélecteurs pour la compatibilité v13/v14.
 *
 * @param page - Page Playwright
 */
export async function openGameSettings(page: Page): Promise<void> {
  await ensureSessionActive(page)
  await dismissOverlayIfPresent(page)

  // Foundry v14 : onglet sidebar = <button role="tab" data-tab="settings" data-action="tab">
  // Utiliser [role="tab"][data-tab="settings"] pour cibler le bouton NAV (pas la section contenu)
  // Fallback v13 : role="tab" avec libellé "Game Settings"
  const settingsTab = page
    .locator('[role="tab"][data-tab="settings"]')
    .or(page.locator('[data-action="tab"][data-tab="settings"]'))
    .or(page.getByRole('tab', { name: /Game Settings/i }))
    .or(page.getByRole('tab', { name: /^Settings$/i }))
    .first()

  await settingsTab.waitFor({ state: 'visible', timeout: 10000 })
  await settingsTab.click()

  // Foundry v14 : le bouton s'appelle "Game Settings" (SIDEBAR.SETTINGS.ACTIONS.Configure)
  // Foundry v13 : le bouton s'appelait "Configure Settings"
  const configureBtn = page
    .getByRole('button', { name: /^Game Settings$/i })
    .or(page.getByRole('button', { name: /Configure Settings/i }))
    .first()
  await configureBtn.waitFor({ state: 'visible', timeout: 10000 })
}

/**
 * Navigue vers les settings d'un système spécifique depuis Game Settings.
 * Présuppose que Game Settings est déjà ouvert.
 *
 * @param page - Page Playwright
 * @param systemName - Nom du système (ex: "Star Wars Edge RPG")
 */
export async function openSystemSettings(page: Page, systemName: string): Promise<void> {
  await ensureSessionActive(page)
  await dismissOverlayIfPresent(page)

  // Ouvrir Configure Settings (v13) / Game Settings (v14)
  const configureButton = page
    .getByRole('button', { name: /^Game Settings$/i })
    .or(page.getByRole('button', { name: /Configure Settings/i }))
    .first()
  await configureButton.waitFor({ state: 'visible', timeout: 10000 })
  await configureButton.click()

  await ensureSessionActive(page)

  // Attendre que le dialogue des settings soit visible (en attendant qu'un bouton système apparaisse)
  const systemButton = page.getByRole('button', { name: new RegExp(systemName, 'i') })
  await systemButton.waitFor({ state: 'visible', timeout: 10000 })
  await systemButton.click()

  await ensureSessionActive(page)

  // Attendre que la page de settings système soit chargée (en vérifiant qu'un heading ou section est visible)
  // On attend simplement un délai pour que l'UI se stabilise
  await page.locator('section, .tab.active').first().waitFor({ state: 'visible', timeout: 5000 })
}

/**
 * Workflow complet : ouvre Game Settings puis navigue vers les settings système.
 *
 * @param page - Page Playwright
 * @param systemName - Nom du système (ex: "Star Wars Edge RPG")
 */
export async function navigateToSystemSettings(page: Page, systemName: string): Promise<void> {
  await openGameSettings(page)
  await openSystemSettings(page, systemName)
}
