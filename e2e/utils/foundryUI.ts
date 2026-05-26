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

/**
 * Ouvre l'onglet Actors dans la sidebar Foundry.
 *
 * Foundry v14 utilise des onglets avec data-tab="actors" sans libellé visible.
 * On essaie plusieurs sélecteurs pour la compatibilité v13/v14.
 *
 * @param page - Page Playwright
 */
export async function openActorsTab(page: Page): Promise<void> {
  await ensureSessionActive(page)
  await dismissOverlayIfPresent(page)

  // Foundry v14 : onglet sidebar = <button role="tab" data-tab="actors">
  // Fallback v13 : role="tab" avec libellé "Actors"
  const actorsTab = page
    .locator('[role="tab"][data-tab="actors"]')
    .or(page.locator('[data-action="tab"][data-tab="actors"]'))
    .or(page.getByRole('tab', { name: /^Actors$/i }))
    .first()

  await actorsTab.waitFor({ state: 'visible', timeout: 10000 })
  await actorsTab.click()

  // Attendre que la section #actors soit visible
  await page.locator('#actors').waitFor({ state: 'visible', timeout: 10000 })
}

/**
 * Crée un acteur depuis la sidebar Actors et attend l'ouverture de sa fiche.
 *
 * Workflow :
 * 1. Clic sur le bouton "Create Actor" dans la sidebar.
 * 2. Sélection du type d'acteur dans le dialog de création.
 * 3. Saisie du nom et validation.
 * 4. Attente de l'ouverture de la fiche (dialog visible avec le bon titre).
 *
 * Pré-requis : l'onglet Actors doit être actif (`openActorsTab` appelé avant).
 *
 * @param page - Page Playwright
 * @param name - Nom de l'acteur à créer
 * @param type - Type d'acteur Foundry (ex: "character")
 * @returns Le nom de l'acteur tel que saisi (utilisable pour vérifier la fiche)
 */
export async function createActor(page: Page, name: string, type: string): Promise<string> {
  await ensureSessionActive(page)

  // Clic sur le bouton de création d'acteur dans la section #actors
  // Foundry v14 : bouton avec data-action="create" ou libellé "Create Actor"
  const createButton = page
    .locator('#actors')
    .locator('[data-action="create"]')
    .or(page.locator('#actors').getByRole('button', { name: /Create Actor/i }))
    .first()

  await createButton.waitFor({ state: 'visible', timeout: 10000 })
  await createButton.click()

  // Attendre le dialog de création d'acteur
  const createDialog = page
    .locator('dialog.dialog, .dialog, [role="dialog"]')
    .filter({ hasText: /type|create|actor/i })
    .first()

  await createDialog.waitFor({ state: 'visible', timeout: 10000 })

  // Remplir le nom de l'acteur
  const nameInput = createDialog.locator('input[name="name"]').or(createDialog.locator('input[type="text"]')).first()

  await nameInput.waitFor({ state: 'visible', timeout: 5000 })
  await nameInput.fill(name)

  // Sélectionner le type d'acteur si un select est présent
  const typeSelect = createDialog.locator('select[name="type"]')
  if ((await typeSelect.count()) > 0) {
    await typeSelect.selectOption({ value: type })
  }

  // Valider la création (bouton de confirmation)
  const confirmButton = createDialog
    .getByRole('button', { name: /^Create Actor$/i })
    .or(createDialog.getByRole('button', { name: /^Create$/i }))
    .or(createDialog.locator('[data-action="submit"], button[type="submit"]'))
    .first()

  await confirmButton.waitFor({ state: 'visible', timeout: 5000 })
  await confirmButton.click()

  // Attendre l'ouverture de la fiche (window/dialog avec le nom de l'acteur)
  // Foundry v14 ApplicationV2 rend : <form class="application sheet ...">
  // Foundry v13 ApplicationV1 rend : <div class="app window-app ...">
  const sheet = page.locator('.application.sheet, .app.sheet, .window-app, dialog.sheet, [role="dialog"]').filter({ hasText: name }).first()

  await sheet.waitFor({ state: 'visible', timeout: 15000 })

  return name
}

/**
 * Ouvre l'onglet Skills dans la fiche d'un acteur déjà ouvert.
 *
 * La fiche utilise des onglets avec `data-action="tab"` et `data-tab="skills"`.
 * L'onglet est cherché dans la fiche filtrée par le nom de l'acteur pour éviter
 * les conflits si plusieurs fiches sont ouvertes.
 *
 * @param page - Page Playwright
 * @param actorName - Nom de l'acteur dont la fiche est ouverte
 */
export async function openActorSkillsTab(page: Page, actorName: string): Promise<void> {
  await ensureSessionActive(page)

  // Localiser la fiche de l'acteur (même sélecteur que dans createActor)
  const sheet = page.locator('.application.sheet, .app.sheet, .window-app, dialog.sheet, [role="dialog"]').filter({ hasText: actorName }).first()

  await sheet.waitFor({ state: 'visible', timeout: 10000 })

  // Cliquer sur l'onglet Skills : data-action="tab" data-tab="skills"
  const skillsTab = sheet.locator('[data-action="tab"][data-tab="skills"]').or(sheet.locator('[data-tab="skills"]')).first()

  await skillsTab.waitFor({ state: 'visible', timeout: 10000 })
  await skillsTab.click()

  // Attendre qu'un élément de compétence soit visible (indicateur que l'onglet est actif)
  await sheet.locator('[data-skill-id]').first().waitFor({ state: 'visible', timeout: 10000 })
}

/**
 * Ouvre l'arbre de spécialisation depuis la fiche d'un personnage.
 *
 * Clique sur le bouton `[data-action="editSpecializationTrees"]` présent dans
 * l'en-tête de la fiche de personnage, puis attend que l'application
 * de l'arbre de spécialisation soit rendue.
 *
 * Pré-requis : la fiche du personnage doit être ouverte et visible.
 *
 * @param page - Page Playwright
 * @param actorName - Nom de l'acteur dont la fiche est ouverte
 */
export async function openSpecializationTree(page: Page, actorName: string): Promise<void> {
  await ensureSessionActive(page)

  // Localiser la fiche de l'acteur
  const sheet = page.locator('.application.sheet, .app.sheet, .window-app, dialog.sheet, [role="dialog"]').filter({ hasText: actorName }).first()

  await sheet.waitFor({ state: 'visible', timeout: 10000 })

  // Cliquer sur le bouton d'ouverture de l'arbre de spécialisation
  // Foundry v14 : <button data-action="editSpecializationTrees" ...>
  const treeButton = sheet.locator('[data-action="editSpecializationTrees"]').first()
  await treeButton.waitFor({ state: 'visible', timeout: 10000 })
  await treeButton.click()

  // Attendre que l'application de l'arbre de spécialisation soit visible
  // Template : <section class="swerpg application specialization-tree-app">
  const treeApp = page.locator('.specialization-tree-app').first()
  await treeApp.waitFor({ state: 'visible', timeout: 15000 })
}
