# Guide Playwright E2E pour Swerpg

Ce guide décrit comment exécuter et étendre la suite de tests end-to-end Playwright pour le système **Swerpg** sous Foundry VTT v13.

Il s’adresse à des développeurs déjà à l’aise avec Foundry VTT, TypeScript et Playwright.

> Pour un modèle de spec prêt à l’emploi et un guide détaillé sur la création de nouveaux scénarios E2E, voir également :
>
> - `documentation/tests/e2e/playwright-spec-squelette-mon-parcours.md`

---

## 1. Prérequis

- Node.js LTS et **pnpm** installés
- Dépendances du projet Swerpg installées
- Une instance **Foundry VTT v13+** accessible, avec un **monde de test Swerpg** configuré

Installation des dépendances projet et des navigateurs Playwright :

```bash
pnpm install
pnpm exec playwright install --with-deps
```

> Les tests E2E Playwright sont séparés des tests Vitest : `pnpm test` n’exécute **que** Vitest.

---

## 2. Configuration environnement E2E

Les tests E2E se basent sur un fichier d’environnement dédié chargé par `playwright.config.ts` :

```ts
// extrait de playwright.config.ts
dotenv.config({ path: process.env.E2E_ENV_FILE || '.env.e2e.local' })
const baseURL = process.env.E2E_FOUNDRY_BASE_URL || 'http://localhost:30000'
```

### 2.1. Création du fichier `.env.e2e.local`

1. Copier le fichier d’exemple :

```bash
cp .env.e2e.example .env.e2e.local
```

2. Adapter au besoin les variables suivantes :

- `E2E_FOUNDRY_BASE_URL` – URL de l’instance Foundry (ex. `http://localhost:30000`)
- `E2E_FOUNDRY_ADMIN_PASSWORD` – mot de passe **administrateur** Foundry (page `/auth` / `/setup`)
- `E2E_FOUNDRY_USERNAME` – nom du compte utilisé pour rejoindre la partie (ex. « Gamemaster »)
- `E2E_FOUNDRY_PASSWORD` – mot de passe de cet utilisateur (si nécessaire)
- `E2E_FOUNDRY_WORLD` – nom du **monde de test** Swerpg (ex. `swerpg-e2e`)

Les fichiers `.env.e2e*` sont ignorés par Git et ne doivent **jamais** être committés.

### 2.2. Fichier d’environnement alternatif

Il est possible de pointer vers un autre fichier d’environnement sans renommer `.env.e2e.local` :

```bash
E2E_ENV_FILE=.env.e2e.staging pnpm e2e
```

Cela permet d’utiliser des environnements Foundry distincts (local, CI, staging…) sans modifier le fichier par défaut.

---

## 3. Commandes pnpm disponibles

Les scripts E2E sont déclarés dans `package.json` :

```jsonc
"scripts": {
  ...
  "e2e": "playwright test",
  "e2e:headed": "playwright test --headed",
  "foundry:e2e:start": "bash ./scripts/e2e-foundry-start.sh start",
  "foundry:e2e:stop": "bash ./scripts/e2e-foundry-start.sh stop",
  "foundry:e2e:restart": "bash ./scripts/e2e-foundry-start.sh restart"
}
```

### 3.1. Lancer la suite complète

```bash
pnpm e2e
```

- Exécute tous les tests dans le dossier `e2e/` (chromium + firefox, cf. `playwright.config.ts`).
- Mode headless par défaut.

### 3.2. Mode headed (debug visuel)

```bash
pnpm e2e:headed
```

- Ouvre les navigateurs avec UI.
- Utile pour comprendre un scénario qui échoue ou pour mettre au point de nouveaux tests.

### 3.3. Mode UI interactif (debug avancé)

```bash
pnpm e2e:ui
```

- Ouvre l'interface Playwright UI pour déboguer interactivement les tests.
- Permet d'inspecter les étapes, de relancer des tests, et de voir les traces en temps réel.
- Recommandé pour investiguer des tests instables ou complexes.

### 3.3. Filtrer projets / fichiers / tests

Playwright accepte les mêmes options que la CLI standard :

- Cibler un **projet** (navigateur) spécifique :

  ```bash
  pnpm e2e -- --project=firefox
  pnpm e2e -- --project=chromium
  ```

- Cibler un **fichier de spec** précis :

  ```bash
  pnpm e2e -- e2e/specs/bootstrap.spec.ts
  pnpm e2e -- e2e/specs/oggdude-import.spec.ts
  ```

- Filtrer par **nom de test** (grep) :

  ```bash
  pnpm e2e -- --grep "OggDude importer"
  ```

### 3.4. Démarrer/arrêter Foundry pour les tests

Les scripts suivants pilotent une instance Foundry dédiée aux E2E (si vous avez configuré `scripts/e2e-foundry-start.sh`) :

```bash
pnpm foundry:e2e:start
pnpm foundry:e2e:stop
pnpm foundry:e2e:restart
```

Selon votre environnement, vous pouvez aussi lancer Foundry manuellement via son launcher habituel, tant qu’il est accessible à l’URL configurée dans `E2E_FOUNDRY_BASE_URL`.

---

## 4. Configuration Playwright

Le fichier `playwright.config.ts` définit la configuration commune des tests :

- `testDir: './e2e'` – racine de la suite E2E
- `workers: 1` – exécution séquentielle (évite les collisions sur la même instance Foundry)
- `timeout` – durée max d'un test (par défaut 15 min, surchargée par `PLAYWRIGHT_TEST_TIMEOUT`)
- `expect.timeout` – délai des assertions Playwright (30s par défaut, optimisé pour Chromium)
- `use.baseURL` – dérivé de `E2E_FOUNDRY_BASE_URL`
- Traces / screenshots / vidéos :
  - `trace`: `retain-on-failure` en local, `on-first-retry` en CI
  - `screenshot`: `only-on-failure`
  - `video`: `retain-on-failure`
- Projets configurés :
  - `chromium` (`Desktop Chrome`, 1920×1080)
  - `firefox` (`Desktop Firefox`, 1920×1080)

Reporter :

- En local : `list`
- En CI : `list` + `html` dans `playwright-report/`

### 4.1. Spécificités Chromium

La configuration Chromium a été optimisée pour stabiliser la gestion de session Foundry :

- **actionTimeout: 15000ms** – Timeout augmenté pour les actions UI complexes
- **launchOptions** :
  - `--disable-blink-features=AutomationControlled` – Évite la détection d'automation par Foundry
  - `--disable-features=IsolateOrigins,site-per-process` – Améliore la gestion des cookies cross-origin
- **expect.timeout: 30000ms** (global) – Augmenté pour accommoder les assertions sur dialogues/modals Foundry

Ces ajustements résolvent les problèmes de redirection vers `/join` observés lors de la navigation dans les settings système.

---

## 5. Structure des tests E2E

Le dossier `e2e/` est organisé ainsi :

- `e2e/specs/` – fichiers de tests (scénarios métiers)
  - `bootstrap.spec.ts` – test minimal qui vérifie que le monde Swerpg se charge correctement
  - `oggdude-import.spec.ts` – test UI de l’importeur OggDude
- `e2e/utils/` – utilitaires de session Foundry et helpers de setup/teardown
  - `foundrySession.ts` – primitives pour naviguer dans les écrans `/license`, `/auth`, `/setup`, `/join`, `/game`
  - `e2eTest.ts` – `setUp` / `tearDown` haut niveau, basés sur `FoundrySessionOptions`
  - `foundryUI.ts` – helpers pour interactions UI récurrentes (Game Settings, navigation système)
- `e2e/helper/`
  - `overlay.ts` – helpers pour fermer les overlays Foundry (tour, partage de données, etc.)
- `e2e/fixtures.ts` (si présent) – fixtures Playwright projet, notamment `worldReady`
- `e2e/README.md` – résumé rapide et renvoi vers ce guide détaillé

### 5.1. Fixtures et session Foundry

Les specs E2E importent les fixtures via :

```ts
import { test, expect } from '../fixtures'
```

La fixture principale (par convention nommée `worldReady`) se charge de :

- ouvrir la page `/auth` ou l’URL initiale adéquate,
- accepter la licence si nécessaire (`/license` → `accepteLicense`),
- se connecter en administrateur (`loginIntoInstance`),
- filtrer et lancer le monde Swerpg ciblé (`enterWorld`),
- rejoindre la partie en tant que MJ (`enterGameAsGamemaster`).

Ces opérations sont implémentées dans `e2e/utils/foundrySession.ts` et orchestrées par `e2e/utils/e2eTest.ts`.

En début de test, la page est donc déjà sur `/game` avec l’UI Swerpg chargée.

### 5.2. Exemple de test minimal

`e2e/specs/bootstrap.spec.ts` illustre un test de « bootstrap » très simple :

```ts
import { expect, test } from '../fixtures'

test.describe('Swerpg bootstrap', () => {
  test('should load Foundry world and display Swerpg UI element', async ({ page }) => {
    await expect(page).toHaveURL(/.*game/)

    const body = page.locator('body.system-swerpg')
    await expect(body).toHaveCount(1)
  })
})
```

### 5.3. Exemple de scénario fonctionnel

`e2e/specs/oggdude-import.spec.ts` montre un scénario plus complet basé sur des locators accessibles :

```ts
import { test, expect } from '../fixtures'

test.describe('OggDude importer', () => {
  test('should open the OggDude import interface', async ({ page }) => {
    // 1) Ouvrir Game Settings
    await page.getByRole('tab', { name: /Game Settings/i }).click({ force: true })

    // 2) Ouvrir Configure Settings
    await page.getByRole('button', { name: /Configure Settings/i }).click()

    // 3) Aller dans les réglages du système "Star Wars Edge RPG"
    await page.getByRole('button', { name: /Star Wars Edge RPG/i }).click()

    // 4) Cliquer sur la section OggDude Data Importer
    const oggDudeSection = page
      .locator('section')
      .filter({ hasText: /OggDude Data Importer/i })
      .first()
    await oggDudeSection.click()

    // 5) Ouvrir la fenêtre d'import OggDude
    await page.getByRole('button', { name: /Import data from OggDude/i }).click()

    // 6) Vérifier que l’interface d’import OggDude est bien affichée
    const fileInput = page.getByRole('button', { name: 'OggDude Zip Data File' })
    await expect(fileInput).toBeVisible()
  })
})
```

Pour un squelette générique et un guide plus détaillé sur la création d’une nouvelle spec E2E, se référer au document dédié :

- `documentation/tests/e2e/playwright-spec-squelette-mon-parcours.md`

---

## 6. Bonnes pratiques spécifiques Swerpg / Foundry

### 6.1. Locators accessibles

Toujours privilégier les locators Playwright basés sur l’accessibilité :

- `page.getByRole('button', { name: /Configure Settings/i })`
- `page.getByRole('tab', { name: /Game Settings/i })`
- `page.getByRole('combobox')`, `page.getByLabel('…')`

Avantages :

- tests plus robustes face aux refactors CSS/HTML,
- meilleure cohérence avec les bonnes pratiques a11y (labels explicites, rôles ARIA corrects).

### 6.2. Conventions Foundry

- Utiliser les **URLs symboliques** plutôt que des chemins absolus complets :
  - `/license`, `/auth`, `/setup`, `/join`, `/game`
- Tirer parti de `baseURL` configuré dans `playwright.config.ts` et utiliser `page.goto(`${options.baseURL}/auth`)` dans les helpers plutôt que de dupliquer l’URL.
- Attendre explicitement les bonnes étapes de navigation :
  - `page.waitForURL('**/setup', { waitUntil: 'domcontentloaded' })`

### 6.3. Nettoyage et stabilité

- Le helper `tearDown` (`e2e/utils/e2eTest.ts`) est prévu pour revenir à un état stable entre les tests.
- En cas d’erreur lors du cleanup, les helpers se contentent d’essayer de revenir sur `/setup` ou `/auth` sans faire échouer le test : objectif → éviter les effets de bord sur les scénarios suivants.
- Évitez de modifier à la main l’état du monde de test (suppression massive de données, changements de configuration critique) dans un test sans cleanup dédié.

### 6.4. Écriture de nouveaux tests

Pour tout nouveau test E2E :

1. **Identifier le parcours fonctionnel** MJ / joueur visé.
2. Créer un fichier `e2e/specs/mon-parcours.spec.ts`.
3. Utiliser `import { test, expect } from '../fixtures'`.
4. Se baser sur les helpers existants (la page est déjà prête en `/game`).
5. Utiliser des locators accessibles et éviter les sélecteurs CSS fragiles.
6. Garder les scénarios concentrés sur un objectif métier précis.

Pour un guide complet avec un exemple de squelette de spec et comment l’adapter à une nouvelle feature, voir :

- `documentation/tests/e2e/playwright-spec-squelette-mon-parcours.md`

---

## 7. Débogage et troubleshooting

### 7.1. Foundry inaccessible

Symptôme : les tests échouent très tôt avec des erreurs de navigation ou de timeout.

1. Vérifier que Foundry est bien lancé à l’URL attendue :

   ```bash
   echo $E2E_FOUNDRY_BASE_URL
   cat .env.e2e.local
   curl "$E2E_FOUNDRY_BASE_URL" || curl http://localhost:30000
   ```

2. Vérifier que le monde configuré dans `E2E_FOUNDRY_WORLD` existe et est jouable.
3. S’assurer que le mot de passe admin est correct (`E2E_FOUNDRY_ADMIN_PASSWORD`).

### 7.2. Problèmes de navigateurs Playwright

Si Playwright se plaint que les exécutables navigateur sont manquants :

```bash
pnpm exec playwright install --with-deps
```

### 7.3. Timeouts, surtout en mode headed

- Les tests headed sont parfois plus lents (latence UI humaine, animations, etc.).
- Adaptez les timeouts via les variables d’environnement si nécessaire :

  ```bash
  PLAYWRIGHT_TEST_TIMEOUT=1200000 PLAYWRIGHT_EXPECT_TIMEOUT=30000 pnpm e2e:headed
  ```

### 7.4. Inspection et traces de tests

Pour ouvrir l’UI Playwright et déboguer interactivement :

```bash
pnpm exec playwright test --ui
```

Pour analyser une trace générée (par défaut conservée en cas d’échec) :

```bash
pnpm exec playwright show-trace test-results/path-to-trace/trace.zip
```

Les rapports HTML sont générés (en CI) dans `playwright-report/`.

### 7.5. Tests instables (flaky)

- Éviter les `page.waitForTimeout()` au profit d’assertions web-first (`expect(locator).toBeVisible()`, `toHaveURL`, etc.).
- Vérifier que les selectors ne dépendent pas de textes mouvants ou de structures trop fragiles.
- En cas de flakiness persistante, augmenter légèrement `retries` ou investiguer les temps de réponse de Foundry.

### 7.6. Raccourcis utiles pour debug et génération de tests

Voici quelques commandes rapides et utiles pour déboguer, visualiser les rapports, et générer des scénarios Playwright : elles sont pratiques lors du développement local des tests.

- Debug avec l'inspecteur Playwright :

  ```bash
  npx playwright test --debug
  ```

  Lance l’inspecteur interactif qui met en pause l’exécution et permet d’inspecter les pages, pas à pas; utile pour comprendre l’état DOM et le timing d’un test.

- Mode UI (interface graphique de Playwright) :

  ```bash
  npx playwright test --ui
  ```

  Ouvre l’interface Playwright (liste de tests, pas-à-pas, relances) pour naviguer visuellement dans les exécutions et ré-exécuter des étapes.

- Visualiser les rapports HTML générés :

  ```bash
  npx playwright show-report
  ```

  Ouvre le rapport HTML (généralement `playwright-report/`) pour examiner résultats, traces, captures et vidéos d’un run.

- Générer un test interactif à partir d’une session navigateur (Playwright Codegen) :

  ```bash
  npx playwright codegen demo.playwright.dev/todomvc
  ```

  Ouvre une fenêtre instrumentée et enregistre vos actions pour produire un scénario de test (très utile pour prototyper un spec ou exporter des locators).

Remarque : si vous utilisez `pnpm` dans ce projet, vous pouvez remplacer `npx` par `pnpm exec` (par ex. `pnpm exec playwright test --debug`).

---

## 8. Résumé

- Les tests Playwright E2E vivent dans `e2e/` et s’exécutent via `pnpm e2e` / `pnpm e2e:headed`.
- La configuration est centralisée dans `playwright.config.ts` et dans un fichier `.env.e2e.local` (ou autre via `E2E_ENV_FILE`).
- Les helpers `foundrySession.ts`, `e2eTest.ts` et les fixtures partagées encapsulent toute la logique de connexion et de lancement du monde Swerpg.
- Les scénarios doivent rester courts, robustes, et utiliser des locators accessibles.

Cette documentation a été mise à jour pour refléter l’état actuel de la configuration Playwright et de la suite E2E. Pensez à la compléter à chaque ajout de nouveaux scénarios majeurs ou de nouvelles conventions de test.
