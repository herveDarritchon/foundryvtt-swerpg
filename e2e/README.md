# Tests E2E Playwright pour Swerpg

Ce dossier contient la suite de tests end-to-end Playwright pour le système Swerpg.
Les tests E2E sont séparés des tests unitaires (Vitest) : `pnpm test` n'exécute **que** Vitest.

Pour tous les détails (prérequis, configuration, structure des specs, bonnes pratiques et troubleshooting),
se référer au guide complet :

- `documentation/tests/e2e/playwright-e2e-guide.md`

Pour la matrice de couverture (domaines fonctionnels, parcours critiques, specs et trous de couverture acceptés) :

- `documentation/tests/e2e/couverture-e2e-matrice.md`

---

## Contrat des commandes E2E

La suite E2E repose sur quatre commandes aux rôles distincts et sans ambiguité.

### `pnpm run e2e` — campagne complète (orchestrateur)

**Rôle** : orchestre les deux suites dans l'ordre `regression` puis `smoke`.

**Usage** : quand les prérequis des deux suites sont disponibles et qu'on souhaite une campagne E2E complète.

**Ce que la commande fait :**

```
pnpm run e2e:regression  (instance Foundry port 31001, env .env.e2e.regression)
pnpm run e2e:smoke       (instance Foundry port 30000, env .env.e2e.smoke.prod)
```

Chaque sous-suite charge son propre fichier d'environnement. Les deux instances Foundry doivent être
opérationnelles avant de lancer `pnpm run e2e`.

**Ce que la commande n'est pas** : un test rapide local. Ne pas utiliser `pnpm run e2e` pour une
vérification ponctuelle quand seule l'instance de régression est disponible.

---

### `pnpm run e2e:regression` — validation fonctionnelle pré-livraison

**Rôle** : valide le fonctionnement de l'application et de ses features avant livraison.

**Usage** : avant merge important, avant release, en campagne locale dédiée.

**Caractéristiques** :

- instance Foundry dédiée sur port 31001 (`E2E_FOUNDRY_BASE_URL=http://localhost:31001`) ;
- monde contrôlé et jetable (`Swerpg-Regression-World`) ;
- mutations autorisées, persistance vérifiée ;
- workflows métier et applicatifs réels ;
- durée plus longue acceptable.

**Cette suite remplace les campagnes QA manuelles répétitives sur le périmètre effectivement couvert.**

**Configuration** : `.env.e2e.regression` (copier depuis `.env.e2e.regression.example`)

**Commandes** :

```bash
pnpm e2e:regression
pnpm e2e:regression:headed
pnpm e2e:regression:ui
```

**Specs** : `e2e/regression/specs/`

---

### `pnpm run e2e:smoke` — vérification de surface (manuelle)

**Rôle** : vérifie qu'une instance Foundry fonctionne globalement, sans contrôle fonctionnel profond.

**Usage** : exécution manuelle, ponctuelle — post-déploiement, diagnostic rapide, contrôle de surface.

**Caractéristiques** :

- instance Foundry de production sur port 30000 (`E2E_FOUNDRY_BASE_URL=http://localhost:30000`) ;
- monde stable de production (`test-v14-309` ou équivalent) ;
- lecture seule stricte — aucune création, édition, suppression ou import ;
- suite courte et rapidement diagnostique.

**Checks couverts** :

- l'instance répond ;
- l'application charge sans crash ;
- les surfaces critiques s'ouvrent ;
- l'i18n visible est correcte ;
- aucune erreur `console` ou `pageerror` inattendue ;
- pas de placeholder cassé (`undefined`, `null`, clé brute `SWERPG.*`) dans les zones critiques.

**Cette suite remplace les checks manuels basiques de surface post-déploiement.**

**Configuration** : `.env.e2e.smoke.prod` (copier depuis `.env.e2e.smoke.prod.example`)

**Commandes** :

```bash
pnpm e2e:smoke
pnpm e2e:smoke:headed
```

**Specs** : `e2e/smoke/`

---

### `pnpm run e2e:documentation` — validation documentaire (manuelle)

**Rôle** : produit des captures d'écran reproductibles et valide les invariants visibles (i18n, placeholders, absence d'erreurs navigateur) sur les parcours documentaires.

**Usage** : exécution manuelle — lors de la mise à jour de documentation, d'un refactor UI impactant les captures, ou pour valider qu'une zone documentée reste stable.

**Caractéristiques** :

- instance Foundry sur port 30000 (`E2E_FOUNDRY_BASE_URL=http://localhost:30000`) ;
- monde stable dans un état représentatif des captures attendues ;
- lecture seule par défaut — prérequis contrôlés autorisés si documentés dans la spec ;
- traces et captures systématiques (pas seulement en échec) ;
- durée courte acceptable.

**Ce que la suite couvre :**

- parcours et pages documentables (feuilles d'acteur, compendium, interfaces clés) ;
- invariants visibles : absence de placeholder cassé (`undefined`, `null`, clé brute `SWERPG.*`) ;
- absence d'erreurs `console.error` ou `pageerror` inattendues dans les zones documentées.

**Frontière avec `regression` et `smoke`** :

| Critère | `documentation` | `regression` | `smoke` |
|---|---|---|---|
| Objectif | Captures documentaires, invariants visibles | Validation fonctionnelle pré-livraison | Santé de surface post-déploiement |
| Mutations | Lecture seule par défaut (prérequis contrôlés documentés acceptés) | Autorisées | Interdites |
| Instance cible | Port 30000 | Port 31001 | Port 30000 |

**Configuration** : `.env.e2e.documentation` (copier depuis `.env.e2e.documentation.example`)

**Commandes** :

```bash
pnpm e2e:documentation
pnpm e2e:documentation:headed
pnpm e2e:documentation:ui
```

**Specs** : `e2e/documentation/specs/`

---

## Frontière CI / local manuel

| Suite | CI GitHub Actions | Local manuel |
|---|---|---|
| `pnpm test` (Vitest) | oui | oui |
| `pnpm e2e:regression` | non | oui |
| `pnpm e2e:smoke` | non | oui |
| `pnpm e2e:documentation` | non | oui |
| `pnpm e2e:ci` (tests `[ci]`) | oui | oui |

Les suites `regression` et `smoke` ne tournent pas en CI car elles nécessitent une machine locale
adaptée (GPU, performances navigateur, instance Foundry live).

---

## Reports HTML

Les suites `regression` et `smoke` génèrent un report HTML systématiquement lors de tout run local.

| Suite | Dossier de sortie | Commande pour ouvrir |
|---|---|---|
| `pnpm e2e:regression` | `playwright-regression-report/` | `pnpm exec playwright show-report playwright-regression-report` |
| `pnpm e2e:smoke` | `playwright-smoke-report/` | `pnpm exec playwright show-report playwright-smoke-report` |
| `pnpm e2e:documentation` | `playwright-documentation-report/` | `pnpm exec playwright show-report playwright-documentation-report` |

Ces reports permettent d'inspecter les résultats, traces, screenshots et vidéos de chaque run. Ils constituent la preuve de validation reproductible pour les campagnes pre-livraison.

En cas d'échec, les artefacts (traces `.zip`, screenshots, vidéos) sont conservés et accessibles directement depuis le report HTML.

---

## Prérequis par commande

### `pnpm e2e:regression`

1. Instance Foundry dédiée démarrée sur port 31001 (`pnpm foundry:e2e:start`)
2. Fichier `.env.e2e.regression` configuré (depuis `.env.e2e.regression.example`)
3. Monde `Swerpg-Regression-World` ou monde configuré dans `E2E_FOUNDRY_WORLD`

### `pnpm e2e:smoke`

1. Instance Foundry de production accessible sur port 30000
2. Fichier `.env.e2e.smoke.prod` configuré (depuis `.env.e2e.smoke.prod.example`)
3. Monde de production stable configuré dans `E2E_FOUNDRY_WORLD`

### `pnpm e2e:documentation`

1. Instance Foundry accessible sur le port configuré dans `E2E_FOUNDRY_BASE_URL` (port 30000 par défaut)
2. Fichier `.env.e2e.documentation` configuré (depuis `.env.e2e.documentation.example`)
3. Monde stable dans un état représentatif des captures attendues, configuré dans `E2E_FOUNDRY_WORLD`

### `pnpm e2e` (campagne complète)

Les prérequis des deux suites doivent être satisfaits simultanément.

---

## Structure du dossier

```
e2e/
  smoke/               # Suite smoke — vérification de surface (lecture seule)
    fixtures.ts        # Fixture smokeReady — navigation sans mutation
    global-setup.ts    # Setup global smoke
    01-health.spec.ts  # Santé de l'instance, erreurs console, 404 système
    02-surfaces.spec.ts # Surfaces UI critiques, i18n, placeholders
  regression/          # Suite regression — validation fonctionnelle pré-livraison
    fixtures/
      global-setup.ts  # Bootstrap monde de régression
    specs/
      01-smoke.spec.ts       # Santé de base sur instance de régression
      02-oggdude-import.spec.ts  # Import OggDude complet
    utils/
      oggdude-importer.ts
      world-manager.ts
  documentation/       # Suite documentation — captures documentaires et invariants visibles
    fixtures.ts        # Fixture documentationReady — navigation, lecture seule par défaut
    global-setup.ts    # Vérification de connectivité avant les specs
    specs/             # Specs documentation — un fichier par domaine documenté
    utils/             # Helpers spécifiques à la suite documentation
    README.md
  specs/               # Specs legacy / [ci] — à requalifier progressivement
    bootstrap.spec.ts        # → candidat regression (santé de base)
    oggdude-import.spec.ts   # → candidat regression (import fonctionnel)
  fixtures/            # Fixtures partagées (worldReady) pour specs/ legacy
    index.ts
    global-setup.ts
  helper/
    overlay.ts         # Fermeture des overlays Foundry (tour, usage data)
  utils/               # Helpers de session communs aux suites
    foundrySession.ts  # Primitives /license → /auth → /setup → /join → /game
    foundryUI.ts       # Interactions UI récurrentes (Settings, system settings)
    playwrightTest.ts  # setUp / tearDown haut niveau
  README.md
  tsconfig.json
```

### Requalification des specs legacy (`e2e/specs/`)

Les specs dans `e2e/specs/` sont des specs legacy qui n'ont pas encore été rattachées explicitement
à `smoke` ou `regression`. À chaque ajout ou modification de spec :

- si le test vérifie une surface sans mutation → déplacer vers `e2e/smoke/`
- si le test valide un workflow fonctionnel ou une feature → déplacer vers `e2e/regression/specs/`
- conserver dans `e2e/specs/` uniquement les tests marqués `[ci]` en attendant leur migration

---

## Remplacement des validations QA manuelles

La suite `e2e:regression` a vocation à remplacer progressivement les validations QA manuelles
répétitives sur le périmètre couvert.

La suite `e2e:smoke` remplace les checks manuels de surface habituellement effectués post-déploiement.

Le périmètre effectivement automatisé est celui des specs présentes dans `e2e/regression/specs/`
et `e2e/smoke/`. Toute vérification hors de ce périmètre reste manuelle jusqu'à ce qu'une spec
dédiée soit ajoutée.

---

## Contrat d'interaction et erreurs navigateur

### Helpers à utiliser

Toutes les interactions critiques Foundry doivent passer par les helpers communs :

| Besoin | Helper | Fichier |
|---|---|---|
| Bootstrap complet | `setUp` / `tearDown` | `utils/playwrightTest.ts` |
| Vérifier session active | `ensureSessionActive` | `utils/foundryUI.ts` |
| Ouvrir Game Settings | `openGameSettings` | `utils/foundryUI.ts` |
| Naviguer vers settings système | `navigateToSystemSettings` | `utils/foundryUI.ts` |
| Ouvrir dialog OggDude | `openOggDudeImporterDialog` | `regression/utils/oggdude-importer.ts` |
| Capturer les erreurs navigateur | `createBrowserErrorCollector` | `utils/browserErrors.ts` |

Ne pas réimplémenter ces helpers dans les specs. Si un helper manque, l'ajouter dans le fichier centralisé.

### Capture d'erreurs navigateur

Les fixtures `worldReady` (`fixtures/index.ts`) et `smokeReady` (`smoke/fixtures.ts`) branchent automatiquement un collecteur d'erreurs navigateur (`createBrowserErrorCollector`) avant le setUp. À la fin de chaque test, elles appellent `assertNoErrors` pour faire échouer explicitement si une erreur non autorisée a été captée.

**Règle** : aucun listener `page.on('console')` ou `page.on('pageerror')` ad hoc dans les specs — la fixture s'en charge.

Exception documentée : si un test recharge la page pour tester spécifiquement les erreurs au démarrage, il peut créer un collecteur local via `createBrowserErrorCollector(page)` et appeler `assertNoErrors` manuellement.

### Checklist pour toute nouvelle spec

- [ ] Importer depuis `../../fixtures` (regression) ou `./fixtures` (smoke)
- [ ] Pas de listener ad hoc `page.on('console')` ou `page.on('pageerror')`
- [ ] Interactions critiques via helpers de `foundryUI.ts` et `foundrySession.ts`
- [ ] `ensureSessionActive` avant toute séquence longue
- [ ] Pas de `waitForTimeout` — utiliser des assertions web-first
- [ ] Pas de `click({ force: true })` sans justification écrite

Pour les détails complets, voir `documentation/tests/e2e/playwright-e2e-guide.md` section 6.

---

## Hygiène monde Tier 1 et stratégie de reset déterministe

### Décision retenue

La suite de régression Tier 1 repose sur un **cleanup ciblé par spec**, pas sur la recréation du monde entre chaque run.

| Approche | Décision |
|---|---|
| Monde jetable recréé à chaque run | Non retenu — trop long, masque des régressions de persistance |
| Cleanup ciblé par spec (artefacts éphémères) | **Retenu** — rapide, déterministe, préserve la baseline |

### Règles opérationnelles

1. **Noms uniques** : chaque spec crée ses acteurs avec un nom horodaté unique (ex. `Test-Personnage-<timestamp>`). Cette convention suffit à éviter les collisions si le teardown échoue.
2. **Teardown obligatoire** : chaque spec supprime ses acteurs après les assertions via `deleteActorByName` (importé depuis `e2e/regression/utils/world-manager.ts`).
3. **Bootstrap idempotent** : le `globalSetup` crée le monde s'il est absent, ne fait rien s'il est présent. Un monde partiellement pollué est accepté — les specs nettoient leurs propres artefacts.
4. **Nettoyage résiduel** : en cas de run interrompu, `cleanupTestActors(page, 'Test-')` permet de nettoyer les artefacts résiduels par préfixe depuis `/game`.

### Données minimales requises par domaine

| Spec | Données communes attendues | Artefacts éphémères (créés / supprimés par la spec) |
|---|---|---|
| 01 — smoke | monde actif, système swerpg chargé | aucun |
| 02 — OggDude import | monde actif, settings système accessibles | aucun |
| 03 — création personnage | monde actif | acteurs préfixés `Test-Personnage-*` |
| 04 — XP / arbre spécialisation | monde actif | acteurs préfixés `Test-XP-*`, `Test-XP-Skill-*`, `Test-SpecTree-*` |

### Primitives de cleanup disponibles

| Fonction | Fichier | Usage |
|---|---|---|
| `deleteActorByName(page, name)` | `e2e/regression/utils/world-manager.ts` | Supprimer un acteur précis en fin de test |
| `cleanupTestActors(page, prefix)` | `e2e/regression/utils/world-manager.ts` | Nettoyer tous les artefacts résiduels d'un préfixe |
| `ensureWorldExists(page, opts)` | `e2e/regression/utils/world-manager.ts` | Bootstrap idempotent (globalSetup) |

### Checklist pour toute nouvelle spec qui crée des données

- [ ] Nom de l'artefact horodaté unique (`<Prefixe>-${Date.now()}`)
- [ ] `deleteActorByName` (ou équivalent) appelé en fin de test après les assertions
- [ ] Préfixe documenté dans le tableau "données minimales" ci-dessus
- [ ] Pas de dépendance à l'état d'un artefact créé par une autre spec

---

## Conseils

Préférer `beforeEach` et `beforeAll` pour se mettre dans un état initial plutôt que
`afterEach` / `afterAll` en post-testing : en cas de crash, le contexte reste propre
pour la prochaine exécution.
