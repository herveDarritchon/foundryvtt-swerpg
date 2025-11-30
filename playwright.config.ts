import {defineConfig, devices} from '@playwright/test'
import * as dotenv from 'dotenv'

// Charger les variables d'environnement pour les tests E2E
dotenv.config({path: process.env.E2E_ENV_FILE || '.env.e2e.local'})

const baseURL = process.env.E2E_FOUNDRY_BASE_URL || 'http://localhost:30000'

export default defineConfig({
    testDir: './e2e',
    workers: 1,
    timeout: process.env.PLAYWRIGHT_TEST_TIMEOUT ? parseInt(process.env.PLAYWRIGHT_TEST_TIMEOUT) : 900000,
    expect: {
        timeout: process.env.PLAYWRIGHT_EXPECT_TIMEOUT ? parseInt(process.env.PLAYWRIGHT_EXPECT_TIMEOUT) : 30000, // Augmenté à 30s pour Chromium
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
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1920, height: 1080 },
                actionTimeout: 15000, // Augmenté de 9s par défaut à 15s pour Chromium
                // Options spécifiques pour améliorer la stabilité de session sur Chromium
                launchOptions: {
                    args: [
                        '--disable-blink-features=AutomationControlled', // Évite la détection d'automation
                        '--disable-features=IsolateOrigins,site-per-process', // Améliore la gestion des cookies cross-origin
                    ],
                },
                // Contexte persistant pour conserver les cookies entre les navigations
                contextOptions: {
                    // Force la persistance des cookies de session
                    acceptDownloads: true,
                },
            },
        },
        {
            name: 'firefox',
            use: {
                ...devices['Desktop Firefox'],
                viewport: { width: 1920, height: 1080 },
            },
        },
    ],
    reporter: process.env.CI ? [['list'], ['html', {outputFolder: 'playwright-report'}]] : 'list',
    retries: process.env.CI ? 1 : 0,
})

