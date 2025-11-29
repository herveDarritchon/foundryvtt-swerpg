import {Page} from "@playwright/test";
import {
    enterGameAsGamemaster,
    enterWorld,
    FoundrySessionOptions,
    loginIntoInstance,
    logout, logoutFromInstance,
    quitWorld
} from "./foundrySession";

export async function setUp(
    page: Page,
    options: FoundrySessionOptions) {
    let url = page.url()

    if (url.includes('about:blank')) {
        await page.goto(`${options.baseURL}/auth`, {waitUntil: 'domcontentloaded'})
        url = page.url()
    }

    if (url.includes('/game')) {
        return
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
}

export async function tearDown(
    page: Page,
    options: FoundrySessionOptions) {
    const url = page.url()

    if (url.includes('/auth')) {
        return
    }

    if (url.includes('/game')) {
        await logout(page, options)
    }

    if (url.includes('/join')) {
        await quitWorld(page, options)
    }

    if (url.includes('/setup')) {
        await logoutFromInstance(page, options)
    }

}
