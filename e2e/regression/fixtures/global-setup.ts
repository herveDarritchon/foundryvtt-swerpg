import { chromium, FullConfig } from '@playwright/test'
import dotenv from 'dotenv'
import { ensureWorldExists } from '../utils/world-manager'

dotenv.config({ path: process.env.E2E_ENV_FILE || '.env.e2e.regression' })

/**
 * Global setup des tests de non-régression.
 *
 * Garantit qu'une instance Foundry est accessible sur port 31001
 * et que le monde de régression existe (le crée si absent).
 *
 * Exécuté une seule fois avant tous les tests de la suite.
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  const baseURL = process.env.E2E_FOUNDRY_BASE_URL || 'http://localhost:31001'
  const adminPassword = process.env.E2E_FOUNDRY_ADMIN_PASSWORD || ''
  const world = process.env.E2E_FOUNDRY_WORLD || 'Swerpg-Regression-World'

  if (!adminPassword) {
    throw new Error('[globalSetup] E2E_FOUNDRY_ADMIN_PASSWORD non défini — configurer .env.e2e.regression')
  }

  console.log(`[globalSetup] Instance: ${baseURL}`)
  console.log(`[globalSetup] Monde cible: "${world}"`)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await ensureWorldExists(page, { baseURL, adminPassword, world })
    console.log('[globalSetup] ✅ Prêt pour les tests de non-régression')
  } finally {
    await browser.close()
  }
}
