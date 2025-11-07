# Documentation Technique - Système Crucible

Bienvenue dans la documentation technique du système Crucible pour Foundry Virtual Tabletop v13+.

## 📚 Table des Matières

### 🏗️ Architecture

- **[OVERVIEW.md](./architecture/OVERVIEW.md)** - Vue d'ensemble complète de l'architecture du système
  - Architecture globale
  - Principes architecturaux
  - Composants principaux
  - Flux de données
  - Patterns de code
  - Points d'extension

### 🔧 Modules

- **[ACTION_SYSTEM.md](./modules/ACTION_SYSTEM.md)** - Système d'actions détaillé
  - Cycle de vie des actions
  - Types de ciblage
  - Coûts et résultats
  - Actions de combat et sorts
  - Bonnes pratiques

- **[TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md)** - Système de talents détaillé
  - Arbre de talents
  - Prérequis et progression
  - Rangs et formation
  - Interface canvas
  - Effets passifs

### 📋 Exigences

- **[FUNCTIONAL_REQUIREMENTS.md](./requirements/FUNCTIONAL_REQUIREMENTS.md)** - Exigences fonctionnelles (MOSCOW)
  - Must Have (10 exigences essentielles)
  - Should Have (10 exigences importantes)
  - Could Have (10 exigences souhaitables)
  - Won't Have (5 exclusions)

- **[NON_FUNCTIONAL_REQUIREMENTS.md](./requirements/NON_FUNCTIONAL_REQUIREMENTS.md)** - Exigences non-fonctionnelles
  - Performance
  - Compatibilité
  - Sécurité
  - Maintenabilité
  - Utilisabilité
  - Fiabilité
  - Évolutivité

- **[DEPLOYMENT_SCENARIOS.md](./requirements/DEPLOYMENT_SCENARIOS.md)** - Scénarios de déploiement
  - Installation standard et développeur
  - Workflow de développement
  - Release et mise à jour
  - Configuration serveur
  - Dépannage

- **[USABILITY_FEATURES.md](./requirements/USABILITY_FEATURES.md)** - Fonctionnalités d'utilisabilité
  - Interface utilisateur
  - Feedback utilisateur
  - Accessibilité
  - Wizard de création
  - Tooltips et aide

### 📝 Processus

- **[DOCUMENTATION_PROCESS.md](./DOCUMENTATION_PROCESS.md)** - Méthodologie de documentation
  - Approche utilisée
  - Fichiers analysés
  - Documentation créée
  - Statistiques
  - Prochaines étapes

## 🎯 Public Cible

Cette documentation est destinée à :

- **Développeurs** travaillant sur le système Crucible
- **Contributeurs** souhaitant comprendre l'architecture
- **Mainteneurs** du projet
- **Développeurs Foundry VTT** expérimentés

⚠️ **Note** : Cette documentation suppose une connaissance solide de Foundry VTT v13+ et de JavaScript moderne (ES6+).

## 🚀 Démarrage Rapide

### Pour Comprendre l'Architecture

1. Commencez par **[OVERVIEW.md](./architecture/OVERVIEW.md)** pour une vision globale
2. Lisez **[ACTION_SYSTEM.md](./modules/ACTION_SYSTEM.md)** pour comprendre le cœur mécanique
3. Consultez **[TALENT_SYSTEM.md](./modules/TALENT_SYSTEM.md)** pour la progression des personnages

### Pour Contribuer

1. Lisez le **[CONTRIBUTING.md](../CONTRIBUTING.md)** à la racine du projet
2. Consultez **[FUNCTIONAL_REQUIREMENTS.md](./requirements/FUNCTIONAL_REQUIREMENTS.md)** pour voir ce qui est implémenté
3. Vérifiez **[NON_FUNCTIONAL_REQUIREMENTS.md](./requirements/NON_FUNCTIONAL_REQUIREMENTS.md)** pour les standards de qualité

### Pour Étendre le Système

1. Consultez la section "Points d'Extension" dans **[OVERVIEW.md](./architecture/OVERVIEW.md)**
2. Référez-vous à l'API publique exposée via `crucible.api`
3. Utilisez les hooks personnalisés documentés

## 📊 Diagrammes

Cette documentation utilise **Mermaid** pour les diagrammes. Vous pouvez les visualiser :

- Sur GitHub (rendu automatique)
- Dans VS Code (avec extension Markdown Preview Mermaid Support)
- Avec n'importe quel viewer Markdown compatible Mermaid

### Types de Diagrammes Inclus

- **Graphes de dépendances** (architecture, workflows)
- **Diagrammes de séquence** (flux d'exécution)
- **Diagrammes de classes** (structure des objets)
- **Diagrammes d'état** (cycles de vie)

## 🔍 Navigation

### Par Domaine Fonctionnel

| Domaine               | Document Principal             | Documents Liés                      |
| --------------------- | ------------------------------ | ----------------------------------- |
| Architecture Globale  | OVERVIEW.md                    | DOCUMENTATION_PROCESS.md            |
| Actions & Combat      | ACTION_SYSTEM.md               | FUNCTIONAL_REQUIREMENTS.md (M2, M5) |
| Talents & Progression | TALENT_SYSTEM.md               | FUNCTIONAL_REQUIREMENTS.md (M4)     |
| Qualité & Performance | NON_FUNCTIONAL_REQUIREMENTS.md | OVERVIEW.md (Conventions)           |

### Par Type de Développeur

| Profil               | Documents Recommandés                                                   |
| -------------------- | ----------------------------------------------------------------------- |
| Nouveau contributeur | OVERVIEW.md → FUNCTIONAL_REQUIREMENTS.md → DOCUMENTATION_PROCESS.md     |
| Développeur système  | ACTION_SYSTEM.md → TALENT_SYSTEM.md → NON_FUNCTIONAL_REQUIREMENTS.md    |
| Architecte           | OVERVIEW.md → NON_FUNCTIONAL_REQUIREMENTS.md → DOCUMENTATION_PROCESS.md |
| Testeur/QA           | FUNCTIONAL_REQUIREMENTS.md → NON_FUNCTIONAL_REQUIREMENTS.md             |

## 📈 Couverture

### Modules Documentés

- ✅ Core System (Configuration, initialisation)
- ✅ Action System (Complet)
- ✅ Talent System (Complet)
- ✅ Documents Layer (Overview)
- ✅ Data Models (Principaux)
- ✅ Applications (Architecture)
- ⚠️ Dice System (Références)
- ⚠️ Spellcraft (Intégré)
- ⚠️ Combat System (Références)
- ❌ Canvas Components (Partiel)
- ❌ Audio System
- ❌ Interaction System

### À Venir

Documents en cours de planification :

- [ ] DICE_SYSTEM.md - Système de dés détaillé
- [ ] COMBAT_SYSTEM.md - Système de combat détaillé
- [ ] DATA_MODELS.md - Catalogue complet des modèles
- [ ] SPELLCRAFT_SYSTEM.md - Système de spellcraft détaillé
- [ ] CANVAS_COMPONENTS.md - Composants canvas
- [ ] API_REFERENCE.md - Référence API complète

## 🛠️ Maintenance

### Mise à Jour de la Documentation

La documentation doit être mise à jour lors de :

- **Nouvelles fonctionnalités** : Documenter dans le module approprié
- **Modifications d'architecture** : Mettre à jour OVERVIEW.md
- **Changements breaking** : Documenter et ajouter note de migration
- **Nouvelles versions** : Mettre à jour les numéros de version

### Versionning

La documentation suit le versioning du système :

- **Version actuelle** : 0.8.1
- **Dernière mise à jour** : 2025-11-04
- **Branche** : doc/ai-retro

## 📝 Conventions

### Format

- **Langue** : Français (comme demandé)
- **Format** : Markdown
- **Diagrammes** : Mermaid
- **Code** : Blocs avec syntax highlighting

### Style

- Titres clairs et hiérarchiques
- Exemples de code abondants
- Diagrammes pour clarifier concepts complexes
- Liens internes pour navigation
- Références aux fichiers sources

## 🔗 Ressources Externes

- [Foundry VTT v13 API](https://foundryvtt.com/api/)
- [Foundry VTT Knowledge Base](https://foundryvtt.com/kb/)
- [TypeDataModel Documentation](https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html)
- [ApplicationV2 Guide](https://foundryvtt.com/api/classes/foundry.applications.api.ApplicationV2.html)
- [Mermaid Documentation](https://mermaid.js.org/)

## 💬 Contribution à la Documentation

Pour contribuer à cette documentation :

1. Suivez le processus décrit dans [DOCUMENTATION_PROCESS.md](./DOCUMENTATION_PROCESS.md)
2. Maintenez le même niveau de détail et de qualité
3. Incluez des diagrammes pour concepts complexes
4. Ajoutez des exemples de code pratiques
5. Référencez les fichiers sources

## 📧 Contact

Pour questions sur la documentation :

- **Issues GitHub** : Utilisez le tracker du projet
- **Discussions** : Section discussions du repo
- **Mainteneur** : Voir CONTRIBUTING.md

---

**Documentation générée le** : 2025-11-04  
**Version du système** : 0.8.1  
**Auteur** : Documentation via AI assistance (GitHub Copilot)
