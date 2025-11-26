# OggDude Import Implementation Guide

This guide describes the process of adding support for importing a new Item type from OggDude's data (XML) into the SWERPG system.

## 1. Analyze the Source Data

- Locate the XML file in the OggDude export (e.g., `Motivations.xml`, `Careers.xml`).
- Analyze the XML structure to identify:
  - Root element and item elements.
  - Fields to map (Name, Description, Characteristics, etc.).
  - Unique keys (often `Key`).

## 2. Register the Item Type

If the item type does not exist in the system:

1. **`system.json`**: Add the new type to `documentTypes.Item`.

    ```json
    "my-new-type": {
      "htmlFields": ["description"]
    }
    ```

2. **`swerpg.mjs`**: Register the Data Model (see step 3) in `CONFIG.Item.dataModels`.

    ```javascript
    CONFIG.Item.dataModels = {
      "my-new-type": models.MyNewType
    }
    ```

## 3. Create the Data Model

Create a new file in `module/models/` (e.g., `my-new-type.mjs`).

- Extend `foundry.abstract.TypeDataModel`. **Do not extend `SwerpgItem`**. `SwerpgItem` is the Document class, while this is the Data Model.
- Define the schema using `foundry.data.fields`.
- Export it in `module/models/_module.mjs`.

## 4. Create the Statistics Utility

Create a new file in `module/importer/utils/` (e.g., `my-new-type-import-utils.mjs`). This file maintains the state of the import statistics for your item type.

```javascript
let _myNewTypeStats = {
  total: 0,
  rejected: 0,
}

export function resetMyNewTypeImportStats() {
  _myNewTypeStats = { total: 0, rejected: 0 }
}

export function incrementMyNewTypeImportStat(key, amount = 1) {
  if (Object.prototype.hasOwnProperty.call(_myNewTypeStats, key)) {
    _myNewTypeStats[key] += amount
  }
}

export function getMyNewTypeImportStats() {
  return {
    total: _myNewTypeStats.total,
    rejected: _myNewTypeStats.rejected,
    imported: _myNewTypeStats.total - _myNewTypeStats.rejected,
  }
}
```

## 5. Create the Importer Logic

Create a new file in `module/importer/items/` (e.g., `my-new-type-ogg-dude.mjs`).

### Mapper Function

Create a function (e.g., `myTypeMapper`) that transforms the XML object into a Foundry Item object.

- **Import** the stats functions: `import { resetMyNewTypeImportStats, incrementMyNewTypeImportStat } from '../../utils/my-new-type-import-utils.mjs'`
- **Initialize Stats**: Call `resetMyNewTypeImportStats()` at the start.
- **Track Items**: Call `incrementMyNewTypeImportStat('total')` for each item.
- **Handle Rejections**: Call `incrementMyNewTypeImportStat('rejected')` if an item is invalid.

```javascript
export function myTypeMapper(items) {
  resetMyNewTypeImportStats()
  return items.map((xmlItem) => {
    incrementMyNewTypeImportStat('total')
    // ... mapping logic ...
    if (invalid) {
      incrementMyNewTypeImportStat('rejected')
      return null
    }
    return itemObject
  }).filter(Boolean)
}
```

- Use `OggDudeImporter.mapMandatoryString`, `mapOptionalString`, etc.
- Map `flags.swerpg.oggdudeKey` to the XML Key for reference.

### Context Builder

Create a function (e.g., `buildMyTypeContext`) that prepares the import context.

- **Data Extraction**:
  - If the data is in a single file (e.g., `Motivations.xml`):

      ```javascript
      jsonData: await OggDudeDataElement.buildJsonDataFromFile(zip, groupByDirectory, 'MyFile.xml', 'Root.Item')
      ```

  - If the data is in a directory of files:

      ```javascript
      jsonData: await OggDudeDataElement.buildJsonDataFromDirectory(zip, groupByType.xml, 'DirectoryName', 'Root.Item')
      ```

- **Image Paths**: Define where images should be stored.
  - Use `buildItemImgSystemPath` from `module/settings/directories.mjs` for system paths to ensure consistency.

    ```javascript
    import { buildItemImgSystemPath } from '../../settings/directories.mjs'
    // ...
    systemPath: buildItemImgSystemPath('my-icon.svg'),
    ```

- **Folder**: Define the folder name in Foundry.

## 6. Register the Importer

### 1. Update Global Metrics

Update `module/importer/utils/global-import-metrics.mjs`:

- Import your stats getter: `import { getMyNewTypeImportStats } from './my-new-type-import-utils.mjs'`
- Update `getAllImportStats`:
  - Retrieve stats: `const myNewType = safeCall(getMyNewTypeImportStats)`
  - Add to `totalProcessed` and `totalRejected`.
  - Add to return object: `'my-new-type': myNewType`.

### 2. Update Main Importer

Update `module/importer/oggDude.mjs`:

- Import your stats getter.
- Add the context builder to `buildContextMap`.
- In `processOggDudeData`, add a case to pass stats in the progress callback:

```javascript
if (entry.type === 'my-new-type') {
  domainStatsPayload = getMyNewTypeImportStats()
}
```

### 3. Register Domain

Update `module/settings/OggDudeDataImporter.mjs`:

- Add the domain key to `_domainNames`.

## 7. Update the UI Template

Update `templates/settings/oggDudeDataImporter.hbs`:

Add a new row to the stats table for your item type.

```handlebars
<tr>
    <td class="{{importDomainStatus.my-new-type.class}}" aria-label="{{localize importDomainStatus.my-new-type.labelI18n}}"><i class="fa-solid fa-circle" aria-hidden="true"></i></td>
    <th scope="row">{{localize "SETTINGS.OggDudeDataImporter.loadWindow.domains.my-new-type"}}</th>
    <td>{{importStats.my-new-type.total}}</td>
    <td>{{importStats.my-new-type.imported}}</td>
    <td>{{importStats.my-new-type.rejected}}</td>
    <td>{{importMetricsFormatted.domains.my-new-type.duration}}</td>
</tr>
```

## 8. Localization

Update all the localization files (e.g., `lang/en.json` and `lang/fr.json`):

- Add the domain label for the importer checkbox:

  ```json
  "SETTINGS": {
    "OggDudeDataImporter": {
      "loadWindow": {
        "domains": {
          "my-new-type": "Load My New Type data"
        }
      }
    }
  }
  ```

- Add any specific labels needed for the Sheet.

## 9. Create the Sheet

1. **Class**: Create `module/applications/sheets/my-new-type.mjs` extending `SwerpgBaseItemSheet`.
2. **Template**: Create `templates/sheets/partials/my-new-type-config.hbs`.
3. **Registration**: Register the sheet in `swerpg.mjs`.

## 10. Verification

- Verify the checkbox appears in the Importer settings.
- Run an import and check the console for errors.
- Verify the created items have the correct data and flags.
- **Verify Statistics**: Check that the Import Statistics table correctly shows the total, imported, and rejected counts for your new item type.
