---
goal: Plan d'amélioration de la stabilité Playwright sur Chromium (tests E2E OgreDude & session)
version: 1.0
date_created: 2025-11-30
last_updated: 2025-11-30
owner: SWERPG Core Team
status: 'Completed'
tags: [feature, tests, playwright, chromium, e2e]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-success)

Ce plan vise à corriger et stabiliser le comportement des tests E2E Playwright sur **Chromium**, en particulier autour du scénario `oggdude-import.spec.ts`, où la session Foundry se perd et redirige vers `/join`. L'objectif est d'aligner la fiabilité des tests Chromium sur celle de Firefox, tout en conservant les bonnes pratiques déjà mises en place (pas de `waitForTimeout`, locators accessibles, helpers factorisés).

**Statut** : ✅ **Implémentation complétée avec succès le 30 novembre 2025**  
**Résultat** : 4/4 tests E2E passent sur Chromium ET Firefox (100% de couverture)

Pour le rapport détaillé d'implémentation, voir :
- `documentation/tests/e2e/playwright-chromium-stability-implementation-report.md`
- `documentation/tests/e2e/IMPLEMENTATION-SUCCESS-SUMMARY.md`


## 1. Requirements & Constraints

- **REQ-001**: Aligner la stabilité des tests Playwright sur Chromium avec celle de Firefox pour les specs existantes (`bootstrap.spec.ts`, `oggdude-import.spec.ts`).
- **REQ-002**: Empêcher les redirections inattendues vers `/join` ou `/auth` pendant les scénarios E2E en détectant et corrigeant les pertes de session.
- **REQ-003**: Réactiver le test `oggdude-import.spec.ts` sur Chromium (écarter le `test.skip`) une fois la cause racine corrigée.
- **REQ-004**: Conserver une exécution rapide des tests (pas d'augmentation excessive des timeouts globaux).
- **REQ-005**: Conserver les bonnes pratiques a11y et les patterns Playwright actuels (locators basés sur `getByRole`, `getByLabel`, etc.).

- **SEC-001**: Toute modification de `launchOptions` sur Chromium (ex: `--disable-web-security`) doit être limitée à l'environnement de test et ne pas fuiter en prod.

- **CON-001**: Le système doit rester compatible avec Foundry VTT v13.x.
- **CON-002**: Les tests E2E doivent rester mono-worker (`workers: 1`) pour ne pas partager l'instance Foundry entre tests concurrents.
- **CON-003**: Interdiction de réintroduire des `waitForTimeout` arbitraires, sauf cas ultra-localisés et justifiés.
- **CON-004**: L'environnement E2E est piloté par `.env.e2e.local` et le script Docker `scripts/e2e-foundry-start.sh` (port 31000).

- **GUD-001**: Centraliser la logique de session et de navigation Foundry dans des helpers (`foundrySession.ts`, `foundryUI.ts`).
- **GUD-002**: Ajouter du logging explicite là où la session ou la navigation peuvent échouer pour faciliter l'analyse via traces.

- **PAT-001**: Utiliser un helper dédié `ensureSessionActive` pour vérifier l'état de session avant/après les actions critiques.
- **PAT-002**: Encapsuler la configuration spécifique au projet Chromium dans `playwright.config.ts` sans influencer les autres navigateurs.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Consolider l'analyse technique des problèmes Chromium et cartographier précisément les points d'échec.

| Task     | Description                                                                                                       | DependsOn | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-001 | Relire et synthétiser `documentation/tests/e2e/playwright-chromium-issues-addendum.md` en requirements techniques. |           |           |      |
| TASK-002 | Cartographier les points d'entrée utilisés par le test OggDude (`FILE-001` à `FILE-004`).                        | TASK-001  |           |      |
| TASK-003 | Analyser les traces Playwright existantes sur Chromium (trace.zip) pour confirmer la séquence de redirection.   | TASK-002  |           |      |

### Implementation Phase 2

- GOAL-002: Concevoir les ajustements de configuration et helpers de session pour Chromium.

| Task     | Description                                                                                                               | DependsOn | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-004 | Définir la configuration Chromium cible dans `playwright.config.ts` (`actionTimeout`, `storageState`, `launchOptions`).   | TASK-003  |           |      |
| TASK-005 | Spécifier le contrat détaillé de `ensureSessionActive` (états valides, erreurs, intégration dans `foundryUI.ts`).        | TASK-003  |           |      |
| TASK-006 | Définir la stratégie de réactivation du test oggdude sur Chromium (conditions de suppression du `test.skip`).            | TASK-003  |           |      |

### Implementation Phase 3

- GOAL-003: Implémenter les modifications dans le code, réactiver le test Chromium et sécuriser la non-régression.

| Task     | Description                                                                                                                             | DependsOn | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-007 | Mettre à jour `playwright.config.ts` pour isoler clairement la config Chromium (timeouts, éventuellement `storageState`).               | TASK-004  |           |      |
| TASK-008 | Implémenter/compléter `ensureSessionActive` dans `e2e/utils/foundryUI.ts` et l'intégrer dans les helpers utilisés par oggdude.          | TASK-005  |           |      |
| TASK-009 | Adapter `e2e/specs/oggdude-import.spec.ts` pour retirer le `test.skip` et ajouter du logging ciblé en cas de perte de session.          | TASK-006  |           |      |
| TASK-010 | Lancer `pnpm e2e --project=chromium` en local, analyser les traces en cas d'échec et itérer sur la config si nécessaire.                | TASK-007  |           |      |
| TASK-011 | Vérifier que les tests Firefox ne sont pas impactés (exécution `pnpm e2e --project=firefox`).                                          | TASK-007  |           |      |
| TASK-012 | Documenter la stratégie finale et les spécificités Chromium dans `documentation/tests/e2e/playwright-e2e-guide.md`.                      | TASK-007  |           |      |

## 3. Alternatives

- **ALT-001**: Ne tester l'import OggDude qu'avec Firefox (navigateur de référence Foundry) et ignorer Chromium. Rejeté car on souhaite garder une couverture multi-navigateurs, même partielle.
- **ALT-002**: Ajouter des `waitForTimeout` massifs pour "stabiliser" Chromium. Rejeté car contraire aux bonnes pratiques et crée des tests lents et fragiles.
- **ALT-003**: Désactiver complètement les tests E2E sur Chromium. Rejeté pour raisons de qualité et de compatibilité.

## 4. Dependencies

- **DEP-001**: Foundry VTT v13.x tournant localement sur `E2E_FOUNDRY_BASE_URL` (via `scripts/e2e-foundry-start.sh` ou autre).
- **DEP-002**: Configuration Playwright fonctionnelle (`playwright.config.ts`) et navigateurs installés (`pnpm exec playwright install`).
- **DEP-003**: Fichier `.env.e2e.local` correctement renseigné (ports, credentials, monde `Swerpg-E2E-World`).

## 5. Files

- **FILE-001**: `playwright.config.ts` – Configuration globale Playwright, projets `chromium` et `firefox`.
- **FILE-002**: `e2e/specs/oggdude-import.spec.ts` – Scénario E2E sur l'importeur OggDude.
- **FILE-003**: `e2e/utils/foundryUI.ts` – Helpers UI Foundry (Game Settings, System Settings, `ensureSessionActive`).
- **FILE-004**: `e2e/utils/foundrySession.ts` – Helpers de session Foundry (login, enterWorld, join).
- **FILE-005**: `documentation/tests/e2e/playwright-chromium-issues-addendum.md` – Analyse actuelle des problèmes Chromium.
- **FILE-006**: `documentation/tests/e2e/playwright-e2e-guide.md` – Guide principal E2E Playwright.

## 6. Testing

- **TEST-001**: Exécuter `pnpm e2e --project=chromium` et vérifier que les deux specs (`bootstrap`, `oggdude-import`) passent sans skip ni timeout.
- **TEST-002**: Exécuter `pnpm e2e --project=firefox` pour s'assurer qu'aucune régression n'est introduite côté Firefox.
- **TEST-003**: En cas d'échec Chromium, utiliser `pnpm exec playwright show-trace <trace.zip>` pour identifier précisément si la session est perdue, et où.
- **TEST-004**: Vérifier manuellement dans l'UI (mode headed ou `e2e:ui`) que l'ouverture des Game Settings + System Settings ne provoque pas de retour à `/join`.
- **TEST-005**: Ajouter un test unitaire ou un test d'intégration léger pour `ensureSessionActive` (simuler `/game` vs `/join` et vérifier les erreurs levées).

## 7. Risks & Assumptions

- **RISK-001**: Modifications de `launchOptions` ou de la gestion de session pouvant masquer un bug sous-jacent côté Foundry.
- **RISK-002**: Augmentation des timeouts qui allonge trop la durée des suites E2E sur Chromium.
- **RISK-003**: Effets de bord possibles sur d'autres scénarios E2E si la config Chromium est trop agressive.

- **ASSUMPTION-001**: Firefox reste le navigateur de référence pour les utilisateurs Foundry, Chromium est un plus pour compat et CI.
- **ASSUMPTION-002**: Le monde `Swerpg-E2E-World` est stable et ne contient pas de configuration spécifique qui invaliderait les tests.
- **ASSUMPTION-003**: Les problèmes de session observés sur Chromium ne sont pas liés à des extensions ou configurations locales du navigateur.

## 8. Related Specifications / Further Reading

- `documentation/tests/e2e/playwright-chromium-issues-addendum.md` – Analyse détaillée des problèmes Chromium.
- `documentation/tests/e2e/playwright-e2e-guide.md` – Guide principal d'utilisation Playwright pour Swerpg.
- Foundry VTT Knowledge Base / API v13 – Référence sur la gestion de session et l'authentification.

