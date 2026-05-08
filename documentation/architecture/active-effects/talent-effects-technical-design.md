# Technical Design — Modèle canonique des effets de Talents

## Statut

Draft

## ADR liée

- ADR-0010 — Architecture des effets mécaniques des Talents

## Objectif

Ce document décrit le modèle technique cible pour représenter les effets mécaniques des Talents dans SWERPG.

Il sert de référence pour :

- les imports OggDude ;
- les futurs builders de Talents ;
- l’UI de fiche de personnage ;
- l’UI de fiche de Talent ;
- le moteur de résolution des jets ;
- les futures migrations ;
- l’alignement avec les armes, armures, équipements et pouvoirs de Force.

## Choix d’implémentation

Le système SWERPG est développé en JavaScript vanilla.

Le modèle d’effets n’est donc pas implémenté avec TypeScript, mais avec :

- des objets JavaScript simples ;
- des constantes JavaScript pour les valeurs autorisées ;
- des commentaires JSDoc pour documenter les contrats de données ;
- des validateurs runtime pour sécuriser les données importées, migrées ou éditées dans l’UI ;
- des tests Vitest pour garantir la stabilité du modèle.

Aucun build TypeScript n’est requis pour implémenter ce modèle.

Les noms comme `EffectDefinition`, `ActionDefinition`, `EffectScope` ou `EffectCost` désignent des contrats métier documentés en JSDoc, pas des interfaces TypeScript.

## Principes

### Principe 1 — Séparer texte, effets et actions

Un Talent ne doit pas mélanger :

- son texte lisible ;
- ses effets mécaniques ;
- ses activations cliquables ;
- ses comportements avancés.

Structure cible :

```js
{
  type: "talent",
    system: {
    description: {},
    activation: "passive",
      ranked: false,
      effects: [],
      actions: []
  },
  flags: {
    swerpg: {}
  }
}
```

### Principe 2 — Ne pas faire de `actorHooks` le modèle standard

`actorHooks` est une extension experte.

Les effets standards doivent être représentés dans `system.effects`.

`actorHooks` ne doit pas devenir le canal principal d’encodage des Talents.

### Principe 3 — Préparer l’automatisation progressive

Tous les effets n’ont pas vocation à être automatisés immédiatement.

Chaque effet ou action doit pouvoir indiquer son niveau d’automatisation :

```js
/**
 * Niveaux d’automatisation supportés pour un effet ou une action.
 *
 * @readonly
 * @enum {string}
 */
export const AUTOMATION_LEVELS = Object.freeze({
  NONE: "none",
  MANUAL: "manual",
  CHAT_CARD: "chat-card",
  SUGGESTED: "suggested",
  ASSISTED: "assisted",
  AUTO: "auto"
});
```

Définition fonctionnelle :

| Niveau      | Usage                                                            |
| ----------- | ---------------------------------------------------------------- |
| `none`      | Non exploité par le système                                      |
| `manual`    | Affiché comme information, application manuelle                  |
| `chat-card` | Produit une carte de chat, sans application automatique complète |
| `suggested` | Proposé au joueur ou au MJ                                       |
| `assisted`  | Applique une partie de la mécanique après confirmation           |
| `auto`      | Appliqué automatiquement quand le contexte est certain           |

### Principe 4 — Rendre les mappings importables et auditables

Les imports doivent conserver :

* la donnée brute ;
* la donnée normalisée ;
* le statut de mapping ;
* le niveau de confiance ;
* les avertissements.

OggDude est une source d’entrée, pas le modèle interne.

### Principe 5 — Positionner `system.effects` face aux ActiveEffects Foundry

`system.effects` est le modèle métier canonique des effets mécaniques SWERPG.

Il ne remplace pas les ActiveEffects Foundry. Il les précède.

La séparation retenue est la suivante :

```txt
system.effects
= ce que l’effet veut dire dans les règles Star Wars Edge

ActiveEffect Foundry
= comment Foundry applique, persiste, expire ou affiche certains effets
```

Le flux cible est donc :

```txt
Talent / Item
  system.effects[]      ← source de vérité métier SWERPG

Effect Engine SWERPG
  résout le contexte, le timing, les coûts, les scopes

Foundry Bridge
  produit éventuellement un ActiveEffect Foundry V14
```

Règle structurante :

```txt
system.effects est la source de vérité.
ActiveEffect est une projection technique optionnelle.
```

Les ActiveEffects Foundry doivent être utilisés lorsque leur rôle natif est utile : application persistante, expiration, affichage dans l’interface Foundry, visibilité sur l’Actor ou le Token, compatibilité avec les mécanismes standards de la plateforme.

Ils ne doivent pas devenir le langage métier principal du système, car de nombreux Talents Star Wars Edge sont contextuels, liés à un jet précis, déclenchés après réussite, dépendants d’un coût variable, d’une dépense d’avantages ou d’une confirmation joueur / MJ.

Conséquence : tout ActiveEffect généré depuis un effet SWERPG doit être traçable par `flags.swerpg.generatedFrom`.

## Structure globale d’un Talent

```js
const talent = {
  name: "Filature",
  type: "talent",
  system: {
    description: {
      public: "",
      gm: "",
      source: ""
    },
    activation: "passive",
    ranked: true,
    effects: [],
    actions: []
  },
  flags: {
    swerpg: {
      import: {},
      mapping: {}
    }
  }
};
```

## Constantes du modèle

### `TALENT_ACTIVATIONS`

```js
/**
 * Modes généraux d’activation d’un Talent.
 *
 * @readonly
 * @enum {string}
 */
export const TALENT_ACTIVATIONS = Object.freeze({
  PASSIVE: "passive",
  ACTIVE: "active",
  REACTION: "reaction",
  MANUAL: "manual",
  MIXED: "mixed"
});
```

| Valeur     | Usage                                             |
| ---------- | ------------------------------------------------- |
| `passive`  | Effet permanent ou automatiquement pris en compte |
| `active`   | Talent déclenché volontairement                   |
| `reaction` | Talent déclenché en réponse à un événement        |
| `manual`   | Talent non automatisé                             |
| `mixed`    | Talent combinant plusieurs modes                  |

### `EFFECT_TYPES`

```js
/**
 * Types d’effets mécaniques supportés en V1.
 *
 * @readonly
 * @enum {string}
 */
export const EFFECT_TYPES = Object.freeze({
  MODIFY_DICE_POOL: "modifyDicePool",
  MODIFY_DERIVED_STAT: "modifyDerivedStat",
  MODIFY_DAMAGE: "modifyDamage",
  MODIFY_CRITICAL: "modifyCritical",
  GRANT_CAREER_SKILL: "grantCareerSkill",
  REROLL_CHECK: "rerollCheck",
  MODIFY_RECOVERY: "modifyRecovery",
  MODIFY_ITEM: "modifyItem",
  APPLY_CONDITION: "applyCondition",
  CUSTOM: "custom"
});
```

### `EFFECT_MODES`

```js
/**
 * Modes d’application d’un effet.
 *
 * @readonly
 * @enum {string}
 */
export const EFFECT_MODES = Object.freeze({
  PASSIVE: "passive",
  ACTIVATED: "activated",
  REACTION: "reaction",
  MANUAL: "manual"
});
```

### `EFFECT_TIMINGS`

```js
/**
 * Moments où un effet peut être évalué ou appliqué.
 *
 * @readonly
 * @enum {string}
 */
export const EFFECT_TIMINGS = Object.freeze({
  PREPARE_DATA: "prepareData",
  ON_ACQUIRE: "onAcquire",
  BEFORE_ROLL: "beforeRoll",
  AFTER_ROLL: "afterRoll",
  AFTER_SUCCESS: "afterSuccess",
  AFTER_FAILURE: "afterFailure",
  BEFORE_DAMAGE: "beforeDamage",
  AFTER_DAMAGE: "afterDamage",
  BEFORE_CRITICAL_ROLL: "beforeCriticalRoll",
  AFTER_CRITICAL_ROLL: "afterCriticalRoll",
  WHEN_TARGETED: "whenTargeted",
  WHEN_TARGETED_BY_COMBAT_CHECK: "whenTargetedByCombatCheck",
  END_OF_ENCOUNTER: "endOfEncounter",
  START_OF_TURN: "startOfTurn",
  END_OF_TURN: "endOfTurn",
  MANUAL: "manual"
});
```

### `ACTION_TYPES`

```js
/**
 * Types d’actions supportés.
 *
 * @readonly
 * @enum {string}
 */
export const ACTION_TYPES = Object.freeze({
  TALENT: "talent",
  ATTACK: "attack",
  FORCE_POWER: "forcePower",
  UTILITY: "utility",
  RECOVERY: "recovery",
  CUSTOM: "custom"
});
```

### `ACTION_KINDS`

```js
/**
 * Types d’activation d’une action.
 *
 * @readonly
 * @enum {string}
 */
export const ACTION_KINDS = Object.freeze({
  ACTION: "action",
  MANEUVER: "maneuver",
  INCIDENTAL: "incidental",
  REACTION: "reaction",
  PASSIVE: "passive",
  FREE: "free"
});
```

### `MAPPING_STATUSES`

```js
/**
 * Statuts de mapping d’un import vers le modèle canonique.
 *
 * @readonly
 * @enum {string}
 */
export const MAPPING_STATUSES = Object.freeze({
  MAPPED: "mapped",
  PARTIALLY_MAPPED: "partiallyMapped",
  UNMAPPED: "unmapped",
  REQUIRES_REVIEW: "requiresReview",
  UNSUPPORTED: "unsupported"
});
```

### `MAPPING_CONFIDENCE`

```js
/**
 * Niveaux de confiance d’un mapping.
 *
 * @readonly
 * @enum {string}
 */
export const MAPPING_CONFIDENCE = Object.freeze({
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low"
});
```

### `EFFECT_APPLICATION_STRATEGIES`

```js
/**
 * Stratégies d’application d’un effet SWERPG.
 *
 * `system.effects` reste la source de vérité métier.
 * Cette stratégie indique seulement comment l’effet est appliqué ou projeté techniquement.
 *
 * @readonly
 * @enum {string}
 */
export const EFFECT_APPLICATION_STRATEGIES = Object.freeze({
  COMPUTED: "computed",
  ACTIVE_EFFECT: "activeEffect",
  CHAT_ONLY: "chatOnly",
  MANUAL: "manual"
});
```

| Valeur         | Usage                                                                 |
| -------------- | --------------------------------------------------------------------- |
| `computed`     | Effet calculé directement par le moteur SWERPG, sans ActiveEffect     |
| `activeEffect` | Effet projetable vers un ActiveEffect Foundry V14                     |
| `chatOnly`     | Effet présenté ou résolu via carte de chat, sans application directe  |
| `manual`       | Effet documenté, mais appliqué manuellement par le joueur ou le MJ    |

### `EFFECT_TARGET_DOCUMENTS`

```js
/**
 * Documents Foundry ou contextes techniques ciblés par l’application d’un effet.
 *
 * @readonly
 * @enum {string}
 */
export const EFFECT_TARGET_DOCUMENTS = Object.freeze({
  ACTOR: "actor",
  ITEM: "item",
  TOKEN: "token",
  ROLL: "roll",
  CHAT: "chat",
  NONE: "none"
});
```

### `EFFECT_DIRECTIONS`

```js
/**
 * Direction mécanique d’un effet par rapport à sa source.
 *
 * @readonly
 * @enum {string}
 */
export const EFFECT_DIRECTIONS = Object.freeze({
  SELF: "self",
  OUTGOING: "outgoing",
  INCOMING: "incoming",
  TARGET: "target",
  ALLY: "ally",
  AREA: "area"
});
```

## Contrats de données JSDoc

### `TalentDescription`

```js
/**
 * Description lisible d’un Talent.
 *
 * @typedef {Object} TalentDescription
 * @property {string} public - Texte visible par les joueurs et le MJ.
 * @property {string=} gm - Notes réservées au MJ.
 * @property {string=} source - Référence courte de source.
 */
```

Règles :

* `public` doit être conservé même si l’effet est structuré.
* `gm` peut contenir des notes MJ.
* `source` peut contenir une référence courte.

### `EffectSource`

```js
/**
 * Source d’un effet mécanique.
 *
 * @typedef {Object} EffectSource
 * @property {string=} itemId
 * @property {string=} itemUuid
 * @property {"talent"|"weapon"|"armor"|"gear"|"forcePower"|"condition"|"other"} itemType
 * @property {"manual"|"oggdude"|"builder"|"migration"|"system"=} origin
 */
```

### `EffectScope`

```js
/**
 * Scope d’application d’un effet.
 *
 * @typedef {Object} EffectScope
 * @property {"self"|"ally"|"enemy"|"target"|"vehicle"|"any"=} actor
 * @property {string[]=} rollTypes
 * @property {string[]=} skills
 * @property {string[]=} characteristics
 * @property {string[]=} rangeBands
 * @property {string[]=} weaponTypes
 * @property {string[]=} itemTypes
 * @property {string[]=} tags
 */
```

### `RankScaling`

```js
/**
 * Scaling d’un effet par rang, compétence, caractéristique, Valeur de Force ou valeur fixe.
 *
 * @typedef {Object} RankScaling
 * @property {boolean} enabled
 * @property {"talent"|"skill"|"characteristic"|"forceRating"|"fixed"} rankSource
 * @property {string=} skill
 * @property {string=} characteristic
 * @property {number=} multiplier
 * @property {number=} minimum
 * @property {number|string=} maximum
 */
```

### `VariableCost`

```js
/**
 * Coût variable, généralement limité par le rang du Talent ou une autre valeur.
 *
 * @typedef {Object} VariableCost
 * @property {"variable"} mode
 * @property {number} min
 * @property {number|"rank"|"characteristic"|"skillRank"} max
 */
```

### `EffectCost`

```js
/**
 * Coût mécanique d’un effet ou d’une action.
 *
 * @typedef {Object} EffectCost
 * @property {number|VariableCost=} strain
 * @property {number|VariableCost=} wounds
 * @property {number=} destiny
 * @property {number=} action
 * @property {number=} maneuver
 * @property {number=} incidental
 * @property {number=} advantage
 * @property {number=} triumph
 * @property {number=} threat
 * @property {number=} despair
 */
```

### `EffectCondition`

```js
/**
 * Condition d’application d’un effet.
 *
 * @typedef {Object} EffectCondition
 * @property {"skillIs"|"rollTypeIs"|"targetHasTag"|"actorHasCondition"|"weaponHasQuality"|"rangeIs"|"encounterPhaseIs"|"custom"} type
 * @property {"eq"|"neq"|"in"|"notIn"|"gte"|"lte"=} operator
 * @property {*=} value
 */
```

### `EffectDuration`

```js
/**
 * Durée d’un effet.
 *
 * @typedef {Object} EffectDuration
 * @property {"instant"|"nextRoll"|"currentRoll"|"untilEndOfTurn"|"untilStartOfNextTurn"|"untilEndOfEncounter"|"rounds"|"session"|"permanent"} type
 * @property {number|string=} rounds
 */
```

### `EffectApplication`

```js
/**
 * Stratégie d’application technique d’un effet SWERPG.
 *
 * Cette structure ne remplace pas le modèle métier.
 * Elle indique si l’effet reste calculé par le moteur SWERPG, s’il est seulement affiché,
 * ou s’il peut être projeté vers un ActiveEffect Foundry.
 *
 * @typedef {Object} EffectApplication
 * @property {"computed"|"activeEffect"|"chatOnly"|"manual"} strategy
 * @property {"actor"|"item"|"token"|"roll"|"chat"|"none"=} targetDocument
 * @property {boolean=} persist
 * @property {boolean=} generated
 */
```

Règles :

* `computed` est le choix par défaut pour les effets de seuil, de pool de dés, de dégâts ou de critiques résolus par le moteur SWERPG.
* `activeEffect` est réservé aux effets qui bénéficient réellement de la persistance, de l’expiration ou de l’affichage Foundry.
* `chatOnly` convient aux Talents qui doivent produire une carte, demander un choix ou guider une résolution sans appliquer automatiquement un changement.
* `manual` convient aux effets narratifs ou non encore automatisés.

### `GeneratedActiveEffectRef`

```js
/**
 * Traçabilité d’un ActiveEffect Foundry généré depuis un effet SWERPG.
 *
 * Ce bloc doit être stocké dans `flags.swerpg.generatedFrom` sur l’ActiveEffect généré.
 *
 * @typedef {Object} GeneratedActiveEffectRef
 * @property {string} itemUuid - UUID de l’Item source.
 * @property {string} effectId - Identifiant de l’effet dans `system.effects`.
 * @property {number} schemaVersion - Version du schéma SWERPG utilisée.
 */
```

Exemple de flag attendu sur un ActiveEffect généré :

```js
{
  flags: {
    swerpg: {
      generatedFrom: {
        itemUuid: "Actor.abc.Item.def",
        effectId: "example-effect-id",
        schemaVersion: 1
      }
    }
  }
}
```

### `EffectConstraints`

```js
/**
 * Contraintes supplémentaires d’un effet.
 *
 * @typedef {Object} EffectConstraints
 * @property {"simple"|"easy"|"average"|"hard"|"daunting"|"formidable"=} minimumDifficulty
 * @property {number=} maximumUses
 * @property {"round"|"encounter"|"session"|"adventure"=} oncePer
 * @property {boolean=} requiresReview
 */
```

### `EffectUiMetadata`

```js
/**
 * Métadonnées d’affichage d’un effet.
 *
 * @typedef {Object} EffectUiMetadata
 * @property {string} label
 * @property {string=} summary
 * @property {"none"|"manual"|"chat-card"|"suggested"|"assisted"|"auto"} automationLevel
 * @property {boolean=} visibleToPlayer
 * @property {boolean=} visibleToGM
 * @property {string=} icon
 */
```

### `EffectDefinition`

```js
/**
 * Définition canonique d’un effet mécanique.
 *
 * @typedef {Object} EffectDefinition
 * @property {string} id
 * @property {string} type
 * @property {boolean} enabled
 * @property {EffectSource} source
 * @property {"passive"|"activated"|"reaction"|"manual"} mode
 * @property {string} timing
 * @property {EffectScope} scope
 * @property {"self"|"outgoing"|"incoming"|"target"|"ally"|"area"=} direction
 * @property {EffectApplication=} application
 * @property {RankScaling=} rankScaling
 * @property {EffectCost=} cost
 * @property {Object} changes
 * @property {EffectCondition[]=} conditions
 * @property {EffectDuration=} duration
 * @property {EffectConstraints=} constraints
 * @property {EffectUiMetadata=} ui
 */
```

## Formes de `changes`

`changes` dépend du `type` de l’effet.

### `modifyDicePool`

```js
/**
 * Modifications d’un pool de dés.
 *
 * @typedef {Object} DicePoolChanges
 * @property {number|string=} boost
 * @property {number|string=} setback
 * @property {number|string=} ability
 * @property {number|string=} difficulty
 * @property {number|string=} proficiency
 * @property {number|string=} challenge
 * @property {number|string=} upgradeAbility
 * @property {number|string=} upgradeDifficulty
 * @property {number|string=} downgradeAbility
 * @property {number|string=} downgradeDifficulty
 * @property {number|string=} force
 */
```

### `modifyDerivedStat`

```js
/**
 * Modifications de statistiques dérivées.
 *
 * @typedef {Object} DerivedStatChanges
 * @property {number|string=} woundThreshold
 * @property {number|string=} strainThreshold
 * @property {number|string=} soak
 * @property {number|string=} meleeDefense
 * @property {number|string=} rangedDefense
 * @property {number|string=} forceRating
 */
```

### `modifyDamage`

```js
/**
 * Modifications liées aux dégâts.
 *
 * @typedef {Object} DamageChanges
 * @property {number|string=} damage
 * @property {number|string=} pierce
 * @property {number|string=} breach
 * @property {number|string=} vicious
 */
```

### `modifyCritical`

```js
/**
 * Modifications liées aux blessures critiques.
 *
 * @typedef {Object} CriticalChanges
 * @property {number|string=} criticalRollModifier
 * @property {number|string=} criticalSeverityModifier
 */
```

### `grantCareerSkill`

```js
/**
 * Attribution de compétences de carrière.
 *
 * @typedef {Object} GrantCareerSkillChanges
 * @property {string[]=} skills
 * @property {{ count: number, from: string[]|string }=} selection
 */
```

### `rerollCheck`

```js
/**
 * Autorisation de relance.
 *
 * @typedef {Object} RerollChanges
 * @property {boolean} allowReroll
 * @property {"new"|"best"|"playerChoice"=} keep
 */
```

## Actions

### `ActionActivation`

```js
/**
 * Déclencheur d’une action.
 *
 * @typedef {Object} ActionActivation
 * @property {"action"|"maneuver"|"incidental"|"reaction"|"passive"|"free"} kind
 * @property {string=} timing
 */
```

### `ActionTarget`

```js
/**
 * Cible d’une action.
 *
 * @typedef {Object} ActionTarget
 * @property {"self"|"ally"|"enemy"|"item"|"vehicle"|"area"|"none"} type
 * @property {string=} range
 * @property {number|string=} count
 */
```

### `ActionFrequency`

```js
/**
 * Fréquence d’utilisation d’une action.
 *
 * @typedef {Object} ActionFrequency
 * @property {number} limit
 * @property {"round"|"encounter"|"session"|"adventure"} period
 */
```

### `ActionCheck`

```js
/**
 * Test associé à une action.
 *
 * @typedef {Object} ActionCheck
 * @property {string=} skill
 * @property {string=} characteristic
 * @property {"simple"|"easy"|"average"|"hard"|"daunting"|"formidable"=} difficulty
 * @property {boolean=} opposed
 */
```

### `ActionChatOptions`

```js
/**
 * Options de carte de chat pour une action.
 *
 * @typedef {Object} ActionChatOptions
 * @property {boolean} postOnUse
 * @property {string=} template
 * @property {boolean=} includeCost
 * @property {boolean=} includeEffects
 */
```

### `ActionDefinition`

```js
/**
 * Définition canonique d’une action cliquable ou assistée.
 *
 * @typedef {Object} ActionDefinition
 * @property {string} id
 * @property {string} label
 * @property {string} type
 * @property {ActionActivation} activation
 * @property {EffectCost=} cost
 * @property {ActionTarget=} target
 * @property {string[]=} effectRefs
 * @property {ActionFrequency=} frequency
 * @property {ActionCheck=} check
 * @property {ActionChatOptions=} chat
 * @property {"none"|"manual"|"chat-card"|"suggested"|"assisted"|"auto"} automationLevel
 */
```

## Exemples de modélisation

### Robustesse

```js
{
  name: "Robustesse",
  type: "talent",
  system: {
    description: {
      public: "Augmentez votre seuil de stress de +1."
    },
    activation: "passive",
    ranked: true,
    effects: [
      {
        id: "robustesse-strain-threshold",
        type: "modifyDerivedStat",
        enabled: true,
        source: {
          itemType: "talent",
          origin: "builder"
        },
        mode: "passive",
        timing: "prepareData",
        scope: {
          actor: "self"
        },
        direction: "self",
        application: {
          strategy: "computed",
          targetDocument: "actor",
          persist: false
        },
        rankScaling: {
          enabled: true,
          rankSource: "talent",
          multiplier: 1
        },
        changes: {
          strainThreshold: "+rank"
        },
        ui: {
          label: "Robustesse",
          summary: "Augmente le seuil de stress de 1 par rang.",
          automationLevel: "auto"
        }
      }
    ],
    actions: []
  }
}
```

### Endurci

```js
{
  name: "Endurci",
  type: "talent",
  system: {
    description: {
      public: "Augmentez votre seuil de blessure de +2."
    },
    activation: "passive",
    ranked: true,
    effects: [
      {
        id: "endurci-wound-threshold",
        type: "modifyDerivedStat",
        enabled: true,
        source: {
          itemType: "talent",
          origin: "builder"
        },
        mode: "passive",
        timing: "prepareData",
        scope: {
          actor: "self"
        },
        direction: "self",
        application: {
          strategy: "computed",
          targetDocument: "actor",
          persist: false
        },
        rankScaling: {
          enabled: true,
          rankSource: "talent",
          multiplier: 2
        },
        changes: {
          woundThreshold: "+rank * 2"
        },
        ui: {
          label: "Endurci",
          summary: "Augmente le seuil de blessure de 2 par rang.",
          automationLevel: "auto"
        }
      }
    ],
    actions: []
  }
}
```

### Filature

```js
{
  name: "Filature",
  type: "talent",
  system: {
    description: {
      public: "Ajoutez 1 dé d’avantage par rang de Filature à tous vos tests de Coordination et de Discrétion."
    },
    activation: "passive",
    ranked: true,
    effects: [
      {
        id: "filature-coordination-stealth-boost",
        type: "modifyDicePool",
        enabled: true,
        source: {
          itemType: "talent",
          origin: "builder"
        },
        mode: "passive",
        timing: "beforeRoll",
        scope: {
          actor: "self",
          rollTypes: ["skill"],
          skills: ["coordination", "stealth"]
        },
        direction: "self",
        application: {
          strategy: "computed",
          targetDocument: "roll",
          persist: false
        },
        rankScaling: {
          enabled: true,
          rankSource: "talent",
          multiplier: 1
        },
        changes: {
          boost: "+rank"
        },
        ui: {
          label: "Filature",
          summary: "Ajoute 1 dé d’avantage par rang aux tests de Coordination et Discrétion.",
          automationLevel: "suggested"
        }
      }
    ],
    actions: []
  }
}
```

### Coup mortel

```js
{
  name: "Coup mortel",
  type: "talent",
  system: {
    description: {
      public: "Ajoutez +10 par rang de Coup mortel aux résultats des blessures critiques infligées à vos adversaires."
    },
    activation: "passive",
    ranked: true,
    effects: [
      {
        id: "coup-mortel-critical-plus-ten",
        type: "modifyCritical",
        enabled: true,
        source: {
          itemType: "talent",
          origin: "builder"
        },
        mode: "passive",
        timing: "beforeCriticalRoll",
        scope: {
          actor: "self",
          rollTypes: ["critical"],
          tags: ["inflictedBySelf"]
        },
        direction: "outgoing",
        application: {
          strategy: "computed",
          targetDocument: "roll",
          persist: false
        },
        rankScaling: {
          enabled: true,
          rankSource: "talent",
          multiplier: 10
        },
        changes: {
          criticalRollModifier: "+rank * 10"
        },
        ui: {
          label: "Coup mortel",
          summary: "Ajoute +10 par rang aux blessures critiques infligées.",
          automationLevel: "assisted"
        }
      }
    ],
    actions: []
  }
}
```

### Esquive

```js
{
  name: "Esquive",
  type: "talent",
  system: {
    description: {
      public: "Quand vous êtes la cible d’un test de combat, vous pouvez esquiver au prix d’une broutille, subir du stress jusqu’à votre rang d’Esquive, puis améliorer autant de dés de difficulté du test."
    },
    activation: "reaction",
    ranked: true,
    effects: [
      {
        id: "esquive-upgrade-incoming-combat-check",
        type: "modifyDicePool",
        enabled: true,
        source: {
          itemType: "talent",
          origin: "builder"
        },
        mode: "reaction",
        timing: "whenTargetedByCombatCheck",
        scope: {
          actor: "self",
          rollTypes: ["combat"]
        },
        direction: "incoming",
        application: {
          strategy: "computed",
          targetDocument: "roll",
          persist: false
        },
        cost: {
          strain: {
            mode: "variable",
            min: 1,
            max: "rank"
          },
          incidental: 1
        },
        changes: {
          upgradeDifficulty: "+strainSpent"
        },
        duration: {
          type: "currentRoll"
        },
        ui: {
          label: "Esquive",
          summary: "Subissez du stress pour améliorer la difficulté d’un test de combat qui vous cible.",
          automationLevel: "assisted"
        }
      }
    ],
    actions: [
      {
        id: "activate-esquive",
        label: "Utiliser Esquive",
        type: "talent",
        activation: {
          kind: "incidental",
          timing: "whenTargetedByCombatCheck"
        },
        cost: {
          strain: {
            mode: "variable",
            min: 1,
            max: "rank"
          }
        },
        target: {
          type: "self"
        },
        effectRefs: ["esquive-upgrade-incoming-combat-check"],
        chat: {
          postOnUse: true,
          includeCost: true,
          includeEffects: true
        },
        automationLevel: "assisted"
      }
    ]
  }
}
```

### Concentration intense

```js
{
  name: "Concentration intense",
  type: "talent",
  system: {
    description: {
      public: "Exécutez une manœuvre de Concentration intense ; vous subissez 1 point de stress et améliorez 1 dé de votre prochain test de compétence."
    },
    activation: "active",
    ranked: false,
    effects: [
      {
        id: "concentration-intense-upgrade-next-check",
        type: "modifyDicePool",
        enabled: true,
        source: {
          itemType: "talent",
          origin: "builder"
        },
        mode: "activated",
        timing: "beforeRoll",
        scope: {
          actor: "self",
          rollTypes: ["skill"]
        },
        direction: "self",
        application: {
          strategy: "computed",
          targetDocument: "roll",
          persist: false
        },
        cost: {
          strain: 1,
          maneuver: 1
        },
        changes: {
          upgradeAbility: 1
        },
        duration: {
          type: "nextRoll"
        },
        ui: {
          label: "Concentration intense",
          summary: "Subissez 1 stress et améliorez 1 dé du prochain test de compétence.",
          automationLevel: "assisted"
        }
      }
    ],
    actions: [
      {
        id: "activate-concentration-intense",
        label: "Concentration intense",
        type: "talent",
        activation: {
          kind: "maneuver",
          timing: "beforeRoll"
        },
        cost: {
          strain: 1,
          maneuver: 1
        },
        target: {
          type: "self"
        },
        effectRefs: ["concentration-intense-upgrade-next-check"],
        chat: {
          postOnUse: true,
          includeCost: true,
          includeEffects: true
        },
        automationLevel: "assisted"
      }
    ]
  }
}
```

### Dose de stimulant

```js
{
  name: "Dose de stimulant",
  type: "talent",
  system: {
    description: {
      public: "Entreprenez l’action Dose de stimulant ; effectuez un test de Médecine Moyen. En cas de réussite, 1 allié au contact augmente 1 caractéristique de 1 jusqu’à la fin de la rencontre et subit 4 points de stress."
    },
    activation: "active",
    ranked: false,
    effects: [
      {
        id: "dose-stimulant-increase-characteristic",
        type: "custom",
        enabled: true,
        source: {
          itemType: "talent",
          origin: "builder"
        },
        mode: "activated",
        timing: "afterSuccess",
        scope: {
          actor: "ally"
        },
        direction: "ally",
        application: {
          strategy: "chatOnly",
          targetDocument: "chat",
          persist: false
        },
        cost: {
          action: 1
        },
        changes: {},
        duration: {
          type: "untilEndOfEncounter"
        },
        ui: {
          label: "Dose de stimulant",
          summary: "Après un test de Médecine Moyen réussi, un allié au contact augmente une caractéristique de 1 et subit 4 stress.",
          automationLevel: "chat-card"
        }
      }
    ],
    actions: [
      {
        id: "activate-dose-stimulant",
        label: "Dose de stimulant",
        type: "talent",
        activation: {
          kind: "action",
          timing: "manual"
        },
        target: {
          type: "ally",
          range: "engaged",
          count: 1
        },
        check: {
          skill: "medicine",
          difficulty: "average"
        },
        effectRefs: ["dose-stimulant-increase-characteristic"],
        chat: {
          postOnUse: true,
          includeCost: true,
          includeEffects: true
        },
        automationLevel: "chat-card"
      }
    ]
  }
}
```

## ActiveEffects Foundry V14 et bridge SWERPG

### Positionnement

`system.effects` n’est pas un remplacement complet des ActiveEffects Foundry.

`system.effects` est le modèle métier interne : il décrit l’intention mécanique selon les règles Star Wars Edge.

Un ActiveEffect Foundry est une projection technique optionnelle : il sert uniquement lorsque Foundry apporte une valeur concrète pour appliquer, persister, expirer ou afficher l’effet.

### Typologie d’application

#### Effets calculés directement par le système

Ces effets restent dans `system.effects` et sont résolus par le moteur SWERPG. Aucun ActiveEffect n’est créé par défaut.

Exemples :

* `Robustesse` : augmentation du seuil de stress ;
* `Endurci` : augmentation du seuil de blessure ;
* `Filature` : modification d’un pool de dés sur certains tests ;
* `Coup mortel` : bonus aux blessures critiques infligées.

Stratégie recommandée :

```js
application: {
  strategy: "computed",
  targetDocument: "actor",
  persist: false
}
```

ou, pour les jets :

```js
application: {
  strategy: "computed",
  targetDocument: "roll",
  persist: false
}
```

#### Effets temporaires ou persistants projetables vers ActiveEffect

Ces effets peuvent produire un ActiveEffect Foundry si la persistance, l’expiration, la visibilité ou l’intégration native Foundry est utile.

Exemples :

* condition temporaire ;
* bonus ou malus jusqu’à la fin du tour ;
* bonus ou malus jusqu’à la fin de la rencontre ;
* effet visible sur l’Actor ou le Token ;
* effet dont l’expiration doit être gérée par Foundry.

Stratégie recommandée :

```js
application: {
  strategy: "activeEffect",
  targetDocument: "actor",
  persist: true,
  generated: true
}
```

Tout ActiveEffect généré doit porter le flag suivant :

```js
flags: {
  swerpg: {
    generatedFrom: {
      itemUuid: "...",
      effectId: "...",
      schemaVersion: 1
    }
  }
}
```

#### Effets de chat ou d’assistance

Ces effets ne doivent pas produire automatiquement d’ActiveEffect.

Ils servent à afficher une carte de chat, demander un choix, enregistrer une intention ou guider le MJ.

Exemples :

* `Dose de stimulant` ;
* `Sens de la rhétorique` ;
* `Répartie caustique` ;
* effets dépendants d’une dépense d’avantages, de triomphes ou d’un choix narratif.

Stratégie recommandée :

```js
application: {
  strategy: "chatOnly",
  targetDocument: "chat",
  persist: false
}
```

### Règles de synchronisation

* `system.effects` reste la source de vérité métier.
* Un ActiveEffect généré depuis `system.effects` ne doit pas être interprété comme source métier autonome.
* Un ActiveEffect généré doit être traçable via `flags.swerpg.generatedFrom`.
* Si l’Item source est supprimé, désactivé ou migré, les ActiveEffects générés depuis cet Item doivent pouvoir être retrouvés et nettoyés.
* Une édition directe d’un ActiveEffect généré ne doit pas modifier silencieusement `system.effects`.
* Si une synchronisation inverse est un jour souhaitée, elle devra faire l’objet d’une ADR séparée.

### Règle anti-pattern

Le système ne doit pas appliquer la règle suivante :

```txt
Tout Talent → ActiveEffect Foundry
```

Cette approche est rejetée, car elle créerait des ActiveEffects incapables de représenter correctement les coûts variables, les effets limités à un jet, les déclencheurs après réussite, les dépenses d’avantages, les confirmations joueur / MJ et les effets narratifs.

## Import OggDude

### Objectif

Importer sans perdre d’information, même si le mapping est incomplet.

### Règle principale

OggDude est une source d’entrée, pas le modèle interne.

Pipeline :

```txt
OggDude raw data
→ flags.swerpg.import.raw
→ mapping
→ system.effects
→ system.actions
```

### Structure d’import

```js
{
  flags: {
    swerpg: {
      import: {
        source: "oggdude",
        sourceId: "DODGE",
        importedAt: "2026-05-08T00:00:00.000Z",
        raw: {
          dieModifiers: [],
          activation: null,
          description: ""
        }
      },
      mapping: {
        status: "unmapped",
        confidence: "low",
        reviewed: false,
        warnings: []
      }
    }
  }
}
```

### Règles de mapping

Un mapping peut être `high` si :

* le Talent est connu ;
* le type d’effet est explicite ;
* le scope est explicite ;
* le coût est explicite ;
* le timing est explicite.

Un mapping doit être `medium` si :

* l’effet est compris mais le contexte exact dépend d’un choix ;
* le Talent demande une activation variable ;
* le système peut proposer l’effet mais pas l’appliquer automatiquement.

Un mapping doit être `low` si :

* le texte est ambigu ;
* le `DieModifier` manque de contexte ;
* le Talent demande une décision narrative ;
* le Talent modifie une règle non encore implémentée.

## Validateurs runtime

### Utilitaires de base

```js
/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * @param {unknown} value
 * @param {Record<string, string>} enumObject
 * @returns {boolean}
 */
export function isEnumValue(value, enumObject) {
  return typeof value === "string" && Object.values(enumObject).includes(value);
}
```

### Validation d’un effet

```js
import {
  AUTOMATION_LEVELS,
  EFFECT_APPLICATION_STRATEGIES,
  EFFECT_DIRECTIONS,
  EFFECT_MODES,
  EFFECT_TIMINGS,
  EFFECT_TYPES
} from "./effect-constants.js";

import {
  isEnumValue,
  isNonEmptyString,
  isPlainObject
} from "./validation-utils.js";

/**
 * Valide une définition d’effet mécanique.
 *
 * @param {unknown} effect
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateEffectDefinition(effect) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(effect)) {
    return {
      valid: false,
      errors: ["Effect must be an object."],
      warnings
    };
  }

  if (!isNonEmptyString(effect.id)) {
    errors.push("Effect must have a non-empty string id.");
  }

  if (!isEnumValue(effect.type, EFFECT_TYPES)) {
    errors.push(`Unknown effect type: ${String(effect.type)}`);
  }

  if (typeof effect.enabled !== "boolean") {
    errors.push("Effect must define enabled as a boolean.");
  }

  if (!isPlainObject(effect.source)) {
    errors.push("Effect must define a source object.");
  }

  if (!isEnumValue(effect.mode, EFFECT_MODES)) {
    errors.push(`Unknown effect mode: ${String(effect.mode)}`);
  }

  if (!isEnumValue(effect.timing, EFFECT_TIMINGS)) {
    errors.push(`Unknown effect timing: ${String(effect.timing)}`);
  }

  if (!isPlainObject(effect.scope)) {
    errors.push("Effect must define a scope object.");
  }

  if (!isPlainObject(effect.changes)) {
    errors.push("Effect must define a changes object.");
  }

  if (
    effect.direction !== undefined &&
    !isEnumValue(effect.direction, EFFECT_DIRECTIONS)
  ) {
    errors.push(`Unknown effect direction: ${String(effect.direction)}`);
  }

  if (effect.application !== undefined) {
    if (!isPlainObject(effect.application)) {
      errors.push("Effect application must be an object when defined.");
    } else if (!isEnumValue(effect.application.strategy, EFFECT_APPLICATION_STRATEGIES)) {
      errors.push(`Unknown effect application strategy: ${String(effect.application.strategy)}`);
    }
  }

  if (!isPlainObject(effect.ui)) {
    warnings.push("Effect should define ui metadata.");
  } else {
    if (!isNonEmptyString(effect.ui.label)) {
      warnings.push("Effect should define ui.label.");
    }

    if (
      effect.ui.automationLevel !== undefined &&
      !isEnumValue(effect.ui.automationLevel, AUTOMATION_LEVELS)
    ) {
      warnings.push(`Unknown automation level: ${String(effect.ui.automationLevel)}`);
    }
  }

  if (
    effect.type === EFFECT_TYPES.CUSTOM &&
    effect.ui?.automationLevel === AUTOMATION_LEVELS.AUTO
  ) {
    warnings.push("Custom effects should not use automationLevel auto.");
  }

  if (
    effect.application?.strategy === EFFECT_APPLICATION_STRATEGIES.ACTIVE_EFFECT &&
    effect.type === EFFECT_TYPES.CUSTOM
  ) {
    warnings.push("Custom effects should not be projected to ActiveEffect without a dedicated adapter.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

### Validation d’une action

```js
import {
  ACTION_KINDS,
  ACTION_TYPES,
  AUTOMATION_LEVELS
} from "./effect-constants.js";

import {
  isEnumValue,
  isNonEmptyString,
  isPlainObject
} from "./validation-utils.js";

/**
 * Valide une action cliquable ou assistée.
 *
 * @param {unknown} action
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateActionDefinition(action) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(action)) {
    return {
      valid: false,
      errors: ["Action must be an object."],
      warnings
    };
  }

  if (!isNonEmptyString(action.id)) {
    errors.push("Action must have a non-empty string id.");
  }

  if (!isNonEmptyString(action.label)) {
    errors.push("Action must have a non-empty label.");
  }

  if (!isEnumValue(action.type, ACTION_TYPES)) {
    errors.push(`Unknown action type: ${String(action.type)}`);
  }

  if (!isPlainObject(action.activation)) {
    errors.push("Action must define an activation object.");
  } else if (!isEnumValue(action.activation.kind, ACTION_KINDS)) {
    errors.push(`Unknown action activation kind: ${String(action.activation.kind)}`);
  }

  if (!isEnumValue(action.automationLevel, AUTOMATION_LEVELS)) {
    errors.push(`Unknown automation level: ${String(action.automationLevel)}`);
  }

  if (action.effectRefs !== undefined && !Array.isArray(action.effectRefs)) {
    errors.push("Action effectRefs must be an array when defined.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

### Validation des références entre actions et effets

```js
/**
 * Vérifie que les actions ne référencent que des effets existants.
 *
 * @param {Object[]} effects
 * @param {Object[]} actions
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateActionEffectReferences(effects, actions) {
  const errors = [];
  const warnings = [];

  const effectIds = new Set(
    effects
      .filter((effect) => typeof effect.id === "string")
      .map((effect) => effect.id)
  );

  for (const action of actions) {
    if (!Array.isArray(action.effectRefs)) continue;

    for (const effectRef of action.effectRefs) {
      if (!effectIds.has(effectRef)) {
        errors.push(`Action "${action.id}" references unknown effect "${effectRef}".`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

## UI Talent

### Affichage standard

La fiche de Talent doit afficher :

1. le texte public ;
2. le type général : passif, actif, réaction, manuel, mixte ;
3. les effets structurés ;
4. les actions disponibles ;
5. le statut de mapping si le Talent vient d’un import ;
6. les avertissements éventuels.

### Effets

Chaque effet doit afficher :

* label ;
* type ;
* timing ;
* scope ;
* coût éventuel ;
* niveau d’automatisation ;
* statut actif/inactif.

### Actions

Chaque action doit pouvoir être rendue sous forme de bouton si :

* `automationLevel !== "none"` ;
* l’action est utilisable dans le contexte courant ;
* l’utilisateur a les droits nécessaires.

## UI Actor Sheet

### Objectif

La fiche d’Actor doit pouvoir exploiter les Talents sans noyer le joueur.

### Règles

* Les Talents passifs doivent rester lisibles mais discrets.
* Les Talents activables doivent être accessibles dans une zone d’actions.
* Les réactions doivent pouvoir apparaître contextuellement.
* Les effets automatiques doivent être journalisés ou consultables.
* Les effets assistés doivent pouvoir être acceptés ou ignorés.

## Moteur d’effets

### Pipeline cible

```txt
1. Collecter les effets depuis l’Actor.
2. Collecter les effets depuis les Items possédés.
3. Collecter les effets temporaires actifs.
4. Filtrer par timing.
5. Filtrer par scope.
6. Filtrer par conditions.
7. Séparer effets automatiques, assistés et manuels.
8. Séparer effets calculés, effets de chat et effets projetables en ActiveEffects.
9. Appliquer les effets automatiques sûrs via le moteur SWERPG.
10. Proposer les effets assistés.
11. Produire ou synchroniser un ActiveEffect Foundry uniquement si `application.strategy === "activeEffect"`.
12. Journaliser les effets appliqués.
```

### Contexte de résolution

```js
/**
 * Contexte utilisé pour résoudre les effets applicables.
 *
 * @typedef {Object} EffectResolutionContext
 * @property {string} actorId
 * @property {string[]=} targetIds
 * @property {string} timing
 * @property {string=} rollType
 * @property {string=} skill
 * @property {string=} characteristic
 * @property {string=} weaponId
 * @property {string=} itemId
 * @property {string[]=} tags
 */
```

### Effet résolu

```js
/**
 * Résultat de résolution d’un effet.
 *
 * @typedef {Object} ResolvedEffect
 * @property {EffectDefinition} effect
 * @property {string=} sourceItemId
 * @property {string} automationLevel
 * @property {string=} applicationStrategy
 * @property {boolean} shouldCreateActiveEffect
 * @property {boolean} applicable
 * @property {string=} reason
 */
```

### Fonction cible

```js
/**
 * Collecte les effets applicables à un contexte donné.
 *
 * @param {Actor} actor
 * @param {EffectResolutionContext} context
 * @returns {ResolvedEffect[]}
 */
export function collectApplicableEffects(actor, context) {
  // Implementation target
  return [];
}
```

### Projection optionnelle vers ActiveEffect

```js
/**
 * Construit les données nécessaires à la création d’un ActiveEffect Foundry
 * depuis un effet SWERPG résolu.
 *
 * Cette fonction ne doit être appelée que si l’effet est explicitement projetable
 * vers Foundry via `application.strategy === "activeEffect"`.
 *
 * @param {ResolvedEffect} resolvedEffect
 * @param {EffectResolutionContext} context
 * @returns {Object|null}
 */
export function buildActiveEffectData(resolvedEffect, context) {
  // Implementation target
  return null;
}
```

Règles :

* ne jamais créer un ActiveEffect par défaut pour tous les Talents ;
* ne créer un ActiveEffect que lorsque `application.strategy === "activeEffect"` ;
* toujours ajouter `flags.swerpg.generatedFrom` ;
* ne pas dupliquer un ActiveEffect déjà généré pour le même `itemUuid` et le même `effectId` ;
* ne pas convertir les effets `computed`, `chatOnly` ou `manual` en ActiveEffects.

## Gestion des actions

### Contexte d’utilisation d’action

```js
/**
 * Contexte d’utilisation d’une action.
 *
 * @typedef {Object} ActionUseContext
 * @property {string} actorId
 * @property {string} actionId
 * @property {string} itemId
 * @property {string[]=} targetIds
 * @property {Record<string, number>=} selectedCost
 */
```

### Résultat d’utilisation d’action

```js
/**
 * Résultat d’utilisation d’une action.
 *
 * @typedef {Object} ActionUseResult
 * @property {boolean} success
 * @property {Record<string, number>=} appliedCosts
 * @property {EffectDefinition[]=} preparedEffects
 * @property {string=} chatMessageId
 * @property {string[]=} warnings
 */
```

### Fonction cible

```js
/**
 * Utilise une action de Talent.
 *
 * @param {ActionUseContext} context
 * @returns {Promise<ActionUseResult>}
 */
export async function useTalentAction(context) {
  // Implementation target
  return {
    success: false,
    warnings: ["Not implemented yet."]
  };
}
```

## Validation des données

### Règles de validation

Un effet doit avoir :

* un `id` unique dans l’Item ;
* un `type` connu ;
* un `mode` connu ;
* un `timing` connu ;
* un `scope`, même minimal ;
* un `changes`, même vide pour `custom` ;
* idéalement un `ui.label` ;
* idéalement une `application.strategy`, sinon `computed` est supposé par défaut.

Une action doit avoir :

* un `id` unique dans l’Item ;
* un `label` ;
* un `type` ;
* une `activation.kind` ;
* un niveau d’automatisation.

### Warnings

Le système doit produire un warning si :

* un effet référence une compétence inconnue ;
* un effet référence une action inexistante ;
* une action référence un effet inexistant ;
* un effet automatique utilise un type `custom` ;
* un coût variable n’a pas de borne ;
* un effet importé n’a pas été revu ;
* un effet `custom` demande une projection ActiveEffect sans adaptateur dédié ;
* un ActiveEffect généré ne contient pas `flags.swerpg.generatedFrom`.

## Migrations

### Version de schéma

Ajouter une version de schéma au système :

```js
{
  system: {
    schemaVersion: 1
  }
}
```

### Migration V0 vers V1

Objectif :

* initialiser `system.effects = []` si absent ;
* initialiser `system.actions = []` si absent ;
* initialiser `system.activation = "passive"` si absent ;
* initialiser `system.schemaVersion = 1` si absent ;
* déplacer les anciennes données intermédiaires vers `flags.swerpg.legacy` si nécessaire ;
* conserver les descriptions existantes.

### Migration import brut

Si des données OggDude existent déjà dans des flags non standardisés, les déplacer vers :

```js
{
  flags: {
    swerpg: {
      import: {
        raw: {}
      }
    }
  }
}
```

## Tests

### Tests unitaires Vitest

Prévoir des tests pour :

* validation d’un effet complet ;
* rejet d’un effet sans `id` ;
* rejet d’un effet avec `type` inconnu ;
* validation d’une action liée à un effet ;
* détection d’un `effectRef` invalide ;
* calcul du scaling par rang ;
* filtrage par compétence ;
* filtrage par timing ;
* filtrage par scope ;
* validation d’une stratégie `computed` ;
* validation d’une stratégie `activeEffect` ;
* construction d’un ActiveEffect avec `flags.swerpg.generatedFrom` ;
* refus de conversion automatique d’un effet `chatOnly` en ActiveEffect.

### Exemple de test

```js
import { describe, expect, it } from "vitest";
import { validateEffectDefinition } from "../src/effects/validate-effect-definition.js";

describe("validateEffectDefinition", () => {
  it("validates a minimal passive derived stat effect", () => {
    const effect = {
      id: "robustesse-strain-threshold",
      type: "modifyDerivedStat",
      enabled: true,
      source: {
        itemType: "talent",
        origin: "builder"
      },
      mode: "passive",
      timing: "prepareData",
      scope: {
        actor: "self"
      },
      changes: {
        strainThreshold: "+rank"
      },
      ui: {
        label: "Robustesse",
        automationLevel: "auto"
      }
    };

    const result = validateEffectDefinition(effect);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
```

### Tests d’import

Prévoir des fixtures pour :

* Robustesse ;
* Endurci ;
* Filature ;
* Esquive ;
* Coup mortel ;
* Concentration intense ;
* Dose de stimulant.

### Tests UI

Prévoir des tests pour :

* affichage d’un Talent passif ;
* affichage d’un Talent activable ;
* bouton d’action ;
* effet importé non mappé ;
* effet partiellement mappé ;
* désactivation manuelle d’un effet.

## Contraintes pour OpenCode

### À faire

* Créer des constantes JavaScript pour les valeurs autorisées.
* Documenter les structures avec JSDoc.
* Ajouter `system.effects` au modèle de données Talent.
* Ajouter `system.actions` au modèle de données Talent.
* Ajouter `system.activation` au modèle de données Talent.
* Ajouter les validateurs runtime.
* Ajouter les helpers de mapping.
* Ajouter les helpers de collecte d’effets.
* Ajouter les constantes et validateurs liés à `application.strategy`.
* Ajouter un bridge minimal vers ActiveEffect, sans génération automatique globale.
* Ajouter une UI minimale de lecture des effets.
* Ajouter les tests Vitest du modèle.

### À ne pas faire en V1

* Ne pas introduire TypeScript.
* Ne pas ajouter de build TypeScript.
* Ne pas automatiser tous les Talents.
* Ne pas générer de `actorHooks`.
* Ne pas créer une DSL complète.
* Ne pas supprimer les descriptions textuelles.
* Ne pas appliquer automatiquement les mappings incertains.
* Ne pas convertir tous les Talents en ActiveEffects Foundry.
* Ne pas considérer un ActiveEffect généré comme source de vérité métier.
* Ne pas créer un modèle réservé uniquement aux Talents si le modèle peut être commun aux autres Items.

## Roadmap technique

### Étape 1 — Modèle de données

* Ajouter `system.effects`.
* Ajouter `system.actions`.
* Ajouter `system.activation`.
* Ajouter `system.schemaVersion`.

### Étape 2 — Constantes et contrats JSDoc

* Créer les constantes de valeurs autorisées.
* Documenter les contrats avec JSDoc.
* Ajouter les utilitaires de validation.

### Étape 3 — Validation

* Ajouter `validateEffectDefinition`.
* Ajouter `validateActionDefinition`.
* Ajouter `validateActionEffectReferences`.
* Ajouter les warnings.

### Étape 4 — Import

* Conserver le brut dans `flags.swerpg.import.raw`.
* Mapper quelques Talents simples.
* Ajouter les statuts de mapping.
* Ajouter les niveaux de confiance.

### Étape 5 — UI Talent

* Afficher les effets.
* Afficher les actions.
* Afficher les statuts de mapping.
* Afficher les warnings.

### Étape 6 — Actor Sheet

* Afficher les actions de Talents activables.
* Préparer les boutons d’action.
* Ne pas encore automatiser agressivement.

### Étape 7 — Moteur de jets

* Collecter les effets applicables.
* Appliquer seulement les effets sûrs.
* Proposer les effets assistés.
* Journaliser les effets appliqués.

### Étape 8 — Bridge ActiveEffect Foundry

* Ajouter `buildActiveEffectData`.
* Générer un ActiveEffect uniquement pour les effets `application.strategy === "activeEffect"`.
* Ajouter systématiquement `flags.swerpg.generatedFrom`.
* Prévoir le nettoyage des ActiveEffects générés quand l’Item source est supprimé, désactivé ou migré.

## Décisions ouvertes

Les points suivants restent à trancher dans des ADR ou specs séparées :

1. format exact des compétences internes ;
2. format exact des dés SWERPG dans le moteur de jets ;
3. mapping exact des `changes` SWERPG vers les `changes` ActiveEffect Foundry pour chaque type d’effet projetable ;
4. règles fines d’expiration des ActiveEffects temporaires ;
5. UX précise des réactions en combat ;
6. degré d’automatisation accepté par défaut ;
7. format commun définitif pour armes, armures, gear et pouvoirs de Force ;
8. emplacement exact des fichiers de constantes, validateurs, bridge ActiveEffect et helpers dans l’arborescence du projet.

## Résumé

Le modèle cible est :

```txt
Talent
├── description = texte lisible
├── effects     = effets mécaniques structurés
├── actions     = activations cliquables
├── flags       = import brut, métadonnées et traçabilité
└── actorHooks  = extension experte uniquement

Foundry Bridge
└── ActiveEffect = projection technique optionnelle, jamais source de vérité métier
```

La V1 doit rester volontairement sobre.

L’objectif n’est pas d’automatiser tous les Talents immédiatement.

L’objectif est de poser un modèle stable qui permette d’importer, afficher, relire, tester et automatiser progressivement les effets mécaniques.

`system.effects` reste la source de vérité métier. Les ActiveEffects Foundry V14 peuvent être produits ou pilotés par le système, mais uniquement comme couche technique optionnelle d’application, de persistance, d’expiration ou d’affichage.

Ce modèle doit être implémenté en JavaScript vanilla, documenté en JSDoc et sécurisé par des validateurs runtime.
