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

## 4. Create the Importer Logic

Create a new file in `module/importer/items/` (e.g., `my-new-type-ogg-dude.mjs`).

### Mapper Function

Create a function (e.g., `myTypeMapper`) that transforms the XML object into a Foundry Item object.

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

## 5. Register the Importer

1. **`module/settings/OggDudeDataImporter.mjs`**: Add the domain key to `_domainNames`.
2. **`module/importer/oggDude.mjs`**:
    - Import the context builder.
    - Add it to `buildContextMap` in both `processOggDudeData` and `preloadOggDudeData`.

## 6. Localization

Update `lang/en.json`:

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

## 7. Create the Sheet

1. **Class**: Create `module/applications/sheets/my-new-type.mjs` extending `SwerpgBaseItemSheet`.
2. **Template**: Create `templates/sheets/partials/my-new-type-config.hbs`.
3. **Registration**: Register the sheet in `swerpg.mjs`.

## 8. Verification

- Verify the checkbox appears in the Importer settings.
- Run an import and check the console for errors.
- Verify the created items have the correct data and flags.
