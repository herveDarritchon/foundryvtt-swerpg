---
name: logging-diagnostics
description: Use this skill when modifying, auditing, debugging, or reviewing logging and diagnostics in the SWERPG Foundry VTT system. It enforces the centralized logger strategy, migration rules from console/CONFIG.debug, diagnostic conventions, validation commands, and tests.
license: proprietary
compatibility:
  - claude-code
  - codex
  - opencode
metadata:
  project: foundryvtt-sw-edge
  system: swerpg
  foundry: "v13+"
  language: javascript-es2022
  primary_paths:
    - module/utils/logger.mjs
    - module/**/*.mjs
    - tests/utils/logger*.spec.*
    - documentation/DEVELOPER_GUIDE_LOGGING.md
---

# Logging & Diagnostics Skill

## Purpose

Apply this skill whenever a task touches logging, diagnostics, debug output, migration from `console.xxx`, or observability in the SWERPG Foundry VTT system.

The project uses a centralized logger at:

```text
module/utils/logger.mjs
```

The rule is simple:

```text
No direct console.xxx in runtime system code.
Use logger.xxx everywhere outside logger.mjs.
```

This skill is not a general logging essay. It is the operational contract for code agents.

---

## Non-negotiable rules

### Always do

- Import the centralized logger from the correct relative path.
- Use `logger.error()` for critical failures and exceptions.
- Use `logger.warn()` for abnormal but recoverable states.
- Use `logger.info()` for meaningful system lifecycle information.
- Use `logger.debug()` for detailed diagnostic data.
- Use `logger.isDebugEnabled()` before expensive diagnostic work.
- Keep runtime logs contextual and structured.
- Validate with grep after any logging change.
- Add or update tests when changing logger behavior.

### Never do

- Do not use `console.log`, `console.info`, `console.warn`, `console.error`, or `console.debug` directly in `module/**`, except inside `module/utils/logger.mjs`.
- Do not wrap `console.xxx` with `if (CONFIG.debug?.something)`.
- Do not reintroduce `CONFIG.debug.*` as the logging gate.
- Do not log secrets, passwords, auth tokens, private file paths, or ZIP contents.
- Do not mix a logging migration with unrelated refactor or feature work.
- Do not remove error or warning logs just to quiet tests.
- Do not silence caught exceptions without logging useful context.

---

## Logger API contract

Assume this public API exists and must remain stable unless the task explicitly changes the logger itself:

```js
import { logger } from '../utils/logger.mjs'

logger.enableDebug()
logger.disableDebug()
logger.setDebug(true)
logger.isDebugEnabled()

logger.error('Critical failure', { id, error })
logger.warn('Recoverable issue', { id })
logger.info('System lifecycle event', { module: 'core' })
logger.debug('Detailed diagnostic data', { context })

logger.group('Diagnostic group')
logger.groupCollapsed('Collapsed group')
logger.groupEnd()
logger.table(rows)
logger.time('operation-name')
logger.timeEnd('operation-name')
logger.trace('Trace marker')
logger.assert(condition, 'Assertion failed', { context })
```

Current visibility policy:

```text
error / warn: visible even when debug is disabled
info / debug / log / group / table / time / trace: debug-only
```

If changing this policy, update tests and documentation in the same patch.

---

## Import path rules

Use the shortest correct relative import.

Common paths:

```js
// From module/applications/sheets/
import { logger } from '../../utils/logger.mjs'

// From module/documents/
import { logger } from '../utils/logger.mjs'

// From module/lib/talents/
import { logger } from '../../utils/logger.mjs'

// From module/helpers/
import { logger } from '../utils/logger.mjs'

// From module/importer/items/
import { logger } from '../../utils/logger.mjs'

// From module/importer/mappings/
import { logger } from '../../utils/logger.mjs'

// From swerpg.mjs
import { logger } from './module/utils/logger.mjs'
```

If unsure, inspect neighboring files in the same directory and copy the established import style.

---

## Choosing the correct log level

### `logger.error()`

Use for failures that break or abort an operation.

Examples:

```js
try {
  await actor.update(updateData)
} catch (error) {
  logger.error('[SwerpgActor] Actor update failed', { actorId: actor.id, error })
  throw error
}
```

Rules:

- Keep the original error object.
- Re-throw if the caller must know the operation failed.
- Include enough context to reproduce the issue.

### `logger.warn()`

Use for abnormal but recoverable states.

Examples:

```js
if (!mappedSkillId) {
  logger.warn('[OggDudeImporter] Unknown skill code ignored', { code })
  return null
}
```

Rules:

- Warnings are visible outside debug mode.
- Do not use `warn` for noisy progress logs.
- Prefer a clear reason and fallback value.

### `logger.info()`

Use for high-level lifecycle events.

Examples:

```js
logger.info('[Swerpg] System initialization completed', { developmentMode })
```

Rules:

- `info` is debug-only in this project.
- Do not spam info logs inside loops or frequent UI renders.

### `logger.debug()`

Use for detailed diagnostic data.

Examples:

```js
logger.debug('[CharacterSheet] Context prepared', {
  actorId: this.document.id,
  tabGroups: this.tabGroups,
})
```

Rules:

- Use structured objects for data.
- Avoid logging entire Foundry documents unless strictly needed.
- Guard expensive object construction with `logger.isDebugEnabled()`.

---

## Expensive diagnostics

If a diagnostic value is expensive to compute, guard it:

```js
if (logger.isDebugEnabled()) {
  const dependencyGraph = buildTalentDependencyGraph(actor)
  logger.debug('[TalentTree] Dependency graph', dependencyGraph)
}
```

Do not write:

```js
logger.debug('[TalentTree] Dependency graph', buildTalentDependencyGraph(actor))
```

because the expensive function may run even when the debug output is disabled.

---

## Migration from legacy logging

### Simple replacements

```js
// Before
console.error('Failed import', error)
console.warn('Unknown category', category)
console.info('Import started')
console.log('Loaded data')
console.debug('Context', context)

// After
logger.error('[Importer] Failed import', { error })
logger.warn('[Importer] Unknown category', { category })
logger.info('[Importer] Import started')
logger.info('[Importer] Loaded data')
logger.debug('[Importer] Context', context)
```

### `CONFIG.debug` replacements

```js
// Before
if (CONFIG.debug?.sheets) {
  console.debug('[CharacterSheet] Context', context)
}

// After
logger.debug('[CharacterSheet] Context', context)
```

### Special debug visualizations

For runtime debug-only visualizations, use the logger gate:

```js
if (logger.isDebugEnabled()) {
  this._visualizeEngagementRanges()
}
```

If a specific visual debug flag is still required for game UX, keep it deliberately and document it. Do not use it as a logging replacement.

---

## Diagnostics message format

Prefer this shape:

```js
logger.debug('[ClassName] Short action phrase', {
  actorId,
  itemId,
  type,
  result,
})
```

Good examples:

```js
logger.warn('[ArmorImporter] Unknown armor category; using fallback', {
  rawCategory,
  fallback: 'medium',
})

logger.error('[OggDudeDataElement] ZIP path rejected', {
  path,
  reason: 'path-traversal',
})
```

Bad examples:

```js
logger.debug('debug')
logger.warn('oops')
logger.error(actor)
logger.debug('all data', hugeParsedXml)
```

---

## Sensitive data policy

Never log:

- passwords;
- access keys;
- auth tokens;
- full user file paths unless needed for a local-only developer diagnostic;
- complete ZIP/XML payloads;
- complete actor/item documents when a small subset is enough;
- private chat/message content unless the feature is explicitly about that content.

When in doubt, log identifiers, counts, types, and sanitized excerpts.

---

## Runtime initialization

The logger is configured during system initialization.

Expected pattern in `swerpg.mjs`:

```js
logger.setDebug(swerpg.developmentMode)

swerpg.api = {
  // ...
  logger,
}
```

Do not create a second logger instance. Do not configure debug mode independently inside feature modules.

---

## Tests expected

### Logger behavior tests

When changing `module/utils/logger.mjs`, cover at least:

- debug enabled: `debug`, `info`, `log` emit;
- debug disabled: `debug`, `info`, `log` do not emit;
- debug disabled: `warn` and `error` still emit;
- `setDebug`, `enableDebug`, `disableDebug`, `isDebugEnabled`;
- advanced methods if modified: `group`, `table`, `time`, `trace`, `assert`.

### Migration safety tests

Add or preserve a regression test that asserts no direct console calls exist in runtime modules:

```js
import { glob } from 'glob'
import { readFile } from 'node:fs/promises'
import { describe, expect, test } from 'vitest'

describe('logging policy', () => {
  test('runtime modules do not call console directly outside logger.mjs', async () => {
    const files = await glob('module/**/*.mjs', {
      ignore: ['**/logger.mjs', '**/tests/**'],
    })

    for (const file of files) {
      const content = await readFile(file, 'utf8')
      expect(content).not.toMatch(/console\.(log|warn|error|info|debug)/)
    }
  })
})
```

### Feature tests

When logging is part of a feature, do not over-test the log text. Test the behavior first, and spy on `logger.warn/error` only when the warning/error path is a meaningful contract.

---

## Validation commands

Run these after any logging-related change:

```bash
# No runtime direct console calls outside logger.mjs
grep -r "console\.\(log\|warn\|error\|info\|debug\)" module/ --include="*.mjs" --exclude="logger.mjs" || echo "OK: no direct console calls"

# No legacy CONFIG.debug logging gates
grep -r "CONFIG\.debug" module/ --include="*.mjs" || echo "OK: no CONFIG.debug usage"

# Tests
pnpm test

# Lint/build if available in the task scope
pnpm lint
pnpm build
```

Acceptable console usage:

```text
module/utils/logger.mjs
tests/**
vendors/**
node_modules/**
build scripts such as gulpfile.mjs, when outside runtime system code
```

If `CONFIG.debug` appears for a non-logging feature flag, inspect manually instead of deleting blindly.

---

## Code review checklist

Before finalizing a patch:

- [ ] No direct `console.xxx` in runtime system code outside `logger.mjs`.
- [ ] Logger import path is correct.
- [ ] Log level is appropriate.
- [ ] Error and warning logs are preserved.
- [ ] Debug-only expensive work is gated.
- [ ] No sensitive data is logged.
- [ ] Messages include a useful context prefix.
- [ ] No unrelated refactor is mixed into a logging-only change.
- [ ] Tests updated when logger behavior changes.
- [ ] Grep validation run.

---

## Troubleshooting

### Logs do not appear

Check:

1. Is the level `debug` / `info` while debug mode is disabled?
2. Was `logger.setDebug(swerpg.developmentMode)` called during init?
3. Is the task running in tests with the logger mocked?
4. Did the code path execute?

### Warnings or errors disappear

This is a regression. `warn` and `error` must remain visible outside debug mode unless the logger policy was explicitly changed with tests.

### DevTools points to `logger.mjs` instead of the caller

This is a known diagnostic limitation of wrapper-based logging. If the current task is specifically about DevTools callsites, prefer a pass-through or dynamic method reassignment approach while preserving public API and tests.

Do not fix callsites by monkey-patching global `console`.

### Tests still spy on `console`

Update tests to spy on `logger.*` for application behavior, or spy on `console.*` only inside logger unit tests.

### Too much output in CI

Downgrade noisy logs to `debug`, aggregate repetitive messages, or log counts/details once at the end of the operation.

---

## Refactoring the logger itself

Only change `module/utils/logger.mjs` when the task explicitly targets logger behavior.

Constraints:

- Keep public method names stable.
- Do not monkey-patch global `console`.
- Do not add dependencies.
- Preserve `warn` / `error` visibility outside debug mode.
- Prefer O(1) per call; avoid stack parsing on every log.
- Add Vitest coverage for all changed behavior.
- Document any intentional change to prefixes or DevTools callsite behavior.

---

## Commit messages

For pure logging changes:

```text
logging: migrate module/documents/actor.mjs
logging: add no-console runtime regression test
logging: refactor logger callsite handling
```

If the repository uses Conventional Commits strictly, use:

```text
refactor(logging): migrate actor document logging
test(logging): add runtime no-console guard
fix(logging): preserve warning visibility outside debug mode
```

---

## When to refuse or redirect

Refuse or redirect implementation choices that require:

- adding `console.xxx` in runtime code;
- silencing all logs globally;
- removing `warn`/`error` just to make output cleaner;
- logging secrets or raw user archives;
- monkey-patching global `console`.

Offer a clean logger-based alternative instead.
