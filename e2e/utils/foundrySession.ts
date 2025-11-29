import {Locator, Page} from '@playwright/test'
import {dismissBackupsTourIfPresent} from "../helper/overlay";

export interface FoundrySessionOptions {
    baseURL: string
    adminPassword: string
    username: string
    password: string
    world: string
}

export async function loginAndEnterWorld(page: Page, options: FoundrySessionOptions): Promise<void> {

    // 1) Login admin
    await page.goto(`${options.baseURL}/auth`, {waitUntil: 'domcontentloaded'})

    await page.getByPlaceholder('Administrator Password').fill(options.adminPassword)
    await page.getByRole('button', {name: /log in/i}).click()

    // On attend d’être bien sur la page setup
    await page.waitForURL('**/setup', {waitUntil: 'networkidle'})

    // 2) Fermer le tour "Backups Overview" si présent
    await dismissBackupsTourIfPresent(page)

    // 3) Filtrer les worlds
    const worldFilter = page.locator('#world-filter')
    await worldFilter.click()
    await worldFilter.fill(options.world)

    // 4) Cliquer sur "Launch World" pour le bon world
    await page.getByRole('listitem').filter({ hasText: options.world }).getByLabel('Launch World').click();

    // 5) Choisir le joueur et rejoindre la partie
    await page.waitForURL('**/join', {waitUntil: 'networkidle'})

    await page.getByRole('combobox').selectOption(options.username)
    await page.getByRole('button', {name: /join game session/i}).click()

    // 6) Revenir sur la page setup
    await page.getByRole('tab', {name: 'Game Settings'}).click();
    await page.getByRole('button', {name: ' Return to Setup'}).click();
    await page.getByRole('button', {name: 'Logout'}).click();

        await page.goto('http://localhost:30000/auth');
        await page.getByPlaceholder('Administrator Password').click();
        await page.getByPlaceholder('Administrator Password').fill('Aotearoa3"');
        await page.getByRole('button', { name: ' Log In' }).click();
        await page.locator('.tour-overlay').click();
        await page.locator('body').press('Escape');
        await page.getByPlaceholder('Filter Worlds (9)').click();
        await page.getByPlaceholder('Filter Worlds (9)').fill('Swerpg-E2E-world');
        await page.getByRole('listitem').filter({ hasText: 'Swerpg-E2E-World Saturday,' }).getByLabel('Launch World').click();
        await page.getByRole('combobox').selectOption('RXL4YxUBNT0APNOd');
        await page.getByRole('button', { name: ' Join Game Session' }).click();
        await page.getByRole('tab', { name: 'Game Settings' }).click();
        await page.getByRole('button', { name: ' Return to Setup' }).click();
        await page.getByRole('button', { name: 'Logout' }).click();
}

async function ensureGameWorldsTab(page: Page): Promise<void> {
    const worldsTab = page.getByRole('tab', {name: /Game Worlds/i}).first()
    if (await worldsTab.count()) {
        await worldsTab.click()
        await page.waitForTimeout(250)
    }
    await dismissSetupOverlays(page)
}

async function launchWorld(page: Page, world: string): Promise<void> {
    await dismissSetupOverlays(page)
    const worldFilter = page.getByPlaceholder(/Filter Worlds/i).first()
    if (await worldFilter.count()) {
        await worldFilter.fill('')
        await worldFilter.fill(world)
        await page.waitForTimeout(500)
    }

    const worldCard = await findWorldCard(page, world)
    await worldCard.waitFor({state: 'visible', timeout: 10000})
    await worldCard.click({force: true})

    const launchButton = await findLaunchButton(page, worldCard)
    if (launchButton) {
        await launchButton.click({force: true})
        await page.waitForLoadState('domcontentloaded', {timeout: 30000})
        return
    }

    await worldCard.dblclick({delay: 100})
    await page.waitForLoadState('domcontentloaded', {timeout: 30000})
}

async function findWorldCard(page: Page, world: string) {
    const locatorCandidates = [
        page.locator('[data-world]', {hasText: new RegExp(world, 'i')}),
        page.locator('.world', {hasText: new RegExp(world, 'i')}),
        page.locator('article', {hasText: new RegExp(world, 'i')}),
        page.locator('.package', {hasText: new RegExp(world, 'i')}),
        page.locator('.world-card', {hasText: new RegExp(world, 'i')})
    ]

    for (const locator of locatorCandidates) {
        if (await locator.count()) {
            return locator.first()
        }
    }

    throw new Error(`Unable to find world tile for "${world}" on the setup page.`)
}

async function findLaunchButton(page: Page, worldCard: Locator): Promise<Locator | null> {
    const cardButtonCandidates = [
        worldCard.getByRole('button', {name: /Launch/i}),
        worldCard.getByRole('button', {name: /Play/i}),
        worldCard.locator('button.world-launch'),
        worldCard.locator('button:has(svg[aria-label="Play"])'),
        worldCard.locator('button[data-action="launch"]'),
        worldCard.locator('button:has-text("▶")')
    ]

    const cardButton = await findFirstVisibleButton(cardButtonCandidates)
    if (cardButton) {
        return cardButton
    }

    const globalButtonCandidates = [
        page.getByRole('button', {name: /Launch World/i}),
        page.getByRole('button', {name: /Launch Selected World/i}),
        page.getByRole('button', {name: /Play World/i}),
        page.locator('button[data-action="launchWorld"]'),
        page.locator('button.launch-world'),
        page.locator('[data-action="launch-world"]'),
        page.locator('button:has-text("Launch World")')
    ]

    return findFirstVisibleButton(globalButtonCandidates)
}

async function findFirstVisibleButton(candidates: Locator[]): Promise<Locator | null> {
    for (const candidate of candidates) {
        if (await candidate.count()) {
            const first = candidate.first()
            const isVisible = await first.isVisible().catch(() => false)
            if (isVisible) {
                await first.waitFor({state: 'attached', timeout: 5000}).catch(() => {
                })
                return first
            }
        }
    }
    return null
}

async function dismissSetupOverlays(page: Page): Promise<void> {
    await page.keyboard.press('Escape').catch(() => {
    })
    const closeSelectors = [
        '.shepherd-element button[aria-label="Close tour"]',
        '.shepherd-element button.shepherd-button-secondary',
        '.shepherd-cancel-icon',
        '.tour button[aria-label="Close"]'
    ]

    for (const selector of closeSelectors) {
        const closeButton = page.locator(selector)
        if (await closeButton.count()) {
            await closeButton.first().click({delay: 50}).catch(() => {
            })
            await page.waitForTimeout(200)
        }
    }
}
