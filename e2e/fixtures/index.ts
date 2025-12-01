import {expect, test as base} from '@playwright/test'
import {FoundrySessionOptions} from '../utils/foundrySession'
import {setUp, tearDown} from "../utils/e2eTest";

export const beforeAllFixture = base.extend({});

beforeAllFixture.beforeAll(async ({browserName, browser}, testInfo) => {
    console.log(
        `[E2E] Starting tests on project=${testInfo.project.name} browser=${browserName} version=${browser.version()}`
    );
});

export const test = base.extend<{ worldReady: void }>({
    worldReady: [
        async ({page}, use) => {
            const options: FoundrySessionOptions = {
                baseURL: process.env.E2E_FOUNDRY_BASE_URL ?? 'http://localhost:30000',
                adminPassword: process.env.E2E_FOUNDRY_ADMIN_PASSWORD ?? '',
                username: process.env.E2E_FOUNDRY_USERNAME ?? 'Gamemaster',
                password: process.env.E2E_FOUNDRY_PASSWORD ?? '',
                world: process.env.E2E_FOUNDRY_WORLD ?? 'Swerpg-E2E-World',
            }

            // INIT : on met Foundry en /game sur le bon world
            await setUp(page, options)

            await use()

            // CLOSE : on remet l’instance sur /setup pour le prochain navigateur/projet
            await tearDown(page, options)
        },
        {auto: true},
    ],
})

export {expect}

