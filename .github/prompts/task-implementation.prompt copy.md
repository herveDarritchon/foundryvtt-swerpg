# Phase 1 : Plan and Implement

Look at the task description and the project `#search/codebase` :

* Inspect the **coding-style & contribution guidelines** (e.g. `CODING_STYLE_AGENT.md`, `CONTRIBUTING.md`, project docs) and align all changes with these rules.
* Analyze the requested feature/bugfix plan and **derive a clear technical plan of action** (steps, impacted modules, data flows).
* Locate all relevant files and modules in the codebase and **apply existing architectural patterns** (separation of concerns, domain vs infrastructure, services, adapters, etc.).
* Implement or update the **domain/business logic** in the appropriate modules, keeping it **pure and testable** (no hard dependencies on framework or environment where the project rules require this).
* Implement or update the **integration/adaptation layers** (e.g. framework bindings, UI handlers, hooks) to call the domain logic according to the project’s patterns.
* Add or update **unit tests** (and integration tests where relevant) to cover the new/changed behavior, following the project’s testing conventions (framework, folder structure, naming).
* Ensure all changes respect the **project’s tooling**: linting, formatting (e.g. Prettier), type checks (if any), build steps and CI expectations.
* Update or create any **minimal technical documentation** or inline comments necessary to understand the new behavior (especially public APIs, non-trivial flows, migrations).
* Prepare the changes so they are **ready to be committed**, with a clear scope and compliant with the repository’s commit/PR conventions.

When you execute a plan of action, follow this structure for each task you implement:

* **Goal**: Short description of what this task changes or adds.
* **Scope**: Files, modules or layers impacted by this task.
* **Approach**: Short explanation of how you implement it (patterns reused, design decisions).
* **Code Changes**: Summary of the key modifications (APIs changed, new functions/classes, removed code).
* **Tests**: Which tests you added/updated and what they cover.
* **Risks**: Potential side effects, breaking changes, or constraints introduced.

For all the above points, produce **actual code changes** (implementation + tests), aligned with the project’s coding style and tooling, and describe them in a way that another developer can review and integrate them.

Put any additional implementation notes (if needed) into a specific subfolder in the `documentation` folder based on the module name, only when it brings real value (complex flows, non-obvious decisions).

Create or update a `DEVELOPMENT_PROCESS.md` file with the steps you followed to implement the changes, referencing which files and folders have been analyzed and modified, so the process can be reused or audited later.
