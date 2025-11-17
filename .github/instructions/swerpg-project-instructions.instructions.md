# SWERPG Project Instructions

> Purpose: Define shared project-level constraints and conventions for all Copilot agents working in the
`foundryvtt-sw-edge` repository (Star Wars: Edge of the Empire system for Foundry VTT v13+).

---

## 1. Repository & context

- You are working in the `foundryvtt-sw-edge` repository.
- This repository defines a **Foundry VTT game system**, not a standalone application.
- The system targets **Star Wars: Edge of the Empire** and must:
    - Support Foundry VTT **v13+**.
    - Provide a strong **Star Wars–inspired, immersive UI**.
    - Automate repetitive tasks for Game Masters and players.

**Hard rule:**

- Never modify **Foundry core** or other modules. Only edit files inside this repository.

---

## 2. Tech stack & directory structure

- Languages & technologies:
    - **Vanilla JavaScript ES2020+** (ES modules, no TypeScript unless explicitly required).
    - **Handlebars** (`.hbs`) for templates.
    - **LESS** as the source of truth for styles (compiled to CSS).

- Typical layout (non-exhaustive):
    - Game logic, applications and utilities in `module/**`.
    - Templates in `templates/**`.
    - Styles in `styles/**` and `styles/less/**`.
    - Documentation/specs in `documentation/**` (including `plan/` and other specs).
    - Localisation files in `lang/**`.

**Rules:**

- Always edit **LESS** files, never modify compiled CSS directly.
- Follow the conventions and patterns described in:
    - `/documentation/CODING_STYLES_AGENT.md`
    - `.github/instructions/nodejs-javascript-vitest.instructions.md`
    - `.github/instructions/task-implementation.instructions.md`
    - `.github/instructions/spec-driven-workflow-v1.instructions.md`

---

## 3. Foundry VTT–specific rules

- Target platform: **Foundry VTT v13+**.
- Prefer modern Foundry patterns **when already in use in the project**:
    - `ApplicationV2` instead of legacy `Application` when appropriate.
    - DataModel-based documents when already used in the system.
- Do **not** change document data shapes (Actor, Item, etc.) unless explicitly required by:
    - a specification in `documentation/**`, or
    - an implementation plan in `documentation/plan/**`.

**Hooks & lifecycle:**

- Use `Hooks.on` / `Hooks.once` consistently, respect existing hook registration patterns.
- When adding new hooks or applications:
    - Check for existing apps/helpers that could be reused or extended (`search/codebase`, `usages`).
    - Avoid duplicating logic that already exists elsewhere in the system.

**Configuration & manifest:**

- Do **not** modify `system.json`, build config, or Foundry configuration files unless:
    - the user explicitly requested it, or
    - it is clearly specified in a project spec or implementation plan.

---

## 4. Design & UX (Star Wars look & feel)

- The system uses a **Star Wars–inspired** visual identity:
    - Dark, tech-like UI.
    - Consistent fonts, colors and spacing.
    - UI components (headers, buttons, cards, gauges, etc.) should feel coherent and reusable.

**CSS / LESS rules:**

- Always prefer:
    - existing CSS variables (colors, fonts, spacing),
    - existing mixins and utility classes.
- Avoid:
    - inline styles in templates,
    - magic numbers when a token already exists,
    - broad or global selectors that could impact core Foundry UI or other systems.

**Foundry UI integration:**

- Respect Foundry’s base layout and design:
    - Keep windows usable, resizable, and readable on typical resolutions.
    - Use existing Foundry classes when they provide expected behavior.

---

## 5. Logging, errors & localisation

- Logging:
    - Use the existing logger (e.g. `module/utils/logger.mjs`) instead of raw `console.*` when possible.
    - Remove temporary debug logs before finalising a change, unless they are clearly part of a diagnostic pattern.

- Errors & notifications:
    - Use Foundry’s notification APIs (`ui.notifications`, `console` for dev logs) consistently.
    - Avoid throwing raw errors to the user unless absolutely necessary.

- Localisation:
    - Prefer adding or using keys in `lang/*.json` for user-facing strings.
    - Do not hardcode long or user-visible texts in code when they belong in localisation files.

---

## 6. Code quality & architecture

- General principles:
    - Favour small, testable functions and clear modules.
    - Apply SOLID principles pragmatically:
        - Single Responsibility: do not turn files into “god objects”.
        - Open/Closed: add behavior via new functions/classes rather than hacking existing ones when it makes sense.
    - Avoid premature abstractions (no YAGNI).

- Existing patterns:
    - Before introducing a new pattern, check:
        - Similar features in the repository (e.g. existing apps, importers, dice rollers).
        - Shared utilities in `module/utils/**`.
    - Align with the project-wide coding style in `/documentation/CODING_STYLES_AGENT.md`.

- Tests:
    - Unit tests: Vitest, as described in `.github/instructions/nodejs-javascript-vitest.instructions.md`.
    - E2E tests: Playwright, as described in `.github/instructions/playwright-typescript.instructions.md` (or python
      variant if used).
    - When implementing features:
        - Respect the testing strategy defined in specs / plans (`TEST-XXX`).
        - Do not silently break existing tests.

---

## 7. Security & performance

- Follow guidelines from:
    - `.github/instructions/security-and-owasp.instructions.md`
    - `.github/instructions/performance-optimization.instructions.md`

- Security:
    - Never execute arbitrary user-provided code.
    - Be careful with untrusted external data (e.g. importers like OggDude).
    - Avoid leaking unnecessary information in logs.

- Performance:
    - Be mindful of expensive computations inside hooks called frequently (e.g. `updateActor`, `render*` hooks).
    - Avoid unnecessary DOM manipulations, prefer batch updates where possible.

---

## 8. Spec-driven & plan-driven workflow

This project is **spec-driven** and **plan-driven**:

- New features, refactors, or migrations should:
    - be described in a spec or implementation plan under `documentation/` (especially `documentation/plan/**`),
    - then be implemented strictly according to that plan.

- Dedicated instructions:
    - See `.github/instructions/spec-driven-workflow-v1.instructions.md` for spec workflow.
    - See `.github/instructions/task-implementation.instructions.md` for task execution rules.

Agents such as:

- `swerpg-plan` (implementation planning),
- `swerpg-dev-core` (core code implementation),
- `swerpg-dev-test` (test implementation),

must **always** apply these SWERPG project instructions as a baseline, in addition to their own role-specific
instructions.

---

## 9. Language policy

- Explanations, comments and documentation addressed to the user must be in **French**.
- Code, filenames, APIs, log identifiers and technical terms remain in **English**.
- When in doubt, prefer:
    - French for narrative / explanations,
    - English for all technical artefacts.
