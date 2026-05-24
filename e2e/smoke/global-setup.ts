import { chromium, FullConfig } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: process.env.E2E_ENV_FILE || '.env.e2e.smoke.prod' })

/**
 * Global setup des smoke tests.
 *
 * Vérifie que l'instance Foundry est accessible et que les variables
 * d'environnement sont chargées avant de lancer les 9 specs.
 *
 * Fail-fast : si l'instance est inaccessible ou les vars manquantes,
 * on échoue immédiatement avec un message clair au lieu de laisser
 * les 9 tests pendre jusqu'au timeout de 60 s chacun.
 *
 * Exécuté une seule fois avant tous les smoke tests.
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  const baseURL = process.env.E2E_FOUNDRY_BASE_URL || 'http://localhost:30000'
  const adminPassword = process.env.E2E_FOUNDRY_ADMIN_PASSWORD || ''

  if (!adminPassword) {
    throw new Error(
      '[smokeSetup] E2E_FOUNDRY_ADMIN_PASSWORD non défini.\n' +
        "  → Copier .env.e2e.smoke.prod.example en .env.e2e.smoke.prod et remplir les valeurs.",
    )
  }

  console.log(`[smokeSetup] Instance: ${baseURL}`)
  console.log(`[smokeSetup] Monde cible: "${process.env.E2E_FOUNDRY_WORLD || '(non défini — smoke sur /setup uniquement)'}"`)

  // Vérification de connectivité légère — pas de création ni mutation
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    const response = await page
      .goto(`${baseURL}/auth`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      .catch(() => null)

    if (!response || (!response.ok() && response.status() !== 302)) {
      throw new Error(
        `[smokeSetup] Instance inaccessible sur ${baseURL}/auth (statut: ${response?.status() ?? 'aucun'}).\n` +
          `  → Vérifier que Foundry tourne sur ce port.`,
      )
    }

    console.log('[smokeSetup] ✅ Instance accessible — prêt pour les smoke tests')
  } finally {
    await browser.close()
  }
}
