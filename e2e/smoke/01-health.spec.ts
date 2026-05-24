import { expect, test } from './fixtures'

/**
 * 01 — Smoke prod : santé de l'instance
 *
 * Vérifie que l'instance Foundry de production répond correctement
 * et que le système swerpg est chargé sans erreur critique.
 *
 * LECTURE SEULE — aucune mutation du monde.
 * Exécution manuelle uniquement, post-déploiement.
 */
test.describe('[smoke] 01 — health', () => {
  test("l'instance répond et charge le système swerpg", async ({ page }) => {
    await expect(page).toHaveURL(/.*\/(game|setup|join)/)
  })

  test('body.system-swerpg est présent quand le système est chargé', async ({ page }) => {
    // Ce test ne s'exécute que si E2E_FOUNDRY_WORLD est configuré et /game est atteint
    const url = page.url()
    if (!url.includes('/game')) {
      test.skip()
      return
    }

    await expect(page.locator('body.system-swerpg')).toHaveCount(1)
    await expect(page.locator('#sidebar')).toBeVisible()
  })

  test('aucune erreur console critique sur /game', async ({ page }) => {
    const url = page.url()
    if (!url.includes('/game')) {
      test.skip()
      return
    }

    const errors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    page.on('pageerror', (err) => {
      errors.push(err.message)
    })

    // Recharger la page pour capturer les erreurs au démarrage
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('body.system-swerpg')).toHaveCount(1)

    const criticalErrors = errors.filter(
      (e) =>
        // Exclure les erreurs connues non bloquantes (ex: extensions navigateur)
        !e.includes('favicon') &&
        !e.includes('chrome-extension'),
    )

    expect(criticalErrors, `Erreurs console critiques détectées : ${criticalErrors.join('\n')}`).toHaveLength(0)
  })

  test('aucun asset système critique en 404', async ({ page }) => {
    const url = page.url()
    if (!url.includes('/game')) {
      test.skip()
      return
    }

    const failed404s: string[] = []

    page.on('response', (response) => {
      if (response.status() === 404) {
        const reqUrl = response.url()
        // Surveiller les assets système swerpg uniquement
        if (reqUrl.includes('/systems/swerpg/') || reqUrl.includes('/swerpg.bundle.js') || reqUrl.includes('/swerpg.css')) {
          failed404s.push(reqUrl)
        }
      }
    })

    await page.reload({ waitUntil: 'networkidle' })

    expect(failed404s, `Assets système swerpg manquants (404) : ${failed404s.join('\n')}`).toHaveLength(0)
  })
})
