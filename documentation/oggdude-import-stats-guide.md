# OggDude Import Statistics Implementation Guide

This guide describes the process of adding import statistics for a new Item type in the OggDude Importer. This ensures that the "Import Statistics" table and "Global Metrics" correctly reflect the import progress and results for the new item type.

## 1. Create the Stats Utility File

Create a new file in `module/importer/utils/` (e.g., `my-new-type-import-utils.mjs`).

This file should maintain the state of the import statistics for your item type.

```javascript
// Import Statistics for My New Type

let _myNewTypeStats = {
  total: 0,
  rejected: 0,
}

export function resetMyNewTypeImportStats() {
  _myNewTypeStats = {
    total: 0,
    rejected: 0,
  }
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

## 2. Integrate into Global Metrics

Update `module/importer/utils/global-import-metrics.mjs`:

1. **Import** your new stats functions:

    ```javascript
    import { getMyNewTypeImportStats } from './my-new-type-import-utils.mjs'
    ```

2. **Update `getAllImportStats`**:

    - Add the stats retrieval call:

        ```javascript
        const myNewType = safeCall(getMyNewTypeImportStats)
        ```

    - Update `totalProcessed` and `totalRejected` calculations:

        ```javascript
        const totalProcessed = armor.total + ... + myNewType.total
        const totalRejected = armor.rejected + ... + myNewType.rejected
        ```

    - Add the new stats to the return object:

        ```javascript
        return {
          // ...
          'my-new-type': myNewType,
          // ...
        }
        ```

## 3. Update the Importer Logic

Update your importer file (e.g., `module/importer/items/my-new-type-ogg-dude.mjs`):

1. **Import** the stats functions:

    ```javascript
    import { resetMyNewTypeImportStats, incrementMyNewTypeImportStat } from '../../utils/my-new-type-import-utils.mjs'
    ```

2. **Update the Mapper**:

    - Call `resetMyNewTypeImportStats()` at the beginning of the mapper function.
    - Call `incrementMyNewTypeImportStat('total')` for each item processed.
    - Call `incrementMyNewTypeImportStat('rejected')` if an item is skipped/invalid.

    ```javascript
    export function myNewTypeMapper(items) {
      resetMyNewTypeImportStats()
      return items.map((xmlItem) => {
        incrementMyNewTypeImportStat('total')
        // ... validation ...
        if (invalid) {
          incrementMyNewTypeImportStat('rejected')
          return null
        }
        // ... mapping ...
      }).filter(Boolean)
    }
    ```

## 4. Update the Main Importer Class

Update `module/importer/oggDude.mjs`:

1. **Import** the stats getter:

    ```javascript
    import { getMyNewTypeImportStats } from './utils/my-new-type-import-utils.mjs'
    ```

2. **Update `processOggDudeData`**:

    - In the progress callback loop, add a case for your new item type to pass the stats:

    ```javascript
    if (entry.type === 'my-new-type') {
      domainStatsPayload = getMyNewTypeImportStats()
    }
    ```

## 5. Update the UI Template

Update `templates/settings/oggDudeDataImporter.hbs`:

Add a new table row for your item type in the stats table. Ensure you use the correct keys matching `getAllImportStats` and `_domainNames`.

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
