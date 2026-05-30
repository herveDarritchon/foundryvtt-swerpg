# Plan: Filtre "Affordable Only" dans le Market

Ajouter une case à cocher dans la barre d'outils du Market qui filtre les items affichés selon le pouvoir d'achat du personnage. Quand cochée, seuls les items accessibles avec le budget actuel sont visibles.

## Steps

1. Ajouter `affordableOnly: false` dans [`DEFAULT_VIEW_STATE`](module/applications/market/market-application.mjs) (ligne 35-43) et mettre à jour le typedef `MarketViewState`.

2. Modifier [`#prepareCatalog()`](module/applications/market/market-application.mjs) (ligne 337-344) pour filtrer les items après l'annotation `canBuy` si `affordableOnly` est activé.

3. Ajouter la checkbox dans la section `.market-toolbar__filters` du template [`market.hbs`](templates/market/market.hbs) (après ligne 71), avec liaison vers `viewState.affordableOnly`.

4. Ajouter un event listener `change` sur la checkbox dans [`_onRender()`](module/applications/market/market-application.mjs) (vers ligne 600) pour mettre à jour `_viewState.affordableOnly` et re-render.

5. Mettre à jour [`#onResetCatalog()`](module/applications/market/market-application.mjs) pour inclure la réinitialisation du filtre (automatique via spread de `DEFAULT_VIEW_STATE`).

6. Ajouter les clés i18n dans [`en.json`](lang/en.json) et [`fr.json`](lang/fr.json) sous `MARKET.Toolbar.Filter.AffordableOnly*`.

## Further Considerations

1. **Visibilité conditionnelle** : La checkbox n'a de sens que si un buyer est actif. Faut-il la masquer ou la désactiver quand aucun personnage n'est sélectionné ? _Recommandation : la désactiver (disabled) pour indiquer son existence._

2. **Compteur filtré** : Afficher le nombre d'items après filtrage "affordable" vs total pourrait être utile pour l'UX. Voulez-vous ajouter un indicateur visuel type "(12/45 items)" ?

## Architecture Impact

### Files to Modify

- `module/applications/market/market-application.mjs` - typedef, state, filtering logic, event handlers
- `templates/market/market.hbs` - checkbox HTML
- `lang/en.json` - English labels
- `lang/fr.json` - French labels

### Files to Review (no changes expected)

- `module/lib/market/purchase.mjs` - validation logic (reused as-is)
- `module/config/market.mjs` - market configuration (reused as-is)

## Implementation Strategy

1. **Minimal state addition** - Add single boolean flag to `MarketViewState`
2. **Filter after canBuy annotation** - Preserve existing purchase validation, filter only on display
3. **Preserve existing UX** - Reuse existing filter patterns (select/checkbox event listeners, render on change)
4. **i18n-first labels** - All user-facing text via localization keys
5. **Conditional UI** - Checkbox disabled when no buyer actor selected
