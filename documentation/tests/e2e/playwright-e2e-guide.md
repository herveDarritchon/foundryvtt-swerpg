# Guide Playwright E2E pour Swerpg

Ce guide décrit comment exécuter et étendre la suite de tests end-to-end Playwright pour le système **Swerpg** sous Foundry VTT v14.

Il s’adresse à des développeurs déjà à l’aise avec Foundry VTT, TypeScript et Playwright.

> Pour un modèle de spec prêt à l’emploi et un guide détaillé sur la création de nouveaux scénarios E2E, voir également :
>
> - `documentation/tests/e2e/playwright-spec-squelette-mon-parcours.md`

---

## Contrat des commandes E2E

La suite E2E repose sur trois commandes aux rôles distincts.

### `pnpm e2e` — campagne complète (orchestrateur)

**Rôle** : orchestre les deux suites dans l'ordre `regression` puis `smoke`.

**Usage** : quand les prérequis des deux suites sont disponibles et qu'on veut une campagne E2E complète.

Chaque sous-suite charge son propre fichier d'environnement. Les deux instances Foundry doivent être
opérationnelles avant de lancer cette commande.

**Ce que `pnpm e2e` n'est pas** : un test rapide local. Ne pas l'utiliser quand seule une des deux instances est disponible.

### `pnpm e2e:regression` — validation fonctionnelle pré-livraison

- **Instance** : Foundry E2E dédiée, port 31001
- **Monde** : monde contrôlé et jetable (`Swerpg-Regression-World`)
- **Usage** : avant merge important, avant release, en campagne locale dédiée
- **Mutations** : autorisées, persistance vérifiée
- **Config** : `.env.e2e.regression` (copier depuis `.env.e2e.regression.example`)
- **Commandes** : `pnpm e2e:regression`, `pnpm e2e:regression:headed`, `pnpm e2e:regression:ui`

**Cette suite remplace les campagnes QA manuelles répétitives sur le périmètre couvert.**

### `pnpm e2e:smoke` — vérification de surface (manuelle)

- **Instance** : instance de production, port 30000
- **Monde** : monde stable (`test-v14-309` ou équivalent)
- **Usage** : exécution manuelle, post-déploiement ou contrôle de surface rapide
- **Mutations** : interdites — lecture seule stricte
- **Config** : `.env.e2e.smoke.prod` (copier depuis `.env.e2e.smoke.prod.example`)
- **Commandes** : `pnpm e2e:smoke`, `pnpm e2e:smoke:headed`

**Cette suite remplace les checks manuels basiques de surface post-déploiement.**

### `pnpm e2e:documentation` — validation documentaire (manuelle)

- **Instance** : instance dédiée stable, port 30000 — **jamais sur production partagée ni environnement client actif**
- **Monde** : monde dédié stable (`documentation-world` recommandé, distinct de la production et du monde de régression)
- **Usage** : exécution manuelle lors de mise à jour de documentation, refactor UI, ou validation de stabilité documentaire
- **Mutations** : lecture seule par défaut — prérequis contrôlés autorisés si documentés dans la spec
- **Caractère** : **non bloquante** — ne fait partie d'aucun pipeline CI, ne conditionne aucun merge ni aucune release
- **Config** : `.env.e2e.documentation` (copier depuis `.env.e2e.documentation.example`)
- **Commandes** : `pnpm e2e:documentation`, `pnpm e2e:documentation:headed`, `pnpm e2e:documentation:ui`

**Périmètre** : parcours documentables (feuilles d'acteur, interfaces clés), invariants visibles (i18n, absence de placeholder cassé), absence d'erreurs navigateur inattendues dans les zones documentées.

**Non-objectifs** : la suite `e2e:documentation` ne valide pas les features fonctionnelles (rôle de `e2e:regression`), ne vérifie pas la santé de surface de production (rôle de `e2e:smoke`), ne conditionne aucun merge ni aucune release.

**Mode rerun documentaire** :

| Situation | Action |
|---|---|
| Mise à jour d'un parcours (spec, UI, données) | `pnpm e2e:documentation` puis `pnpm docs:generate-user-guides` |
| Seule la mise en forme Markdown change | `pnpm docs:generate-user-guides` uniquement — pas de rerun Playwright |
| Artefacts JSON ou screenshots absents | Rerun Playwright obligatoire avant toute génération |

**Frontière avec `regression` et `smoke`** :

| Critère | `documentation` | `regression` | `smoke` |
|---|---|---|---|
| Objectif | Captures documentaires, invariants visibles | Validation fonctionnelle pré-livraison | Santé de surface post-déploiement |
| Mutations | Lecture seule par défaut (prérequis contrôlés documentés) | Autorisées | Interdites |
| Instance cible | Port 30000 | Port 31001 | Port 30000 |
| Monde | Dédié stable (`documentation-world`) | Contrôlé jetable | Production stable |
| Niveau de confiance | Documentaire — invariants visibles seulement | Validation fonctionnelle profonde | Santé minimale de surface |
| Statut CI | Non — manuel uniquement | Non — manuel uniquement | Non — manuel uniquement |
| Bloquant | Non | Oui (pré-livraison) | Non (diagnostic) |

**Gouvernance** :

| Périmètre | Responsable |
|---|---|
| Parcours Playwright, screenshots, monde documentaire | Dev / QA |
| Relecture métier et validation des guides générés | Documentation / PO |
| Décision de publication d'un guide | Documentation / PO (exclusivement) |

Pour le contrat d'exploitation complet (rerun, prérequis, gouvernance, critères de clôture), voir `e2e/documentation/README.md`.

### Frontière CI / local manuel

Les suites `regression` et `smoke` ne tournent **jamais** en CI GitHub Actions.
Elles nécessitent une machine locale adaptée (GPU, performances navigateur, instance Foundry live).

Seuls les tests marqués `[ci]` dans leur titre (via `pnpm e2e:ci`) tournent en CI.

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
  // Campagne complète — orchestre regression puis smoke (les deux instances doivent être disponibles)
  "e2e": "pnpm run e2e:regression && pnpm run e2e:smoke",
  // CI uniquement — tests marqués [ci], instance dev port 30000
  "e2e:ci": "playwright test --config playwright.config.ts --project=chromium --grep \"\\[ci\\]\"",
  // Régression fonctionnelle pré-livraison (instance dédiée, port 31001)
  "e2e:regression": "playwright test --config playwright.regression.config.ts",
  "e2e:regression:headed": "playwright test --config playwright.regression.config.ts --headed",
  "e2e:regression:ui": "playwright test --config playwright.regression.config.ts --ui",
  // Smoke de surface post-déploiement (instance prod, port 30000 — manuel uniquement)
  "e2e:smoke": "playwright test --config playwright.smoke.config.ts",
  "e2e:smoke:headed": "playwright test --config playwright.smoke.config.ts --headed",
  // Documentation — captures documentaires et invariants visibles (manuel uniquement)
  "e2e:documentation": "playwright test --config playwright.documentation.config.ts",
  "e2e:documentation:headed": "playwright test --config playwright.documentation.config.ts --headed",
  "e2e:documentation:ui": "playwright test --config playwright.documentation.config.ts --ui",
  // Instance Foundry dédiée E2E
  "foundry:e2e:start": "bash ./scripts/e2e-foundry-start.sh start",
  "foundry:e2e:stop": "bash ./scripts/e2e-foundry-start.sh stop",
  "foundry:e2e:restart": "bash ./scripts/e2e-foundry-start.sh restart"
}
```

### 3.1. Campagne E2E complète

```bash
pnpm e2e
```

- Orchestre `e2e:regression` puis `e2e:smoke`.
- Les deux instances Foundry (port 31001 et port 30000) doivent être opérationnelles.
- Chaque sous-suite charge son propre fichier d'environnement (`.env.e2e.regression` et `.env.e2e.smoke.prod`).
- Ne pas utiliser comme commande de dev ordinaire si l'instance smoke n'est pas disponible.

### 3.2. Suite de régression seule

```bash
pnpm e2e:regression
pnpm e2e:regression:headed
pnpm e2e:regression:ui
```

- Valide les workflows fonctionnels sur l'instance dédiée port 31001.
- Usage habituel avant merge ou release.

### 3.3. Suite smoke seule

```bash
pnpm e2e:smoke
pnpm e2e:smoke:headed
```

- Vérifie la santé de surface de l'instance de production port 30000.
- Exécution manuelle uniquement, post-déploiement ou contrôle rapide.

### 3.4. Mode UI interactif (debug avancé)

```bash
pnpm e2e:regression:ui
```

- Ouvre l'interface Playwright UI pour déboguer interactivement les tests de régression.
- Permet d'inspecter les étapes, de relancer des tests, et de voir les traces en temps réel.
- Recommandé pour investiguer des tests instables ou complexes.

### 3.5. Filtrer projets / fichiers / tests

Passer des options supplémentaires directement à la sous-suite ciblée :

- Cibler un **fichier de spec** précis (régression) :

  ```bash
  pnpm e2e:regression -- e2e/regression/specs/02-oggdude-import.spec.ts
  ```

- Filtrer par **nom de test** (grep) dans la régression :

  ```bash
  pnpm e2e:regression -- --grep "OggDude importer"
  ```

- Cibler un **fichier de spec** smoke :

  ```bash
  pnpm e2e:smoke -- e2e/smoke/01-health.spec.ts
  ```

### 3.6. Démarrer/arrêter Foundry pour les tests

Les scripts suivants pilotent une instance Foundry dédiée aux E2E (si vous avez configuré `scripts/e2e-foundry-start.sh`) :

```bash
pnpm foundry:e2e:start
pnpm foundry:e2e:stop
pnpm foundry:e2e:restart
```

Selon votre environnement, vous pouvez aussi lancer Foundry manuellement via son launcher habituel, tant qu’il est accessible à l’URL configurée dans `E2E_FOUNDRY_BASE_URL`.

---

## 4. Configuration Playwright

Trois fichiers de configuration Playwright coexistent, un par commande :

| Config | Commande | Suite | Instance | Env file |
|---|---|---|---|---|
| `playwright.config.ts` | `e2e:ci` | tests `[ci]` uniquement | port 30000 | `.env.e2e.local` |
| `playwright.regression.config.ts` | `e2e:regression` | régression fonctionnelle | port 31001 | `.env.e2e.regression` |
| `playwright.smoke.config.ts` | `e2e:smoke` | smoke de surface | port 30000 | `.env.e2e.smoke.prod` |
| `playwright.documentation.config.ts` | `e2e:documentation` | captures documentaires | port 30000 | `.env.e2e.documentation` |

La commande `pnpm e2e` ne possède pas de config propre : elle orchestre `e2e:regression` puis `e2e:smoke`,
chacune chargeant son propre fichier d'environnement.

**`playwright.regression.config.ts`** :

- `testDir: './e2e/regression/specs'`
- `workers: 1` – exécution séquentielle
- `timeout: 120000ms` – délais plus longs pour les workflows complets
- `use.baseURL` – dérivé de `E2E_FOUNDRY_BASE_URL` (port 31001 par défaut)
- Traces / screenshots / vidéos conservés en cas d'échec

**`playwright.smoke.config.ts`** :

- `testDir: './e2e/smoke'`
- `workers: 1`
- `timeout: 60000ms` – délais courts, tests de surface rapides
- `use.baseURL` – dérivé de `E2E_FOUNDRY_BASE_URL` (port 30000 par défaut)
- `acceptDownloads: false` – lecture seule stricte

**`playwright.documentation.config.ts`** :

- `testDir: './e2e/documentation/specs'`
- `workers: 1`
- `timeout: 90000ms` – délais généreux pour les parcours documentaires
- `use.baseURL` – dérivé de `E2E_FOUNDRY_BASE_URL` (port 30000 par défaut)
- `trace: 'on'` et `screenshot: 'on'` – captures systématiques (pas seulement en échec)
- `acceptDownloads: false` – lecture seule par défaut

**`playwright.config.ts`** (CI uniquement) :

- `testDir: './e2e'` – racine générale
- Projets : `chromium` + `firefox`
- Reporter CI : `list` + `html` dans `playwright-report/`

Reporter :

- `regression` (local) : `list` + `html` dans `playwright-regression-report/` — systématiquement généré
- `smoke` (local) : `list` + `html` dans `playwright-smoke-report/` — systématiquement généré
- `documentation` (local) : `list` + `html` dans `playwright-documentation-report/` — systématiquement généré
- `e2e:ci` : `list` + `html` dans `playwright-report/` (héritage config `playwright.config.ts`) — non pertinent en pratique car Playwright ne tourne pas en CI

> Les suites `regression` et `smoke` ne tournent **jamais** en CI. Le report HTML est donc un artefact local de diagnostic et de preuve de validation.

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

Le dossier `e2e/` est organisé selon la taxonomie `smoke` / `regression` :

```
e2e/
  smoke/                  # Suite smoke — vérification de surface (lecture seule)
    fixtures.ts           # Fixture smokeReady — navigation sans mutation
    global-setup.ts       # Setup global smoke
    01-health.spec.ts     # Santé de l'instance, erreurs console, 404 système
    02-surfaces.spec.ts   # Surfaces UI critiques, i18n, placeholders
  regression/             # Suite regression — validation fonctionnelle pré-livraison
    fixtures/
      global-setup.ts     # Bootstrap monde de régression
    specs/
      01-smoke.spec.ts           # Santé de base sur instance de régression
      02-oggdude-import.spec.ts  # Import OggDude complet
    utils/
      oggdude-importer.ts
      world-manager.ts
  documentation/          # Suite documentation — captures documentaires et invariants visibles
    fixtures.ts           # Fixture documentationReady — navigation, lecture seule par défaut
    global-setup.ts       # Vérification de connectivité avant les specs
    specs/                # Specs documentation — un fichier par domaine documenté
    utils/                # Helpers spécifiques à la suite documentation
    README.md
  specs/                  # Specs legacy / [ci] — à requalifier progressivement
    bootstrap.spec.ts          # → candidat regression (santé de base)
    oggdude-import.spec.ts     # → candidat regression (import fonctionnel)
  fixtures/               # Fixtures partagées (worldReady) pour specs/ legacy
    index.ts
    global-setup.ts
  helper/
    overlay.ts            # Fermeture des overlays Foundry
  utils/                  # Helpers de session communs aux suites
    foundrySession.ts
    foundryUI.ts
    playwrightTest.ts
  README.md
  tsconfig.json
```

**Règle de destination pour chaque spec** :

- vérifie une surface sans mutation → `e2e/smoke/`
- valide un workflow fonctionnel ou une feature → `e2e/regression/specs/`
- produit des captures documentaires ou valide des invariants visibles → `e2e/documentation/specs/`
- test `[ci]` en attente de migration → `e2e/specs/` (temporaire)

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

Ces opérations sont implémentées dans `e2e/utils/foundrySession.ts` et orchestrées par `e2e/utils/playwrightTest.ts`.

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

## 6. Contrat d'interaction et capture d'erreurs navigateur

### 6.1. Helpers d'interaction centralisés

Toutes les interactions critiques avec Foundry doivent passer par les helpers communs plutôt que d'être dupliquées dans chaque spec.

| Helper | Fichier | Usage |
|---|---|---|
| `setUp` / `tearDown` | `e2e/utils/playwrightTest.ts` | Bootstrap complet `licence → auth → setup → join → game` |
| `ensureSessionActive` | `e2e/utils/foundryUI.ts` | Vérification que la session `/game` est toujours active |
| `openGameSettings` | `e2e/utils/foundryUI.ts` | Ouverture de l'onglet Settings dans la sidebar |
| `navigateToSystemSettings` | `e2e/utils/foundryUI.ts` | Navigation complète vers les settings d'un système |
| `openOggDudeImporterDialog` | `e2e/regression/utils/oggdude-importer.ts` | Ouverture du dialog OggDude depuis les settings |
| `createBrowserErrorCollector` | `e2e/utils/browserErrors.ts` | Capture centralisée des erreurs navigateur |

Ne pas réimplémenter ces helpers dans les specs. Si un helper manque, l'ajouter dans le fichier centralisé.

### 6.2. Politique de capture des erreurs navigateur

Toute spec de régression et toute spec legacy active doit détecter les erreurs navigateur inattendues.

#### Contrat imposé par la fixture

Les fixtures `worldReady` (`e2e/fixtures/index.ts`) et `smokeReady` (`e2e/smoke/fixtures.ts`) branchent automatiquement un collecteur d'erreurs (`createBrowserErrorCollector`) avant le setUp. À la fin de chaque test, elles appellent `assertNoErrors` pour faire échouer explicitement si une erreur non autorisée a été captée.

**Conséquence : aucun listener `page.on('console')` ou `page.on('pageerror')` ad hoc n'est nécessaire dans les specs qui consomment ces fixtures.**

#### Utilisation explicite dans un test (cas avancé)

Si un test a besoin d'isoler les erreurs d'une étape précise (par exemple après rechargement de page) :

```ts
import { createBrowserErrorCollector } from '../../utils/browserErrors'

test('aucune erreur après rechargement', async ({ page }) => {
  const errorCollector = createBrowserErrorCollector(page)

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('body.system-swerpg')).toHaveCount(1)

  errorCollector.assertNoErrors('rechargement /game')
})
```

#### Politique de filtrage

Les patterns suivants sont filtrés automatiquement comme bruits connus (définis dans `e2e/utils/browserErrors.ts`) :

- `/favicon/i`
- `/chrome-extension:/i`
- `/moz-extension:/i`
- `/No module named/i`

Pour ajouter un nouveau pattern de bruit maîtrisé, modifier `KNOWN_NOISE_PATTERNS` dans `e2e/utils/browserErrors.ts` et documenter pourquoi ce bruit est ignoré.

Ne jamais élargir cette liste pour masquer de vraies régressions.

#### Checklist pour toute nouvelle spec regression ou legacy

- [ ] La spec importe depuis `../../fixtures` (regression) ou `./fixtures` (smoke) — ne pas créer de fixture locale.
- [ ] Aucun listener `page.on('console')` ou `page.on('pageerror')` ad hoc dans la spec (sauf cas documenté).
- [ ] Les interactions critiques utilisent les helpers de `foundryUI.ts` et `foundrySession.ts`.
- [ ] `ensureSessionActive` est appelé avant toute séquence longue (settings, import, navigation complexe).
- [ ] Pas de `waitForTimeout` comme synchronisation — utiliser des assertions web-first.
- [ ] Pas de `click({ force: true })` sans justification écrite.

---

## 7. Bonnes pratiques spécifiques Swerpg / Foundry

### 7.1. Locators accessibles

Toujours privilégier les locators Playwright basés sur l’accessibilité :

- `page.getByRole('button', { name: /Configure Settings/i })`
- `page.getByRole('tab', { name: /Game Settings/i })`
- `page.getByRole('combobox')`, `page.getByLabel('…')`

Avantages :

- tests plus robustes face aux refactors CSS/HTML,
- meilleure cohérence avec les bonnes pratiques a11y (labels explicites, rôles ARIA corrects).

### 7.2. Conventions Foundry

- Utiliser les **URLs symboliques** plutôt que des chemins absolus complets :
  - `/license`, `/auth`, `/setup`, `/join`, `/game`
- Tirer parti de `baseURL` configuré dans `playwright.config.ts` et utiliser `page.goto(`${options.baseURL}/auth`)` dans les helpers plutôt que de dupliquer l’URL.
- Attendre explicitement les bonnes étapes de navigation :
  - `page.waitForURL('**/setup', { waitUntil: 'domcontentloaded' })`

### 7.3. Nettoyage et stabilité

- Le helper `tearDown` (`e2e/utils/playwrightTest.ts`) est prévu pour revenir à un état stable entre les tests.
- En cas d’erreur lors du cleanup, les helpers se contentent d’essayer de revenir sur `/setup` ou `/auth` sans faire échouer le test : objectif → éviter les effets de bord sur les scénarios suivants.
- Évitez de modifier à la main l’état du monde de test (suppression massive de données, changements de configuration critique) dans un test sans cleanup dédié.


### 7.3b. Stratégie de reset déterministe Tier 1 (contrat d’hygiène)

La suite de régression Tier 1 applique un **cleanup ciblé par spec** (pas de recréation du monde).

#### Décision

| Approche | Décision |
|---|---|
| Monde jetable recréé à chaque run | Non retenu — trop lent, masque les régressions de persistance |
| Cleanup ciblé par spec | **Retenu** — rapide, déterministe, préserve la baseline commune |

#### Règles à respecter

1. **Noms uniques horodatés** : utiliser `<Prefixe>-${Date.now()}` pour tout artefact créé par une spec.
2. **Teardown explicite** : appeler `deleteActorByName(page, actorName)` après les assertions du test, avant que la fixture `worldReady` ne clôture la session.
3. **Pas de dépendance inter-specs** : chaque spec doit fonctionner seule, dans n’importe quel ordre, même sur un monde déjà existant.
4. **Bootstrap idempotent** : le `globalSetup` crée le monde s’il est absent, ne fait rien s’il est présent — il ne réinitialise pas le contenu.

#### Primitives disponibles

| Fonction | Fichier | Usage |
|---|---|---|
| `deleteActorByName(page, name)` | `e2e/regression/utils/world-manager.ts` | Supprimer un acteur en fin de test |
| `cleanupTestActors(page, prefix)` | `e2e/regression/utils/world-manager.ts` | Nettoyer des artefacts résiduels par préfixe |

#### Exemple de teardown dans une spec

```ts
test('création personnage et ouverture de fiche', async ({ page }) => {
  const actorName = `Test-Personnage-${Date.now()}`

  // ... Act et Assert ...

  // Teardown : supprimer l’artefact de test pour ne pas polluer le monde
  await deleteActorByName(page, actorName)
})
```

#### Données minimales par domaine

| Spec | Données communes attendues | Artefacts éphémères |
|---|---|---|
| 01 — smoke | monde actif, système swerpg chargé | aucun |
| 02 — OggDude import | monde actif, settings accessibles | aucun |
| 03 — création personnage | monde actif | acteurs `Test-Personnage-*` |
| 04 — XP / arbre | monde actif | acteurs `Test-XP-*`, `Test-XP-Skill-*`, `Test-SpecTree-*` |

### 7.4. Écriture de nouveaux tests

Pour tout nouveau test E2E :

1. **Identifier le parcours fonctionnel** MJ / joueur visé.
2. **Choisir la destination** selon le type de test :
   - vérification de surface, lecture seule → `e2e/smoke/`
   - workflow fonctionnel ou feature → `e2e/regression/specs/`
   - captures documentaires ou invariants visibles → `e2e/documentation/specs/`
   - test `[ci]` legacy en attente de migration → `e2e/specs/` (temporaire)
3. Créer le fichier dans le dossier approprié.
4. Importer les fixtures de la suite : `import { test, expect } from '../fixtures'` (regression) ou `import { test, expect } from './fixtures'` (smoke) ou `import { test, expect } from '../fixtures'` (documentation).
5. Se baser sur les helpers existants (la page est déjà prête en `/game`).
6. Utiliser des locators accessibles et éviter les sélecteurs CSS fragiles.
7. Garder les scénarios concentrés sur un objectif métier précis.

Pour un guide complet avec un exemple de squelette de spec et comment l’adapter à une nouvelle feature, voir :

- `documentation/tests/e2e/playwright-spec-squelette-mon-parcours.md`

---

## 8. Débogage et troubleshooting

### 8.1. Foundry inaccessible

Symptôme : les tests échouent très tôt avec des erreurs de navigation ou de timeout.

1. Vérifier que Foundry est bien lancé à l’URL attendue :

   ```bash
   echo $E2E_FOUNDRY_BASE_URL
   cat .env.e2e.local
   curl "$E2E_FOUNDRY_BASE_URL" || curl http://localhost:30000
   ```

2. Vérifier que le monde configuré dans `E2E_FOUNDRY_WORLD` existe et est jouable.
3. S’assurer que le mot de passe admin est correct (`E2E_FOUNDRY_ADMIN_PASSWORD`).

### 8.2. Problèmes de navigateurs Playwright

Si Playwright se plaint que les exécutables navigateur sont manquants :

```bash
pnpm exec playwright install --with-deps
```

### 8.3. Timeouts, surtout en mode headed

- Les tests headed sont parfois plus lents (latence UI humaine, animations, etc.).
- Adaptez les timeouts via les variables d’environnement si nécessaire :

  ```bash
  PLAYWRIGHT_TEST_TIMEOUT=1200000 PLAYWRIGHT_EXPECT_TIMEOUT=30000 pnpm e2e:regression:headed
  ```

### 8.4. Inspection et traces de tests

Pour ouvrir l’UI Playwright et déboguer interactivement :

```bash
pnpm exec playwright test --ui
```

Pour analyser une trace générée (par défaut conservée en cas d’échec) :

```bash
pnpm exec playwright show-trace test-results/path-to-trace/trace.zip
```

Les rapports HTML sont générés systématiquement lors de tout run local dans `playwright-regression-report/` (suite regression), `playwright-smoke-report/` (suite smoke) et `playwright-documentation-report/` (suite documentation) :

```bash
pnpm exec playwright show-report playwright-regression-report
pnpm exec playwright show-report playwright-smoke-report
pnpm exec playwright show-report playwright-documentation-report
```

### 8.5. Tests instables (flaky)

- Éviter les `page.waitForTimeout()` au profit d’assertions web-first (`expect(locator).toBeVisible()`, `toHaveURL`, etc.).
- Vérifier que les selectors ne dépendent pas de textes mouvants ou de structures trop fragiles.
- En cas de flakiness persistante, augmenter légèrement `retries` ou investiguer les temps de réponse de Foundry.

### 8.6. Raccourcis utiles pour debug et génération de tests

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

## 9. Matrice de couverture E2E

La matrice de couverture officielle reliant domaines fonctionnels, parcours critiques et specs Playwright se trouve dans :

- `documentation/tests/e2e/couverture-e2e-matrice.md`

Elle liste les parcours couverts par suite (`regression`, `smoke`, `[ci]`), les relais Vitest pour les couches pures, et les trous de couverture acceptés. Mettre ce document à jour à chaque ajout ou déplacement de spec.

---

## 10. Checklist de validation et clôture PWE6

Cette checklist permet de conclure qu'une campagne E2E est valide et que la stratégie à deux étages est effectivement stabilisée.

### Ordre de validation recommandé

1. Lancer la suite `regression` et vérifier tous les parcours PWE3 / PWE4 :

   ```bash
   pnpm e2e:regression
   ```

2. Lancer la suite `smoke` et vérifier la lecture seule sans erreur inattendue :

   ```bash
   pnpm e2e:smoke
   ```

3. Vérifier les specs `[ci]` legacy si un changement les concerne :

   ```bash
   pnpm e2e:ci
   ```

### Signaux de clôture

- [ ] Aucune erreur navigateur inattendue (ni `console.error` non filtré, ni `pageerror`) dans `regression` ni dans `smoke`.
- [ ] Matrice de couverture (`couverture-e2e-matrice.md`) à jour avec toutes les specs actives.
- [ ] Commandes `pnpm e2e:regression` et `pnpm e2e:smoke` alignées avec les configs `playwright.regression.config.ts` et `playwright.smoke.config.ts`.
- [ ] Fichiers d'environnement `.env.e2e.regression` et `.env.e2e.smoke.prod` documentés et exemples à jour.
- [ ] Frontière CI documentée : `regression`, `smoke` et `documentation` ne tournent jamais en CI — seul `e2e:ci` est autorisé en pipeline.
- [ ] Report HTML généré et vérifiable après chaque run local :
  - `playwright-regression-report/` après `pnpm e2e:regression`
  - `playwright-smoke-report/` après `pnpm e2e:smoke`
  - `playwright-documentation-report/` après `pnpm e2e:documentation`
- [ ] Artefacts d'échec (traces, screenshots, vidéos) retrouvables depuis le report HTML en cas d'échec.
- [ ] Trous de couverture restants explicitement listés dans `couverture-e2e-matrice.md` section 3 (non confondus avec des oublis).

### Signaux de clôture spécifiques à `e2e:documentation`

- [ ] Mode rerun documentaire explicite : commandes canoniques, prérequis, monde dédié, cas où seule la génération Markdown doit être relancée.
- [ ] Rôles de gouvernance clairs : Dev/QA (parcours, screenshots, monde) — Documentation/PO (relecture métier, validation, publication).
- [ ] Suite documentée comme non bloquante, non CI, et distincte de `smoke` / `regression`.
- [ ] Recommandation explicite contre l'exécution sur production ou environnement client partagé.
- [ ] Matrice de frontière à jour dans `e2e/README.md`, `e2e/documentation/README.md` et ce guide.

### Ouvrir les reports HTML

```bash
pnpm exec playwright show-report playwright-regression-report
pnpm exec playwright show-report playwright-smoke-report
```

---

## 11. Clôture EDG6 — Stabilité des captures, sûreté des données et checklist de release

Cette section formalise les critères de sortie du chantier `e2e:documentation` (EDG6) et complète le contrat de qualité documentaire.

Pour la checklist complète et exécutable, voir : `documentation/tests/e2e/edg6-release-checklist.md`

### 11.1. Contrat de stabilité des captures

Pour qu'un guide soit reproductible et diffable, les invariants suivants doivent tenir entre deux reruns identiques :

| Invariant | Mécanisme |
|---|---|
| Ordre des captures | Préfixe d'index `01-`, `02-`, `03-`, `04-` — incrémenté dans l'ordre des étapes |
| Viewport constant | `1920×1080` fixé dans `playwright.documentation.config.ts` |
| Nommage déterministe | Slugs kebab-case stables via `toKebabSlug` — pas d'horodatage ni d'aléatoire dans le nom |
| Écrans sans bruit parasite | `prepareDocumentationState` appelé avant chaque capture (overlays, apps, animations) |
| Cohérence JSON ↔ screenshots | `writeGuideMetadata` écrit les chemins dans l'ordre d'enregistrement |

**Écarts tolérés :** légère variation de rendu entre machines, durée de chargement variable (compensée par `networkidle`), artefacts du run précédent (écrasés au rerun).

**Écarts bloquants :** capture manquante ou PNG corrompu, ordre incohérent JSON ↔ fichiers, nom de fichier avec identifiant aléatoire, donnée sensible visible, `screenshotPath` pointant vers un fichier absent.

### 11.2. Sûreté des données du monde documentaire

Les catégories suivantes ne doivent **jamais** apparaître dans `screenshots/`, `guides/*.json` ou `markdown/*.md` :

| Catégorie interdite | Mécanisme d'évitement |
|---|---|
| Identifiants réels (noms d'utilisateurs, comptes client) | Monde dédié, noms neutres `Doc-<Prefixe>-${Date.now()}` |
| Données client ou de campagne réelle | Monde documentaire isolé, distinct de la production |
| Secrets et tokens (mots de passe, clés API) | Monde dédié, captures sans zone sensible |
| URLs non prévues ou redirections vers un autre environnement | Contrôle du point d'entrée avant run |
| Bruit de session (notifications, popups, alertes de mise à jour) | `prepareDocumentationState` avant chaque capture |
| États non représentatifs (erreur, migration incomplète) | Monde stable et représentatif avant run |

**Point de contrôle génération :** la commande `pnpm run docs:generate-user-guides` ne peut introduire aucune information hors JSON source. Le JSON source ne contient que les métadonnées déclarées dans la spec.

### 11.3. Checklist de release `e2e:documentation`

La séquence canonique pour conclure qu'un guide est prêt à être diffusé :

```
1. Préparer le monde documentaire (état stable, aucune donnée sensible)
2. Lancer la capture : pnpm e2e:documentation
3. Vérifier screenshots + JSON (ordre, nommage, cohérence, sûreté des données)
4. Générer le Markdown : pnpm run docs:generate-user-guides
5. Relecture humaine Dev/QA + Documentation/PO avant diffusion
```

**Preuves minimales à conserver à la clôture :**

- Artefacts produits présents et cohérents dans `documentation-output/`.
- Absence d'erreurs navigateur inattendues dans la sortie du run.
- Captures lisibles et représentatives (vérification manuelle).
- Contrôle des données sensibles effectué.
- Relecture métier effectuée par Documentation/PO.

### 11.4. Frontière feu vert documentaire vs release applicative globale

| Signal | Périmètre |
|---|---|
| Feu vert documentaire (EDG6) | Captures stables + artefacts sûrs + checklist complète + relecture humaine |
| Release applicative globale | Régression fonctionnelle, smoke, Vitest, validation métier — indépendant d'EDG6 |

La suite `e2e:documentation` n'est **jamais** un gate bloquant pour un merge ou une release applicative.
Un guide documentaire non à jour ne bloque pas la livraison — il indique que la documentation est à régénérer.

### 11.5. Signal de clôture EDG6

Le chantier `e2e:documentation` est clos quand :

- [x] Captures reproductibles — contrat de stabilité formalisé et outillé (`prepareDocumentationState`, `toKebabSlug`, viewport fixe)
- [x] Artefacts sûrs — catégories de données interdites documentées, mécanismes d'évitement en place
- [x] Checklist de release courte et exécutable — `documentation/tests/e2e/edg6-release-checklist.md`
- [x] Rerun compréhensible — commandes canoniques, prérequis et cas de rerun dans `e2e/documentation/README.md`
- [x] Revue humaine explicitement requise avant toute diffusion
- [x] Un seul contrat de release documentaire — `e2e/documentation/README.md` + `e2e/README.md` + ce guide + `edg6-release-checklist.md` sans consignes concurrentes

---

## 12. Résumé

- `pnpm e2e:smoke` : vérification de surface, exécution manuelle, lecture seule sur instance de production.
- `pnpm e2e:regression` : validation fonctionnelle pré-livraison sur instance dédiée, remplace les campagnes QA manuelles répétitives.
- `pnpm e2e:documentation` : captures documentaires et invariants visibles, exécution manuelle, lecture seule par défaut, **non bloquante**, jamais en CI, jamais sur production ou environnement client partagé.
- `pnpm e2e` : campagne complète qui orchestre `regression` puis `smoke` — requiert les deux instances disponibles.
- Quatre configs Playwright distinctes, chacune chargeant son propre fichier d'environnement.
- Reports HTML générés systématiquement en local (`playwright-regression-report/`, `playwright-smoke-report/`, `playwright-documentation-report/`).
- Les helpers `foundrySession.ts`, `e2eTest.ts` et les fixtures partagées encapsulent la logique de connexion et de lancement du monde Swerpg.
- Les scénarios doivent rester courts, robustes, et utiliser des locators accessibles.
- Toute nouvelle spec doit être placée dans `e2e/smoke/`, `e2e/regression/specs/` ou `e2e/documentation/specs/` selon son type.
- Matrice de couverture : `documentation/tests/e2e/couverture-e2e-matrice.md`.
- Gouvernance `e2e:documentation` : Dev/QA maintient les parcours et le monde — Documentation/PO valide les guides et décide de la publication. Voir `e2e/documentation/README.md`.
- Clôture EDG6 : contrat de stabilité des captures, sûreté des données et checklist de release dans `documentation/tests/e2e/edg6-release-checklist.md` et section 11 de ce guide.

---

> Remarque pour l'intégration continue (GitHub Actions) : en raison des contraintes de performance des runners GitHub, la pipeline CI n'exécute **que** les tests explicitement marqués avec le tag `[ci]` dans leur titre. Le script `e2e:ci` (défini ci‑dessus) filtre les tests via `--grep "[ci]"` pour ne lancer que ces scénarios critiques.
>
> Pour inclure un test dans la CI, ajoutez simplement `[ci]` dans le titre du test ou du describe ; exemple :
>
> ```ts
> // Inclut ce test dans le run CI
> test('Import OggDude [ci] - critical path', async ({ page }) => { ... })
> ```
>
> Cette approche permet de garder la suite E2E locale complète pour le développement tout en limitant la charge et la durée des runs CI aux scénarios essentiels.
