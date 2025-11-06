# SWERPG — Guide de Style de Code (Foundry VTT v13+)

> **Objectif** : établir un cadre clair, cohérent et « Star Wars‑friendly » pour tout le code du système **SWERPG** (Star Wars Edge RPG) basé sur les systèmes Edge of the Empire, Age of Rebellion et Force and Destiny. Ce document vivant accompagne la base de code et sert de checklist lors des PR.

---

## 1) Philosophie

* **Lisibilité avant tout** : privilégier la clarté au code « clever ». Chaque module doit être compréhensible en 5 minutes.
* **API Foundry idiomatique** : utiliser `ApplicationV2`, `HandlebarsApplicationMixin`, `TypeDataModel`, `foundry.utils` selon les standards v13.
* **Architecture modulaire** : séparation claire entre *Data Models* (`/models/`), *UI* (`/applications/`), *Configuration* (`/config/`), *Hooks* (`/hooks/`).
* **Principes SOLID** : responsabilité unique pour chaque classe, composabilité, injection de dépendances via utilitaires.
* **Code testable** : logique métier testée avec Vitest, séparation des préoccupations pour faciliter les mocks.
* **Identité Star Wars** : variables CSS thématiques, terminologie appropriée (wounds/strain, characteristics, etc.).

---

## 2) Stack & Outils

* **Langage** : **JavaScript ES2022** (modules `.mjs`) + **JSDoc** pour la documentation.
* **Build System** : Scripts npm avec Rollup, LESS, et `@foundryvtt/foundryvtt-cli` pour les compendiums.
* **Gestionnaire de paquets** : **pnpm** (lockfile : `pnpm-lock.yaml`).
* **Tests** : **Vitest** avec couverture via `@vitest/coverage-v8`, environnement jsdom.
* **Workflow de contenu** : YAML source (`_source/`) → LevelDB compilé (`packs/`) via `build.mjs`.
* **Styles** : **LESS** → CSS avec variables thématiques Star Wars.
* **Hot Reload** : Support intégré pour `.less`, `.css`, `.hbs`, `.json` via `system.json`.

---

## 3) Architecture du Projet

```text
module/
  applications/       # ApplicationV2 & feuilles (sheets/, config/, sidebar/)
  models/             # TypeDataModel pour tous les types d'items/actors
  config/             # Configuration système (SYSTEM, enums, constantes)
  documents/          # Extensions des documents Foundry
  hooks/              # Gestionnaires d'événements Foundry
  canvas/             # Éléments canvas (ruler, token, talent-tree)
  dice/               # Système de dés spécialisé Star Wars
  helpers/            # Utilitaires génériques
  lib/                # Bibliothèques de logique métier
  ui/                 # Composants UI réutilisables
  utils/              # Helpers système (flags, i18n, etc.)
  chat.mjs            # Gestion des messages de chat
  socket.mjs          # Communication WebSocket
styles/               # LESS + variables thématiques
templates/            # Handlebars + partials
lang/                 # Internationalisation (en.json, fr.json)
_source/              # Données YAML source pour compendiums
packs/                # Compendiums LevelDB compilés
tests/                # Tests Vitest
```

### Conventions de nommage

* **Fichiers** : `kebab-case.mjs` pour les modules, `PascalCase.mjs` pour les classes principales.
* **Classes** : `Swerpg{Type}` (ex: `SwerpgActor`, `SwerpgHero`, `SwerpgBaseActorSheet`).
* **Exports** : `camelCase` pour les fonctions, `PascalCase` pour les classes.
* **Templates** : `kebab-case.hbs`, partials avec préfixe `_partial-name.hbs`.
* **Styles** : classes CSS avec préfixe `swerpg` ou `sw-`.

---

## 4) Modules & Imports

* **Extensions** : `.mjs` pour tous les modules JavaScript (respect de `"type": "module"`).
* **Imports relatifs** : utiliser les chemins relatifs depuis la racine du module.
* **Barrels** : `_module.mjs` dans chaque dossier principal pour les exports groupés.
* **Exports par défaut** : privilégiés pour les classes principales, exports nommés pour les utilitaires.
* **Structure d'imports** :

  ```javascript
  // Configuration et constants d'abord
  import {SYSTEM} from "./config/system.mjs";
  
  // Modules internes
  import * as applications from "./applications/_module.mjs";
  import * as models from "./models/_module.mjs";
  
  // Classes spécifiques
  import SwerpgActor from "./documents/actor.mjs";
  ```

---

## 5) Data Models (TypeDataModel)

Exemple basé sur votre architecture existante :

```javascript
// module/models/hero.mjs
export default class SwerpgHero extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { fields } = foundry.data;
    return {
      // Caractéristiques de base Star Wars
      characteristics: new fields.SchemaField({
        brawn:     new fields.NumberField({ initial: 2, integer: true, min: 1, max: 6 }),
        agility:   new fields.NumberField({ initial: 2, integer: true, min: 1, max: 6 }),
        intellect: new fields.NumberField({ initial: 2, integer: true, min: 1, max: 6 }),
        cunning:   new fields.NumberField({ initial: 2, integer: true, min: 1, max: 6 }),
        willpower: new fields.NumberField({ initial: 2, integer: true, min: 1, max: 6 }),
        presence:  new fields.NumberField({ initial: 2, integer: true, min: 1, max: 6 }),
      }),

      // Seuils et défenses
      wounds: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        threshold: new fields.NumberField({ initial: 10, integer: true, min: 0 }),
      }),
      strain: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        threshold: new fields.NumberField({ initial: 10, integer: true, min: 0 }),
      }),
      
      // XP et progression
      experience: new fields.SchemaField({
        total: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        available: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
      }),

      // Compétences (référence aux IDs du système)
      skills: new fields.ObjectField({ initial: {} }),
      
      // Obligations et motivations
      obligations: new fields.ArrayField(new fields.StringField()),
      motivations: new fields.ObjectField({ initial: {} }),
    };
  }

  /** Calculs dérivés pour les seuils et défenses */
  prepareDerivedData() {
    // Seuil de blessures = Brawn + racial bonus
    this.wounds.threshold = 10 + this.characteristics.brawn;
    
    // Seuil de fatigue = Willpower + racial bonus  
    this.strain.threshold = 10 + this.characteristics.willpower;
    
    // Valeur d'absorption basée sur Brawn + armure
    this.soak = this.characteristics.brawn + (this.parent?.system?.armor?.soak ?? 0);
  }

  /** Migration des données entre versions */
  static migrateData(source) {
    // Exemple : migration d'anciennes structures de données
    if (source.wounds && typeof source.wounds === 'number') {
      source.wounds = { value: 0, threshold: source.wounds };
    }
    return source;
  }
}
```

### Règles pour les Data Models

* `prepareDerivedData()` : **calculs purs uniquement**, aucune modification de base de données.
* **Validation** : utiliser les contraintes des `fields` (min, max, choices).
* **Migrations** : toujours idempotentes, testées, documentées.
* **Performance** : éviter les calculs coûteux, privilégier la mise en cache.
* **Nommage** : correspondre aux termes Star Wars (wounds/strain vs HP/MP).

---

## 6) Applications & Feuilles (ApplicationV2)

Basé sur votre `SwerpgBaseActorSheet` existante :

```javascript
// module/applications/sheets/hero-sheet.mjs
const {api, sheets} = foundry.applications;

export default class HeroSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  
  static DEFAULT_OPTIONS = {
    classes: ["swerpg", "actor", "hero", "standard-form"],
    tag: "form",
    position: { width: 900, height: 750 },
    actions: {
      rollSkill: HeroSheet.#onRollSkill,
      itemCreate: HeroSheet.#onItemCreate,
      itemEdit: HeroSheet.#onItemEdit,
      itemDelete: HeroSheet.#onItemDelete,
    },
    form: { submitOnChange: true }
  };

  /** @override */
  static PARTS = {
    sidebar: {
      id: "sidebar",
      template: "systems/swerpg/templates/sheets/actor/sidebar.hbs"
    },
    characteristics: {
      id: "characteristics", 
      template: "systems/swerpg/templates/sheets/actor/characteristics.hbs"
    },
    skills: {
      id: "skills",
      template: "systems/swerpg/templates/sheets/actor/skills.hbs"
    },
    inventory: {
      id: "inventory",
      template: "systems/swerpg/templates/sheets/actor/inventory.hbs"
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.actor.system;
    
    return foundry.utils.mergeObject(context, {
      // Données du système Star Wars
      characteristics: system.characteristics,
      wounds: system.wounds,
      strain: system.strain,
      soak: system.soak,
      
      // Compétences organisées par caractéristique
      skillsByCharacteristic: this.#organizeSkillsByCharacteristic(),
      
      // Items catégorisés
      weapons: this.actor.itemTypes.weapon,
      armor: this.actor.itemTypes.armor,
      talents: this.actor.itemTypes.talent,
      
      // Flags d'état
      isOwner: this.actor.isOwner,
      editable: this.isEditable
    });
  }

  /** Organise les compétences par caractéristique liée */
  #organizeSkillsByCharacteristic() {
    const skills = this.actor.itemTypes.skill;
    const organized = {};
    
    for (const skill of skills) {
      const char = skill.system.characteristic;
      if (!organized[char]) organized[char] = [];
      organized[char].push(skill);
    }
    
    return organized;
  }

  /** @param {Event} event */
  static async #onRollSkill(event, target) {
    const skillId = target.dataset.skillId;
    const skill = this.actor.items.get(skillId);
    if (!skill) return;
    
    // Utilisation du système d'action existant
    const action = skill.actions?.[0]?.bind(this.actor);
    if (action) await action.use();
  }

  /** @param {Event} event */
  static async #onItemCreate(event, target) {
    const type = target.dataset.type;
    const itemData = {
      type,
      name: game.i18n.format("SWERPG.Item.New", { type: type.titleCase() }),
      system: {}
    };
    
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }
}
```

### Règles pour les Applications

* **Actions** : définir via `DEFAULT_OPTIONS.actions` et méthodes statiques privées `#onX`.
* **Contexte** : préparer toutes les données dans `_prepareContext()`, pas dans les templates.
* **Performance** : éviter les calculs répétés, utiliser la mise en cache.
* **Accessibilité** : `aria-label`, `data-tooltip`, navigation clavier.
* **Réactivité** : `form.submitOnChange` pour la persistance automatique.

---

## 7) Configuration Système

Centralisation dans `module/config/system.mjs` :

```javascript
// module/config/system.mjs
import * as SKILL from "./skills.mjs";
import * as WEAPON from "./weapon.mjs";
import * as ARMOR from "./armor.mjs";

export const SYSTEM_ID = "swerpg";

/**
 * Configuration des packs de compendium
 * @enum {string}
 */
export const COMPENDIUM_PACKS = {
  species: "swerpg.species",
  careers: "swerpg.careers", 
  specializations: "swerpg.specializations",
  talents: "swerpg.talents",
  weapons: "swerpg.weapons",
  armor: "swerpg.armor",
  gear: "swerpg.gears"
};

/**
 * Caractéristiques de base Star Wars
 * @enum {string}
 */
export const CHARACTERISTICS = {
  brawn: "SWERPG.Characteristics.Brawn",
  agility: "SWERPG.Characteristics.Agility", 
  intellect: "SWERPG.Characteristics.Intellect",
  cunning: "SWERPG.Characteristics.Cunning",
  willpower: "SWERPG.Characteristics.Willpower",
  presence: "SWERPG.Characteristics.Presence"
};

/**
 * Configuration système complète
 */
export const SYSTEM = {
  ID: SYSTEM_ID,
  COMPENDIUM_PACKS,
  CHARACTERISTICS,
  SKILL,
  WEAPON,
  ARMOR
};
```

---

## 8) Gestion du Contenu (Compendiums)

Workflow YAML → LevelDB :

```bash
# Extraction des packs binaires vers YAML
npm run extract

# Compilation YAML → packs binaires  
npm run compile

# Build complet (compile + rollup + less)
npm run build
```

Structure des fichiers source :

```text
_source/
  species/
    Human_human000000000.yml
    Twi_lek_twilek0000000.yml
  careers/
    Bounty_Hunter_bountyHunter0000.yml
  weapons/
    Blaster_Pistol_blasterPistol.yml
```

### Règles de contenu

* **IDs stables** : utiliser `generateId(name, length)` pour la cohérence.
* **Validation** : schémas stricts dans les modèles TypeDataModel.
* **Références** : utiliser les UUIDs compendium `Compendium.swerpg.{pack}.Item.{id}`.
* **Traduction** : séparer le contenu statique de l'i18n.

---

## 9) Internationalisation (i18n)

Structure des clés selon la hiérarchie fonctionnelle :

```json
{
  "SWERPG": {
    "Actor": {
      "Types": {
        "hero": "Héros",
        "character": "Personnage",
        "adversary": "Adversaire"
      }
    },
    "Characteristics": {
      "Brawn": "Vigueur",
      "Agility": "Agilité", 
      "Intellect": "Intelligence",
      "Cunning": "Ruse",
      "Willpower": "Volonté",
      "Presence": "Présence"
    },
    "Skills": {
      "Categories": {
        "general": "Générales",
        "combat": "Combat", 
        "social": "Sociales"
      }
    }
  }
}
```

### Conventions i18n

* **Clés** : `SWERPG.Domain.Subdomain.Key` (hiérarchie claire).
* **Pluriels** : utiliser `game.i18n.format()` avec des variables.
* **Templates** : helper `{{t "SWERPG.Key" data=context}}`.
* **Cohérence** : révision systématique des chaînes lors des PR.

---

## 10) Styles & Thématique Star Wars

Variables CSS dans `styles/variables.less` :

```less
// Palette thématique Star Wars
:root {
  // Couleurs principales
  --swerpg-blue-holo: #00d4ff;        // Hologramme bleu
  --swerpg-red-imperial: #cc0000;     // Rouge Impérial
  --swerpg-orange-rebel: #ff6600;     // Orange Rebelle
  --swerpg-yellow-jedi: #ffcc00;      // Jaune Jedi
  
  // Tons neutres
  --swerpg-gray-dark: #1a1a1a;        // Fond sombre
  --swerpg-gray-medium: #404040;      // Éléments UI
  --swerpg-gray-light: #cccccc;       // Texte secondaire
  --swerpg-white: #ffffff;            // Texte principal
  
  // Métriques
  --swerpg-border-radius: 4px;
  --swerpg-spacing-sm: 8px;
  --swerpg-spacing-md: 16px;
  --swerpg-spacing-lg: 32px;
}

// Classes utilitaires
.swerpg {
  &.sheet {
    background: linear-gradient(135deg, var(--swerpg-gray-dark) 0%, #000 100%);
    color: var(--swerpg-white);
    border: 1px solid var(--swerpg-blue-holo);
  }
  
  .characteristic-block {
    background: rgba(0, 212, 255, 0.1);
    border-left: 3px solid var(--swerpg-blue-holo);
    padding: var(--swerpg-spacing-md);
  }
  
  .imperial-red { color: var(--swerpg-red-imperial); }
  .rebel-orange { color: var(--swerpg-orange-rebel); }
  .jedi-yellow { color: var(--swerpg-yellow-jedi); }
}
```

### Guidelines UX

* **Animations** : < 200ms, respecter `prefers-reduced-motion`.
* **Contraste** : minimum WCAG AA (4.5:1).
* **Focus** : indicateurs visuels clairs pour la navigation clavier.
* **Responsive** : adaptation mobile via flexbox/grid.

---

## 11) Actions & Système de Dés

Encapsulation des mécaniques de jeu :

```javascript
// module/dice/swerpg-roll.mjs
export class SwerpgRoll extends Roll {
  
  constructor(formula, data = {}, options = {}) {
    super(formula, data, options);
    this.swerpgData = {
      difficulty: options.difficulty || "average",
      characteristic: options.characteristic,
      skill: options.skill,
      upgrades: options.upgrades || 0
    };
  }
  
  /** Construction de la pool de dés Star Wars */
  static buildDicePool(characteristic, skill, difficulty = "average", upgrades = 0) {
    const pool = {
      ability: Math.max(characteristic, skill),
      proficiency: Math.min(characteristic, skill),
      difficulty: DIFFICULTY_DICE[difficulty] || 2,
      challenge: upgrades
    };
    
    // Upgrade logic: ability → proficiency, difficulty → challenge
    pool.proficiency += Math.min(pool.ability, upgrades);
    pool.ability = Math.max(0, pool.ability - upgrades);
    
    return pool;
  }
  
  /** Évaluation avec symbolisme Star Wars */
  async evaluate(options = {}) {
    await super.evaluate(options);
    
    this.swerpgResult = {
      success: this.countSymbol("success"),
      advantage: this.countSymbol("advantage"), 
      triumph: this.countSymbol("triumph"),
      failure: this.countSymbol("failure"),
      threat: this.countSymbol("threat"),
      despair: this.countSymbol("despair")
    };
    
    return this;
  }
}
```

---

## 12) Tests avec Vitest

Structure des tests par domaine fonctionnel :

```javascript
// tests/lib/characteristics/characteristic-calculator.test.mjs
import { describe, it, expect } from 'vitest';
import CharacteristicCalculator from '@/module/lib/characteristics/characteristic-calculator.mjs';

describe('CharacteristicCalculator', () => {
  
  it('calcule le coût d\'amélioration correct', () => {
    // Coût pour passer de 2 à 3 = 30 XP
    const cost = CharacteristicCalculator.getUpgradeCost(2, 3);
    expect(cost).toBe(30);
  });
  
  it('applique les bonus raciaux', () => {
    const base = { brawn: 2, agility: 2 };
    const racial = { brawn: 1, agility: 0 };
    
    const result = CharacteristicCalculator.applyRacialBonuses(base, racial);
    expect(result.brawn).toBe(3);
    expect(result.agility).toBe(2);
  });
  
  it('respecte les limites maximales', () => {
    const result = CharacteristicCalculator.applyUpgrade(5, 2); // Tentative 5→7
    expect(result).toBe(6); // Plafonné à 6
  });
});
```

### Stratégie de tests

* **Units** : logique pure (calculateurs, utilitaires, modèles).
* **Integration** : interaction entre modules (actions, rolls).
* **Contract** : validation des interfaces publiques.
* **Couverture** : ≥ 80% sur la logique critique.

---

## 13) Workflow de Développement

### Scripts npm essentiels

```json
{
  "scripts": {
    "build": "pnpm run compile && pnpm run rollup && pnpm run less",
    "dev": "pnpm run rollup:watch & pnpm run less:watch",
    "compile": "node build.mjs compile", 
    "extract": "node build.mjs extract",
    "test": "vitest",
    "test:coverage": "pnpm vitest run --coverage",
    "lint": "eslint module/ --ext .mjs",
    "format": "prettier --write module/"
  }
}
```

### Checklist PR

#### Développement

* [ ] Code conforme aux conventions de nommage
* [ ] JSDoc complet sur les APIs publiques
* [ ] Tests unitaires pour la nouvelle logique
* [ ] Migration de données si nécessaire

#### Contenu

* [ ] Compendiums compilés (`npm run compile`)
* [ ] Traductions FR/EN complètes
* [ ] IDs stables pour les nouveaux éléments

#### UX/UI

* [ ] Thème Star Wars respecté
* [ ] Accessibilité (contraste, navigation)
* [ ] Responsive sur mobile

#### Performance

* [ ] Hot reload fonctionnel
* [ ] Aucun calcul coûteux dans prepareDerivedData
* [ ] Mise en cache appropriée

---

## 14) Bonnes Pratiques par Domaine

### Data Models
```javascript
// ✅ Bon
static defineSchema() {
  return {
    characteristic: new fields.StringField({ 
      choices: Object.keys(SYSTEM.CHARACTERISTICS),
      initial: "brawn" 
    })
  };
}

// ❌ Éviter
static defineSchema() {
  return {
    characteristic: new fields.StringField({ initial: "brawn" }) // Pas de validation
  };
}
```

### Applications
```javascript
// ✅ Bon
static async #onSkillRoll(event, target) {
  const skillId = target.dataset.skillId;
  const skill = this.actor.items.get(skillId);
  if (!skill) return ui.notifications.warn("Compétence introuvable");
  
  await skill.roll();
}

// ❌ Éviter  
static #onSkillRoll(event, target) {
  // Pas de validation, pas d'async pour les rolls
  this.actor.items.get(target.dataset.skillId).roll();
}
```

### Configuration
```javascript
// ✅ Bon
export const SKILL_TYPES = {
  general: "SWERPG.Skills.Types.General",
  combat: "SWERPG.Skills.Types.Combat", 
  knowledge: "SWERPG.Skills.Types.Knowledge"
};

// ❌ Éviter
export const SKILL_TYPES = {
  general: "Général", // Chaîne harcodée
  combat: "Combat",
  knowledge: "Connaissance"
};
```

---

## 15) Ressources & Références

### Documentation Foundry VTT v13

* [ApplicationV2 API](https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html)
* [TypeDataModel](https://foundryvtt.com/api/v13/classes/foundry.abstract.TypeDataModel.html)
* [HandlebarsApplicationMixin](https://foundryvtt.com/api/v13/modules/foundry.applications.api.html#HandlebarsApplicationMixin)

### Outils de développement

* [Vitest](https://vitest.dev/) - Framework de test moderne
* [LESS](https://lesscss.org/) - Préprocesseur CSS
* [pnpm](https://pnpm.io/) - Gestionnaire de paquets rapide

### Star Wars RPG

* [Edge of the Empire](https://www.fantasyflightgames.com/en/products/star-wars-edge-of-the-empire/) - Système de base
* [Dice Mechanics](https://images-cdn.fantasyflightgames.com/ffg_content/star-wars/edge-of-the-empire/edge-news/fad-system-overview.pdf) - Mécaniques des dés narratifs

---

## 16) Migration et Évolution

Ce guide évolue avec le projet. Pour proposer des améliorations :

1. **Issue** : ouvir une discussion sur les changements proposés
2. **Branch** : `docs/coding-style-update-YYYY-MM`  
3. **PR** : inclure les exemples et la justification
4. **Review** : validation par l'équipe de développement

**Version actuelle** : v1.0 (novembre 2025)  
**Prochaine révision** : lors de la migration vers Foundry v14