import { expect, test } from '../fixtures/oggdude'
import { verifyOggDudeCompendiumItems, OGGDUDE_SENTINEL_PACKS } from '../utils/oggdude-importer'

/**
 * 02b — Import OggDude : mode compendium (non-régression)
 *
 * Prouve que l'import en mode 'compendium' crée les packs world attendus et que
 * les sentinelles sont présentes dans chaque pack.
 *
 * Packs vérifiés :
 *   - world.swerpg-weapons  → Holdout Blaster
 *   - world.swerpg-armors   → Armored Clothing
 *   - world.swerpg-species  → Bothan
 *
 * Pré-requis :
 *   - Instance Foundry sur port 31001 avec monde Swerpg-Regression-World
 *   - Fichier ZIP OggDude accessible via E2E_OGGDUDE_ZIP_PATH ou resources/oggdude-data.zip
 *
 * La fixture `oggdudeReady` compose `worldReady` et gère :
 *   - la connexion/déconnexion (worldReady, auto=true)
 *   - le cleanup items + packs OggDude ciblés avant l'import (inclus dans runImport)
 *   - la résolution du chemin ZIP
 */
test.describe('[regression] 02b — OggDude import (compendium)', () => {
  test('import compendium crée les packs world OggDude avec les sentinelles [ci]', async ({ page, oggdude }) => {
    test.setTimeout(240_000)
    await expect(page).toHaveURL(/.*\/game/)

    // Cleanup (items + packs OggDude ciblés) + import complet via la fixture
    await oggdude.runImport(page, 'compendium')

    // Étape 1 : vérifier l'existence des packs world OggDude par metadata.name (world-ID-agnostic)
    const packNames = Object.values(OGGDUDE_SENTINEL_PACKS)
    for (const packName of packNames) {
      const exists = await page.evaluate((name: string) => {
        return Boolean(game?.packs?.contents?.find((p) => p.metadata.name === name && p.metadata.packageType === 'world'))
      }, packName)

      if (!exists) {
        throw new Error(`[oggdude-compendium] Expected world pack with name "${packName}" not found in game.packs`)
      }
    }

    // Étape 2 : vérifier les sentinelles dans les packs — aucune assertion game.items monde
    await verifyOggDudeCompendiumItems(page)
  })
})
