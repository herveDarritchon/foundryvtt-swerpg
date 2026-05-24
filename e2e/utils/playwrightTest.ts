import { Page } from '@playwright/test'
import { accepteLicense, enterGameAsGamemaster, enterWorld, FoundrySessionOptions, loginIntoInstance } from './foundrySession'

/**
 * Configuration de l'environnement de test : navigation complète jusqu'au monde Swerpg chargé.
 * Gère automatiquement les étapes /license → /auth → /setup → /join → /game.
 *
 * Inclut une récupération automatique si une session Gamemaster active est détectée sur /join
 * (session persistante d'une exécution précédente) : ferme le monde via "Return to Setup"
 * et relance l'entrée dans le monde.
 *
 * @throws {Error} Si le monde ne peut pas être chargé (fail-fast)
 */
export async function setUp(page: Page, options: FoundrySessionOptions) {
  let url = page.url()
  console.log(`[setUp] URL initiale: ${url}`)

  if (url.includes('about:blank')) {
    await page.goto(`${options.baseURL}/auth`, { waitUntil: 'domcontentloaded' })
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

  // Sur /join : vérifier si le Gamemaster est désactivé (session persistante)
  // Si oui, fermer le monde via "Return to Setup" et relancer l'entrée
  if (url.includes('/join')) {
    const gmDisabled = await isGamemasterOptionDisabled(page, options.username)
    if (gmDisabled) {
      console.warn(`[setUp] Option "${options.username}" désactivée sur /join — tentative de fermeture du monde (session persistante)`)
      await returnToSetupFromJoin(page, options)
      url = page.url()
      if (url.includes('/setup')) {
        url = await enterWorld(page, options)
      }
    }
  }

  if (url.includes('/join')) {
    url = await enterGameAsGamemaster(page, options)
  }

  // Après entrée en jeu, Foundry peut afficher un dialogue de conflit de session :
  // "There is one other User currently active in this World and will be disconnected."
  // Ce dialogue apparaît quand une session précédente est encore active (heartbeat en cours).
  // On le résout en cliquant "Yes" pour déconnecter la session précédente.
  await dismissSessionConflictIfPresent(page)

  // Validation post-setUp : s'assurer que nous sommes bien en /game
  const finalUrl = page.url()

  if (!finalUrl.includes('/game')) {
    throw new Error(`setUp failed: expected to be on /game but got ${finalUrl}`)
  }

  console.log('[setUp] 🛠️ Setup réussi ✔')
}

/**
 * Dismisses the "session conflict" confirmation dialog if it appears after joining the game.
 * Foundry shows this dialog when another session for the same user is detected:
 * "There is one other User currently active in this World and will be disconnected. Do you wish to proceed?"
 */
async function dismissSessionConflictIfPresent(page: Page): Promise<void> {
  const conflictText = page.getByText(/currently active in this World/i)
  const appeared = await conflictText.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)
  if (appeared) {
    const yesBtn = page.getByRole('button', { name: /^Yes$/i })
    await yesBtn.click().catch(() => {})
    console.log('[setUp] Dialogue conflit session résolu — session précédente déconnectée ✔')
  }
}

/**
 * Vérifie si l'option Gamemaster est désactivée dans le select de /join.
 * Retourne true immédiatement sans attendre (contrairement à enterGameAsGamemaster).
 */
async function isGamemasterOptionDisabled(page: Page, username: string): Promise<boolean> {
  try {
    return await page.evaluate((name: string) => {
      const select = document.querySelector('select[name="userid"]') as HTMLSelectElement | null
      if (!select) return false
      const option = Array.from(select.options).find((o) => o.text.trim() === name)
      return option !== undefined && option.disabled
    }, username)
  } catch {
    return false
  }
}

/**
 * Cleanup après exécution d'un test E2E.
 *
 * Stratégie 1 (préférée) : si on est en /game, utiliser l'API JS Foundry pour déclencher
 * un "Return to Setup" proprement (ferme le monde, déconnecte tous les users).
 *
 * Stratégie 2 (fallback) : re-auth admin → /join → bouton "Return to Setup" + confirmation.
 *
 * Important : naviguer directement vers /setup ne ferme pas le monde.
 * game.shutDown() ou le bouton "Return to Setup" depuis /game sont les seules méthodes
 * qui ferment proprement le monde et libèrent les sessions Gamemaster.
 */
export async function tearDown(page: Page, options: FoundrySessionOptions) {
  const fromUrl = page.url()
  try {
    if (fromUrl.includes('/game')) {
      // Stratégie 1 : utiliser l'API Foundry directement depuis /game
      // game.shutDown() ferme proprement le monde (équivalent au bouton "Return to Setup" in-game)
      await page
        .evaluate(() => {
          if (typeof game !== 'undefined' && (game as { shutDown?: () => void }).shutDown) {
            ;(game as { shutDown: () => void }).shutDown()
          }
        })
        .catch(() => {})

      // Attendre la redirection vers /join ou /setup
      await page.waitForURL(/\/(join|setup|auth)/, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
      console.log(`[tearDown] game.shutDown() exécuté — page: ${page.url()}`)
    } else {
      // Stratégie 2 (fallback) : re-auth admin → /join → Return to Setup
      await page.goto(`${options.baseURL}/auth`, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {})

      if (page.url().includes('/auth')) {
        await page.getByPlaceholder('Administrator Password').fill(options.adminPassword).catch(() => {})
        await page.getByRole('button', { name: /log in/i }).click().catch(() => {})
        await page.waitForURL('**/setup', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {})
      }

      if (page.url().includes('/setup')) {
        await page.goto(`${options.baseURL}/join`, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {})
      }

      if (page.url().includes('/join')) {
        await returnToSetupFromJoin(page, options)
      }
    }
  } catch (error) {
    console.warn(`[tearDown] Erreur lors du cleanup (depuis: ${fromUrl}):`, error)
  }
  console.log(`On finit sur la page ${page.url()}`)
  console.log('[tearDown] 🧹 tearDown réussi ✔')
}

/**
 * Ferme le monde actif depuis la page /join en utilisant le bouton "Return to Setup".
 * Cette action envoie une commande admin au serveur Foundry pour décharger le monde
 * et libérer toutes les sessions utilisateur actives.
 *
 * Prérequis : être authentifié comme admin (via /auth) avant d'appeler cette fonction.
 */
async function returnToSetupFromJoin(page: Page, options: FoundrySessionOptions): Promise<void> {
  try {
    const returnBtn = page.getByRole('button', { name: /Return to Setup/i })

    // Attendre brièvement que le DOM soit stable
    await returnBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})

    if ((await returnBtn.count()) === 0) {
      console.warn('[returnToSetupFromJoin] Bouton "Return to Setup" introuvable')
      return
    }

    // Chercher le champ mot de passe admin dans le même conteneur que le bouton
    // (distinctif du champ "Password" du formulaire Join Game Session)
    const returnToSetupContainer = page.locator('article, section, div, form').filter({
      has: page.getByRole('button', { name: /Return to Setup/i }),
    })
    const adminPasswordInput = returnToSetupContainer.locator('input[type="password"]').first()

    if ((await adminPasswordInput.count()) > 0) {
      await adminPasswordInput.fill(options.adminPassword).catch(() => {})
    }

    await returnBtn.click()

    // Foundry peut afficher une dialogue de confirmation :
    // "There is one other User currently active... Do you wish to proceed? Yes/No"
    // Si ce dialogue apparaît, cliquer "Yes" pour confirmer la fermeture du monde.
    const yesBtn = page.getByRole('button', { name: /^Yes$/i })
    await yesBtn.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {})
    if ((await yesBtn.count()) > 0) {
      await yesBtn.click()
      console.log('[returnToSetupFromJoin] Dialogue de confirmation confirmé (Yes) ✔')
    }

    await page.waitForURL('**/setup', { waitUntil: 'domcontentloaded', timeout: 15000 })
    console.log('[returnToSetupFromJoin] Monde fermé via "Return to Setup" ✔')
  } catch (error) {
    console.warn('[returnToSetupFromJoin] Échec:', error)
  }
}
