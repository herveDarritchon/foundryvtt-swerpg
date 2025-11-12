---
goal: Refactor logger pour afficher le callsite réel (fichier + ligne) dans DevTools
version: 1.0
date_created: 2025-11-12
last_updated: 2025-11-12
owner: core-system
status: Planned
tags: [refactor, logging, developer-experience, debug]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Objectif : modifier l’implémentation du logger (`module/utils/logger.mjs`) pour que la console des DevTools pointe sur la ligne de l’appel (fichier utilisant `logger.log()` etc.) plutôt que sur les lignes internes du wrapper. Le problème actuel provient des fonctions anonymes définies dans l’objet exporté qui encapsulent chaque appel à `console.*`, ce qui déplace la source de la frame vers `logger.mjs`. La refactorisation vise une approche “pass-through” sélective qui préserve le filtrage debug tout en rendant le callsite cliquable.

## 1. Requirements & Constraints

- **REQ-001**: Les appels `logger.log|info|warn|error|debug|group|...` doivent afficher dans DevTools le fichier et la ligne du code appelant.
- **REQ-002**: Conserver la capacité d’activer/désactiver le mode debug (`enableDebug`, `disableDebug`, `setDebug`, `isDebugEnabled`).
- **REQ-003**: En mode non debug, les niveaux `error` et `warn` doivent continuer à s’afficher (comportement actuel).
- **REQ-004**: Performance : ne pas ajouter de parsing lourd de stack à chaque log.
- **REQ-005**: API publique (nom des méthodes) inchangée pour éviter une rupture.
- **REQ-006**: Couvrir le comportement par des tests Vitest (activation/désactivation et niveaux).
- **REQ-007**: Préserver compatibilité Foundry VTT v13 et ESM existant.
- **SEC-001**: Ne pas introduire de modification globale sur `console` (éviter détournement potentiellement risqué).
- **CON-001**: Pas d’ajout de dépendances externes.
- **CON-002**: Pas de transpilation supplémentaire (utiliser JS actuel).
- **GUD-001**: Respect des bonnes pratiques : éviter `innerHTML`, pas de pollution globale.
- **PAT-001**: Pattern “dynamic method reassignment” pour filtrage conditionnel sans wrapper d’exécution.
- **PERF-001**: Coût constant O(1) par appel (pas de stack introspection).
- **DX-001**: Préfixe actuel `'SWERPG ||'` conservé si faisable sans perdre le callsite (sinon documenter le changement).
- **A11Y-001**: Aucun impact UI (console uniquement), pas de contraintes supplémentaires.
- **DOC-001**: Documenter changement dans `CHANGELOG.md`.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Restructurer `logger.mjs` pour supprimer les wrappers source tout en maintenant la logique de filtrage.

| Task     | Description                                                                                                                    | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-001 | Sauvegarder contenu actuel de `module/utils/logger.mjs` (copie locale interne avant refactor).                                |           |      |
| TASK-002 | Supprimer les fonctions anonymes ligne 16–84 et remplacer par une fabrique + réassignation dynamique des méthodes.            |           |      |
| TASK-003 | Implémenter tableau des niveaux: `const LEVELS = ['log','info','warn','error','debug','group','groupCollapsed','groupEnd','table','time','timeEnd','trace','assert']`. |           |      |
| TASK-004 | Créer fonction interne `applyLogPolicy()` qui assigne pour chaque niveau soit `console[n]` (pass-through), soit `noop`.        |           |      |
| TASK-005 | Garantir que `warn` et `error` restent actifs hors debug (mapping explicite).                                                  |           |      |
| TASK-006 | Décider pour le préfixe: tester solution `logger.log = (...a)=>console.log(PREFIX, ...a)` vs pass-through pur; mesurer callsite. |           |      |
| TASK-007 | Si préfixe garde le callsite incorrect, basculer vers pass-through sans préfixe et ajouter option `logger.withPrefix()` helper. |           |      |
| TASK-008 | Mettre à jour export pour conserver signatures: `enableDebug`, etc.                                                            |           |      |
| TASK-009 | Ajouter `noop` constant (`const noop = () => {}`) pour niveaux désactivés.                                                      |           |      |

### Implementation Phase 2

- GOAL-002: Couvrir la fonctionnalité par des tests, documentation et mise à jour du changelog.

| Task     | Description                                                                                             | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-010 | Créer fichier test `tests/utils/logger.spec.mjs` couvrant activation, désactivation, permanence warn/error. |           |      |
| TASK-011 | Mock `console` dans tests pour vérifier référence directe (pas d’appel via wrapper).                    |           |      |
| TASK-012 | Test: hors debug `logger.log` doit être `noop` (aucun appel console).                                   |           |      |
| TASK-013 | Test: hors debug `logger.error` appelle `console.error`.                                                |           |      |
| TASK-014 | Test: en debug `logger.debug` appelle `console.debug`.                                                  |           |      |
| TASK-015 | Ajouter section dans `README.md` usage du nouveau logger (avertissement sur préfixe si retiré).         |           |      |
| TASK-016 | Mettre à jour `CHANGELOG.md` (tag `[Refactor] Logger callsite pass-through`).                           |           |      |
| TASK-017 | Vérifier absence de régression sur modules existants (`grep 'logger.'`).                                |           |      |
| TASK-018 | Validation manuelle dans DevTools (callsite cliquable).                                                 |           |      |
| TASK-019 | Ajouter commentaire JSDoc public décrivant stratégie callsite.                                          |           |      |

## 3. Alternatives

- **ALT-001**: Parsing stack (`new Error().stack`), extraction de la 3ᵉ frame et réémission via `console.log` — coûteux et moins lisible, faible performance.
- **ALT-002**: Monkey-patch global `console` pour injecter le préfixe — risque collisions, effet de bord global.
- **ALT-003**: Générateur Babel transformant `logger.log(...)` en `console.log(...)` à build-time — ajoute complexité outillage.
- **ALT-004**: Utiliser Proxy pour intercepter appels — toujours un wrapper, ne résout pas callsite DevTools.
- **ALT-005**: Source maps artificielles ciblant wrapper — non standard pour runtime natif console.*.

Choisi: Pass-through par réassignation dynamique (faible complexité, performant, conforme REQ-001).

## 4. Dependencies

- **DEP-001**: API Console standard navigateur + Node.
- **DEP-002**: Vitest (déjà présent) pour tests unitaires.
- **DEP-003**: Foundry VTT runtime (aucun changement requis).
- **DEP-004**: Absence de transpilation supplémentaire (direct ES module).

## 5. Files

- **FILE-001**: `module/utils/logger.mjs` — refactor du pattern d’export.
- **FILE-002**: `tests/utils/logger.spec.mjs` — nouveaux tests.
- **FILE-003**: `CHANGELOG.md` — ajout entrée refactor.
- **FILE-004**: `README.md` — documentation logger (section debug).
- **FILE-005**: `documentation/swerpg/` (si section logger existe, mise à jour).
- **FILE-006**: `eslint.config.mjs` (vérifier aucune règle cassée).

## 6. Testing

- **TEST-001**: Activation debug: toutes les méthodes (sauf assert condition vraie) appellent console.
- **TEST-002**: Désactivation debug: seulement `warn`, `error` restent fonctionnels; autres ne font rien.
- **TEST-003**: `setDebug(true/false)` commute correctement le comportement (vérifier références différentes).
- **TEST-004**: `logger.isDebugEnabled()` reflète l’état exact.
- **TEST-005**: `logger.assert(false, 'x')` hors debug émet (car error/warn passes) selon politique (vérifier décision).
- **TEST-006**: Préfixe présent si solution retenue (ou absence documentée).
- **TEST-007**: Méthodes temps `time/timeEnd` ne produisent rien hors debug (politique confirmée) — sinon ajuster.
- **TEST-008**: Aucune fuite d’état (modification de `console` non effectuée).
- **TEST-009**: Performance : appel à `logger.log` hors debug ne déclenche pas allocation significative (micro test comparatif).

## 7. Risks & Assumptions

- **RISK-001**: Perte du préfixe si pass-through direct (atténuation: helper ou convention manuelle).
- **RISK-002**: Certains navigateurs pourraient toujours afficher la fonction bound (vérification manuelle).
- **RISK-003**: Conflits si du code dépend d’effets secondaires internes (faible probabilité).
- **RISK-004**: Tests impossibles à 100% sur affichage DevTools (callsite visuel) — nécessite validation manuelle.
- **ASSUMPTION-001**: Objectif principal = callsite cliquable > maintien du préfixe.
- **ASSUMPTION-002**: Aucun code critique ne dépend du message formaté actuel (`SWERPG ||`).
- **ASSUMPTION-003**: Node/Vitest n’exigent pas préfixe pour parsing log.

## 8. Related Specifications / Further Reading

- Spécifications internes: `documentation/DEVELOPMENT_PROCESS.md`
- Fichier actuel: `module/utils/logger.mjs`
- OWASP Logging Best Practices (contexte: éviter altération globale)
- MDN Console API: https://developer.mozilla.org/en-US/docs/Web/API/Console
