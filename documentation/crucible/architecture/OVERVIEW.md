# Architecture Overview - Système Crucible

## Introduction

Crucible est un système de jeu de rôle moderne conçu exclusivement pour Foundry Virtual Tabletop v13+. L'architecture tire parti des capacités uniques de Foundry VTT pour offrir une automatisation riche tout en maintenant une mécanique narrative profonde.

## Architecture Globale

```mermaid
graph TB
    subgraph "Entry Point"
        MAIN[crucible.mjs]
    end
    
    subgraph "Core Configuration"
        SYSTEM[module/config/system.mjs]
        CONFIG[SYSTEM.CONST & crucible.CONFIG]
    end
    
    subgraph "Documents Layer"
        ACTOR_DOC[CrucibleActor]
        ITEM_DOC[CrucibleItem]
        COMBAT_DOC[CrucibleCombat]
        EFFECT_DOC[CrucibleActiveEffect]
        TOKEN_DOC[CrucibleToken]
        MESSAGE_DOC[CrucibleChatMessage]
    end
    
    subgraph "Data Models Layer"
        ACTOR_MODELS["Actor Models<br/>Hero, Adversary, Group"]
        ITEM_MODELS["Item Models<br/>Talent, Spell, Weapon, Armor..."]
        COMBAT_MODELS["Combat Models<br/>Combat, Exploration, Social"]
        ACTION_MODEL[CrucibleAction]
    end
    
    subgraph "Applications Layer"
        SHEETS["Sheets<br/>Actor and Item Sheets"]
        CONFIG_APPS[Configuration Apps]
        HUD[HUD Components]
        ELEMENTS[Custom HTML Elements]
    end
    
    subgraph "Game Systems"
        TALENT_TREE[Talent Tree System]
        SPELLCRAFT[Spellcraft System]
        ACTION_SYSTEM[Action System]
        DICE_SYSTEM[Dice System]
    end
    
    subgraph "Canvas & Visualization"
        TOKEN_OBJ[CrucibleTokenObject]
        GRID[Grid Layer]
        VFX[VFX Integration]
        TREE_CANVAS[Talent Tree Canvas]
    end
    
    subgraph "Content Management"
        YAML["_source/ YAML Files"]
        PACKS["packs/ LevelDB"]
        COMPENDIUM[Compendium System]
    end
    
    MAIN --> SYSTEM
    MAIN --> CONFIG
    
    SYSTEM --> ACTOR_DOC
    SYSTEM --> ITEM_DOC
    SYSTEM --> COMBAT_DOC
    
    ACTOR_DOC --> ACTOR_MODELS
    ITEM_DOC --> ITEM_MODELS
    COMBAT_DOC --> COMBAT_MODELS
    
    ACTOR_MODELS --> ACTION_MODEL
    ITEM_MODELS --> ACTION_MODEL
    
    ACTOR_DOC --> SHEETS
    ITEM_DOC --> SHEETS
    
    ACTION_SYSTEM --> ACTION_MODEL
    ACTION_SYSTEM --> DICE_SYSTEM
    
    TALENT_TREE --> TREE_CANVAS
    SPELLCRAFT --> ACTION_MODEL
    
    TOKEN_DOC --> TOKEN_OBJ
    TOKEN_OBJ --> GRID
    TOKEN_OBJ --> VFX
    
    YAML --> PACKS
    PACKS --> COMPENDIUM
```

## Principes Architecturaux

### 1. Séparation des Préoccupations

L'architecture suit une séparation claire entre :

- **Documents** : Extensions des classes de base Foundry
- **Data Models** : Schémas de données utilisant `TypeDataModel`
- **Applications** : Interface utilisateur avec ApplicationV2
- **Systèmes de jeu** : Logique métier (Actions, Talents, Sorts)

### 2. Hiérarchie de Configuration

```mermaid
SYSTEM (constants statiques)
    ↓
crucible.CONST (exposé globalement)
    ↓
crucible.CONFIG (runtime configurable)
    ↓
User Settings (paramètres utilisateur)
```

### 3. Pattern de Données

Crucible utilise le pattern **TypeDataModel** de Foundry v13 :

```javascript
// Définition du schéma
static defineSchema() {
  return {
    fieldName: new fields.StringField({...options})
  }
}

// Préparation des données
prepareBaseData() { /* Données brutes */ }
prepareDerivedData() { /* Données calculées */ }
```

## Composants Principaux

### Document Extensions

| Document | Classe | Responsabilité |
|----------|--------|----------------|
| Actor | `CrucibleActor` | Gestion des créatures et personnages |
| Item | `CrucibleItem` | Gestion des objets, talents, sorts |
| Combat | `CrucibleCombat` | Gestion des rencontres de combat |
| ActiveEffect | `CrucibleActiveEffect` | Gestion des effets actifs |
| Token | `CrucibleToken` | Représentation canvas des acteurs |
| ChatMessage | `CrucibleChatMessage` | Messages de chat enrichis |

### Data Models

#### Actor Models
- **CrucibleHeroActor** : Personnages joueurs avec progression, talents
- **CrucibleAdversaryActor** : Adversaires avec threat ranks
- **CrucibleGroupActor** : Groupes de personnages (party)

#### Item Models
- **CrucibleTalentItem** : Talents avec système d'arbre
- **CrucibleSpellItem** : Sorts iconiques
- **CrucibleWeaponItem** : Armes avec actions d'attaque
- **CrucibleArmorItem** : Armures avec défenses
- **CrucibleAncestryItem** : Races de personnages
- **CrucibleBackgroundItem** : Historiques de personnages

### Système d'Actions

Le cœur mécanique de Crucible :

```mermaid
stateDiagram-v2
    [*] --> Initialize
    Initialize --> Prepare
    Prepare --> CanUse
    CanUse --> Configure
    Configure --> PreActivate
    PreActivate --> Roll
    Roll --> PostActivate
    PostActivate --> Confirm
    Confirm --> [*]
```

Chaque action suit un cycle de vie complet avec hooks à chaque étape.

### Système de Talents

```mermaid
graph LR
    NODE[Talent Node] --> TALENTS[Multiple Talents]
    TALENTS --> RANKS[Talent Ranks]
    RANKS --> ACTIONS[Actions]
    RANKS --> PASSIVES[Passive Effects]
    RANKS --> PREREQ[Prerequisites]
    
    PREREQ --> LEVEL[Level]
    PREREQ --> ARCHETYPE[Archetype]
    PREREQ --> TRAINING[Training Rank]
```

### Système de Spellcraft

Composition dynamique de sorts via :
- **Runes** : Type de sort (feu, glace, etc.)
- **Gestures** : Forme de l'effet (cone, blast, etc.)
- **Inflections** : Modificateurs (damage, healing, etc.)

```mermaid
graph TD
    RUNE[Rune] --> SPELL[Spell Action]
    GESTURE[Gesture] --> SPELL
    INFLECTION[Inflection] --> SPELL
    SPELL --> EFFECT[Dynamic Effect]
```

## Flux de Données

### Initialisation

```mermaid
sequenceDiagram
    participant F as Foundry VTT
    participant M as crucible.mjs
    participant S as SYSTEM Config
    participant D as Documents
    participant A as Applications
    
    F->>M: Hook: init
    M->>S: Load Configuration
    M->>D: Register Document Classes
    M->>A: Register Sheets
    M->>F: Expose crucible.api
    F->>M: Hook: setup
    F->>M: Hook: ready
```

### Utilisation d'une Action

```mermaid
sequenceDiagram
    participant U as User
    participant S as Sheet
    participant A as Action
    participant D as Dialog
    participant R as Roll
    participant C as Chat
    
    U->>S: Click Action Button
    S->>A: action.use()
    A->>A: initialize()
    A->>A: prepare()
    A->>D: Show Configuration Dialog
    D->>U: User Configures
    U->>D: Confirm
    D->>A: preActivate(targets)
    A->>R: Roll Dice
    R->>A: roll(outcome)
    A->>A: postActivate(outcome)
    A->>C: Create Chat Message
    A->>A: confirm()
```

## Gestion du Contenu

### Workflow YAML → LevelDB

```mermaid
graph LR
    EDIT[Edit _source/*.yml] --> EXTRACT[npm run extract]
    EXTRACT --> YAML[YAML Files]
    YAML --> COMPILE[npm run compile]
    COMPILE --> LEVELDB[packs/ LevelDB]
    LEVELDB --> FOUNDRY[Foundry VTT]
```

**Important** : Ne jamais modifier directement les packs binaires !

## Patterns de Code

### 1. Action Binding

```javascript
// Les actions sont liées à un acteur
const action = item.actions[0].bind(actor);
await action.use();
```

### 2. Data Access

```javascript
// Accès au modèle de données typé
item.system // Type-specific data model
item.actions // Array of CrucibleAction
item.config.category.id // Configuration
```

### 3. Localisation

```javascript
// Toujours utiliser l'internationalisation
game.i18n.localize("CRUCIBLE.ActionUse")
```

### 4. Fusion d'Objets

```javascript
// Utiliser les utilitaires Foundry
foundry.utils.mergeObject(target, source);
// Jamais Object.assign() directement !
```

## Intégrations Externes

### VFX Module

Détection automatique du module `foundryvtt-vfx` :

```javascript
crucible.vfxEnabled = !!game.modules.get("foundryvtt-vfx")?.active;
```

Active les effets visuels améliorés pour les actions de frappe.

## Conventions de Fichiers

### Structure des Modules

```
module/
├── config/          # Configuration statique
├── documents/       # Extensions de documents
├── models/          # Schémas de données
├── applications/    # Interface utilisateur
│   ├── sheets/      # Feuilles de personnage/objet
│   ├── config/      # Applications de configuration
│   ├── hud/         # HUD personnalisés
│   └── elements/    # Éléments HTML personnalisés
├── dice/            # Système de dés
├── canvas/          # Composants canvas
└── hooks/           # Hooks Foundry
```

### Nommage

- **Classes** : `PascalCase` (ex: `CrucibleAction`)
- **Variables/Fonctions** : `camelCase` (ex: `prepareBaseData`)
- **Constants** : `UPPER_SNAKE_CASE` (ex: `TARGET_TYPES`)
- **IDs de Documents** : Générés via `generateId(name, length)`

## Compatibilité

- **Minimum** : Foundry VTT v13.347
- **Vérifié** : Foundry VTT v14.349
- **Maximum** : Foundry VTT v14

Le système doit rester compatible avec Foundry VTT v13.

## Points d'Extension

### Hooks Personnalisés

Le système expose des hooks à différentes étapes :
- `crucible.action.*` : Lifecycle des actions
- `crucible.talent.*` : Gestion des talents
- `crucible.combat.*` : Combat encounters

### API Publique

```javascript
crucible.api = {
  applications,  // Classes d'applications
  audio,         // Audio helpers
  canvas,        // Canvas components
  dice,          // Dice system
  documents,     // Document classes
  models,        // Data models
  methods,       // Utility methods
  talents,       // Talent system
  hooks          // Hook handlers
}
```

## Références

- [Foundry VTT v13 API](https://foundryvtt.com/api/)
- [Foundry VTT Knowledge Base](https://foundryvtt.com/kb/)
- [TypeDataModel Documentation](https://foundryvtt.com/api/classes/foundry.abstract.TypeDataModel.html)
- [ApplicationV2 Guide](https://foundryvtt.com/api/classes/foundry.applications.api.ApplicationV2.html)

