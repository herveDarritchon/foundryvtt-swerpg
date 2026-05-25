import { Page } from '@playwright/test'
import { accepteLicense, loginIntoInstance } from '../../utils/foundrySession'
import { dismissShareUsageDataIfPresent, dismissTourIfPresent } from '../../helper/overlay'

export interface WorldManagerOptions {
  baseURL: string
  adminPassword: string
  world: string
}

// ---------------------------------------------------------------------------
// Contrat d'hygiène Tier 1
// ---------------------------------------------------------------------------
//
// Stratégie retenue : cleanup ciblé par spec (pas de recréation du monde).
//
// Règles opérationnelles :
// 1. Chaque spec crée ses artefacts avec un nom unique horodaté (ex. `Test-${Date.now()}`).
// 2. Chaque spec supprime ses propres artefacts en afterEach via `deleteActorByName`.
// 3. Le bootstrap `globalSetup` est idempotent : monde absent → création, monde présent → validation.
// 4. En cas d'artefacts résiduels, `cleanupTestActors` permet un nettoyage ciblé par préfixe.
//
// Données minimales requises par domaine :
// - smoke (01) : monde actif, système swerpg chargé, sidebar visible.
// - OggDude import (02) : monde actif, settings système accessibles.
// - création personnage (03) : monde actif, aucun acteur préexistant requis.
// - dépense XP / arbre (04) : monde actif, aucun acteur préexistant requis.
//
// Frontière données communes vs artefacts éphémères :
// - données communes de baseline : le monde lui-même (`Swerpg-Regression-World`), système swerpg.
// - artefacts éphémères de scénario : acteurs créés par les specs 03 et 04 (nommés `Test-*`).
// ---------------------------------------------------------------------------

/**
 * Navigue vers /setup en gérant toutes les pages intermédiaires :
 * /license → /auth → /setup (ou /join si monde déjà actif → Return to Setup).
 * Dismiss les overlays de tour après chaque navigation.
 */
export async function navigateToSetup(page: Page, options: WorldManagerOptions): Promise<void> {
  await page.goto(`${options.baseURL}/auth`, { waitUntil: 'domcontentloaded', timeout: 30000 })

  let url = page.url()
  console.log(`[worldManager] URL initiale: ${url}`)

  if (url.includes('/license')) {
    await accepteLicense(page, { ...options, username: 'Gamemaster', password: '' })
    url = page.url()
  }

  if (url.includes('/auth')) {
    await loginIntoInstance(page, { ...options, username: 'Gamemaster', password: '' })
    url = page.url()
  }

  // Si un monde est déjà actif (/join ou /game), revenir au setup
  if (url.includes('/join')) {
    await returnToSetupFromJoin(page, options)
    url = page.url()
  }

  if (url.includes('/game')) {
    await returnToSetupFromGame(page, options)
    url = page.url()
  }

  if (!url.includes('/setup')) {
    throw new Error(`[worldManager] navigateToSetup failed: stuck on ${url}`)
  }

  // Attendre que la liste des mondes soit prête, puis dismiss les overlays
  await page.locator('#world-filter').waitFor({ state: 'visible', timeout: 15000 })
  await dismissShareUsageDataIfPresent(page)
  await dismissTourIfPresent(page)
  // Cleanup résiduel du DOM (au cas où le dismiss partiel laisserait l'overlay)
  await page.evaluate(() => document.querySelectorAll('.tour-overlay, .tour-container').forEach((el) => el.remove()))

  console.log('[worldManager] Sur /setup ✔')
}

/**
 * Vérifie si le monde cible existe dans la liste de /setup.
 * Prérequis : être sur /setup avec #world-filter visible.
 */
export async function worldExists(page: Page, worldName: string): Promise<boolean> {
  const worldFilter = page.locator('#world-filter')
  await worldFilter.waitFor({ state: 'visible', timeout: 10000 })
  await worldFilter.clear()
  await worldFilter.fill(worldName)

  // Laisser le filtre se stabiliser
  await page.waitForTimeout(800)

  const worldItem = page.locator('li.package.world').filter({ hasText: worldName }).first()
  const exists = await worldItem.isVisible({ timeout: 3000 }).catch(() => false)

  await worldFilter.clear()
  return exists
}

/**
 * Crée le monde via l'UI de /setup (Foundry v14).
 *
 * En Foundry v14, "Create World" ouvre un formulaire inline dans la page
 * (section.application.standard-form[data-application-part="config"]).
 * Le bouton de validation est `button[type="submit"]` avec le texte "Continue".
 *
 * Prérequis : être sur /setup, tour-overlay déjà dismiss.
 */
export async function createWorld(page: Page, options: WorldManagerOptions): Promise<void> {
  console.log(`[worldManager] Création du monde "${options.world}"...`)

  // Cliquer sur le bouton "Create World" de la liste
  const createBtn = page.getByRole('button', { name: /Create World/i })
  await createBtn.waitFor({ state: 'visible', timeout: 10000 })
  await createBtn.click()

  // En Foundry v14, le formulaire de création est inline (pas un dialog flottant).
  // Attendre l'apparition du champ "title".
  const titleInput = page.locator('input[name="title"]')
  await titleInput.waitFor({ state: 'visible', timeout: 10000 })

  // Remplir le titre
  await titleInput.clear()
  await titleInput.fill(options.world)

  // L'ID monde est auto-généré depuis le titre — laisser Foundry le calculer
  await page.waitForTimeout(500)

  // Sélectionner le système swerpg
  const systemSelect = page.locator('select[name="system"]')
  await systemSelect.waitFor({ state: 'visible', timeout: 10000 })
  await systemSelect.selectOption('swerpg')

  // Soumettre via le bouton "Continue" (button[type="submit"])
  const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /Continue/i })
  await submitBtn.waitFor({ state: 'visible', timeout: 10000 })
  await submitBtn.click()

  // En Foundry v14, "Continue" crée le monde ET l'active immédiatement :
  // la navigation passe par /players → /join (monde actif).
  // On attend la fin de navigation, puis on revient à /setup pour vérification.
  await page.waitForURL(/\/(setup|players|join|game)/, { waitUntil: 'domcontentloaded', timeout: 30000 })

  const afterCreate = page.url()
  console.log(`[worldManager] URL après création: ${afterCreate}`)

  if (afterCreate.includes('/join') || afterCreate.includes('/players')) {
    await returnToSetupFromJoin(page, options)
  } else if (afterCreate.includes('/game')) {
    await returnToSetupFromGame(page, options)
  }

  // Vérifier que #world-filter est disponible (on est sur /setup)
  await page.locator('#world-filter').waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForTimeout(500)

  const created = await worldExists(page, options.world)
  if (!created) {
    throw new Error(`[worldManager] Monde "${options.world}" introuvable après création`)
  }

  console.log(`[worldManager] Monde "${options.world}" créé ✔`)
}

/**
 * Crée le monde s'il n'existe pas. Idempotent.
 */
export async function ensureWorldExists(page: Page, options: WorldManagerOptions): Promise<void> {
  await navigateToSetup(page, options)

  if (await worldExists(page, options.world)) {
    console.log(`[worldManager] Monde "${options.world}" déjà présent ✔`)
    return
  }

  await createWorld(page, options)
}

// ---------------------------------------------------------------------------
// Helpers internes
// ---------------------------------------------------------------------------

async function returnToSetupFromJoin(page: Page, options: WorldManagerOptions): Promise<void> {
  try {
    // Le contenu de /join est rendu par JS — attendre le DOM complet avant toute interaction
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})

    // Foundry v14 : le formulaire "Return to Setup" est form[data-application-part="setup"]
    // avec input[name="adminPassword"] et button[type="submit"]
    const setupForm = page.locator('form[data-application-part="setup"], #join-game-setup')
    await setupForm.waitFor({ state: 'visible', timeout: 10000 })

    const adminPasswordInput = setupForm.locator('input[name="adminPassword"]')
    await adminPasswordInput.waitFor({ state: 'visible', timeout: 5000 })
    await adminPasswordInput.fill(options.adminPassword)

    const returnBtn = setupForm.locator('button[type="submit"]')
    await returnBtn.waitFor({ state: 'visible', timeout: 5000 })
    await returnBtn.click()

    await page.waitForURL('**/setup', { waitUntil: 'domcontentloaded', timeout: 20000 })
    console.log('[worldManager] Return to Setup depuis /join ✔')
  } catch (error) {
    console.warn('[worldManager] returnToSetupFromJoin failed:', error)
  }
}

async function returnToSetupFromGame(page: Page, options: WorldManagerOptions): Promise<void> {
  try {
    await page
      .evaluate(() => {
        if (typeof game !== 'undefined' && (game as { shutDown?: () => void }).shutDown) {
          ;(game as { shutDown: () => void }).shutDown()
        }
      })
      .catch(() => {})

    await page.waitForURL(/\/(join|setup)/, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})

    if (page.url().includes('/join')) {
      await returnToSetupFromJoin(page, options)
    }

    console.log('[worldManager] Return to Setup depuis /game ✔')
  } catch (error) {
    await page.goto(`${options.baseURL}/setup`, { waitUntil: 'domcontentloaded' }).catch(() => {})
    console.warn('[worldManager] returnToSetupFromGame fallback:', error)
  }
}

// ---------------------------------------------------------------------------
// Primitives de cleanup d'artefacts de test
// ---------------------------------------------------------------------------

/**
 * Supprime un acteur par nom via l'API Foundry exécutée dans la page.
 *
 * Stratégie : `page.evaluate()` en premier (déterministe, pas de DOM, pas de timing).
 * Fallback UI si le contexte Foundry n'est pas disponible (ex. page en état dégradé).
 *
 * Utilisé en teardown de spec pour éliminer les artefacts de test et garantir
 * que le monde ne soit pas pollué entre les runs.
 *
 * Pré-requis : être en /game avec `game.actors` initialisé.
 *
 * @param page - Page Playwright
 * @param actorName - Nom exact de l'acteur à supprimer
 */
export async function deleteActorByName(page: Page, actorName: string): Promise<void> {
  // -------------------------------------------------------------------------
  // Stratégie 1 : suppression via API Foundry dans la page (déterministe)
  // -------------------------------------------------------------------------
  try {
    const deleted = await page.evaluate(async (name: string) => {
      const g = window as unknown as { game?: { actors?: { getName: (n: string) => { delete: () => Promise<unknown> } | undefined } } }
      const actor = g.game?.actors?.getName(name)
      if (!actor) return false
      await actor.delete()
      return true
    }, actorName)

    if (deleted) {
      console.log(`[worldManager] Acteur "${actorName}" supprimé via API ✔`)
      return
    }

    console.log(`[worldManager] Acteur "${actorName}" introuvable dans game.actors — pas de suppression nécessaire`)
    return
  } catch (evaluateError) {
    console.warn(`[worldManager] deleteActorByName("${actorName}") — API evaluate échoué, fallback UI:`, evaluateError)
  }

  // -------------------------------------------------------------------------
  // Stratégie 2 : fallback UI (context menu → Delete → confirm dialog)
  // -------------------------------------------------------------------------
  try {
    const actorsTab = page
      .locator('[role="tab"][data-tab="actors"]')
      .or(page.locator('[data-action="tab"][data-tab="actors"]'))
      .or(page.getByRole('tab', { name: /^Actors$/i }))
      .first()

    await actorsTab.waitFor({ state: 'visible', timeout: 5000 })
    await actorsTab.click()
    await page.locator('#actors').waitFor({ state: 'visible', timeout: 5000 })

    const actorEntry = page.locator('#actors').locator('li.actor, li.document').filter({ hasText: actorName }).first()
    const exists = await actorEntry.isVisible({ timeout: 3000 }).catch(() => false)

    if (!exists) {
      console.log(`[worldManager] Acteur "${actorName}" introuvable dans la sidebar — pas de suppression nécessaire`)
      return
    }

    await actorEntry.click({ button: 'right' })

    const deleteOption = page
      .locator('[data-action="delete"]')
      .or(page.locator('.context-menu li').filter({ hasText: /^Delete$/i }))
      .or(page.getByRole('menuitem', { name: /Delete/i }))
      .first()

    await deleteOption.waitFor({ state: 'visible', timeout: 5000 })
    await deleteOption.click()

    const confirmBtn = page
      .getByRole('button', { name: /^Yes$/i })
      .or(page.getByRole('button', { name: /Confirm/i }))
      .or(page.locator('[data-button="yes"]'))
      .first()

    await confirmBtn.waitFor({ state: 'visible', timeout: 5000 })
    await confirmBtn.click()

    await actorEntry.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})

    console.log(`[worldManager] Acteur "${actorName}" supprimé via UI (fallback) ✔`)
  } catch (error) {
    console.warn(`[worldManager] deleteActorByName("${actorName}") échoué (non bloquant):`, error)
  }
}

/**
 * Supprime tous les acteurs dont le nom correspond au préfixe donné.
 *
 * Utile en cas d'artefacts résiduels laissés par des runs précédents interrompus.
 * Les specs créent leurs acteurs avec un préfixe fixe (ex. "Test-Personnage-", "Test-XP-")
 * afin de permettre ce nettoyage ciblé sans affecter d'autres données du monde.
 *
 * Pré-requis : être en /game avec la sidebar Actors accessible.
 *
 * @param page - Page Playwright
 * @param prefix - Préfixe des acteurs à supprimer (ex: "Test-")
 */
export async function cleanupTestActors(page: Page, prefix: string): Promise<void> {
  try {
    // S'assurer que l'onglet Actors est actif
    const actorsTab = page
      .locator('[role="tab"][data-tab="actors"]')
      .or(page.locator('[data-action="tab"][data-tab="actors"]'))
      .or(page.getByRole('tab', { name: /^Actors$/i }))
      .first()

    await actorsTab.waitFor({ state: 'visible', timeout: 5000 })
    await actorsTab.click()
    await page.locator('#actors').waitFor({ state: 'visible', timeout: 5000 })

    // Récupérer tous les noms d'acteurs correspondant au préfixe
    const actorEntries = page.locator('#actors').locator('li.actor, li.document')
    const names = await actorEntries.allTextContents()
    const toDelete = names.filter((n) => n.trim().startsWith(prefix))

    if (toDelete.length === 0) {
      console.log(`[worldManager] cleanupTestActors("${prefix}"): aucun artefact résiduel trouvé`)
      return
    }

    console.log(`[worldManager] cleanupTestActors("${prefix}"): ${toDelete.length} artefact(s) à supprimer`)

    for (const name of toDelete) {
      await deleteActorByName(page, name.trim())
    }

    console.log(`[worldManager] cleanupTestActors("${prefix}") terminé ✔`)
  } catch (error) {
    console.warn(`[worldManager] cleanupTestActors("${prefix}") échoué (non bloquant):`, error)
  }
}
