# Plan: Fix Scrolling in Character Sheet Tabs (FoundryVTT v14+)

## Problem

The scrollable tab in Skills (and other tabs with `.scrollable`) is not activating. The `.scrollable` CSS rule exists (`overflow-y: auto; min-height: 0`), and the PART configuration has `scrollable: ['.scrollable']` set, but the scroll does not work.

## Root Cause Analysis

**The core issue**: Foundry ApplicationV2 ApplicationV2 flex layout chain breaks height constraint propagation:

```
.swerpg.sheet.actor (overflow: visible)
  └─ .window-content (flex-direction: row, height: calc(100% - header), overflow: visible)  ← PROBLEM HERE
       ├─ .sheet-sidebar (flex: 0 0 200px)
       └─ .sheet-body (flex: 1, flex-direction: column, height: 100%, min-height: 0, overflow: hidden)
            └─ .tab.skills.scrollable (flex: 1, min-height: 0, overflow-y: auto)  ← Should scroll
```

**Why overflow: visible breaks flex height constraint:**

In CSS flex layouts, when a flex container has `overflow: visible` (the default), it does **not enforce** height constraints on its children. Content can overflow, and the flex container will expand to accommodate it rather than forcing children within bounds. This breaks the height propagation chain downward.

The `.window-content` has `overflow: visible` intentionally — the `.sheet-tabs` (`<nav>`) elements are positioned absolutely at `right: -36px` and need to be visible outside the `.window-content` bounds.

**Effect on scrollable tab:**

1. `.sheet-body` has `height: 100%` which should = `.window-content`'s height
2. But `.window-content` with `overflow: visible` doesn't actually enforce its height on Flex children
3. `.sheet-body` grows to fit its content (all tabs, even hidden ones)
4. The `.tab.skills` with `flex: 1` never gets a constrained height
5. `overflow-y: auto` never activates because the container is never height-constrained

## Solution

**Separate the overflow axes on `.window-content`:**

- Keep `overflow-x: visible` (allows tabs to protrude right)
- Change `overflow-y` to `clip` or `hidden` (hard-constrains height, forces flex children to respect bounds)

Using `overflow-y: clip` is preferable to `hidden` because `clip` doesn't create a scroll context — it just clips without allowing scroll, which is appropriate for a container that delegates scrolling to children via `scrollable: [...]`.

## Implementation Changes

### File: `styles/actor.less`

#### Change 1: `.window-content` (line 57-65)

Replace:

```less
.window-content {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: var(--margin-size);
  height: calc(100% - var(--header-height));
  padding: 0 var(--margin-size) var(--margin-size);
  overflow: visible;
}
```

With:

```less
.window-content {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: var(--margin-size);
  height: calc(100% - var(--header-height));
  padding: 0 var(--margin-size) var(--margin-size);
  overflow-x: visible;
  overflow-y: clip;
}
```

#### Change 2: `.sheet-body` (line 77-86) — Already Applied

Keep the previous fix (no change needed):

```less
.sheet-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: flex-start;
  gap: 1rem;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
```

This ensures:

- `flex: 1` fills available space in the flex-row parent
- `height: 100%` resolves to the (now properly constrained) `.window-content` height
- `min-height: 0` allows flex children to shrink below their content size
- `overflow: hidden` ensures child content is clipped if needed

#### Change 3: `.tab.scrollable` (line 88-97) — Already Correct

No changes needed:

```less
.tab {
  position: relative;
  flex: 1;
  padding: 1.5rem 0 1rem;
  gap: 1.5rem;

  &.scrollable {
    overflow-y: auto;
    min-height: 0;
  }
}
```

This ensures:

- `flex: 1` fills remaining space in `.sheet-body` flex-column
- `overflow-y: auto` activates scroll when content > available height
- `min-height: 0` allows further shrinking below content size

## Expected Result After Fix

✅ `.window-content` height is now properly constrained (via `overflow-y: clip`)
✅ `.sheet-body` receives constrained parent height and propagates to tabs
✅ `.tab.skills` (and other scrollable tabs) receive hard height constraint
✅ `overflow-y: auto` on scrollable tabs now works because height is constrained
✅ Tab scroll position persists via Foundry's `scrollable: [...]` mechanism
✅ Tabs to the right (`.sheet-tabs`) still overflow visible via `overflow-x: visible`
✅ No visual regression on other UI elements

## Validation Steps

1. Compile LESS: `pnpm run less`
2. Open Character Sheet in Foundry v14+
3. Navigate to Skills tab
4. Attempt to scroll within the skills list
5. Scroll should be active and smooth
6. Navigate to another tab and back — scroll position should be preserved
7. Check other tabs (Inventory, Talents, Effects) — all should scroll
8. Right-side tab navigation buttons should remain visible (not clipped)

## Browser Compatibility Note

`overflow: clip` is supported in all modern browsers (Chrome 90+, Firefox 69+, Safari 15.4+, Edge 90+). For older browser support, use `overflow: hidden` instead (though this creates a scroll context, which is less clean but functionally equivalent).

## Related Files

- `module/applications/sheets/base-actor-sheet.mjs` — PARTS definition with `scrollable: ['.scrollable']` (already correct)
- `templates/sheets/actor/body.hbs` — Template structure for body PART (already correct)
- `templates/sheets/actor/skills.hbs` — Skills tab template with `.scrollable` class (already correct)
- `styles/actor.less` — Main stylesheet for actor sheets (requires changes listed above)
