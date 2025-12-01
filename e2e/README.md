# Tests E2E Playwright pour Swerpg

Ce dossier contient la suite de tests end-to-end Playwright pour le système Swerpg.

- Les tests E2E sont séparés des tests unitaires (Vitest).
- Utiliser `pnpm e2e` (ou `pnpm e2e:headed` pour le mode headed) pour exécuter les tests E2E.
- Configurer l’URL de Foundry et les identifiants dans un fichier `.env.e2e.local` basé sur `.env.e2e.example`.

Pour tous les détails (prérequis, configuration Playwright, structure des specs, bonnes pratiques et troubleshooting), se référer au guide complet :

- `documentation/tests/e2e/playwright-e2e-guide.md`.
