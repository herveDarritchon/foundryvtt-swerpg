---
name: testing-strategy-vitest-playwright
description: Add, repair, review, and stabilize SWERPG tests using Vitest for unit/integration coverage and Playwright for Foundry VTT E2E workflows without brittle mocks, selectors, or timing hacks.
license: project-internal
compatibility:
  - claude-code
  - codex
  - opencode
metadata:
  project: swerpg
  stack: Foundry VTT v13+, JavaScript ES2022, Vitest, Playwright, pnpm
  scope: unit tests, integration tests, coverage, Foundry mocks, Playwright E2E, CI stability
---

# SWERPG Testing Strategy — Vitest & Playwright

Use this skill whenever you add, repair, review, or stabilize tests for the `swerpg` Foundry VTT system.

This skill has two testing layers:

1. **Vitest** for pure rules, utilities, data transformations, TypeDataModel-adjacent logic, mocks, and lightweight integration tests.
2. **Playwright** for real Foundry VTT browser workflows: world bootstrap, sheets, settings, importer UI, dice flows, chat, and MJ/player journeys.

Do not split these into separate skills unless the project grows enough to justify it. The testing strategy must stay coherent across unit, integration, and E2E coverage.

## Core mandate

Before writing or changing tests:

1. Identify what behavior must be protected: rule, bugfix, UI workflow, regression, migration, performance, or integration.
2. Choose the lowest useful test layer.
3. Prefer pure Vitest tests for domain rules and transformations.
4. Use Foundry mocks only for adapter behavior that cannot be tested as pure code.
5. Use Playwright only for browser workflows that require real Foundry UI behavior.
6. Do not hide brittle code behind broad timeouts, `force: true`, or silent catches.
7. Update test helpers, mocks, and documentation when you extend them.
8. Keep tests focused: one reason to fail per test or scenario.

If a test needs excessive mocking, first challenge the production design: the logic may belong in a pure module.

## Testing decision tree

Use this selection rule:

```text
Pure calculation, validation, parsing, mapping, cost, rule, dice math?
→ Vitest unit test under tests/lib, tests/utils, tests/config, tests/dice, or matching folder.

Foundry adapter with document update, hooks, settings, sheets, importer orchestration?
→ Vitest integration-style spec with centralized Foundry mocks.

Requires actual browser, Foundry navigation, dialogs, rendered sheets, settings UI, drag/drop, chat DOM, or full user journey?
→ Playwright E2E under e2e/specs.
```

Do not use Playwright for logic that can be tested with plain objects. Do not mock half of Foundry to avoid writing one E2E test when the actual value is in the rendered workflow.

## Vitest rules

### Configuration assumptions

Assume the project uses Vitest with:

```js
// path: vitest.config.js
export default defineConfig({
  test: {
    setupFiles: ['./tests/vitest-setup.js'],
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
    },
  },
})
```

Expected scripts:

```json
{
  "test": "vitest",
  "test:watch": "vitest --watch",
  "test:coverage": "pnpm vitest run --coverage"
}
```

If scripts differ in the repository, use the actual scripts and do not invent new ones silently.

### Test file placement

Mirror the production code structure when possible.

```text
module/lib/foo/bar.mjs              → tests/lib/foo/bar.test.mjs
module/utils/items.mjs              → tests/utils/items.test.mjs
module/config/system.mjs            → tests/config/system.test.mjs
module/documents/item.mjs           → tests/documents/item.test.mjs
module/dice/standard-check.mjs      → tests/dice/standard-check.test.mjs
module/applications/settings/*.js   → tests/applications/settings/*.spec.js
```

Naming conventions:

- `*.test.mjs` for pure or mostly pure unit tests.
- `*.spec.js` or `*.spec.mjs` for integration-style tests, application tests, or adapter tests.
- Keep fixtures and factories in `tests/utils/` or `tests/helpers/`, not inside random test files.

### Test structure

Use Arrange / Act / Assert.

```js
import { describe, expect, it } from 'vitest'
import { calcSoak } from '../../module/lib/calc-soak.mjs'

describe('calcSoak', () => {
  it('combines brawn and armor soak', () => {
    // Arrange
    const input = { brawn: 3, armorSoak: 2 }

    // Act
    const result = calcSoak(input)

    // Assert
    expect(result).toBe(5)
  })
})
```

Use nested `describe` blocks only when they improve diagnosis. Do not create theatrical nesting that makes the test harder to scan.

### What to test first

Prioritize:

1. Star Wars rules and calculations: dice pools, net symbols, thresholds, soak, defense, XP, career skills, talents.
2. Data transformations: OggDude XML mapping, YAML-to-compendium preparation, normalization, fallback resolution.
3. Error isolation: importer domain failures, missing compendiums, invalid vendor libraries, malformed inputs.
4. Migrations and compatibility: old data shape to new data shape.
5. UI-adjacent adapters: sheet context preparation, settings registration, document methods.
6. Logger and infrastructure helpers when they gate debugging or CI behavior.

Do not spend effort snapshot-testing large generated objects unless the structure is stable and the snapshot is genuinely useful.

### Pure domain tests

Pure tests must not require these globals:

- `game`
- `ui`
- `canvas`
- `foundry`
- `Hooks`
- `CONFIG`
- `Actor`
- `Item`
- DOM APIs

If a rule imports Foundry only for `foundry.utils`, extract the rule into a pure helper and test that helper with plain data.

Good:

```js
expect(calculateAvailableXp({ total: 120, spent: 45 })).toBe(75)
```

Bad:

```js
const actor = new Actor(...)
expect(actor.system.experience.available).toBe(75)
```

### Foundry mocks

For code that legitimately touches Foundry APIs, use the centralized mock helpers.

Expected setup pattern:

```js
beforeEach(() => {
  setupFoundryMock()
  ensureFoundryUtils()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
  teardownFoundryMock()
})
```

Rules:

- Do not add scattered ad-hoc global mocks unless a local mock is truly isolated and documented.
- If you enrich `tests/helpers/mock-foundry.mjs`, update the testing documentation or mention it in the final answer.
- Do not add defensive production code like `globalThis.foundry?.utils` only because a test environment lacks Foundry. Fix the mock instead.
- Keep mocked actors/items as plain objects unless the code genuinely requires document behavior.

### Factories

Use reusable factories for actors, skills, talents, items, and importer inputs.

Example:

```js
const actor = createActor({ careerSpent: 1, specializationSpent: 0, items: [] })
const talent = createTalentData('talent-id', { isRanked: true })
```

Factory rules:

- Defaults must represent a valid, boring object.
- Options should override only what the test cares about.
- Factories may include small Foundry-like methods such as `update`, `updateSource`, `toObject`, or `createEmbeddedDocuments` only when needed.
- Do not hide assertions inside factories.

### Async tests

Always await async code and assert both success and failure paths.

```js
it('returns an ErrorTalent when embedded creation fails', async () => {
  actor.createEmbeddedDocuments = vi.fn().mockRejectedValueOnce(new Error('create failed'))

  const result = await trainedTalent.updateState()

  expect(result).toBeInstanceOf(ErrorTalent)
  expect(result.options.message).toContain('create failed')
})
```

Do not ignore rejected promises. Do not use arbitrary sleep functions.

### Vendor shims: JSZip and xml2js

Foundry loads vendors such as JSZip and xml2js through `system.json`; Node/Vitest does not. For importer tests, provide the correct global interface before importing modules that consume it.

Correct order:

```js
import xml2jsModule from '../../vendors/xml2js.min.js'

if (globalThis.xml2js === undefined) {
  globalThis.xml2js = { js: xml2jsModule }
}

const { parseXmlToJson } = await import('../../module/utils/xml/parser.mjs')
```

For JSZip mocks, expose at least:

```js
globalThis.JSZip = {
  loadAsync: async () => ({
    files: {
      'Data/Armor.xml': {
        name: 'Data/Armor.xml',
        dir: false,
        async: async (type) => '<Armors></Armors>',
      },
    },
  }),
}
```

If a test fails because `xml2js` or `JSZip` is missing, do not patch production code with weak global checks unless production actually requires such handling. Usually the test shim is wrong.

### Logger tests

Mock the logger when testing code paths that emit logs.

```js
vi.mock('../../../module/utils/logger.mjs', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))
```

Do not assert every debug log unless logging is the behavior under test. Prefer asserting warnings/errors for failure visibility.

### Coverage policy

Coverage is a guide, not a religion. Raise coverage by testing meaningful behavior, not by asserting implementation trivia.

Expected project direction:

```text
Initial threshold: 60%
Target stable threshold: 80%+
Long-term critical modules: 90%+
```

Prioritize coverage for:

- `module/lib/**`
- `module/dice/**`
- `module/importer/**`
- `module/utils/**`
- `module/config/**`
- critical `module/documents/**`

Be careful with application/sheet coverage: test context preparation and actions where valuable, but avoid brittle DOM micro-tests better covered by Playwright.

### Vitest anti-patterns

Reject or rewrite:

- defensive production code added only to satisfy a weak test mock;
- tests that require real Foundry for pure logic;
- massive snapshots of unstable objects;
- tests depending on execution order;
- `waitForTimeout` equivalents;
- assertions against private implementation details when public behavior is available;
- uncleaned globals (`globalThis.xml2js`, `globalThis.JSZip`, mocked `game`, etc.);
- tests with no meaningful assertion;
- `Object.groupBy` in production code — not available in Node.js < 21 (CI pipeline uses Node 20). Use `Array.reduce` instead:
  ```js
  // ❌ Avoid
  const grouped = Object.groupBy(items, item => item.type.id)
  // ✅ Prefer
  const grouped = items.reduce((acc, item) => {
    const key = item.type.id; (acc[key] ||= []).push(item); return acc
  }, {})
  ```

## Playwright E2E rules

### When to use Playwright

Use Playwright for workflows that only have real value in a browser-loaded Foundry world:

- bootstrapping a Foundry world;
- opening and interacting with actor/item sheets;
- settings dialogs and importer dialogs;
- drag/drop and context menus;
- dice roll UI and chat messages;
- GM/player flows;
- regressions involving overlays, focus, tabs, or rendered HTML.

Do not use Playwright for plain data mapping, rule calculations, or tiny helpers.

### E2E project structure

Expected structure:

```text
e2e/
  fixtures/
    index.ts
    global-setup.ts
  helper/
    overlay.ts
  pages/
    foundry-setup-page.ts       # recommended when workflows grow
    foundry-game-page.ts        # recommended when workflows grow
  specs/
    bootstrap.spec.ts
    oggdude-import.spec.ts
  utils/
    e2eTest.ts
    foundrySession.ts
    foundryUI.ts
  README.md
```

If `pages/` does not exist yet, propose it only when several specs duplicate the same workflow.

### Environment assumptions

Playwright uses a dedicated environment file loaded by `playwright.config.ts`.

Expected variables:

```text
E2E_FOUNDRY_BASE_URL
E2E_FOUNDRY_ADMIN_PASSWORD
E2E_FOUNDRY_USERNAME
E2E_FOUNDRY_PASSWORD
E2E_FOUNDRY_WORLD
```

Rules:

- Never commit `.env.e2e.local` or any file containing secrets.
- Keep `.env.e2e.example` updated when new required variables are introduced.
- Use `E2E_ENV_FILE=.env.e2e.staging pnpm e2e` for alternate environments.

### Commands

Common commands:

```bash
pnpm e2e
pnpm e2e:headed
pnpm e2e:ui
pnpm e2e -- --project=firefox
pnpm e2e -- --project=chromium
pnpm e2e -- e2e/specs/bootstrap.spec.ts
pnpm e2e -- --grep "OggDude importer"
pnpm exec playwright show-trace test-results/path-to-trace/trace.zip
pnpm foundry:e2e:start
pnpm foundry:e2e:stop
pnpm foundry:e2e:restart
```

If CI is constrained, only tests tagged `[ci]` should run through the `e2e:ci` script.

### Browser configuration

Expected Playwright properties:

- `testDir: './e2e'`
- `workers: 1` because a single Foundry instance/world is shared
- `baseURL` from `E2E_FOUNDRY_BASE_URL`
- projects for `chromium` and `firefox`
- traces/screenshots/video retained on failure or retry

Chromium-specific stability may require:

```ts
actionTimeout: 15000,
launchOptions: {
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
  ],
},
```

Do not add browser flags casually. Use them only for known Foundry/Chromium session problems and document why.

### Session and fixtures

Specs should import from shared fixtures:

```ts
import { expect, test } from '../fixtures'
```

The fixture should put the page in a ready `/game` state when the test begins by handling:

1. `/license` acceptance if needed;
2. admin login on `/auth` or `/setup`;
3. world selection;
4. join as configured user, usually Gamemaster;
5. overlay/tour dismissal.

If setup fails, fail fast with a clear error. Do not let later assertions report misleading missing elements.

### Writing a new E2E spec

Start with comments, then code.

```ts
import { expect, test } from '../fixtures'

test.describe('Actor sheet', () => {
  test('GM can open a hero sheet and see skills [ci]', async ({ page }) => {
    // Arrange: the world is already loaded and the GM is on /game.
    // Act: open the Actors sidebar and open the hero sheet.
    // Assert: the sheet is visible and the Skills tab can be activated.
  })
})
```

Rules:

- Keep one business journey per test.
- Use page helpers for repeated flows.
- Prefer `getByRole`, `getByLabel`, `getByText`, and `getByTestId` when available.
- Add assertions after meaningful actions.
- Use stable names and labels. If the UI lacks accessible names, fix the UI or add `data-testid` deliberately.

### Locator policy

Preferred:

```ts
await page.getByRole('button', { name: /Configure Settings/i }).click()
await expect(page.getByRole('dialog', { name: /Configure Settings/i })).toBeVisible()
await page.getByRole('tab', { name: /Game Settings/i }).click()
await page.getByLabel(/Character Name/i).fill('Vara Kesh')
await page.getByTestId('swerpg-roll-skill-cool').click()
```

Avoid:

```ts
await page.locator('div:nth-child(3) > button').click()
await page.waitForTimeout(5000)
await page.click('text=Play')
await page.getByRole('tab', { name: /Game Settings/i }).click({ force: true })
```

`click({ force: true })` is a smell. Use it only with a written justification and preferably after checking visibility/scroll/overlays.

### Waiting policy

Use web-first assertions and explicit navigation waits.

Good:

```ts
await expect(page).toHaveURL(/.*game/)
await expect(page.locator('body.system-swerpg')).toHaveCount(1)
await expect(page.getByRole('dialog', { name: /OggDude/i })).toBeVisible()
```

Bad:

```ts
await page.waitForTimeout(3000)
```

For overlays, use helper functions that try explicit selectors with short timeouts and do not block if absent.

### Session stability

Use an explicit session guard before critical interactions that assume `/game`:

```ts
export async function ensureSessionActive(page: Page): Promise<void> {
  const currentUrl = page.url()

  if (currentUrl.includes('/join') || currentUrl.includes('/auth')) {
    throw new Error(`Session lost: redirected to ${currentUrl}`)
  }

  await page.locator('#sidebar').waitFor({ state: 'visible', timeout: 3000 })
}
```

Call it before settings navigation, importer workflows, sheet interactions, and any long Foundry UI sequence.

### Cleanup policy

The cleanup strategy must be explicit.

Acceptable:

- Return to `/join` or `/setup` between tests if the project has decided that is enough.
- Fully logout/quit world if the scenario mutates global state.
- Suppress cleanup failures only when cleanup is best-effort and the error is logged or clearly documented.

Not acceptable:

- Large blocks of commented cleanup code with no explanation.
- Silent `catch(() => {})` around important setup failures.
- Tests that mutate world data without cleanup or a known disposable world.

### Debug workflow

For flaky or failing E2E tests:

1. Re-run a single spec headed.
2. Use Playwright UI for step-by-step inspection.
3. Inspect trace zip.
4. Check whether the page redirected to `/join`, `/auth`, or `/setup`.
5. Replace sleeps with explicit expectations.
6. Extract repeated flows to helpers.

Commands:

```bash
pnpm e2e:headed -- e2e/specs/oggdude-import.spec.ts
pnpm e2e:ui
pnpm exec playwright show-trace test-results/.../trace.zip
```

### Playwright anti-patterns

Reject or rewrite:

- `waitForTimeout` as synchronization;
- `click({ force: true })` without explanation;
- CSS selectors coupled to layout instead of role/name/test ID;
- tests with only one final assertion after many actions;
- failure-prone shared world mutations without cleanup;
- hidden setup errors swallowed by `catch(() => {})`;
- long multi-feature scenarios that fail for too many possible reasons;
- E2E tests for pure data functions.

## Test review checklist

For every test change, verify:

- [ ] The test layer is appropriate: Vitest vs Playwright.
- [ ] The test protects behavior, not incidental implementation.
- [ ] New or changed production behavior has at least one regression test.
- [ ] Pure rules are tested without Foundry mocks.
- [ ] Foundry mocks are centralized or deliberately local.
- [ ] Async failures are asserted, not ignored.
- [ ] Vendor globals are shimmed before module import when needed.
- [ ] Coverage improves or stays justified.
- [ ] Playwright specs use shared fixtures and stable locators.
- [ ] No `waitForTimeout` or unjustified `force: true`.
- [ ] Cleanup/session assumptions are explicit.
- [ ] Commands to run are listed.

## Required final response for test tasks

When answering a code/testing task, include:

1. **Summary** — what behavior is now covered or stabilized.
2. **Modified tree** — files created/changed.
3. **Vitest** — tests added/updated, mocks/factories touched, command to run.
4. **Playwright** — specs/helpers touched, target browsers, command to run.
5. **Risks** — flakiness, mocks, coverage gaps, cleanup/session caveats.
6. **Commit message** — Conventional Commit.

For small diagnostic questions, shorten the format but keep the layer choice and commands.
