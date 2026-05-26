import { Page } from '@playwright/test'
import { dismissOverlayIfPresent } from '../../helper/overlay'

/**
 * Contrat du monde documentaire déterministe
 *
 * La suite `e2e:documentation` repose sur un monde stable nommé `documentation-world`
 * (configurable via `E2E_FOUNDRY_WORLD`). Ce monde est distinct du monde de régression
 * (`Swerpg-Regression-World`) et du monde de production `test-v14-309`.
 *
 * Règles d'usage :
 * 1. Le monde documentaire est en LECTURE SEULE par défaut.
 * 2. Si une spec crée un prérequis contrôlé (ex. personnage pré-configuré pour une capture),
 *    elle doit le déclarer dans sa description et assurer son propre cleanup.
 * 3. Les noms d'artefacts éphémères documentaires utilisent le préfixe `Doc-` + horodatage
 *    (ex. `Doc-Perso-${Date.now()}`).
 * 4. Ce helper ne gère pas la création ni la suppression du monde lui-même :
 *    le monde doit être dans un état stable avant le lancement de la suite.
 *
 * Reset visuel minimal requis avant capture :
 * - Fermeture des overlays/notifications Foundry (tours, popups de partage d'usage).
 * - Fermeture de toutes les fenêtres d'application ouvertes (fiches, dialogs).
 * - Aucun nettoyage de données persistées (lecture seule).
 *
 * Frontière documentation vs régression :
 * - Régression : mutations autorisées, artefacts éphémères, cleanup ciblé par spec.
 * - Documentation : lecture seule, état stable représentatif, reset visuel uniquement.
 */

export interface DocumentationWorldOptions {
  baseURL: string
  adminPassword: string
  world: string
}

/**
 * Prépare l'état documentaire avant une capture.
 *
 * Effectue le reset visuel minimal nécessaire à des captures stables et reproductibles :
 * - ferme les overlays et notifications actives ;
 * - ferme toutes les applications ouvertes (fiches, dialogs) ;
 * - désactive les animations CSS pour des captures instantanées stables.
 *
 * Ne crée, ne modifie et ne supprime aucune donnée persistée.
 *
 * Pré-requis : être sur `/game` avec le monde documentaire actif.
 *
 * @param page - Page Playwright en cours
 */
export async function prepareDocumentationState(page: Page): Promise<void> {
  await dismissOverlayIfPresent(page)
  await closeAllOpenApplications(page)
  await disableAnimations(page)
}

/**
 * Ferme toutes les applications Foundry ouvertes (fiches, dialogs, popups).
 *
 * Utilise `game.closeAll()` via evaluate si disponible, puis ferme les éléments
 * DOM résiduels par sélecteur pour s'assurer que l'espace de jeu est vide.
 *
 * Ne lève pas d'erreur si aucune application n'est ouverte.
 *
 * @param page - Page Playwright en cours
 */
export async function closeAllOpenApplications(page: Page): Promise<void> {
  try {
    // Foundry v14 : game.closeAll() ferme toutes les ApplicationV2 ouvertes
    await page.evaluate(() => {
      if (typeof game !== 'undefined' && typeof (game as { closeAll?: () => void }).closeAll === 'function') {
        ;(game as { closeAll: () => void }).closeAll()
      }
    })

    // Attendre que les animations de fermeture se terminent
    await page.waitForTimeout(300)

    // Fermer les éventuels résidus DOM (dialogs, windows Foundry non gérées par game.closeAll)
    await page.evaluate(() => {
      const selectors = ['.application.sheet', 'dialog[open]', '.app.window-app', '.notification-ui', '.notification']
      selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
          if (el instanceof HTMLElement && el.isConnected) {
            // Tenter une fermeture douce avant de retirer du DOM
            const closeBtn = el.querySelector('[data-action="close"], .header-button.close, .window-header .close') as HTMLElement | null
            if (closeBtn) {
              closeBtn.click()
            }
          }
        })
      })
    })

    await page.waitForTimeout(200)
  } catch {
    // Best-effort : ne pas faire échouer la préparation si la fermeture partielle est impossible
  }
}

/**
 * Désactive les animations CSS et les transitions sur la page.
 *
 * Cette opération garantit que les captures Playwright ne sont jamais prises
 * pendant une animation en cours (fade-in, slide, etc.), ce qui produirait des
 * artefacts visuels non reproductibles.
 *
 * L'effet est local à la page courante et disparaît à la navigation suivante.
 *
 * @param page - Page Playwright en cours
 */
export { dismissOverlayIfPresent } from '../../helper/overlay'

export async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  })
}

/**
 * Navigue vers une URL relative au baseURL documentaire et attend la stabilisation.
 *
 * Pré-requis : être sur `/game` avec le monde documentaire actif.
 * Ne crée ni ne modifie aucune donnée.
 *
 * @param page - Page Playwright en cours
 * @param baseURL - URL de base de l'instance Foundry
 * @param relativePath - Chemin relatif (ex: `/game`)
 */
export async function navigateDocumentation(page: Page, baseURL: string, relativePath: string): Promise<void> {
  const targetURL = `${baseURL}${relativePath}`
  await page.goto(targetURL, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await dismissOverlayIfPresent(page)
}

/**
 * Vérifie que le monde documentaire est actif et dans un état stable.
 *
 * Contrôle les invariants de base :
 * - l'URL inclut `/game` ;
 * - la sidebar est visible ;
 * - aucune erreur critique visible dans le DOM.
 *
 * Lève une erreur explicite si l'état n'est pas conforme.
 *
 * @param page - Page Playwright en cours
 * @param options - Options du monde documentaire (pour le message d'erreur)
 * @throws {Error} Si le monde documentaire n'est pas dans un état stable
 */
export async function assertDocumentationWorldReady(page: Page, options: Pick<DocumentationWorldOptions, 'world'>): Promise<void> {
  const currentURL = page.url()

  if (!currentURL.includes('/game')) {
    throw new Error(
      `[documentationWorldManager] Le monde documentaire "${options.world}" n'est pas actif.\n` +
        `  URL actuelle : ${currentURL}\n` +
        `  → Vérifier que le monde "${options.world}" est accessible et configuré dans E2E_FOUNDRY_WORLD.`,
    )
  }

  const sidebar = page.locator('#sidebar')
  const sidebarVisible = await sidebar
    .waitFor({ state: 'visible', timeout: 15000 })
    .then(() => true)
    .catch(() => false)

  if (!sidebarVisible) {
    throw new Error(`[documentationWorldManager] Sidebar non visible sur ${currentURL}.\n` + `  → L'interface Foundry n'est peut-être pas entièrement chargée.`)
  }
}
