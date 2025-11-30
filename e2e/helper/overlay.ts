import {Page} from '@playwright/test'

export async function dismissShareUsageDataIfPresent(page: Page): Promise<void> {
    const allowSharing = await page.getByRole('heading', {name: 'Allow Sharing Usage Data'});

    if (await allowSharing.count() !== 0) {
        await page.getByRole('button', {name: ' Decline Sharing'}).click();
    }
}

export async function dismissBackupsTourIfPresent(page: Page): Promise<void> {

    const backupsOverview = await page.getByRole('heading', {name: 'Backups Overview'});
    if (await backupsOverview.count() !== 0) {
        await page.locator('.step-button').first().click();
    }

    const tour = page.locator('aside.tour-center-step')
    // S’il n’y a pas de tour, on sort sans rien faire
    if (await tour.count() === 0) return

    // Bouton X en haut à droite
    const exitButton = tour.locator('[data-action="exit"]')
    await exitButton.click()

    // On attend que le tour ET l’overlay disparaissent
    await tour.waitFor({state: 'detached'})
    const overlay = page.locator('.tour-overlay')
    if (await overlay.count()) {
        await overlay.waitFor({state: 'detached'})
    }
}
