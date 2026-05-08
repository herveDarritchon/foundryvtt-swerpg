---
name: swerpg-talent-effects
description: Use this skill when implementing, refactoring, reviewing, or extending the SWERPG Foundry VTT 14+ Talent mechanical effects model. It applies to Talent Items, system.effects, system.actions, runtime validators, Vitest tests, OggDude imports, ActiveEffect V14 projection, effect engines, dice-pool modifiers, derived stats, Talent automation, or Star Wars Edge/FFG Talent mechanics. Enforces that system.effects is the canonical SWERPG business model and Foundry ActiveEffects are optional technical projections only.
---

# SWERPG Talent Effects Skill

## Mission

Implement and maintain the canonical mechanical effects model for Talents in the SWERPG Foundry VTT 14+ system.

The system is written in **JavaScript vanilla**. Do not introduce TypeScript, a TypeScript build step, or a parallel model.

Use this skill for work involving:

- Talent Item data models;
- `system.effects`;
- `system.actions`;
- Talent activation metadata;
- runtime effect validation;
- OggDude Talent imports and mapping;
- dice-pool, damage, critical, derived-stat, career-skill, or reroll effects;
- ActiveEffect V14 projection;
- Talent sheet or Actor sheet display of effects/actions;
- Vitest tests for Talent effects.

## Core architecture

Always preserve this separation:

```txt
system.description.*  = human-readable Talent text
system.effects        = canonical SWERPG business model
system.actions        = clickable or assisted user triggers
flags.swerpg.*        = import raw data, mapping, warnings, traceability
actorHooks            = expert-only extension escape hatch
ActiveEffect Foundry  = optional technical projection
```

Decision:

```txt
system.effects
= what the effect means in Star Wars Edge / SWERPG rules

ActiveEffect Foundry
= how Foundry may apply, persist, expire, or display some effects
```

Pipeline:

```txt
Talent / Item
  system.effects[]      ← SWERPG source of truth
  system.actions[]      ← player / GM triggers

Effect Engine SWERPG
  resolves context, timing, cost, scope, direction, conditions

Foundry Bridge
  optionally produces ActiveEffect V14 data
```

## Non-negotiable rules

- `system.effects` is the canonical business source of truth.
- Foundry `ActiveEffect` is not the Talent business model.
- Never convert all Talents automatically into ActiveEffects.
- Never make `actorHooks` the standard encoding channel for Talent effects.
- Never remove or overwrite existing `system.description.*`.
- Never auto-apply low- or medium-confidence imported mappings.
- Use JavaScript vanilla, JSDoc, runtime validators, and Vitest.
- Prefer pure functions for validators and bridges.
- Prefer returning data over creating documents as side effects unless existing repo conventions clearly require side effects.

## Required Talent shape

A Talent Item must safely support:

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

Do not break existing items that lack these fields. Add safe defaults or migration logic.

## Implementation phases

### V1 strict

Implement only:

```txt
- system.effects and system.actions defaults
- activation metadata
- schemaVersion
- JS constants
- JSDoc contracts
- runtime validators
- action/effect reference validation
- minimal effect collection skeleton
- raw OggDude preservation in flags.swerpg.import.raw
- mapping metadata and warnings
- Vitest tests
- minimal UI display if sheet architecture is clear
```

Do not implement aggressive automation.

### V1.5

Add a controlled ActiveEffect bridge:

```txt
- projection of eligible effects to ActiveEffect V14 creation data
- flags.swerpg.generatedFrom traceability
- cleanup/sync helpers only after source ownership is clear
- logging of projected effects
```

### V2

Add progressively:

```txt
- assisted reactions
- temporary effects
- richer expiration handling
- advanced conditions
- user choices
- deeper dice/roll engine integration
```

## Allowed V1 effect types

V1 strict effect types:

```js
modifyDerivedStat
modifyDicePool
modifyDamage
modifyCritical
grantCareerSkill
rerollCheck
custom
```

Defer unless the required subsystems are already stable:

```js
modifyRecovery
modifyItem
applyCondition
```

Why defer:

- `modifyRecovery` needs stable recovery/rest/end-of-encounter workflows.
- `modifyItem` opens equipment, attachments, hard points, rarity, encumbrance, and modification systems.
- `applyCondition` requires a stable condition/status model.

## Constants to provide

Create or adapt the repo’s constants module. Suggested names:

```js
export const TALENT_ACTIVATIONS = Object.freeze({
  PASSIVE: "passive",
  ACTIVE: "active",
  REACTION: "reaction",
  MANUAL: "manual",
  MIXED: "mixed"
});

export const AUTOMATION_LEVELS = Object.freeze({
  NONE: "none",
  MANUAL: "manual",
  CHAT_CARD: "chat-card",
  SUGGESTED: "suggested",
  ASSISTED: "assisted",
  AUTO: "auto"
});

export const EFFECT_TYPES = Object.freeze({
  MODIFY_DICE_POOL: "modifyDicePool",
  MODIFY_DERIVED_STAT: "modifyDerivedStat",
  MODIFY_DAMAGE: "modifyDamage",
  MODIFY_CRITICAL: "modifyCritical",
  GRANT_CAREER_SKILL: "grantCareerSkill",
  REROLL_CHECK: "rerollCheck",
  CUSTOM: "custom"
});

export const DEFERRED_EFFECT_TYPES = Object.freeze({
  MODIFY_RECOVERY: "modifyRecovery",
  MODIFY_ITEM: "modifyItem",
  APPLY_CONDITION: "applyCondition"
});

export const EFFECT_MODES = Object.freeze({
  PASSIVE: "passive",
  ACTIVATED: "activated",
  REACTION: "reaction",
  MANUAL: "manual"
});

export const EFFECT_APPLICATION_STRATEGIES = Object.freeze({
  COMPUTED: "computed",
  ACTIVE_EFFECT: "activeEffect",
  CHAT_ONLY: "chatOnly",
  MANUAL: "manual"
});

export const EFFECT_TARGET_DOCUMENTS = Object.freeze({
  ACTOR: "actor",
  ITEM: "item",
  TOKEN: "token",
  ROLL: "roll"
});

export const EFFECT_DIRECTIONS = Object.freeze({
  SELF: "self",
  OUTGOING: "outgoing",
  INCOMING: "incoming",
  TARGET: "target",
  ALLY: "ally",
  AREA: "area"
});
```

Also define timings, action types, action kinds, mapping statuses, and mapping confidence values if not already present.

## Effect definition contract

Every `EffectDefinition` should support:

```js
{
  id: "unique-id-within-item",
  type: "modifyDicePool",
  enabled: true,
  source: {
    itemId: "...",
    itemUuid: "...",
    itemType: "talent",
    origin: "builder"
  },
  mode: "passive",
  timing: "beforeRoll",
  direction: "self",
  scope: {},
  application: {
    strategy: "computed",
    targetDocument: "roll",
    persist: false,
    generated: false
  },
  rankScaling: {},
  cost: {},
  changes: {},
  conditions: [],
  duration: {},
  constraints: {},
  ui: {
    label: "",
    summary: "",
    automationLevel: "assisted"
  }
}
```

Required semantic fields:

- `direction` distinguishes `self`, `outgoing`, `incoming`, `target`, `ally`, `area`.
- `application.strategy` distinguishes `computed`, `activeEffect`, `chatOnly`, `manual`.

## Action definition contract

Every `ActionDefinition` should support:

```js
{
  id: "activate-esquive",
  label: "Utiliser Esquive",
  type: "talent",
  activation: {
    kind: "incidental",
    timing: "whenTargetedByCombatCheck"
  },
  cost: {},
  target: {},
  effectRefs: ["esquive-upgrade-incoming-combat-check"],
  frequency: {},
  check: {},
  chat: {
    postOnUse: true,
    includeCost: true,
    includeEffects: true
  },
  automationLevel: "assisted"
}
```

Rule:

```txt
Action = what the user triggers.
Effect = what the system applies, proposes, computes, or displays.
```

Actions should reference effects through `effectRefs` whenever possible.

## Validation requirements

Implement validators that return:

```js
{
  valid: boolean,
  errors: string[],
  warnings: string[]
}
```

Do not throw for ordinary invalid data.

### validateEffectDefinition(effect)

Must validate:

- plain object;
- non-empty string `id`;
- allowed V1 `type`;
- deferred type warning/error according to phase;
- boolean `enabled`;
- object `source`;
- allowed `mode`;
- allowed `timing`;
- allowed `direction`;
- object `scope`;
- object `changes`, even empty for `custom`;
- allowed `application.strategy` when present;
- allowed `application.targetDocument` when present;
- allowed `ui.automationLevel` when present;
- warning if `type === "custom"` and `automationLevel === "auto"`;
- warning/error if `application.strategy === "activeEffect"` lacks enough source information for later traceability.

### validateActionDefinition(action)

Must validate:

- plain object;
- non-empty string `id`;
- non-empty string `label`;
- allowed `type`;
- object `activation`;
- allowed `activation.kind`;
- allowed `automationLevel`;
- `effectRefs` is an array when present.

### validateActionEffectReferences(effects, actions)

Must validate:

- all `action.effectRefs[]` point to existing `effect.id`;
- unknown references are errors.

## ActiveEffect bridge rules

Only project to Foundry ActiveEffect when:

```js
effect.application?.strategy === "activeEffect"
```

Bridge function should preferably return creation data:

```js
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

Rules:

- return `null` for `computed`, `chatOnly`, or `manual`;
- never generate an ActiveEffect for every Talent;
- generated data must include `flags.swerpg.generatedFrom`;
- generated ActiveEffects are not the source of truth;
- business edits must happen on the Item or SWERPG builder, not directly on generated ActiveEffects.

## Effect engine skeleton

Implement a safe first pass:

```js
export function collectApplicableEffects(actor, context) {
  return [];
}
```

Target pipeline:

```txt
1. Collect actor-owned Talent effects.
2. Collect relevant owned Item effects.
3. Filter enabled effects.
4. Filter by timing.
5. Filter by direction.
6. Filter by scope.
7. Filter by conditions where implemented.
8. Split by application.strategy.
9. Split by automationLevel.
10. Return resolved effects with applicability metadata.
```

A tested, conservative skeleton is better than broad untested automation.

## Import and mapping rules

OggDude is an input source, not the internal model.

Pipeline:

```txt
OggDude raw data
→ flags.swerpg.import.raw
→ mapping
→ system.effects
→ system.actions
```

Mapping metadata:

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

- `high`: type, scope, cost, timing, and Talent identity are explicit;
- `medium`: effect understood but user choice or context remains unresolved;
- `low`: ambiguous text, missing DieModifier context, narrative effect, or unsupported rule;
- low/medium confidence mappings must not be auto-applied.

## Canonical examples

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

## Suggested repository structure

Adapt to the existing repo. Do not create duplicate structures if equivalents exist.

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

## Minimal Vitest coverage

Required tests:

```txt
validateEffectDefinition
- accepts valid computed passive effect
- rejects missing id
- rejects unknown type
- rejects unknown direction
- rejects invalid application strategy
- warns/rejects deferred V1 types according to phase
- warns when custom uses auto automation

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
- filters by skill/scope when implemented
```

## Development workflow

Before coding:

```txt
1. Inspect the repository.
2. Identify existing Item/Talent model files.
3. Identify existing sheet architecture.
4. Identify Vitest setup.
5. Propose a short plan with files to create/modify.
```

Then implement in this order:

```txt
1. constants
2. validation utils
3. effect validator
4. action validator
5. action/effect reference validator
6. migration/defaulting logic
7. ActiveEffect bridge as pure data builder
8. effect collection skeleton
9. tests
10. minimal UI display only if architecture is clear
```

## Final acceptance checklist

- No TypeScript introduced.
- No build pipeline added.
- Descriptions preserved.
- `system.effects` and `system.actions` default safely.
- Validators return errors/warnings.
- No ActiveEffect generated for every Talent.
- ActiveEffect bridge only works for explicit `activeEffect` strategy.
- Generated ActiveEffect data contains `flags.swerpg.generatedFrom`.
- No automatic `actorHooks`.
- Low/medium confidence import mappings are not auto-applied.
- Vitest tests pass.
- JSDoc exists for public contracts.
- No duplicate model parallel to `system.effects`.

## Prompt to use when invoked

When invoked, first inspect the repository. Then answer with a short implementation plan before editing files.

Use this framing:

```txt
I will implement or review the SWERPG Talent effects model according to the skill rules:
- system.effects remains the canonical business model;
- ActiveEffects are optional generated projections;
- JavaScript vanilla + JSDoc + runtime validation + Vitest only;
- no broad automation until validators and tests are stable.
```

## Commit message

```txt
feat(talents): add canonical mechanical effects model
```

Long body:

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
