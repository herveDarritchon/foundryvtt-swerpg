import { expect, test as base } from '@playwright/test'
import { accepteLicense, enterGameAsGamemaster, enterWorld, FoundrySessionOptions, loginIntoInstance } from '../utils/foundrySession'
import { dismissOverlayIfPresent } from '../helper/overlay'
import { createBrowserErrorCollector } from '../utils/browserErrors'

/**
 * Fixtures pour la suite smoke prod.
 *
 * La fixture `smokeReady` navigue jusqu'à /game en lecture seule.
 * Aucune création, édition, suppression ou import n'est effectuée.
 *
 * Utiliser `E2E_FOUNDRY_WORLD` pour cibler le monde de production standant.
 * Si la variable est absente, la fixture s'arrête après /setup sans entrer dans un monde.
 */

export const test = base.extend<{ smokeReady: void }>({
  smokeReady: [
    async ({ page }, use) => {
      const options: FoundrySessionOptions = {
        baseURL: process.env.E2E_FOUNDRY_BASE_URL ?? 'http://localhost:30000',
        adminPassword: process.env.E2E_FOUNDRY_ADMIN_PASSWORD ?? '',
        username: process.env.E2E_FOUNDRY_USERNAME ?? 'Gamemaster',
        password: process.env.E2E_FOUNDRY_PASSWORD ?? '',
        world: process.env.E2E_FOUNDRY_WORLD ?? '',
      }

      // Brancher la capture d'erreurs navigateur avant le setUp pour ne rien rater
      const errorCollector = createBrowserErrorCollector(page)

      await setUpSmoke(page, options)

      // Réinitialiser les erreurs captées pendant le setUp (navigation, redirections)
      // pour ne cibler que les erreurs liées au scénario de test lui-même
      errorCollector.reset()

      await use()

      // Vérifier qu'aucune erreur navigateur inattendue n'a été collectée pendant le test
      // Smoke : ne pas faire échouer sur les erreurs non critiques connues de l'env de prod
      if (options.world && page.url().includes('/game')) {
        errorCollector.assertNoErrors('fin du scénario smokeReady')
      }

      // Smoke prod : pas de tearDown destructif — retour soft à /setup seulement
      await tearDownSmoke(page, options)
    },
    { auto: true },
  ],
})

export { expect }

/**
 * Navigation légère jusqu'à /game pour les smoke tests.
 * Gère /license → /auth → /setup → /join → /game.
 * Ne crée ni ne supprime aucune donnée.
 */
async function setUpSmoke(page: import('@playwright/test').Page, options: FoundrySessionOptions): Promise<void> {
  let url = page.url()

  if (url.includes('about:blank')) {
    await page.goto(`${options.baseURL}/auth`, { waitUntil: 'domcontentloaded' })
    url = page.url()
  }

  if (url.includes('/game')) {
    return
  }

  if (url.includes('/license')) {
    url = await accepteLicense(page, options)
  }

  if (url.includes('/auth')) {
    url = await loginIntoInstance(page, options)
  }

  if (url.includes('/setup') && options.world) {
    url = await enterWorld(page, options)
  }

  if (url.includes('/join') && options.world) {
    await dismissOverlayIfPresent(page)
    url = await enterGameAsGamemaster(page, options)
  }

  if (options.world && !url.includes('/game')) {
    throw new Error(`[smokeSetUp] Expected /game but got ${url}`)
  }
}

/**
 * Retour doux à /setup sans fermer le monde via shutDown().
 * Les smoke tests ne doivent pas altérer l'état de l'instance de production.
 */
async function tearDownSmoke(page: import('@playwright/test').Page, options: FoundrySessionOptions): Promise<void> {
  try {
    const url = page.url()
    if (!url.includes('/setup') && !url.includes('/auth')) {
      await page.goto(`${options.baseURL}/setup`, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {})
    }
  } catch {
    // Cleanup best-effort : ne pas faire échouer le test
  }
}
