import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'

// Configuration smoke prod : instance de production sur port 30000
// Exécution manuelle uniquement, post-déploiement, depuis une machine locale adaptée.
// Aucune mutation du monde — lecture seule stricte.
dotenv.config({ path: process.env.E2E_ENV_FILE || '.env.e2e.smoke.prod' })

const baseURL = process.env.E2E_FOUNDRY_BASE_URL || 'http://localhost:30000'

export default defineConfig({
  testDir: './e2e/smoke',
  globalSetup: './e2e/smoke/global-setup.ts',
  workers: 1,
  // Délais courts : les smoke tests doivent rester rapides et non-destructifs
  timeout: process.env.PLAYWRIGHT_TEST_TIMEOUT ? parseInt(process.env.PLAYWRIGHT_TEST_TIMEOUT) : 60000,
  expect: {
    timeout: process.env.PLAYWRIGHT_EXPECT_TIMEOUT ? parseInt(process.env.PLAYWRIGHT_EXPECT_TIMEOUT) : 15000,
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        actionTimeout: 15000,
        launchOptions: {
          args: ['--disable-blink-features=AutomationControlled', '--disable-features=IsolateOrigins,site-per-process'],
        },
        contextOptions: {
          acceptDownloads: false,
        },
      },
    },
  ],
  reporter: 'list',
  retries: 0,
})
