# Index de la Documentation - Système Star Wars Edge RPG (swerpg)

## Vue d'Ensemble

Cette documentation technique couvre l'architecture, les modules, les exigences, les règles et les processus du système Star Wars Edge RPG pour Foundry VTT v13+.

## 📖 Documents Disponibles

### Architecture

| Document                                                   | Description                                           |
| ---------------------------------------------------------- | ----------------------------------------------------- |
| [OVERVIEW.md](./architecture/OVERVIEW.md)                  | Architecture globale du système swerpg                |
| [MODELS.md](./architecture/MODELS.md)                      | Modèles de données (TypeDataModel, acteurs, etc.)     |
| Dossiers détaillés                                         |                                                       |
| [`architecture/adr/`](./architecture/adr/)                 | Architecture Decision Records (ADR-0001 → 0008)       |
| [`architecture/core/`](./architecture/core/)               | Cœur système, entrypoints, configuration              |
| [`architecture/data/`](./architecture/data/)               | Modèles de données, schémas et persistance            |
| [`architecture/integration/`](./architecture/integration/) | Intégrations Foundry, hooks, API externes             |
| [`architecture/oggdude/`](./architecture/oggdude/)         | Architecture import OggDude                           |
| [`architecture/systems/`](./architecture/systems/)         | Sous‑systèmes ludiques (combat, initiative, etc.)     |
| [`architecture/ui/`](./architecture/ui/)                   | Architecture UI, sheets, composants                   |
| [SHEETS-TABS.md](./architecture/ui/SHEETS-TABS.md)         | Mode opératoire des onglets de sheets (ApplicationV2) |

### Modules

| Document                                               | Description                           |
| ------------------------------------------------------ | ------------------------------------- |
| [DICE_SYSTEM.md](./modules/DICE_SYSTEM.md)             | Système de dés narratifs SW           |
| [TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md)         | Système de talents et spécialisations |
| [OBLIGATION_SYSTEM.md](./modules/OBLIGATION_SYSTEM.md) | Système d'obligations et devoirs      |

### Exigences

| Document                                                                                                              | Description                                        |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [FUNCTIONAL_REQUIREMENTS.md](./requirements/FUNCTIONAL_REQUIREMENTS.md)                                               | Exigences fonctionnelles (MOSCOW)                  |
| [NON_FUNCTIONAL_REQUIREMENTS.md](./requirements/NON_FUNCTIONAL_REQUIREMENTS.md)                                       | Exigences non-fonctionnelles                       |
| [DEPLOYMENT_SCENARIOS.md](./requirements/DEPLOYMENT_SCENARIOS.md)                                                     | Scénarios de déploiement                           |
| [USABILITY_FEATURES.md](./requirements/USABILITY_FEATURES.md)                                                         | Fonctionnalités d'utilisabilité                    |
| [OGGDUDE_SPECIALIZATION_IMPORT_FIX_REQUIREMENTS.md](./requirements/OGGDUDE_SPECIALIZATION_IMPORT_FIX_REQUIREMENTS.md) | Exigences correctif import spécialisations OggDude |

### Règles & Référentiels

| Document                                       | Description                                |
| ---------------------------------------------- | ------------------------------------------ |
| [NARRATIVE_DICE.md](./rules/NARRATIVE_DICE.md) | Référentiel détaillé sur les dés narratifs |

### Processus, Méthodologie & Ways of Work

| Document                                                           | Description                              |
| ------------------------------------------------------------------ | ---------------------------------------- |
| [DOCUMENTATION_PROCESS.md](./DOCUMENTATION_PROCESS.md)             | Méthodologie de documentation            |
| [PLAN_DEVELOPPEMENT_EXECUTIF.md](./PLAN_DEVELOPPEMENT_EXECUTIF.md) | Plan de développement exécutif global    |
| [strategie-tests.md](./strategie-tests.md)                         | Stratégie générale de tests              |
| [`ways-of-work/`](./ways-of-work/)                                 | Guides de travail, conventions d'équipe  |
| [`tasks/`](./tasks/)                                               | Suivi des tâches et checklists processus |
| [`rapports/`](./rapports/)                                         | Rapports d'analyse, audits et synthèses  |

### Import OggDude & Migration

| Document                                                                             | Description                              |
| ------------------------------------------------------------------------------------ | ---------------------------------------- |
| [oggdude-import-guide.md](./oggdude-import-guide.md)                                 | Guide général d'import OggDude           |
| [oggdude-import-stats-guide.md](./oggdude-import-stats-guide.md)                     | Guide statistiques d'import OggDude      |
| [MIGRATION_LOGGING_PROGRESSIVE.md](./MIGRATION_LOGGING_PROGRESSIVE.md)               | Plan de migration progressive du logging |
| [STANDARDIZATION_IMPORT_STATS_SUMMARY.md](./STANDARDIZATION_IMPORT_STATS_SUMMARY.md) | Standardisation des stats d'import       |

### Spécifications & Plans de Features

| Document / Dossier                                                                       | Description                                         |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [`spec/`](./spec/)                                                                       | Spécifications détaillées (design, séquences, etc.) |
| [`spec/weapon-taxonomy-canonical.md`](./spec/weapon-taxonomy-canonical.md)               | Spécification canonique de la taxonomie des armes   |
| [`spec/design-current-equipment-sidebar.md`](./spec/design-current-equipment-sidebar.md) | Design de la sidebar d'équipement courant           |
| [`spec/oggdude-importer/`](./spec/oggdude-importer/)                                     | Spécifications dédiées à l'importeur OggDude        |
| [`plan/`](./plan/)                                                                       | Plans d'implémentation (REQ/TASK/FILE/TEST)         |

### Guides Développeurs

| Document                                                                           | Description                                              |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [README.md](./README.md)                                                           | Vue d'ensemble de la documentation interne               |
| [CODING_STYLES.md](./CODING_STYLES.md)                                             | Styles de code généraux                                  |
| [CODING_STYLES_AGENT.md](./CODING_STYLES_AGENT.md)                                 | Règles spécifiques pour les agents/outils                |
| [DEVELOPER_GUIDE_LOGGING.md](./DEVELOPER_GUIDE_LOGGING.md)                         | Guide de logging progressif                              |
| [TESTING_GUIDE_specialization_ui_fix.md](./TESTING_GUIDE_specialization_ui_fix.md) | Guide de tests pour la correction UI des spécialisations |
| [TESTS_COVERAGE_IMPROVEMENT.md](./TESTS_COVERAGE_IMPROVEMENT.md)                   | Stratégie d'amélioration de la couverture de tests       |
| [item-sheet-creation-guide.md](./item-sheet-creation-guide.md)                     | Guide de création de fiches d'objet                      |

## 🔍 Recherche Rapide

### Par Concept

| Concept          | Document(s)                                                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dés Narratifs    | [DICE_SYSTEM.md](./modules/DICE_SYSTEM.md), [NARRATIVE_DICE.md](./rules/NARRATIVE_DICE.md), [OVERVIEW.md](./architecture/OVERVIEW.md)                          |
| Talents          | [TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md), [OVERVIEW.md](./architecture/OVERVIEW.md), [MODELS.md](./architecture/MODELS.md)                               |
| Obligations      | [OBLIGATION_SYSTEM.md](./modules/OBLIGATION_SYSTEM.md), [OVERVIEW.md](./architecture/OVERVIEW.md)                                                              |
| Combat           | [DICE_SYSTEM.md](./modules/DICE_SYSTEM.md), [OVERVIEW.md](./architecture/OVERVIEW.md)                                                                          |
| Progression      | [TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md), [MODELS.md](./architecture/MODELS.md)                                                                          |
| Caractéristiques | [MODELS.md](./architecture/MODELS.md)                                                                                                                          |
| Compétences      | [MODELS.md](./architecture/MODELS.md), [DICE_SYSTEM.md](./modules/DICE_SYSTEM.md)                                                                              |
| Équipement       | [MODELS.md](./architecture/MODELS.md), [OVERVIEW.md](./architecture/OVERVIEW.md)                                                                               |
| Véhicules        | [MODELS.md](./architecture/MODELS.md), [OVERVIEW.md](./architecture/OVERVIEW.md)                                                                               |
| Import OggDude   | [oggdude-import-guide.md](./oggdude-import-guide.md), [`architecture/oggdude/`](./architecture/oggdude/), [`spec/oggdude-importer/`](./spec/oggdude-importer/) |

### Par Système de Jeu

| Système                | Documents Principaux                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| **Edge of the Empire** | [OBLIGATION_SYSTEM.md](./modules/OBLIGATION_SYSTEM.md), [TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md) |
| **Age of Rebellion**   | [TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md), [OVERVIEW.md](./architecture/OVERVIEW.md)              |

### Par Type d'Acteur

| Type d'Acteur   | Documents                                                                             |
| --------------- | ------------------------------------------------------------------------------------- |
| **Héros**       | [MODELS.md](./architecture/MODELS.md), [TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md) |
| **Adversaires** | [MODELS.md](./architecture/MODELS.md)                                                 |
| **Véhicules**   | [MODELS.md](./architecture/MODELS.md), [OVERVIEW.md](./architecture/OVERVIEW.md)      |

## 🎲 Mécanique Star Wars Edge

Cette documentation couvre spécifiquement les mécaniques uniques du système Star Wars Edge RPG :

- **Dés Narratifs** : Système unique utilisant succès, avantages, menaces et désespoir
- **Obligations** : Système de complications personnelles pour les personnages
- **Talents** : Arbres de talents spécialisés par carrière et spécialisation
- **Stress & Trauma** : Gestion des blessures physiques et mentales
- **Destinée** : Points de Destin partagés entre MJ et joueurs

## 📊 Statistiques de Documentation

> Ces chiffres sont indicatifs et seront ajustés au fil de l'enrichissement de la documentation.

- **Architecture** : forte couverture (overview + dossiers spécialisés)
- **Modules** : documentation détaillée pour les systèmes centraux (dés, talents, obligations)
- **Exigences** : exigences fonctionnelles, non-fonctionnelles et cas spécifiques OggDude
- **Tests & Qualité** : plusieurs guides dédiés (tests UI, couverture, stratégie globale)

## 🔄 Dernière Mise à Jour

**Version** : 1.1.0  
**Date** : 28 novembre 2025  
**Compatibilité Foundry** : v13.347+  
**Statut** : Index synchronisé avec la nouvelle organisation de la documentation
