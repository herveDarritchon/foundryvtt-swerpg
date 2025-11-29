---
goal: Mise en place d'une stack Playwright E2E dédiée
version: 1.0
date_created: 2025-11-29
last_updated: 2025-11-29
owner: Core QA
status: 'Planned'
tags: ['feature', 'testing', 'playwright', 'e2e', 'quality']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Plan d'implémentation pour introduire une stack de tests end-to-end Playwright indépendante de Vitest dans le système Swerpg (Foundry VTT v13+). Le plan couvre l'infrastructure tooling, les helpers de connexion Foundry, les premiers scénarios (bootstrap + OggDude import) et leur intégration dans la documentation ainsi que dans la CI.

## 1. Requirements & Constraints

- **REQ-001**: Fournir une stack Playwright E2E totalement séparée de Vitest (répertoires, config, dépendances, scripts pnpm).
- **REQ-002**: Ajouter des commandes pnpm dédiées (`test:e2e`, `test:e2e:headed`, ciblage fichier) sans modifier le comportement de `pnpm test`.
- **REQ-003**: Permettre l'exécution d'un seul fichier/spec Playwright pour le débogage rapide.
- **REQ-004**: Exposer une configuration Playwright paramétrable via variables d'environnement (`E2E_FOUNDRY_BASE_URL`, utilisateur, mot de passe, monde).
- **REQ-005**: Fournir une librairie/utilitaire permettant de revenir à l'écran de setup Foundry puis de se connecter automatiquement au monde cible.
- **REQ-006**: Créer au moins un test E2E démontrant la connexion et la vérification d'un élément d'UI Swerpg (logo/menu).
- **REQ-007**: Couvrir un premier parcours OggDude importer (accès à la fenêtre, contrôle d'éléments critiques) pour prévenir les régressions futures.
- **REQ-008**: Documenter clairement la stack (pré-requis, exécution locale, intégration CI) pour les contributeurs.
- **SEC-001**: Empêcher toute fuite d'identifiants ou de tokens de test (pas de secrets committés, `.env` ignorés).
- **CON-001**: Maintenir la compatibilité Foundry VTT v13 et ne pas dépendre d'APIs expérimentales.
- **CON-002**: La nouvelle stack ne doit pas rallonger ou modifier le pipeline actuel des tests unitaires.
- **CON-003**: Les tests doivent pouvoir tourner headless dans la CI et en local, avec installation automatique des navigateurs nécessaires.
- **CON-004**: Supporter au minimum Chromium et Firefox (exécution séquentielle ou en matrice).
- **CON-005**: Autoriser la configuration de l'URL/port Foundry sans rebuild (env/CLI), afin de fonctionner sur dev locaux et runners CI.
- **GUD-001**: Utiliser prioritairement des locators accessibles (`getByRole`, `getByLabel`, `getByText`) et des assertions web-first Playwright.
- **GUD-002**: Rester cohérent avec la structure de tests existante (dossiers dédiés, README explicatif, conventions PNPM).
- **PAT-001**: Centraliser la navigation setup/login dans un fixture Playwright partagé (pattern `test.extend`) pour éviter la duplication dans les specs.
- **PAT-002**: Charger les variables d'environnement via `dotenv` dans le `playwright.config.ts` afin d'offrir une configuration unique.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Mettre en place l'infrastructure Playwright (dépendances, scripts, config, structure de répertoire).

| Task     | Description                                                                                                                               | DependsOn | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-001 | Mettre à jour `package.json` (FILE-001) pour ajouter `@playwright/test`, `dotenv` et les scripts `test:e2e`, `test:e2e:headed`, ciblage.   |           |           |      |
| TASK-002 | Ajouter `.env.e2e.example` (FILE-003) et ignorer `.env.e2e.local` via `.gitignore` (FILE-002) pour sécuriser les secrets.                   | TASK-001  |           |      |
| TASK-003 | Créer le dossier `e2e/` avec un `README.md` (FILE-005) décrivant l'architecture, les conventions et la relation avec Foundry.              | TASK-001  |           |      |
| TASK-004 | Créer `playwright.config.ts` (FILE-004) supportant Chromium/Firefox, variables d'environnement, timeouts Foundry, reporters CI.             | TASK-001  |           |      |

### Implementation Phase 2

- GOAL-002: Fournir des fixtures/helpers pour piloter Foundry (retour écran setup, connexion monde, sessions partagées).

| Task     | Description                                                                                                                                      | DependsOn | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | --------- | ---- |
| TASK-005 | Implémenter `e2e/utils/foundrySession.ts` (FILE-006) gérant la navigation jusqu'au setup, l'auth et la sélection du monde via locators accessibles. | TASK-004  |           |      |
| TASK-006 | Créer `e2e/fixtures/global-setup.ts` (FILE-007) pour charger `.env`, vérifier l'accessibilité de l'URL Foundry et préparer le contexte Playwright.  | TASK-005  |           |      |
| TASK-007 | Créer `e2e/fixtures/index.ts` (FILE-008) définissant un fixture `swerpgTest` (extends `test`) exposant helpers (login, reset, navigation).         | TASK-006  |           |      |

### Implementation Phase 3

- GOAL-003: Ajouter des specs E2E démonstratives (bootstrap + OggDude importer) respectant les bonnes pratiques Playwright.

| Task     | Description                                                                                                                                                | DependsOn | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-008 | Créer `e2e/specs/bootstrap.spec.ts` (FILE-009) validant la connexion, le chargement du monde et la présence d'éléments d'UI Swerpg (logo, menu principal).   | TASK-007  |           |      |
| TASK-009 | Créer `e2e/specs/oggdude-import.spec.ts` (FILE-010) ouvrant le module d'import, vérifiant les boutons clés et préparant un squelette de scénario import.      | TASK-008  |           |      |
| TASK-010 | Étendre le README e2e (FILE-005) avec des instructions pour cibler un test (`pnpm test:e2e -- --grep` / chemin) et pour le mode headed/debug.                | TASK-008  |           |      |

### Implementation Phase 4

- GOAL-004: Documenter et intégrer la stack (guide contributeurs, CI, validation multi-navigateurs).

| Task     | Description                                                                                                                                          | DependsOn | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-011 | Rédiger `documentation/tests/playwright-e2e-guide.md` (FILE-011) couvrant setup, variables d'env, commandes pnpm, bonnes pratiques de contribution.    | TASK-010  |           |      |
| TASK-012 | Mettre à jour `.github/workflows/test.yml` (FILE-012) pour ajouter un job Playwright headless (Chromium+Firefox) exécutant `pnpm test:e2e`.           | TASK-011  |           |      |
| TASK-013 | Ajouter une section "Tests E2E" dans `README.md` ou `documentation/README.md` (FILE-013) renvoyant vers le guide et rappelant la séparation des cycles. | TASK-011  |           |      |

## 3. Alternatives

- **ALT-001**: Utiliser Vitest + jsdom pour simuler l'UI Foundry au lieu de Playwright – rejeté, car les parcours MJ/joueurs nécessitent un vrai navigateur.
- **ALT-002**: Démarrer automatiquement une instance Foundry embarquée via script Node – rejeté pour cette itération afin de garder l'infrastructure simple et alignée sur l'assomption d'une instance disponible.

## 4. Dependencies

- **DEP-001**: Foundry VTT v13+ accessible via URL/port configuré (instance de test fournie par l'équipe).
- **DEP-002**: Playwright `@playwright/test` (>=1.48) et navigateurs Chromium/Firefox installés via `npx playwright install --with-deps`.
- **DEP-003**: PNPM >=8 et Node >=18 (versions actuelles du projet).

## 5. Files

- **FILE-001**: `package.json` – Ajout des dépendances Playwright/dotenv et scripts pnpm e2e dédiés.
- **FILE-002**: `.gitignore` – Ignorer `.env.e2e*` et éventuels outputs Playwright (`test-results/`, `playwright-report/`).
- **FILE-003**: `.env.e2e.example` – Exemple de configuration (`E2E_FOUNDRY_BASE_URL`, `E2E_FOUNDRY_USERNAME`, etc.).
- **FILE-004**: `playwright.config.ts` – Configuration centralisée (projects Chromium/Firefox, retries CI, env loading).
- **FILE-005**: `e2e/README.md` – Documentation de structure, commandes, troubleshooting rapide.
- **FILE-006**: `e2e/utils/foundrySession.ts` – Helpers de navigation/setup/login Foundry réutilisables.
- **FILE-007**: `e2e/fixtures/global-setup.ts` – Global setup Playwright (validation env/URL, instrumentation).
- **FILE-008**: `e2e/fixtures/index.ts` – Extension `test`/`expect` exposant `swerpgTest` + fixtures custom.
- **FILE-009**: `e2e/specs/bootstrap.spec.ts` – Test de smoke (connexion + UI système).
- **FILE-010**: `e2e/specs/oggdude-import.spec.ts` – Scénario cible sur l'import OggDude.
- **FILE-011**: `documentation/tests/playwright-e2e-guide.md` – Guide contributeurs détaillé.
- **FILE-012**: `.github/workflows/test.yml` – Ajout job Playwright multi-navigateurs.
- **FILE-013**: `README.md` (ou `documentation/README.md`) – Section pointer vers le guide et dissocier TU/E2E.

## 6. Testing

- **TEST-001**: Exécution locale `pnpm test:e2e` avec instance Foundry disponible – doit valider la connexion et les assertions de `bootstrap.spec.ts` sur Chromium.
- **TEST-002**: Exécution `pnpm test:e2e -- --project=firefox` (ou job CI) – garantit la compatibilité multi-navigateurs exigée par CON-004.
- **TEST-003**: Spécifique OggDude – `pnpm test:e2e -- --grep "oggdude"` doit exécuter `oggdude-import.spec.ts` et vérifier l'accès au module d'import.
- **TEST-004**: Vérification que `pnpm test` n'exécute que Vitest (contrôle croisé via pipeline local/CI) pour garantir REQ-001/CON-002.
- **TEST-005**: Revue manuelle de `documentation/tests/playwright-e2e-guide.md` + `e2e/README.md` pour s'assurer que les instructions couvrent setup, env et débogage.

## 7. Risks & Assumptions

- **RISK-001**: Flakiness si l'instance Foundry/monde met trop de temps à se charger → mitiger avec timeouts et attente sur éléments stables.
- **RISK-002**: Mauvaise gestion des secrets (env leaks) → mitiger via `.env` ignoré et documentation claire.
- **RISK-003**: Dépendance à une instance Foundry externe indisponible en CI → prévoir un fallback/skip contrôlé ou vérifier la disponibilité en global setup.
- **ASSUMPTION-001**: Une instance Foundry v13+ de test (avec monde vierge) est disponible et accessible via réseau interne.
- **ASSUMPTION-002**: Les parcours OggDude import sont accessibles via l'UI sans nécessiter de données spécifiques.
- **ASSUMPTION-003**: La CI peut installer les dépendances Playwright et accéder à l'instance (ports ouverts, credentials de test).

## 8. Related Specifications / Further Reading

- `/documentation/spec/core/feature-playwright-e2e-test-stack-needs-1.0.md` – Spécification fonctionnelle de la stack Playwright E2E.
- `/documentation/strategie-tests.md` – Lignes directrices globales de tests pour Swerpg.
- `.github/instructions/playwright-typescript.instructions.md` – Bonnes pratiques Playwright à respecter lors de l'écriture des specs.
- `.github/instructions/spec-driven-workflow-v1.instructions.md` – Rappel du workflow spec/plan/implémentation.

