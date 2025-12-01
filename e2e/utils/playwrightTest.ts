import {Page} from "@playwright/test";
import {
    accepteLicense,
    enterGameAsGamemaster,
    enterWorld,
    FoundrySessionOptions,
    loginIntoInstance,
    logout,
    logoutFromInstance,
    quitWorld
} from "./foundrySession";

/**
 * Configuration de l'environnement de test : navigation complète jusqu'au monde Swerpg chargé.
 * Gère automatiquement les étapes /license → /auth → /setup → /join → /game.
 *
 * @throws {Error} Si le monde ne peut pas être chargé (fail-fast)
 */
export async function setUp(
    page: Page,
    options: FoundrySessionOptions) {
    let url = page.url()
    console.log(`[setUp] URL initiale: ${url}`)

    if (url.includes('about:blank')) {
        await page.goto(`${options.baseURL}/auth`, {waitUntil: 'domcontentloaded'})
        url = page.url()
    }

    if (url.includes('/game')) {
        console.log('[setUp] Déjà en /game, rien à faire')
        return
    }

    if (url.includes('/license')) {
        url = await accepteLicense(page, options)
    }

    if (url.includes('/auth')) {
        url = await loginIntoInstance(page, options)
    }

    if (url.includes('/setup')) {
        url = await enterWorld(page, options)
    }

    if (url.includes('/join')) {
        url = await enterGameAsGamemaster(page, options)
    }

    // Validation post-setUp : s'assurer que nous sommes bien en /game
    const finalUrl = page.url()

    if (!finalUrl.includes('/game')) {
        throw new Error(`setUp failed: expected to be on /game but got ${finalUrl}`)
    }

    console.log('[setUp] 🛠️ Setup réussi ✔')
}

/**
 * Cleanup après exécution d'un test E2E.
 * Stratégie simplifiée : retour à /join pour permettre au prochain test de démarrer proprement.
 *
 * Note : La logique complète de cleanup (logout → quitWorld → logoutFromInstance)
 * est intentionnellement désactivée car :
 * - Elle ralentit significativement l'exécution des tests (plusieurs secondes par test)
 * - Le retour à /join est suffisant : setUp gère tous les états initiaux possibles
 * - Les tests s'exécutent en séquence (workers: 1) sur la même instance Foundry
 *
 * Si un cleanup complet est nécessaire (ex: CI avec état instable), décommenter
 * la logique ci-dessous et ajuster les timeouts en conséquence.
 */
export async function tearDown(
    page: Page,
    options: FoundrySessionOptions) {
    const url = page.url()
    try {
        // Retour simple à /join : point d'entrée stable pour le prochain test
        await page.goto(`${options.baseURL}/join`, {
            waitUntil: 'domcontentloaded',
            timeout: 10000
        }).catch((error) => {
            console.warn(`[tearDown] Navigation vers /join échouée à partir de ${url}, ignoré pour ne pas faire échouer le test:`, error.message)
        })
    } catch (error) {
        console.warn(`[tearDown] Erreur lors du cleanup, ignoré (page en cours ${url}):`, error)
    }
    console.log (`On finit sur la page ${page.url()}`)
    console.log('[tearDown] 🧹 tearDown réussi ✔')
}
