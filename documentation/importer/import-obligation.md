# Obligation Import - OggDude Integration

## Overview

This document describes the OggDude Obligation import feature for the SWERPG system. The obligation importer enables loading obligation definitions from OggDude's Star Wars RPG Character Generator data files into Foundry VTT as Items of type `obligation`.

## Purpose

Obligations are narrative elements in Edge of the Empire that represent character backgrounds, debts, and complications. The importer:

- Converts OggDude `Obligations.xml` data into Foundry Item documents
- Preserves traceability with OggDude source keys and references
- Applies system defaults (value: 10, isExtra: false, extraXp: 0, extraCredits: 0)
- Tracks import statistics for observability

## Data Mapping

### OggDude XML Structure

```xml
<Obligations>
  <Obligation>
    <Key>DEBT</Key>
    <Name>Debt</Name>
    <Description>The character owes a debt...</Description>
    <Source Page="39">Edge of the Empire Core Rulebook</Source>
    <!-- OR -->
    <Sources>
      <Source>Source 1</Source>
      <Source>Source 2</Source>
    </Sources>
  </Obligation>
</Obligations>
```

### Foundry Item Structure

```javascript
{
  name: "Debt",
  type: "obligation",
  system: {
    description: "The character owes a debt...",
    value: 10,          // Default obligation value
    isExtra: false,     // Not an extra obligation
    extraXp: 0,         // No bonus XP
    extraCredits: 0     // No bonus credits
  },
  flags: {
    swerpg: {
      oggdudeKey: "DEBT",
      oggdudeSource: "Edge of the Empire Core Rulebook", // Single source
      // OR
      oggdudeSources: ["Source 1", "Source 2"] // Multiple sources
    }
  }
}
```

## Usage

### Step 1: Access the Importer

1. Open Foundry VTT with the SWERPG system
2. Navigate to **Settings** → **Module Settings**
3. Click **"Import OggDude Data"**

### Step 2: Select Data File

1. Click **"OggDude Zip Data File"**
2. Select your OggDude data export (`.zip` file)
3. The archive must contain `Obligations.xml` in the root or `Data/` directory

### Step 3: Configure Import

1. Check the **"Load Obligation data"** checkbox
2. Optionally select other domains (weapons, armor, gear, etc.)
3. Click **"Load"**

### Step 4: Verify Import

1. Navigate to the **Items** directory
2. Open the folder **"Swerpg - Obligations"**
3. Verify imported obligations appear with correct names and descriptions

## Field Details

### Mandatory Fields

- **Name**: Obligation display name (e.g., "Debt", "Bounty")
- **Key**: Unique OggDude identifier (e.g., "DEBT", "BOU")

If either mandatory field is missing or empty, the obligation is rejected and logged as a warning.

### Optional Fields

- **Description**: Full obligation description (defaults to empty string)
- **Source** or **Sources**: Book references (stored in flags for traceability)

### System Defaults

The following fields are **not** present in OggDude data and are set to system defaults:

- `value`: 10 (standard obligation value per schema)
- `isExtra`: false (not an extra obligation taken for bonuses)
- `extraXp`: 0 (no additional starting XP)
- `extraCredits`: 0 (no additional starting credits)

These values can be modified in Foundry after import via the obligation sheet.

## Limitations

### No Image Support

OggDude data does not include obligation-specific images. All imported obligations use the system fallback icon (`obligation.svg`). Custom images can be set manually in Foundry after import.

### No Mechanical Values

OggDude exports only narrative obligation definitions (name, description, source references). Mechanical values (value, isExtra, bonus XP/credits) must be configured per-character in Foundry.

### Source References Only

Source book references are stored in flags but are not linked to Foundry journal entries. They serve as metadata for lookup purposes.

## Troubleshooting

### Import Shows 0 Obligations

**Possible Causes:**

- `Obligations.xml` is missing from the ZIP archive
- XML structure does not match expected format (`Obligations.Obligation`)
- All obligations have missing mandatory fields (Name or Key)

**Solution:**

1. Verify the ZIP contains `Obligations.xml`
2. Check the browser console for error messages
3. Review import statistics in the importer UI

### Obligations Rejected During Import

**Possible Causes:**

- Missing `Name` or `Key` fields in XML data
- Empty string values for mandatory fields

**Solution:**

- Check import statistics for rejection count
- Review browser console for specific warnings (e.g., `"Skipping obligation with missing mandatory fields"`)
- Verify OggDude data export is complete

### Source Information Missing

**Possible Causes:**

- OggDude data does not include `Source` or `Sources` fields for that obligation

**Solution:**

- This is expected for custom or community-created obligations
- Source information is optional and does not affect functionality

## Rollback

To remove imported obligations:

1. Navigate to **Items** directory
2. Locate the **"Swerpg - Obligations"** folder
3. Select all obligations and delete
4. Alternatively, delete individual obligations as needed

**Note:** Deleting obligations from the Items directory does not affect characters that have already embedded those obligations. Character-embedded obligations must be removed separately from each character sheet.

## Performance

The obligation importer is optimized for batch processing:

- **Expected throughput**: 50+ obligations/second
- **Linear complexity**: O(n) with minimal allocations
- **Non-blocking**: Processes obligations in batches to avoid UI freezes

For large datasets (100+ obligations), the import may take several seconds. Progress is tracked in the importer UI.

## Security

- **Input Validation**: All mandatory fields are validated; invalid entries are rejected
- **No Code Execution**: XML data is never executed or evaluated
- **Safe HTML**: Description fields are processed through Foundry's `HTMLField` (automatically sanitizes)
- **Path Safety**: No file paths are constructed from user input (images use controlled system paths)

## Statistics

Import statistics are tracked and displayed in the importer UI:

- **Total**: Number of obligations processed
- **Imported**: Successfully mapped obligations
- **Rejected**: Obligations with validation errors
- **Unknown Properties**: Non-standard OggDude fields (for debugging)

Statistics are integrated into the global import metrics aggregator for observability.

## Related Documentation

- [OggDude Data Importer Overview](./README.md)
- [Obligation Data Model](../modules/obligation.md) (if exists)
- [SWERPG Project Instructions](../../.github/instructions/swerpg-project-instructions.instructions.md)

## Changelog

- **v1.0.0** (2025-11-19): Initial obligation import support
  - Mapper and context builder implementation
  - Unit and integration tests
  - Statistics tracking
  - UI and localization integration
