# OggDude Import Implementation Guide

This guide describes the process of adding support for importing a new Item type from OggDude's data (XML) into the SWERPG system.

## Organization of Imported Items

Since version 1.0 (November 2025), items imported from OggDude are automatically organized in a hierarchical folder structure with color coding:

```
OggDude/
├── Weapons/          (Blue - #00a8ff)
├── Armor/            (Green - #4cd137)
├── Gear/             (Orange - #ffc312)
├── Careers/          (Red - #c23616)
├── Talents/          (Purple - #9c88ff)
├── Species/          (Light Green - #44bd32)
├── Specializations/  (Red-Orange - #e84118)
├── Obligations/      (Dark Orange - #f79f1f)
├── Duties/           (Light Blue - #0097e6)
├── Motivations/      (Gold - #fbc531)
└── Motivation Categories/  (Gold - #fbc531)
```

### Folder Features

This organization:
- **Happens automatically** when you import OggDude data
- **Applies to all domains** (weapons, armor, gear, careers, talents, etc.)
- **Uses a cache** to avoid duplicate folder creation during a single import session
- **Falls back to `OggDude/Misc`** (Blue-Grey - #1b5f8c) for unrecognized item types
- **Assigns colors automatically** based on the item type, using the SWERPG theme palette
- **Preserves manual color changes** made by GMs after import (colors are only applied on folder creation or if missing)

### For Game Masters

The color-coded folders help you quickly identify different types of OggDude content in your world:
- **Blue tones** for combat-related items (Weapons)
- **Green tones** for protection and biological items (Armor, Species)
- **Orange/Gold tones** for equipment and role-playing elements (Gear, Obligations, Motivations)
- **Red tones** for character development (Careers, Specializations)
- **Purple** for special abilities (Talents)

You can manually change folder colors after import if desired - the system will not override your custom colors on subsequent imports.

### For Developers

If you are adding a new item type to the import system, you should register it in the folder mapping (see step 6.3 below) to ensure it gets an appropriate color.

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
     'my-new-type': models.MyNewType,
   }
   ```

## 3. Create the Data Model

Create a new file in `module/models/` (e.g., `my-new-type.mjs`).

- Extend `foundry.abstract.TypeDataModel`. **Do not extend `SwerpgItem`**. `SwerpgItem` is the Document class, while this is the Data Model.
- Define the schema using `foundry.data.fields`.
- Export it in `module/models/_module.mjs`.

## 4. Create the Statistics Utility

Please refer to the [OggDude Import Statistics Guide](oggdude-import-stats-guide.md) for instructions on creating the statistics utility file and managing import stats.

## 5. Create the Importer Logic

Create a new file in `module/importer/items/` (e.g., `my-new-type-ogg-dude.mjs`).

### Mapper Function

Create a function (e.g., `myTypeMapper`) that transforms the XML object into a Foundry Item object.

- **Statistics**: Refer to the [OggDude Import Statistics Guide](oggdude-import-stats-guide.md) for details on integrating statistics (importing functions, initializing, tracking totals and rejections).

```javascript
export function myTypeMapper(items) {
  // Initialize stats (see Stats Guide)
  return items
    .map((xmlItem) => {
      // Increment total stats (see Stats Guide)
      // ... mapping logic ...
      if (invalid) {
        // Increment rejected stats (see Stats Guide)
        return null
      }
      return itemObject
    })
    .filter(Boolean)
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

Please refer to the [OggDude Import Statistics Guide](oggdude-import-stats-guide.md) for instructions on updating `global-import-metrics.mjs`.

### 2. Update Main Importer

Update `module/importer/oggDude.mjs`:

- Add the context builder to `buildContextMap`.
- Refer to the [OggDude Import Statistics Guide](oggdude-import-stats-guide.md) for importing the stats getter and updating `processOggDudeData` to pass stats in the progress callback.

### 3. Register Folder Mapping (Optional)

If your new item type should have a specific folder name in the `OggDude/` hierarchy:

Update `module/importer/utils/oggdude-import-folders.mjs`:

- Add your domain to the `OGGDUDE_FOLDER_MAP` constant:

  ```javascript
  const OGGDUDE_FOLDER_MAP = {
    weapon: 'Weapons',
    armor: 'Armor',
    'my-new-type': 'My New Types', // Add your domain here
    // ...
  }
  ```

If you don't register your domain, items will be placed in `OggDude/Misc` by default (with a warning logged).

### 4. Register Domain

Update `module/settings/OggDudeDataImporter.mjs`:

- Add the domain key to `_domainNames`.

## 7. Update the UI Template

Update `templates/settings/oggDudeDataImporter.hbs` to add a new row to the stats table. Please refer to the [OggDude Import Statistics Guide](oggdude-import-stats-guide.md) for the specific HTML structure and data binding.

- **Stats Table (nouveau flux)** : depuis la refonte de novembre 2025, la table d'état n'est plus composée de lignes codées en dur. Pour afficher votre domaine, il suffit maintenant de :
  1. Ajouter l'identifiant de domaine dans `_domainNames` dans `module/settings/OggDudeDataImporter.mjs` (ordre d'affichage = ordre de ce tableau).
  2. Garantir que vos statistiques sont retournées par `getAllImportStats()` (voir Stats Guide). La méthode `_buildDomainStatsRows()` construira automatiquement la ligne en combinant vos stats, métriques formatées et statut.
  3. Vérifier que la clé de localisation `SETTINGS.OggDudeDataImporter.loadWindow.domains.<domain>` existe (section 8 ci-dessous).
- **Autres sections** : si vous avez des panneaux ou métriques spécifiques, ajoutez vos informations en suivant les patterns existants (collapsibles `<details>` et listes `<ul>`).

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

Please refer to the [Item Sheet Creation Guide](item-sheet-creation-guide.md) for detailed instructions on creating the sheet class, template, and registering it in the system.

1. **Follow the Guide**: Create the class and template as described in the guide.
2. **Registration**: Ensure the sheet is registered in `swerpg.mjs` as shown in the guide.

## 10. Verification

- Verify the checkbox appears in the Importer settings.
- Run an import and check the console for errors.
- Verify the created items have the correct data and flags.
- **Verify Statistics**: Check that the Import Statistics table correctly shows the total, imported, and rejected counts for your new item type (as described in the Stats Guide). Grâce à la boucle générique, aucune modification du template n'est requise : assurez-vous simplement que `_domainNames`, `importDomainStatus` et `getAllImportStats()` exposent votre domaine.
