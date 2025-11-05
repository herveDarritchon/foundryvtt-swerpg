# Copilot / AI instructions for Star Wars Edge RPG (short)

Keep guidance concise and actionable. When creating or modifying code, reference the exact files below and follow the project’s conventions.

---

## Key concepts (big picture)

- This repository implements a **Foundry VTT Game System** for *Star Wars: Edge of the Empire* (FFG/Edge Studio).
- The browser entry point is `swerpg.mjs` (bundled via Rollup).
- System metadata and compendium configuration live in `system.json` (packs, document types, compatibility, grid).
- Runtime code resides in `module/` (applications, canvas, documents, models, utils, hooks, etc.).
- UI templates live in `templates/`; styles in `styles/` with the compiled output `styles/swerpg.css`.
- Data packs are binary LevelDB files stored in `packs/`, with editable sources in `_source/`.  
  Use `build.mjs` to **compile** or **extract** pack data.

---

## Developer workflows (commands you can run)

- **Build the system bundle and assets (local development):**

```bash
  pnpm run build
````

Runs sequentially:

* `pnpm run compile` → `node build.mjs compile` (compile packs)
* `pnpm run rollup` → bundle `swerpg.mjs` via Rollup
* `pnpm run less` → compile `styles/swerpg.less` → `styles/swerpg.css`
* **Compile packs only:**

```bash
  pnpm run compile
```

Compiles `_source/*.yml` → `packs/*.db`.

* **Extract packs back to source:**

```bash
  pnpm run extract
```

Extracts `packs/*.db` → `_source/*.yml`.

* **Run tests and coverage:**

```bash
  pnpm run test
  pnpm run test:coverage
```

---

## Project-specific conventions and patterns

* **System namespace:**
  Expose the API during initialization as `swerpg.api` in `swerpg.mjs`.
  Use `swerpg.api.*` for cross-module helpers (e.g. `swerpg.api.rollEdgeDice()`).

* **Document registration:**
  Custom document classes and data models are registered in `swerpg.mjs` via
  `CONFIG.Actor.documentClass`, `CONFIG.Item.documentClass`, and `CONFIG.Item.dataModels`.
  Define new models under `module/models/` and wire them in this file.

* **Packs / data flow:**
    * Editable YAML sources → `_source/<pack-name>/*.yml`.
    * Compiled binary packs → `packs/<pack-name>.db`.
    * Run `pnpm run compile` after editing `_source` to rebuild packs.
    * `system.json` must list all declared packs (ensure names match folder structure).

* **Localization:**
  Add strings to `lang/fr.json` or `lang/en.json`.
  Reference them in code via `game.i18n.localize("swerpg.<Key>")`.
  System-level config objects are localized during init in `swerpg.mjs`.

* **UI and styles:**
    * Handlebars templates under `templates/` follow Foundry conventions.
    * Use scoped CSS selectors under `.swerpg` or `.swerpg-sheet` to prevent collisions.
    * LESS sources in `styles/`, compiled via `pnpm run less`.

* **Dice roller pattern:**
  Implement core dice logic under `module/dice/`.
  Export functions like `rollEdgeDice()` and `parseSymbols()` with well-defined outputs.

* **Assets and design:**
    * `assets/icons` → icons for actions, combat, etc.
    * `fonts/` → Star Wars-inspired typefaces (Aurebesh, Orbitron).
    * Maintain a dark, high-contrast aesthetic consistent with the Star Wars universe.

---

## Integration & cross-component notes

* **Socket communications:**
  System events are handled through `game.socket.on('system.swerpg', ...)`.
  Implement new actions in `module/socket.mjs` and maintain backward compatibility.

* **Template loading:**
  Templates are preloaded in `swerpg.mjs` during `init` or `ready`.
  Template paths follow `systems/swerpg/templates/...`.

* **Compendiums:**
  Each new pack added to `_source` should be declared in both:

    * `build.mjs` (`CONFIG.databases`)
    * `system.json` (`"packs"` array)

* **Testing:**

    * Use **Vitest**.
    * Tests live in `tests/` with mirrors of core folders (`lib/`, `utils/`, etc.).
    * Follow naming: `test_<feature>_<case>.spec.js`.
    * Mock Foundry objects where needed.

---

## Examples to reference in PRs

* **Adding a new Item model:**
  Create a class in `module/models/` (e.g. `EdgeWeaponModel.js`),
  register it in `swerpg.mjs` under `CONFIG.Item.dataModels.weapon`.

* **Adding a new compendium pack:**
    1. Create YAML files under `_source/<pack-name>/`.
    2. Add the pack name to `build.mjs` databases.
    3. Add it to the `system.json` pack list.
    4. Run `pnpm run compile` to generate the `.db`.

---

## Small rules for AI contributions

* **Do not break public APIs** (`swerpg.api`, `CONFIG.*`) without coordinated migration.
* **When editing `_source` data**, include in PR description how pack compilation was validated (`pnpm run compile`).
* **Commit granularity:** keep code, templates, styles, and data changes separate for easier review.

---

## Files to inspect for deeper context

* `swerpg.mjs`, `build.mjs`, `system.json`, `rollup.config.mjs`, `package.json`, and `lang/en.json`
* Key directories:

    * `module/` → main system logic
    * `_source/` → pack sources (YAML)
    * `packs/` → compiled compendiums
    * `templates/` → UI
    * `styles/` → LESS/CSS

---

If anything in this file is unclear or more examples are needed (component lifecycle, Foundry hooks, dice workflow, or data model integration), ask for specific snippets and they will be provided.