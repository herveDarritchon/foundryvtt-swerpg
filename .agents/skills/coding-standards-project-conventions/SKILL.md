---
name: coding-standards-project-conventions
description: Apply SWERPG coding standards, project conventions, task discipline, documentation expectations, tests, i18n, logging, and review-ready output when modifying the Star Wars Edge RPG Foundry VTT v13+ system.
license: project-internal
compatibility:
  - claude-code
  - codex
  - opencode
metadata:
  project: swerpg
  stack: Foundry VTT v13+, JavaScript ES2022, ApplicationV2, TypeDataModel, Handlebars, Vitest
  scope: coding standards, project conventions, task execution, review discipline
---

# SWERPG Coding Standards & Project Conventions

Use this skill whenever you create, modify, refactor, review, or test code in the `swerpg` Foundry VTT system.

This is not a style essay. It is an operational contract for code agents.

## Core mandate

Before touching code:

1. Identify the goal: bugfix, feature, refactor, test, docs, migration, or cleanup.
2. Identify the files likely impacted before editing.
3. Separate domain logic from Foundry adapters.
4. Preserve existing public APIs, Foundry paths, sheet keys, document paths, and data model contracts unless explicitly asked to change them.
5. Never mix unrelated refactor and feature work in the same change.
6. Add or update tests for every meaningful rule, calculation, transformation, or bugfix.
7. Keep the change small, reviewable, and reversible.

If the requested change implies an anti-pattern, implement the nearest clean alternative and clearly state the assumption.

## Required response shape for code tasks

When delivering code-oriented work, structure the answer like this:

1. Summary: 2–4 sentences describing the objective and what changes.
2. Modified tree: concise list of touched or created files.
3. Complete patches: one code block per file, with `path: ...` as the first line.
4. i18n: keys added or modified in `lang/en.json` and `lang/fr.json`, or state `No i18n changes`.
5. Tests: Vitest tests added/updated and manual scenarios for UI work.
6. Commands: exact scripts to run, usually build, lint/format, tests.
7. Commit message: Conventional Commit; include `BREAKING CHANGE:` when needed.
8. Assumptions & follow-ups: decisions made under ambiguity and non-blocking future work.

For simple questions, a shorter answer is fine, but do not skip tests and risks when proposing code.

## Language and runtime

Use JavaScript ES2022 only.

Allowed:

- `.mjs` modules
- `import` / `export`
- JSDoc for public contracts
- Foundry VTT v13+ APIs
- ApplicationV2
- HandlebarsApplicationMixin
- TypeDataModel
- Vitest

Forbidden:

- TypeScript
- `.d.ts`
- `require`
- `var`
- ES5-style patterns
- direct `console.xxx` outside `module/utils/logger.mjs`
- hard-coded UI strings
- direct mutation of Foundry document data

## Project folders

Respect this project organization.

```text
module/
  applications/       # ApplicationV2, sheets, config apps, sidebar apps
  models/             # TypeDataModel classes for actors/items/system data
  config/             # SYSTEM, enums, constants, config registries
  documents/          # Foundry document extensions
  hooks/              # Foundry hook handlers
  canvas/             # Canvas-related integrations
  dice/               # Narrative dice system
  helpers/            # Generic helpers
  lib/                # Pure domain logic: rules, calculations, conversions
  ui/                 # Reusable UI components
  utils/              # logger, flags, i18n helpers, system utilities
  chat.mjs            # Chat message integration
  socket.mjs          # Socket integration
styles/               # LESS and theme variables
templates/            # Handlebars templates and partials
lang/                 # en.json and fr.json
_source/              # YAML source data for compendiums
packs/                # Compiled LevelDB compendiums
tests/                # Vitest tests
```

Do not invent new top-level folders unless the user asks for a structural change.

## Naming conventions

Use these consistently:

- JS files: `kebab-case.mjs`
- classes: `PascalCase`
- functions and variables: `camelCase`
- constants for global invariants: `SCREAMING_SNAKE_CASE`
- booleans: `isSomething`, `hasSomething`, `canSomething`, `shouldSomething`
- data models: `*Model`
- services: `*Service`
- config modules: `*Config`
- actions: `*Action`
- sheets: `*Sheet`
- Handlebars partials: `_partial-name.hbs`

Class names, sheet keys, pack IDs, hook names, data paths, and public exports are stable contracts. Do not rename them casually.

## Separation of responsibilities

Always design in two layers.

### Pure domain layer

Put game rules, calculations, validations, and conversions in pure modules, usually under `module/lib/`, `module/rules/`, or another existing pure-domain folder.

Pure domain code must not depend on:

- `game`
- `ui`
- `canvas`
- `foundry`
- `Hooks`
- `CONFIG`
- `Actor`
- `Item`
- `ChatMessage`
- DOM APIs

It should accept plain objects and return plain values or new plain objects.

### Foundry adapter layer

Foundry-facing code lives in applications, documents, hooks, canvas, chat, socket, or settings modules.

It may:

- read and update Foundry documents;
- prepare plain inputs for pure domain functions;
- apply domain results via `document.update(...)` or controlled Foundry APIs;
- render UI;
- call hooks;
- create chat messages;
- handle dice rolls.

It should not contain heavy game-rule logic that could be tested without Foundry.

## Foundry document data rules

Never mutate persisted document data directly.

Forbidden:

```js
this.document.system.foo = 42
actor.system.skills.cool.rank++
item.system.price.value = 100
```

Use:

```js
await this.document.update({ 'system.foo': 42 })
```

Use `update()` when the change is real, persistent, hook-triggering, and should sync to other clients.

Use `updateSource()` only for source preparation, migrations, factories, or test setup where persistence and hooks are intentionally not triggered.

In `prepareDerivedData()`, do not call `update()`, create documents, delete documents, render UI, emit sockets, or write to unrelated documents. Derived data preparation must remain deterministic and side-effect safe.

## ApplicationV2 and sheets

For UI sheets:

- Actors must extend `SwerpgBaseActorSheet`.
- Items must extend `SwerpgBaseItemSheet`.
- Use ApplicationV2 patterns.
- Use `static DEFAULT_OPTIONS`, not legacy `defaultOptions` unless an existing class still requires compatibility.
- Use `_prepareContext(options)`, not `getData()`.
- Use `_preparePartContext(partId, context, options)` for part-specific data.
- Use `static PARTS` for multi-part sheets.
- Use `data-action` for actions.
- Keep DOM access scoped to `html`, `this.element`, or the app root. No global `document.querySelector`.
- Do not put business logic in Handlebars.

The minimum sheet context should include:

```js
context.document = this.document
context.system = this.document.system
context.config = game.system.config
context.isOwner = this.document.isOwner
```

Preserve the stable CSS contract:

```text
.swerpg.sheet
.sheet-header
.sheet-tabs
.sheet-body
.sheet-footer
```

If a UI task changes one of these contracts, document it as a breaking integration change.

## Handlebars and templates

Templates are presentation only.

Do:

- bind form fields using real `system.*` paths;
- use `data-action` for actions;
- use localized labels;
- extract duplicated markup into partials;
- precompute complex display values in JS.

Do not:

- perform rule calculations in HBS;
- add complex nested `lookup` chains;
- rely on hard-coded strings;
- create hidden side effects through template helpers.

Use localization:

```hbs
{{localize 'SWERPG.ActorSheet.Title'}}
```

or project helpers if already defined.

## i18n rules

No user-facing hard-coded strings in JS or HBS.

Add or update keys in both:

```text
lang/en.json
lang/fr.json
```

Use the key shape:

```text
SWERPG.Domain.Subdomain.Key
```

Examples:

```text
SWERPG.ActorSheet.Title
SWERPG.Item.Weapon.Range
SWERPG.Dialog.DeleteItem.Content
```

If the task is purely internal and has no user-facing string, state `No i18n changes`.

## Logging rules

Never call `console.xxx` directly outside `module/utils/logger.mjs`.

Use:

```js
import { logger } from '../utils/logger.mjs'

logger.debug('Prepared actor context', { actorId: actor.id })
logger.info('Import completed', stats)
logger.warn('Missing optional mapping', key)
logger.error('Import failed', error)
```

The logger is the debug gate. Do not reintroduce `CONFIG.debug?.foo` wrappers around `console.xxx`.

For expensive debug-only calculations:

```js
if (logger.isDebugEnabled()) {
  logger.debug('Expensive debug payload', buildDebugPayload())
}
```

## Error handling

Use `try/catch` where failure is expected or recoverable.

Rules:

- Do not swallow errors silently.
- Use `logger.error()` for unexpected failures.
- Use `ui.notifications.error()` only for user-facing errors in Foundry-facing code.
- Pure domain functions should throw typed or clearly messaged errors when invalid input makes computation impossible.
- Do not mix user notification logic into pure domain modules.

## Style rules

Write code that would pass ESLint and Prettier.

Mandatory:

- `const` by default;
- `let` only when reassignment is needed;
- never `var`;
- `===` and `!==`;
- no parameter reassignment;
- no unused variables;
- ES module imports only;
- imports grouped and ordered consistently;
- 2-space indentation;
- single quotes in JS;
- trailing commas;
- readable names over clever short names.

Prefer `async/await` over `.then()` chains. Always handle promise rejections.

## Comments and JSDoc

Comment intent, constraints, public contracts, and non-obvious decisions.

Do not comment obvious statements.

Add JSDoc for:

- public APIs;
- exported functions;
- services;
- data models;
- hooks exposed as extension points;
- non-trivial handlers;
- complex pure domain functions.

Minimum JSDoc for public/non-trivial functions:

```js
/**
 * Compute the total soak value from base brawn and armor soak.
 * @param {{ brawn: number, armorSoak?: number }} input - Plain input values.
 * @returns {number} Non-negative soak value.
 * @throws {TypeError} If brawn is not numeric.
 */
export function calcSoak(input) {
  // ...
}
```

Use `@typedef` for complex plain-object contracts.

## Testing rules

Every new or changed rule must be testable.

Prioritize Vitest tests for pure domain logic:

- dice formulas;
- threshold calculations;
- soak, defense, wounds, strain;
- XP calculations;
- mappings and imports;
- state transitions;
- data transformations;
- bug reproductions.

Rules:

1. For a bugfix, write or update a failing test that reproduces the bug before the fix.
2. For a feature, add tests for normal, boundary, and invalid cases.
3. Do not mock Foundry for pure logic. If a test needs heavy Foundry mocks, the logic probably belongs in a pure module.
4. UI changes require at least manual scenarios, and automated tests if the behavior is stable enough.
5. Public API changes require tests and documentation updates.

Example test:

```js
// path: tests/lib/calc-soak.test.mjs
import { describe, expect, it } from 'vitest'

import { calcSoak } from '../../module/lib/calc-soak.mjs'

describe('calcSoak', () => {
  it('combines brawn and armor soak', () => {
    expect(calcSoak({ brawn: 3, armorSoak: 2 })).toBe(5)
  })

  it('never returns a negative value', () => {
    expect(calcSoak({ brawn: -2, armorSoak: 0 })).toBe(0)
  })
})
```

## Documentation rules

Update documentation when the code change affects:

- architecture;
- public APIs;
- workflows;
- imports;
- settings;
- data model paths;
- compendium source format;
- test strategy;
- module integration contracts;
- sheet CSS/HTML contracts.

Do not create large retrospective documents for tiny code changes. Prefer concise targeted updates.

When creating a task plan:

- state scope and non-scope;
- list impacted files;
- split work into reviewable phases;
- define acceptance criteria;
- define tests and manual validation;
- identify risks and rollback options;
- avoid vague “improve quality” tasks.

When documenting a completed implementation:

- say what changed;
- list files touched;
- explain decisions;
- include validation commands and results;
- document known limitations.

## Task discipline

Before modifying code:

- inspect existing patterns near the target files;
- identify whether the change belongs to domain logic or a Foundry adapter;
- identify existing tests;
- identify data model paths involved;
- identify i18n keys involved;
- check whether the change affects public contracts.

During implementation:

- keep the patch focused;
- avoid opportunistic cleanup outside the requested scope;
- prefer small pure helpers over large methods;
- group related document updates into a single `update()`;
- avoid noisy logging;
- preserve existing APIs unless there is an explicit migration.

After implementation:

- run or recommend the minimum validation commands;
- add/update tests;
- update docs if contracts changed;
- provide a conventional commit message;
- call out assumptions and follow-ups.

## Public API and contract changes

Do not change a public API without:

- explaining why;
- updating all internal callers;
- updating tests;
- updating documentation;
- marking breaking changes where appropriate;
- providing migration notes when relevant.

Public contracts include:

- exported module APIs;
- `swerpg.api` shape;
- data model paths;
- compendium IDs;
- pack IDs;
- sheet registration IDs;
- hook names;
- CSS/HTML classes used by modules;
- template paths;
- i18n keys used externally.

## Git and commits

Use Conventional Commits:

```text
feat: add talent purchase validation
fix: prevent armor mapper from dropping soak value
refactor: isolate skill rank calculation
style: format sheet templates
test: cover weapon range mapping
docs: document importer extension workflow
build: update vitest config
```

If breaking:

```text
feat!: rename weapon range canonical keys

BREAKING CHANGE: weapon range values now use canonical SWERPG keys instead of OggDude labels.
```

## Pull request quality bar

A code change is not review-ready unless:

- it is focused;
- lint/format are expected to pass;
- tests are added or updated when behavior changes;
- no hard-coded user strings are introduced;
- UI changes include basic accessibility;
- no direct `console.xxx` calls are introduced;
- no direct document data mutation is introduced;
- public contracts are preserved or documented;
- the response includes validation commands.

## Anti-patterns to reject or rewrite

Do not implement these patterns:

- TypeScript migration inside this JS project;
- direct `console.log` or `console.debug`;
- direct mutation of `this.document.system`;
- business logic in `.hbs` templates;
- `getData()` for ApplicationV2 sheets;
- `document.querySelector` from sheets;
- writing documents from `prepareDerivedData()`;
- updating on every input event without debounce;
- changing API contracts without tests and docs;
- mixing broad refactor with unrelated feature implementation;
- adding new `system.*` paths without checking TypeDataModel and migration needs;
- leaving dead code or unused imports;
- adding UI strings without i18n.

## Minimal checklists

### Any code task

- [ ] Files impacted identified.
- [ ] Existing patterns inspected.
- [ ] Pure domain logic separated from Foundry adapter.
- [ ] No public contract broken unintentionally.
- [ ] Tests added or updated where behavior changes.
- [ ] i18n updated if user-facing strings changed.
- [ ] Logger used instead of console.
- [ ] Validation commands provided.

### Bugfix

- [ ] Bug reproduced or described precisely.
- [ ] Regression test added when feasible.
- [ ] Fix is minimal.
- [ ] Similar patterns checked nearby.

### Feature

- [ ] Data model impact checked.
- [ ] UI impact checked.
- [ ] i18n impact checked.
- [ ] Tests cover normal and edge cases.
- [ ] Manual validation scenario included if UI.

### Refactor

- [ ] No behavior change intended.
- [ ] Existing tests still cover behavior.
- [ ] Refactor does not rename public contracts unless explicit.
- [ ] Commit message uses `refactor:`.

### UI change

- [ ] ApplicationV2 patterns respected.
- [ ] Templates stay presentational.
- [ ] Actions use `data-action`.
- [ ] DOM access stays scoped.
- [ ] Labels and titles are accessible.
- [ ] CSS/HTML stable contract preserved.

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
