## Exemple d'extension : Attacher une image et une note aux Items importés

Cet exemple montre comment une extension (ou module interne) peut écouter la fin de l'import OggDude pour ajouter une note système et vérifier l'image.

### Objectif

- Ajouter un flag `importSource: 'oggdude'` sur chaque Item créé.
- Vérifier que l'image existe sinon appliquer une image de secours.

### Hook (pseudo-code)

```javascript
Hooks.on('createItem', async (item, data, options, userId) => {
  if (!data?.flags?.swerpg?.importSource && /OggDude/i.test(item?.system?.origin || '')) {
    await item.update({ 'flags.swerpg.importSource': 'oggdude' })
  }
  if (!item.img || item.img === 'icons/default.svg') {
    await item.update({ img: 'systems/swerpg/assets/fallbacks/item-fallback.png' })
  }
})
```

### Étendre les statistiques globales

```javascript
import { getGlobalImportMetrics } from './global-import-metrics.mjs'

function logMetrics() {
  const metrics = getGlobalImportMetrics()
  console.log('[OggDudeImport][Metrics]', metrics)
}

Hooks.on('oggdudeImport.completed', logMetrics)
```

### Points clés

- Utiliser des flags pour tracer la provenance.
- Toujours vérifier existence des images (performance : cache interne désormais implémenté).
- Ne pas effectuer de parsing agressif dans le hook (éviter surcharge post-import).

### Sécurité

- Ne pas dériver de chemins à partir d'input utilisateur.
- Les images provenant d'OggDude sont validées via `OggDudeDataElement._getItemImage`.

### Nettoyage

- Si un lot d'items est supprimé, envisager un hook `deleteItem` pour retirer des méta-données associées.
