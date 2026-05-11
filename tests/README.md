# Tests du système SWERPG pour Foundry VTT

Ce dossier contient toute l'infrastructure de tests du projet : tests unitaires, tests d'intégration, et tests
end-to-end (E2E).

---

## 1. Types de tests

| Type                 | Runner     | Emplacement                                  | Filtre d'inclusion                     |
|----------------------|------------|----------------------------------------------|----------------------------------------|
| **Unitaires (TU)**   | Vitest     | `tests/**/*.test.mjs`, `tests/**/*.spec.mjs` | Métier pur, sans Foundry ou avec mocks |
| **Intégration (TI)** | Vitest     | `tests/**/*.integration.spec.mjs`            | Combinaison de modules, imports réels  |
| **End-to-End (E2E)** | Playwright | `e2e/**/*.spec.ts`                           | Instance Foundry réelle, navigateur    |

---

## 2. Prérequis

- Node.js **LTS** (>=18)
- **pnpm** installé globalement
- Dépendances du projet installées :

```bash
pnpm install
```

Pour les tests E2E, installer aussi les navigateurs Playwright :

```bash
pnpm exec playwright install --with-deps
```

---

## 3. Tests unitaires et d'intégration (Vitest)

### 3.1. Lancement

```bash
# Toute la suite Vitest (headless)
pnpm test

# Mode watch (re-run automatique aux changements)
pnpm test:watch

# Avec couverture de code
pnpm test:coverage
```

### 3.2. Fichier de configuration

Deux fichiers coexistent :

- **`vitest.config.mjs`** — utilisé par défaut par `pnpm test`. Inclut les fichiers `tests/**/*.test.mjs` avec le setup
  `tests/setup.mjs` (mocks Foundry minimaux).
- **`vitest.config.js`** — config secondaire avec `coverage` et `clearMocks`/`restoreMocks`. Utilise
  `tests/vitest-setup.js` (mocks Foundry complets via `tests/helpers/mock-foundry.mjs`).

Pour utiliser la config secondaire :

```bash
pnpm vitest run --config vitest.config.js
```

### 3.3. Convention de nommage

| Suffixe                  | Nature                                                                     |
|--------------------------|----------------------------------------------------------------------------|
| `*.test.mjs`             | Test unitaire standard (inclus automatiquement)                            |
| `*.spec.mjs`             | Spec unitaire (doit être run explicitement ou via le second vitest.config) |
| `*.unit.spec.mjs`        | Test unitaire explicite                                                    |
| `*.integration.spec.mjs` | Test d'intégration                                                         |

### 3.4. Filtrer des tests spécifiques

```bash
# Par chemin
pnpm vitest run tests/documents/actor-creation.test.mjs

# Par pattern (grep)
pnpm vitest run --grep "OggDude"

# Par dossier
pnpm vitest run tests/documents/
```

### 3.5. Structure du dossier `tests/`

```
tests/
  setup.mjs                          # Setup minimal (mocks Foundry de base)
  vitest-setup.js                    # Setup complet (mock-foundry)
  setupTests.js                      # Setup utilitaire (deepClone, mergeObject...)
  helpers/
    mock-foundry.mjs                 # Mock central Foundry VTT (686 lignes)
    mock-foundry.test.mjs            # Tests du mock lui-même (27 tests)
  unit/                              # Tests unitaires explicites
  integration/                       # Tests d'intégration
  documents/                         # Tests des modèles de données (actor, item...)
  dice/                              # Tests du système de dés narratifs
  applications/                      # Tests des sheets et UI ApplicationV2
  config/                            # Tests de configuration système
  chat/                              # Tests du rendu chat
  importer/                          # Tests de l'import OggDude (45+ fichiers)
  settings/                          # Tests des settings OggDude importer
  lib/                               # Tests des sous-systèmes (skills, talents...)
  module/                            # Tests des modules internes (socket, logger...)
  utils/                             # Utilities de test partagées
  fixtures/                          # Données de fixture (XML, JSON...)
```

### 3.6. Mocks Foundry (`tests/helpers/mock-foundry.mjs`)

Le système de mock central fournit des simulacres pour :

- `foundry.applications.api` (HandlebarsApplicationMixin, DocumentSheetV2, DialogV2)
- `foundry.abstract` (DataModel, TypeDataModel)
- `foundry.data.fields` (StringField, NumberField, BooleanField, etc.)
- `foundry.utils` (deepClone, mergeObject, randomID, etc.)
- `game.i18n`, `game.user`, `game.settings`, `game.combats`, `game.packs`, etc.
- `ui.notifications`, `Color`, `Roll`, `Item`, `Hooks`, `CONFIG`, etc.

Utilisation dans un test :

```javascript
import { setupFoundryMock, teardownFoundryMock } from '../helpers/mock-foundry.mjs'

beforeEach(() => setupFoundryMock())
afterEach(() => teardownFoundryMock())
```

---

## 4. Tests End-to-End (Playwright)

Les tests E2E vivent dans le dossier `e2e/` à la racine du projet, **pas** dans `tests/`.

### 4.1. Configuration de l'environnement

1. Copier le fichier d'exemple :

```bash
cp .env.e2e.example .env.e2e.local
```

2. Éditer `.env.e2e.local` avec les valeurs de votre instance Foundry :

```ini
E2E_FOUNDRY_BASE_URL=http://localhost:30000
E2E_FOUNDRY_ADMIN_PASSWORD=your_admin_password
E2E_FOUNDRY_USERNAME=Gamemaster
E2E_FOUNDRY_PASSWORD=changeme
E2E_FOUNDRY_WORLD=Swerpg-E2E-World
```

### 4.2. Lancement

```bash
# Suite complète (Chromium + Firefox, headless)
pnpm e2e

# Mode headed (navigateur visible)
pnpm e2e:headed

# Mode UI interactif (debug)
pnpm e2e:ui

# CI : Chromium uniquement, tests taggés [ci]
pnpm e2e:ci
```

### 4.3. Démarrer une instance Foundry dédiée

```bash
pnpm foundry:e2e:start    # Démarre un container Docker Foundry v13
pnpm foundry:e2e:stop     # Arrête le container
pnpm foundry:e2e:restart  # Redémarre
```

### 4.4. Filtrer les tests E2E

```bash
# Par navigateur
pnpm e2e -- --project=chromium
pnpm e2e -- --project=firefox

# Par fichier
pnpm e2e -- e2e/specs/bootstrap.spec.ts

# Par nom (grep)
pnpm e2e -- --grep "OggDude"
```

### 4.5. E2E : marquage CI

Seuls les tests avec le tag `[ci]` dans leur titre sont exécutés en CI :

```typescript
test('Import OggDude [ci] - critical path', async ({ page }) => { ...
})
```

### 4.6. Débogage E2E

```bash
# Inspecteur Playwright (pas à pas)
pnpm exec playwright test --debug

# Visualiser le rapport HTML
pnpm exec playwright show-report

# Analyser une trace
pnpm exec playwright show-trace test-results/path/to/trace.zip
```

### 4.7. Structure du dossier `e2e/`

```
e2e/
  fixtures/
    index.ts           # Fixture worldReady (setup/teardown automatique)
    global-setup.ts    # Validation des variables d'environnement
  helper/
    overlay.ts         # Fermeture des overlays Foundry (tour, data sharing...)
  specs/
    bootstrap.spec.ts           # Test de chargement du monde [ci]
    oggdude-import.spec.ts      # Test UI de l'import OggDude
  utils/
    foundrySession.ts  # Primitives de navigation Foundry (login, join, etc.)
    foundryUI.ts       # Helpers UI récurrents (Game Settings...)
    playwrightTest.ts  # setUp / tearDown haut niveau
```

**Documentation détaillée E2E :** `documentation/tests/e2e/playwright-e2e-guide.md`

---

## 5. Tests manuels

### 5.1. Instance Foundry locale

1. Installer Foundry VTT v13+ sur votre machine.
2. Créer un monde de test et activer le système `swerpg`.
3. Lancer le build du système (les sources doivent être compilées) :

```bash
pnpm run rollup    # Compile les modules JS
pnpm run less      # Compile les feuilles de style CSS
```

### 5.2. Mode watch (développement itératif)

Pour recompiler automatiquement les sources à chaque modification :

```bash
pnpm run rollup:watch   # JS watch
# dans un autre terminal :
pnpm run less           # ou gulp css pour rebuild CSS
```

### 5.3. Scénarios de test manuel recommandés

| Fonctionnalité       | Actions à tester                                                              |
|----------------------|-------------------------------------------------------------------------------|
| **Fiche Personnage** | Création, modification des caractéristiques, compétences, talents, équipement |
| **Combat**           | Init, attaque, défense, dégâts, effets de statut, tour de combat              |
| **Dés narratifs**    | Pool de dés, upgrade/downgrade, symboles, Triumph/Despair, Force              |
| **Import OggDude**   | Import d'un fichier ZIP, mapping des données, vérification des装备 et talents   |
| **Talents**          | Ajout, suppression, activation, effets mécaniques, cumul (ranked)             |
| **Équipement**       | Armes, armures, équipement général, encaissement, attaches/modifications      |
| **Véhicules**        | Création, pilotage, combat naval                                              |
| **UI Sheets**        | Tabs, responsive, drag & drop, context menu, recherche                        |

### 5.4. Points d'attention pour les tests manuels

- **Navigateurs supportés :** Chrome/Chromium, Firefox (Edge et Safari en test secondaire)
- **Foundry v13+** uniquement (API v13, concepts V2)
- **Résolution d'écran :** tester au moins en 1920×1080 et 1366×768 (responsive)
- **Packs de compendium :** vérifier que les packs se décompressent et affichent correctement les données
- **i18n :** basculer entre français et anglais pour vérifier la couverture des traductions
- **Logs :** surveiller la console développeur (F12) pour les warnings/erreurs

---

## 6. Bonnes pratiques

### 6.1. Écriture de tests Vitest

- Toujours utiliser `setupFoundryMock()` / `teardownFoundryMock()` pour les tests qui interagissent avec Foundry.
- Nommer les fichiers selon la convention : `ma-feature.test.mjs` pour les TU, `ma-feature.integration.spec.mjs` pour
  les TI.
- Un test = un scénario métier clair (éviter les `it` qui testent 3 choses différentes).
- Privilégier les imports ES modules (`import`) — le projet est en `"type": "module"`.

### 6.2. Écriture de tests E2E

- Toujours utiliser la fixture `worldReady` (la page est déjà sur `/game`).
- Privilégier les **locators accessibles** : `getByRole`, `getByLabel` — éviter les sélecteurs CSS fragiles.
- Ne pas utiliser `page.waitForTimeout(n)` (source de flakiness) ; préférer `expect(locator).toBeVisible()`,
  `page.waitForURL()`.
- Suivre le squelette fourni dans `documentation/tests/e2e/playwright-spec-squelette-mon-parcours.md`.

### 6.3. Tests et CI

- La CI exécute `pnpm test` (Vitest) et `pnpm e2e:ci` (Playwright, Chromium, tag `[ci]` seulement).
- Ajouter le tag `[ci]` aux scénarios E2E critiques qui doivent passer en CI.
- Le rapport de couverture est publié sur : `https://herdev.hervedarritchon.fr/foundryvtt-swerpg/index.html`

---

## 7. Débogage rapide

| Problème                         | Solution                                                                        |
|----------------------------------|---------------------------------------------------------------------------------|
| `vitest` ne trouve pas les tests | Vérifier le pattern dans `vitest.config.mjs` : `tests/**/*.test.mjs`            |
| Erreur `foundry is not defined`  | Ajouter `setupFoundryMock()` dans `beforeEach`                                  |
| E2E : navigation impossible      | Vérifier `.env.e2e.local` et que Foundry tourne bien sur `E2E_FOUNDRY_BASE_URL` |
| E2E : timeout                    | `PLAYWRIGHT_TEST_TIMEOUT=120000 pnpm e2e:headed`                                |
| Playwright : navigateur manquant | `pnpm exec playwright install --with-deps`                                      |
| Tests instables (flaky)          | Vérifier les locators (préférer getByRole), éviter les waitForTimeout           |

---

## 8. Références

| Ressource                                                           | Description                                                  |
|---------------------------------------------------------------------|--------------------------------------------------------------|
| `documentation/tests/e2e/playwright-e2e-guide.md`                   | Guide E2E complet (configuration, debugging, best practices) |
| `documentation/tests/e2e/playwright-spec-squelette-mon-parcours.md` | Squelette pour écrire une nouvelle spec E2E                  |
| `.env.e2e.example`                                                  | Modèle de configuration E2E                                  |
| `scripts/e2e-foundry-start.sh`                                      | Script Docker E2E (démarrage/arrêt d'une instance Foundry)   |
| `playwright.config.ts`                                              | Configuration Playwright                                     |
| `vitest.config.mjs`                                                 | Configuration Vitest (défaut)                                |
| `vitest.config.js`                                                  | Configuration Vitest (coverage)                              |
