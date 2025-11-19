---
goal: Import OggDude Obligations item type into SWERPG system (Foundry v13)
version: 1.0
date_created: 2025-11-19
last_updated: 2025-11-19
owner: swerpg-core
status: 'Planned'
tags: [feature, importer, oggdude, obligation]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Add support for importing OggDude Obligations (`Obligations.xml`) as Foundry Items of type `obligation`. The item type already exists (data model + sheet) but is absent from the OggDude import workflow. This plan defines creation of mapper, context builder, stats utilities, registry integration, UI activation, localization, tests, and documentation updates following existing importer patterns (armor, weapon, gear, talent, species, career) while ensuring performance, a11y, security, and localization consistency.

## 1. Requirements & Constraints

Functional, technical, security, performance and UX framing of the implementation.

- **REQ-001**: Provide a mapper `obligationMapper(items)` converting raw XML-derived JSON nodes into Foundry Item creation objects for type `obligation` with mandatory field validation (Name, Key, value, extra flags).
- **REQ-002**: Provide a context builder `buildObligationContext(zip, groupByDirectory, groupByType)` loading `Obligations.xml` under JSON path `Obligations.Obligation` (assumption) and preparing folder, image, mapping configuration.
- **REQ-003**: Track domain-specific import statistics (total, imported, rejected, unknownProperties, propertyDetails) via `obligation-import-utils` registered in global metrics aggregator.
- **REQ-004**: Register the new domain `obligation` in both `processOggDudeData` and `preloadOggDudeData` buildContextMap with its context builder.
- **REQ-005**: Expose domain in the importer UI by adding `obligation` to `_domainNames` in `OggDudeDataImporter.mjs` enabling checkbox selection and preview.
- **REQ-006**: Add localization keys for domain label: `SETTINGS.OggDudeDataImporter.loadWindow.domains.obligation` (FR/EN).
- **REQ-007**: Create unit tests for mapper (validation, stats, missing mandatory fields) and utils (stats lifecycle) + integration test loading fixture `Obligations.xml` verifying mapping and statistics.
- **REQ-008**: Provide XML fixture `resources/integration/Obligations.xml` (minimal representative sample) for integration tests.
- **REQ-009**: Update importer documentation to describe obligation domain support and usage (`documentation/importer/import-obligation.md` + README update).
- **REQ-010**: Optional mapping table (`obligation-mapping.mjs`) if OggDude codes require translation; include resolver with warning + metrics for unknown codes.
- **REQ-011**: Ensure rollback safety: removal of domain additions leaves existing importer unaffected (non-invasive changes).
- **REQ-012**: Provide preload (preview) support identical to existing domains (show existence, type, name) with consistent structure.
- **REQ-013**: Maintain accessibility: domain label localizable, present in UI with proper `aria-label` via existing system pattern.
- **SEC-001**: Validate mandatory fields using `OggDudeImporter.mapMandatory*` functions; never execute or eval imported data; sanitize HTML description field (system HTMLField already enforces safe parsing but we avoid injecting unsanitized markup).
- **SEC-002**: Guard against path traversal when handling images (use existing `buildItemImgSystemPath` and controlled destination directories).
- **CON-001**: Compatibility with Foundry VTT v13; avoid experimental APIs.
- **CON-002**: Performance: mapping must be linear (O(n)) with minimal allocations; handle up to several hundred obligations without blocking UI by relying on existing batch processing flow.
- **CON-003**: Localization structure consistent with existing keys; no hard-coded user-facing strings.
- **CON-004**: Maintain existing global import metrics—domain-specific metrics integrate seamlessly.
- **GUD-001**: Follow existing importer file layout and naming patterns (`<type>-ogg-dude.mjs`, utils, mapping, tests separation).
- **GUD-002**: Self-explanatory code: comments only for non-obvious decisions (regex, fallbacks, error handling).
- **PAT-001**: Reuse pattern of context builder returning `{ jsonData, zip, image, folder, element }` as in gear/armor/weapon contexts.
- **PAT-002**: Stats utilities pattern replicates `global-import-metrics` integration via domain registration object `{ domain, getStats }`.
- **PAT-003**: Use centralized Foundry mapping helpers (mandatory/optional) to ensure consistent validation/logging.
- **PAT-004**: Preload mode uses `_buildItemElements` to map preview items without creating documents.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Analyze existing importer patterns and obligation data model; confirm XML structure & field mapping needs.

| Task     | Description                                                                                                                     | DependsOn | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-001 | Inspect existing item importer files (`module/importer/items/*.mjs`) to list required context structure parts.                  |           |           |      |
| TASK-002 | Examine obligation data model (`module/models/obligation.mjs`) to derive system fields (description, value, isExtra, extraXp...). |           |           |      |
| TASK-003 | Confirm XML path and sample structure from `Obligations.xml` (assumed `Obligations.Obligation`)—adjust if different.            | TASK-001  |           |      |
| TASK-004 | Determine mandatory vs optional OggDude fields (Name, Key, Value, Extra flags) and if mapping table required.                  | TASK-002  |           |      |
| TASK-005 | Identify image handling strategy (likely fallback only; verify if archive contains images directory).                          | TASK-001  |           |      |
| TASK-006 | Define list of statistics keys aligning with other domains + any additional needed (none anticipated).                         | TASK-004  |           |      |
| TASK-007 | Review global metrics integration pattern for domain registration; capture interface shape.                                    |           |           |      |
| TASK-008 | Finalize requirements additions if XML differs (update REQ-002 / REQ-010 accordingly).                                         | TASK-003  |           |      |

### Implementation Phase 2

- GOAL-002: Design mapper, context builder, utilities, optional mapping table & test specifications.

| Task     | Description                                                                                                                                | DependsOn | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------- | --------- | ---- |
| TASK-009 | Draft `obligation-ogg-dude.mjs` with `obligationMapper` (field extraction, system object creation, flags) & `buildObligationContext`.       | TASK-004  |           |      |
| TASK-010 | Draft stats utils `obligation-import-utils.mjs` (reset, increment, addUnknownPropertyStat, getStats, registerObligationMetrics).            | TASK-006  |           |      |
| TASK-011 | If needed, design mapping table `obligation-mapping.mjs` for code translations; include resolver warning + metric increment.               | TASK-004  |           |      |
| TASK-012 | Specify integration of domain into `oggDude.mjs` (two buildContextMap insert points) with import statement at file top.                    | TASK-009  |           |      |
| TASK-013 | Specify addition to `_domainNames` array in `OggDudeDataImporter.mjs` preserving ordering & UI consistency.                                | TASK-009  |           |      |
| TASK-014 | Define localization keys FR/EN & fallback text style; update REQ list if new keys required.                                                | TASK-013  |           |      |
| TASK-015 | Write test cases matrix (unit mapper, error handling, stats; utils; integration with fixture; preview generation).                        | TASK-009  |           |      |
| TASK-016 | Plan documentation file `import-obligation.md` (purpose, usage steps, limitations, rollback).                                              | TASK-015  |           |      |
| TASK-017 | Define accessibility considerations (domain label, aria attributes reuse) ensure UI unaffected by new checkbox.                           | TASK-013  |           |      |

### Implementation Phase 3

- GOAL-003: Prepare implementation, migration, rollback & validation strategy.

| Task     | Description                                                                                                                           | DependsOn | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---- |
| TASK-018 | Migration impact assessment (none: only importer extension)—document in `import-obligation.md`.                                       | TASK-016  |           |      |
| TASK-019 | Define deployment steps (add files, run tests `pnpm test`, manual Foundry import simulation) & success criteria.                       | TASK-015  |           |      |
| TASK-020 | Define rollback: remove domain lines + localization keys + files (non-destructive to items already created).                           | TASK-019  |           |      |
| TASK-021 | Performance validation plan: measure import time vs existing domain (sample 50 obligations).                                           | TASK-019  |           |      |
| TASK-022 | Security review checklist (mandatory field validation, no eval, sanitized description) added to documentation.                         | TASK-018  |           |      |
| TASK-023 | Confirm global metrics aggregation includes obligation (call `aggregateImportMetrics()` after test run).                               | TASK-010  |           |      |
| TASK-024 | Final verification matrix linking tests to REQ coverage (map REQ-001..013).                                                            | TASK-015  |           |      |

## 3. Alternatives

- **ALT-001**: Treat obligations as generic gear items and reuse existing gear mapper—rejected (loses obligation-specific fields `value`, `isExtra`, bonus XP logic, mismatched schema).
- **ALT-002**: Implement obligations import via one generic dynamic mapper reading schema from model—rejected (higher complexity, performance overhead, less explicit error logging).
- **ALT-003**: Skip stats utilities for obligation—rejected (inconsistent metrics dashboard & monitoring).

## 4. Dependencies

- **DEP-001**: Foundry VTT v13.x runtime (for TypeDataModel & sheet registration already present).
- **DEP-002**: `jszip` library (already dynamically imported in `OggDudeImporter.load`).
- **DEP-003**: Existing global metrics utilities (`module/importer/utils/global-import-metrics.mjs`).
- **DEP-004**: Existing logger utility (`module/utils/logger.mjs`).

## 5. Files

- **FILE-001**: `module/importer/items/obligation-ogg-dude.mjs` – Mapper & context builder for obligation domain.
- **FILE-002**: `module/importer/utils/obligation-import-utils.mjs` – Stats utilities & metrics registration.
- **FILE-003**: `module/importer/mapping/obligation-mapping.mjs` – Optional mapping table (only if OggDude codes require translation).
- **FILE-004**: `module/importer/oggDude.mjs` – Add import + buildContextMap entries in both processing functions.
- **FILE-005**: `module/settings/OggDudeDataImporter.mjs` – Add domain to `_domainNames` array for UI selection.
- **FILE-006**: `lang/fr.json` – Add localization key for obligation domain label.
- **FILE-007**: `lang/en.json` – Add localization key for obligation domain label.
- **FILE-008**: `tests/importer/obligation-oggdude.spec.mjs` – Unit tests for mapper.
- **FILE-009**: `tests/importer/obligation-utils.spec.mjs` – Unit tests for stats utilities.
- **FILE-010**: `tests/importer/obligation-import.integration.spec.mjs` – Integration test using XML fixture.
- **FILE-011**: `resources/integration/Obligations.xml` – Sample OggDude obligations data for integration tests.
- **FILE-012**: `documentation/importer/import-obligation.md` – Documentation of new domain import usage.
- **FILE-013**: `documentation/importer/README.md` – Updated domain support matrix (add obligation status).

## 6. Testing

Comprehensive strategy ensuring requirement coverage & regression safety.

- **TEST-001**: Mapper unit tests (`tests/importer/obligation-oggdude.spec.mjs`):
  - Case: Valid minimal obligation (Name, Key, Value) → mapped object fields & flags present (covers REQ-001).
  - Case: Missing mandatory Name or Key → rejected count increments (REQ-001, SEC-001).
  - Case: Optional description absent → defaults to empty string (REQ-001).
  - Case: Statistics totals (total/imported/rejected) correctness after multiple items (REQ-003).
- **TEST-002**: Stats utils tests (`tests/importer/obligation-utils.spec.mjs`): initialization, increment, unknown property tracking, registration object shape (REQ-003, PAT-002).
- **TEST-003**: Integration test (`tests/importer/obligation-import.integration.spec.mjs`): load `Obligations.xml`, map first N obligations (e.g. 5), validate type, system fields, stats totals (REQ-002, REQ-008, REQ-012).
- **TEST-004**: Preview loading (part of integration): ensure `preloadOggDudeData` includes obligation domain when selected (REQ-012, PAT-004).
- **TEST-005**: Localization presence (assert key retrieval via `game.i18n.localize`) in a simulated environment (REQ-006, CON-003).
- **TEST-006**: Global metrics aggregation includes obligation metrics domain (REQ-003, CON-004).
- **TEST-007**: Performance sampling (manual / script) verifying linear time for batch mapping of 50 sample obligations < threshold vs armor baseline (CON-002).
- **TEST-008**: Security validation test: ensure no HTML injection (simulate description with script tag removed/neutralized) (SEC-001).

## 7. Risks & Assumptions

- **RISK-001**: Incorrect XML path (`Obligations.Obligation`) could break mapping; mitigation—confirm path early (TASK-003).
- **RISK-002**: Large volume performance degradation; mitigation—profile & optimize loops/simple property access (TASK-021).
- **RISK-003**: Missing or inconsistent mandatory fields causing many rejections; mitigation—log warnings & document fallback behavior.
- **RISK-004**: Localization key omission leading to UI label display issues; mitigation—add FR/EN keys + test (TEST-005).
- **RISK-005**: Stats integration mismatch causing dashboard inconsistency; mitigation—unit test registration (TEST-002, TEST-006).
- **ASSUMPTION-001**: XML file name is exactly `Obligations.xml` inside OggDude ZIP.
- **ASSUMPTION-002**: XML node path for obligations is `Obligations.Obligation` similar to other domain structures.
- **ASSUMPTION-003**: Obligations have fields: Name, Key, Description (optional), Value (numeric), Extra flags (isExtra, extraXp, extraCredits) either present or derivable.
- **ASSUMPTION-004**: No complex mapping tables required unless OggDude codes appear (hence optional FILE-003).

## 8. Related Specifications / Further Reading

- `documentation/plan/feature-oggdude-talent-import-1.md` – Reference pattern for adding new domain importer.
- `documentation/plan/feature-oggdude-import-completion-1.md` – Global completion metrics pattern.
- [Foundry VTT API v13 Docs](https://foundryvtt.com/api/)
- OggDude community resources (structure reference).
