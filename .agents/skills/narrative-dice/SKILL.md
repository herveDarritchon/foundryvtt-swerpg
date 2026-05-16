---
name: narrative-dice
summary: Implement and maintain the Star Wars Edge / Genesys narrative dice system for the SWERPG Foundry VTT v13+ system.
description: Use this skill when adding, modifying, testing, or reviewing narrative dice code: dice definitions, dice pools, upgrades/downgrades, symbol cancellation, Triumph/Despair handling, Force dice, roll dialogs, chat rendering, action integration, and Foundry VTT roll compatibility.
license: project-internal
compatibility:
  - Claude Code
  - Codex
  - OpenCode
metadata:
  project: swerpg
  platform: Foundry VTT v13+
  language: JavaScript ES2022
  domain: Star Wars Edge RPG narrative dice
---

# Narrative Dice System Skill

## Purpose

Implement the SWERPG narrative dice system without flattening it into a traditional numeric roll.

The system must preserve the Star Wars Edge / Genesys result model:

- success versus failure determines whether the action succeeds.
- advantage versus threat determines secondary narrative effects.
- triumph and despair remain visible special results.
- force points are handled separately from normal check symbols.
- dice pools are built, modified, rolled, resolved, rendered, and tested as first-class domain logic.

## Non-negotiable rules

1. Do not model a narrative roll as a single number.
2. Do not collapse advantage/threat into success/failure.
3. Do not cancel triumph or despair themselves.
4. Do not hide triumph/despair after computing net success.
5. Do not put dice-resolution logic in Handlebars templates.
6. Do not hard-code user-facing strings; use i18n keys.
7. Do not use direct `console.xxx`; use `logger`.
8. Keep pure dice logic testable without Foundry globals.
9. Keep Foundry integration thin: it adapts data, renders UI, creates chat messages, or persists flags.
10. Add or update Vitest tests for every dice rule change.

## Dice domain model

### Core dice types

Use these canonical dice identifiers unless the existing codebase already exposes equivalent constants:

| Die | ID | Faces | Symbol | Color role | Axis |
|---|---|---:|---|---|---|
| Ability | `ability` | 8 | `dA` | green | positive |
| Proficiency | `proficiency` | 12 | `dP` | yellow | positive |
| Boost | `boost` | 6 | `dB` | blue | positive |
| Difficulty | `difficulty` | 8 | `dD` | purple | negative |
| Challenge | `challenge` | 12 | `dC` | red | negative |
| Setback | `setback` | 6 | `dS` | black | negative |
| Force | `force` | 12 | `dF` or existing project symbol | white | force |

If the project already defines dice constants in `module/dice/` or `CONFIG.SWERPG.DICE`, extend those instead of creating a second registry.

### Symbol identifiers

Use stable internal symbol keys:

```js
success
advantage
triumph
failure
threat
despair
lightside
darkside
```

Do not use translated strings as symbol identifiers.

## Canonical resolution rules

### Normal check symbols

Count raw symbols first:

```js
{
  success: number,
  failure: number,
  advantage: number,
  threat: number,
  triumph: number,
  despair: number,
}
```

Then compute net values:

```js
netSuccess = success + triumph - failure - despair
netAdvantage = advantage - threat
```

Important:

- Triumph contributes one success to the pass/fail axis.
- Despair contributes one failure to the pass/fail axis.
- Triumph itself is not cancelled by despair.
- Despair itself is not cancelled by triumph.
- A roll succeeds only if `netSuccess > 0`.
- A roll can succeed with threat.
- A roll can fail with advantage.
- A roll can have both triumph and despair.

### Force symbols

Force results do not cancel success/failure or advantage/threat.

Track Force results separately:

```js
force: {
  light: number,
  dark: number,
}
```

Do not mix `lightside` / `darkside` into `netAdvantage` or `netSuccess`.

## Dice pool construction

### Characteristic + skill pool

When building a skill check from characteristic and skill rank:

```js
const base = Math.max(characteristic, skillRank)
const upgrades = Math.min(characteristic, skillRank)

ability = base - upgrades
proficiency = upgrades
```

Examples:

| Characteristic | Skill | Result |
|---:|---:|---|
| 3 | 0 | 3 ability |
| 3 | 1 | 2 ability + 1 proficiency |
| 3 | 2 | 1 ability + 2 proficiency |
| 2 | 4 | 0 ability + 2 proficiency |

Do not create more positive dice than the larger of the two values.

### Difficulty levels

Use the project’s official difficulty table if it exists. Otherwise use the standard base mapping:

| Difficulty | Difficulty dice | Challenge dice |
|---|---:|---:|
| `simple` | 0 | 0 |
| `easy` | 1 | 0 |
| `average` | 2 | 0 |
| `hard` | 3 | 0 |
| `daunting` | 4 | 0 |
| `formidable` | 5 | 0 |

Do not silently introduce expanded/homebrew difficulty names unless the project configuration explicitly supports them.

### Upgrade rules

Positive upgrade:

1. Convert one `ability` into one `proficiency` while ability dice remain.
2. If no ability dice remain, add one `ability`, then continue upgrades if more upgrades remain.

Negative upgrade:

1. Convert one `difficulty` into one `challenge` while difficulty dice remain.
2. If no difficulty dice remain, add one `difficulty`, then continue upgrades if more upgrades remain.

This matters for multiple upgrades on small pools.

### Downgrade rules

Positive downgrade:

1. Convert one `proficiency` into one `ability` while proficiency dice remain.
2. Do not reduce total positive dice unless an explicit rule says to remove dice.

Negative downgrade:

1. Convert one `challenge` into one `difficulty` while challenge dice remain.
2. Do not reduce total negative dice unless an explicit rule says to remove dice.

### Boost and setback

Boost and setback are additive/removal dice, not upgrades.

Use explicit operations:

```js
addBoost(count)
removeBoost(count)
addSetback(count)
removeSetback(count)
```

Clamp counts at zero.

## Recommended module structure

Prefer this separation when adding or refactoring dice code:

```text
module/dice/
  dice-types.mjs          # canonical dice faces, symbols, colors, labels
  dice-pool.mjs           # pure pool construction and mutation rules
  dice-result.mjs         # raw counts, net result, interpretation helpers
  dice-roll.mjs           # Foundry Roll adapter
  dice-dialog.mjs         # ApplicationV2 UI for building pools
  dice-chat.mjs           # chat message rendering adapter
  dice-analytics.mjs      # optional analytics, if enabled by settings

templates/dice/
  roll-message.hbs
  dice-dialog.hbs

tests/dice/
  dice-pool.test.mjs
  dice-result.test.mjs
  dice-roll.test.mjs
```

Do not duplicate dice face tables in several files. Keep one source of truth.

## Pure logic first

When implementing a dice change, write the pure logic first.

Good:

```js
export function resolveNarrativeSymbols(raw) {
  const success = Number(raw.success ?? 0)
  const failure = Number(raw.failure ?? 0)
  const triumph = Number(raw.triumph ?? 0)
  const despair = Number(raw.despair ?? 0)
  const advantage = Number(raw.advantage ?? 0)
  const threat = Number(raw.threat ?? 0)

  return {
    raw: { success, failure, triumph, despair, advantage, threat },
    netSuccess: success + triumph - failure - despair,
    netAdvantage: advantage - threat,
    triumph,
    despair,
    isSuccess: success + triumph - failure - despair > 0,
  }
}
```

Bad:

```js
// Bad: mixes DOM, Foundry, i18n, and resolution.
html.find('.success').text(success - failure)
ChatMessage.create({ content: `Success: ${success - failure}` })
```

## Foundry Roll integration

### Roll adapter responsibility

The Foundry-specific roll class or adapter may:

- translate a `SwerpgDicePool` into a Foundry formula or custom roll process.
- evaluate dice.
- collect individual face results.
- call the pure resolver.
- attach structured data to message flags.

It must not be the only place where narrative rules exist.

### Chat flags

When creating a chat message, preserve structured roll data in flags. Recommended shape:

```js
flags: {
  swerpg: {
    dice: {
      pool: pool.serialize(),
      rawSymbols,
      result: {
        netSuccess,
        netAdvantage,
        triumph,
        despair,
        force: { light, dark },
        isSuccess,
      },
      context: {
        actorId,
        itemId,
        skill,
        characteristic,
        difficulty,
      },
    },
  },
}
```

Do not rely only on rendered HTML for future automation.

## UI rules

### Dice dialog

A dice dialog should:

- show each die type separately.
- allow add/remove boost and setback.
- allow upgrades/downgrades of positive and negative dice.
- show the current pool preview.
- validate empty or absurd pools before rolling.
- use i18n labels.
- remain keyboard-accessible.
- avoid fragile CSS selectors in handlers.

For Foundry v13+, prefer ApplicationV2 + HandlebarsApplicationMixin if the current UI architecture supports it. If an existing dice dialog is still legacy, migrate deliberately and test it.

### Handlebars templates

Templates display prepared data only.

Allowed:

```hbs
<span class='dice-symbol dice-symbol--success'>{{result.netSuccess}}</span>
```

Not allowed:

```hbs
{{subtract success failure}}
{{#if (gt (add success triumph) failure)}}...{{/if}}
```

Precompute values in JS.

### Chat rendering

Chat output should display:

- dice pool rolled.
- raw symbols.
- net success / failure.
- net advantage / threat.
- triumph count.
- despair count.
- force points, if applicable.
- actor/action context when available.

Do not hide negative secondary outcomes on a successful roll.

## Action and item integration

When an actor action, skill, weapon, talent, or item triggers a roll:

1. Extract characteristic, skill rank, difficulty, item/talent modifiers.
2. Build a `SwerpgDicePool` with pure methods.
3. Apply upgrades/downgrades/additional dice explicitly.
4. Open the dialog unless the caller passes `skipDialog` or equivalent.
5. Roll through the dice adapter.
6. Store structured result in chat flags.
7. Process automation only from structured result data.

Do not let a weapon, talent, or actor sheet manually assemble a narrative result. They should contribute modifiers to the pool.

## Symbol interpretation

The system may provide narrative suggestions, but they must remain suggestions unless a rule explicitly automates them.

Examples:

- advantage may recover strain, add boost, reveal a detail, or improve position.
- threat may inflict strain, add setback, consume time, or introduce complication.
- triumph may trigger a critical hit or major narrative opportunity.
- despair may trigger a severe complication or critical failure effect.

Do not auto-spend advantage/threat globally unless a specific action rule or user choice requests it.

## Testing requirements

### Unit tests: pool construction

Test at minimum:

- characteristic 3 / skill 0 → 3 ability.
- characteristic 3 / skill 2 → 1 ability + 2 proficiency.
- characteristic 2 / skill 4 → 2 proficiency.
- each standard difficulty maps correctly.
- boost/setback add and remove clamp at zero.
- upgrades when ability/difficulty dice exist.
- upgrades when no ability/difficulty dice remain.
- downgrades preserve total dice.
- serialization/deserialization round-trips.

### Unit tests: symbol resolution

Test at minimum:

- success and failure cancel.
- advantage and threat cancel.
- failure with zero net success is failure.
- success with threat is possible.
- failure with advantage is possible.
- triumph adds success but remains visible.
- despair adds failure but remains visible.
- triumph and despair can coexist.
- force symbols remain separate.

Example:

```js
expect(resolveNarrativeSymbols({ success: 1, failure: 2, advantage: 3, threat: 1 })).toMatchObject({
  netSuccess: -1,
  netAdvantage: 2,
  isSuccess: false,
})
```

### Integration tests: Foundry adapter

Use mocks for Foundry APIs. Verify:

- roll data is transformed into raw symbols.
- flags preserve pool and result data.
- `toMessage()` uses the dice chat template or the project’s canonical chat renderer.
- private/public roll options are preserved.

### UI/manual scenarios

For dice UI changes, provide manual checks:

- open a skill roll dialog from an actor sheet.
- add boost/setback dice.
- upgrade ability and difficulty.
- roll and verify chat displays symbols and net values.
- verify advantage/threat are visible even when success/failure is resolved.
- verify keyboard focus and labels on controls.

## Performance guidance

- Dice resolution must be O(number of rolled dice), not dependent on UI size.
- Cache rendered symbols/icons if rendering becomes expensive.
- Avoid repeated `game.settings.get()` inside tight roll loops.
- Avoid chat rendering work until after resolution succeeds.
- Do not store unlimited analytics; cap history if analytics are enabled.

## Security and robustness

- Clamp all user-controlled dice counts to safe ranges.
- Reject or warn on negative dice counts.
- Never evaluate user-provided JavaScript from roll metadata.
- Sanitize or localize user-facing labels.
- Treat imported item/talent modifiers as untrusted data: normalize numeric fields before applying them to pools.

## Common anti-patterns

### Wrong: cancelling triumph/despair as special symbols

```js
const special = triumph - despair
```

Triumph and despair are independent counts. They may both remain after a roll.

### Wrong: success if `netSuccess >= 0`

```js
const isSuccess = netSuccess >= 0
```

A check needs at least one uncancelled success. Use `netSuccess > 0`.

### Wrong: hardcoding dice labels in templates

```hbs
<button>Boost</button>
```

Use i18n:

```hbs
<button>{{localize 'SWERPG.Dice.Boost'}}</button>
```

### Wrong: rebuilding dice rules in sheets

```js
// Bad: CharacterSheet should not contain core dice resolution.
const result = actor.system.skills.cool.rank - difficulty
```

Sheets call actions/services that build pools and roll.

## Implementation checklist

Before finalizing dice-related code, verify:

- [ ] one canonical dice definition registry is used.
- [ ] pure pool construction exists and is tested.
- [ ] pure symbol resolution exists and is tested.
- [ ] triumph/despair handling is correct.
- [ ] force dice are separate from normal checks.
- [ ] Foundry integration stores structured flags.
- [ ] chat output displays raw and net outcomes.
- [ ] UI labels are localized.
- [ ] no logic-heavy Handlebars templates.
- [ ] no direct `console.xxx` outside logger.
- [ ] Vitest tests cover core rule changes.
- [ ] manual UI checks are listed when UI changed.

## Commit message guidance

Use conventional commits:

```text
feat(dice): add narrative pool upgrade handling
fix(dice): preserve triumph and despair in resolved results
test(dice): cover advantage and threat cancellation
docs(dice): document force dice resolution rules
refactor(dice): extract pure result resolver
```

Use `BREAKING CHANGE:` if a public roll API, chat flag shape, or persisted roll schema changes.

## Token budget policy

Do not send large context to an LLM unless reasoning is required.

For deterministic tasks:
- execute with shell, Git, npm, Vitest, Playwright or CI;
- collect only the useful output;
- call an LLM only if interpretation, decision or correction is needed.

For failures:
- send only the failing command;
- send only the relevant error block;
- send only the files directly involved;
- ask for the smallest correction.
