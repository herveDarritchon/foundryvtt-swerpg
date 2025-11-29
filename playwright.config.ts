import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

// Charger les variables d'environnement pour les tests E2E
dotenv.config({ path: process.env.E2E_ENV_FILE || '.env.e2e.local' })

const baseURL = process.env.E2E_FOUNDRY_BASE_URL || 'http://localhost:30000'

export default defineConfig({
  testDir: './e2e',
  timeout: 120000,
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL,
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  reporter: process.env.CI ? [['list'], ['html', { outputFolder: 'playwright-report' }]] : 'list',
  retries: process.env.CI ? 1 : 0,
})

