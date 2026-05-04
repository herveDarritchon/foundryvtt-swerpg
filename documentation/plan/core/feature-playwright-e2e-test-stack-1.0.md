---
goal: Mise en place d'une stack Playwright E2E séparée (core) avec exigences, design et tâches documentées
version: 1.0
date_created: 2025-11-29
last_updated: 2025-11-29
owner: Core dev team
status: 'Planned'
tags: ['feature', 'testing', 'e2e', 'playwright', 'quality', 'spec-driven']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Ce plan détaille l’implémentation d’une stack de tests end-to-end Playwright dédiée et séparée des tests unitaires Vitest pour le système Swerpg (Foundry VTT v13+), ainsi que la documentation associée selon le workflow Spec-Driven: requirements.md, design.md, tasks.md. Le périmètre et les objectifs proviennent de la spécification `documentation/spec/core/feature-playwright-e2e-test-stack-needs-1.0.md`.

## 1. Requirements & Constraints

- **REQ-001**: Séparer physiquement et logiquement les tests E2E Playwright des tests unitaires (répertoires, scripts, config).
- **REQ-002**: Fournir des commandes PNPM dédiées (`test:e2e`, `test:e2e:headed`, ciblage d’un fichier).
- **REQ-003**: Créer un minimum de specs E2E exemple validant la connexion à Foundry, le chargement d’un monde de test et une vérification UI Swerpg.
- **REQ-004**: Documenter les exigences (requirements.md), le design (design.md) et le plan de tâches (tasks.md) pour la feature Playwright E2E.
- **REQ-005**: Compatibilité CI (headless par défaut, URL de Foundry configurable via variables d’environnement).
- **SEC-001**: Ne pas exposer de secrets en clair; lire les URL/identifiants depuis l’environnement. Interdire toute exécution de code non vérifié.
- **CON-001**: Compatibilité Foundry v13+, Node/PNPM du projet; ne pas impacter `pnpm test` (Vitest uniquement).
- **CON-002**: Temps d’exécution raisonnable; parallélisme configurable.
- **GUD-001**: Respecter les bonnes pratiques Playwright (locators accessibles, assertions web-first, pas de wait fixes).
- **PAT-001**: Utiliser une structure `e2e/` dédiée avec `playwright.config.ts` et sous-dossiers `specs/`, `fixtures/`, `utils/`.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Analyser le dépôt et cadrer précisément la stack Playwright E2E (structure, scripts, CI, variables).

| Task     | Description                                                    | DependsOn | Completed | Date |
| -------- | -------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-001 | Cartographier les fichiers impactés (`FILE-001` à `FILE-008`). |           |           |      |
| TASK-002 | Identifier les commandes PNPM et la séparation avec Vitest.    |           |           |      |
| TASK-003 | Finaliser exigences/contraintes (REQ/CON/SEC/GUD/PAT).         | TASK-001  |           |      |

### Implementation Phase 2

- GOAL-002: Designer la structure technique Playwright (config, répertoires) et la documentation Spec-Driven.

| Task     | Description                                                                        | DependsOn | Completed | Date |
| -------- | ---------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-004 | Définir la structure `e2e/` (specs, fixtures, utils) et le `playwright.config.ts`. | TASK-002  |           |      |
| TASK-005 | Spécifier les scripts PNPM (`test:e2e`, `test:e2e:headed`, ciblage fichier).       | TASK-002  |           |      |
| TASK-006 | Rédiger `documentation/requirements/core/playwright-e2e-requirements.md`.          | TASK-003  |           |      |
| TASK-007 | Rédiger `documentation/design/core/playwright-e2e-design.md`.                      | TASK-003  |           |      |
| TASK-008 | Rédiger `documentation/tasks/core/playwright-e2e-tasks.md`.                        | TASK-003  |           |      |

### Implementation Phase 3

- GOAL-003: Préparer l’implémentation, l’intégration CI et la stratégie de rollback.

| Task     | Description                                                                       | DependsOn | Completed | Date |
| -------- | --------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-009 | Définir variables d’environnement (FOUNDry_URL/USER/TOKEN), timeouts et headless. | TASK-004  |           |      |
| TASK-010 | Définir étapes CI: démarrage Foundry, exécution `pnpm test:e2e` headless.         | TASK-005  |           |      |
| TASK-011 | Définir critères de rollback (désactivation temporaire E2E, garde-fous script).   | TASK-010  |           |      |

## 3. Alternatives

- **ALT-001**: Mélanger E2E et unit tests sous `tests/` avec config unique – rejeté (couplage, complexité, risques CI).
- **ALT-002**: Utiliser Cypress au lieu de Playwright – rejeté (incompatibilités et conventions projet Playwright déjà présentes).

## 4. Dependencies

- **DEP-001**: Foundry VTT v13.x minimum.
- **DEP-002**: Node/PNPM versions du projet (voir `package.json`).
- **DEP-003**: `@playwright/test` dernière version stable.

## 5. Files

- **FILE-001**: `package.json` – scripts PNPM E2E, dépendances dev Playwright.
- **FILE-002**: `playwright.config.ts` – configuration Playwright (projects, reporter, use.headless, baseURL).
- **FILE-003**: `e2e/specs/basic-foundry-boot.spec.ts` – exemple de spec: connexion + chargement monde + vérification UI Swerpg.
- **FILE-004**: `e2e/fixtures/env.ts` – lecture des variables d’environnement (URL, user, token) avec valeurs par défaut sûres.
- **FILE-005**: `e2e/utils/foundry-login.ts` – helpers pour se connecter/naviguer jusqu’au monde de test.
- **FILE-006**: `documentation/requirements/core/playwright-e2e-requirements.md` – exigences EARS.
- **FILE-007**: `documentation/design/core/playwright-e2e-design.md` – design technique détaillé.
- **FILE-008**: `documentation/tasks/core/playwright-e2e-tasks.md` – liste de tâches exécutable.

## 6. Testing

- **TEST-001**: Vitest – garantir que `pnpm test` n’exécute que les tests unitaires; vérifier absence de conflits d’imports.
- **TEST-002**: Playwright – exécution `pnpm test:e2e` avec une instance Foundry accessible; assertions `toHaveURL`, `getByRole`, `toHaveText`.
- **TEST-003**: CI headless – run minimal sur Chromium et Firefox; échec explicite si Foundry injoignable; logs clairs.

## 7. Risks & Assumptions

- **RISK-001**: Non disponibilité d’une instance Foundry durant les runs E2E → échecs bruités. Mitigation: détection rapide + message explicite.
- **RISK-002**: Flakiness des tests E2E (timings, chargements) → Mitigation: web-first assertions, timeouts raisonnables, éviter `wait` fixes.
- **RISK-003**: Couplage aux données du monde de test → Mitigation: utiliser scénarios minimalistes et helpers robustes.
- **ASSUMPTION-001**: Une instance Foundry v13+ est accessible (local/CI) pour les E2E.
- **ASSUMPTION-002**: Ajout de Playwright en devDependency est acceptable.

## 8. Related Specifications / Further Reading

- `documentation/spec/core/feature-playwright-e2e-test-stack-needs-1.0.md`
- Playwright docs et instructions internes `.github/instructions/playwright-typescript.instructions.md`
