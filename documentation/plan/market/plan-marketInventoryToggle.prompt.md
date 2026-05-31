# Plan : Issue #501 — PART `inventory` + Toggle Buy/Sell dans MarketApplicationV2

## Vue d'ensemble

**TL;DR** : Ajouter un PART `inventory` à `MarketApplicationV2` avec un toggle buy/sell dans le header. Le Market bascule entre les deux modes sans se fermer. L'inventaire du personnage est affiché en mode sell avec prix de base et estimation revente (25% via `computeResalePrice`). Les items non vendables (hors `PURCHASABLE_ITEM_TYPES`) sont exclus.

Fait partie de l'épique **Vente d'items via le Market** (Issue #478).

## Dépendances

- ✅ Issue #499 — `sell-valuation.mjs` (implémenté et testé)
- ✅ Issue sell-validation.mjs (implémenté et testé)

## Objectifs

1. **Toggle sans fermeture** : Le Market reste ouvert lors du basculement buy ↔ sell
2. **Persistance de mode** : `_viewState.mode` persiste pendant la session
3. **Inventaire vendable** : Seuls les items de types `PURCHASABLE_ITEM_TYPES` sont listés
4. **Estimation revente** : Chaque item affiche `computeResalePrice` avec outcome `failure` (25%)
5. **Action sell** : Bouton "Sell" sur chaque item déclenche le flow de vente

## Périmètre détaillé

### Fichiers modifiés/créés

| Fichier                                             | Action  | Description                                                                                            |
| --------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------ |
| `module/applications/market/market-application.mjs` | Modifié | Ajout `mode` dans `_viewState`, `#prepareInventory`, `#onToggleMode`, `#onSellItem`, `PARTS.inventory` |
| `templates/market/market-inventory.hbs`             | Créé    | Template pour la liste inventaire vendable avec toggle buy/sell                                        |

### Changements dans MarketApplicationV2

#### `_viewState` — nouveau champ `mode`

```javascript
const DEFAULT_VIEW_STATE = Object.freeze({
  // ...existing fields...
  mode: 'buy', // 'buy' | 'sell'
})
```

#### `static PARTS`

```javascript
static PARTS = {
  catalog: {
    template: 'systems/swerpg/templates/market/market.hbs',
    scrollable: ['.market-catalog', '.market-inventory'],
  },
}
```

> Note : L'inventory est intégrée comme sous-section conditionnelle dans le PART `catalog` (rendu via `market-inventory.hbs` inclus dans la logique du template principal ou préparé dans `_preparePartContext`).

#### Actions enregistrées

```javascript
actions: {
  // ...existing actions...
  toggleMode: MarketApplicationV2.#onToggleMode,
  sellItem: MarketApplicationV2.#onSellItem,
}
```

#### `#prepareInventory(actor)`

Méthode privée construisant la liste d'items vendables :

- Filtre par `PURCHASABLE_ITEM_TYPES`
- Calcule `computeResalePrice({ basePrice, negotiationOutcome: 'failure' })`
- Retourne `{ items: Array<{ id, name, img, type, typeLabel, basePrice, resaleEstimate, resaleFraction }> }`

#### `#onToggleMode(event, target)`

- Lit `target.dataset.mode` ou inverse le mode courant
- Valide que le mode est `'buy'` ou `'sell'`
- Met à jour `_viewState.mode`
- Appelle `this.render()`

#### `#onSellItem(event, target)`

- Valide présence buyer et item
- Appelle `validateSale({ actor, item })` pour éligibilité
- Calcule prix revente via `computeResalePrice`
- Affiche dialogue de confirmation (`DialogV2.confirm`)
- Exécute la vente (suppression item + crédit crédits) si confirmé

### Template `market-inventory.hbs`

Structure :

1. **Toggle buy/sell** — deux boutons avec `data-action="toggleMode"` et `data-mode="buy|sell"`
2. **Buyer bar** — nom et crédits du personnage
3. **Table inventaire** — colonnes : icône, nom, type, basePrice, resaleEstimate (%), bouton Sell
4. **Empty state** — message quand aucun item vendable
5. **No buyer state** — message quand aucun personnage sélectionné

Accessibilité :

- `aria-pressed` sur les boutons toggle
- `aria-label` sur boutons sell (nom de l'item)
- `data-tooltip` pour infobulles

## Structure des données

### Contexte inventory (préparé dans `_preparePartContext`)

```javascript
context.inventory = {
  items: [
    {
      id: 'item-abc123',
      name: 'Blaster Pistol',
      img: 'path/to/img.png',
      type: 'weapon',
      typeLabel: 'SWERPG.ItemType.Weapon',
      basePrice: 400,
      resaleEstimate: 100, // Math.floor(400 * 0.25)
      resaleFraction: 25, // Math.round(0.25 * 100)
    },
    // ...
  ],
}
```

### \_viewState shape complète

```javascript
{
  search: '',
  filterType: '',
  filterSource: '',
  filterRestriction: '',
  affordableOnly: false,
  sortBy: 'name',
  sortDirection: 'asc',
  activeMarketType: 'standard',
  mode: 'buy',  // ← NOUVEAU
}
```

## Tâches implémentation

### 1. Ajout `mode` dans `DEFAULT_VIEW_STATE` et `MarketViewState` typedef

**Fichier** : `module/applications/market/market-application.mjs`

- Ajouter `mode: 'buy'` dans `DEFAULT_VIEW_STATE`
- Mettre à jour `@typedef MarketViewState` avec le champ `mode`

### 2. Enregistrer actions `toggleMode` et `sellItem`

**Fichier** : `module/applications/market/market-application.mjs`

- Ajouter dans `static DEFAULT_OPTIONS.actions`

### 3. Implémenter `#prepareInventory(actor)`

**Fichier** : `module/applications/market/market-application.mjs`

- Itérer `actor.items`, filtrer par `PURCHASABLE_ITEM_TYPES`
- Pour chaque item : récupérer `basePrice` (via `_source.price ?? price ?? 0`)
- Appeler `computeResalePrice({ basePrice, negotiationOutcome: 'failure' })`
- Construire objet avec `id, name, img, type, typeLabel, basePrice, resaleEstimate, resaleFraction`
- Trier par nom (localeCompare)
- Retourner `{ items: [...] }`

### 4. Intégrer dans `_preparePartContext`

**Fichier** : `module/applications/market/market-application.mjs`

- Ajouter `context.mode = this._viewState.mode`
- Ajouter `context.inventory = buyer ? this.#prepareInventory(buyer) : { items: [] }`

### 5. Implémenter `#onToggleMode`

**Fichier** : `module/applications/market/market-application.mjs`

- Lire `target.dataset.mode` (ou inverser)
- Valider mode autorisé (`'buy'` | `'sell'`)
- Mettre à jour `_viewState.mode`
- `await this.render()`

### 6. Implémenter `#onSellItem` (flow initial)

**Fichier** : `module/applications/market/market-application.mjs`

- Valider buyer présent
- Récupérer item par `seller.items.get(itemId)`
- Appeler `validateSale({ actor, item })` pour vérifier éligibilité
- Calculer revente via `computeResalePrice`
- Afficher `DialogV2.confirm` avec détails prix
- Si confirmé : exécuter vente (delete item + update credits)

### 7. Créer template `market-inventory.hbs`

**Fichier** : `templates/market/market-inventory.hbs`

- Toggle buttons (buy/sell) avec CSS classes conditionnelles
- Buyer bar avec crédits
- Table avec colonnes (icon, name, type, basePrice, resaleEstimate, sell button)
- Empty state et no-buyer state
- Accessibilité (`aria-pressed`, `aria-label`, `data-tooltip`)

### 8. Clés i18n pour le mode sell

**Fichiers** : `lang/en.json`, `lang/fr.json`

Clés nécessaires :

- `MARKET.Mode.Buy` / `MARKET.Mode.Sell`
- `MARKET.Inventory.Description`
- `MARKET.Inventory.BasePrice` / `MARKET.Inventory.ResaleEstimate`
- `MARKET.Inventory.SellButton` / `MARKET.Inventory.SellAriaLabel`
- `MARKET.Inventory.Empty`
- `MARKET.Sell.Confirm.Title` / `MARKET.Sell.Confirm.Content`
- `MARKET.Sell.Confirm.Sell` / `MARKET.Sell.Confirm.Cancel`
- `MARKET.Sale.Error.ItemNotFound`

### 9. Tests

**Fichiers** : Tests unitaires pour `#prepareInventory` et tests d'intégration pour le flow toggle

**Couverture** :

- ✓ Toggle buy → sell → buy ne perd pas le state
- ✓ `#prepareInventory` filtre correctement par `PURCHASABLE_ITEM_TYPES`
- ✓ Items non vendables exclus
- ✓ Calcul resaleEstimate correct (25% floored)
- ✓ `#onToggleMode` met à jour `_viewState.mode`
- ✓ `#onSellItem` valide buyer et item presence
- ✓ Template affiche données correctement

## Acceptance Criteria

- [ ] Toggle buy/sell visible dans le header du Market
- [ ] Mode buy → affiche PART catalogue existant
- [ ] Mode sell → affiche PART inventory avec items vendables
- [ ] `_viewState.mode` persiste pendant la session (pas de reset à chaque render)
- [ ] Items non vendables (type hors PURCHASABLE_ITEM_TYPES) exclus de la liste
- [ ] Chaque item affiche : nom, type, basePrice, resaleEstimate (25%), bouton Sell

## Découpage en issues GitHub

| #   | Titre                                                       | Périmètre                                        | Dépendances | Story Points |
| --- | ----------------------------------------------------------- | ------------------------------------------------ | ----------- | ------------ |
| 501 | **feat: PART inventory + mode buy/sell toggle dans Market** | Tous les fichiers et actions énumérées ci-dessus | #499        | 8            |

**Total estimation** : 8 SP (~1 jour de développement)

## Considérations supplémentaires

### 1. PART unique vs PARTS séparés

**Décision** : Le template `market-inventory.hbs` est un sous-template conditionnel du PART `catalog`. Le mode détermine quelle section est visible (catalogue vs inventaire). Cela évite le flash/reset lors du toggle.

**Alternative rejetée** : Deux PARTS séparés (`catalog` et `inventory`) avec masquage. Problème : chaque PART re-rendrait indépendamment, complexifiant la gestion scroll.

### 2. Persistance du mode

Le mode vit dans `_viewState` (client-side only, pas en flags/settings). Il reset au close/reopen du Market. C'est intentionnel : le mode buy est le défaut naturel.

### 3. Estimation 25% fixe vs dynamique

L'estimation affichée dans l'inventaire est **toujours 25%** (outcome `failure`). Ce n'est qu'une estimation préliminaire. Le prix final peut varier si une négociation est ajoutée ultérieurement.

### 4. Bouton Sell dans template principal

Le template `market.hbs` doit conditionner l'affichage : `{{#if (eq mode 'sell')}}` → montrer inventory, sinon montrer catalogue.

### 5. CSS

Styles pour :

- `.market-mode-toggle` — flexbox row avec gap
- `.market-mode-toggle__btn` — boutons toggle avec état `.is-active`
- `.market-inventory__table` — même style que `.market-catalog__table`
- `.market-resale-estimate` — couleur distincte (green/gold) pour le prix estimé
- `.market-item__sell` — bouton action sell (coins icon)

## Validation de succès

- ✓ Toggle buy/sell fonctionne sans fermeture du Market
- ✓ Mode persiste entre les renders
- ✓ Inventaire ne montre que les items vendables
- ✓ Estimation revente est correcte (25% du basePrice, floored)
- ✓ Bouton Sell est accessible et fonctionnel
- ✓ Template accessible (aria-pressed, aria-label)
- ✓ Pas de régression sur le mode buy (catalogue existant inchangé)

---

## Statut Implémentation (31 mai 2026)

### État actuel : ✅ IMPLÉMENTÉ

Tous les éléments de l'issue sont présents dans la codebase :

| Composant                             | Fichier                                             | Status |
| ------------------------------------- | --------------------------------------------------- | ------ |
| `_viewState.mode`                     | `market-application.mjs` L62                        | ✅     |
| `#onToggleMode`                       | `market-application.mjs` L907-916                   | ✅     |
| `#onSellItem`                         | `market-application.mjs` L927+                      | ✅     |
| `#prepareInventory(actor)`            | `market-application.mjs` L869-893                   | ✅     |
| Template inventory                    | `templates/market/market-inventory.hbs` (96 lignes) | ✅     |
| Actions enregistrées                  | `DEFAULT_OPTIONS.actions` L178-179                  | ✅     |
| Filtrage PURCHASABLE_ITEM_TYPES       | `#prepareInventory` L873                            | ✅     |
| Estimation 25% via computeResalePrice | `#prepareInventory` L875                            | ✅     |
| Import sell-valuation                 | L20                                                 | ✅     |
| Import sell-validation                | L19                                                 | ✅     |

### Prochaines étapes

1. **Vérifier tests existants** pour le toggle mode et l'inventaire
2. **Valider i18n** : confirmer que les clés `MARKET.Mode.*`, `MARKET.Inventory.*`, `MARKET.Sell.*` sont présentes dans `lang/en.json` et `lang/fr.json`
3. **Fermer issue #501** avec référence aux fichiers livrés
