import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'

// Configuration E2E documentation : instance de production sur port 30000
// Exécution manuelle uniquement — production de captures, validation de parcours documentaires.
// Lecture seule par défaut ; certains prérequis contrôlés peuvent être autorisés pour
// produire des états documentés stables (ex. personnage pré-créé avant capture).
dotenv.config({ path: process.env.E2E_ENV_FILE || '.env.e2e.documentation' })

const baseURL = process.env.E2E_FOUNDRY_BASE_URL || 'http://localhost:30000'

export default defineConfig({
  testDir: './e2e/documentation/specs',
  globalSetup: './e2e/documentation/global-setup.ts',
  workers: 1,
  // Délais généreux : les specs documentation peuvent capturer des états complexes
  timeout: process.env.PLAYWRIGHT_TEST_TIMEOUT ? parseInt(process.env.PLAYWRIGHT_TEST_TIMEOUT) : 120000,
  expect: {
    timeout: process.env.PLAYWRIGHT_EXPECT_TIMEOUT ? parseInt(process.env.PLAYWRIGHT_EXPECT_TIMEOUT) : 20000,
  },
  use: {
    baseURL,
    // Traces et captures systématiques : l'objectif est de produire des artefacts documentaires
    trace: 'on',
    screenshot: 'on',
    video: 'off',
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
          // Les specs documentation sont en lecture seule par défaut.
          // Mettre à true uniquement si une spec crée des prérequis contrôlés documentés.
          acceptDownloads: false,
        },
      },
    },
  ],
  // Report HTML systématique : les captures et traces sont la preuve documentaire du run.
  reporter: [['list'], ['html', { outputFolder: 'playwright-documentation-report', open: 'never' }]],
  retries: 0,
  // La suite est intentionnellement vide jusqu'à l'ajout des premières specs.
  // Exit 0 si aucune spec trouvée, pour ne pas bloquer CI ou scripts d'orchestration.
  passWithNoTests: true,
})
