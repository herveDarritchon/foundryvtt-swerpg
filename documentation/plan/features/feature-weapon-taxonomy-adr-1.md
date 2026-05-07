---
goal: Formaliser l'ADR de taxonomie des armes (system.category, system.weaponType, mapping OggDude)
version: 1.0
date_created: 2026-05-07
last_updated: 2026-05-07
owner: herve.darritchon
status: 'In progress'
tags: ['feature', 'architecture', 'documentation', 'weapon', 'taxonomy']
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

Ce plan définit les travaux pour formaliser dans un ADR (Architecture Decision Record) la taxonomie canonique des armes dans SWERPG, suite aux décisions actées dans #15.

L'ADR sera le document de référence pour :
- `system.category` (famille mécanique),
- `system.weaponType` (sous-type narratif),
- les règles de mapping depuis OggDude,
- la conservation des valeurs brutes en flags,
- les implications UX et d'import.

## 1. Requirements & Constraints

- **REQ-001**: L'ADR DOIT documenter le rôle exact de `system.category` (famille mécanique, enum interne stabilisée, utilisée par le code, les filtres et l'UI).
- **REQ-002**: L'ADR DOIT documenter le rôle exact de `system.weaponType` (sous-type narratif / lignée d'arme, issu de `<Type>` OggDude).
- **REQ-003**: L'ADR DOIT définir les règles de priorité pour déterminer `system.category` en cas de conflit entre `<Type>`, `<Categories>`, `SkillKey` et `Range`.
- **REQ-004**: L'ADR DOIT documenter la stratégie de conservation des valeurs brutes OggDude (`flags.swerpg.oggdude.type`, `flags.swerpg.oggdude.categories`).
- **REQ-005**: L'ADR DOIT lister les valeurs canoniques proposées pour `system.category` (même si #97 les affinera).
- **REQ-006**: L'ADR DOIT mentionner les implications UX : filtres, icônes, comportements différenciés.
- **REQ-007**: L'ADR DOIT référencer les issues connexes : #15, #16, #17, #18, #97, #98, #100, #101.
- **REQ-008**: L'ADR DOIT suivre le format ADR existant du projet (frontmatter, Decision, Context, Options, Rationale, Impact, Security, Performance, Review, Links).
- **REQ-009**: Le fichier `documentation/INDEX.md` DOIT être mis à jour pour référencer l'ADR.
- **CON-001**: L'ADR doit rester cohérent avec le spec `docs/specifications/qualities-format-spec.md` (qualités).
- **CON-002**: Le format des valeurs doit être compatible avec le schéma TypeDataModel Foundry existant.

## 2. Implementation Steps

### Implementation Phase 1 - Analyse et synthèse des décisions

- GOAL-001: Synthétiser toutes les décisions d'architecture issues de #15 pour les retranscrire dans l'ADR.

| Task | Description | Completed | Date |
| ---- | ----------- | --------- | ---- |
| TASK-001 | Extraire les décisions de #15 et de la conversation associée (rôles category/weaponType, séparation, mapping OggDude, flags, UX). | ✅ | 2026-05-07 |
| TASK-002 | Analyser les specs existantes (`qualities-format-spec.md`, `armor` config) pour assurer la cohérence de format. | ✅ | 2026-05-07 |
| TASK-003 | Identifier les points ambigus ou non tranchés qui devront être laissés ouverts dans l'ADR en attendant #97. | ✅ | 2026-05-07 |

### Implementation Phase 2 - Rédaction de l'ADR

- GOAL-002: Produire le document ADR-0007.

| Task | Description | Completed | Date |
| ---- | ----------- | --------- | ---- |
| TASK-004 | Créer `documentation/architecture/adr/adr-0007-weapon-taxonomy.md` selon le gabarit ADR du projet. | ✅ | 2026-05-07 |
| TASK-005 | Rédiger la section **Decision** : choix de séparation category/weaponType, rôles respectifs. | ✅ | 2026-05-07 |
| TASK-006 | Rédiger la section **Context** : problèmes identifiés dans l'import OggDude, absence de taxonomie stable, schéma `physical.category` non spécialisé. | ✅ | 2026-05-07 |
| TASK-007 | Rédiger la section **Options** : les alternatives envisagées (champ unique, texte libre, fusion, etc.). | ✅ | 2026-05-07 |
| TASK-008 | Rédiger la section **Rationale** : pourquoi la séparation + enum interne + flags bruts. | ✅ | 2026-05-07 |
| TASK-009 | Rédiger la section **Impact** : schéma weapon, import OggDude, UI/filtres, qualités. | ✅ | 2026-05-07 |
| TASK-010 | Rédiger les sections **Security**, **Performance**, **Review**, **Links** avec références croisées. | ✅ | 2026-05-07 |
| TASK-011 | Ajouter un tableau de mapping OggDude → SWERPG (catégories → system.category, types → system.weaponType, flags). | ✅ | 2026-05-07 |
| TASK-012 | Proposer une première version des valeurs canoniques de `system.category` (sera affinée dans #97). | ✅ | 2026-05-07 |

### Implementation Phase 3 - Révision et mise à jour INDEX

- GOAL-003: Intégrer l'ADR dans la documentation du projet.

| Task | Description | Completed | Date |
| ---- | ----------- | --------- | ---- |
| TASK-013 | Mettre à jour `documentation/INDEX.md` pour référencer l'ADR. | ✅ | 2026-05-07 |
| TASK-014 | Relecture finale : cohérence avec `qualities-format-spec.md` et `config/armor.mjs`. | ✅ | 2026-05-07 |
| TASK-015 | Vérifier que les liens entre issues sont corrects (#15, #16, #17, #18, #97, #98, #100, #101). | ✅ | 2026-05-07 |

### Implementation Phase 4 - Review

- GOAL-004: Valider l'ADR avant implémentation du schéma.

| Task | Description | Completed | Date |
| ---- | ----------- | --------- | ---- |
| TASK-016 | Soumettre l'ADR pour relecture (PR ou validation directe). | ✅ | 2026-05-07 |
| TASK-017 | Intégrer les retours de review. | ✅ | 2026-05-07 |
| TASK-018 | Mettre à jour le statut de l'ADR (Proposed → Accepted). | ✅ | 2026-05-07 |

## 3. Alternatives

- **ALT-001**: Faire l'ADR après #97 (rejeté : l'ADR doit cadrer #97, pas l'inverse).
- **ALT-002**: Intégrer la taxonomie directement dans le code sans ADR (rejeté : besoin de documentation durable et traçable).
- **ALT-003**: Fusionner avec `qualities-format-spec.md` (rejeté : domaines différents, meilleure séparation).

## 4. Dependencies

- **DEP-001**: Issue #15 (décisions source déjà actées ✅).
- **DEP-002**: `docs/specifications/qualities-format-spec.md` (cohérence de format).
- **DEP-003**: `module/config/armor.mjs` (pattern existant pour les catégories).
- **DEP-004**: `module/models/physical.mjs` (schéma actuel de system.category).
- **DEP-005**: `module/importer/items/weapon-ogg-dude.mjs` (mapping OggDude actuel).

## 5. Files

- **FILE-001**: `documentation/architecture/adr/adr-0007-weapon-taxonomy.md` (création)
- **FILE-002**: `documentation/INDEX.md` (mise à jour)

## 6. Testing

- **TEST-001**: Vérification que l'ADR est référencé dans INDEX.md.
- **TEST-002**: Vérification que tous les liens entre issues sont valides.
- **TEST-003**: Relecture humaine pour cohérence et complétude.

## 7. Risks & Assumptions

- **RISK-001**: Les valeurs de l'enum proposées dans l'ADR peuvent être remises en cause par #97 → l'ADR doit rester au niveau des principes, pas des valeurs exhaustives.
- **RISK-002**: Incohérence possible avec la spec des qualités → mitigation : relecture croisée par TASK-014.
- **ASSUMPTION-001**: Les décisions #15 sont stables et ne seront pas remises en cause.
- **ASSUMPTION-002**: Le format ADR existant (`adr-0006`) est le bon template à suivre.

## 8. Related Specifications

- Issue source : #15
- Issue découpage : #97, #98, #100, #101
- Issues connexes : #16, #17, #18
- Spec qualités : `docs/specifications/qualities-format-spec.md`
- Config armure : `module/config/armor.mjs`
