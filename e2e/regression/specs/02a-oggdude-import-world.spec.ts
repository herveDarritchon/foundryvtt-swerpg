import { expect, test } from '../fixtures/oggdude'
import { verifyOggDudeWorldItems } from '../utils/oggdude-importer'

/**
 * 02 — Import OggDude : mode world (non-régression)
 *
 * Prouve que l'import en mode 'world' crée les objets attendus dans `game.items`
 * du monde actif. La case "Import to Compendium" n'est PAS interactée : le contrat
 * sémantique 'world' garantit que la checkbox reste dans son état par défaut (décochée).
 *
 * Sentinelles vérifiées :
 *   - Holdout Blaster  (weapon)
 *   - Armored Clothing (armor)
 *   - Bothan           (species)
 *
 * Pré-requis :
 *   - Instance Foundry sur port 31001 avec monde Swerpg-Regression-World
 *   - Fichier ZIP OggDude accessible via E2E_OGGDUDE_ZIP_PATH ou resources/oggdude-data.zip
 *
 * La fixture `oggdudeReady` compose `worldReady` et gère :
 *   - la connexion/déconnexion (worldReady, auto=true)
 *   - le cleanup items avant chaque import (inclus dans runImport)
 *   - la résolution du chemin ZIP
 *
 * Les packs ne sont PAS supprimés dans le cleanup world — seuls les game.items sont vidés.
 * Les items importés restent présents à la fin du test (pas d'afterEach suppression).
 */
test.describe('[regression] 02a — OggDude import (world)', () => {
  test('import world crée les sentinelles dans game.items [ci]', async ({ page, oggdude }) => {
    test.setTimeout(240_000)
    await expect(page).toHaveURL(/.*\/game/)

    // Cleanup + import complet via la fixture (mode world = sans interaction checkbox)
    await oggdude.runImport(page, 'world')

    // Vérifier les sentinelles dans game.items (monde) — aucune assertion compendium
    await verifyOggDudeWorldItems(page)
  })
})
