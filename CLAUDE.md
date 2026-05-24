# CLAUDE.md

## Règles agent (toujours)

- Si ambigu : demande. Ne choisis pas en silence.
- Diff minimal. Touche uniquement ce qui est demandé.
- Définis « done » avant de commencer (1 ligne suffit).
- Vérifie dans le code latest. Jamais d'hypothèse.
- Code minimum. Pas de feature spéculative.

## Project

**Swerpg** is a Foundry VTT v14+ game system for Star Wars Edge RPG. It targets `foundry.applications.api` (ApplicationV2) and `foundry.abstract.TypeDataModel`. The codebase is ES2022 modules only — no TypeScript, no `require`.

- **Entry point**: `swerpg.mjs` → bundled to `dist/swerpg.bundle.js` via Rollup
- **System ID**: `swerpg` (in `module/config/system.mjs`)
- **Runtime API**: `game.system.swerpg` / `game.system.api`
- **Package manager**: `pnpm`
- **Foundry compatibility**: minimum v14, verified v14.309

## Commands

```bash
# Build
pnpm run build          # fmt + rollup + less (full build)
pnpm run rollup         # bundle JS only
pnpm run less           # compile LESS → CSS (via gulp)
pnpm run fmt            # format with Prettier

# Tests
pnpm test                                              # Vitest (watch mode)
pnpm vitest run tests/path/to.test.mjs                 # single file
pnpm vitest run --grep "pattern"                       # filter by name
pnpm test:coverage                                     # run + generate coverage

# Lint
pnpm exec eslint <file-or-dir>                         # no npm "lint" script exists
pnpm fmt:check                                         # Prettier check only

# Compendiums
pnpm run compile        # YAML _source/ → LevelDB packs/
pnpm run extract        # LevelDB packs/ → YAML _source/

# E2E — Tier 1: regression (requires Docker Foundry on port 31001)
pnpm e2e                # Playwright headless (regression suite)
pnpm e2e:headed         # Playwright with browser
pnpm e2e:ci             # Chromium only, [ci]-tagged specs
pnpm foundry:e2e:start  # start Docker Foundry instance
pnpm foundry:e2e:stop   # stop Docker Foundry instance

# E2E — Tier 2: smoke prod (read-only, targets port 30000, no Docker needed)
pnpm e2e:smoke          # smoke suite headless
pnpm e2e:smoke:headed   # smoke suite with browser
```

## Architecture

The codebase enforces a strict two-layer separation:

**Pure domain layer** (`module/lib/`) — no Foundry globals (`game`, `Actor`, `CONFIG`, `Hooks`, etc.). All business logic lives here, directly testable by Vitest without mocking.

**Foundry adapter layer** — everything else (`applications/`, `documents/`, `hooks/`, `models/`). Reads/writes Documents, calls domain functions, applies results back to Foundry.

```
module/
  config/          # SYSTEM constants, enums, skill/talent/status configs
  models/          # TypeDataModel subclasses for all item/actor types
  documents/       # Foundry document extensions (actor.mjs, item.mjs, …)
  applications/    # ApplicationV2 sheets and UI apps
    sheets/        # Actor/Item sheets (base-actor-sheet, character-sheet, …)
    specialization-tree/  # Talent tree UI
    hud/           # Token HUD
    settings/      # System settings UI
  hooks/           # Foundry hook handlers
  lib/             # Pure domain logic
    skills/        # Skill cost calculation, factory, rank rules
    talents/       # Talent cost calculation, factory
    jauges/        # Gauge/meter factory
    specialization-tree/  # Tree traversal, node logic
  dice/            # Star Wars narrative dice (standard-check, attack-roll)
  canvas/          # Ruler, token, talent-tree canvas elements
  utils/
    logger.mjs     # Central logger — the ONLY place console.* is allowed
  chat.mjs         # Chat message integration
  socket.mjs       # WebSocket events
```

### Key data models (`module/models/`)

`SwerpgCharacter`, `SwerpgAdversary` — actor types  
`SwerpgTalent`, `SwerpgSkill`, `SwerpgSpecialization`, `SwerpgSpecializationTree` — tree-based progression  
`SwerpgArmor`, `SwerpgWeapon`, `SwerpgGear` — physical items  
`SwerpgCareer`, `SwerpgSpecies`, `SwerpgDuty`, `SwerpgObligation` — character background items

### ApplicationV2 sheet pattern

```js
export default class MySw erpgSheet extends HBMixin(BaseSheetV2) {
  static DEFAULT_OPTIONS = { classes: ['swerpg', 'sheet'], form: { submitOnChange: true } }
  static PARTS = { main: { template: 'templates/…/main.hbs' } }
  // Context flows: _prepareContext() → template
  // Actions: data-action="actionName" → static #onActionName(event, target)
}
```

Actor sheets extend `SwerpgBaseActorSheet`; item sheets extend `SwerpgBaseItemSheet`.

## Logging

**Never use `console.*` directly** — use the central logger everywhere:

```js
import { logger } from '../utils/logger.mjs'
logger.info('…') // debug-mode only
logger.warn('…') // always visible
logger.error('…') // always visible
logger.debug('…') // debug-mode only
```

`warn` and `error` are always active. All other levels are gated by debug mode (set at init via `logger.setDebug(developmentMode)`). The logger also has `logger.deprecated(moduleName, feature, suggestion)` for legacy code warnings.

## Tests

Two Vitest configs:

- `vitest.config.mjs` — default, minimal `tests/setup.mjs` (basic `foundry`/`game` stubs)
- `vitest.config.js` — coverage, `clearMocks`, `restoreMocks`, full `tests/vitest-setup.js`

For tests that need Foundry document behavior, use `tests/helpers/mock-foundry.mjs`:

```js
import { setupFoundryMock, teardownFoundryMock } from '../../helpers/mock-foundry.mjs'
beforeEach(() => setupFoundryMock())
afterEach(() => teardownFoundryMock())
```

Pure domain tests in `module/lib/` need no mocking — import directly and test with plain objects.

## Coding rules

- `const` by default; `let` only when reassigning; never `var`
- `===` / `!==` always; no parameter reassignment (`no-param-reassign`)
- `async/await` over `.then()`; handle all promise rejections
- 2-space indent, single quotes, trailing commas, `printWidth: 160` (Prettier owns formatting)
- No business logic in `.hbs` templates; no jQuery
- No `document.update()` calls inside `prepareDerivedData()` — derived data must be side-effect free
- i18n keys follow `SWERPG.Domain.Subdomain.Key`; no hard-coded user-facing strings

## Compendiums

Edit YAML in `_source/` only — never touch `packs/` (LevelDB binaries) directly. Run `pnpm compile` to rebuild packs from YAML sources.

## Conventional Commits

Use `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `build:`, `chore:` prefixes. Releases are automated via semantic-release.

## Development workflow

Issue → plan under `documentation/plan/` → feature branch from `develop` → implement → tests/lint → fix failures → PR to `develop`
