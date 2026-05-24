# Tests E2E Playwright pour Swerpg

Ce dossier contient la suite de tests end-to-end Playwright pour le système Swerpg.
Les tests E2E sont séparés des tests unitaires (Vitest) : `pnpm test` n'exécute **que** Vitest.

Pour tous les détails (prérequis, configuration, structure des specs, bonnes pratiques et troubleshooting),
se référer au guide complet :

- `documentation/tests/e2e/playwright-e2e-guide.md`

---

## Stratégie à deux étages

La suite E2E est organisée en deux étages distincts avec des objectifs et des contraintes différentes.

### Étage 1 — `regression` (non-régression profonde)

**Instance cible** : Foundry E2E dédiée sur port 31001 (`E2E_FOUNDRY_BASE_URL=http://localhost:31001`).

**Monde** : monde contrôlé et jetable (`Swerpg-Regression-World`).

**Propriétés** :

- mutations autorisées ;
- persistance vérifiée ;
- workflows complets autorisés ;
- durée plus longue acceptable.

**Commandes** :

```bash
pnpm e2e:regression
pnpm e2e:regression:headed
pnpm e2e:regression:ui
```

**Configuration** : `.env.e2e.regression` (copier depuis `.env.e2e.regression.example`)

**Specs** : `e2e/regression/specs/`

### Étage 2 — `smoke` (vérification post-déploiement)

**Instance cible** : instance Foundry de production sur port 30000 (`E2E_FOUNDRY_BASE_URL=http://localhost:30000`).

**Monde** : monde stable de production (`test-v14-309` ou équivalent).

**Propriétés** :

- lecture seule stricte ;
- aucune création, édition, suppression ou import ;
- durée très courte ;
- exécution manuelle uniquement, post-déploiement.

**Commandes** :

```bash
pnpm e2e:smoke
pnpm e2e:smoke:headed
```

**Configuration** : `.env.e2e.smoke.prod` (copier depuis `.env.e2e.smoke.prod.example`)

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

## Structure du dossier

```
e2e/
  smoke/               # Smoke tests post-déploiement (lecture seule)
    fixtures.ts        # Fixture smokeReady — navigation sans mutation
    01-health.spec.ts  # Santé de l'instance, erreurs console, 404 système
    02-surfaces.spec.ts # Surfaces UI critiques, i18n, placeholders
  regression/          # Non-régression profonde sur instance dédiée
    fixtures/
      global-setup.ts  # Bootstrap monde de régression
    specs/
      01-smoke.spec.ts
      02-oggdude-import.spec.ts
    utils/
      oggdude-importer.ts
      world-manager.ts
  specs/               # Specs legacy / [ci] sur instance de dev
    bootstrap.spec.ts
    oggdude-import.spec.ts
  fixtures/            # Fixtures partagées (worldReady)
    index.ts
    global-setup.ts
  helper/
    overlay.ts         # Fermeture des overlays Foundry (tour, usage data)
  utils/               # Helpers de session communs aux deux étages
    foundrySession.ts  # Primitives /license → /auth → /setup → /join → /game
    foundryUI.ts       # Interactions UI récurrentes (Settings, system settings)
    playwrightTest.ts  # setUp / tearDown haut niveau
  README.md
  tsconfig.json
```

---

## Conseils

Préférer `beforeEach` et `beforeAll` pour se mettre dans un état initial plutôt que
`afterEach` / `afterAll` en post-testing : en cas de crash, le contexte reste propre
pour la prochaine exécution.
