# Plan: Recaler la Scrollbar à l'Intérieur du Panneau de Données

## Problem Statement

The scrollbar position is visually placed over the floating tab rail (right side) instead of staying within the data content area. This creates:

- Visual confusion about scrollbar ownership
- Misalignment between scrollbar position and data boundaries
- Unintended visual overlap with the `.sheet-tabs` navigation rail

## Root Cause Analysis

### Current Architecture

**Layout hierarchy:**

```
.sheet-body (flex: 1, flex-direction: column, overflow: hidden)
  └─ .tab.scrollable (flex: 1, overflow-y: auto)
       └─ content

.sheet-tabs (position: absolute, right: calc(-1 * (var(--tab-size) + 4px)))
  └─ tab navigation buttons (positioned outside window-content bounds)
```

### Why Scrollbar Overlaps Tab Rail

1. `.sheet-tabs` is positioned absolutely at `right: -36px` (outside the scrollable container bounds)
2. `.tab.scrollable` has `overflow-y: auto` with no right-side padding/margin reserve
3. When scrollbar appears (webkit browsers show browser-default scrollbar on the right edge), it appears visually under/overlapping the tab rail
4. No visual boundary or gutter separates the scrollable content from the external tab navigation
5. The scrollbar-gutter strategy alone cannot fix this because the tab rail is absolutely positioned, not a flex sibling

## Solution Overview

**Core principle:** Reserve a visual gutter on the right side of scrollable tabs to visually contain the scrollbar within the data area boundary.

### Two-Part Approach

1. **CSS Variable Definition** (lines in `styles/actor.less`): Define a consistent offset variable for the tabs rail width
2. **Gutter Reservation** (lines in `styles/actor.less`): Apply padding or margin to `.tab.scrollable` to reserve space and visually contain scrollbar

## Implementation Changes

### Phase 1: Define Tab Rails Offset Variable

**File:** `styles/actor.less`

**Location:** At the top of the `.swerpg.sheet.actor` block (around line 54)

**Change:** Add CSS variable definition

```less
.swerpg.sheet.actor {
  --tabs-rail-offset: 36px; // Width of the tab rail that protrudes right
  // ... existing code ...
}
```

**Rationale:**

- Centralizes the tab rail width offset for consistency across the sheet
- Makes it easy to adjust in one place if the rail width changes
- Matches the `right: -36px` positioning used on `.sheet-tabs`

---

### Phase 2: Reserve Gutter on Scrollable Tabs

**File:** `styles/actor.less`

**Location:** In the `.tab` definition (around lines 88–93)

**Change:** Update the `.tab.scrollable` modifier to include right-side padding

Current state:

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

Replace with:

```less
.tab {
  position: relative;
  flex: 1;
  padding: 1.5rem 0 1rem;
  gap: 1.5rem;

  &.scrollable {
    overflow-y: auto;
    min-height: 0;
    padding-inline-end: calc(var(--tabs-rail-offset) + 8px); // Reserve space for scrollbar + gutter
    scrollbar-gutter: stable; // Prevent layout shift when scrollbar appears (optional enhancement)
  }
}
```

**Rationale:**

- `padding-inline-end` is right-to-left language aware; `calc(var(--tabs-rail-offset) + 8px)` adds padding beyond the tab rail width to visually separate scrollbar from the tab navigation
- `scrollbar-gutter: stable` prevents layout jitter when scrollbar appears/disappears (modern browsers only)
- Scrollbar now visually sits within the data content area, not overlapping the external tab rail

---

### Phase 3: Verify Skills Tab Specific Layout

**File:** `styles/actor.less`

**Location:** Line ~1939 (`.tab.skills.skills.skills` block)

**Current state** (lines ~1935–1950):

```less
.tab.skills.skills.skills {
  .skills-wrapper {
    display: grid !important;

    .general-skills {
      grid-column: 1 !important;
    }

    .non-general-skills {
      grid-column: 2 !important;
    }
    // ... more styles ...
  }
}
```

**Validation:** Verify that the grid columns and their internal widths do NOT hard-code values that would conflict with the new `padding-inline-end` reservation. The padding should reduce available content width proportionally across both columns.

**Status:** ✅ Current grid uses `grid-column: N` without fixed widths, so it will automatically adjust to the new padding. No changes needed.

---

### Phase 4: Apply to All Scrollable Tabs

**File:** `templates/sheets/actor/skills.hbs` and similar tab templates

**Current template structure:**

```handlebars
<section class='tab secondary scrollable {{tabs.skills.id}} flexcol {{tabs.skills.cssClass}}' data-tab='{{tabs.skills.id}}' data-group='{{tabs.skills.group}}'>
  <div class='skills-wrapper'>
    <!-- content -->
  </div>
</section>
```

**Status:** ✅ Already correct. The `.scrollable` class will inherit the new padding from Phase 2. No template changes needed.

**Verify these tabs also have `.scrollable` class:**

- `templates/sheets/actor/skills.hbs` — ✅ `class="... scrollable ..."`
- `templates/sheets/actor/inventory.hbs` — ✅ `class="... scrollable ..."`
- `templates/sheets/actor/talents.hbs` — ✅ `class="... scrollable ..."`
- `templates/sheets/actor/effects.hbs` — ✅ `class="... scrollable ..."`
- `templates/sheets/actor/actions.hbs` — ✅ `class="... scrollable ..."`

---

### Phase 5: Preserve Absolute Tab Navigation

**File:** `styles/actor.less`

**Location:** Line ~720 (`.sheet-tabs` definition)

**Current state:**

```less
.sheet-tabs {
  position: absolute;
  right: calc(-1 * (var(--tab-size) + 4px)); // Positioned outside bounds intentionally
  // ... existing code ...
}
```

**Status:** ✅ No changes. Tab navigation remains absolutely positioned to protrude right. The `overflow-x: visible` on `.window-content` continues to allow this protrusion.

---

## Validation Checklist

- [ ] Compile LESS: `pnpm run less`
- [ ] Open Character Sheet in Foundry
- [ ] Navigate to Skills tab
- [ ] Verify scrollbar appears **inside** the data content area (right side)
- [ ] Verify scrollbar does **NOT** overlap the external tab rail buttons on the far right
- [ ] Scroll content — scrollbar should move smoothly within the reserved gutter
- [ ] Navigate to Inventory, Talents, Effects, Actions tabs
- [ ] Verify scrollbar position is consistent across all scrollable tabs
- [ ] Resize the window (drag resize handle)
- [ ] Verify scrollbar repositioning is smooth and gutter maintains visual separation
- [ ] Check that tab navigation buttons on far right remain clickable and visible
- [ ] Verify no horizontal scroll appears within data content due to padding

## Browser Compatibility

- `padding-inline-end` — All modern browsers (CSS Logical Properties, Level 1)
- `scrollbar-gutter: stable` — Chrome 94+, Firefox 97+, Edge 94+; older browsers degrade gracefully (scrollbar may appear/disappear with content)

---

## Related Files & Current State

| File                                   | Status              | Notes                                                                      |
| -------------------------------------- | ------------------- | -------------------------------------------------------------------------- |
| `styles/actor.less`                    | ⚠️ **NEEDS UPDATE** | Add `--tabs-rail-offset` var and `padding-inline-end` to `.tab.scrollable` |
| `templates/sheets/actor/skills.hbs`    | ✅                  | Has `.scrollable` class, no changes needed                                 |
| `templates/sheets/actor/inventory.hbs` | ✅                  | Has `.scrollable` class, no changes needed                                 |
| `templates/sheets/actor/effects.hbs`   | ✅                  | Has `.scrollable` class, no changes needed                                 |
| `templates/sheets/actor/talents.hbs`   | ✅                  | Has `.scrollable` class, no changes needed                                 |
| `templates/sheets/actor/actions.hbs`   | ✅                  | Has `.scrollable` class, no changes needed                                 |

---

## Trade-Offs

| Approach                                         | Pros                                           | Cons                                     | Recommendation          |
| ------------------------------------------------ | ---------------------------------------------- | ---------------------------------------- | ----------------------- |
| **Right padding on `.tab.scrollable`** (Phase 2) | Minimal changes, scrollbar stays within bounds | Slightly reduces available content width | ✅ **CHOOSE THIS**      |
| **Modify `.sheet-tabs` positioning**             | Could move tab rail closer/inside              | Complex; breaks current design intent    | ❌ **avoid**            |
| **Use `margin-inline-end` instead of padding**   | Adds external spacing instead of internal      | May affect layout boundaries differently | Consider as alternative |

---

## Next Steps

1. Apply Phase 1 change: Add `--tabs-rail-offset` variable to `styles/actor.less`
2. Apply Phase 2 change: Update `.tab.scrollable` with `padding-inline-end` and `scrollbar-gutter`
3. Run `pnpm run less` to compile
4. Manually test all validation steps in Foundry (all scrollable tabs)
5. If validation passes, mark this plan as complete
6. If visual spacing is incorrect, adjust `calc(var(--tabs-rail-offset) + 8px)` value

---

## Decision Record

**Decision:** Reserve a right-side gutter on scrollable tabs using CSS padding to visually contain the scrollbar within the data area.

**Rationale:**

- Minimal CSS-only change; no template or JavaScript modifications needed
- Scrollbar position becomes visually associated with content, not tab navigation
- Works consistently across all scrollable tabs via single `.scrollable` class modifier
- Current tab rail positioning remains unchanged, preserving design intent

**Trade-off:** Content area is slightly narrower due to padding, but this is acceptable for improved visual clarity and proper scrollbar positioning.

**Alternative rejected:** Moving tab navigation positioning would require layout restructuring and risk breaking existing functionality.

---

## Related Specifications

- [Plan: Stabilize Character Sheet Height](plan-stabilizeCharacterSheetHeight.prompt.md) — Companion plan addressing form height constraints
- [Plan: Fix Scrolling in Character Sheet Tabs v2](plan-makeCharacterSheetAreasScrollable-v2.prompt.md) — Related scrolling behavior constraints
