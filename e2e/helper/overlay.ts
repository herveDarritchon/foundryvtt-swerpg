import { Page } from '@playwright/test'

export async function dismissBackupsTourIfPresent(page: Page): Promise<void> {
    const tour = page.locator('aside.tour-center-step')
    // S’il n’y a pas de tour, on sort sans rien faire
    if (await tour.count() === 0) return

    // Bouton X en haut à droite
    const exitButton = tour.locator('[data-action="exit"]')
    await exitButton.click()

    // On attend que le tour ET l’overlay disparaissent
    await tour.waitFor({ state: 'detached' })
    const overlay = page.locator('.tour-overlay')
    if (await overlay.count()) {
        await overlay.waitFor({ state: 'detached' })
    }
}
