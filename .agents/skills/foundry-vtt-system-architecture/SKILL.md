---
name: foundry-vtt-system-architecture
description: Use this skill when modifying, extending, reviewing, or refactoring the Star Wars Edge RPG `swerpg` Foundry VTT v13+ system architecture, especially core initialization, configuration, data models, document extensions, compendiums, public APIs, hooks, and Foundry integration patterns. Trigger it before touching `swerpg.mjs`, `module/config/**`, `CONFIG.Actor.dataModels`, `CONFIG.Item.dataModels`, `game.system.swerpg`, `CONFIG.SWERPG`, compendium loading, document lifecycle hooks, or code that crosses Core/Data/UI/System/Integration boundaries.
license: private
compatibility: Claude Code, Codex, OpenCode, opencode
metadata:
  project: swerpg
  platform: Foundry VTT v13+
  domain: Star Wars Edge RPG system architecture
  source_docs: documentation/architecture/OVERVIEW.md; documentation/architecture/core/API.md; documentation/architecture/core/CONFIGURATION.md; documentation/architecture/core/INITIALIZATION.md; documentation/architecture/data/MODELS.md; documentation/architecture/data/DOCUMENTS.md; documentation/architecture/data/COMPENDIUMS.md; documentation/architecture/integration/FOUNDRY_INTEGRATION.md; documentation/architecture/MODELS.md
---

# Foundry VTT System Architecture — `swerpg`

This skill defines the architectural rules for coding inside the Star Wars Edge RPG system for Foundry VTT v13+.

Use it to keep changes aligned with the system architecture instead of producing isolated code that merely works locally.

## Core mission

When working on `swerpg`, preserve the layered architecture:

```text
Core Layer         -> configuration, initialization, public API, hooks
Data Layer         -> TypeDataModel schemas, Foundry document extensions, compendiums
Presentation Layer -> ApplicationV2 sheets, Handlebars templates, Canvas/HUD components
Game Systems Layer -> dice, talents, obligations, actions, effects
Data Sources       -> YAML sources, build pipeline, LevelDB packs
```

Do not mix these responsibilities. If a requested change crosses layers, explicitly identify each impacted layer and keep the implementation boundary clean.

## Architectural invariants

Always preserve these invariants unless the user explicitly asks for an architectural change:

1. `swerpg` targets Foundry VTT v13+.
2. Runtime data models must use `foundry.abstract.TypeDataModel` and `foundry.data.fields.*`.
3. Configuration follows this hierarchy:

   ```text
   SYSTEM (static) -> swerpg.CONST -> swerpg.CONFIG -> User Settings
   ```

4. `SYSTEM` / `swerpg.CONST` is static and must not be mutated at runtime.
5. Runtime configuration changes go through cloned/merged objects, preferably `foundry.utils.deepClone` and `foundry.utils.mergeObject`.
6. Public extension points should be exposed through `game.system.swerpg.api` / `swerpg.api`, not through ad-hoc globals.
7. UI sheets and applications should use ApplicationV2 patterns, especially `HandlebarsApplicationMixin` with `ActorSheetV2` / `ItemSheetV2` where applicable.
8. Game mechanics must not be hardcoded in templates. Templates render prepared context; documents and services own behavior.
9. Compendium data flows from editable source data to packs. Runtime code reads packs; it does not treat generated pack output as the source of truth.
10. User-facing labels and messages must be localizable through `game.i18n.localize` / `game.i18n.format`.

## Before coding

Before modifying files, classify the change:

```text
Configuration change?     -> module/config/**, SYSTEM, CONFIG.SWERPG, settings
Data shape change?        -> TypeDataModel schema, migrations, document lifecycle
Document behavior change? -> Actor/Item/Combat/ActiveEffect/Token/ChatMessage extensions
UI change?                -> ApplicationV2 class, template part, context preparation
Game mechanic change?     -> dice, talents, obligations, actions, active effects
Compendium change?        -> source data, pack references, UUID mapping, build pipeline
Integration change?       -> hooks, sockets, Foundry registration, canvas, chat
```

Then inspect the existing implementation before editing. Do not invent paths, class names, data shapes, hooks, settings, or compendium IDs. If the repository disagrees with this skill, treat the repository as the source of truth and adapt the implementation conservatively.

## Expected implementation workflow

For any non-trivial architecture change:

1. Locate the existing entry point and registration path.
2. Identify the owning layer.
3. Check whether an existing service, model, document method, config object, or API namespace already exists.
4. Extend existing patterns instead of creating parallel abstractions.
5. Keep Foundry lifecycle rules intact.
6. Add or update tests when behavior, schema, import, or data preparation changes.
7. Update documentation only when the architectural contract changes.

## Core layer rules

The Core layer owns system boot, configuration, API exposure, settings, and hook registration.

### Initialization order

Respect this logical order:

```text
swerpg.mjs -> configuration -> data models -> document classes -> applications -> game systems -> runtime registries
```

Use Foundry hooks according to lifecycle intent:

```text
Hooks.once('init')
  - load static config
  - expose system namespace
  - register Actor/Item data models
  - register document classes if applicable
  - register sheets/applications
  - register settings

Hooks.once('ready')
  - run migrations
  - initialize runtime registries
  - load/cache compendium mappings
  - finalize public API access that depends on game data
```

Do not load world documents, compendium documents, or user-dependent runtime data too early in `init`.

### Configuration rules

Use this mental model:

```javascript
SYSTEM.CONST        // static development-time constants
swerpg.CONST        // exposed static constants
swerpg.CONFIG       // runtime configurable clone/merge
CONFIG.SWERPG       // Foundry integration namespace
User Settings       // persisted client/world settings
```

Do this:

```javascript
const runtimeConfig = foundry.utils.mergeObject(
  foundry.utils.deepClone(SYSTEM.CONST),
  game.settings.get('swerpg', 'systemConfiguration') ?? {},
)
```

Avoid this:

```javascript
CONFIG.SWERPG.SKILLS.custom = value
SYSTEM.CONST.DICE.displayMode = value
```

When updating runtime config, prefer restricted merge semantics:

```javascript
swerpg.CONFIG = foundry.utils.mergeObject(swerpg.CONFIG, updates, {
  insertKeys: false,
  insertValues: false,
})
```

Add settings through `game.settings.register('swerpg', key, ...)` with localized `name` and `hint`.

## Public API rules

Expose stable integration points through a coherent API namespace:

```javascript
swerpg.api = {
  applications,
  canvas,
  dice,
  documents,
  models,
  methods,
  talents,
  hooks,
}
```

Use the public API for cross-module access. Do not make external code import deep internal files when a public API contract should exist.

When adding API entries:

- keep names stable and intentional;
- avoid exposing internal caches or mutable constants;
- document the expected inputs and outputs;
- preserve backward compatibility where practical;
- use small methods over exposing large service internals.

## Data layer rules

The Data layer owns structured game data and validation.

### TypeDataModel rule

Every Actor/Item system data shape must be represented by a `foundry.abstract.TypeDataModel` subclass.

Use `foundry.data.fields.*` fields for validation:

```javascript
static defineSchema() {
  const fields = foundry.data.fields

  return {
    characteristics: new fields.SchemaField({
      brawn: new fields.NumberField({ required: true, initial: 2, min: 1, max: 6, integer: true }),
      agility: new fields.NumberField({ required: true, initial: 2, min: 1, max: 6, integer: true }),
    }),
  }
}
```

Prefer `SchemaField` for coherent groups. Use `NumberField`, `StringField`, `BooleanField`, `ArrayField`, `ObjectField`, `HTMLField`, and `DocumentUUIDField` deliberately.

### Model registration

Register models in Foundry configuration, not lazily in feature code:

```javascript
CONFIG.Actor.dataModels = {
  hero: HeroModel,
  adversary: AdversaryModel,
  vehicle: VehicleModel,
}

CONFIG.Item.dataModels = {
  talent: TalentModel,
  weapon: WeaponModel,
  armor: ArmorModel,
  gear: GearModel,
  forcepower: ForcePowerModel,
  species: SpeciesModel,
  career: CareerModel,
  specialization: SpecializationModel,
}
```

If the repository uses incremental assignment instead of object replacement, follow the existing style.

### Derived data

Use Foundry data preparation methods for computed values:

```text
prepareBaseData()    -> local base calculations, defaults, normalization
prepareDerivedData() -> calculations that may depend on embedded documents or prepared data
```

Do not persist purely derived values unless the existing architecture requires it. If a value can be recalculated safely, compute it in preparation methods or explicit services.

### Data migration

When changing schema:

1. Add a migration path.
2. Preserve backward compatibility for existing worlds where possible.
3. Validate default values.
4. Avoid destructive migration without explicit user approval.
5. Add tests or fixtures for old and new data shapes.

Use patterns like:

```javascript
static migrateData(source, version) {
  const data = foundry.utils.deepClone(source)
  // migrate fields safely
  return data
}
```

### Validation

Enforce constraints at the schema level first:

- characteristics usually constrained to valid game ranges;
- skill ranks usually constrained to integer ranges;
- obligations, force rating, morality, rarity, encumbrance, defense, soak, and thresholds must be bounded intentionally;
- choices should be explicit where the domain is finite.

Add method-level validation for cross-field constraints.

## Document extension rules

Foundry document extensions own document lifecycle, embedded documents, and behavior that belongs to Actor/Item/Combat/ActiveEffect/Token/ChatMessage.

Current architectural roles:

```text
SwerpgActor        -> characters, adversaries, vehicles, derived actor behavior
SwerpgItem         -> gear, weapons, armor, talents, actions, prerequisites
SwerpgCombat       -> encounters and combat turn flow
SwerpgActiveEffect -> active mechanical effects
SwerpgToken        -> canvas actor representation
SwerpgChatMessage  -> enriched roll/action/talent messages
```

Use lifecycle hooks carefully:

```javascript
async _preCreate(data, options, user) { }
async _onCreate(data, options, userId) { }
async _preUpdate(changed, options, user) { }
async _onUpdate(changed, options, userId) { }
```

Rules:

- use `_preCreate` / `_preUpdate` for validation and source updates;
- use `_onCreate` / `_onUpdate` for side effects after persistence;
- prevent duplicate side effects in multiplayer by checking `game.user.id === userId` where appropriate;
- do not mutate `this.system` directly when an update should go through `update()` or `updateSource()`;
- avoid recursive updates from document hooks.

## Presentation layer rules

UI code prepares and renders data; it does not own rules.

For ApplicationV2 / sheet code:

- define `DEFAULT_OPTIONS` with classes, window behavior, and action handlers;
- define `PARTS` with explicit template paths;
- use `_configureRenderOptions` to select parts dynamically;
- use `_prepareContext` to assemble template data;
- use static action handlers for `actions` when following ApplicationV2 conventions;
- pass `CONFIG.SWERPG` into context instead of hardcoding config in templates;
- enrich HTML with `TextEditor.enrichHTML(..., { async: true })` when rendering rich descriptions.

Do not put game calculations in Handlebars. Prepare them in document/model/service code before rendering.

## Game systems rules

Game system code owns mechanics: dice, talents, obligations, actions, effects, combat-specific resolution.

Use these boundaries:

```text
Dice system        -> build/roll/resolve narrative dice and chat output
Talent system      -> talent registry, prerequisites, ranks, activation, effects
Obligation system  -> obligation data and related progression/triggers
Action system      -> user action workflow from sheet to dialog to roll to chat/effects
```

The standard action workflow is:

```text
User Input -> Sheet -> Action.use() -> Dialog -> Roll -> Chat -> Effects
```

Do not bypass the workflow with one-off UI handlers unless the feature is explicitly UI-only.

## Compendium and source data rules

Compendium data follows this workflow:

```text
_source/ YAML -> build pipeline -> packs/ LevelDB -> runtime documents/models
```

Rules:

- edit source data when changing canonical compendium content;
- do not hand-edit generated pack output unless the repository explicitly does so;
- reference packs via configured IDs, not hardcoded strings scattered through feature code;
- handle missing packs gracefully;
- cache compendium lookups when they are repeatedly used;
- clear cache when source packs or mappings change.

Use safe loading patterns:

```javascript
async function loadCompendiumData(packKey) {
  const packId = SYSTEM.COMPENDIUM_PACKS[packKey]
  const pack = game.packs.get(packId)
  if (!pack) {
    console.warn(`SWERPG | Compendium pack '${packKey}' not found`)
    return []
  }
  return pack.getDocuments()
}
```

## Foundry integration rules

When integrating with Foundry:

- prefer Foundry APIs over direct DOM/storage manipulation;
- use `game.settings` for persisted settings;
- use `Hooks` for lifecycle and integration points;
- use `game.socket` only for multiplayer synchronization needs;
- use `ChatMessage` / custom chat rendering for roll outputs;
- use `canvas` layers only for canvas-specific visualization or interaction;
- use `fromUuid` for document references where UUIDs are stored;
- use `foundry.utils.getProperty`, `setProperty`, `mergeObject`, `deepClone`, `debounce` where appropriate.

## Performance rules

Apply performance discipline before adding broad listeners, repeated compendium reads, or expensive getters.

Do:

- cache expensive derived calculations;
- invalidate caches on relevant document changes;
- lazy-load compendium data;
- debounce repeated recalculations;
- avoid heavy work in frequently rendered templates;
- avoid repeated `getDocuments()` calls inside loops;
- filter once, reuse prepared collections.

Avoid:

- async compendium scans during every sheet render;
- expensive calculations in getters accessed by templates;
- unbounded Maps without invalidation;
- document updates inside render-only paths.

## Security and safety rules

- Validate external/imported data before writing it into documents.
- Do not trust compendium, YAML, importer, form, or dataset input blindly.
- Use schema validation plus explicit domain checks.
- Localize user-facing validation errors where possible.
- Avoid executing dynamic code from configuration, compendiums, YAML, or user input.
- Use `TextEditor.enrichHTML` for rich text rendering rather than injecting raw HTML manually.

## Responsibility placement guide

Use this table when deciding where code belongs:

| Need | Put it here |
|---|---|
| Static constants, dice names, skill definitions | `module/config/**`, `SYSTEM.CONST` |
| Runtime configurable defaults | `swerpg.CONFIG`, settings integration |
| Actor/Item schema | `TypeDataModel` subclasses |
| Derived actor/item stats | data models or document methods |
| Document lifecycle behavior | `SwerpgActor`, `SwerpgItem`, etc. |
| Sheet rendering data | ApplicationV2 `_prepareContext` |
| Template layout | `.hbs` parts/templates |
| Narrative dice resolution | dice system services/classes |
| Talent activation/effects | talent/effects system, not UI |
| Compendium canonical content | source data and build pipeline |
| Reusable external integration | `swerpg.api` |
| Multiplayer sync | `game.socket` integration |

## Anti-patterns to reject

Reject or refactor these patterns:

```javascript
// Mutating static config
CONFIG.SWERPG.SKILLS.foo = bar
SYSTEM.CONST.DICE.mode = 'text'

// Hardcoded UI labels
name: 'Pilot'

// Game logic in Handlebars
{{#if (complexRule actor item)}} ... {{/if}}

// Compendium ID scattered in feature code
game.packs.get('swerpg.talents')

// Async pack scan on every render
async _prepareContext() {
  context.talents = await game.packs.get('swerpg.talents').getDocuments()
}

// Recursive document updates from update hooks without guards
Hooks.on('updateActor', actor => actor.update({ ... }))

// Ad-hoc global API
window.myTalentSystem = service
```

Prefer:

```javascript
const config = foundry.utils.deepClone(CONFIG.SWERPG.SKILLS)
name: game.i18n.localize('SWERPG.Skills.Pilot.Name')
context.derived = this.document.getPreparedSheetData()
const pack = game.packs.get(SYSTEM.COMPENDIUM_PACKS.talent)
game.system.swerpg.api.talents
```

## Review checklist

Before finishing a change, verify:

- [ ] The owning layer is correct.
- [ ] Foundry lifecycle hooks are used at the right time.
- [ ] No static configuration is mutated at runtime.
- [ ] New data shapes use `TypeDataModel` fields and constraints.
- [ ] Schema changes include migration/default handling.
- [ ] User-facing strings are localized.
- [ ] Templates do not own game mechanics.
- [ ] Compendium access uses configured IDs and handles missing packs.
- [ ] Repeated compendium/model calculations are cached or avoided.
- [ ] Public API exposure is intentional and stable.
- [ ] Tests or fixtures were added/updated for changed behavior.
- [ ] The implementation follows existing repository conventions over invented ones.

## Response style when using this skill

When proposing or making code changes:

1. Start with the impacted architecture layer(s).
2. State the existing pattern you are following.
3. Provide the concrete files/classes/functions to change.
4. Keep code compatible with Foundry VTT v13+ and vanilla JavaScript unless the repository already uses another tool.
5. Call out uncertainty explicitly instead of inventing missing repository details.
6. Prefer small, reviewable changes over broad rewrites.

## Minimal architecture summary for agents

If context is tight, keep only this:

```text
swerpg is a Foundry VTT v13+ system with layered architecture:
Core -> Data -> Presentation -> Game Systems -> Integration.
Configuration is SYSTEM -> swerpg.CONST -> swerpg.CONFIG -> User Settings.
Actor/Item data must use TypeDataModel schemas.
Documents own lifecycle and embedded behavior.
ApplicationV2/Handlebars sheets render prepared context, not rules.
Compendiums come from source data via build pipeline and are loaded through configured IDs.
Expose stable cross-module features through swerpg.api / game.system.swerpg.api.
Do not mutate static config, hardcode labels, scan packs repeatedly, or put game logic in templates.
```

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
