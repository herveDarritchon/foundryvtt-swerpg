# Plan : NegotiationDialog mode vente (`forSale: true`)

Adapter le `NegotiationDialog` existant pour supporter un mode vente distinct du mode achat, en ajoutant un paramètre `forSale` qui change le titre, les labels de confirmation, et la logique de calcul de prix (utilisant `computeResalePrice` au lieu de `computeNegotiatedPrice`). Intégrer ce mode dans l'action `#onSellItem` de `MarketApplicationV2`.

## Issue Reference

- **GitHub Issue**: #505
- **Epic**: #478 (Vente d'items via le Market)
- **Dependencies**:
  - #499 (sell-valuation.mjs — fractions triumph/success/disaster)
  - sell-validation.mjs
  - Action sellItem
  - Type audit item.sale + recordItemSale()

## Scope

**Fichiers à modifier**

- `module/applications/market/negotiation-dialog.mjs` (ajout `forSale` param, logique mode vente)
- `module/applications/market/market-application.mjs` (passer `forSale: true` ligne ~1001)
- `templates/market/negotiation-dialog.hbs` (labels conditionnels)
- `lang/en.json`, `lang/fr.json` (clés i18n mode vente)

**Fichiers à créer**

- `tests/applications/market/negotiation-dialog.test.mjs` (tests intégration `forSale`)

**Comportement souhaité**

```js
// Mode achat (inchangé)
NegotiationDialog.prompt({
  entry: { name: item.name, rarity: item.system?.rarity ?? 0 },
  buyer: buyer,
})

// Mode vente (nouveau)
NegotiationDialog.prompt({
  entry: { name: item.name, rarity: item.system?.rarity ?? 0 },
  buyer: seller,
  forSale: true,
})
// => { confirmed: boolean, outcome: 'success'|'failure'|'triumph'|'disaster', finalPrice, successRanks }
```

## Outcomes → Fractions (mode vente)

| Outcome               | Fraction | Utilisé par                |
| --------------------- | -------- | -------------------------- |
| failure (défaut/skip) | 25%      | `SELL_BASE_FRACTION`       |
| success               | 50%      | `SELL_NEGOTIATED_FRACTION` |
| triumph               | 75%      | `SELL_MAX_FRACTION`        |
| disaster              | 10%      | `SELL_DISASTER_FRACTION`   |

## Acceptance Criteria

- [ ] `NegotiationDialog` accepte `forSale: boolean` sans casser le flow achat existant
- [ ] Mode vente utilise `computeResalePrice` (basePrice × fraction) au lieu de `computeNegotiatedPrice`
- [ ] Outcome triumph → fraction 75%
- [ ] Outcome success → fraction 50%
- [ ] Outcome disaster → fraction 10%
- [ ] Skip négociation (défaut) → fraction 25%
- [ ] `negotiationOutcome` tracé dans l'audit log (`recordItemSale`)
- [ ] Template adapté : labels/titre conditionnels via `{{#if forSale}}`
- [ ] Tests NegotiationDialog existants non régressés
- [ ] Tests nouveaux pour mode vente incluent outcomes triumph/success/disaster/failure

## Implementation Details

### 1. Ajouter le champ privé `#forSale` et le paramètre `forSale` à `prompt()`

**Fichier**: `module/applications/market/negotiation-dialog.mjs`

**Changements**:

- Ajouter champ privé `#forSale = false` après `#buyer`
- Modifier signature `prompt({ entry, buyer, forSale = false })`
- Stocker `dialog.#forSale = forSale`
- Adapter titre dynamique : `title: forSale ? 'MARKET.Negotiation.Dialog.TitleSell' : 'MARKET.Negotiation.Dialog.Title'`

### 2. Adapter `_prepareContext()` pour le mode vente

**Fichier**: `module/applications/market/negotiation-dialog.mjs`

**Logique**:

```js
if (this.#forSale) {
  // Mode vente: utiliser computeResalePrice
  const negotiationResult = computeResalePrice({
    basePrice: originalPrice,
    negotiationOutcome: mapOutcomeToSale(this.#formState),
  })
} else {
  // Mode achat: computeNegotiatedPrice (existant)
  const negotiationResult = computeNegotiatedPrice({
    originalPrice,
    successRanks: this.#formState.successRanks,
    isDisaster: this.#formState.isDisaster,
  })
}
```

**Fonction mapper**: `mapOutcomeToSale()` — convertir (successRanks, isDisaster) → outcome ('failure'|'success'|'triumph'|'disaster')

- `isDisaster` → 'disaster'
- `successRanks >= TRIUMPH_THRESHOLD` (ex: 4) → 'triumph'
- `successRanks > 0` → 'success'
- défaut → 'failure'

**Exposer**: `context.forSale = this.#forSale`

### 3. Adapter `#onConfirmNegotiation` pour le mode vente

**Fichier**: `module/applications/market/negotiation-dialog.mjs`

**Changements**:

- Calculer le résultat avec le bon fonction selon `this.#forSale`
- Retourner le même shape `NegotiationDialogResult` : `{ confirmed: true, finalPrice, outcome, successRanks }`

### 4. Adapter le template pour le mode vente

**Fichier**: `templates/market/negotiation-dialog.hbs`

**Changements**:

- Ajouter `{{#if forSale}}` pour conditionner les labels:
  - "Prix de vente négocié" (forSale) vs "Prix négocié" (achat)
  - Bouton Confirm: "Vendre à" vs "Acheter à"
  - Texte outcome adaptés si nécessaire

### 5. Intégrer `forSale: true` dans `#onSellItem`

**Fichier**: `module/applications/market/market-application.mjs` ligne ~1001

**Changements**:

```js
const negotiationResult = await NegotiationDialog.prompt({
  entry: { name: item.name, rarity: item.system?.rarity ?? 0 },
  buyer: seller,
  forSale: true, // ← NOUVEAU
})
```

**Validation**: s'assurer que `negotiationOutcome` du résultat est passé correctement à `computeResalePrice` et tracé via `recordItemSale`.

### 6. Ajouter les clés i18n

**Fichiers**: `lang/en.json`, `lang/fr.json`

**Clés à ajouter** (exemple EN):

```json
{
  "MARKET": {
    "Negotiation": {
      "Dialog": {
        "TitleSell": "Negotiate Sale Price",
        "ConfirmSell": "Sell at this price",
        "NegotiatedPriceSell": "Sale Price"
      }
    }
  }
}
```

**Clés FR**:

```json
{
  "MARKET": {
    "Negotiation": {
      "Dialog": {
        "TitleSell": "Négocier le prix de vente",
        "ConfirmSell": "Vendre à ce prix",
        "NegotiatedPriceSell": "Prix de vente"
      }
    }
  }
}
```

### 7. Écrire les tests Vitest

**Fichier**: `tests/applications/market/negotiation-dialog.test.mjs`

**Couverture**:

- Mode achat (`forSale: false`) — tests existants non régressés
- Mode vente (`forSale: true`) avec outcomes:
  - `failure` → fraction 25%, `finalPrice = basePrice * 0.25`
  - `success` → fraction 50%, `finalPrice = basePrice * 0.50`
  - `triumph` → fraction 75%, `finalPrice = basePrice * 0.75`
  - `disaster` → fraction 10%, `finalPrice = basePrice * 0.10`
- Vérifier que `#onSellItem` appelle `NegotiationDialog.prompt` avec `forSale: true`
- Vérifier que `negotiationOutcome` est bien tracé dans audit log

## Further Considerations

### 1. Logique de prix dans le dialog vs dans l'appelant

**Question**: en mode vente, comment affiche-t-on le preview du prix?

**Réponse**: afficher le `resalePrice` calculé via `computeResalePrice` en tenant compte de l'outcome actuel (trigger sur input change de successRanks / disaster checkbox). Cela donne un preview du résultat final.

### 2. Outcome "triumph" absent du dialog achat

**Question**: comment générer l'outcome "triumph" en mode vente si seul le dialog d'achat utilise `computeNegotiatedPrice` (qui ne produit que success/failure/disaster)?

**Réponse**: ajouter une fonction mapper `mapOutcomeToSale(formState)` qui génère "triumph" quand `successRanks >= 4` (ou seuil configurable). En mode vente uniquement.

**Alternative**: ajouter une checkbox "Triumph" distincte de "Disaster", mais cela complexifie le UI. Recommandation : seuil automatique (≥ 4 ranks).

### 3. Rétro-compatibilité

- Le shape `NegotiationDialogResult` ne change pas
- `prompt()` a un paramètre optionnel `forSale = false` (backwards-compatible)
- Tests existants du flow achat restent inchangés
- Aucune rupture d'API

### 4. Versioning des clés i18n

- Ajouter les clés `TitleSell`, `ConfirmSell`, `NegotiatedPriceSell` côté EN/FR
- Documenter dans le i18n memory que le mode vente a ses propres labels
- Tester la présence des clés dans `tests/localization/<domaine>.test.mjs`

## Story Points

5 (ajustable après revue d'équipe)

## Testing Phase Configuration

**Vitest configs**: `vitest.config.mjs` (minimal) et `vitest.config.js` (full mock-foundry)

**Test file**: `tests/applications/market/negotiation-dialog.test.mjs`

**Mocks requis**:

- `NegotiationDialog` instance (ou spy sur prototype)
- `computeResalePrice` mock optionnel pour tests unitaires
- `game.i18n.localize()` / `game.i18n.format()`

**Integration tests**: appel complet `NegotiationDialog.prompt({ ..., forSale: true })` avec vérification du résultat retourné.

## Deployment Checklist

- [ ] Tests Vitest passent (couvrant forSale=true et forSale=false)
- [ ] Linting ESLint sans warnings
- [ ] Format Prettier appliqué
- [ ] Clés i18n présentes EN/FR
- [ ] Documentation inline JSDoc complète
- [ ] Pas de `console.log` (utiliser `logger`)
- [ ] Pas de regression tests d'achat existants

## Success Criteria Summary

✓ `NegotiationDialog.prompt()` accepte `forSale` optionnel  
✓ Mode vente utilise `computeResalePrice` + mapping outcomes  
✓ Titre et labels adaptés pour la vente via i18n  
✓ `#onSellItem` intégre le flow negotiation mode vente  
✓ Tests unitaires couvrent tous les outcomes  
✓ Aucune regression sur flow achat  
✓ Code deployable sans dépendance non résolue
