# Tests E2E Playwright pour Swerpg

Ce dossier contient la suite de tests end-to-end Playwright pour le système Swerpg.

- Les tests E2E sont séparés des tests unitaires (Vitest).
- Utiliser `pnpm e2e` (ou `pnpm e2e:headed` pour le mode headed) pour exécuter les tests E2E.
- Configurer l’URL de Foundry et les identifiants dans un fichier `.env.e2e.local` basé sur `.env.e2e.example`.

Pour tous les détails (prérequis, configuration Playwright, structure des specs, bonnes pratiques et troubleshooting),
se référer au guide complet:

- `documentation/tests/e2e/playwright-e2e-guide.md`.

- Utiliser les hooks Playwright:
  - `beforeAll`: pour initialiser le contexte du fichier de test.
  - `beforeEach`: pour initialiser le contexte de .
  - `afterEach`:
  - `afterAll`: pour fermer le contexte de fichier de test.

## Conseils:

Plutôt utilisé les `beforeEach` et `beforeAll` plutôt que les `afterEach` et `afterAll` pour se mettre dans un état
initial plutôt que de le faire en post-testing car potentiellement il est possible que le test crash et que le contexte
ne soit pas remis en état initial.
