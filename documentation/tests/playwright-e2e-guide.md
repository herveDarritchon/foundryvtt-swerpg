# Guide Playwright E2E pour Swerpg

Ce guide explique comment configurer et exécuter les tests end-to-end Playwright pour le système Swerpg.

## Prérequis

- Node.js et pnpm installés
- Dépendances du projet installées :

```bash
pnpm install
npx playwright install --with-deps
```

- Une instance Foundry VTT v13+ accessible, avec un monde de test Swerpg.

## Configuration environnement

1. Copier `.env.e2e.example` en `.env.e2e.local`.
2. Adapter les variables :
   - `E2E_FOUNDRY_BASE_URL`
   - `E2E_FOUNDRY_USERNAME`
   - `E2E_FOUNDRY_PASSWORD`
   - `E2E_FOUNDRY_WORLD`

Les fichiers `.env.e2e*` sont ignorés par Git.

## Commandes principales

> Important : les tests E2E Playwright ont leur propre cycle de vie et ne sont **pas** lancés par `pnpm test`.
> `pnpm test` exécute uniquement les tests Vitest.

- Exécuter tous les tests E2E :

```bash
pnpm e2e
```

- Exécuter en mode headed :

```bash
pnpm e2e:headed
```

- Cibler un project spécifique (ex: Firefox) :

```bash
pnpm e2e -- --project=firefox
```

- Cibler un test ou un fichier :

```bash
pnpm e2e -- e2e/specs/bootstrap.spec.ts
pnpm e2e -- --grep "OggDude importer"
```

## Bonnes pratiques

- Utiliser des locators accessibles (`getByRole`, `getByLabel`, `getByText`).
- Factoriser la logique de connexion et de navigation dans `e2e/utils/foundrySession.ts` et les fixtures.
- Garder les scénarios focalisés sur des parcours MJ/joueurs concrets.
