import { chromium, FullConfig } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: process.env.E2E_ENV_FILE || '.env.e2e.documentation' })

/**
 * Global setup de la suite e2e:documentation.
 *
 * Vérifie que l'instance Foundry est accessible et que les variables
 * d'environnement requises sont présentes avant de lancer les specs.
 *
 * Fail-fast : si l'instance est inaccessible ou les vars manquantes,
 * on échoue immédiatement avec un message clair.
 *
 * Exécuté une seule fois avant toutes les specs documentation.
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  const baseURL = process.env.E2E_FOUNDRY_BASE_URL || 'http://localhost:30000'
  const adminPassword = process.env.E2E_FOUNDRY_ADMIN_PASSWORD || ''

  if (!adminPassword) {
    throw new Error(
      '[documentationSetup] E2E_FOUNDRY_ADMIN_PASSWORD non défini.\n' +
        '  → Copier .env.e2e.documentation.example en .env.e2e.documentation et remplir les valeurs.',
    )
  }

  console.log(`[documentationSetup] Instance: ${baseURL}`)
  console.log(`[documentationSetup] Monde cible: "${process.env.E2E_FOUNDRY_WORLD || '(non défini)'}"`)

  // Vérification de connectivité — pas de création ni mutation
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    const response = await page.goto(`${baseURL}/auth`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null)

    if (!response || (!response.ok() && response.status() !== 302)) {
      throw new Error(
        `[documentationSetup] Instance inaccessible sur ${baseURL}/auth (statut: ${response?.status() ?? 'aucun'}).\n` +
          `  → Vérifier que Foundry tourne sur ce port.`,
      )
    }

    console.log('[documentationSetup] Instance accessible — prêt pour les specs documentation')
  } finally {
    await browser.close()
  }
}
