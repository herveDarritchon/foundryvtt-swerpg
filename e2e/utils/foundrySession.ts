import { Page } from '@playwright/test'
import { dismissShareUsageDataIfPresent, dismissTourIfPresent } from '../helper/overlay'

export interface FoundrySessionOptions {
  baseURL: string
  adminPassword: string
  username: string
  password: string
  world: string
}

export async function accepteLicense(page: Page, options: FoundrySessionOptions): Promise<string> {
  // 0) Accept Licence
  await page.getByText('Acknowledge Agreement I agree').click()
  await page.getByRole('checkbox', { name: 'I agree to these terms' }).check()
  await page.getByRole('button', { name: ' Agree' }).click()
  return page.url()
}

export async function loginIntoInstance(page: Page, options: FoundrySessionOptions): Promise<string> {
  // 1) Login admin
  await page.getByPlaceholder('Administrator Password').fill(options.adminPassword)
  await page.getByRole('button', { name: /log in/i }).click()

  // Après login, on peut atterrir sur /setup (pas de monde actif) ou /join (monde déjà actif)
  await page.waitForURL(/\/(setup|join)/, { waitUntil: 'domcontentloaded' })
  return page.url()
}

export async function enterWorld(page: Page, options: FoundrySessionOptions): Promise<string> {
  // 2) Fermer le tour si présent
  await dismissShareUsageDataIfPresent(page)
  await dismissTourIfPresent(page)

  // 3) Filtrer la liste des worlds - attendre que le filtre soit prêt
  const worldFilter = page.locator('#world-filter')
  await worldFilter.waitFor({ state: 'visible' })
  await worldFilter.click()
  await worldFilter.fill(options.world)

  // 4) Attendre que le world item filtré soit visible
  const worldItem = page.locator('li.package.world').filter({ hasText: options.world }).first()

  // Attendre que l'item soit visible après filtrage
  await worldItem.waitFor({ state: 'visible' })

  // on survole la tuile pour faire apparaître le bouton
  await worldItem.hover()

  // puis on clique sur le bouton "Launch World" à l'intérieur
  const launchButton = worldItem.locator('a.control.play[aria-label="Launch World"]')
  await launchButton.waitFor({ state: 'visible' })
  await launchButton.click()

  // After clicking "Launch World", Foundry may show blocking dialogs before navigating to /join:
  // 1. "World Data Migration" — appears when the world's stored core version differs from current.
  // 2. "Creating Backup" — appears when a backup was requested (either by the user or the migration).
  // These dialogs must be dismissed before waitForURL('/join') can resolve.
  await dismissFoundryLaunchDialogs(page)

  // 5) Écran de join : choisir un user et rejoindre
  await page.waitForURL('**/join', { waitUntil: 'domcontentloaded' })

  return page.url()
}

/**
 * Dismisses any Foundry dialogs that can block world launch (migration and backup).
 *
 * After clicking "Launch World", Foundry may display:
 * - "World Data Migration": uncheck the backup option, then confirm migration.
 * - "Creating Backup": close the dialog (skip backup) so the world can proceed to launch.
 *
 * Both dialogs are polled in a short loop so that dialogs appearing slightly after
 * the initial click are still caught.
 */
async function dismissFoundryLaunchDialogs(page: Page): Promise<void> {
  // Poll for blocking dialogs for up to 8 seconds after the launch click.
  // Each iteration checks for known dialogs and dismisses them; if neither appears
  // within the poll window, we assume no dialog is blocking the launch.
  let deadline = Date.now() + 8000
  while (Date.now() < deadline) {
    // Check for "World Data Migration" dialog
    const migrationDialog = page.locator('dialog, [role="dialog"]').filter({ hasText: /World Data Migration/i })
    const migrationVisible = await migrationDialog.isVisible().catch(() => false)
    if (migrationVisible) {
      console.log('[enterWorld] Dialogue "World Data Migration" détecté — confirmation de la migration')
      // Uncheck "Create a backup before migrating?" to skip the backup sub-dialog
      const backupCheckbox = migrationDialog.locator('input[type="checkbox"]').first()
      const isChecked = await backupCheckbox.isChecked().catch(() => false)
      if (isChecked) {
        await backupCheckbox.uncheck()
        console.log('[enterWorld] Backup avant migration désactivé ✔')
      }
      const beginBtn = migrationDialog.getByRole('button', { name: /Begin Migration/i })
      await beginBtn.click()
      console.log('[enterWorld] Migration confirmée ✔')
      // Wait for dialog to close before looping — avoids re-detecting the same dialog
      await migrationDialog.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {})
      // Reset deadline to allow time for any subsequent dialog (e.g. backup sub-dialog)
      deadline = Date.now() + 8000
      continue
    }

    // Check for "Creating Backup" dialog — close it to skip the backup
    const backupDialog = page.locator('dialog, [role="dialog"]').filter({ hasText: /Creating Backup/i })
    const backupVisible = await backupDialog.isVisible().catch(() => false)
    if (backupVisible) {
      console.log('[enterWorld] Dialogue "Creating Backup" détecté — fermeture sans backup')
      const closeBtn = backupDialog.getByRole('button', { name: /Close Window/i })
      const closeBtnVisible = await closeBtn.isVisible().catch(() => false)
      if (closeBtnVisible) {
        await closeBtn.click()
        console.log('[enterWorld] Backup annulé (Close Window) ✔')
      } else {
        // Fallback: click Backup and wait for it to complete
        const backupBtn = backupDialog.getByRole('button', { name: /^Backup$/i })
        await backupBtn.click().catch(() => {})
        console.log('[enterWorld] Backup confirmé (fallback) ✔')
        // After clicking Backup, wait for the dialog to close before continuing
        await backupDialog.waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {})
      }
      continue
    }

    // No blocking dialog visible — break out of the poll loop
    break
  }
}

export async function enterGameAsGamemaster(page: Page, options: FoundrySessionOptions): Promise<string> {
  const url = page.url()

  if (!url.includes('/join')) {
    throw new Error(`[enterGameAsGamemaster] failed: expected to be on /join but got ${url}`)
  }

  // 2) Sélection de l'utilisateur
  const userSelect = page.locator('select[name="userid"]')

  await userSelect.waitFor({ state: 'visible', timeout: 10_000 })

  // Log des options visibles pour debug CI
  const optionLabels = await userSelect.locator('option').allTextContents()

  if (optionLabels.length === 0) {
    throw new Error('[enterGameAsGamemaster] select User présent mais sans aucune option – vérifie ta config Foundry (users/world).')
  }

  // L'attribut "disabled" sur l'option est un hint client-side pour signaler qu'une session est active.
  // Foundry côté serveur accepte les reconnexions : on lève le disabled JS-side si nécessaire,
  // puis on sélectionne l'option normalement. Le serveur termine la session précédente et crée une nouvelle.
  await userSelect.evaluate((selectEl: HTMLSelectElement, username: string) => {
    const option = Array.from(selectEl.options).find((o) => o.text.trim() === username)
    if (option) {
      option.disabled = false
      selectEl.value = option.value
    }
  }, options.username)

  await userSelect.selectOption({ label: options.username })

  await page.getByRole('button', { name: /join game session/i }).click()

  // Attendre l'arrivée sur /game
  await page.waitForURL('**/game', { waitUntil: 'domcontentloaded' })
  return page.url()
}

export async function logout(page: Page, options: FoundrySessionOptions): Promise<string> {
  try {
    const url = page.url()

    // Déjà sur la page setup → rien à faire
    if (url.includes('/setup')) {
      return page.url()
    }

    // Si on est en jeu, tenter Game Settings → Return to Setup
    if (url.includes('/game')) {
      // on ouvre le menu Game Settings si nécessaire
      const expandMenu = await page.getByRole('button', { name: 'Expand' })
      if ((await expandMenu.count()) !== 0) {
        await page.getByRole('tab', { name: 'Game Settings' }).click()
      }

      // Basculer sur Game Settings si visible puis tenter Log Out
      const gameSettingsTab = page.getByRole('tab', { name: /Game Settings/i })
      if ((await gameSettingsTab.count()) !== 0) {
        await gameSettingsTab.click().catch(() => {})
        const returnBtn = page.getByRole('button', { name: /Log Out/i })
        if (await returnBtn.count()) {
          await returnBtn.click().catch(() => {})
          await page.waitForURL('**/join', { waitUntil: 'domcontentloaded' }).catch(() => {})
          return page.url()
        }
      }
    }
  } catch {
    // Dernier filet de sécurité : on n'échoue pas le test sur le cleanup
    // Fallback : forcer la navigation vers /setup
    await page.goto(`${options.baseURL}/setup`, { waitUntil: 'domcontentloaded' }).catch(() => {})
  }
  return page.url()
}

export async function quitWorld(page: Page, options: FoundrySessionOptions): Promise<string> {
  try {
    const url = page.url()

    // Déjà sur la page setup → rien à faire
    if (url.includes('/setup')) {
      return page.url()
    }

    // Si on est en jeu, tenter Game Settings → Return to Setup
    if (url.includes('/join')) {
      const returnBtn = page.getByRole('button', { name: /Return to Setup/i })
      if (await returnBtn.count()) {
        await returnBtn.click().catch(() => {})
        await page.waitForURL('**/setup', { waitUntil: 'domcontentloaded' }).catch(() => {})
        return page.url()
      }
    }
  } catch {
    // Dernier filet de sécurité : on n'échoue pas le test sur le cleanup
    // Fallback : forcer la navigation vers /setup
    await page.goto(`${options.baseURL}/setup`, { waitUntil: 'domcontentloaded' }).catch(() => {})
  }
  return page.url()
}

export async function logoutFromInstance(page: Page, options: FoundrySessionOptions): Promise<string> {
  try {
    const url = page.url()

    // Déjà sur la page setup → rien à faire
    if (url.includes('/auth')) {
      return page.url()
    }

    // Si on est en jeu, tenter Game Settings → Return to Setup
    if (url.includes('/setup')) {
      const returnBtn = page.getByRole('button', { name: /Logout/i })
      if (await returnBtn.count()) {
        await returnBtn.click().catch(() => {})
        await page.waitForURL('**/auth', { waitUntil: 'domcontentloaded' }).catch(() => {})
        return page.url()
      }
    }
  } catch {
    // Dernier filet de sécurité : on n'échoue pas le test sur le cleanup
    // Fallback : forcer la navigation vers /setup
    await page.goto(`${options.baseURL}/auth`, { waitUntil: 'domcontentloaded' }).catch(() => {})
  }
  return page.url()
}
