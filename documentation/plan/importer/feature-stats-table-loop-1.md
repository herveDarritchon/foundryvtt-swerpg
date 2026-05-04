---
goal: Generic loop for OggDude importer stats table rows
version: 1.0
date_created: 2025-11-28
last_updated: 2025-11-28
owner: importer-ui
status: 'Completed'
tags: ['feature', 'importer', 'ui', 'spec-driven']
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-green)

Refactor the OggDude importer statistics table to remove hard-coded per-domain blocks and rely on a generic Handlebars iteration over a normalized domain array. Aligns the template with spec-driven patterns, reduces duplication, and simplifies future additions of new domains defined in `OggDudeDataImporter`.

## 1. Requirements & Constraints

- **REQ-001**: The stats table must iterate over a single array of domain entries produced in `_prepareContext()` instead of hard-coded rows.
- **REQ-002**: Each entry must expose status, domain label key, stats (total/imported/rejected), and formatted duration.
- **REQ-003**: Preserve current accessibility features: `aria-label` on status cells, scoped row headers, semantic table structure.
- **REQ-004**: Honor existing localization keys and domain ordering defined in `_domainNames`.
- **REQ-005**: Template must gracefully render zero stats (empty tbody) without errors.
- **REQ-006**: Ensure toggles (`hasStats`, `showStats`) continue to behave identically.
- **REQ-007**: No behavior change for progress bar, metrics, preview sections.
- **REQ-008**: Tests covering the context builder/template must be updated to reflect the new structure.
- **REQ-009**: Maintain compatibility with Foundry v13 ApplicationV2 and Handlebars.
- **SEC-001**: No additional data exposure; domain array derives from already available stats.
- **CON-001**: Avoid introducing custom helpers; stick to core Handlebars features (`each`, `if`).
- **GUD-001**: Follow self-explanatory commenting rules; only comment non-trivial logic.
- **PAT-001**: Keep logic in JS context builder, template remains declarative.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Normalize importer stats data for template iteration.

| Task     | Description                                                                                                                                      | DependsOn | Completed | Date       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | --------- | ---------- |
| TASK-001 | Inspect `module/settings/OggDudeDataImporter.mjs` to map existing stats sources (`importStats`, `importMetricsFormatted`, `importDomainStatus`). |           | ✅        | 2025-11-28 |
| TASK-002 | Implement `_buildDomainStatsRows(stats, metricsFormatted, domainStatus)` returning ordered array aligned with `_domainNames`.                    | TASK-001  | ✅        | 2025-11-28 |
| TASK-003 | Add result to `_prepareContext()` as `statsTableRows`, ensuring empty array fallback when stats missing.                                         | TASK-002  | ✅        | 2025-11-28 |

### Implementation Phase 2

- GOAL-002: Update Handlebars template to iterate generically.

| Task     | Description                                                                                                                                   | DependsOn | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---------- |
| TASK-004 | Replace hard-coded `<tr>` blocks in `templates/settings/oggDude-data-importer.hbs` with `{{#each statsTableRows}}` loop using row properties. | TASK-002  | ✅        | 2025-11-28 |
| TASK-005 | Preserve cell structure: status `<td>`, domain `<th scope="row">`, totals `<td>`, and duration field referencing `row.metrics.duration`.      | TASK-004  | ✅        | 2025-11-28 |
| TASK-006 | Ensure empty state (no rows) keeps `<tbody>` but renders no `<tr>`, matching `hasStats` gating logic.                                         | TASK-004  | ✅        | 2025-11-28 |

### Implementation Phase 3

- GOAL-003: Update tests and ensure regression coverage.

| Task     | Description                                                                                                           | DependsOn | Completed | Date       |
| -------- | --------------------------------------------------------------------------------------------------------------------- | --------- | --------- | ---------- |
| TASK-007 | Adapt existing Vitest specs (context builder/template) to assert array length, ordering, and rendered rows.           | TASK-003  | ✅        | 2025-11-28 |
| TASK-008 | Add regression test ensuring new domains added to `_domainNames` automatically appear without template modifications. | TASK-007  | ✅        | 2025-11-28 |
| TASK-009 | Run relevant test suites (`pnpm test --filter importer`) and capture results.                                         | TASK-007  | ✅        | 2025-11-28 |

## 3. Alternatives

- **ALT-001**: Keep hard-coded rows and document procedure for adding new domains; rejected due to maintainability and higher risk of inconsistencies.
- **ALT-002**: Introduce custom Handlebars helper to build rows; rejected because `each` loop suffices and avoids helper registration overhead.

## 4. Dependencies

- **DEP-001**: `module/settings/OggDudeDataImporter.mjs` context builder.
- **DEP-002**: `templates/settings/oggDude-data-importer.hbs` stats table template.
- **DEP-003**: `tests/settings/OggDudeDataImporter.context.spec.mjs` (or equivalent) for context validation.
- **DEP-004**: `tests/settings/oggDudeDataImporter.template.spec.mjs` for template rendering assertions.

## 5. Files

- **FILE-001**: `module/settings/OggDudeDataImporter.mjs` – new normalization helper + context injection.
- **FILE-002**: `templates/settings/oggDude-data-importer.hbs` – stats table loop.
- **FILE-003**: `tests/settings/OggDudeDataImporter.context.spec.mjs` – update expected context shape.
- **FILE-004**: `tests/settings/oggDudeDataImporter.template.spec.mjs` – ensure rows render via loop.

## 6. Testing

- **TEST-001**: Unit test verifying `_buildDomainStatsRows` orders entries per `_domainNames` and includes metrics/status info.
- **TEST-002**: Template test checking row count matches available stats and status class/label propagate correctly.
- **TEST-003**: Regression test ensuring absence of stats yields no rows but table structure remains valid.

## 7. Risks & Assumptions

- **RISK-001**: Missing domain key in stats could break row build; mitigation: default zeros with `pending` status.
- **RISK-002**: Potential mismatch between domain arrays and localization keys; mitigation: reuse domain metadata from `_domainNames`.
- **ASSUMPTION-001**: `_domainNames` is the single source of truth for ordering.
- **ASSUMPTION-002**: Existing status and metric builders remain unchanged and reusable.

## 8. Related Specifications / Further Reading

- `documentation/plan/feature-importer-domain-status-icons-1.md`
- `documentation/plan/feature-importer-global-progress-jauge-1.md`
- `.github/instructions/spec-driven-workflow-v1.instructions.md`
- `.github/instructions/a11y.instructions.md`
