import {Page} from '@playwright/test'

export async function dismissShareUsageDataIfPresent(page: Page): Promise<void> {
    const allowSharing = await page.getByRole('heading', {name: 'Allow Sharing Usage Data'});

    if (await allowSharing.count() !== 0) {
        await page.getByRole('button', {name: ' Decline Sharing'}).click();
    }
}

export async function dismissTourIfPresent(page: Page): Promise<void> {


    const declineSharing = page.getByRole('button', {name: ' Decline Sharing'});

    if (await declineSharing.count() !== 0) {
        await declineSharing.click();
    }

    // On laisse 500 ms à Foundry pour afficher ses popins
    await page.waitForTimeout(500)

    const stepButton = page.locator('.step-button').first();

    if (await stepButton.count() !== 0) {
        await stepButton.click()
    }

    // On laisse 500 ms à Foundry pour afficher ses popins
    await page.waitForTimeout(500)

    const backupsOverview = page.getByRole('heading', {name: 'Backups Overview'});
    if (await backupsOverview.count() !== 0) {
        await page.locator('.step-button').first().click();
    }

    const overlay = page.locator('.tour-overlay')
    const isVisible = await overlay.isVisible().catch(() => false)

    if (!isVisible) {
        return
    }

    // 1) On essaie les boutons "Skip", "End tour", etc.
    const closeButton = page
        .locator('button, a')
        .filter({hasText: /(Skip|End Tour|Fermer|Terminer|Ignorer)/i})
        .first()

    if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click({force: true})
        return
    }

    // 2) Si pas de bouton identifiable → on nettoie le DOM
    await page.evaluate(() => {
        document.querySelectorAll('.tour-overlay, .tour-container').forEach(el => el.remove())
    })
}
