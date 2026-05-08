# LLM Implementation Spec — SWERPG Talent Effects Model

## Purpose

This document is the code-agent-ready version of the technical design for SWERPG Talent mechanical effects.

It is written for Claude Code, Codex, OpenCode, or any LLM coding agent that needs to implement the feature inside a Foundry VTT 14+ system using JavaScript vanilla.

## Implementation goal

Add a stable, validated, testable model for Talent mechanical effects.

The implementation must support:

- `system.effects` on Talent Items;
- `system.actions` on Talent Items;
- activation metadata;
- schema versioning;
- runtime validation;
- import metadata and mapping warnings;
- future effect collection and resolution;
- optional projection to Foundry V14 `ActiveEffect` documents through a bridge.

## Non-negotiable architecture

```txt
system.effects = SWERPG business model
ActiveEffect  = optional Foundry technical projection
```

`system.effects` describes what the Star Wars Edge rule effect means.

`ActiveEffect` describes how Foundry may apply, persist, expire, or display some effects.

Never use `ActiveEffect` as the canonical business model for Talents.

## Expected target data shape

A Talent Item should be able to contain:

```js
{
  type: "talent",
  system: {
    schemaVersion: 1,
    description: {
      public: "",
      gm: "",
      source: ""
    },
    activation: "passive",
    ranked: false,
    effects: [],
    actions: []
  },
  flags: {
    swerpg: {
      import: {},
      mapping: {}
    }
  }
}
```

Do not remove or overwrite existing descriptions.

## Suggested file structure

Adapt paths to the existing repository structure after inspection.

Preferred structure:

```txt
src/
  effects/
    effect-constants.js
    validation-utils.js
    validate-effect-definition.js
    validate-action-definition.js
    validate-action-effect-references.js
    collect-applicable-effects.js
    active-effect-bridge.js
  talents/
    talent-schema-migration.js
    talent-effect-mapping.js
  ui/
    talent-effects-view.js
  tests/
    effects/
      validate-effect-definition.test.js
      validate-action-definition.test.js
      validate-action-effect-references.test.js
      collect-applicable-effects.test.js
      active-effect-bridge.test.js
```

If the repository already has equivalent folders, reuse them instead of creating parallel structures.

## Constants to implement

Create `effect-constants.js`.

```js
/** @readonly @enum {string} */
export const TALENT_ACTIVATIONS = Object.freeze({
  PASSIVE: "passive",
  ACTIVE: "active",
  REACTION: "reaction",
  MANUAL: "manual",
  MIXED: "mixed"
});

/** @readonly @enum {string} */
export const AUTOMATION_LEVELS = Object.freeze({
  NONE: "none",
  MANUAL: "manual",
  CHAT_CARD: "chat-card",
  SUGGESTED: "suggested",
  ASSISTED: "assisted",
  AUTO: "auto"
});

/** @readonly @enum {string} */
export const EFFECT_TYPES = Object.freeze({
  MODIFY_DICE_POOL: "modifyDicePool",
  MODIFY_DERIVED_STAT: "modifyDerivedStat",
  MODIFY_DAMAGE: "modifyDamage",
  MODIFY_CRITICAL: "modifyCritical",
  GRANT_CAREER_SKILL: "grantCareerSkill",
  REROLL_CHECK: "rerollCheck",
  CUSTOM: "custom"
});

/** @readonly @enum {string} */
export const DEFERRED_EFFECT_TYPES = Object.freeze({
  MODIFY_RECOVERY: "modifyRecovery",
  MODIFY_ITEM: "modifyItem",
  APPLY_CONDITION: "applyCondition"
});

/** @readonly @enum {string} */
export const EFFECT_MODES = Object.freeze({
  PASSIVE: "passive",
  ACTIVATED: "activated",
  REACTION: "reaction",
  MANUAL: "manual"
});

/** @readonly @enum {string} */
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

/** @readonly @enum {string} */
export const EFFECT_APPLICATION_STRATEGIES = Object.freeze({
  COMPUTED: "computed",
  ACTIVE_EFFECT: "activeEffect",
  CHAT_ONLY: "chatOnly",
  MANUAL: "manual"
});

/** @readonly @enum {string} */
export const EFFECT_TARGET_DOCUMENTS = Object.freeze({
  ACTOR: "actor",
  ITEM: "item",
  TOKEN: "token",
  ROLL: "roll"
});

/** @readonly @enum {string} */
export const EFFECT_DIRECTIONS = Object.freeze({
  SELF: "self",
  OUTGOING: "outgoing",
  INCOMING: "incoming",
  TARGET: "target",
  ALLY: "ally",
  AREA: "area"
});

/** @readonly @enum {string} */
export const ACTION_TYPES = Object.freeze({
  TALENT: "talent",
  ATTACK: "attack",
  FORCE_POWER: "forcePower",
  UTILITY: "utility",
  RECOVERY: "recovery",
  CUSTOM: "custom"
});

/** @readonly @enum {string} */
export const ACTION_KINDS = Object.freeze({
  ACTION: "action",
  MANEUVER: "maneuver",
  INCIDENTAL: "incidental",
  REACTION: "reaction",
  PASSIVE: "passive",
  FREE: "free"
});

/** @readonly @enum {string} */
export const MAPPING_STATUSES = Object.freeze({
  MAPPED: "mapped",
  PARTIALLY_MAPPED: "partiallyMapped",
  UNMAPPED: "unmapped",
  REQUIRES_REVIEW: "requiresReview",
  UNSUPPORTED: "unsupported"
});

/** @readonly @enum {string} */
export const MAPPING_CONFIDENCE = Object.freeze({
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low"
});
```

## JSDoc contracts to document

Add JSDoc typedefs close to the implementation or in a dedicated model documentation file.

Required contracts:

```js
/**
 * @typedef {Object} EffectSource
 * @property {string=} itemId
 * @property {string=} itemUuid
 * @property {"talent"|"weapon"|"armor"|"gear"|"forcePower"|"condition"|"other"} itemType
 * @property {"manual"|"oggdude"|"builder"|"migration"|"system"=} origin
 */
```

```js
/**
 * @typedef {Object} EffectApplication
 * @property {"computed"|"activeEffect"|"chatOnly"|"manual"} strategy
 * @property {"actor"|"item"|"token"|"roll"=} targetDocument
 * @property {boolean=} persist
 * @property {boolean=} generated
 */
```

```js
/**
 * @typedef {Object} GeneratedActiveEffectRef
 * @property {string} itemUuid
 * @property {string} effectId
 * @property {number} schemaVersion
 */
```

```js
/**
 * @typedef {Object} EffectDefinition
 * @property {string} id
 * @property {string} type
 * @property {boolean} enabled
 * @property {EffectSource} source
 * @property {"passive"|"activated"|"reaction"|"manual"} mode
 * @property {string} timing
 * @property {"self"|"outgoing"|"incoming"|"target"|"ally"|"area"} direction
 * @property {Object} scope
 * @property {EffectApplication=} application
 * @property {Object=} rankScaling
 * @property {Object=} cost
 * @property {Object} changes
 * @property {Object[]=} conditions
 * @property {Object=} duration
 * @property {Object=} constraints
 * @property {Object=} ui
 */
```

```js
/**
 * @typedef {Object} ActionDefinition
 * @property {string} id
 * @property {string} label
 * @property {string} type
 * @property {Object} activation
 * @property {Object=} cost
 * @property {Object=} target
 * @property {string[]=} effectRefs
 * @property {Object=} frequency
 * @property {Object=} check
 * @property {Object=} chat
 * @property {"none"|"manual"|"chat-card"|"suggested"|"assisted"|"auto"} automationLevel
 */
```

## Validation utilities

Create `validation-utils.js`.

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

## Validator: effect definition

Implement `validateEffectDefinition(effect)`.

Must return:

```js
{
  valid: boolean,
  errors: string[],
  warnings: string[]
}
```

Validation requirements:

- effect must be a plain object;
- `id` must be a non-empty string;
- `type` must be an allowed V1 `EFFECT_TYPES` value;
- deferred types should warn or error depending on implementation phase;
- `enabled` must be boolean;
- `source` must be an object;
- `mode` must be an allowed `EFFECT_MODES` value;
- `timing` must be an allowed `EFFECT_TIMINGS` value;
- `direction` must be an allowed `EFFECT_DIRECTIONS` value;
- `scope` must be an object;
- `changes` must be an object, even empty for `custom`;
- `application.strategy`, when present, must be allowed;
- `ui.automationLevel`, when present, must be allowed;
- `custom` effects must not use `automationLevel: "auto"`;
- `activeEffect` strategy should require traceability at generation time;
- `computed`, `chatOnly`, `manual` must not be projected automatically to ActiveEffect.

## Validator: action definition

Implement `validateActionDefinition(action)`.

Validation requirements:

- action must be a plain object;
- `id` must be a non-empty string;
- `label` must be a non-empty string;
- `type` must be an allowed `ACTION_TYPES` value;
- `activation.kind` must be an allowed `ACTION_KINDS` value;
- `automationLevel` must be an allowed `AUTOMATION_LEVELS` value;
- `effectRefs`, when present, must be an array.

## Validator: action-effect references

Implement `validateActionEffectReferences(effects, actions)`.

Rules:

- collect all `effect.id` values from `effects`;
- every `action.effectRefs[]` entry must reference an existing effect;
- missing references are errors.

## Effect engine skeleton

Create `collectApplicableEffects(actor, context)`.

Signature:

```js
/**
 * @param {Actor} actor
 * @param {Object} context
 * @returns {Object[]}
 */
export function collectApplicableEffects(actor, context) {
  return [];
}
```

Target pipeline:

```txt
1. Collect actor-owned Talent effects.
2. Collect effects from owned Items when relevant.
3. Collect temporary active SWERPG effects if already implemented.
4. Filter by enabled flag.
5. Filter by timing.
6. Filter by direction.
7. Filter by scope.
8. Filter by conditions.
9. Split by application.strategy.
10. Split by automationLevel.
11. Return resolved effects with reason / applicability metadata.
```

Do not implement aggressive automation in the first pass. A safe stub with tests is acceptable.

## ActiveEffect bridge skeleton

Create `active-effect-bridge.js`.

Purpose:

Convert an eligible SWERPG `EffectDefinition` into Foundry `ActiveEffect` creation data only when `application.strategy === "activeEffect"`.

Required behavior:

```js
/**
 * @param {Object} effect
 * @param {Object} context
 * @returns {Object|null}
 */
export function buildActiveEffectData(effect, context) {
  if (effect?.application?.strategy !== "activeEffect") return null;

  return {
    name: effect.ui?.label ?? effect.id,
    disabled: !effect.enabled,
    changes: [],
    flags: {
      swerpg: {
        generatedFrom: {
          itemUuid: effect.source?.itemUuid,
          effectId: effect.id,
          schemaVersion: context?.schemaVersion ?? 1
        }
      }
    }
  };
}
```

Important:

- do not create the ActiveEffect in this function unless repository conventions already expect side effects;
- prefer returning creation data;
- never generate an ActiveEffect for `computed`, `chatOnly`, or `manual`;
- generated ActiveEffects must always include `flags.swerpg.generatedFrom`.

## Migration requirements

When migrating existing Talent Items:

- initialize `system.effects = []` if missing;
- initialize `system.actions = []` if missing;
- initialize `system.activation = "passive"` if missing;
- initialize `system.schemaVersion = 1` if missing;
- preserve existing descriptions;
- move legacy unstructured import data into `flags.swerpg.legacy` when necessary;
- move raw OggDude data into `flags.swerpg.import.raw` when available.

## UI requirements, minimal V1

Talent sheet should display:

- public description;
- activation type;
- structured effects;
- actions;
- mapping status;
- warnings.

Each effect row should show:

- label;
- type;
- timing;
- direction;
- scope summary;
- cost summary;
- application strategy;
- automation level;
- enabled / disabled.

Actor sheet should not be overloaded. For V1:

- passive Talent effects may be shown quietly;
- activable Talent actions may be listed in an action area;
- reactions can remain non-contextual until the reaction UX is implemented;
- automatic effects should be inspectable or logged.

## Import and mapping requirements

OggDude is an input source, not the internal model.

Pipeline:

```txt
OggDude raw data
→ flags.swerpg.import.raw
→ mapping
→ system.effects
→ system.actions
```

Mapping metadata shape:

```js
flags: {
  swerpg: {
    import: {
      source: "oggdude",
      sourceId: "DODGE",
      importedAt: "2026-05-08T00:00:00.000Z",
      raw: {}
    },
    mapping: {
      status: "unmapped",
      confidence: "low",
      reviewed: false,
      warnings: []
    }
  }
}
```

Rules:

- high confidence only when type, scope, cost, timing and Talent identity are explicit;
- medium confidence when the effect is understood but context or choice remains unresolved;
- low confidence for ambiguous text, missing DieModifier context, narrative effects or unsupported rules;
- low/medium confidence mappings must not be auto-applied.

## Example effects

### Robustesse

```js
{
  id: "robustesse-strain-threshold",
  type: "modifyDerivedStat",
  enabled: true,
  source: { itemType: "talent", origin: "builder" },
  mode: "passive",
  timing: "prepareData",
  direction: "self",
  scope: { actor: "self" },
  application: {
    strategy: "computed",
    targetDocument: "actor",
    persist: false,
    generated: false
  },
  rankScaling: { enabled: true, rankSource: "talent", multiplier: 1 },
  changes: { strainThreshold: "+rank" },
  ui: {
    label: "Robustesse",
    summary: "Augmente le seuil de stress de 1 par rang.",
    automationLevel: "auto"
  }
}
```

### Coup mortel

```js
{
  id: "coup-mortel-critical-plus-ten",
  type: "modifyCritical",
  enabled: true,
  source: { itemType: "talent", origin: "builder" },
  mode: "passive",
  timing: "beforeCriticalRoll",
  direction: "outgoing",
  scope: {
    actor: "self",
    rollTypes: ["critical"],
    tags: ["inflictedBySelf"]
  },
  application: {
    strategy: "computed",
    targetDocument: "roll",
    persist: false,
    generated: false
  },
  rankScaling: { enabled: true, rankSource: "talent", multiplier: 10 },
  changes: { criticalRollModifier: "+rank * 10" },
  ui: {
    label: "Coup mortel",
    summary: "Ajoute +10 par rang aux blessures critiques infligées.",
    automationLevel: "assisted"
  }
}
```

### Esquive

```js
{
  id: "esquive-upgrade-incoming-combat-check",
  type: "modifyDicePool",
  enabled: true,
  source: { itemType: "talent", origin: "builder" },
  mode: "reaction",
  timing: "whenTargetedByCombatCheck",
  direction: "incoming",
  scope: {
    actor: "self",
    rollTypes: ["combat"]
  },
  application: {
    strategy: "computed",
    targetDocument: "roll",
    persist: false,
    generated: false
  },
  cost: {
    strain: { mode: "variable", min: 1, max: "rank" },
    incidental: 1
  },
  changes: { upgradeDifficulty: "+strainSpent" },
  duration: { type: "currentRoll" },
  ui: {
    label: "Esquive",
    summary: "Subissez du stress pour améliorer la difficulté d’un test de combat qui vous cible.",
    automationLevel: "assisted"
  }
}
```

## Required Vitest tests

Minimum test coverage:

```txt
validateEffectDefinition
- accepts a valid computed passive effect
- rejects missing id
- rejects unknown type
- rejects unknown direction
- rejects invalid application strategy
- warns or rejects deferred V1 types depending on chosen phase
- warns when custom effect uses auto automation

validateActionDefinition
- accepts valid Talent action
- rejects missing label
- rejects unknown activation kind
- rejects invalid automation level

validateActionEffectReferences
- accepts valid references
- rejects unknown effectRef

active-effect-bridge
- returns null for computed effects
- returns null for chatOnly effects
- returns null for manual effects
- returns creation data for activeEffect strategy
- adds flags.swerpg.generatedFrom

collectApplicableEffects
- filters by enabled
- filters by timing
- filters by direction
- filters by skill/scope where implemented
```

## Development sequence for an LLM agent

Follow this order:

```txt
1. Inspect existing repository structure.
2. Identify Item / Talent data model files.
3. Identify existing test framework and Vitest config.
4. Add constants.
5. Add validation utilities.
6. Add validators.
7. Add action-effect reference validation.
8. Add minimal migration or defaulting logic.
9. Add ActiveEffect bridge as a pure data builder.
10. Add tests.
11. Add minimal UI display only if existing sheet architecture is clear.
12. Do not implement broad automation until tests are stable.
```

## Final acceptance checklist

Before considering the task complete, verify:

- no TypeScript was introduced;
- no build pipeline was added;
- descriptions are preserved;
- `system.effects` and `system.actions` default safely;
- validators return errors and warnings, not thrown exceptions for normal invalid data;
- no ActiveEffect is generated for every Talent;
- generated ActiveEffect data includes `flags.swerpg.generatedFrom`;
- tests pass;
- code is documented with JSDoc;
- no duplicate model parallel to `system.effects` was created.

## Commit suggestion

```txt
feat(talents): add canonical mechanical effects model
```

Longer message:

```txt
feat(talents): add canonical mechanical effects model

- add JS constants for Talent effects, actions, timings, directions and application strategies
- add runtime validators for effect and action definitions
- add action/effect reference validation
- add ActiveEffect bridge skeleton with generatedFrom traceability
- preserve system.effects as SWERPG business source of truth
- keep Foundry ActiveEffects as optional technical projection
- add Vitest coverage for validators and bridge behavior
```
