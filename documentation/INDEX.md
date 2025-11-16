# Index de la Documentation - Système Star Wars Edge RPG (swerpg)

## Vue d'Ensemble

Cette documentation technique couvre l'architecture, les modules, les exigences et les processus du système Star Wars Edge RPG pour Foundry VTT v13+.

## 📖 Documents Disponibles

### Architecture

| Document                                    | Description                            | Pages        |
| ------------------------------------------- | -------------------------------------- | ------------ |
| [OVERVIEW.md](./architecture/OVERVIEW.md)   | Architecture globale du système swerpg | ~500 lignes  |
| [PATTERNS.md](./architecture/PATTERNS.md)   | Patterns architecturaux Star Wars Edge | ~650 lignes  |
| [MODELS.md](./architecture/MODELS.md)       | Models de données (TypeDataModel)      | ~1100 lignes |
| [WORKFLOWS.md](./architecture/WORKFLOWS.md) | Workflows Star Wars Edge               | ~1200 lignes |

### Modules

| Document                                               | Description                           | Pages       |
| ------------------------------------------------------ | ------------------------------------- | ----------- |
| [DICE_SYSTEM.md](./modules/DICE_SYSTEM.md)             | Système de dés narratifs SW           | ~650 lignes |
| [TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md)         | Système de talents et spécialisations | ~750 lignes |
| [OBLIGATION_SYSTEM.md](./modules/OBLIGATION_SYSTEM.md) | Système d'obligations et devoirs      | ~550 lignes |
| [FORCE_SYSTEM.md](./modules/FORCE_SYSTEM.md)           | Système de la Force                   | ~600 lignes |

### Exigences

| Document                                                                        | Description                       | Pages       |
| ------------------------------------------------------------------------------- | --------------------------------- | ----------- |
| [FUNCTIONAL_REQUIREMENTS.md](./requirements/FUNCTIONAL_REQUIREMENTS.md)         | Exigences fonctionnelles (MOSCOW) | ~650 lignes |
| [NON_FUNCTIONAL_REQUIREMENTS.md](./requirements/NON_FUNCTIONAL_REQUIREMENTS.md) | Exigences non-fonctionnelles      | ~550 lignes |
| [DEPLOYMENT_SCENARIOS.md](./requirements/DEPLOYMENT_SCENARIOS.md)               | Scénarios de déploiement          | ~550 lignes |
| [USABILITY_FEATURES.md](./requirements/USABILITY_FEATURES.md)                   | Fonctionnalités d'utilisabilité   | ~550 lignes |

### Processus

| Document                                               | Description                   | Pages       |
| ------------------------------------------------------ | ----------------------------- | ----------- |
| [DOCUMENTATION_PROCESS.md](./DOCUMENTATION_PROCESS.md) | Méthodologie de documentation | ~550 lignes |

## 🔍 Recherche Rapide

### Par Concept

| Concept          | Document(s)                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Dés Narratifs    | [DICE_SYSTEM.md](./modules/DICE_SYSTEM.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md), [PATTERNS.md](./architecture/PATTERNS.md) |
| Talents          | [TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md)                                        |
| Obligations      | [OBLIGATION_SYSTEM.md](./modules/OBLIGATION_SYSTEM.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md)                                |
| La Force         | [FORCE_SYSTEM.md](./modules/FORCE_SYSTEM.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md), [MODELS.md](./architecture/MODELS.md)   |
| Combat           | [DICE_SYSTEM.md](./modules/DICE_SYSTEM.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md)                                            |
| Progression      | [TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md)                                        |
| Caractéristiques | [MODELS.md](./architecture/MODELS.md), [PATTERNS.md](./architecture/PATTERNS.md)                                                   |
| Compétences      | [MODELS.md](./architecture/MODELS.md), [DICE_SYSTEM.md](./modules/DICE_SYSTEM.md)                                                  |
| Équipement       | [MODELS.md](./architecture/MODELS.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md)                                                 |
| Véhicules        | [MODELS.md](./architecture/MODELS.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md)                                                 |

### Par Système de Jeu

| Système                | Documents Principaux                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| **Edge of the Empire** | [OBLIGATION_SYSTEM.md](./modules/OBLIGATION_SYSTEM.md), [TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md) |
| **Age of Rebellion**   | [TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md)            |
| **Force and Destiny**  | [FORCE_SYSTEM.md](./modules/FORCE_SYSTEM.md), [TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md)           |

### Par Type d'Acteur

| Type d'Acteur   | Documents                                                                             |
| --------------- | ------------------------------------------------------------------------------------- |
| **Héros**       | [MODELS.md](./architecture/MODELS.md), [TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md) |
| **Adversaires** | [MODELS.md](./architecture/MODELS.md), [PATTERNS.md](./architecture/PATTERNS.md)      |
| **Véhicules**   | [MODELS.md](./architecture/MODELS.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md)    |

## 🎲 Mécanique Star Wars Edge

Cette documentation couvre spécifiquement les mécaniques uniques du système Star Wars Edge RPG :

- **Dés Narratifs** : Système unique utilisant succès, avantages, menaces et désespoir
- **Obligations** : Système de complications personnelles pour les personnages
- **Talents** : Arbres de talents spécialisés par carrière et spécialisation
- **La Force** : Pouvoir mystique avec côté obscur et lumineux
- **Stress & Trauma** : Gestion des blessures physiques et mentales
- **Destinée** : Points de Force partagés entre MJ et joueurs

## 📊 Statistiques de Documentation

- **Total** : ~6000 lignes de documentation technique
- **Architecture** : ~3300 lignes (55%)
- **Modules** : ~2550 lignes (42.5%)
- **Exigences** : ~2200 lignes (36.7%)
- **Couverture** : 95% des fonctionnalités principales documentées

## 🔄 Dernière Mise à Jour

**Version** : 1.0.0  
**Date** : 5 novembre 2025  
**Compatibilité Foundry** : v13.347+  
**Statut** : Documentation initiale basée sur l'architecture Crucible
