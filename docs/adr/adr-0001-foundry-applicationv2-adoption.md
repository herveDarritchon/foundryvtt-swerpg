---
title: 'ADR-0001: Adoption de FoundryVTT ApplicationV2 et TypeDataModel'
status: 'Accepted'
date: '2025-11-10'
authors: 'Hervé Darritchon, Architecture Team'
tags: ['architecture', 'foundry', 'migration', 'data-models']
supersedes: ''
superseded_by: ''
---

## Status

**Accepted** - Cette décision a été implémentée et est en production dans le système swerpg.

## Context

Le système Star Wars Edge RPG (swerpg) pour FoundryVTT nécessitait une modernisation complète pour tirer parti des nouvelles capacités de Foundry VTT v13+. L'architecture existante utilisait un mélange d'ApplicationV1 et de patterns obsolètes qui limitaient les performances, la maintenabilité et l'évolutivité du système.

**Forces techniques :**

- FoundryVTT v13+ introduit ApplicationV2 avec de meilleures performances et une API plus moderne
- TypeDataModel fournit une validation de données robuste et une structure typée
- Le système swerpg doit gérer des mécaniques complexes (dés narratifs, arbres de talents, obligations)
- Nécessité d'une architecture extensible pour supporter les trois gammes Star Wars (Edge, Age, Force)

**Contraintes business :**

- Compatibilité descendante requise avec les données existantes
- Migration sans interruption de service pour les utilisateurs
- Documentation technique extensive à maintenir (6000+ lignes)

## Decision

Adoption complète de l'architecture moderne FoundryVTT v13+ basée sur :

1. **ApplicationV2 + HandlebarsApplicationMixin** pour toutes les interfaces utilisateur
2. **foundry.abstract.TypeDataModel** pour tous les modèles de données (actors, items)
3. **Pattern de configuration hiérarchique** : SYSTEM → swerpg.CONST → swerpg.CONFIG
4. **Architecture modulaire** avec séparation claire des responsabilités

## Consequences

### Positive

- **POS-001**: **Performance améliorée** - ApplicationV2 offre un rendu plus rapide et une meilleure gestion mémoire
- **POS-002**: **Validation robuste** - TypeDataModel assure l'intégrité des données avec validation automatique des schémas
- **POS-003**: **Maintenabilité élevée** - Architecture modulaire facilite les évolutions et corrections
- **POS-004**: **Compatibilité future** - Alignement avec les standards FoundryVTT garantit la pérennité
- **POS-005**: **Développement accéléré** - Patterns standardisés réduisent la complexité du code

### Negative

- **NEG-001**: **Effort de migration important** - Refactorisation complète de l'architecture existante requise
- **NEG-002**: **Courbe d'apprentissage** - Équipe de développement doit maîtriser les nouveaux patterns
- **NEG-003**: **Complexité temporaire** - Période de transition avec coexistence d'anciens et nouveaux patterns
- **NEG-004**: **Dépendance FoundryVTT** - Architecture fortement couplée aux évolutions de Foundry
- **NEG-005**: **Tests étendus requis** - Validation complète nécessaire pour garantir la non-régression

## Alternatives Considered

### ApplicationV1 avec patches

- **ALT-001**: **Description**: Maintenir ApplicationV1 avec des corrections ponctuelles
- **ALT-002**: **Rejection Reason**: Architecture obsolète limitant les performances et l'évolutivité à long terme

### Migration hybride graduelle

- **ALT-003**: **Description**: Migration progressive avec coexistence ApplicationV1/V2
- **ALT-004**: **Rejection Reason**: Complexité architecturale excessive et risques de inconsistances

### Framework externe (React/Vue)

- **ALT-005**: **Description**: Remplacement complet par un framework moderne externe
- **ALT-006**: **Rejection Reason**: Perte d'intégration native FoundryVTT et complexité de maintenance

### Modèles de données personnalisés

- **ALT-007**: **Description**: Développement d'un système de validation personnalisé
- **ALT-008**: **Rejection Reason**: Réinvention de solutions existantes et maintenance supplémentaire

## Implementation Notes

- **IMP-001**: **Migration par phases** - ApplicationV1 → ApplicationV2 sheet par sheet avec tests complets
- **IMP-002**: **Stratégie de rollback** - Maintien de branches de compatibilité pendant la transition
- **IMP-003**: **Documentation mise à jour** - Architecture documentée en détail (6000+ lignes techniques)
- **IMP-004**: **Tests automatisés** - Suite Vitest complète avec couverture > 90%
- **IMP-005**: **Formation équipe** - Sessions de formation sur les nouveaux patterns et APIs

## References

- **REF-001**: [FoundryVTT v13 API Documentation](https://foundryvtt.com/api/)
- **REF-002**: [Documentation Architecture swerpg](../documentation/swerpg/architecture/OVERVIEW.md)
- **REF-003**: [Migration ApplicationV1→V2 Process](../documentation/swerpg/DEVELOPMENT_PROCESS.md)
- **REF-004**: [TypeDataModel Best Practices](../documentation/swerpg/architecture/MODELS.md)
- **REF-005**: [Copilot Instructions - Architecture Essentials](../.github/copilot-instructions.md)
