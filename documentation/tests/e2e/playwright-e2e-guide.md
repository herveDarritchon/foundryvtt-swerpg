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
   - `E2E_FOUNDRY_BASE_URL` - URL de l'instance Foundry
   - `E2E_FOUNDRY_ADMIN_PASSWORD` - Mot de passe administrateur Foundry (pour accéder au setup)
   - `E2E_FOUNDRY_USERNAME` - Nom d'utilisateur pour se connecter au monde
   - `E2E_FOUNDRY_PASSWORD` - Mot de passe de l'utilisateur
   - `E2E_FOUNDRY_WORLD` - Nom du monde de test

Les fichiers `.env.e2e*` sont ignorés par Git.

**Note importante** : Le mot de passe administrateur (`E2E_FOUNDRY_ADMIN_PASSWORD`) est requis pour accéder à la page de setup de Foundry. C'est différent du mot de passe de l'utilisateur qui se connecte au monde.

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

## Troubleshooting

### Erreur "Foundry instance unreachable"

Si vous obtenez cette erreur lors de l'exécution des tests :

1. **Vérifiez que Foundry VTT est bien lancé** sur le port configuré
2. **Vérifiez l'URL** dans `.env.e2e.local` :
   ```bash
   cat .env.e2e.local
   ```
3. **Testez l'accès manuellement** :
   ```bash
   curl http://localhost:30000
   ```

### Erreur "Executable doesn't exist"

Si Playwright ne trouve pas les navigateurs :

```bash
pnpm exec playwright install --with-deps
```

### Les tests passent en headless mais échouent en headed

Cela peut être lié aux timeouts. Les tests headed sont parfois plus lents. Vérifiez les timeouts dans `playwright.config.ts`.

### Pour voir ce qui se passe réellement

Utilisez l'UI Playwright pour déboguer interactivement :

```bash
pnpm exec playwright test --ui
```

Ou consultez les traces des tests échoués :

```bash
pnpm exec playwright show-trace test-results/path-to-trace/trace.zip
```


