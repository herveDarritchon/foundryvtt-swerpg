import {Page} from '@playwright/test'
import {dismissOverlayIfPresent} from "../helper/overlay";

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

    if (currentUrl.includes('/join') || currentUrl.includes('/auth')) {
        throw new Error(`Session lost: redirected to ${currentUrl}. This may indicate a session timeout or cookies issue.`)
    }

    // Vérifier qu'un élément critique de /game est présent
    try {
        const sidebar = page.locator('#sidebar')
        await sidebar.waitFor({state: 'attached', timeout: 3000})
    } catch {
        throw new Error(`Session check failed: sidebar not found. Current URL: ${currentUrl}`)
    }
}

/**
 * Ouvre l'onglet Game Settings dans la sidebar.
 * Gère automatiquement le clic et attend que l'onglet soit actif.
 *
 * @param page - Page Playwright
 */
export async function openGameSettings(page: Page): Promise<void> {
    await ensureSessionActive(page)
    await dismissOverlayIfPresent(page)

    const gameSettingsTab = page.getByRole('tab', { name: /Game Settings/i })
    await gameSettingsTab.waitFor({state: 'visible', timeout: 10000})
    await gameSettingsTab.click()

    // Attendre que le contenu de Game Settings soit chargé (bouton Configure Settings visible)
    await page.getByRole('button', { name: /Configure Settings/i }).waitFor({state: 'visible', timeout: 10000})
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


    // Ouvrir Configure Settings
    const configureButton = page.getByRole('button', { name: /Configure Settings/i })
    await configureButton.waitFor({state: 'visible', timeout: 10000})
    await configureButton.click()

    await ensureSessionActive(page)

    // Attendre que le dialogue des settings soit visible (en attendant qu'un bouton système apparaisse)
    const systemButton = page.getByRole('button', { name: new RegExp(systemName, 'i') })
    await systemButton.waitFor({state: 'visible', timeout: 10000})
    await systemButton.click()

    await ensureSessionActive(page)

    // Attendre que la page de settings système soit chargée (en vérifiant qu'un heading ou section est visible)
    // On attend simplement un délai pour que l'UI se stabilise
    await page.locator('section, .tab.active').first().waitFor({state: 'visible', timeout: 5000})
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

