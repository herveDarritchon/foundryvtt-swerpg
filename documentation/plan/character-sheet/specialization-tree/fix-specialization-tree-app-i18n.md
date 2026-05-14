# Fix bug — i18n specialization tree app

## Problème

Des clés i18n brutes sont affichées dans l’UI :

```txt
SWERPG.TALENT.SPECIALIZATION_TREE_APP.TITLE
SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUBTITLE
SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.AVAILABLE
SWERPG.TALENT.SPECIALIZATION_TREE_APP.VIEWPORT_ARIA_LABEL
````

## Cause probable

Les clés sont injectées telles quelles dans le template ou dans la config `ApplicationV2`, sans passer par `game.i18n.localize()` ou le helper Handlebars `{{localize ...}}`.

## Correction attendue

### 1. Corriger le titre de fenêtre

Dans la classe de l’application, ne pas passer la clé brute comme titre.

À vérifier :

```js
static DEFAULT_OPTIONS = {
  window: {
    title: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.TITLE'
  }
}
```

Remplacer par une localisation au bon endroit selon l’architecture Foundry v14 / ApplicationV2.

Objectif rendu :

```html
<h1 class="window-title">Talent Tree</h1>
```

ou équivalent FR.

### 2. Corriger le template Handlebars

Remplacer les clés brutes par le helper `localize`.

Avant :

```hbs
<h2>{{title}}</h2>
<p>{{subtitle}}</p>
<span>{{stateLabel}}</span>
```

si `title`, `subtitle`, `stateLabel` contiennent des clés.

Après :

```hbs
<h2>{{localize "SWERPG.TALENT.SPECIALIZATION_TREE_APP.TITLE"}}</h2>
<p>{{localize "SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUBTITLE"}}</p>
<span>{{localize specialization.stateLabelKey}}</span>
```

### 3. Corriger les attributs HTML

Ne pas mettre de clé brute dans `aria-label`.

Avant :

```hbs
aria-label="SWERPG.TALENT.SPECIALIZATION_TREE_APP.VIEWPORT_ARIA_LABEL"
```

Après :

```hbs
aria-label="{{localize 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.VIEWPORT_ARIA_LABEL'}}"
```

### 4. Structurer le view-model

Le view-model doit fournir soit des labels déjà localisés, soit des clés explicitement nommées.

Préférence :

```js
{
  title: game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.TITLE'),
  subtitle: game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.SUBTITLE'),
}
```

Pour les statuts :

```js
{
  state: 'available',
  stateLabel: game.i18n.localize('SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.AVAILABLE')
}
```

Éviter les champs ambigus comme :

```js
stateLabel: 'SWERPG.TALENT.SPECIALIZATION_TREE_APP.STATUS.AVAILABLE'
```

sauf si le template fait explicitement `{{localize stateLabel}}`.

### 5. Compléter les fichiers de langue

Ajouter les clés manquantes dans `fr.json` et `en.json`.

Exemple :

```json
{
  "SWERPG": {
    "TALENT": {
      "SPECIALIZATION_TREE_APP": {
        "TITLE": "Arbre de spécialisation",
        "SUBTITLE": "Talents de la spécialisation sélectionnée",
        "VIEWPORT_ARIA_LABEL": "Zone d’affichage de l’arbre de spécialisation",
        "STATUS": {
          "AVAILABLE": "Disponible",
          "INCOMPLETE": "Incomplet",
          "UNRESOLVED": "Non résolu"
        }
      }
    }
  }
}
```

### 6. Corriger les tooltips et fallback

Vérifier aussi :

```txt
data-tooltip
node tooltip
empty state
unknown talent
```

Aucune clé brute ne doit être visible.

## Tests à ajouter

* Le titre de fenêtre est localisé.
* Le titre interne est localisé.
* Le sous-titre est localisé.
* Le statut `available` est localisé.
* `aria-label` est localisé.
* Aucune chaîne visible ne commence par `SWERPG.`.

## Critères d’acceptation

* Plus aucune clé `SWERPG.*` visible dans l’app.
* Les textes sont présents en `fr.json` et `en.json`.
* Le view-model ne mélange pas labels localisés et clés brutes sans convention claire.

## Slug

fix-specialization-tree-app-i18n
