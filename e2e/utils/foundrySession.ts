import { Page } from '@playwright/test'

export interface FoundrySessionOptions {
  baseURL: string
  adminPassword: string
  username: string
  password: string
  world: string
}

export async function gotoSetup(page: Page, baseURL: string, adminPassword: string): Promise<void> {
  try {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 })
  } catch (error) {
    throw new Error(
      `Foundry instance unreachable at ${baseURL}. ` +
        `Please ensure Foundry VTT is running and accessible. ` +
        `Check E2E_FOUNDRY_BASE_URL in your .env.e2e.local file. ` +
        `Original error: ${(error as Error).message}`
    )
  }

  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(1000)

  const adminPasswordInput = page.locator('input[name="adminPassword"], input[type="password"]').first()
  const isAdminAuthPage = await adminPasswordInput.isVisible({ timeout: 3000 }).catch(() => false)

  if (isAdminAuthPage) {
    await adminPasswordInput.fill(adminPassword)
    const loginButton = page.getByRole('button', { name: /LOG IN/i })
    await loginButton.click()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    await page.waitForTimeout(2000)
  }

  try {
    await page.getByRole('heading', { name: /Foundry Virtual Tabletop/i }).waitFor({ timeout: 10000 })
  } catch (error) {
    throw new Error(
      `Foundry setup page not found at ${baseURL}. ` +
        `The page loaded but doesn't appear to be a Foundry VTT instance. ` +
        `Verify that Foundry is properly configured and admin password is correct.`
    )
  }
}

export async function loginAndEnterWorld(page: Page, options: FoundrySessionOptions): Promise<void> {
  const { baseURL, adminPassword, username, password, world } = options

  await gotoSetup(page, baseURL, adminPassword)
  await page.waitForLoadState('networkidle', { timeout: 30000 })
  await ensureGameWorldsTab(page)
  await launchWorld(page, world)

  const usernameField = page.getByLabel(/Username/i).first()
  const passwordField = page.getByLabel(/Password/i).first()
  const loginButton = page.getByRole('button', { name: /Login/i })

  const needsLogin = await usernameField.isVisible({ timeout: 5000 }).catch(() => false)

  if (needsLogin) {
    await usernameField.fill(username)
    await passwordField.fill(password)
    await loginButton.click()
  }

  await page.waitForURL(/.*game/, { timeout: 45000 })
  await page.waitForLoadState('networkidle', { timeout: 45000 })
}

async function ensureGameWorldsTab(page: Page): Promise<void> {
  const worldsTab = page.getByRole('tab', { name: /Game Worlds/i }).first()
  if (await worldsTab.count()) {
    await worldsTab.click()
  }
}

async function launchWorld(page: Page, world: string): Promise<void> {
  const worldFilter = page.getByPlaceholder(/Filter Worlds/i).first()
  if (await worldFilter.count()) {
    await worldFilter.fill('')
    await worldFilter.fill(world)
    await page.waitForTimeout(500)
  }

  const worldLocatorCandidates = [
    page.locator('[data-world]', { hasText: new RegExp(world, 'i') }),
    page.locator('.world', { hasText: new RegExp(world, 'i') }),
    page.locator('article', { hasText: new RegExp(world, 'i') }),
    page.locator('.package', { hasText: new RegExp(world, 'i') })
  ]

  let worldCard: ReturnType<Page['locator']> | undefined
  for (const locator of worldLocatorCandidates) {
    if (await locator.count()) {
      worldCard = locator.first()
      break
    }
  }

  if (!worldCard) {
    throw new Error(`Unable to find world tile for "${world}" on the setup page.`)
  }

  const launchButtonCandidates = [
    worldCard.getByRole('button', { name: /Launch/i }),
    worldCard.getByRole('button', { name: /Play/i }),
    worldCard.locator('button.world-launch'),
    worldCard.locator('button:has(svg[aria-label="Play"])'),
    worldCard.locator('button[data-action="launch"]')
  ]

  for (const candidate of launchButtonCandidates) {
    if (await candidate.count()) {
      await candidate.first().click()
      await page.waitForLoadState('domcontentloaded', { timeout: 30000 })
      return
    }
  }

  throw new Error(`Unable to locate launch/play button for world "${world}".`)
}
