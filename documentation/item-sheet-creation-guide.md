# Guide de Création de Sheet d'Item

Ce guide explique comment ajouter une nouvelle feuille de personnage (Item Sheet) pour un nouveau type d'objet dans le système `foundryvtt-sw-edge`.

## Prérequis

Avant de créer la sheet, assurez-vous que le **Data Model** pour le type d'item existe et est enregistré dans `swerpg.mjs`.
Par exemple, pour un item de type `motivation`, le modèle `SwerpgMotivation` doit être défini dans `module/models/motivation.mjs` et enregistré dans `CONFIG.Item.dataModels`.

## Étape 1 : Créer la Classe de la Sheet

Créez un nouveau fichier dans `module/applications/sheets/`. Par convention, le nom du fichier doit correspondre au type d'item (ex: `motivation.mjs`).

La classe doit étendre `SwerpgBaseItemSheet`.

```javascript
import SwerpgBaseItemSheet from './base-item.mjs'
import { logger } from '../../utils/logger.mjs'

/**
 * A SwerpgBaseItemSheet subclass used to configure Items of the "[ITEM_TYPE]" type.
 * @extends SwerpgBaseItemSheet
 */
export default class MyItemSheet extends SwerpgBaseItemSheet {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    position: {
      width: 600,
      height: 'auto',
    },
    window: {
      minimizable: true,
      resizable: true,
    },
    item: {
      type: '[ITEM_TYPE]', // Remplacez par le type d'item (ex: 'motivation')
    },
    actions: {
      // Actions spécifiques si nécessaire
    },
  }

  // Initialize subclass options
  static {
    this._initializeItemSheetClass()
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    // Ajoutez des données spécifiques au contexte ici si nécessaire
    return context
  }
}
```

## Étape 2 : Créer le Template Handlebars

Créez un fichier de template partiel dans `templates/sheets/partials/`.
Le nom du fichier doit suivre la convention `[ITEM_TYPE]-config.hbs` (ex: `motivation-config.hbs`).
C'est ce template qui sera chargé automatiquement par `SwerpgBaseItemSheet` dans l'onglet "Configuration".

Exemple de contenu (`motivation-config.hbs`) :

```handlebars
<section class='tab {{tab.cssClass}}' data-group='sheet' data-tab='config'>
  <!-- Ajoutez ici les champs de configuration spécifiques à l'item -->
  <!-- Exemple : -->
  <!--
    <div class="form-group">
        <label>{{localize "SWERPG.Labels.MyField"}}</label>
        <div class="form-fields">
            <input type="text" name="system.myField" value="{{system.myField}}">
        </div>
    </div>
    -->
</section>
```

> **Note :** `SwerpgBaseItemSheet` gère déjà les onglets "Description" et "Configuration". Votre template ne doit contenir que le contenu de l'onglet Configuration.

## Étape 3 : Enregistrer la Sheet

Ouvrez `swerpg.mjs` et effectuez les modifications suivantes :

1. **Importer la classe de la sheet :**

   ```javascript
   import MyItemSheet from './module/applications/sheets/my-item.mjs'
   ```

2. **Enregistrer la sheet dans `Hooks.once('init', ...)` :**

   Trouvez la section où les sheets sont enregistrées (recherchez `foundry.documents.collections.Items.registerSheet`) et ajoutez votre enregistrement :

   ```javascript
   foundry.documents.collections.Items.registerSheet(SYSTEM.id, MyItemSheet, {
     types: ['[ITEM_TYPE]'],
     label: 'SWERPG.SHEETS.[LabelKey]', // Assurez-vous d'avoir une clé de localisation
     makeDefault: true,
   })
   ```

## Résumé

1. **Data Model** : Vérifier l'existence.
2. **Sheet Class** : `module/applications/sheets/[type].mjs` (étend `SwerpgBaseItemSheet`).
3. **Template** : `templates/sheets/partials/[type]-config.hbs`.
4. **Registration** : Ajouter dans `swerpg.mjs`.
