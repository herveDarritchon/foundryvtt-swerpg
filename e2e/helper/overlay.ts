import {Page} from '@playwright/test'

export async function dismissShareUsageDataIfPresent(page: Page): Promise<void> {
    const allowSharing = await page.getByRole('heading', {name: 'Allow Sharing Usage Data'});

    if (await allowSharing.count() !== 0) {
        await page.getByRole('button', {name: ' Decline Sharing'}).click();
    }
}

export async function dismissOverlayIfPresent(page: Page): Promise<void> {
    // Vérifier si un overlay de tour est toujours présent
    const overlay = page.locator('.tour-overlay')

    const isVisible = await overlay.isVisible().catch(() => false)

    if (!isVisible) {
        return
    }

    // on clique sur le bouton overlay pour le fermer
    await overlay.click().catch(() => {
    })
    // on appuie sur la touche échappe
    await page.keyboard.press('Escape')
}

export async function dismissTourIfPresent(page: Page): Promise<void> {
    // Fermer le bouton de partage de données si présent
    await dismissShareUsageDataIfPresent(page)

    // Attendre explicitement l'apparition du premier step button (si le tour s'affiche)
    try {
        const stepButton = page.locator('.step-button').first();
        await stepButton.waitFor({state: 'visible', timeout: 1000})
        if (await stepButton.count() !== 0) {
            await stepButton.click().catch(() => {
            })
        }
    } catch {
        // Pas de step button trouvé dans le délai → pas de tour à fermer
    }

    // Attendre explicitement l'overlay de backup si présent
    try {
        const backupsOverview = page.getByRole('heading', {name: 'Backups Overview'});
        await backupsOverview.waitFor({state: 'visible', timeout: 1000})
        if (await backupsOverview.count() !== 0) {
            await page.locator('.step-button').first().click().catch(() => {
            })
        }
    } catch {
        // Pas de backup overview → continuer
    }

    await dismissOverlayIfPresent(page)

    // 1) On essaie les boutons "Skip", "End tour", etc.
    try {
        const closeButton = page
            .locator('button, a')
            .filter({hasText: /(Skip|End Tour|Fermer|Terminer|Ignorer)/i})
            .first()

        await closeButton.waitFor({state: 'visible', timeout: 1000})
        if (await closeButton.isVisible().catch(() => false)) {
            await closeButton.click({force: true})
            return
        }
    } catch {
        // Pas de bouton de fermeture identifiable
    }

    // 2) Si pas de bouton identifiable → on nettoie le DOM
    await page.evaluate(() => {
        document.querySelectorAll('.tour-overlay, .tour-container').forEach(el => el.remove())
    }).catch(() => {
    })
}
