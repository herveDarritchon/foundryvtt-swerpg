# Plan: Fix Scrolling via Position Absolute Inner Pattern

## Problem CSS Fundamental

The CSS spec **forbids** having `overflow: visible` on one axis and non-visible on another. When you set `overflow-x: visible; overflow-y: clip`, the browser silently converts it to `overflow-x: auto; overflow-y: clip` — which causes the side tabs to disappear.
Cannot modify `.window-content` overflow without breaking the side tabs visibility.

## Solution: "Absolute Inner" Pattern

## Instead of relying on height propagation through flex with an `overflow: visible` parent, use **`position: absolute + inset`** on the inner wrapper to give it a fixed size independent of the flex flow.

## Implementation

### Step 1: Keep `.window-content` with `overflow: visible`

**File**: `styles/actor.less` (line 57-66)

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

### Step 2: `.sheet-body` — Use flex fill without explicit height

**File**: `styles/actor.less` (line 78-86)

```less
.sheet-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: flex-start;
  gap: 1rem;
  min-height: 0;
  overflow: hidden;
}
```

**Key**: No `height: 100%`. Rely on `align-items: stretch` (flex-row default) to stretch height. `overflow: hidden` clips children within bounds.

### Step 3: `.tab` — Position relative (positioning context) + flex fill

**File**: `styles/actor.less` (line 88-95)

```less
.tab {
  position: relative;
  flex: 1;
  min-height: 0;
  padding: 1.5rem 0 1rem;
  gap: 1.5rem;
  &.scrollable {
    overflow-y: hidden;
  }
}
```

**Key**: `position: relative` makes the tab a positioning context for inner absolute elements. `flex: 1; min-height: 0` fills space and allows shrinking.

### Step 4: Skills wrapper — Position absolute + scroll

**File**: `styles/actor.less` (in `.tab.skills.skills.skills` section, ~line 1935)

```less
.tab.skills.skills.skills {
  .skills-wrapper {
    position: absolute;
    inset: 1.5rem 0 1rem 0;
    display: grid !important;
    overflow-y: auto;
    .general-skills {
      grid-column: 1 !important;
    }
    .non-general-skills {
      grid-column: 2 !important;
    }
    .combat-skills {
      margin-bottom: 2em !important;
    }
    .skill {
      display: grid;
      grid-template-columns: minmax(120px, 1fr) 28px 28px 28px 36px 36px 80px 1fr;
      align-items: center;
      min-height: 1.75rem;
      height: auto;
      padding: 0.1rem 0.15rem;
      // ... rest of skill styles unchanged
    }
  }
}
```

**Key**: `position: absolute; inset: 1.5rem 0 1rem 0` fills the tab section exactly (accounting for its padding). `overflow-y: auto` enables scrolling. Height is now FIXED via position absolute, so scroll activates.

### Step 5: Update scrollable selector in PARTS

**File**: `module/applications/sheets/base-actor-sheet.mjs` (line 93-97)

```javascript
skills: {
  id: 'skills',
  template: 'systems/swerpg/templates/sheets/actor/skills.hbs',
  scrollable: ['.skills-wrapper'],
},
```

Change `scrollable: ['.scrollable']` → `scrollable: ['.skills-wrapper']` so Foundry saves/restores scroll position on the actual scrolling element.

### Step 6 (Optional): Template cleanup

**File**: `templates/sheets/actor/skills.hbs` (line 1)
Remove `scrollable` class from section root (no longer needed):

```handlebars
<section class="tab secondary {{tabs.skills.id}} flexcol {{tabs.skills.cssClass}}"
         data-tab="{{tabs.skills.id}}" data-group="{{tabs.skills.group}}">
```

---

## Layout Flow (Visual)

```
.swerpg.sheet.actor (overflow: visible)
  └─ .window-content (overflow: visible, flex-row, height: calc(...))
       ├─ nav.sheet-tabs (position: absolute, right: -36px) ← VISIBLE ✓
       ├─ .sheet-sidebar (flex: 0 0 200px, height: 100%)
       └─ .sheet-body (flex: 1, flex-column, min-height: 0, overflow: hidden) ← stretched by flex
            ├─ [header PART]
            └─ .tab.skills (position: relative, flex: 1, min-height: 0) ← filled by flex
                 └─ .skills-wrapper (position: absolute, inset, overflow-y: auto) ← SCROLLS ✓
```

## Why This Works

1. `.window-content` keeps `overflow: visible` → side tabs stay visible ✓
2. `.sheet-body` is stretched by its flex-row parent via default `align-items: stretch`
3. `overflow: hidden` on `.sheet-body` creates a **new block formatting context** that clips children
4. `.tab` fills remaining space via `flex: 1; min-height: 0` in the flex-column
5. `.skills-wrapper` with `position: absolute; inset: 0` fills its parent `.tab` exactly
6. `overflow-y: auto` on `.skills-wrapper` activates because height is NOW FIXED (from position absolute)
7. **This pattern doesn't depend on height propagation through overflow-visible parents**

## Generalization to Other Tabs

For other scrollable tabs (inventory, talents, effects, biography):

1. Ensure each has an inner wrapper element
2. Give wrapper: `position: absolute; inset: 1.5rem 0 1rem 0; overflow-y: auto`
3. Update PARTS `scrollable` selector to point to wrapper
   Or create a reusable CSS class:

```less
.tab {
  [class$='-wrapper'] {
    position: absolute;
    inset: 1.5rem 0 1rem 0;
    overflow-y: auto;
  }
}
```

Then all tabs with wrapper divs (skills-wrapper, inventory-wrapper, etc.) scroll automatically.

## Validation Steps

1. Compile: `pnpm run less` (no errors)
2. Open Character Sheet in Foundry v14+
3. Navigate to **Skills tab** → scroll should work ✓
4. Side navigation icons should remain visible (not clipped) ✓
5. Switch to another tab and back → scroll position should persist ✓
6. Window resize should work correctly ✓
7. Apply pattern to other tabs (inventory, talents, effects) — all should scroll ✓

## Key Points

- ✅ No override of `.window-content` overflow (tabs stay visible)
- ✅ No CSS spec violations
- ✅ Scroll container has guaranteed fixed height (via position absolute)
- ✅ Works with Foundry `scrollable: [selector]` for persistence
- ✅ No browser compatibility issues
- ✅ Clean separation: flex layout for page structure, position absolute for scroll regions
