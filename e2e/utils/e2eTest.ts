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
import {waitForGameUIReady} from "./foundryUI";

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
        console.log('[setUp] Navigation vers /auth')
        await page.goto(`${options.baseURL}/auth`, {waitUntil: 'domcontentloaded'})
        url = page.url()
        console.log(`[setUp] Après navigation: ${url}`)
    }

    if (url.includes('/game')) {
        console.log('[setUp] Déjà en /game, rien à faire')
        return
    }

    if (url.includes('/license')) {
        console.log('[setUp] Acceptation de la licence')
        url = await accepteLicense(page, options)
        console.log(`[setUp] Après licence: ${url}`)
    }

    if (url.includes('/auth')) {
        console.log('[setUp] Login administrateur')
        url = await loginIntoInstance(page, options)
        console.log(`[setUp] Après login: ${url}`)
    }

    if (url.includes('/setup')) {
        console.log('[setUp] Lancement du monde')
        url = await enterWorld(page, options)
        console.log(`[setUp] Après enterWorld: ${url}`)
    }

    if (url.includes('/join')) {
        console.log('[setUp] Join en tant que MJ')
        url = await enterGameAsGamemaster(page, options)
        console.log(`[setUp] Après join: ${url}`)
    }

    // Validation post-setUp : s'assurer que nous sommes bien en /game
    const finalUrl = page.url()
    console.log(`[setUp] URL finale: ${finalUrl}`)
    if (!finalUrl.includes('/game')) {
        throw new Error(`setUp failed: expected to be on /game but got ${finalUrl}`)
    }

    console.log('[setUp] Attente de la readiness de Foundry (game.ready + #sidebar)...')
    await waitForGameUIReady(page,'#sidebar')
    console.log('[setUp] Foundry ready, UI chargée')

    console.log('[setUp] ✅ Setup réussi')
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
    console.log('[tearDown] ✅ tearDown réussi.')
}
