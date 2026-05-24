import { chromium, FullConfig } from '@playwright/test'
import dotenv from 'dotenv'
import { ensureWorldExists } from '../utils/world-manager'

dotenv.config({ path: process.env.E2E_ENV_FILE || '.env.e2e.regression' })

/**
 * Global setup des tests de non-régression.
 *
 * Stratégie de reset Tier 1 (voir world-manager.ts pour le contrat complet) :
 * - monde absent → création via l'UI Foundry /setup ;
 * - monde déjà présent → validation seulement (idempotent) ;
 * - monde déjà actif (/join ou /game) → retour à /setup puis validation ;
 * - monde partiellement pollué → les specs nettoient leurs propres artefacts en teardown.
 *
 * Le globalSetup ne réinitialise PAS le contenu du monde (acteurs, items, etc.).
 * Seule l'existence du monde est garantie. Les artefacts de test sont gérés
 * par chaque spec via `deleteActorByName` (e2e/regression/utils/world-manager.ts).
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

  console.log(`[globalSetup] Instance cible: ${baseURL}`)
  console.log(`[globalSetup] Monde cible: "${world}"`)
  console.log('[globalSetup] Stratégie: monde existant conservé (cleanup par spec) — monde absent créé')

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await ensureWorldExists(page, { baseURL, adminPassword, world })
    console.log('[globalSetup] Bootstrap Tier 1 reussi — monde disponible pour les specs')
  } catch (error) {
    console.error('[globalSetup] ECHEC du bootstrap — les specs ne peuvent pas demarrer:', error)
    throw error
  } finally {
    await browser.close()
  }
}
