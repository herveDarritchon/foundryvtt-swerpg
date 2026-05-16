# AGENTS.md — SWERPG (Star Wars Edge RPG for Foundry VTT)

## Project

Swerpg is a Foundry Virtual Tabletop v13+ game system for Star Wars Edge RPG, built with ES2022 modules (
`"type": "module"`, `.mjs`).

- **Entrypoint**: `swerpg.mjs` → `dist/swerpg.bundle.js` (Rollup)
- **System ID**: `swerpg` (in `module/config/system.mjs`)
- **Runtime API**: `game.system.swerpg` / `game.system.api`
- **Language**: JavaScript (no TypeScript except `playwright.config.ts`)
- **Package manager**: `pnpm`
- **Logger**: `module/utils/logger.mjs` — **never** `console.log`

## Quick commands

```bash
pnpm test                          # Vitest (config: vitest.config.mjs)
pnpm test:coverage                 # Vitest + coverage (config: vitest.config.js)
pnpm vitest run tests/path/to.test.mjs  # Single file
pnpm vitest run --grep "pattern"        # Filter by name
pnpm exec eslint <targets>              # Lint (no npm script exists)
pnpm fmt:check                          # Prettier check (no --write)
pnpm run build                         # fmt → rollup → less
pnpm e2e                               # Playwright E2E (requires Docker Foundry)
pnpm e2e:headed                        # E2E with visible browser
pnpm e2e:ci                            # Chromium only, tag [ci]
pnpm compile                           # YAML _source/ → LevelDB packs/
pnpm extract                           # LevelDB packs/ → YAML _source/
```

## Architecture

```
module/
  applications/    # ApplicationV2 sheets
  models/          # TypeDataModel for actors/items
  documents/       # Foundry document extensions
  config/          # SYSTEM, enums, constants
  hooks/           # Hook handlers
  dice/            # Narrative dice
  lib/             # Pure domain logic
  helpers/         # Generic helpers
  ui/              # Reusable UI components
  utils/           # logger, flags, i18n
  chat.mjs         # Chat integration
  socket.mjs       # Socket integration
tests/             # Vitest (unit + integration)
e2e/               # Playwright E2E specs
_source/           # YAML source → packs/
packs/             # Compiled LevelDB compendiums
styles/            # LESS (entry: swerpg.less)
templates/         # Handlebars
lang/              # en.json, fr.json
```

## Naming

- Files: `kebab-case.mjs`
- Classes: `PascalCase`
- Functions/vars: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Booleans: `is*`, `has*`, `can*`, `should*`

## Coding rules

- `const` by default, `let` only when reassigning, never `var`
- `===` / `!==`, no parameter reassignment
- 2-space indentation, single quotes, trailing commas
- `async/await` over `.then()`
- No direct mutation of `this.document.system` — use `document.update()`
- No `console.xxx` — use `logger.debug/info/warn/error`
- No business logic in Handlebars templates
- No jQuery
- Pure domain logic in `module/lib/` without `game`, `ui`, `canvas`, `foundry` deps

## Tests

- 1500+ Vitest tests, 80+ files
- Two vitest configs: `vitest.config.mjs` (default, minimal setup) and `vitest.config.js` (coverage + clearMocks +
  restoreMocks)
- Setup: `tests/setup.mjs` (default) or `tests/vitest-setup.js` (full mock-foundry)
- Mock helpers: `tests/helpers/mock-foundry.mjs`
- Use `setupFoundryMock()` / `teardownFoundryMock()` in beforeEach/afterEach for Foundry-dependent tests
- E2E requires Docker Foundry instance, configured via `.env.e2e.local`
- CI runs `pnpm test` (Vitest) + `pnpm e2e:ci` (Playwright Chromium, tag `[ci]`)

## ApplicationV2 sheets

- Actors extend `SwerpgBaseActorSheet`
- Items extend `SwerpgBaseItemSheet`
- Use `static DEFAULT_OPTIONS`, `static PARTS`, `static TABS`
- Context: `_prepareContext(options)`, part context: `_preparePartContext(partId, context, options)`
- Actions: `data-action` attribute
- CSS contract: `.swerpg.sheet`, `.sheet-header`, `.sheet-tabs`, `.sheet-body`, `.sheet-footer`

## i18n

Keys in `lang/en.json` and `lang/fr.json`, shape: `SWERPG.Domain.Subdomain.Key`. No hard-coded user-facing strings.

## OpenCode workflows

Issue/cadrage
→ plan
→ plan file under documentation/plan/
→ feature branch from develop
→ implementation from plan with file under documentation/plan/
→ tests/lint/e2e
→ targeted fix if validation fails
→ scope check
→ PR to develop
→ PR review

## Skills

| Skill file                                                     | Purpose                      |
|----------------------------------------------------------------|------------------------------|
| `.agents/skills/coding-standards-project-conventions/SKILL.md` | Full coding conventions      |
| `.agents/skills/foundry-vtt-system-architecture/SKILL.md`      | Core system architecture     |
| `.agents/skills/applicationv2-ui-sheets/SKILL.md`              | UI/sheet conventions         |
| `.agents/skills/swerpg-talent-effects/SKILL.md`                | Talent mechanical effects    |
| `.agents/skills/plan-depuis-issue/SKILL.md`                    | Planning from issues         |
| `.agents/skills/creer-branche-feature/SKILL.md`                | Create feature branch        |
| `.agents/skills/creer-pull-request/SKILL.md`                   | Create pull request          |
| `.agents/skills/corriger-echec-validation/SKILL.md`            | Fix validation failure       |
| `.agents/skills/implementer-depuis-plan/SKILL.md`              | Implementation from plans    |
| `.agents/skills/narrative-dice/SKILL.md`                       | Narrative dice system        |
| `.agents/skills/oggdude-importer/SKILL.md`                     | OggDude import               |
| `.agents/skills/logging-diagnostics/SKILL.md`                  | Logger migration validation  |
| `.agents/skills/swerpg-unit-test-discipline/SKILL.md`          | Unit test patterns           |
| `.agents/skills/testing-strategy-vitest-playwright/SKILL.md`   | Vitest + Playwright strategy |

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

## Stale doc (trust executable config over prose)

- `.github/copilot-instructions.md` — references Foundry v13/Crucible/Tenebris (outdated), wrong npm commands (use
  `pnpm`)
- `README.md` — E2E script names may be stale (real ones: `pnpm e2e*`)
- No `lint` npm script in `package.json` — use `pnpm exec eslint <targets>` directly
