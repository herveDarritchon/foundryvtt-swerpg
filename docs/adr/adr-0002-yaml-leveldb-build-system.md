---
title: 'ADR-0002: Système de Build YAML vers LevelDB pour les Compendiums'
status: 'Accepted'
date: '2025-11-10'
authors: 'Hervé Darritchon, Architecture Team'
tags: ['architecture', 'build', 'data-management', 'compendium']
supersedes: ''
superseded_by: ''
---

## Status

**Accepted** - Ce système de build est implémenté et en production pour la gestion des contenus swerpg.

## Context

Le système Star Wars Edge RPG nécessite la gestion de milliers d'éléments de contenu (talents, équipements, espèces, carrières) stockés dans les compendiums FoundryVTT. La gestion manuelle des packs binaires LevelDB s'avérait problématique pour le développement, la collaboration et la maintenance.

**Problématiques identifiées :**

- Packs LevelDB binaires non versionnables et difficiles à merger
- Impossible de faire des reviews de contenu via Git
- Pas de workflow collaboratif pour les contributions de contenu
- Risque de corruption lors des éditions manuelles
- Difficile maintenance des traductions et localisations

**Contraintes techniques :**

- FoundryVTT utilise exclusivement LevelDB pour les compendiums en production
- Besoin de préserver les IDs de documents pour la compatibilité
- Intégration avec le workflow de développement existant (pnpm, rollup, less)
- Support des métadonnées étendues pour l'écosystème Star Wars

**Exigences métier :**

- Processus de création de contenu accessible aux non-développeurs
- Validation automatique de la cohérence des données
- Génération d'IDs déterministes pour éviter les conflits

## Decision

Adoption d'un système de build basé sur un pipeline YAML → LevelDB utilisant `@foundryvtt/foundryvtt-cli` :

1. **Sources YAML** dans `_source/` organisées par type de contenu
2. **Build Pipeline** automatisé via `build.mjs` avec commandes `extract` et `compile`
3. **Intégration npm scripts** : `pnpm run extract` / `pnpm run compile`
4. **Génération d'IDs déterministes** via fonction `generateId(name, length)`
5. **Validation des schémas** intégrée au processus de compilation

**Architecture du pipeline :**

```text
_source/                    build.mjs                 packs/
├── talents/           →    extract/compile      →    └── talents/
├── armors/                                           ├── armors/
├── weapons/                                          ├── weapons/
└── species/                                          └── species/
```

## Consequences

### Positive

- **POS-001**: **Versioning complet** - Tous les contenus sont versionnés en YAML lisible
- **POS-002**: **Collaboration améliorée** - Reviews de contenu possibles via Pull Requests
- **POS-003**: **Workflow développeur** - Intégration naturelle avec npm/pnpm et CI/CD
- **POS-004**: **Validation automatique** - Détection des erreurs de contenu au build
- **POS-005**: **Localisation simplifiée** - Gestion des traductions via fichiers structurés
- **POS-006**: **Backup robuste** - Sauvegarde automatique des contenus en format ouvert

### Negative

- **NEG-001**: **Étape de build supplémentaire** - Processus plus complexe pour les modifications
- **NEG-002**: **Dépendance tooling** - Nécessite @foundryvtt/foundryvtt-cli fonctionnel
- **NEG-003**: **Risque de désynchronisation** - Sources YAML et packs LevelDB peuvent diverger
- **NEG-004**: **Courbe d'apprentissage** - Contributeurs doivent apprendre le format YAML
- **NEG-005**: **Temps de build** - Compilation nécessaire pour tester les modifications

## Alternatives Considered

### Édition directe des packs LevelDB

- **ALT-001**: **Description**: Modification manuelle des packs via l'interface FoundryVTT
- **ALT-002**: **Rejection Reason**: Impossible à versionner, pas de collaboration, risque de corruption

### Base de données externe (MongoDB/PostgreSQL)

- **ALT-003**: **Description**: Stockage du contenu dans une base externe avec export LevelDB
- **ALT-004**: **Rejection Reason**: Complexité infrastructure excessive, dépendance serveur

### JSON au lieu de YAML

- **ALT-005**: **Description**: Utilisation de JSON pour les sources au lieu de YAML
- **ALT-006**: **Rejection Reason**: Moins lisible pour les non-développeurs, pas de commentaires

### Git LFS pour les packs binaires

- **ALT-007**: **Description**: Versioning des packs LevelDB via Git Large File Storage
- **ALT-008**: **Rejection Reason**: Toujours pas de différentiel lisible, merges impossibles

## Implementation Notes

- **IMP-001**: **Structure de dossiers** - Organisation \_source/ par type de contenu avec nomenclature cohérente
- **IMP-002**: **Scripts npm intégrés** - `extract`, `compile`, et `build` dans package.json
- **IMP-003**: **Validation pré-commit** - Hooks Git pour vérifier la cohérence avant commit
- **IMP-004**: **Documentation contributeurs** - Guide pour création de contenu en YAML
- **IMP-005**: **CI/CD automation** - Build automatique des packs lors des releases

## References

- **REF-001**: [FoundryVTT CLI Documentation](https://github.com/foundryvtt/foundryvtt-cli)
- **REF-002**: [Build Script Implementation](../../build.mjs)
- **REF-003**: [Source Content Structure](../../_source/)
- **REF-004**: [Package.json Build Scripts](../../package.json)
- **REF-005**: [Content Management Workflow](../documentation/swerpg/architecture/WORKFLOWS.md)
