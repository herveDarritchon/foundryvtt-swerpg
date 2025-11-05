# Architecture Overview - Système Star Wars Edge RPG (swerpg)# Architecture Overview - Système Star Wars Edge RPG (swerpg)



## 🎯 Vision## 🎯 Vision



Star Wars Edge RPG (swerpg) est un système narratif pour Foundry VTT v13+ qui automatise les mécaniques complexes tout en préservant l'esprit cinématographique de Star Wars.Star Wars Edge RPG (swerpg) est un système narratif pour Foundry VTT v13+ qui automatise les mécaniques complexes tout en préservant l'esprit cinématographique de Star Wars.



## 🏗️ Architecture en Couches## 🏗️ Architecture en Couches



```mermaid```mermaid

graph TBgraph TB

    subgraph "🎮 Game Systems Layer"    subgraph "🎮 Game Systems Layer"

        DICE[Dés Narratifs]        DICE[Dés Narratifs]

        TALENTS[Arbres de Talents]        TALENTS[Arbres de Talents]

        OBLIGATIONS[Obligations/Devoirs]        OBLIGATIONS[Obligations/Devoirs]

        FORCE[Pouvoirs de la Force]        FORCE[Pouvoirs de la Force]

    end    end

        

    subgraph "🎨 Presentation Layer"    subgraph "🎨 Presentation Layer"

        SHEETS[Feuilles de Personnage]        SHEETS[Feuilles de Personnage]

        CANVAS[Canvas Extensions]        CANVAS[Canvas Extensions]

        HUD[Composants HUD]        HUD[Composants HUD]

    end    end

        

    subgraph "📊 Data Layer"    subgraph "📊 Data Layer"

        MODELS[Data Models]        MODELS[Data Models]

        DOCUMENTS[Document Extensions]        DOCUMENTS[Document Extensions]

        COMPENDIUMS[15+ Compendium Packs]        COMPENDIUMS[15+ Compendium Packs]

    end    end

        

    subgraph "⚙️ Core Layer"    subgraph "⚙️ Core Layer"

        CONFIG[Configuration System]        CONFIG[Configuration System]

        API[Public API]        API[Public API]

        HOOKS[Event System]        HOOKS[Event System]

    end    end

        

    subgraph "🗄️ Data Sources"    subgraph "🗄️ Data Sources"

        YAML[Sources YAML]        YAML[Sources YAML]

        BUILD[Build Pipeline]        BUILD[Build Pipeline]

    end    end

``````



## 🎨 Principes Directeurs## 🎨 Principes Directeurs



### 1. **Séparation Claire des Responsabilités**### 1. **Séparation Claire des Responsabilités**

- **Core** : Configuration et initialisation → [Configuration](./core/)

- **Core** : Configuration et initialisation → [Configuration](./core/)- **Data** : Modèles et persistence → [Data Management](./data/)

- **Data** : Modèles et persistence → [Data Management](./data/)- **UI** : Interfaces et interactions → [User Interface](./ui/)

- **UI** : Interfaces et interactions → [User Interface](./ui/)- **Systems** : Mécaniques de jeu → [Game Systems](./systems/)

- **Systems** : Mécaniques de jeu → [Game Systems](./systems/)- **Integration** : Intégration Foundry → [Integration](./integration/)

- **Integration** : Intégration Foundry → [Integration](./integration/)

### 2. **Configuration Hiérarchique**

### 2. **Configuration Hiérarchique**```

SYSTEM (statique) → swerpg.CONST → swerpg.CONFIG → User Settings

```text```

SYSTEM (statique) → swerpg.CONST → swerpg.CONFIG → User Settings

```### 3. **Pattern TypeDataModel**

Tous les modèles utilisent `foundry.abstract.TypeDataModel` pour la validation et la structure.

### 3. **Pattern TypeDataModel**

### 4. **ApplicationV2 + Handlebars**

Tous les modèles utilisent `foundry.abstract.TypeDataModel` pour la validation et la structure.Interface moderne avec `HandlebarsApplicationMixin(ApplicationV2)`.



### 4. **ApplicationV2 + Handlebars**## 🔄 Flux Principaux



Interface moderne avec `HandlebarsApplicationMixin(ApplicationV2)`.### Initialisation

```

## 🔄 Flux Principauxswerpg.mjs → Configuration → Models → Applications → Game Systems

```

### Initialisation

### Action Workflow

```text```

swerpg.mjs → Configuration → Models → Applications → Game SystemsUser Input → Sheet → Action.use() → Dialog → Roll → Chat → Effects

``````



### Action Workflow### Data Workflow

```

```textYAML Sources → Build Pipeline → Compendium Packs → Runtime Models

User Input → Sheet → Action.use() → Dialog → Roll → Chat → Effects```

```

## 🎯 Points d'Extension

### Data Workflow

| Domaine | Extension Points | Documentation |

```text|---------|------------------|---------------|

YAML Sources → Build Pipeline → Compendium Packs → Runtime Models| **Data Models** | `TypeDataModel` subclasses | [DATA/MODELS.md](./data/MODELS.md) |

```| **UI Components** | `ApplicationV2` sheets | [UI/APPLICATIONS.md](./ui/APPLICATIONS.md) |

| **Game Mechanics** | Action system hooks | [SYSTEMS/*.md](./systems/) |

## 🎯 Points d'Extension| **Canvas** | Canvas layers/tools | [UI/CANVAS.md](./ui/CANVAS.md) |



| Domaine | Extension Points | Documentation |## 🔗 Intégrations Clés

|---------|------------------|---------------|

| **Data Models** | `TypeDataModel` subclasses | [DATA/MODELS.md](./data/MODELS.md) |- **Foundry Core** : Documents, Applications, Canvas

| **UI Components** | `ApplicationV2` sheets | [UI/APPLICATIONS.md](./ui/APPLICATIONS.md) |- **TypeDataModel** : Validation et structure des données

| **Game Mechanics** | Action system hooks | [SYSTEMS/*.md](./systems/) |- **Handlebars** : Templates et composants UI

| **Canvas** | Canvas layers/tools | [UI/CANVAS.md](./ui/CANVAS.md) |- **LevelDB** : Stockage compendium optimisé



## 🔗 Intégrations Clés## 📚 Documentation Détaillée



- **Foundry Core** : Documents, Applications, CanvasPour approfondir un domaine spécifique :

- **TypeDataModel** : Validation et structure des données

- **Handlebars** : Templates et composants UI### 🏗️ Architecture Core

- **LevelDB** : Stockage compendium optimisé- [Configuration System](./core/CONFIGURATION.md)

- [System Initialization](./core/INITIALIZATION.md)

## 📚 Documentation Détaillée- [Public API](./core/API.md)



Pour approfondir un domaine spécifique :### 📊 Gestion des Données

- [Document Extensions](./data/DOCUMENTS.md)

### 🏗️ Architecture Core- [Data Models](./data/MODELS.md)

- [Compendium Management](./data/COMPENDIUMS.md)

- [Configuration System](./core/CONFIGURATION.md)

- [System Initialization](./core/INITIALIZATION.md)### 🎨 Interface Utilisateur

- [Public API](./core/API.md)- [Application Architecture](./ui/APPLICATIONS.md)

- [Template System](./ui/HANDLEBARS.md)

### 📊 Gestion des Données- [Canvas Extensions](./ui/CANVAS.md)



- [Document Extensions](./data/DOCUMENTS.md)### 🎮 Systèmes de Jeu

- [Data Models](./data/MODELS.md)- [Dice System Architecture](./systems/DICE_ARCHITECTURE.md)

- [Compendium Management](./data/COMPENDIUMS.md)- [Talent Tree Architecture](./systems/TALENTS_ARCHITECTURE.md)

- [Obligation System Architecture](./systems/OBLIGATIONS_ARCHITECTURE.md)

### 🎨 Interface Utilisateur- [Force Powers Architecture](./systems/FORCE_ARCHITECTURE.md)



- [Application Architecture](./ui/APPLICATIONS.md)### 🔧 Intégration et Performance

- [Template System](./ui/HANDLEBARS.md)- [Foundry Integration Patterns](./integration/FOUNDRY_INTEGRATION.md)

- [Canvas Extensions](./ui/CANVAS.md)- [Performance Optimization](./integration/PERFORMANCE.md)

- [Security Guidelines](./integration/SECURITY.md)

### 🎮 Systèmes de Jeu

## 🚀 Démarrage Rapide

- [Dice System Architecture](./systems/DICE_ARCHITECTURE.md)

- [Talent Tree Architecture](./systems/TALENTS_ARCHITECTURE.md)### Pour les Développeurs

- [Obligation System Architecture](./systems/OBLIGATIONS_ARCHITECTURE.md)1. Lisez cette vue d'ensemble

- [Force Powers Architecture](./systems/FORCE_ARCHITECTURE.md)2. Consultez [CONFIGURATION.md](./core/CONFIGURATION.md) pour comprendre la structure

3. Explorez [MODELS.md](./data/MODELS.md) pour les patterns de données

### 🔧 Intégration et Performance

### Pour les Contributeurs

- [Foundry Integration Patterns](./integration/FOUNDRY_INTEGRATION.md)1. Vérifiez [FOUNDRY_INTEGRATION.md](./integration/FOUNDRY_INTEGRATION.md) pour les standards

- [Performance Optimization](./integration/PERFORMANCE.md)2. Consultez le domaine spécifique à votre contribution

- [Security Guidelines](./integration/SECURITY.md)3. Respectez les patterns établis dans chaque couche



## 🚀 Démarrage Rapide---



### Pour les Développeurs> 💡 **Note** : Cette architecture évolue avec Foundry VTT. Consultez régulièrement la documentation pour les mises à jour.


1. Lisez cette vue d'ensemble
2. Consultez [CONFIGURATION.md](./core/CONFIGURATION.md) pour comprendre la structure
3. Explorez [MODELS.md](./data/MODELS.md) pour les patterns de données

### Pour les Contributeurs

1. Vérifiez [FOUNDRY_INTEGRATION.md](./integration/FOUNDRY_INTEGRATION.md) pour les standards
2. Consultez le domaine spécifique à votre contribution
3. Respectez les patterns établis dans chaque couche

---

> 💡 **Note** : Cette architecture évolue avec Foundry VTT. Consultez régulièrement la documentation pour les mises à jour.