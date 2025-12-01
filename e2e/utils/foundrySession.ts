import {Page} from '@playwright/test'
import {dismissShareUsageDataIfPresent, dismissTourIfPresent} from '../helper/overlay'

export interface FoundrySessionOptions {
    baseURL: string
    adminPassword: string
    username: string
    password: string
    world: string
}

export async function accepteLicense(
    page: Page,
    options: FoundrySessionOptions
): Promise<string> {
    // 0) Accept Licence
    await page.getByText('Acknowledge Agreement I agree').click();
    await page.getByRole('checkbox', {name: 'I agree to these terms'}).check();
    await page.getByRole('button', {name: ' Agree'}).click();
    return page.url()
}

export async function loginIntoInstance(
    page: Page,
    options: FoundrySessionOptions
): Promise<string> {
    // 1) Login admin
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
    await dismissShareUsageDataIfPresent(page)
    await dismissTourIfPresent(page)

    // 3) Filtrer la liste des worlds - attendre que le filtre soit prêt
    const worldFilter = page.locator('#world-filter')
    await worldFilter.waitFor({state: 'visible', timeout: 5000})
    await worldFilter.click()
    await worldFilter.fill(options.world)

    // 4) Attendre que le world item filtré soit visible
    const worldItem = page
        .locator('li.package.world')
        .filter({hasText: options.world})
        .first()

    // Attendre que l'item soit visible après filtrage
    await worldItem.waitFor({state: 'visible', timeout: 5000})

    // on survole la tuile pour faire apparaître le bouton
    await worldItem.hover()

    // puis on clique sur le bouton "Launch World" à l'intérieur
    const launchButton = worldItem.locator('a.control.play[aria-label="Launch World"]')
    await launchButton.waitFor({state: 'visible', timeout: 3000})
    await launchButton.click()

    // 5) Écran de join : choisir un user et rejoindre
    await page.waitForURL('**/join', {waitUntil: 'domcontentloaded', timeout: 30000})

    return page.url()
}

export async function enterGameAsGamemaster(
    page: Page,
    options: FoundrySessionOptions
): Promise<string> {

    const url = page.url()

    if (!url.includes('/join')) {
        throw new Error(`enterGameAsGamemaster failed: expected to be on /join but got ${url}`)
    }

    // 2) Sélection de l'utilisateur
    // Utiliser l'accessible name est souvent plus robuste que name="userid"
    const userSelect = page.locator('select[name="userid"]'); // label "User Name" sur l'écran join

    // On laisse vraiment sa chance au DOM de s'initialiser
    await userSelect.waitFor({state: 'visible'});

    // Log des options visibles pour debug CI
    const optionLabels = await userSelect.locator('option').allTextContents();
    console.log('[enterGameAsGamemaster] user options:', optionLabels);

    if (optionLabels.length === 0) {
        throw new Error(
            '[enterGameAsGamemaster] select User présent mais sans aucune option – vérifie ta config Foundry (users/world).'
        );
    }
    await userSelect.selectOption({label: options.username});

    await page
        .getByRole('button', {name: /join game session/i})
        .click()

    // Attendre l'arrivée sur /game
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
            // on ouvre le menu Game Settings si nécessaire
            const expandMenu = await page.getByRole('button', {name: 'Expand'});
            if (await expandMenu.count() !== 0) {
                await page.getByRole('tab', {name: 'Game Settings'}).click();
            }

            // Basculer sur Game Settings si visible puis tenter Log Out
            const gameSettingsTab = page.getByRole('tab', {name: /Game Settings/i})
            if (await gameSettingsTab.count() !== 0) {
                await gameSettingsTab.click().catch(() => {
                })
                const returnBtn = page.getByRole('button', {name: /Log Out/i})
                if (await returnBtn.count()) {
                    await returnBtn.click().catch(() => {
                    })
                    await page.waitForURL('**/join', {waitUntil: 'domcontentloaded'}).catch(() => {
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