# Plan: Stabilize Character Sheet Height and Fix Scrollable Tabs

## Problem Statement

The Character Sheet form is smaller than the `window-content` container, causing an unstable UI experience:

- The form dimensions are set inline (`width: 950px`, `height: auto`)
- The `.window-content` height is calculated with `calc(100% - var(--header-height))`
- This creates a mismatch where form content can overflow or shrink unexpectedly
- Scrollable tabs (Skills, Inventory, etc.) don't maintain fixed height constraints
- Resizing the window changes the sheet's internal layout inconsistently

## Root Cause Analysis

### Current Architecture

**Layout hierarchy:**

```
.swerpg.sheet.actor (form element with inline styles)
  └─ .window-content (height: calc(100% - var(--header-height)), overflow-x: visible, overflow-y: clip)
       ├─ .sheet-sidebar (flex: 0 0 200px)
       └─ .sheet-body (flex: 1, flex-direction: column, height: 100%, min-height: 0, overflow: hidden)
            └─ .tab.scrollable (flex: 1, position: relative)
                 └─ content (grows unbounded)
```

### Why Height is Unstable

1. **CharacterSheet.DEFAULT_OPTIONS override**: Sets `height: 'auto'` (line 57), overriding the `750px` from `SwerpgBaseActorSheet` (line 22)
2. **Inline styles win**: The form element receives `style="height: auto"` from Foundry's ApplicationV2 rendering
3. **Flex chain breaks**: When parent height is `auto`, flex children (`height: 100%` on `.sheet-body`) have no upper bound
4. **Tab sizing fails**: `.tab.scrollable` with `flex: 1` and `overflow-y: auto` needs a hard height constraint to activate scroll
5. **Window-content mismatch**: The `.window-content` calc depends on Foundry's `--header-height` variable, but if form height is `auto`, this constraint becomes meaningless

### Related Open Issue

The plan at [`.copilot-tracking/plans/plan-makeCharacterSheetAreasScrollable-v2.prompt.md`](.copilot-tracking/plans/plan-makeCharacterSheetAreasScrollable-v2.prompt.md) addresses tab scrolling but does not address the root cause: the form height should be fixed initially, not `auto`.

## Solution Overview

**Core principle:** Restore a stable initial height to the Character Sheet form while maintaining user resize capability, then ensure the flex layout chain properly constrains all children.

### Three-Layer Approach

1. **Window Level** (JavaScript): Set explicit initial height on the form, keep it resizable
2. **Container Level** (CSS): Use separated overflow axes on `.window-content` to enforce height propagation
3. **Tab Level** (CSS): Add `min-height: 0` to `.tab.scrollable` to allow scroll activation

## Implementation Changes

### Phase 1: Fix JavaScript Configuration

**File:** `module/applications/sheets/character-sheet.mjs`

**Change:** Restore explicit height instead of `auto`

Replace:

```javascript
static DEFAULT_OPTIONS = {
  position: {
    width: 950,
    height: 'auto',  // ← PROBLEM: overrides base 750
  },
```

With:

```javascript
static DEFAULT_OPTIONS = {
  position: {
    width: 950,
    height: 750,  // ← Back to stable initial height
  },
```

**Rationale:**

- `750px` is the value from `SwerpgBaseActorSheet.DEFAULT_OPTIONS.position.height`
- User can still resize the window via the resize handle
- Provides a stable starting point for flex calculations

---

### Phase 2: Complete CSS Flex Chain

**File:** `styles/actor.less`

#### Change 2.1: Ensure `.window-content` constrains height

Current state (lines ~70–76):

```less
.window-content {
  overflow-x: visible;
  overflow-y: clip;
  // ... other props ...
}
```

**Status:** This should already be correct from previous work. Verify it has both `overflow-x: visible` (for right-side tabs) and `overflow-y: clip` (to constrain height).

If not present, add:

```less
.window-content {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: var(--margin-size);
  height: calc(100% - var(--header-height));
  padding: 0 var(--margin-size) var(--margin-size);
  overflow-x: visible; // Allows .sheet-tabs to overflow right
  overflow-y: clip; // Hard-constrains height, forces flex children to respect bounds
}
```

#### Change 2.2: Add `min-height: 0` to scrollable tabs

Current state (lines ~88–93):

```less
.tab {
  position: relative;
  flex: 1;
  padding: 1.5rem 0 1rem;
  gap: 1.5rem;
}
```

**Change:** Add scrollable modifier:

```less
.tab {
  position: relative;
  flex: 1;
  padding: 1.5rem 0 1rem;
  gap: 1.5rem;

  &.scrollable {
    overflow-y: auto;
    min-height: 0; // ← Allows flex child to shrink below content size
  }
}
```

**Rationale:**

- `flex: 1` + `min-height: 0` allows the tab to fill available space then shrink on overflow
- `overflow-y: auto` activates scroll when content exceeds available height
- Foundry's `PARTS.scrollable` config remaps these tabs for automatic scroll restoration

---

### Phase 3: Verify Template Structure

**File:** `templates/sheets/actor/body.hbs`

Current structure:

```handlebars
<section class='sheet-body'>
  <template data-application-part='header'></template>
  {{#each tabs as |tab|}}
    <template data-application-part='{{tab.id}}'></template>
  {{/each}}
</section>
```

**Status:** ✅ Already correct. No height restrictions on individual parts.

---

**File:** `templates/sheets/actor/skills.hbs` and similar tab templates

Current structure (example):

```handlebars
<section class='tab secondary scrollable {{tabs.skills.id}} flexcol {{tabs.skills.cssClass}}' data-tab='{{tabs.skills.id}}' data-group='{{tabs.skills.group}}'>
  <div class='skills-wrapper'>
    <!-- content -->
  </div>
</section>
```

**Status:** ✅ Already correct. Classes include `scrollable` which activates the CSS modifier.

---

### Phase 4: Verify Sheet-Sidebar and Sheet-Tabs

**File:** `templates/sheets/actor/sidebar.hbs`

Current structure:

```handlebars
<section class='sheet-sidebar flexcol'>
  <!-- sidebar content -->
</section>
```

**CSS** (lines ~1683–1700 in `actor.less`):

```less
.sheet-sidebar {
  flex: 0 0 200px;
  // ... other props ...
}
```

**Status:** ✅ Correct. Sidebar has fixed width, does not participate in height flex calculation directly.

---

**File:** `templates/sheets/actor/tabs.hbs`

Current structure:

```handlebars
<nav class='sheet-tabs tabs'>
  {{#each tabs as |tab|}}
    <a class='{{tab.id}} {{tab.cssClass}}' data-action='tab' ...></a>
  {{/each}}
</nav>
```

**CSS** (lines in `actor.less`):

```less
.sheet-tabs {
  position: absolute;
  right: -36px;
  // Positioned outside bounds intentionally
}
```

**Status:** ✅ Correct. Tab navigation is positioned absolutely to protrude right; `overflow-x: visible` on `.window-content` allows this.

---

## Validation Checklist

- [ ] Compile LESS: `pnpm run less`
- [ ] Open Character Sheet in Foundry (DevTools window sizing)
- [ ] Verify initial window height is 750px
- [ ] Navigate to Skills tab
- [ ] Verify scroll bar appears when content exceeds visible area
- [ ] Scroll within Skills tab — should be smooth
- [ ] Navigate to Inventory, Talents, Effects — all should scroll
- [ ] Resize the window (drag the resize handle)
- [ ] Verify sheet adjusts smoothly without layout jumps
- [ ] Check right-side tab navigation buttons remain visible and clickable
- [ ] Verify scroll position persists when toggling tabs

## Browser Compatibility

- `overflow-y: clip` — Chrome 90+, Firefox 69+, Safari 15.4+, Edge 90+
- If targeting older browsers, substitute `overflow: hidden` on `.window-content` (creates scroll context but functionally equivalent)

## Related Files

- `module/applications/sheets/base-actor-sheet.mjs` — Defines base position `height: 750` ✅
- `module/applications/sheets/character-sheet.mjs` — Overrides to `height: 'auto'` ⚠️ **NEEDS FIX**
- `styles/actor.less` — Main stylesheet for layout, flex chain, and scrollable tabs ✅ (verify Change 2.2)
- `templates/sheets/actor/body.hbs`, `skills.hbs`, `sidebar.hbs`, `tabs.hbs` — Template structure ✅

## Trade-Offs

| Option                                   | Pros                                          | Cons                                                             | Recommendation             |
| ---------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------- | -------------------------- |
| **Fixed height (750px)**                 | Stable, predictable, scroll works immediately | User must resize manually; less flexible on small screens        | ✅ **CHOOSE THIS** for now |
| **Min/Max height (min: 600, max: 90vh)** | Responsive to viewport; user has flexibility  | Complex CSS; may conflict with Foundry's default resize behavior | Consider for v2            |
| **Keep `auto`**                          | No imposed constraints                        | Scroll breaks; height changes with content; unpredictable UX     | ❌ **DO NOT USE**          |

## Next Steps

1. Apply Phase 1 change to `character-sheet.mjs` (restore `height: 750`)
2. Verify Phase 2 LESS changes are present and correct in `actor.less`
3. Run `pnpm run less` to compile
4. Manually test all validation steps in Foundry
5. If validation passes, mark this plan as complete
6. If issues remain, document and refine in a follow-up plan

## Decision Record

**Decision:** Restore explicit initial height (`750px`) on Character Sheet form instead of `auto`.

**Rationale:**

- Users expect stable UI layout; `auto` causes form to grow unbounded when flex calculations fail
- 750px is already tested by base class and provides good UX on standard monitors (1080p+)
- Keeping window resizable preserves user control
- Fixes bottom-level cause of scrollable tab height constraint failure

**Trade-off:** Small screens may need manual resize, but this is acceptable given Foundry's typical usage context (desktop VTT).

**Review schedule:** Assess after 1 week of test usage; consider responsive min/max approach in v2 if needed.
