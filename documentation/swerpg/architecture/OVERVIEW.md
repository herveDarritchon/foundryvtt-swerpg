# Architecture Overview - Système Star Wars Edge RPG (swerpg)

## 🎯 Vision

> Star Wars Edge RPG (swerpg) est un système narratif pour Foundry VTT v13+ qui automatise les mécaniques complexes tout en préservant l'esprit cinématographique de Star Wars.

## 🏗️ Architecture en Couches

```mermaid
graph TB

    subgraph "🎮 Game Systems Layer"
        DICE[Dés Narratifs]
        TALENTS[Arbres de Talents]
        OBLIGATIONS[Obligations/Devoirs]
        FORCE[Pouvoirs de la Force]
    end

    subgraph "🎨 Presentation Layer"
        SHEETS[Feuilles de Personnage]
        CANVAS[Canvas Extensions]
        HUD[Composants HUD]
    end

    subgraph "📊 Data Layer"
        MODELS[Data Models]
        DOCUMENTS[Document Extensions]
        COMPENDIUMS[15+ Compendium Packs]
    end

    subgraph "⚙️ Core Layer"
        CONFIG[Configuration System]
        API[Public API]
        HOOKS[Event System]
    end

    subgraph "🗄️ Data Sources"
        YAML[Sources YAML]
        BUILD[Build Pipeline]
    end
````

## 🎨 Principes Directeurs

### 1. Séparation Claire des Responsabilités

* **Core** : Configuration et initialisation → [Configuration](./core/)
* **Data** : Modèles et persistance → [Data Management](./data/)
* **UI** : Interfaces et interactions → [User Interface](./ui/)
* **Systems** : Mécaniques de jeu → [Game Systems](./systems/)
* **Integration** : Intégration Foundry → [Integration](./integration/)

### 2. **Configuration Hiérarchique**

```text
SYSTEM (statique) → swerpg.CONST → swerpg.CONFIG → User Settings
```

### 3. **Pattern TypeDataModel**

Tous les modèles utilisent `foundry.abstract.TypeDataModel` pour la validation et la structure.

### 4. **ApplicationV2 + Handlebars**

Interface moderne avec `HandlebarsApplicationMixin(ApplicationV2)` pour toutes les feuilles et composants UI.

## 🔄 Flux Principaux

### Initialisation

```text
swerpg.mjs → Configuration → Models → Applications → Game Systems
```

### Action Workflow

```text
User Input → Sheet → Action.use() → Dialog → Roll → Chat → Effects
```

### Data Workflow

```text
YAML Sources → Build Pipeline → Compendium Packs → Runtime Models
```

## 🎯 Points d'Extension

| Domaine            | Extension Points           | Documentation                              |
| ------------------ | -------------------------- | ------------------------------------------ |
| **Data Models**    | `TypeDataModel` subclasses | [DATA/MODELS.md](./data/MODELS.md)         |
| **UI Components**  | `ApplicationV2` sheets     | [UI/APPLICATIONS.md](./ui/APPLICATIONS.md) |
| **Game Mechanics** | Action system hooks        | [SYSTEMS/*.md](./systems/)                 |
| **Canvas**         | Canvas layers/tools        | [UI/CANVAS.md](./ui/CANVAS.md)             |

## 🔗 Intégrations Clés

* **Foundry Core** : Documents, Applications, Canvas
* **TypeDataModel** : Validation et structure des données
* **Handlebars** : Templates et composants UI
* **LevelDB** : Stockage compendium optimisé

## 📚 Documentation Détaillée

### 🏗️ Architecture Core

Ce répertoire décrit le cœur technique du système : comment `swerpg` se charge, se configure et expose une API stable. Il sert de point de référence pour comprendre le cycle de vie du système et les contrats que le noyau impose au reste de l’architecture.

* [Configuration System](./core/CONFIGURATION.md)
* [System Initialization](./core/INITIALIZATION.md)
* [Public API](./core/API.md)

### 📊 Gestion des Données

Cette partie documente la manière dont les données sont structurées, stockées et distribuées : modèles, documents Foundry et compendiums. Elle permet de savoir où vivent réellement les informations de jeu et comment les faire évoluer sans tout casser.

* [Document Extensions](./data/DOCUMENTS.md)
* [Data Models](./data/MODELS.md)
* [Compendium Management](./data/COMPENDIUMS.md)

### 🎨 Interface Utilisateur

Ce répertoire couvre tout ce que voient et manipulent les utilisateurs : feuilles, applications, templates et extensions canvas. Il sert à concevoir des interfaces cohérentes, maintenables et alignées avec l’expérience Star Wars voulue.

* [Application Architecture](./ui/APPLICATIONS.md)
* [Template System](./ui/HANDLEBARS.md)
* [Canvas Extensions](./ui/CANVAS.md)

### 🎮 Systèmes de Jeu

Ici sont détaillées les mécaniques de jeu propres à Star Wars Edge : dés narratifs, arbres de talents, obligations, Force, etc. Cette documentation explique comment les systèmes sont modélisés et comment les étendre ou les rééquilibrer.

* [Dice System Architecture](./systems/DICE_ARCHITECTURE.md)
* [Talent Tree Architecture](./systems/TALENTS_ARCHITECTURE.md)
* [Obligation System Architecture](./systems/OBLIGATIONS_ARCHITECTURE.md)
* [Force Powers Architecture](./systems/FORCE_ARCHITECTURE.md)

### 🔧 Intégration et Performance

Ce dossier décrit la façon dont swerpg s’intègre à Foundry et comment le système reste performant et sécurisé. On y trouve les bonnes pratiques pour brancher de nouvelles fonctionnalités sans dégrader les temps de chargement ni ouvrir de failles.

* [Foundry Integration Patterns](./integration/FOUNDRY_INTEGRATION.md)
* [Performance Optimization](./integration/PERFORMANCE.md)
* [Security Guidelines](./integration/SECURITY.md)

## 🚀 Démarrage Rapide

### Pour les Développeurs

1. Lisez cette vue d'ensemble.
2. Consultez [CONFIGURATION.md](./core/CONFIGURATION.md) pour comprendre la structure.
3. Explorez [MODELS.md](./data/MODELS.md) pour les patterns de données.

### Pour les Contributeurs

1. Vérifiez [FOUNDRY_INTEGRATION.md](./integration/FOUNDRY_INTEGRATION.md) pour les standards.
2. Consultez le domaine spécifique à votre contribution.
3. Respectez les patterns établis dans chaque couche.

---

> 💡 **Note** : Cette architecture évolue avec Foundry VTT. Consultez régulièrement la documentation pour les mises à jour.