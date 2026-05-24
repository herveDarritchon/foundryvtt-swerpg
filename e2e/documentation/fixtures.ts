import { expect, test as base } from '@playwright/test'
import { accepteLicense, enterGameAsGamemaster, enterWorld, FoundrySessionOptions, loginIntoInstance } from '../utils/foundrySession'
import { dismissOverlayIfPresent } from '../helper/overlay'
import { createBrowserErrorCollector } from '../utils/browserErrors'

/**
 * Fixtures pour la suite e2e:documentation.
 *
 * La fixture `documentationReady` navigue jusqu'à /game.
 * Elle est en lecture seule par défaut.
 * Les specs qui créent des prérequis contrôlés pour produire des états documentés stables
 * doivent le mentionner explicitement dans leur description et assurer leur propre cleanup.
 *
 * Brancher `documentationReady` dans chaque spec documentation :
 *   import { test, expect } from '../fixtures'
 *   test('titre de la spec', async ({ page, documentationReady }) => { ... })
 */

export const test = base.extend<{ documentationReady: void }>({
  documentationReady: [
    async ({ page }, use) => {
      const options: FoundrySessionOptions = {
        baseURL: process.env.E2E_FOUNDRY_BASE_URL ?? 'http://localhost:30000',
        adminPassword: process.env.E2E_FOUNDRY_ADMIN_PASSWORD ?? '',
        username: process.env.E2E_FOUNDRY_USERNAME ?? 'Gamemaster',
        password: process.env.E2E_FOUNDRY_PASSWORD ?? '',
        world: process.env.E2E_FOUNDRY_WORLD ?? '',
      }

      // Brancher la capture d'erreurs navigateur avant le setUp
      const errorCollector = createBrowserErrorCollector(page)

      await setUpDocumentation(page, options)

      // Réinitialiser les erreurs captées pendant le setUp (navigation, redirections)
      errorCollector.reset()

      await use()

      // Vérifier qu'aucune erreur navigateur inattendue n'a été collectée pendant le test
      if (options.world && page.url().includes('/game')) {
        errorCollector.assertNoErrors('fin du scénario documentationReady')
      }

      // Documentation : retour soft à /setup — ne pas altérer l'état de l'instance
      await tearDownDocumentation(page, options)
    },
    { auto: true },
  ],
})

export { expect }

/**
 * Navigation jusqu'à /game pour les specs documentation.
 * Gère /license → /auth → /setup → /join → /game.
 * Ne crée ni ne supprime aucune donnée (sauf si la spec en décide autrement).
 */
async function setUpDocumentation(page: import('@playwright/test').Page, options: FoundrySessionOptions): Promise<void> {
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
    throw new Error(`[documentationSetUp] Expected /game but got ${url}`)
  }
}

/**
 * Retour doux à /setup sans fermer le monde.
 * La suite documentation ne doit pas altérer l'état de l'instance.
 */
async function tearDownDocumentation(page: import('@playwright/test').Page, options: FoundrySessionOptions): Promise<void> {
  try {
    const url = page.url()
    if (!url.includes('/setup') && !url.includes('/auth')) {
      await page.goto(`${options.baseURL}/setup`, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {})
    }
  } catch {
    // Cleanup best-effort : ne pas faire échouer le test
  }
}
