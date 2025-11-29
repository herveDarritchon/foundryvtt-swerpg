import { test as base, expect } from '@playwright/test'
import { loginAndEnterWorld, FoundrySessionOptions } from '../utils/foundrySession'

export const test = base.extend<{ worldReady: void }>({
  worldReady: [
    async ({ page }, use) => {
      const options: FoundrySessionOptions = {
        baseURL: process.env.E2E_FOUNDRY_BASE_URL ?? 'http://localhost:30000',
        username: process.env.E2E_FOUNDRY_USERNAME ?? 'gamemaster',
        password: process.env.E2E_FOUNDRY_PASSWORD ?? 'changeme',
        world: process.env.E2E_FOUNDRY_WORLD ?? 'Swerpg-E2E-World',
      }

      await loginAndEnterWorld(page, options)
      await use()
    },
    { auto: true },
  ],
})

export { expect }

