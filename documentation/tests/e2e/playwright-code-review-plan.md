# Plan de code review – Mise en place Playwright & premières features E2E

## 1. Configuration Playwright & scripts

1.1 **`playwright.config.ts`**

- Vérifier le chargement des variables (`dotenv`, `E2E_ENV_FILE`).
- Contrôler `timeout`, `expect.timeout`, politique de traces/screenshots/vidéos, `workers: 1`.
- Confirmer la configuration des projets (`chromium`, `firefox`, viewports).

  1.2 **Scripts `package.json`**

- Valider `pnpm e2e`, `pnpm e2e:headed`, `pnpm foundry:e2e:*`.
- S’assurer qu’il n’y a plus de scripts obsolètes (`test:e2e`).

  1.3 **Gestion des `.env.e2e*`**

- Vérifier la présence de `.env.e2e.example` et l’usage de `E2E_ENV_FILE`.
- S’assurer que la doc reflète le comportement réel.

## 2. Structure du dossier `e2e/`

2.1 **Arborescence générale**

- `specs/`, `utils/`, `helper/`, éventuels `fixtures/` / `pages/`.
- Vérifier les responsabilités de chaque dossier.

  2.2 **Fixtures / entrypoints**

- Confirmer l’import unique `../fixtures` et la fixture `worldReady`.
- Vérifier l’intégration avec `e2e/utils/e2eTest.ts`.

  2.3 **Utilitaires**

- Examiner `foundrySession.ts` (accepte licence, login admin, enter world, join MJ).
- Contrôler `e2eTest.ts` (setUp/tearDown) et les TODO (bloc commenté dans `tearDown`).

## 3. Logique de session Foundry

3.1 **Flux complet**

- Vérifier les étapes `accepteLicense` → `loginIntoInstance` → `enterWorld` → `enterGameAsGamemaster`.
- Contrôler la robustesse des locators (ARIA) et la gestion des overlays (`dismissShareUsageDataIfPresent`, `dismissTourIfPresent`).

  3.2 **Nettoyage**

- Revue de `logout`, `quitWorld`, `logoutFromInstance` (chemins `/game`, `/join`, `/setup`, `/auth`).
- S’assurer que les erreurs de cleanup n’échouent pas les tests.

  3.3 **Résilience générale**

- Vérifier l’usage de `try/catch`, `waitForURL`, fallbacks `page.goto`.
- Identifier les points fragiles (timeouts magiques, `click({force:true})`).

## 4. Specs initiales

4.1 **`bootstrap.spec.ts`**

- Vérifier que le test reste minimal (URL `/game`, `body.system-swerpg`).
- Confirmer qu’il sert de test de santé.

  4.2 **`oggdude-import.spec.ts`**

- Passer en revue les interactions UI (tabs, boutons, sections).
- Contrôler l’usage des locators accessibles et l’absence de `waitForTimeout`.

  4.3 **Patterns à généraliser**

- Identifier les étapes duplicables (ex. ouverture Game Settings) -> candidats pour helpers/page objects.
- Vérifier les `click({force:true})` et les remplacer si possible par des checks explicites.

## 5. Documentation & guides

5.1 **`playwright-e2e-guide.md`**

- S’assurer de la cohérence avec la config réelle.
- Vérifier la référence vers le guide de squelette.

  5.2 **`playwright-spec-squelette-mon-parcours.md`**

- Confirmer que le squelette reflète les bonnes pratiques.
- Vérifier la section “comment l’utiliser”.

  5.3 **`e2e-playwright-copilot-workflow.md`**

- Voir si le doc se concentre bien sur Copilot et renvoie vers le squelette.

## 6. Axes d’amélioration / prochaines étapes

6.1 **Couverture fonctionnelle**

- Lister les parcours critiques encore non couverts (fiches acteur, jets, settings système).

  6.2 **Stabilisation / helpers**

- Proposer de nouveaux helpers pour interactions récurrentes (Game Settings, dialogs, overlays).
- Examiner `tearDown` et scripts `foundry:e2e:*` pour clarifier leur usage.

  6.3 **CI & reporting**

- Vérifier la génération du rapport HTML et la politique `trace`/`video`.
- Confirmer la compatibilité avec l’environnement CI.

  6.4 **Accessibilité & bonnes pratiques**

- S’assurer que tous les tests utilisent des locators ARIA.
- Vérifier que la doc mentionne les exigences a11y.

---

**Livrable attendu**

- Rapport de code review structuré suivant ce plan, mettant en évidence :
  - Points conformes / bonnes pratiques
  - Problèmes / risques
  - Recos concrètes (correctifs, tests supplémentaires, refactor)
