import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'

// Charger les variables d'environnement pour les tests E2E
dotenv.config({ path: process.env.E2E_ENV_FILE || '.env.e2e.local' })

const baseURL = process.env.E2E_FOUNDRY_BASE_URL || 'http://localhost:30000'

const projects = [
    {
        name: 'chromium',
        use: {
            ...devices['Desktop Chrome'],
            viewport: { width: 1920, height: 1080 },
            actionTimeout: 15000, // Augmenté de 9s par défaut à 15s pour Chromium
            launchOptions: {
                args: [
                    '--disable-blink-features=AutomationControlled',
                    '--disable-features=IsolateOrigins,site-per-process',
                ],
            },
            contextOptions: {
                acceptDownloads: true,
            },
        },
    },
]

// ⚠️ Ajout conditionnel propre : uniquement en CI
if (!process.env.CI) {
    projects.push({
        name: 'firefox',
        use: {
            ...devices['Desktop Firefox'],
            viewport: { width: 1920, height: 1080 },
        },
    })
}

export default defineConfig({
    testDir: './e2e',
    workers: 1,
    timeout: process.env.PLAYWRIGHT_TEST_TIMEOUT
        ? parseInt(process.env.PLAYWRIGHT_TEST_TIMEOUT)
        : 90000,
    expect: {
        timeout: process.env.PLAYWRIGHT_EXPECT_TIMEOUT
            ? parseInt(process.env.PLAYWRIGHT_EXPECT_TIMEOUT)
            : 15000,
    },
    use: {
        baseURL,
        trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects,
    reporter: process.env.CI
        ? [['list'], ['html', { outputFolder: 'playwright-report' }]]
        : 'list',
    retries: process.env.CI ? 1 : 0,
})