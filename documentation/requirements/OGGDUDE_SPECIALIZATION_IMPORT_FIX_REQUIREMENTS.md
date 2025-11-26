# Requirements: Fix Import Spécialisation OggDude Dataset Vide

Version: 1.0  
Date: 2025-11-23  
Owner: herve.darritchon  
Status: Draft

## 1. Scope

Corriger l'import des spécialisations OggDude (dataset vide + métriques incohérentes).

## 2. EARS Requirements

| ID      | Type         | Requirement (EARS)                                                                                            | Rationale                | Test Reference          |
| ------- | ------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------ | ----------------------- |
| REQ-001 | Event-driven | WHEN valid JSON specialization entries are processed THEN THE SYSTEM SHALL produce a non-empty mapped dataset | Données sources existent | TEST-001 nominal        |
| REQ-002 | Unwanted     | IF a specialization entry fails mapping THEN THE SYSTEM SHALL log an item-level error and continue            | Robustesse               | TEST-002 résilience     |
| REQ-003 | State-driven | WHILE computing domain statistics THE SYSTEM SHALL enforce imported + rejected ≤ total                        | Cohérence métriques      | TEST-002 / intégration  |
| REQ-004 | Event-driven | WHEN emitting progress per item THEN THE SYSTEM SHALL increment processed regardless of success/failure       | UX précise               | TEST-003 UI integration |
| REQ-005 | Unwanted     | IF skill codes are missing THEN THE SYSTEM SHALL set careerSkills=[]                                          | Prévenir crashs          | TEST-004 missing skills |
| REQ-006 | Ubiquitous   | THE SYSTEM SHALL sanitize specialization descriptions before document creation                                | Sécurité (XSS)           | TEST-005 security       |
| REQ-007 | Event-driven | WHEN mapper starts THEN THE SYSTEM SHALL log input length and sample                                          | Observabilité            | TEST-006 logging start  |
| REQ-008 | Event-driven | WHEN mapper ends THEN THE SYSTEM SHALL log counts {mapped, rejected, final}                                   | Observabilité            | TEST-006 logging end    |
| REQ-009 | Optional     | WHERE debug mode is enabled THE SYSTEM SHALL log per-item mapping attempts                                    | Diagnostic ciblé         | TEST-007 debug toggle   |

## 3. Non Functional Requirements

| ID      | Category        | Description                                                  | Metric            |
| ------- | --------------- | ------------------------------------------------------------ | ----------------- |
| NFR-001 | Performance     | Surcoût temps import spécialisation ≤ 20% du domaine armor   | Duration compare  |
| NFR-002 | Maintainability | Couverture tests mapper ≥ 90% branches                       | Coverage report   |
| NFR-003 | Reliability     | Aucune exception non-capturée dans logs                      | Log audit         |
| NFR-004 | Security        | Aucune balise script injectée dans description               | Sanitization test |
| NFR-005 | Observability   | 100% des métriques clé présentes (total, imported, rejected) | Context object    |

## 4. Edge Cases

| Case   | Description                    | Expected Behavior                                 |
| ------ | ------------------------------ | ------------------------------------------------- |
| EC-001 | Tous les items invalides       | dataset.length=0, rejected=total, pas de crash    |
| EC-002 | Items sans CareerSkills        | careerSkills=[] + log avertissement               |
| EC-003 | Items avec HTML suspect        | Description nettoyée, log sécurité                |
| EC-004 | Items dupliqués par Key        | Fusion ou rejet selon stratégie (rejet + log)     |
| EC-005 | Longue description > 10k chars | Tronquer avec suffixe '...[truncated]' + log PERF |

## 5. Traceability Matrix

| Requirement | Design Section        | Task IDs           | Test IDs |
| ----------- | --------------------- | ------------------ | -------- |
| REQ-001     | 2.1 Mapper Flow       | TASK-009..TASK-013 | TEST-001 |
| REQ-002     | 2.2 Error Handling    | TASK-009/TASK-012  | TEST-002 |
| REQ-003     | 2.3 Stats Logic       | TASK-015..TASK-020 | TEST-003 |
| REQ-004     | 2.4 Progress Emission | TASK-016/TASK-019  | TEST-003 |
| REQ-005     | 2.5 Skill Extraction  | TASK-010           | TEST-004 |
| REQ-006     | 2.6 Sanitization      | TASK-009           | TEST-005 |
| REQ-007     | 2.1 Mapper Flow       | TASK-008           | TEST-006 |
| REQ-008     | 2.1 Mapper Flow       | TASK-013           | TEST-006 |
| REQ-009     | 2.7 Debug Mode        | TASK-008/TASK-011  | TEST-007 |

## 6. Acceptance Criteria

Toutes les exigences REQ/NFR doivent être satisfaites et validées par tests automatisés + audit manuel console.

## 7. Open Questions

| ID    | Question                                  | Resolution Plan                            |
| ----- | ----------------------------------------- | ------------------------------------------ |
| Q-001 | Faut-il fusionner les doublons par Key ?  | Décision ADR séparée si doublons fréquents |
| Q-002 | Limite exacte de troncature description ? | Proposer 5k chars, ajuster après PERF test |

## 8. Sign-off

À remplir post-implémentation.
