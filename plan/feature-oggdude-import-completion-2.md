---
goal: Finalisation Import OggDude (Observabilité, Tests, UX, Performance)
version: 1.0
date_created: 2025-11-13
last_updated: 2025-11-13
owner: swerpg.core-team
status: 'Planned'
tags: ['feature','import','oggdude','observability','testing','performance','ux','documentation']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Plan d'implémentation pour compléter la feature d'import OggDude en couvrant les éléments non encore implémentés: observabilité complète, localisation FR, couverture de tests, améliorations UX (prévisualisation & progression), optimisation performance (streaming, parallélisation, cache, retry), documentation d'extension pratique. Ce plan détaille les phases nécessaires, leurs tâches atomiques et les critères de complétion mesurables.

## 1. Requirements & Constraints

- **REQ-OBS-001**: Le système DOIT fournir des statistiques d'import par domaine (armor, weapons, gear, species, careers) avec compte total, succès, erreurs, temps de traitement.
- **REQ-OBS-002**: Le système DOIT exposer des métriques globales (durée totale, nombre de domaines traités, taux d'erreur global, taille archive, vitesse moyenne items/s).
- **REQ-I18N-001**: Le système DOIT fournir la localisation FR pour toutes les clés liées à l'import OggDude existantes dans `lang/en.json`.
- **REQ-TEST-001**: Le système DOIT avoir tests unitaires pour `OggDudeDataImporter`, `OggDudeImporter`, `OggDudeDataElement` couvrant 90% lignes et branches.
- **REQ-TEST-002**: Le système DOIT avoir tests d'intégration pour armor, weapon, gear import analogues à species/career existants.
- **REQ-TEST-003**: Le système DOIT valider sécurité des chemins (prévention traversée) via tests dédiés.
- **REQ-UX-001**: Le système DOIT proposer une prévisualisation détaillée des items à importer (table paginée, filtres par domaine, indicateurs d'items nouveaux vs existants).
- **REQ-UX-002**: Le système DOIT afficher une barre de progression par domaine et une progression globale (0–100%).
- **REQ-PERF-001**: Le système DOIT permettre le traitement de fichiers ZIP > 50MB sans blocage UI via streaming incrémental.
- **REQ-PERF-002**: Le système DOIT paralléliser le traitement des domaines (pool limité pour éviter surcharge) avec gain de temps ≥ 30% vs séquentiel sur dataset > 10k items simulé.
- **REQ-PERF-003**: Le système DOIT mettre en cache les résolutions de mapping (skill, property, quality, range) pour réduire temps de résolution de ≥ 50% sur répétitions.
- **REQ-RES-001**: Le système DOIT effectuer un retry (max 2) sur erreurs transitoires (lecture ZIP, parsing XML) avant échec définitif.
- **SEC-001**: Validation stricte des chemins internes ZIP (interdiction caractères '../', '\\', drive letters) avant extraction.
- **CON-001**: Compatibilité Foundry VTT v13 maintenue (pas d'utilisation d'API V14+).
- **PAT-001**: Respect des patterns existants (Strategy pour mappers, Template Method pour orchestration, Registry pour context builders).
- **PERF-001**: Aucune opération CPU lourde sur le thread principal > 16ms (mesurée via timestamps). Découpage en micro-tâches ou Web Worker si nécessaire.
- **LOG-001**: Toutes erreurs sont loggées via `logger.error` avec code d'erreur normalisé (ex: OGGD-IMP-ERR-XML, OGGD-IMP-ERR-PATH).

## 2. Implementation Steps

### Implementation Phase 1 - Observabilité & Localisation

- GOAL-001: Implémenter statistiques par domaine, métriques globales, localisation FR. Critères: API `get<Domain>ImportStats()` disponibles, structure commune, rendu UI, 100% des clés FR ajoutées.


| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Créer `module/importer/utils/weapon-import-utils.mjs` avec `getWeaponImportStats()` | | |
| TASK-002 | Créer `module/importer/utils/gear-import-utils.mjs` avec `getGearImportStats()` | ✅ | 2025-11-13 |
| TASK-003 | Créer `module/importer/utils/species-import-utils.mjs` avec `getSpeciesImportStats()` | ✅ | 2025-11-13 |
| TASK-004 | Créer `module/importer/utils/career-import-utils.mjs` avec `getCareerImportStats()` | ✅ | 2025-11-13 |
| TASK-005 | Créer `module/importer/utils/global-import-metrics.mjs` exposant `aggregateImportMetrics()` | ✅ | 2025-11-13 |
| TASK-006 | Étendre UI `OggDudeDataImporter` pour afficher tableau récap stats + section métriques globales | ✅ | 2025-11-13 |
| TASK-007 | Ajouter instrumentation (timestamps, counters) dans `OggDudeImporter` (début/fin domaine) | ✅ | 2025-11-13 |
| TASK-008 | Ajouter localisation FR manquante dans `lang/fr.json` (toutes clés import) | ✅ | 2025-11-13 |
| TASK-009 | Ajouter tests unitaires basiques pour chaque utilitaire stats (retour structure attendue) | ✅ | 2025-11-13 |
| TASK-010 | Mettre à jour documentation architecture pour inclure schéma métriques | ✅ | 2025-11-13 |

### Implementation Phase 2 - Couverture de Tests

- GOAL-002: Atteindre 90% couverture sur composants clé + tests intégration manquants. Critères: rapport coverage ≥ 90%, tests intégration passent, sécurité chemins testée.


| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | Écrire tests unitaires `tests/importer/oggDudeDataImporter.spec.mjs` | | |
| TASK-012 | Écrire tests unitaires `tests/importer/oggDudeImporter.spec.mjs` | | |
| TASK-013 | Écrire tests unitaires `tests/importer/oggDudeDataElement.spec.mjs` | | |
| TASK-014 | Créer tests intégration armor `tests/integration/armor-import.integration.spec.mjs` | | |
| TASK-015 | Créer tests intégration weapon `tests/integration/weapon-import.integration.spec.mjs` | | |
| TASK-016 | Créer tests intégration gear `tests/integration/gear-import.integration.spec.mjs` | | |
| TASK-017 | Créer test sécurité chemins `tests/importer/path-validation.spec.mjs` | | |
| TASK-018 | Ajouter script CI exécution ciblée tests import (workflow update) | | |
| TASK-019 | Mettre à jour `TESTS_COVERAGE_IMPROVEMENT.md` avec nouvelles métriques | | |

### Implementation Phase 3 - UX Prévisualisation & Progression

- GOAL-003: Offrir prévisualisation filtrable et progression multi-domaines. Critères: UI affiche liste items par domaine avant import, boutons appliquer sélection, barres progression mises à jour en temps réel.


| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-020 | Ajouter mode "préchargement" pour parser XML sans créer d'items (stockage temporaire) | | |
| TASK-021 | Créer composant UI prévisualisation dans template `oggDudeDataImporter.hbs` | | |
| TASK-022 | Implémenter pagination (50 items/page) + filtres domaine/texte | | |
| TASK-023 | Ajouter indicateur items existants vs nouveaux (comparaison par nom + type) | | |
| TASK-024 | Implémenter barres de progression (domaine + globale) avec événements updates | | |
| TASK-025 | Ajouter accessibilité (ARIA) pour tables et barres progression | | |
| TASK-026 | Tests UI prévisualisation (structure DOM, nombres affichés) | | |
| TASK-027 | Documentation utilisateur prévisualisation & progression | | |

### Implementation Phase 4 - Performance & Résilience

- GOAL-004: Optimiser traitement gros fichiers et ajouter cache/retry. Critères: démonstration bench interne (script) montrant réduction temps ≥ 30%, cache actif, retry fonctionnel.


| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-028 | Implémenter lecture ZIP streaming (JSZip async chunking) | | |
| TASK-029 | Découper parsing en micro-tâches (setTimeout / queueMicrotask) | | |
| TASK-030 | Implémenter pool de workers (Web Worker ou pseudo-parallélisme) pour domaines | | |
| TASK-031 | Ajouter cache mapping (Map mémoire + clé normalisée) | | |
| TASK-032 | Instrumenter mesures avant/après (bench script) | | |
| TASK-033 | Implémenter logique retry (2 tentatives) sur erreurs transitoires | | |
| TASK-034 | Ajouter tests pour cache (hit/miss) et retry | | |
| TASK-035 | Ajouter doc performance & guide tuning (limites pool) | | |

### Implementation Phase 5 - Documentation & Validation Guides

- GOAL-005: Finaliser exemples pratiques et valider guides. Critères: exemples exécutables ajoutés, guide mis à jour, validation croisée par test type exemple.


| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-036 | Créer exemples extension nouveau type (ex: Specialization) doc pas-à-pas | | |
| TASK-037 | Implémenter mini PoC mapper Specialization pour validation guide (sans import complet) | | |
| TASK-038 | Mettre à jour `documentation/swerpg/architecture/oggdude/oggdude-import.md` (sections complétées) | | |
| TASK-039 | Ajouter section "Troubleshooting Import" | | |
| TASK-040 | Revue finale cohérence patterns (Strategy/Registry) décision record (ADR) | | |
| TASK-041 | Générer checklist de validation pour nouveaux mappers | | |
| TASK-042 | Ajout liens croisés vers tests et métriques dans doc | | |

## 3. Alternatives

- **ALT-001**: Défer observabilité après performance — rejeté (visibilité nécessaire pour mesurer bénéfices).
- **ALT-002**: Implémentation prévisualisation après performance — rejeté (UX feedback primordial avant optimisation).
- **ALT-003**: Parallélisation via WebAssembly — rejeté (complexité élevée, bénéfice incertain à ce stade).

## 4. Dependencies

- **DEP-001**: JSZip (déjà présent) support streaming async.
- **DEP-002**: Foundry VTT v13 ApplicationV2 APIs.
- **DEP-003**: Vitest pour tests unitaires & intégration.
- **DEP-004**: Logger interne `module/utils/logger.mjs`.
- **DEP-005**: Infrastructure i18n existante `lang/*.json`.
- **DEP-006**: Mécanismes de packaging YAML → packs (validation impact import).

## 5. Files

- **FILE-001**: `module/importer/oggDude.mjs` (ajouts instrumentation, streaming, retry, pool).
- **FILE-002**: `module/settings/OggDudeDataImporter.mjs` (UI stats, prévisualisation, progression).
- **FILE-003**: `templates/settings/oggDudeDataImporter.hbs` (sections stats, preview, progress bars).
- **FILE-004**: `module/importer/utils/armor-import-utils.mjs` (déjà existant, adaptation format commun).
- **FILE-005**: `module/importer/utils/weapon-import-utils.mjs` (nouveau).
- **FILE-006**: `module/importer/utils/gear-import-utils.mjs` (nouveau).
- **FILE-007**: `module/importer/utils/species-import-utils.mjs` (nouveau).
- **FILE-008**: `module/importer/utils/career-import-utils.mjs` (nouveau).
- **FILE-009**: `module/importer/utils/global-import-metrics.mjs` (nouveau).
- **FILE-010**: `lang/fr.json` (ajout clés import).
- **FILE-011**: `tests/importer/oggDudeDataImporter.spec.mjs` (nouveau).
- **FILE-012**: `tests/importer/oggDudeImporter.spec.mjs` (nouveau).
- **FILE-013**: `tests/importer/oggDudeDataElement.spec.mjs` (nouveau).
- **FILE-014**: `tests/integration/armor-import.integration.spec.mjs` (nouveau).
- **FILE-015**: `tests/integration/weapon-import.integration.spec.mjs` (nouveau).
- **FILE-016**: `tests/integration/gear-import.integration.spec.mjs` (nouveau).
- **FILE-017**: `tests/importer/path-validation.spec.mjs` (nouveau).
- **FILE-018**: `documentation/swerpg/architecture/oggdude/oggdude-import.md` (mise à jour).
- **FILE-019**: `docs/adr/` (nouvel ADR performance & cache si manquant).
- **FILE-020**: `scripts/bench/import-benchmark.mjs` (benchmark interne performance).

## 6. Testing

- **TEST-001**: Unit tests stats utils (structure: {total, success, error, durationMs}).
- **TEST-002**: Unit tests importer instrumentation (timestamps présents, metrics agrégées).
- **TEST-003**: Unit tests path validation (refuse '../', '\\', drive letters).
- **TEST-004**: Integration tests armor/weapon/gear import (vérifier nombre items importés > 0, absence erreurs critiques).
- **TEST-005**: UI tests prévisualisation (compte items avant import = données parsées).
- **TEST-006**: Performance benchmark script (log temps séquentiel vs parallèle; assertion amélioration ≥ 30%).
- **TEST-007**: Cache mapping test (résolution répétée plus rapide second passage; mesurer delta temps).
- **TEST-008**: Retry test (simuler erreur transitoire première tentative, succès seconde).
- **TEST-009**: i18n test (toutes clés EN import présentes en FR; comparaison listes).

## 7. Risks & Assumptions

- **RISK-001**: Streaming ZIP peut ne pas offrir gain significatif si JSZip limitations.
- **RISK-002**: Parallélisation peut introduire conditions de course sur métriques globales.
- **RISK-003**: Cache mapping peut augmenter mémoire (OOM sur gros sets).
- **RISK-004**: Prévisualisation peut ralentir traitement si rendu trop tôt.
- **ASSUMPTION-001**: Données OggDude cohérentes (pas d'XML malformé massif).
- **ASSUMPTION-002**: Nombre de domaines simultanés ≤ 5 (limite actuelle).
- **ASSUMPTION-003**: Environnements CI disposent de ressources suffisantes pour benchmarks.

## 8. Related Specifications / Further Reading

- `documentation/swerpg/architecture/oggdude/oggdude-import.md`
- Plan existant `plan/feature-oggdude-import-completion-1.md`
- Refactoring mappers: `plan/refactor-armor-oggdude-mapper.md`, `plan/refactor-weapon-oggdude-mapper.md`, `plan/refactor-gear-oggdude-mapper.md`
- Foundry VTT API v13 Docs
- JSZip Documentation
- Vitest Documentation
