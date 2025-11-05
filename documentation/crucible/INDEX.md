# Index de la Documentation - Système Crucible

## Vue d'Ensemble

Cette documentation technique couvre l'architecture, les modules, les exigences et les processus du système Crucible pour Foundry VTT v13+.

## 📖 Documents Disponibles

### Architecture

| Document | Description | Pages |
|----------|-------------|-------|
| [OVERVIEW.md](./architecture/OVERVIEW.md) | Architecture globale du système | ~500 lignes |
| [PATTERNS.md](./architecture/PATTERNS.md) | Patterns architecturaux identifiés | ~650 lignes |
| [MODELS.md](./architecture/MODELS.md) | Models de données (TypeDataModel) | ~1100 lignes |
| [WORKFLOWS.md](./architecture/WORKFLOWS.md) | Workflows majeurs du système | ~1200 lignes |

### Modules

| Document | Description | Pages |
|----------|-------------|-------|
| [ACTION_SYSTEM.md](./modules/ACTION_SYSTEM.md) | Système d'actions complet | ~650 lignes |
| [TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md) | Système de talents complet | ~750 lignes |

### Exigences

| Document | Description | Pages |
|----------|-------------|-------|
| [FUNCTIONAL_REQUIREMENTS.md](./requirements/FUNCTIONAL_REQUIREMENTS.md) | Exigences fonctionnelles (MOSCOW) | ~650 lignes |
| [NON_FUNCTIONAL_REQUIREMENTS.md](./requirements/NON_FUNCTIONAL_REQUIREMENTS.md) | Exigences non-fonctionnelles | ~550 lignes |
| [DEPLOYMENT_SCENARIOS.md](./requirements/DEPLOYMENT_SCENARIOS.md) | Scénarios de déploiement | ~550 lignes |
| [USABILITY_FEATURES.md](./requirements/USABILITY_FEATURES.md) | Fonctionnalités d'utilisabilité | ~550 lignes |

### Processus

| Document | Description | Pages |
|----------|-------------|-------|
| [DOCUMENTATION_PROCESS.md](./DOCUMENTATION_PROCESS.md) | Méthodologie de documentation | ~550 lignes |

## 🔍 Recherche Rapide

### Par Concept

| Concept | Document(s) |
|---------|------------|
| Actions | [ACTION_SYSTEM.md](./modules/ACTION_SYSTEM.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md), [PATTERNS.md](./architecture/PATTERNS.md) |
| Talents | [TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md) |
| Spellcraft | [ACTION_SYSTEM.md](./modules/ACTION_SYSTEM.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md), [MODELS.md](./architecture/MODELS.md) |
| Combat | [ACTION_SYSTEM.md](./modules/ACTION_SYSTEM.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md) |
| Progression | [TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md) |
| Data Models | [MODELS.md](./architecture/MODELS.md), [OVERVIEW.md](./architecture/OVERVIEW.md) |
| Design Patterns | [PATTERNS.md](./architecture/PATTERNS.md) |
| Workflows | [WORKFLOWS.md](./architecture/WORKFLOWS.md) |
| Documents | [OVERVIEW.md](./architecture/OVERVIEW.md) |
| Applications | [OVERVIEW.md](./architecture/OVERVIEW.md), [PATTERNS.md](./architecture/PATTERNS.md), [USABILITY_FEATURES.md](./requirements/USABILITY_FEATURES.md) |
| Build Process | [DEPLOYMENT_SCENARIOS.md](./requirements/DEPLOYMENT_SCENARIOS.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md) |
| Content Management | [OVERVIEW.md](./architecture/OVERVIEW.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md), [DEPLOYMENT_SCENARIOS.md](./requirements/DEPLOYMENT_SCENARIOS.md) |

### Par Fichier Source

| Fichier Source | Document(s) |
|----------------|------------|
| `crucible.mjs` | [OVERVIEW.md](./architecture/OVERVIEW.md), [PATTERNS.md](./architecture/PATTERNS.md) |
| `module/config/system.mjs` | [OVERVIEW.md](./architecture/OVERVIEW.md), [PATTERNS.md](./architecture/PATTERNS.md) |
| `module/config/action.mjs` | [ACTION_SYSTEM.md](./modules/ACTION_SYSTEM.md), [PATTERNS.md](./architecture/PATTERNS.md) |
| `module/config/talent-node.mjs` | [TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md) |
| `module/models/action.mjs` | [ACTION_SYSTEM.md](./modules/ACTION_SYSTEM.md), [MODELS.md](./architecture/MODELS.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md), [PATTERNS.md](./architecture/PATTERNS.md) |
| `module/models/actor-*.mjs` | [MODELS.md](./architecture/MODELS.md), [PATTERNS.md](./architecture/PATTERNS.md) |
| `module/models/item-*.mjs` | [MODELS.md](./architecture/MODELS.md), [PATTERNS.md](./architecture/PATTERNS.md) |
| `module/models/combat-*.mjs` | [MODELS.md](./architecture/MODELS.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md) |
| `module/models/spell-action.mjs` | [MODELS.md](./architecture/MODELS.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md) |
| `module/models/spellcraft-*.mjs` | [MODELS.md](./architecture/MODELS.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md) |
| `module/applications/sheets/*.mjs` | [PATTERNS.md](./architecture/PATTERNS.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md) |
| `module/documents/actor.mjs` | [OVERVIEW.md](./architecture/OVERVIEW.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md) |
| `module/documents/item.mjs` | [OVERVIEW.md](./architecture/OVERVIEW.md) |
| `module/documents/combat.mjs` | [WORKFLOWS.md](./architecture/WORKFLOWS.md) |
| `build.mjs` | [DEPLOYMENT_SCENARIOS.md](./requirements/DEPLOYMENT_SCENARIOS.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md) |

### Par Type de Tâche

| Tâche | Document(s) Recommandés |
|-------|------------------------|
| Créer une nouvelle action | [ACTION_SYSTEM.md](./modules/ACTION_SYSTEM.md), [MODELS.md](./architecture/MODELS.md) |
| Ajouter un talent | [TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md) |
| Comprendre un pattern | [PATTERNS.md](./architecture/PATTERNS.md) |
| Comprendre un workflow | [WORKFLOWS.md](./architecture/WORKFLOWS.md) |
| Comprendre un data model | [MODELS.md](./architecture/MODELS.md) |
| Modifier l'interface | [USABILITY_FEATURES.md](./requirements/USABILITY_FEATURES.md), [PATTERNS.md](./architecture/PATTERNS.md) |
| Déployer le système | [DEPLOYMENT_SCENARIOS.md](./requirements/DEPLOYMENT_SCENARIOS.md), [WORKFLOWS.md](./architecture/WORKFLOWS.md) |
| Comprendre l'architecture | [OVERVIEW.md](./architecture/OVERVIEW.md), [PATTERNS.md](./architecture/PATTERNS.md) |
| Contribuer au projet | [DOCUMENTATION_PROCESS.md](./DOCUMENTATION_PROCESS.md), [FUNCTIONAL_REQUIREMENTS.md](./requirements/FUNCTIONAL_REQUIREMENTS.md) |

## 📊 Statistiques

### Couverture

- **Fichiers analysés** : ~50 fichiers principaux
- **Lignes de code examinées** : ~10,000+ lignes
- **Documents créés** : 11
- **Pages totales** : ~7,000+ lignes de Markdown
- **Diagrammes** : 60+ diagrammes Mermaid
- **Exemples de code** : 100+

### Modules Couverts

- ✅ **Core System** : 100%
- ✅ **Action System** : 100%
- ✅ **Talent System** : 100%
- ✅ **Data Models** : 100%
- ✅ **Design Patterns** : 100%
- ✅ **Workflows** : 100%
- ✅ **Documents Layer** : 80%
- ✅ **Applications** : 70%
- ⚠️ **Dice System** : 60% (références et intégration)
- ⚠️ **Spellcraft** : 90% (intégré dans models et workflows)
- ⚠️ **Canvas/VFX** : 40% (références partielles)
- ⚠️ **Combat System** : 40% (références)
- ❌ **Canvas Components** : 30% (talent tree uniquement)
- ❌ **Audio System** : 10%
- ❌ **Interaction System** : 10%

## 🚀 Guides de Démarrage

### Pour Développeurs Débutants

1. [README.md](./README.md) - Introduction
2. [OVERVIEW.md](./architecture/OVERVIEW.md) - Architecture
3. [FUNCTIONAL_REQUIREMENTS.md](./requirements/FUNCTIONAL_REQUIREMENTS.md) - Fonctionnalités
4. [DEPLOYMENT_SCENARIOS.md](./requirements/DEPLOYMENT_SCENARIOS.md) - Installation

### Pour Développeurs Expérimentés

1. [OVERVIEW.md](./architecture/OVERVIEW.md) - Architecture
2. [ACTION_SYSTEM.md](./modules/ACTION_SYSTEM.md) - Actions
3. [TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md) - Talents
4. [NON_FUNCTIONAL_REQUIREMENTS.md](./requirements/NON_FUNCTIONAL_REQUIREMENTS.md) - Standards

### Pour Contributeurs

1. [FUNCTIONAL_REQUIREMENTS.md](./requirements/FUNCTIONAL_REQUIREMENTS.md) - Exigences
2. [NON_FUNCTIONAL_REQUIREMENTS.md](./requirements/NON_FUNCTIONAL_REQUIREMENTS.md) - Standards
3. [DOCUMENTATION_PROCESS.md](./DOCUMENTATION_PROCESS.md) - Processus
4. Module spécifique selon contribution

## 🔗 Navigation

### Liens Principaux

- [Retour au README principal](./README.md)
- [Repository GitHub](https://github.com/foundryvtt/crucible)
- [Foundry VTT Package Page](https://foundryvtt.com/packages/crucible)

### Ressources Externes

- [Foundry VTT v13 API](https://foundryvtt.com/api/)
- [Foundry VTT Knowledge Base](https://foundryvtt.com/kb/)
- [TypeDataModel](https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html)
- [ApplicationV2](https://foundryvtt.com/api/classes/foundry.applications.api.ApplicationV2.html)

## 📝 Mise à Jour

### Dernière Mise à Jour

- **Date** : 2025-11-04
- **Version du système** : 0.8.1
- **Branche** : doc/ai-retro

### Prochaines Mises à Jour Prévues

- [ ] DICE_SYSTEM.md - Système de dés détaillé
- [ ] COMBAT_SYSTEM.md - Système de combat détaillé
- [ ] DATA_MODELS.md - Catalogue complet des modèles
- [ ] SPELLCRAFT_SYSTEM.md - Système de spellcraft détaillé
- [ ] CANVAS_COMPONENTS.md - Composants canvas
- [ ] API_REFERENCE.md - Référence API complète

## 💡 Conseils d'Utilisation

### Navigation Optimale

- Utilisez Ctrl+F (Cmd+F sur Mac) pour rechercher dans les documents
- Les diagrammes Mermaid sont visibles sur GitHub et dans VS Code
- Suivez les liens internes pour navigation rapide

### Lecture Efficace

- Commencez par le README de chaque section
- Consultez les diagrammes pour vue d'ensemble
- Référez-vous aux exemples de code
- Vérifiez les fichiers sources mentionnés

## 📧 Feedback

Pour améliorer cette documentation :

- Ouvrir une issue sur GitHub
- Proposer une PR avec améliorations
- Discuter dans les discussions du repo

---

**Documentation générée le** : 2025-11-04  
**Version du système** : 0.8.1  
**Auteur** : Documentation via AI assistance (GitHub Copilot)
