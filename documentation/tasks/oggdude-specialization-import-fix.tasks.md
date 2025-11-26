# Tasks: Fix Import Spécialisation OggDude Dataset Vide

Version: 1.0  
Date: 2025-11-23  
Owner: herve.darritchon  
Status: Planned

## Phase 1: Diagnostic

- TASK-001 Analyser mapper actuel
- TASK-002 Ajouter logs entrée (temporaire)
- TASK-003 Vérifier fonction skill codes
- TASK-004 Inspecter filtre final
- TASK-005 Vérifier appel processElements
- TASK-006 Auditer tests existants
- TASK-007 Synthèse diagnostic

## Phase 2: Correction Mapper

- TASK-008 Log début mapper + debug flag
- TASK-009 Try/catch par item + sanitization description
- TASK-010 Normalisation careerSkills (fallback [])
- TASK-011 Log per-item rejet (debug uniquement)
- TASK-012 Filtre explicite objets valides
- TASK-013 Log sortie mapper (mapped/rejected)
- TASK-014 Test manuel script isolé

## Phase 3: Statistiques & Progression

- TASK-015 Auditer computeDomainStatus
- TASK-016 Vérifier emitProgress increment
- TASK-017 Recalcul invariant + log correctif
- TASK-018 Ajouter compteur rejected dans retour mapper
- TASK-019 Propager rejectedCount dans processOggDudeData
- TASK-020 Mettre à jour \_buildImportDomainStatus

## Phase 4: Tests & Validation

- TASK-021 Test nominal mapper
- TASK-022 Test résilience mixé
- TASK-023 Test intégration import complet UI
- TASK-024 Audit console logs finaux
- TASK-025 Test dataset totalement invalide
- TASK-026 Exécuter suite complète `pnpm test`

## Phase 5: Documentation & Changelog

- TASK-027 Mise à jour OGGDUDE_IMPORT.md
- TASK-028 Commentaires intentionnels dans mapper
- TASK-029 Nettoyage logs verbeux
- TASK-030 Mise à jour CHANGELOG.md
- TASK-031 Commit & PR avec message standard

## Phase 6: Post-Implémentation

- TASK-032 Ajouter éventuelle config duplication handling
- TASK-033 Créer test performance n=1000
- TASK-034 Surveiller taux rejet réel utilisateurs

## Mapping Requirements → Tasks

| Requirement | Tasks           |
| ----------- | --------------- |
| REQ-001     | 008,009,012,013 |
| REQ-002     | 009,011,013     |
| REQ-003     | 015,017,020     |
| REQ-004     | 016,019         |
| REQ-005     | 010             |
| REQ-006     | 009             |
| REQ-007     | 008             |
| REQ-008     | 013             |
| REQ-009     | 008,011         |

## Deliverables

- Mapper refactoré + tests
- Statistiques cohérentes
- Documentation mise à jour
- ADR-0006 créée

## Exit Criteria

Tous les tests passent, invariant respecté, dataset importé non-vide sur dataset réel (≥95% items mappés ou logs rejet explicites).
