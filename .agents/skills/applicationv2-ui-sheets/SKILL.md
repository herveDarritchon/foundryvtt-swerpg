---
name: applicationv2-ui-sheets
description: Use this skill when creating, modifying, reviewing, or refactoring Foundry VTT v13+ UI applications and sheets in the Star Wars Edge RPG `swerpg` system. Trigger it before touching actor sheets, item sheets, ApplicationV2 classes, Handlebars templates, sheet tabs, `PARTS`, `TABS`, `tabGroups`, `data-application-part`, `data-action="tab"`, sheet CSS/LESS, sheet registration, or UI interactions that persist document data.
license: private
compatibility: Claude Code, Codex, OpenCode, opencode
metadata:
  project: swerpg
  platform: Foundry VTT v13+
  domain: ApplicationV2, Handlebars, actor sheets, item sheets, tabs, CSS/HTML UI contracts
  source_docs: documentation/architecture/adr/adr-0001-foundry-applicationv2-adoption.md; documentation/architecture/ui/APPLICATIONS.md; documentation/architecture/ui/APPLICATIONS-RULES.md; documentation/architecture/ui/APPLICATIONS-AGENT.md; documentation/architecture/ui/SHEETS-TABS.md; documentation/architecture/ui/SHEETS-REFACTORING-PLAN.md; documentation/architecture/ui/HANDLEBARS.md; documentation/architecture/ui/CANVAS.md; documentation/architecture/ui/PHASE4-CSS-HTML-CONFORMITY.md; docs/swerpg/SHEETS-TABS.md
---

# ApplicationV2 & UI Sheets — `swerpg`

This skill defines the UI coding contract for the Star Wars Edge RPG `swerpg` Foundry VTT v13+ system.

Use it to build maintainable ApplicationV2 sheets that respect Foundry lifecycle rules, `swerpg` CSS/HTML contracts, Handlebars boundaries, and document persistence rules.

## Core decision

`swerpg` uses the modern Foundry VTT v13+ architecture:

- `ApplicationV2` for UI applications.
- `HandlebarsApplicationMixin` for Handlebars-rendered sheets and UI components.
- `foundry.abstract.TypeDataModel` as the data-shape source of truth.
- Stable CSS/HTML contracts for internal code and external modules.

Do not introduce ApplicationV1 patterns unless the user explicitly asks for a controlled legacy migration.

## When to use ApplicationV2

Use ApplicationV2 for:

- Actor sheets.
- Item sheets.
- Journal-page-like system sheets that are part of the `swerpg` UI.
- Dialogs or tools that need Foundry-native rendering, actions, parts, or lifecycle hooks.
- Any new UI that should integrate with Foundry windows, rendering, ownership, and localization.

Do not use direct DOM-only widgets, custom mini-frameworks, or external UI frameworks for core sheets unless the repository already does so and the user requests it.

## Base classes

When creating or modifying sheets, preserve these base-class rules:

```text
Actor sheets -> SwerpgBaseActorSheet
Item sheets  -> SwerpgBaseItemSheet
```

Do not extend `ActorSheet`, `ItemSheet`, old ApplicationV1 sheet classes, or raw `ApplicationV2` for actor/item sheets when a `swerpg` base exists.

Known actor-sheet mappings:

```text
AdversarySheet  -> module/applications/sheets/adversary-sheet.mjs
CharacterSheet  -> module/applications/sheets/character-sheet-origin.mjs
CharacterSheet  -> module/applications/sheets/character-sheet-swerpg.mjs
CharacterSheet  -> module/applications/sheets/character-sheet.mjs
HeroSheet       -> module/applications/sheets/hero-sheet.mjs
```

Known item-sheet mappings:

```text
ArmorSheet          -> module/applications/sheets/armor-sheet.mjs
BackgroundSheet     -> module/applications/sheets/background-sheet.mjs
CareerSheet         -> module/applications/sheets/career-sheet.mjs
GearSheet           -> module/applications/sheets/gear-sheet.mjs
ObligationSheet     -> module/applications/sheets/obligation-sheet.mjs
OriginSheet         -> module/applications/sheets/origin-sheet.mjs
SpecializationSheet -> module/applications/sheets/specialization-sheet.mjs
SpeciesSheet        -> module/applications/sheets/species-sheet.mjs
TalentSheet         -> module/applications/sheets/talent-sheet.mjs
WeaponSheet         -> module/applications/sheets/weapon-sheet.mjs
```

If the repository uses a slightly different current filename, follow the repository. Do not rename existing classes or files unless the user explicitly asks.

## Naming and file placement

For new sheets:

```text
Class name: PascalCase + Sheet suffix
File name: kebab-case + -sheet.mjs suffix
Directory: module/applications/sheets/
One primary sheet class per file
```

Example:

```text
VehicleAttachmentSheet -> module/applications/sheets/vehicle-attachment-sheet.mjs
```

## Sheet registration

Defining a class is not enough. A new sheet must be registered during system bootstrap, usually in the init path such as `module/system/registration.mjs` or the repository’s current registration module.

Use the system ID exactly:

```js
Hooks.once('init', function () {
  Actors.registerSheet('swerpg', CharacterSheet, {
    types: ['character'],
    makeDefault: true,
    label: 'SWERPG.Sheets.Character',
  })

  Items.registerSheet('swerpg', WeaponSheet, {
    types: ['weapon'],
    makeDefault: true,
    label: 'SWERPG.Sheets.Weapon',
  })
})
```

Rules:

- Never change the system ID `swerpg`.
- Use `makeDefault: true` only for the primary sheet of a type.
- Treat exposed sheet keys and render hook names as stable public contracts.
- Do not register several competing default sheets for the same type.

## Options: ApplicationV2 pattern

Prefer the repository’s current ApplicationV2 style. In modern `swerpg` sheets, this often means `static DEFAULT_OPTIONS`, not legacy `static get defaultOptions()`.

Valid pattern:

```js
export default class WeaponSheet extends SwerpgBaseItemSheet {
  static DEFAULT_OPTIONS = {
    position: { width: 600, height: 'auto' },
    item: { type: 'weapon' },
    actions: {
      rollAttack: WeaponSheet.#onRollAttack,
      toggleEquipped: WeaponSheet.#onToggleEquipped,
    },
  }

  static {
    this._initializeItemSheetClass?.()
  }
}
```

If a legacy or transitional file still uses `static get defaultOptions()`, start from `super.defaultOptions` and do not insert business logic there.

Allowed in options:

- CSS classes.
- Window dimensions and position.
- Template/parts metadata.
- Scrollable selectors.
- Window behavior.
- ApplicationV2 `actions`.
- Tab declarations when the existing class expects them.

Forbidden in options:

- Reading `this.document`.
- Computing game mechanics.
- Performing document updates.
- Loading compendiums.
- Mutating system data.

## Required render context

Do not override `getData()` in ApplicationV2 sheets.

Use `_prepareContext(options)` for global render context:

```js
async _prepareContext(options) {
  const context = await super._prepareContext(options)

  const document = this.document
  context.document = document
  context.system = document.system
  context.config = game.system.config
  context.isOwner = document.isOwner

  // Add precomputed UI data here.
  context.tabs = this._getTabs?.() ?? context.tabs

  return context
}
```

The minimum context for a sheet is:

```text
document
system
config
isOwner
```

Actor sheets may also expose `actor`; item sheets may also expose `item`, but `document` and `system` should remain available.

## Part-specific render context

Use `_preparePartContext(partId, context, options)` only when the class uses ApplicationV2 `PARTS` or when the repository’s base class expects part-specific preparation.

Valid pattern:

```js
async _preparePartContext(partId, context, options) {
  await super._preparePartContext(partId, context, options)

  if (partId === 'talents') {
    context.talentTree = this._buildTalentTree(context.system.talents)
  }

  if (partId === 'equipment') {
    context.encumbrance = this._prepareEncumbrance(context.system)
  }

  return context
}
```

Rules:

- Do not duplicate the same calculation in `_prepareContext` and `_preparePartContext`.
- Do not use `_onRender` or `_postRender` to build data context.
- Keep templates dumb; prepare display-ready structures in JS.

## Tabs architecture

`swerpg` tabs are controlled by ApplicationV2 actions and sheet state, not by the old `new Tabs(...)` pattern.

The standard tab system uses:

```text
static TABS      -> registry of available tabs
this.tabGroups   -> active tab by group
static PARTS     -> rendered parts, often one part per tab
context.tabs     -> display data with active/cssClass fields
HBS nav          -> data-action="tab" + data-group + data-tab
HBS panels       -> .tab + data-group + data-tab + active class
```

### Declaring tabs

Actor sheets usually declare tabs in `SwerpgBaseActorSheet`:

```js
static TABS = {
  sheet: [
    { id: 'attributes', group: 'sheet', label: 'SWERPG.Tabs.Attributes' },
    { id: 'skills', group: 'sheet', label: 'SWERPG.Tabs.Skills' },
    { id: 'inventory', group: 'sheet', label: 'SWERPG.Tabs.Inventory' },
  ],
}
```

Item sheets may have nested tab groups:

```js
tabGroups = {
  sheet: 'description',
  description: 'public',
}
```

Rules:

- Tab IDs must be stable.
- `group` must match a key in `tabGroups`.
- Do not rename existing IDs casually; they are used by JS, HBS, CSS, and possibly tests.

### Adding an actor-sheet tab

When adding a tab such as `foo`:

1. Add the tab descriptor to `static TABS.sheet`.
2. Add `static PARTS.foo = { template: 'systems/swerpg/templates/sheets/actor/foo.hbs' }` or the repository’s exact equivalent.
3. Create the template part.
4. Ensure the body template renders `<template data-application-part='foo'></template>` or iterates over tabs/parts.
5. In the part template, add `.tab`, `data-group`, `data-tab`, and `{{tabs.foo.cssClass}}`.
6. Add style only if the default active display is not enough.
7. Test click navigation, rerender, owner/non-owner mode, and responsive behavior.

### Adding an item-sheet tab

For item sheets:

1. Decide whether the tab is generic to all items or conditional by item type.
2. Add the tab in the base item sheet or the specific item sheet initializer.
3. Add the matching `PARTS.<id>` entry if the tab renders as a part.
4. Provide the HBS partial/template.
5. Ensure nested groups have defaults in `tabGroups`.

### Tab nav markup

Recommended HBS:

```hbs
<nav class='sheet-tabs tabs' aria-label='{{localize "SHEETS.FormNavLabel"}}'>
  {{#each tabs as |tab|}}
    <button
      type='button'
      class='{{tab.id}} {{tab.cssClass}}'
      data-action='tab'
      data-group='{{tab.group}}'
      data-tab='{{tab.id}}'
      data-tooltip='{{tab.label}}'
      aria-label='{{localize tab.label}}'
    >
      {{#if tab.icon}}
        <img class='tab-icon' src='{{tab.icon}}' alt='' aria-hidden='true' />
      {{else}}
        <span class='tab-label'>{{localize tab.label}}</span>
      {{/if}}
    </button>
  {{/each}}
</nav>
```

If the existing template uses `<a>`, preserve it unless you are intentionally improving semantics. Never use invalid `aria-role`; use valid ARIA attributes.

### Tab panel markup

Recommended panel:

```hbs
<section
  class='tab skills {{tabs.skills.cssClass}}'
  data-group='{{tabs.skills.group}}'
  data-tab='{{tabs.skills.id}}'
>
  ...
</section>
```

The content will not activate correctly unless `data-group`, `data-tab`, `.tab`, and the active CSS class all align.

## PARTS and `data-application-part`

ApplicationV2 parts are the preferred way to split large sheets.

Rules:

- A visible tab normally has a matching `PARTS.<tabId>`.
- `data-application-part` must match the part ID.
- If the tab appears but the panel is empty, check `PARTS` first.
- Do not hardcode a part in HBS without verifying the class declares it.

Body pattern:

```hbs
<template data-application-part='header'></template>
{{#each tabs as |tab|}}
  <template data-application-part='{{tab.id}}'></template>
{{/each}}
```

## Handlebars rules

Templates are presentation only.

Allowed in HBS:

- Displaying values already prepared in context.
- Simple `{{#if}}`, `{{#each}}`, and `{{localize}}`.
- Form fields with `name="system.path.to.field"` matching the TypeDataModel.
- Stable `data-*` hooks for actions, tabs, drag and drop, and context menus.
- Reusable partials.

Forbidden in HBS:

- Business logic.
- Complex nested `lookup` chains.
- Calculations that belong in JS.
- Hidden mutations through helpers.
- Hardcoded user-facing strings when localization is expected.
- Data paths not backed by the TypeDataModel or current code.

When duplicated markup appears in more than one template, extract a partial under:

```text
systems/swerpg/templates/partials/
```

Use explicit partial names:

```hbs
{{> "systems/swerpg/templates/partials/swerpg-actor-header.hbs"}}
{{> "systems/swerpg/templates/partials/swerpg-item-summary.hbs"}}
```

If formatting logic is repeated, prefer a custom Handlebars helper or preformatted context fields.

## Form fields and persistence

For fields bound to document data:

```hbs
<label for='weapon-damage'>{{localize 'SWERPG.Weapon.Damage'}}</label>
<input id='weapon-damage' type='number' name='system.damage' value='{{system.damage}}' />
```

Rules:

- Use `name="system.xxx"` paths aligned with the TypeDataModel.
- Do not invent new `system.*` paths in templates.
- Validate/clamp risky inputs in JS before update.
- Avoid update-on-every-keystroke unless debounced.

### `update()` vs `updateSource()`

Use `document.update(...)` after user actions in sheets:

```js
static async #onToggleEquipped(event, target) {
  event.preventDefault()
  await this.document.update({ 'system.equipped': target.checked })
}
```

Use `updateSource(...)` only for source preparation, migrations, factories, and tests where persistence/hooks/broadcast are not desired.

Forbidden:

```js
this.document.system.equipped = true
this.actor.system.skills.foo.rank++
```

This bypasses Foundry persistence, hooks, rendering, and multi-client synchronization.

Group updates:

```js
await this.document.update({
  'system.damage': damage,
  'system.critical': critical,
  'system.range': range,
})
```

Do not spam multiple sequential updates for one user action.

## Actions and listeners

Prefer ApplicationV2 `actions` in `DEFAULT_OPTIONS` when the current base class supports them and you need to handle a `click` event:

```js
static DEFAULT_OPTIONS = {
  actions: {
    rollSkill: CharacterSheet.#onRollSkill,
    editItem: CharacterSheet.#onEditItem,
    deleteItem: CharacterSheet.#onDeleteItem,
  },
}
```

Use `data-action` in HBS:

```hbs
<button type='button' data-action='rollSkill' data-skill='piloting_space'>
  {{localize 'SWERPG.Actions.Roll'}}
</button>
```

In the case of a `hover` eventr or a more complex interaction, or if the current base class does not support `actions`, use `activateListeners(html)` but keep it organized and disciplined.

```js
activateListeners(html) {
  super.activateListeners(html)

  this._activateRollListeners(html)

  if (!this.isEditable) return
  this._activateHeaderListeners(html)
  this._activateInventoryListeners(html)
  this._activateTalentListeners(html)
}
```

Rules:

- Always call `super.activateListeners(html)` first.
- Do not put 300 lines of event binding in `activateListeners`.
- Separate handlers by UI zone or feature.
- Do not bind data-mutating handlers when `!this.isEditable`.
- Use `event.preventDefault()` for button/link actions.
- Keep handlers short; delegate business logic to document methods or services.

## DOM boundaries

Inside sheets:

- Work within `html`, `this.element`, `event.currentTarget`, or `target` passed by ApplicationV2 actions.
- Do not use `document.querySelector` for sheet internals.
- Do not bind global listeners from each sheet unless there is explicit cleanup.
- Use stable `data-*` markers instead of brittle visual selectors.

Drag/drop pattern:

```hbs
<li data-drag-source='talent' data-talent-id='{{talent.id}}' draggable='true'>...</li>
<li data-drop-target='inventory-slot' data-slot='primary'>...</li>
```

```js
html.on('dragstart', '[data-drag-source=talent]', this._onDragTalentStart.bind(this))
html.on('drop', '[data-drop-target=inventory-slot]', this._onDropToInventory.bind(this))
html.on('contextmenu', '[data-has-context=talent]', this._onTalentContextMenu.bind(this))
```

All resulting data changes must use `this.document.update(...)` or a document method that does.

## CSS and HTML contract

Every sheet must preserve the stable UI contract:

```text
.swerpg.sheet
.sheet-header
.sheet-tabs
.sheet-body
.sheet-footer
```

Minimum classes:

```text
swerpg
sheet
actor OR item
specific type class, e.g. character, talent, weapon
```

Recommended structure:

```hbs
<div class='swerpg sheet actor character'>
  <header class='sheet-header'>...</header>
  <nav class='sheet-tabs tabs' data-group='sheet'>...</nav>
  <section class='sheet-body'>...</section>
  <footer class='sheet-footer'>...</footer>
</div>
```

In the current ApplicationV2 architecture, classes may be applied by JS `DEFAULT_OPTIONS` and base initializers rather than repeated in templates. Do not duplicate or fight the base class. Preserve the effective contract.

If you must break this contract:

- Explain why.
- Keep compatibility aliases when possible.
- Update changelog and integration documentation.
- Add/adjust tests or manual validation steps.

## CSS and LESS rules

- Scope sheet styles under `.swerpg.sheet` or a specific sheet class.
- Do not introduce global selectors that affect Foundry core or other systems.
- Use existing CSS variables when possible.
- Use `.tab.<id>.active` only when a tab needs non-default display such as grid/flex.
- Preserve visible focus states.
- Respect `prefers-reduced-motion` when adding transitions.
- Do not use opacity/color alone to convey active state.

For vertical icon tabs:

- Keep `data-action="tab"`, `data-group`, and `data-tab`; the vertical layout is CSS only.
- Ensure icon-only tabs have `aria-label`.
- Decorative icons use `alt=""` and `aria-hidden="true"`.
- Watch parent `overflow`; outside-frame tabs can be clipped.
- Provide a responsive fallback for narrow sheets if needed.

## Accessibility and UX minimum

Every UI change should preserve:

- Explicit `<label>` for fields.
- Clear `title`, visible text, or `aria-label` for icon-only controls.
- Predictable placement for destructive actions.
- Keyboard-visible focus.
- Localized labels and tooltips.
- No global keyboard shortcuts defined ad hoc inside individual sheets.

## External extension points

For internal system variants, prefer inheritance from the system base sheet or an existing specific sheet.

For external modules or light UI patches, prefer Foundry hooks:

```js
Hooks.on('renderTalentSheet', (app, html, data) => {
  const footer = html.find('.sheet-footer')
  if (!footer.length) return

  const button = $('<button type="button" data-action="export-talent">Export</button>')
  footer.append(button)
  button.on('click', (event) => app.exportTalent?.(event))
})
```

Rules for hooks:

- Check selectors exist before using them.
- Add behavior; do not overwrite existing handlers.
- Clean up overlays/listeners on close hooks when needed.
- Do not rely on unstable internal markup if a stable class/data hook exists.

## Canvas UI note

Canvas extensions such as talent-tree visualizations are UI features, but they are not sheet templates. Use Canvas-layer patterns only for canvas-specific interactive visualizations. Do not implement normal sheet tabs, forms, or item editing as canvas layers.

## Anti-patterns to reject

Reject or refactor these patterns:

```js
// ApplicationV1 data pattern in ApplicationV2 code
async getData() {}

// Direct mutation
this.document.system.foo = value

// Global DOM query inside a sheet
document.querySelector('.sheet-body')

// Template-driven business logic
{{#if (lookup (lookup system.foo bar) baz)}}...

// Unscoped CSS
.sheet-body input { ... }

// Permanent debug logs
console.log('context', context)

// Old tab controller pattern for new ApplicationV2 sheets
new Tabs(...)
```

## New sheet checklist

A new sheet is acceptable only if:

- [ ] It extends `SwerpgBaseActorSheet` or `SwerpgBaseItemSheet`.
- [ ] Its class is `PascalCase` and ends with `Sheet`.
- [ ] Its file is in `module/applications/sheets/` and ends with `-sheet.mjs`.
- [ ] It is registered with `Actors.registerSheet` or `Items.registerSheet` using system ID `swerpg`.
- [ ] It uses ApplicationV2 patterns and does not override `getData()`.
- [ ] Its options contain UI configuration only.
- [ ] Its render context exposes `document`, `system`, `config`, and `isOwner`.
- [ ] Its templates contain no business logic and use valid `system.*` paths.
- [ ] Its data-changing actions use `this.document.update(...)` or document methods that do.
- [ ] It has no direct mutation of `this.document.system`.
- [ ] It uses `data-action`, stable `data-*` markers, or ApplicationV2 actions for interactions.
- [ ] It preserves `.swerpg.sheet`, `.sheet-header`, `.sheet-tabs`, `.sheet-body`, and `.sheet-footer`.
- [ ] It is localized.
- [ ] It preserves labels, focus visibility, and icon-button accessibility.
- [ ] It introduces no permanent debug logs.

## Add-tab checklist

A new tab is acceptable only if:

- [ ] `static TABS` includes a stable `id`, correct `group`, and localized `label`.
- [ ] `tabGroups` has a default active value for the group.
- [ ] A matching `PARTS.<id>` exists when content is rendered as a part.
- [ ] The body template renders the part through `data-application-part`.
- [ ] The nav control has `data-action="tab"`, `data-group`, and `data-tab`.
- [ ] The panel has `.tab`, matching `data-group`, matching `data-tab`, and `{{tabs.<id>.cssClass}}`.
- [ ] The CSS handles `.active` display only where needed.
- [ ] The tab is accessible by label/tooltip and keyboard focus.
- [ ] Manual validation covers tab switching, rerender, owner/non-owner state, and responsive layout.

## Refactor checklist

Before refactoring existing sheets:

- [ ] Identify whether the change is actor, item, tab, template, style, or base-class level.
- [ ] Preserve existing class names, file names, sheet keys, hook names, and CSS contract unless explicitly changing the API.
- [ ] Remove permanent debug logs.
- [ ] Consolidate duplicated context preparation into base helpers only when shared by multiple sheets.
- [ ] Avoid mixing visual refactor, behavior change, and data-schema change in one patch.
- [ ] Run or update relevant unit/e2e/manual tests.
- [ ] Validate all affected sheets open, render, save, rerender, and close.
