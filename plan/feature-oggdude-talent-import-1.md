---
goal: Implémenter l'import OggDude des Talents compatible avec le modèle `SwerpgTalent`
version: 1.0
date_created: 2025-11-14
last_updated: 2025-11-14
owner: swerpg-core-team
status: 'Completed'
tags: ['feature', 'import', 'oggdude', 'talent', 'architecture']
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Plan d'implémentation déterministe pour ajouter l'import OggDude des Talents dans le système SWERPG Foundry VTT. Les objets importés doivent être entièrement compatibles avec le modèle de données `module/models/talent.mjs` (classe `SwerpgTalent`). Le plan suit la structure existante de l'architecture d'import OggDude et respecte les exigences de sécurité, observabilité, i18n, accessibilité et performance.

## 1. Requirements & Constraints

- **REQ-001**: Le système DOIT permettre l'import sélectif du domaine `talent` via l'UI `OggDudeDataImporter`.
- **REQ-002**: Chaque talent importé DOIT être instancié comme un Item Foundry avec data conforme à `SwerpgTalent.defineSchema()`.
- **REQ-003**: Les champs OggDude (nom, description, ranked, cost, tier, prerequisites, actions) DOIVENT être mappés vers la structure interne (`node`, `rank.idx`, `rank.cost`, `activation`, `isRanked`, `actorHooks`, `actions`).
- **REQ-004**: Les talents doivent référencer un `SwerpgTalentNode` existant ou créer un nœud si absent selon stratégie contrôlée (pattern Registry + Factory).
- **REQ-005**: Le mapping DOIT gérer les talents "signature" et établir `teleportNode` si applicable.
- **REQ-006**: Le système DOIT calculer et exposer des statistiques d'import pour le domaine `talent` (total, rejected, imported) via utilitaires similaires aux autres domaines.
- **REQ-007**: Validation stricte: rejet si prerequisites invalides, duplication de nom, node inconnu, coût négatif, tier hors limites, données rank incohérentes.
- **REQ-008**: Observabilité complète: logs structurés, métriques globales intégrées (`aggregateImportMetrics` inclut `talent`).
- **REQ-009**: I18n: toutes les erreurs et labels UI DOIVENT utiliser `game.i18n.localize/format` avec ajout de clés en `lang/en.json` et `lang/fr.json`.
- **REQ-010**: Sécurité: prévention de path traversal dans chargement OggDude; aucune exécution de code arbitraire depuis contenu importé; fonctions JavaScript externes ignorées ou neutralisées.
- **REQ-011**: Performance: parsing XML unique, mapping O(n); éviter allocations inutiles; tests performance > 500 talents sous seuil ≤ 4500ms en environnement CI.
- **REQ-012**: Accessibilité: ajout domain "talent" dans UI avec attributs aria (bouton toggle). Focus order préservé.
- **REQ-013**: Tests intégration couvrent import complet, cas rejet, métriques, préservation `lastImportStats`.
- **REQ-014**: Conformité aux instructions importer-memory & importer-metrics-memory (reset stats, exposer getters).
- **REQ-015**: Pas d'introduction de dépendances externes supplémentaires sans justification.
- **SEC-001**: Aucune évaluation dynamique de code depuis data OggDude (champ scripts ignoré).
- **SEC-002**: Vérification de tiers et coûts numériques (Number.isFinite, bornes).
- **CON-001**: Compatibilité Foundry VTT v13.
- **PAT-001**: Pattern Strategy pour mapper; pattern Registry pour nodes; Template Method pour orchestrateur; Utilitaires stats uniformes.
- **GUD-001**: Utiliser `resetTalentImportStats()` avant chaque session d'import pour éviter fuite state.
- **GUD-002**: Utiliser `markGlobalStart/end` autour global import; `recordDomainStart/end('talent')` pendant mapping.

## 2. Implementation Steps

### Implementation Phase 1 - Préparation du domaine Talent

- GOAL-001: Introduire le domaine `talent` dans l'infrastructure d'import existante.

| Task     | Description                                                                                                                                  | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Ajouter constante domaine `talent` dans `module/importer/oggDude.mjs` (registry buildContextMap).                                            |           |      |
| TASK-002 | Étendre liste sélection UI (template `templates/settings/oggDudeDataImporter.hbs`) pour inclure checkbox `talent` avec attributs aria-label. |           |      |
| TASK-003 | Ajouter clés i18n: `SETTINGS.OggDudeDataImporter.domain.talent` (label), `TALENT.IMPORT.ERRORS.*` dans `lang/en.json` & `lang/fr.json`.      |           |      |
| TASK-004 | Ajouter logique toggle domaine talent dans classe `OggDudeDataImporter` (`toggleDomainAction`).                                              |           |      |

### Implementation Phase 2 - Tables de Mapping OggDude → SwerpgTalent

- GOAL-002: Créer modules de résolution dédiés pour champs spécifiques.

| Task     | Description                                                                                                                          | Completed | Date       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---------- |
| TASK-005 | Créer `module/importer/mappings/oggdude-talent-activation-map.mjs` (map activation codes → `SYSTEM.TALENT_ACTIVATION`).              | ✅        | 2025-11-14 |
| TASK-006 | Créer `module/importer/mappings/oggdude-talent-node-map.mjs` (résolution node par nom ou id, création contrôlée).                    | ✅        | 2025-11-14 |
| TASK-007 | Créer `module/importer/mappings/oggdude-talent-prerequisite-map.mjs` (transform XML prerequisites → structure requirements).         | ✅        | 2025-11-14 |
| TASK-008 | Créer `module/importer/mappings/oggdude-talent-rank-map.mjs` (map tiers, cost, idx).                                                 | ✅        | 2025-11-14 |
| TASK-009 | Créer `module/importer/mappings/oggdude-talent-actions-map.mjs` (placeholder actions instanciées en `SwerpgAction` ou listes vides). | ✅        | 2025-11-14 |

### Implementation Phase 3 - Utilitaires Statistiques Talent

- GOAL-003: Implémenter comptage stats conforme aux autres domaines.

| Task     | Description                                                                                                                                      | Completed | Date       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---------- |
| TASK-010 | Créer `module/importer/utils/talent-import-utils.mjs` avec: `resetTalentImportStats`, `incrementTalentImportStat(type)`, `getTalentImportStats`. | ✅        | 2025-11-14 |
| TASK-011 | Initialiser structure interne: `{ total, rejected, imported(getter) }`.                                                                          | ✅        | 2025-11-14 |
| TASK-012 | Ajouter ré-export dans mapper pour tests.                                                                                                        | ✅        | 2025-11-14 |
| TASK-013 | Intégrer domaine talent dans `getAllImportStats()` (`global-import-metrics.mjs`) + ajuster interface retour.                                     | ✅        | 2025-11-14 |
| TASK-014 | Mettre à jour tests existants qui consomment `getAllImportStats()` (adapter assertions).                                                         | ✅        | 2025-11-14 |

### Implementation Phase 4 - Mapper Talent

- GOAL-004: Créer module de mapping principal pour talents.

| Task     | Description                                                                                                                  | Completed | Date       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-015 | Créer fichier `module/importer/mappers/oggdude-talent-mapper.mjs` avec logique Template Method + Strategy.                   | ✅        | 2025-11-14 |
| TASK-016 | Appeler `resetTalentImportStats()` au début; `recordDomainStart('talent')` avant boucle; `recordDomainEnd('talent')` après.  | ✅        | 2025-11-14 |
| TASK-017 | Parser XML `Data/Talents.xml` depuis ZIP (sécurité: refuser chemins avec `..` ou séparateurs).                               | ✅        | 2025-11-14 |
| TASK-018 | Pour chaque entrée: incrémenter `total`; effectuer mapping via tables; construire objet data conforme schema.                | ✅        | 2025-11-14 |
| TASK-019 | Validation: nom non vide unique, node résolu; tier ∈ [0..5]; cost ≥ 0; prerequisites structure valide; ranked flag cohérent. | ✅        | 2025-11-14 |
| TASK-020 | Gestion signature: si tag signature présent, associer node.type='signature' et préparer `teleportNode`.                      | ✅        | 2025-11-14 |
| TASK-021 | En cas d'échec validation: incrémenter `rejected`; `logger.warn` + message i18n; continuer.                                  | ✅        | 2025-11-14 |
| TASK-022 | Pousser items valides dans collection résultat (array).                                                                      | ✅        | 2025-11-14 |
| TASK-023 | Retourner tableau d'Items pré-formatés (prêts pour création via Foundry).                                                    | ✅        | 2025-11-14 |

### Implementation Phase 5 - Intégration Orchestrateur

- GOAL-005: Intégrer mapper Talent dans pipeline import.

| Task     | Description                                                                                                                 | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-024 | Modifier `module/importer/oggDude.mjs`: inclure `talent` dans `buildContextMap` avec fonction `buildTalentContext()`.       | ✅        | 2025-11-14 |
| TASK-025 | Implémenter `buildTalentContext()` dans `module/importer/items/talent-ogg-dude.mjs` compatible avec architecture existante. | ✅        | 2025-11-14 |
| TASK-026 | Assurer déclenchement via sélection UI (domaine actif).                                                                     | ✅        | 2025-11-14 |
| TASK-027 | Ajouter progression: callback `progressCb({ domain:'talent', processed, imported, rejected })`.                             | ✅        | 2025-11-14 |
| TASK-028 | Après import global, `render()` UI pour rafraîchir métriques incluant talent.                                               | ✅        | 2025-11-14 |

### Implementation Phase 6 - Tests & Validation

- GOAL-006: Couverture tests intégration + unité.

| Task     | Description                                                                        | Completed | Date       |
| -------- | ---------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-029 | Créer tests unitaires pour utilitaires (`tests/importer/talent-utils.spec.mjs`).   | ✅        | 2025-11-14 |
| TASK-030 | Créer tests unitaires pour mappings (`tests/importer/talent-mappings.spec.mjs`).   | ✅        | 2025-11-14 |
| TASK-031 | Créer tests unitaires mapper principal (`tests/importer/talent-mapper.spec.mjs`).  | ✅        | 2025-11-14 |
| TASK-032 | Test mapping activation, node, prerequisites, rank, actions avec mocks appropriés. | ✅        | 2025-11-14 |
| TASK-033 | Test stats: `getTalentImportStats()` structure et méthodes reset/increment.        | ✅        | 2025-11-14 |
| TASK-034 | Test validation: contexte talent, transformation données, fallbacks gracieux.      | ✅        | 2025-11-14 |
| TASK-035 | Coverage complète: utilitaires, mappings, mapper principal avec cas d'erreur.      | ✅        | 2025-11-14 |
| TASK-036 | Tests intégration avec mocks SwerpgTalentNode et SYSTEM constants.                 | ✅        | 2025-11-14 |
| TASK-037 | Tests validation données OggDude → SwerpgTalent avec edge cases.                   | ✅        | 2025-11-14 |
| TASK-038 | Tests builder contexte et génération clés uniques talents.                         | ✅        | 2025-11-14 |

### Implementation Phase 7 - Documentation

- GOAL-007: Mettre à jour docs architecture & guides.

| Task     | Description                                                                              | Completed | Date       |
| -------- | ---------------------------------------------------------------------------------------- | --------- | ---------- |
| TASK-039 | Créer documentation architecture complète `docs/importer/talent-import-architecture.md`. | ✅        | 2025-11-14 |
| TASK-040 | Documenter patterns Strategy + Template Method, Registry, modules spécialisés.           | ✅        | 2025-11-14 |
| TASK-041 | Documenter flux de données, gestion d'erreurs, métriques, extension future.              | ✅        | 2025-11-14 |
| TASK-042 | Documenter intégration écosystème, compatibilité SwerpgTalent, sécurité.                 | ✅        | 2025-11-14 |

### Implementation Phase 8 - Optimisations & Qualité

- GOAL-008: Renforcer performance, sécurité, accessibilité.

| Task     | Description                                                                                         | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-043 | Caching résolution node (Map nom→instance) dans mapper pour éviter recherches multiples.            |           |      |
| TASK-044 | Profilage allocations mémoire (console profiling) sur import volumétrique.                          |           |      |
| TASK-045 | Vérifier absence de `innerHTML` injection depuis description OggDude (sanitisation si nécessaire).  |           |      |
| TASK-046 | Implémenter roving tabindex si ajout sous-liste interactive talent dans UI (préparé, conditionnel). |           |      |
| TASK-047 | Ajouter logs niveau debug pour timings domaine talent.                                              |           |      |
| TASK-048 | Vérifier ratio errorRate < 0.1 sur dataset test (sinon améliorer validations).                      |           |      |

## 3. Alternatives

- **ALT-001**: Fusionner mapper talent avec mappers existants (monolithique) – rejeté (maintenabilité réduite).
- **ALT-002**: Créer nodes systématiquement sans vérification d'existence – rejeté (risque duplication / incohérence arbre).
- **ALT-003**: Ignorer métriques talent spécifiques – rejeté (observabilité incomplète).

## 4. Dependencies

- **DEP-001**: Foundry VTT v13 API (TypeDataModel, Item creation).
- **DEP-002**: OggDude XML `Talents.xml` structure (source de données).
- **DEP-003**: Modules mapping existants (skills, prerequisites) si réutilisation partielle.
- **DEP-004**: Système de métriques globales `module/importer/utils/global-import-metrics.mjs`.
- **DEP-005**: Logger `module/utils/logger.mjs`.

## 5. Files

- **FILE-001**: `module/importer/items/talent-ogg-dude.mjs` (context builder compatible architecture existante) ✅.
- **FILE-002**: `module/importer/mappers/oggdude-talent-mapper.mjs` (mapper principal Template Method) ✅.
- **FILE-003**: `module/importer/mappings/oggdude-talent-activation-map.mjs` (mapping activations) ✅.
- **FILE-004**: `module/importer/mappings/oggdude-talent-node-map.mjs` (résolution nœuds) ✅.
- **FILE-005**: `module/importer/mappings/oggdude-talent-prerequisite-map.mjs` (transform prérequis) ✅.
- **FILE-006**: `module/importer/mappings/oggdude-talent-rank-map.mjs` (gestion rangs/tiers) ✅.
- **FILE-007**: `module/importer/mappings/oggdude-talent-actions-map.mjs` (transform actions) ✅.
- **FILE-008**: `module/importer/utils/talent-import-utils.mjs` (utilitaires et stats) ✅.
- **FILE-009**: `module/importer/utils/global-import-metrics.mjs` (extension pour talent) ✅.
- **FILE-010**: `tests/importer/talent-utils.spec.mjs` (tests utilitaires) ✅.
- **FILE-011**: `tests/importer/talent-mappings.spec.mjs` (tests mappings) ✅.
- **FILE-012**: `tests/importer/talent-mapper.spec.mjs` (tests mapper principal) ✅.
- **FILE-013**: `docs/importer/talent-import-architecture.md` (documentation complète) ✅.
- **FILE-014**: `module/importer/oggDude.mjs` (intégration orchestrateur) ✅.

## 6. Testing

- **TEST-001**: Import simple – 3 talents valides, vérifier création Items & stats.
- **TEST-002**: Import avec duplicat nom – second rejeté, stats cohérentes.
- **TEST-003**: Import signature – vérification `teleportNode`.
- **TEST-004**: Import prerequisites invalides – rejet + message i18n spécifique.
- **TEST-005**: Performance import 500 talents – durée < seuil fixé.
- **TEST-006**: Métriques globales incluent domaine talent dans `aggregateImportMetrics`.
- **TEST-007**: Sécurité path traversal – rejet fichier malicieux.
- **TEST-008**: I18n – toutes clés erreurs résolues dans EN & FR.
- **TEST-009**: Observabilité – logs domain start/end présents.
- **TEST-010**: Reset stats – deux imports successifs indépendants.

## 7. Risks & Assumptions

- **RISK-001**: Structure XML OggDude Talents peut varier (champs manquants) → stratégie fallback valeurs par défaut.
- **RISK-002**: Création automatique de nodes non désirée → nécessite ADR si activée.
- **RISK-003**: Volume élevé XML (>> 1000 talents) impact mémoire → possible future implémentation SAX streaming.
- **RISK-004**: Complexité prerequisites (expressions) non supportées initialement (limiter à thresholds numériques).
- **ASSUMPTION-001**: Fichier `Talents.xml` suit convention simple sans scripts exécutables.
- **ASSUMPTION-002**: Environnement tests fournit mock `xml2js` déjà conforme.

## 8. Related Specifications / Further Reading

- `documentation/swerpg/architecture/oggdude/oggdude-import.md`
- `module/models/talent.mjs`
- Importer Memory & Metrics instructions (`.github/instructions/importer-memory.instructions.md`, `.github/instructions/importer-metrics-memory.instructions.md`)
- Performance Optimization instructions
- Security & OWASP instructions
- Security & OWASP instructions
