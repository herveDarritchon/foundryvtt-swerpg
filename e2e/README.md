# Tests E2E Playwright pour Swerpg

Ce dossier contient la suite de tests end-to-end Playwright pour le système Swerpg.
Les tests E2E sont séparés des tests unitaires (Vitest) : `pnpm test` n'exécute **que** Vitest.

Pour tous les détails (prérequis, configuration, structure des specs, bonnes pratiques et troubleshooting),
se référer au guide complet :

- `documentation/tests/e2e/playwright-e2e-guide.md`

---

## Contrat des commandes E2E

La suite E2E repose sur trois commandes aux rôles distincts et sans ambiguité.

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

## Frontière CI / local manuel

| Suite | CI GitHub Actions | Local manuel |
|---|---|---|
| `pnpm test` (Vitest) | oui | oui |
| `pnpm e2e:regression` | non | oui |
| `pnpm e2e:smoke` | non | oui |
| `pnpm e2e:ci` (tests `[ci]`) | oui | oui |

Les suites `regression` et `smoke` ne tournent pas en CI car elles nécessitent une machine locale
adaptée (GPU, performances navigateur, instance Foundry live).

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
  specs/               # Specs legacy / [ci] — à requalifier progressivement
    bootstrap.spec.ts        # → candidat regression (santé de base)
    oggdude-import.spec.ts   # → candidat regression (import fonctionnel)
  fixtures/            # Fixtures partagées (worldReady) pour specs/ legacy
    index.ts
    global-setup.ts
  helper/
    overlay.ts         # Fermeture des overlays Foundry (tour, usage data)
  utils/               # Helpers de session communs aux deux suites
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

## Conseils

Préférer `beforeEach` et `beforeAll` pour se mettre dans un état initial plutôt que
`afterEach` / `afterAll` en post-testing : en cas de crash, le contexte reste propre
pour la prochaine exécution.
