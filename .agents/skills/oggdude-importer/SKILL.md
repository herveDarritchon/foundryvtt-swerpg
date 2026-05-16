---
name: oggdude-importer
description: Implement, repair, review, and extend the SWERPG OggDude ZIP/XML importer using the established Strategy, Builder, Registry, and Template Method patterns without breaking mappings, schema compatibility, observability, security, or tests.
license: project-internal
compatibility:
  - claude-code
  - codex
  - opencode
metadata:
  project: swerpg
  stack: Foundry VTT v13+, JavaScript ES2022, ApplicationV2, JSZip, xml2js, Vitest
  scope: OggDude importer, XML mapping, item import, career import, talent import, specialization import, diagnostics, import metrics, importer tests
---

# SWERPG OggDude Importer

Use this skill whenever you add, repair, review, or extend the OggDude importer for the `swerpg` Foundry VTT system.

The importer is a specialized subsystem. Treat it as data transformation plus Foundry storage orchestration, not as a place for UI shortcuts, schema improvisation, or one-off parsing hacks.

## Core mandate

Before changing importer code:

1. Identify the import domain: `weapon`, `armor`, `gear`, `species`, `career`, `specialization`, `talent`, `obligation`, or a new domain.
2. Identify the source XML file and JSON criteria, for example `Weapons.xml` + `Weapons.Weapon`.
3. Identify the target Foundry document type and exact `TypeDataModel` schema.
4. Preserve traceability through `flags.swerpg.oggdudeKey` and domain-specific metadata flags.
5. Validate and sanitize every source value before it reaches `system`.
6. Use deterministic mapping tables with explicit fallbacks.
7. Track metrics and warnings for unknown, rejected, truncated, or fallback values.
8. Add or update Vitest tests for mapping, edge cases, security, and performance.
9. Do not change target schemas from importer code unless explicitly asked and paired with model migrations.
10. Do not silently discard meaningful source data; either map it, store it in flags, include it in sanitized description, or document why it is intentionally ignored.

If a source field does not belong in the current schema, do not invent a new `system.*` property. Prefer a documented `flags.swerpg.oggdude.*` field or a sanitized description section.

## Importer architecture

The importer follows four patterns:

```text
ApplicationV2 UI
→ OggDudeDataImporter
→ OggDudeImporter.processOggDudeData(importedFile, domains)
→ OggDudeDataElement.from(zip)
→ groupByDirectory / groupByType
→ buildContextMap registry
→ build<Domain>Context(...)
→ <domain>Mapper(jsonData)
→ OggDudeDataElement.processElements(context)
→ Foundry folders, images, item storage
```

### Main responsibilities

```text
module/settings/OggDudeDataImporter.mjs
→ UI: ZIP selection, domain selection, load/reset actions, import state, metrics display.

module/importer/oggDude.mjs
→ Orchestrator: load ZIP, classify elements, build contexts, run selected domains, aggregate metrics.

module/settings/models/OggDudeDataElement.mjs
→ ZIP element model: safe paths, file type classification, XML extraction, grouping, storage pipeline.

module/importer/items/<domain>-ogg-dude.mjs
→ Domain context builder and mapper entry point.

module/importer/mappings/*.mjs
→ Deterministic mapping tables and resolution helpers.

module/importer/utils/*.mjs
→ Stats, normalization helpers, import metrics, diagnostics.
```

Do not collapse this architecture into a monolithic importer. New domains must use the same structure.

## Domain extension checklist

For a new OggDude domain:

1. Analyze source XML shape and expected root criteria.
2. Compare with the target `TypeDataModel` schema.
3. Create `module/importer/items/<domain>-ogg-dude.mjs`.
4. Add mapping tables under `module/importer/mappings/` if source codes need resolution.
5. Add stats helpers under `module/importer/utils/` if the domain has meaningful unknowns/rejections.
6. Register the context builder in `OggDudeImporter`'s `buildContextMap`.
7. Add the domain to `OggDudeDataImporter` only if it should be user-selectable.
8. Add i18n keys for the UI domain label in `lang/en.json` and `lang/fr.json`.
9. Add integration and edge-case tests.
10. Update importer documentation or the domain reference.

A new mapper is incomplete until it has mapping tests and at least one unknown/error-path test.

## Context builder contract

Every domain context builder must return a context compatible with `OggDudeDataElement.processElements()`.

```js
export async function buildExampleContext(zip, groupByDirectory, groupByType) {
  return {
    jsonData: await OggDudeDataElement.buildJsonDataFromFile(zip, groupByDirectory, 'Example.xml', 'Examples.Example'),
    zip: {
      elementFileName: 'Example.xml',
      content: zip,
      directories: groupByDirectory,
    },
    image: {
      criteria: 'Data/ExampleImages',
      worldPath: buildItemImgWorldPath('examples'),
      systemPath: buildItemImgSystemPath('example.svg'),
      images: groupByType.image ?? [],
      prefix: 'Example',
    },
    folder: {
      name: 'Swerpg - Examples',
      type: 'Item',
    },
    element: {
      jsonCriteria: 'Examples.Example',
      mapper: exampleMapper,
      type: 'example',
    },
  }
}
```

Rules:

- Keep file names exact and documented: `Weapons.xml`, `Armor.xml`, `Gear.xml`, `Obligations.xml`, etc.
- Use safe image fallbacks; never build paths from unsanitized XML fields.
- `jsonData` must be an array or normalized to an array before mapping.
- `element.type` must match the Foundry item type.
- `folder.name` must be stable to avoid duplicate folders between imports.

## Mapper output contract

A mapper receives parsed XML objects and returns Foundry item source-like objects.

Required shape:

```js
{
  name: 'Display Name',
  type: '<itemType>',
  img: 'icons/svg/item-bag.svg',
  system: {
    // Only fields supported by the target TypeDataModel
  },
  flags: {
    swerpg: {
      oggdudeKey: 'SOURCE_KEY',
      oggdude: {
        // Optional nested domain-specific source metadata
      },
    },
  },
}
```

Mapper rules:

- Return `null` for rejected items, then filter nulls explicitly.
- Use `OggDudeImporter.mapMandatoryString`, `mapOptionalString`, `mapMandatoryNumber`, `mapOptionalNumber`, `mapOptionalBoolean`, or domain-specific normalizers.
- Sanitize descriptions and source-provided rich text.
- Clamp numeric values to schema-safe limits.
- Preserve unknown but useful source values in flags or metrics.
- Avoid deep copies on hot paths unless mutation risk is real.
- Never mutate the source XML object.

## Security rules

The importer handles user-supplied ZIP/XML data. Treat every value as hostile.

Mandatory protections:

- Reject or neutralize unsafe ZIP paths (`..`, absolute paths, unexpected separators).
- Never execute XML or description contents.
- Escape `<script>` and unsafe HTML in descriptions.
- Sanitize names and descriptions before building Foundry sources.
- Clamp all numeric fields.
- Validate booleans and enum-like fields.
- Avoid writing files outside controlled world/system paths.
- Do not trust image names, source keys, or XML folder names as safe file paths.

If a legitimate OggDude file fails path validation, do not weaken validation globally. Add a narrow preprocessing rule and a regression test.

## Observability and metrics

Every domain should expose enough diagnostics to debug imports without reading raw XML.

Expected per-domain stats:

```js
{
  total: 0,
  imported: 0,
  rejected: 0,
  unknownSkills: 0,
  unknownProperties: 0,
  rejectionReasons: [],
}
```

Names can vary by domain, but the intent must be stable:

- total processed
- imported or created count
- rejected or failed count
- unknown source codes
- fallback count or details
- rejection reasons

Global metrics should include:

- duration by domain
- total processed/imported/rejected
- archive size
- items per second
- error rate

Use the central `logger`. Do not use `console.xxx` outside `logger.mjs`.

Good:

```js
logger.warn('[CareerImporter] Unknown skill code ignored', { code, careerKey })
logger.debug('[GearImporter] Parsed WeaponModifiers', { key, weaponProfile })
```

Bad:

```js
console.log(mappedItem)
```

## Mapping rules by domain

### Weapons

Source: `Weapons.xml` / `Weapons.Weapon`.

Expected implementation:

- Mapper: `module/importer/items/weapon-ogg-dude.mjs`.
- Mapping tables: weapon skill, range, quality, hands.
- Fallbacks:
  - unknown skill → safe default, usually `rangedLight` or current canonical project value.
  - unknown range → `medium`.
  - unknown quality → ignore after logging and metrics.
- Preserve:
  - `flags.swerpg.oggdudeKey`
  - `flags.swerpg.oggdudeQualities` with `{ id, count }`
  - tags/status/category metadata if already part of importer contract
  - source name/page metadata
- Description must be sanitized and may append source information.
- Do not modify `SwerpgWeapon` schema from weapon mapping code.

Tests must cover:

- range resolution using `RangeValue` and fallback to `Range`
- quality values and unknown qualities
- restricted flags and category/tags
- source description sanitation
- performance on a representative batch

### Armor

Source: `Armor.xml` / `Armors.Armor`.

Expected implementation:

- Mapper: `module/importer/items/armor-ogg-dude.mjs`.
- Mapping tables: armor category and armor properties.
- Category fallbacks:
  - `Light`, `1` → `light`
  - `Medium`, `2` → `medium`
  - `Heavy`, `3` → `heavy`
  - `Natural`, `4` → `natural`
  - `Unarmored`, `0` → `unarmored`
  - unknown → `medium` in normal mode or rejected in strict mode.
- Property rules:
  - map known properties deterministically.
  - ignore unknown properties with warning/metrics.
  - deduplicate and sort properties.
  - truncate excessive property lists if the domain rule requires it.
- Numeric rules:
  - defense/soak must be clamped to safe bounds.
  - price/encumbrance must be `>= 0`.
  - rarity must remain inside schema bounds.

Tests must cover:

- category mapping variants
- strict vs normal behavior if strict mode exists
- unknown properties
- abnormal numeric values
- script sanitation in description
- stats reset and reporting

### Gear

Source: `Gear.xml` / `Gears.Gear`.

Expected implementation:

- Mapper: `module/importer/items/gear-ogg-dude.mjs`.
- Utility helpers: gear sanitization, slug/category handling, BaseMods/WeaponModifiers formatting.
- Target schema must remain compatible with `SwerpgGear`.
- Required fields:
  - `category`, default `general`
  - `quantity`, default `1`
  - `price`, default `0`
  - `quality`, default `standard`
  - `encumbrance`, default `1`
  - `rarity`, default `1`
  - `broken`, default `false`
  - `description.public`, sanitized
  - `description.secret`, default empty
  - `actions`, default empty
- Preserve source-only structures in flags when they do not belong in `system`:
  - `flags.swerpg.oggdude.baseMods[]`
  - `flags.swerpg.oggdude.weaponProfile`
  - original type/source/page metadata

Description rules:

- Remove or convert OggDude tags such as `[H3]`, `[BR]`, `[color]`.
- Append `Source: <book>, p.<page>` when available.
- Include Base Mods and Weapon Use sections only when source data exists.
- Escape scripts; do not inject raw HTML.

Tests must cover:

- numeric normalization
- category fallback
- description sanitation
- BaseMods and WeaponModifiers serialization
- weapon profile qualities merging
- performance threshold on representative batch

### Career

Source: `Careers/*.xml` or relevant `Career` XML structures.

Target schema:

```text
system.description
system.careerSkills: Set-like array of { id }, max 8
system.freeSkillRank: integer 0–8, default 4
```

Expected behavior:

- Extract career skill codes from all supported structures:
  - `CareerSkills` as string array
  - `CareerSkills.CareerSkill[]` with `Key`
  - fallback structures such as `Skill` or `Skills` if already supported
- Map through deterministic skill tables.
- Exclude unknown codes and log warnings.
- Filter mapped skill IDs by `SYSTEM.SKILLS`.
- Deduplicate and truncate to 8.
- Normalize `FreeRanks` / free skill rank to integer `0–8`, default `4`.

Special notes:

- Do not confuse `CORE` with `COORD`.
- Codes are case-insensitive.
- Nonexistent system skills such as unsupported `LTSABER` or `WARF` should warn and be excluded, not crash.
- Do not reintroduce old unsupported fields such as `sources`, `attributes`, `careerSpecializations`, or `freeRanks` into `system`.

Tests must cover:

- all supported career skill shapes
- unknown skills
- duplicate skills
- truncation > 8
- `freeSkillRank` default and clamp
- skill IDs absent from `SYSTEM.SKILLS`

### Obligation

Source: `Obligations.xml` / `Obligations.Obligation`.

Target output:

```js
{
  name: 'Debt',
  type: 'obligation',
  system: {
    description: '...',
    value: 10,
    isExtra: false,
    extraXp: 0,
    extraCredits: 0,
  },
  flags: {
    swerpg: {
      oggdudeKey: 'DEBT',
      oggdudeSource: '...',
      oggdudeSources: ['...'],
    },
  },
}
```

Rules:

- `Name` and `Key` are mandatory. Reject if missing or empty.
- Description defaults to empty string.
- Source metadata is optional and stored in flags.
- Defaults are system defaults, not OggDude values.
- No image support is expected unless source assets are added later.

Tests must cover:

- valid obligation mapping
- missing name/key rejection
- single and multiple sources
- defaults for value, isExtra, extraXp, extraCredits
- stats count imported/rejected

### Talents

Source: `Talents.xml` or talent XML structures.

Architecture:

```text
buildTalentContext()
→ talentMapper()
→ OggDudeTalentMapper.transform()
→ activation map
→ node resolution
→ prerequisite transformation
→ rank processing
→ actions creation
→ SwerpgTalent-compatible item source
```

Expected behavior:

- Unknown activation → `passive` or canonical passive value.
- Unresolved node → talent remains importable as orphan/null node if schema permits, with stats warning.
- Invalid prerequisites → empty object or partial mapping with warning.
- Missing actions → default action if this is part of the talent contract.
- Corrupt data → skip only the bad talent, not the whole import domain.
- Metrics should track processed, created, failed, validation failures, transform failures, unknown activations, unresolved nodes, invalid prerequisites, duplicates.

Target shape must remain compatible with `SwerpgTalent`:

```js
{
  name: 'Talent Name',
  type: 'talent',
  system: {
    node: null,
    activation: 'passive',
    isRanked: false,
    rank: { idx: 0, cost: 0 },
    tier: 1,
    description: '...',
    requirements: {},
    actions: [],
    actorHooks: {},
    importMeta: {},
  },
}
```

Tests must cover:

- activation mapping and unknown activation fallback
- node resolution and unresolved node metrics
- prerequisite transformation
- rank/tier/cost extraction and clamp
- ranked talents
- duplicate keys
- corrupt talent isolation

### Specializations

Specializations are high-risk because they connect careers, talent trees, imported talents, and actor progression.

Rules:

- Treat empty datasets as recoverable, not a fatal import failure.
- Do not crash the whole import if a specialization has no valid tree or no talents.
- Preserve source identifiers and career relation metadata in flags.
- Validate talent references and tree positions independently.
- Missing talents should produce diagnostics, not schema corruption.
- Keep import isolated by specialization: one broken specialization must not block all other domains.

Tests must cover:

- empty specialization dataset
- missing career reference
- missing talent references
- malformed tree structure
- successful specialization import with tree metadata
- UI/domain stats after partial failure

## Error isolation rules

The importer must be resilient by domain and by item.

- A broken item should not break its domain unless the XML root itself is unreadable.
- A broken domain should not break other selected domains.
- Every catch must log enough context: domain, source file, source key/name when available, and reason.
- Do not hide errors with empty `catch` blocks.
- User-facing notifications should summarize failure, not dump raw stack traces.
- Developer logs should preserve stack traces for debugging.

Preferred shape:

```js
try {
  return mapSingleItem(xmlItem)
} catch (error) {
  incrementRejected('MAPPING_ERROR')
  logger.error('[GearImporter] Failed to map gear', {
    key: xmlItem?.Key,
    name: xmlItem?.Name,
    error,
  })
  return null
}
```

## XML and vendor test rules

In Vitest, JSZip and xml2js are not loaded by Foundry. Tests must provide mocks or shims.

Unit tests:

```js
globalThis.JSZip = {
  loadAsync: vi.fn().mockResolvedValue({
    files: {
      'Data/test.xml': {
        async: vi.fn().mockResolvedValue('<Root><Element /></Root>'),
      },
    },
  }),
}

globalThis.xml2js = {
  js: {
    parseStringPromise: vi.fn().mockResolvedValue({ Root: { Element: [] } }),
  },
}
```

Integration-style tests may shim the real vendor before importing parser modules.

Critical order:

```js
// Correct: setup first, then import modules that expect globals.
setupVendorShims()
const { parseXmlToJson } = await import('../../module/utils/xml/parser.mjs')
```

Do not add production defensive code only to compensate for missing test shims.

## Test requirements for importer changes

For any mapper change, add or update:

```text
tests/importer/<domain>-import*.spec.mjs
or
tests/integration/<domain>-import.integration.spec.mjs
```

Minimum coverage per domain:

1. Happy path mapping.
2. Missing mandatory field.
3. Unknown code or fallback path.
4. Numeric normalization/clamping when applicable.
5. Description sanitation when descriptions exist.
6. Flags and source traceability.
7. Stats/metrics update.
8. Performance test for large-ish batches when the domain can be large.
9. Security test for suspicious path/name if file handling is involved.

Use assertions like:

```js
expect(item.system).toMatchObject({ category: 'general' })
expect(item.flags.swerpg.oggdudeKey).toBe('GEAR_KEY')
expect(getGearImportStats().total).toBe(1)
```

Avoid:

- asserting exact order from large XML unless order is part of the contract;
- mocking the mapper being tested;
- snapshots of huge generated documents;
- relying on real Foundry Documents for pure mapping tests.

## Troubleshooting workflow

When debugging an import:

1. Run only one selected domain first.
2. Confirm the ZIP contains the expected XML file.
3. Confirm the parsed JSON root criteria, for example `Weapons.Weapon`.
4. Check path validation if files are ignored.
5. Check domain stats: `total`, `imported`, `rejected`, unknowns.
6. Check global metrics for timing and error rate.
7. Inspect logger output for context builder vs mapper vs storage failures.
8. For tests, verify JSZip/xml2js shims are installed before importing parser-dependent modules.
9. If performance regresses, compare XML size, number of domains, and batch duration.

Common symptoms:

```text
No imported data
→ No domain selected, missing XML file, wrong JSON criteria, or all items rejected.

xml2js vendor not loaded
→ Test shim missing or loaded after module import.

Stats stay at zero
→ Mapper does not call stats utilities or domain uses wrong stats aggregator.

Images missing
→ Image lookup failed; fallback should apply. Check criteria and image prefix.

Slow import
→ Large XML/ZIP, too many selected domains, excessive logs, or avoidable deep cloning.

Redirect/session issue in Playwright importer UI test
→ Use E2E session helpers and ensure Foundry is still on /game before opening settings.
```

## Performance rules

- Keep mapper complexity O(n) for `n` source items.
- Use `Map` or frozen object tables for code resolution.
- Avoid repeated scans of full arrays inside per-item mapping.
- Avoid logging full objects for thousands of items unless debug is gated and explicitly requested.
- Do not parse the same XML file multiple times in one import.
- Release or avoid retaining raw XML/JSON references if the importer processes large files.
- If a batch performance threshold exists, preserve it or update the test with a justified reason.

Known useful thresholds from existing docs:

- Gear mapping should remain performant on representative batches such as 200 items.
- Large XML performance regressions should be measured, not guessed.
- ZIP imports around 50MB should remain within the project’s accepted E2E/import constraints.

## UI integration rules

The OggDude importer UI is ApplicationV2-oriented.

Rules:

- Domain selection must not allow load when no domain is selected.
- ZIP file selection must update UI state predictably.
- Reset must clear file, selected domains, and visible metrics.
- Load must surface user-friendly notifications.
- The UI should expose metrics after import.
- Add i18n keys for every new domain or visible label.
- Do not hard-code user-facing strings in templates or JS.

For E2E tests:

- Use Playwright locators by role/text/label.
- Avoid `waitForTimeout`.
- Prefer helpers such as `openGameSettings` / `openSystemSettings` if present.
- Verify the importer window opens and the expected file/domain controls are visible.

## Anti-patterns

Do not:

- Add random `system.*` fields because OggDude has extra data.
- Swallow mapping errors silently.
- Fail the whole import for one malformed item.
- Skip stats because the mapper “works”.
- Put import mapping logic in the ApplicationV2 UI class.
- Hard-code French or English labels instead of i18n keys.
- Use `console.log` for diagnostics.
- Accept unsafe ZIP paths.
- Depend on XML item order unless documented.
- Introduce TypeScript into the JS importer modules.
- Change schema, importer, UI, and tests all in one unfocused refactor unless explicitly requested.
- Replace deterministic mapping tables with fuzzy matching unless the requirement explicitly demands it.

## Review checklist

Before finalizing an importer change:

- [ ] Domain and XML criteria identified.
- [ ] Target `TypeDataModel` checked.
- [ ] Mapper output contains only valid `system` fields.
- [ ] Source key and source metadata preserved in flags.
- [ ] Unknown values have fallback + warning/metrics.
- [ ] Mandatory field failures are isolated to the item.
- [ ] Description/text is sanitized.
- [ ] ZIP paths and image paths are safe.
- [ ] Metrics update correctly.
- [ ] Tests cover happy path, edge cases, fallback, stats, and security/performance where relevant.
- [ ] i18n updated for new UI labels.
- [ ] No direct `console.xxx`.
- [ ] No unrelated refactor mixed into the change.

## Response format for agents

When producing code for importer work, respond with:

1. Short summary of the importer domain and behavior changed.
2. Files touched.
3. Complete patches or clearly scoped code blocks.
4. Tests added/updated and how to run them.
5. i18n keys added/updated, if any.
6. Metrics/troubleshooting impact.
7. Conventional commit message.
8. Assumptions and follow-ups.

If information is missing, make the smallest safe assumption and state it. Do not invent undocumented OggDude fields or target schema fields.

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
