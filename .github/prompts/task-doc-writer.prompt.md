# Phase 1 : Plan and Write the Feature Task Plan

Look at all the project #search/codebase :

- Identify the **feature source** (issue, spec, user story) and extract **goals**, **scope** and **out-of-scope**.
- Locate all **impacted areas** in the codebase: modules, hooks, controllers, DataModels, Document/Item Sheets, templates (HBS), styles (LESS), i18n, packs/compendia, migrations.
- Map **integration points** with Foundry v13 lifecycle and APIs (init/setup/ready, ApplicationV2/DocumentSheetV2, TypeDataModel, i18n).
- Define **constraints** to respect:
  - Foundry VTT v13 best practices per artifact type (HBS, JS/TS, LESS, i18n, migration, packs).
  - Project coding style: `CODING_STYLES_AGENT.md`.
  - A11y (ARIA, focus UX clavier), performance (minimal re-render, event delegation), logging (debug only), clean-up (listeners).
- Draft a **high-level flow** of the feature with a Mermaid diagram (flowchart or sequence) showing user actions, hooks, controllers, DataModel updates, and UI refreshes.
- Produce a **Task Plan**: an executable checklist covering analysis, UI, logic, data, tests, migration, release and documentation.
- Specify a **test plan** (Vitest) with file names and Given/When/Then scenarios; define mocks/stubs for Foundry APIs.
- If schema or packs are impacted, describe a **data migration** (idempotent, measurable, safe).
- Define **release steps** (settings, flags, changelog, screenshots, user docs) and **risk/rollback** considerations.

- when you write **task items**, use the format:
  - **Task**: Short actionable description.
  - **Type**: hbs/js/less/i18n/migration/test/docs/data.
  - **Files**: Precise relative paths to create/modify.
  - **Refs**: Hooks/classes/templates impacted (e.g., `init`, `ApplicationV2`, `templates/actor/…`).
  - **Acceptance**: Concrete pass/fail criteria (prefer Given/When/Then).
  - **DoD**: Definition of Done for this task (lint/tests/build/a11y/i18n/perfs).
  - **Risks**: What could break + mitigation.
  - **Estimate**: S/M/L (or hours if required).
  - **Owner**: Optional assignee.

- when you write **test specs**, use the format:
  - **File**: `tests/<feature>.spec.ts`
  - **Scenario**: Given/When/Then (nominal + edge/error cases)
  - **Mocks**: Foundry globals/APIs to mock
  - **Coverage target**: % or critical paths to hit

For all the above points, create a **Feature Task Plan** in markdown format with mermaid diagrams if needed.

Put this in a specific subfolder in the documentation folder based on the module name, for example:

- `documentation/tasks/<module>/<feature-slug>.md`

Create or update a **TASK_PLAN_PROCESS.md** file with the steps to create the task plan from this prompt, explicitly listing:

- Which files/folders were searched and inspected,
- Which constraints from `CODING_STYLES_AGENT.md` and Foundry v13 were applied,
- What decisions/assumptions were made,
- Any open questions and risks to track.
