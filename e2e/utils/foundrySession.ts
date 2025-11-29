import { Page } from '@playwright/test'

export interface FoundrySessionOptions {
  baseURL: string
  username: string
  password: string
  world: string
}

export async function gotoSetup(page: Page, baseURL: string): Promise<void> {
  await page.goto(baseURL)
  await page.getByRole('heading', { name: /Foundry Virtual Tabletop/i }).waitFor()
}

export async function loginAndEnterWorld(page: Page, options: FoundrySessionOptions): Promise<void> {
  const { baseURL, username, password, world } = options

  await gotoSetup(page, baseURL)

  await page.getByRole('link', { name: /Configuration/i }).click()
  await page.getByRole('link', { name: new RegExp(world, 'i') }).click()

  await page.getByLabel(/Username/i).fill(username)
  await page.getByLabel(/Password/i).fill(password)
  await page.getByRole('button', { name: /Login/i }).click()

  await page.waitForURL(/.*game/)
}
