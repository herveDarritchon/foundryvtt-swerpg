---
name: 'SWERPG – Implement the tests from a plan'
description: 'Implement the Vitest / Playwright tests defined in section ## 6. Testing of an existing SWERPG plan.'
---

You act as the `swerpg-dev-test` agent for the SWERPG system (Foundry VTT v13+).

Your goal: **implement the automated tests** (Vitest / Playwright) described in section `## 6. Testing` of an existing SWERPG implementation plan.

### Target plan

The reference plan is located at:
`<replace-here-with-the-full-plan-path, e.g. /documentation/plan/oggdude-importer/feature-progress-bar-1.md>`

From this plan, you must:

1. Read and interpret the `TEST-XXX` items described in section `## 6. Testing`.
2. Identify the existing files (`FILE-XXX`) to be tested.
3. Create or update the necessary test files (Vitest / Playwright) to cover the mentioned cases.

### Scope of the tests

Specify what you want for this run:

- Desired scope:
  - `<"all TEST-XXX from the plan" or "only TEST-00X, TEST-00Y, ...">`

- Target test types:
  - `<"Vitest only" or "Playwright only" or "Vitest + Playwright">`

Example:

> Desired scope: all TEST-XXX from the plan
> Target test types: Vitest + Playwright

### Mandatory rules

You must:

1. Follow the **SWERPG Project Instructions**:
   `.github/instructions/swerpg-project-instructions.instructions.md`

2. Follow the related testing instructions:
   - `.github/instructions/nodejs-javascript-vitest.instructions.md`
   - `.github/instructions/playwright-typescript.instructions.md` _(and/or python if applicable)_

3. Align with the `swerpg-dev-test.agent.md` spec:
   - Create / modify **only** the test files and, if necessary, small “test helpers” that are explicitly needed.
   - Do not modify production code, unless the test plan explicitly requires it (and in that case, clearly mention it in your response).

4. Use the `edit` tool to modify or create the test files:
   - Vitest unit tests (JS/TS) in the folders provided by the repo.
   - Playwright E2E tests (TypeScript or Python according to the project’s convention).

5. Respect the existing structure:
   - Organization of the test suites.
   - Import patterns.
   - Existing utility helpers.

### Running the tests

When relevant:

- Run the appropriate commands with `runCommands`:
  - e.g. `pnpm test`, `pnpm test:unit`, `pnpm test:e2e`, `pnpm eslint`.

- Analyze errors with `testFailure` / `problems`.
- Fix the tests that YOU have just written if your expectations were wrong.

If existing tests fail for reasons unrelated to what you have added:

- Do not modify them blindly.
- Report them in your response (section “Observations / items to review”).

### Format of your response

You respond in **French**, and your answer must be structured as follows:

1. **Résumé des tests implémentés**
   - Liste des `TEST-XXX` couverts.
   - Pour chacun, mention rapide : Vitest / Playwright, type de scénario.

2. **Fichiers de tests créés ou modifiés**
   - Pour chaque fichier de tests :
     - chemin (ex. `tests/importer/oggdude-importer-progress.spec.mts`),
     - ce qui a été ajouté (nouvelles suites, nouveaux cas, refactors de tests).

3. **Tests exécutés**
   - Commandes lancées (ex. `pnpm test:unit`),
   - résultat (succès / échec),
   - messages d’erreur importants s’il y en a.

4. **Observations / items à revoir**
   - Problèmes découverts dans le code de prod qui mériteraient un plan (bug, dette technique).
   - Incohérences entre le plan (`TEST-XXX`) et le comportement réel ou la faisabilité des tests.
   - Suggestions pour renforcer la stratégie de tests dans un futur plan.

All explanatory texts are in **French**; file names, functions, hooks, identifiers (`TEST-XXX`, `TASK-XXX`, etc.) remain in **English**.
