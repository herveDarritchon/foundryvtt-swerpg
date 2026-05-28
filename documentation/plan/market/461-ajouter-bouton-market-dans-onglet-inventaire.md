# Ajouter un bouton Market dans l'onglet Inventaire

**Issue** : à créer (post-scaffold #460)

**Dépend sur** : #460 — MarketApplicationV2 scaffold ✅ livré

---

## Objectif

Ajouter un bouton d'ouverture du Market dans l'onglet **inventory** de la feuille de personnage (`character`), en utilisant une icône associée à l'argent (`fa-coins` recommandé), et en respectant le pattern d'action existant (`data-action` → `_onClickAction`).

## Décisions de cadrage

- Le bouton est visible **uniquement sur les feuilles `character`**, pas sur les adversary sheets.
- L'entrypoint `openMarket()` existe déjà via `game.system.api.methods.openMarket()` — ne pas toucher à `swerpg.mjs` ni à `MarketApplicationV2`.
- Le template `inventory.hbs` est mutualisé : le rendu conditionnel est piloté par un flag de contexte (`showMarketButton`).
- Pas de nouvelle dépendance UI ou librairie.

## Étapes d'implémentation

### 1. Exposer le flag de contexte `showMarketButton`

**Fichiers** : `module/applications/sheets/character-sheet.mjs`

- Ajouter `showMarketButton: true` au contexte préparé par `_prepareContext()`.
- Ne pas modifier le template pour les autres types d'actor.

### 2. Ajouter l'action `openMarket` dans le handler

**Fichiers** : `module/applications/sheets/character-sheet.mjs`

- Ajouter un `case 'openMarket'` dans `_onClickAction` qui délègue à `game.system.api.methods.openMarket()`.
- `event.preventDefault()` et `event.stopPropagation()` sont déjà gérés par le switch parent.

### 3. Ajouter le bouton dans le template

**Fichiers** : `templates/sheets/actor/inventory.hbs`

- Ajouter un conteneur d'actions flottantes (`.inventory-actions`) en bas de l'onglet pour regrouper :
  - le bouton `inventory-create` existant
  - le nouveau bouton Market
- Le bouton Market :
  - `type="button"`
  - `data-action="openMarket"`
  - `data-tooltip` localisé
  - `aria-label` localisé
  - icône : `fa-solid fa-coins` (ou `fa-solid fa-sack-dollar`)
  - rendu conditionnel via `{{#if showMarketButton}}`

### 4. Ajuster le style

**Fichiers** : `styles/actor.less`

- Remplacer le `.inventory-create` unique par un conteneur `.inventory-actions` en bas à droite.
- Ajouter le style du bouton Market dans ce conteneur, cohérent avec l'existant.
- Éviter le chevauchement des deux boutons.

### 5. Ajouter la localisation

**Fichiers** : `lang/en.json`, `lang/fr.json`

- Clés recommandées :
  - `MARKET.Open` : libellé court "Market" pour accessibilité
  - `MARKET.OpenTooltip` : infobulle "Open Market"

### 6. Tests

**Fichiers** : `tests/applications/sheets/character-sheet-talents.test.mjs` (ou nouveau fichier `character-sheet-market.test.mjs`)

- Test unitaire : l'action `openMarket` dans `_onClickAction` appelle `game.system.api.methods.openMarket()`
- Test de contexte : `showMarketButton` est présent et `true` sur `CharacterSheet`

## Fichiers modifiés

| Fichier                                                                   | Nature                         |
| ------------------------------------------------------------------------- | ------------------------------ |
| `module/applications/sheets/character-sheet.mjs`                          | flag contexte + action handler |
| `templates/sheets/actor/inventory.hbs`                                    | bouton + conteneur d'actions   |
| `styles/actor.less`                                                       | layout des actions flottantes  |
| `lang/en.json`                                                            | clés i18n                      |
| `lang/fr.json`                                                            | clés i18n                      |
| `tests/applications/sheets/character-sheet-talents.test.mjs` (ou nouveau) | tests du handler               |

## Non-concerné

- `MarketApplicationV2` (inchangé)
- `swerpg.mjs` (inchangé)
- `base-actor-sheet.mjs` (inchangé)
- Les adversary sheets (pas de bouton)
