import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'

// Configuration E2E de non-régression : instance dédiée sur port 31001
// Couvre le parcours complet : monde vierge → import OggDude → personnage → dés → combat
dotenv.config({ path: process.env.E2E_ENV_FILE || '.env.e2e.regression' })

const baseURL = process.env.E2E_FOUNDRY_BASE_URL || 'http://localhost:31001'

export default defineConfig({
  testDir: './e2e/regression/specs',
  globalSetup: './e2e/regression/fixtures/global-setup.ts',
  workers: 1,
  // Délais plus longs : les tests de non-régression couvrent des parcours complets
  timeout: process.env.PLAYWRIGHT_TEST_TIMEOUT ? parseInt(process.env.PLAYWRIGHT_TEST_TIMEOUT) : 120000,
  expect: {
    timeout: process.env.PLAYWRIGHT_EXPECT_TIMEOUT ? parseInt(process.env.PLAYWRIGHT_EXPECT_TIMEOUT) : 20000,
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
        actionTimeout: 20000,
        launchOptions: {
          args: ['--disable-blink-features=AutomationControlled', '--disable-features=IsolateOrigins,site-per-process'],
        },
        contextOptions: {
          acceptDownloads: true,
        },
      },
    },
  ],
  reporter: process.env.CI ? [['list'], ['html', { outputFolder: 'playwright-regression-report' }]] : 'list',
  retries: 0,
})