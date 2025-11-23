---
---

Une fois implémenté : changer `status: 'Planned'` → `In progress` → `Completed`.

## 10. Suivi

- ADR-0006 (à créer) : Stratégie d'isolation des erreurs par item pour import spécialisation.

## 9. Decision Records Liés

| RISK-003 | Données OggDude inattendues | Validation structure + fallback |
| RISK-002 | Régression autres domaines | Exécuter test suite complète |
| RISK-001 | Volume de logs élevé | Flag debug `CONFIG.debug.importer` |
|----|--------|------------|
| ID | Risque | Mitigation |

## 8. Risks

| Performance | Import ≤ 1.2x temps armor | Mesure `overallDurationMs` |
| Coverage Mapper | ≥ 90% branches | Vitest coverage |
| Stat Invariant | Respecté | Vérif console / test intégration |
| Error Isolation | 100% erreurs capturées | Test résilience (valide + invalide) |
| Dataset Non-Vide | > 0 | Test unitaire nominal |
|-----|----------|---------|
| KPI | Objectif | Méthode |

## 7. KPIs & Validation

Référencer TASK-001 → TASK-031 (diagnostic, correction, tests, documentation).

## 6. Tasks (Voir fichier tasks dédié)

Introduire une gestion fine d'erreurs dans le mapper avec comptage `rejected`, logs de début/fin et propagation des métriques dans `processOggDudeData` jusqu'à l'UI. Correction de `computeDomainStatus` pour calculer `total` à partir des compteurs réels.

## 5. Solution Overview

- WHEN descriptions are ingested THEN THE SYSTEM SHALL sanitize HTML (SEC-001)
- IF skill codes are missing THEN THE SYSTEM SHALL default to `[]` (REQ-005)
- WHEN progress is emitted THEN THE SYSTEM SHALL increment `processed` for every attempted item (REQ-004)
- WHEN import statistics are computed THEN THE SYSTEM SHALL enforce `imported + rejected ≤ total` (REQ-003)
- IF a specialization item fails mapping THEN THE SYSTEM SHALL log an item-level error without aborting (REQ-002)
- WHEN valid JSON specialization entries are mapped THEN THE SYSTEM SHALL produce a non-empty dataset (REQ-001)

## 4. Requirements (EARS)

4. Pas de comptage `rejected` propagé → incohérence `imported + rejected > total` après clamp.
3. `emitProgress` n'est pas appelé pour les spécialisations en l'absence de dataset mappé.
2. `extractRawSpecializationSkillCodes` retourne `undefined` et casse la construction d'objet.
1. `specializationMapper` retourne systématiquement `null` pour chaque entrée → filtrage élimine tout.

## 3. Root Cause (Hypothèse)

| SYM-004 | Absence de logs par item | Diagnostic difficile |
| SYM-003 | Progression import non incrémentée | UI confuse (0/1) |
| SYM-002 | Invariant statistiques violé | Métriques globales erronées |
| SYM-001 | Dataset vide malgré JSON extraits | Domaine inutilisable |
|------------|-------------|--------|
| Symptom ID | Description | Impact |

## 2. Symptômes

- Invariant violé dans `computeDomainStatus`
- `Domaine specialization sans données, import ignoré`
- `datasetSize: 0`
- `jsonData: Array(123)`
Logs clés :

Lors de l'import du domaine `specialization`, l'étape `BuildJsonDataFromDirectory` extrait **123 éléments JSON** mais le mapper produit un dataset **vide (0)**. Le processus est ignoré sans création d'items et les métriques enfreignent l'invariant `imported + rejected ≤ total`.

## 1. Contexte

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

# Bug: Import Spécialisation OggDude Dataset Vide

---
tags: ['bug', 'importer', 'specialization', 'oggdude', 'diagnostic']
status: 'Planned'
owner: herve.darritchon
last_updated: 2025-11-23
date_created: 2025-11-23
version: 1.0
goal: Corriger l'import OggDude des spécialisations produisant un dataset vide

