import dotenv from 'dotenv'

dotenv.config({ path: process.env.E2E_ENV_FILE || '.env.e2e.local' })

if (!process.env.E2E_FOUNDRY_BASE_URL) {
  // eslint-disable-next-line no-console
  console.error('E2E_FOUNDRY_BASE_URL is not defined. Please configure .env.e2e.local or E2E_ENV_FILE.')
  process.exit(1)
}
