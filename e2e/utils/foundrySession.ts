import {Page} from '@playwright/test'
import {dismissBackupsTourIfPresent} from '../helper/overlay'

export interface FoundrySessionOptions {
    baseURL: string
    adminPassword: string
    username: string
    password: string
    world: string
}

export async function loginIntoInstance(
    page: Page,
    options: FoundrySessionOptions
): Promise<string> {
    // 1) Login admin
    await page.goto(`${options.baseURL}/auth`, {waitUntil: 'domcontentloaded'})

    await page.getByPlaceholder('Administrator Password').fill(options.adminPassword)
    await page.getByRole('button', {name: /log in/i}).click()

    await page.waitForURL('**/setup', {waitUntil: 'networkidle'})
    return page.url()
}

export async function enterWorld(
    page: Page,
    options: FoundrySessionOptions
): Promise<string> {
    // 2) Fermer le tour si présent
    await dismissBackupsTourIfPresent(page)

    // 3) Filtrer la liste des worlds
    const worldFilter = page.locator('#world-filter')
    await worldFilter.click()
    await worldFilter.fill(options.world)

    // 4) Cliquer sur "Launch World" pour ce world
    const worldItem = page
        .locator('li.package.world')
        .filter({hasText: options.world})
        .first()

    // on survole la tuile pour faire apparaître le bouton
    await worldItem.hover()

    // puis on clique sur le bouton "Launch World" à l'intérieur
    await worldItem.locator('a.control.play[aria-label="Launch World"]').click()

    // 5) Écran de join : choisir un user et rejoindre
    await page.waitForURL('**/join', {waitUntil: 'domcontentloaded'})

    return page.url()
}

export async function enterGameAsGamemaster(
    page: Page,
    options: FoundrySessionOptions
): Promise<string> {
    // ici on sélectionne par **label** visible (ex: "Gamemaster")
    await page.getByRole('combobox').selectOption({label: options.username})

    await page
        .getByRole('button', {name: /join game session/i})
        .click()

    // 6) On s’arrête là : le test pourra vérifier le UI Swerpg
    await page.waitForURL('**/game', {waitUntil: 'networkidle'})
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
            const gameSettingsTab = page.getByRole('tab', {name: /Game Settings/i})
            if (await gameSettingsTab.count()) {
                await gameSettingsTab.click().catch(() => {
                })

                const returnBtn = page.getByRole('button', {name: /Log Out/i})
                if (await returnBtn.count()) {
                    await returnBtn.click().catch(() => {
                    })
                    await page
                        .waitForURL('**/join', {waitUntil: 'domcontentloaded'})
                        .catch(() => {
                        })
                    return page.url()
                }
            }
        }
    } catch {
        // Dernier filet de sécurité : on n'échoue pas le test sur le cleanup
        // Fallback : forcer la navigation vers /setup
        await page
            .goto(`${options.baseURL}/setup`, {waitUntil: 'domcontentloaded'})
            .catch(() => {
            })
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

            const returnBtn = page.getByRole('button', {name: /Return to Setup/i})
            if (await returnBtn.count()) {
                await returnBtn.click().catch(() => {
                })
                await page
                    .waitForURL('**/setup', {waitUntil: 'domcontentloaded'})
                    .catch(() => {
                    })
                return page.url()
            }
        }

    } catch {
        // Dernier filet de sécurité : on n'échoue pas le test sur le cleanup
        // Fallback : forcer la navigation vers /setup
        await page
            .goto(`${options.baseURL}/setup`, {waitUntil: 'domcontentloaded'})
            .catch(() => {
            })
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

            const returnBtn = page.getByRole('button', {name: /Logout/i})
            if (await returnBtn.count()) {
                await returnBtn.click().catch(() => {
                })
                await page
                    .waitForURL('**/auth', {waitUntil: 'domcontentloaded'})
                    .catch(() => {
                    })
                return page.url()
            }
        }

    } catch {
        // Dernier filet de sécurité : on n'échoue pas le test sur le cleanup
        // Fallback : forcer la navigation vers /setup
        await page
            .goto(`${options.baseURL}/auth`, {waitUntil: 'domcontentloaded'})
            .catch(() => {
            })
    }
    return page.url()
}