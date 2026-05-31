# Plan : Corriger le calcul du prix de revente dans le Market

**TL;DR** : Le dialogue de confirmation de vente affiche un prix de revente incorrect (1687 au lieu de 62) car `validateSale()` lit `item.system.price` (valeur **dérivée** par `_preparePrice()` qui applique la formule de rareté : `250 * (rarity+1)³`) au lieu du prix source brut (250). La table d'affichage utilise correctement `item.system._source?.price`, mais l'action de vente ne le fait pas.

**Exemple concret** :

- Item: "Breaker" Heavy Hydrospanner
- Base Price (source) : 250 credits
- Base Price (dérivé) : 250 × (2+1)³ = 250 × 27 = 6750 credits
- Resale Price calculé par `onSellItem` : 6750 × 0.25 = 1687.5 → **Math.floor = 1687** (INCORRECT)
- Resale Price attendu : 250 × 0.25 = 62.5 → **Math.floor = 62** (CORRECT, affiché dans la table)

---

## Problème Détecté

### Divergence de source de prix

La méthode `#prepareInventory()` dans `market-application.mjs` (ligne 795) lit correctement le prix source :

```javascript
const basePrice = item.system?._source?.price ?? item.system?.price ?? 0
```

Mais la fonction `validateSale()` dans `sell-validation.mjs` (ligne 82) lit le prix dérivé :

```javascript
const basePrice = item.system?.price ?? 0
```

### Flux d'exécution

1. **Table d'affichage** (`#prepareInventory`) :
   - Lit `item.system._source.price` (250) ✓
   - Calcule `computeResalePrice({ basePrice: 250, ... })` = 62
   - Affiche "62 (25%)"

2. **Action de vente** (`#onSellItem` → `validateSale`) :
   - Lit `item.system.price` (6750, dérivé) ✗
   - Calcule confirmation dialog avec prix dérivé
   - Dialogue affiche "Sell for 1687 credits"

3. **Le prix est écrit correctement** (1687) mais c'est le mauvais prix d'une **mauvaise** base

### Cause racine

La fonction `validateSale()` n'implémente pas le même fallback que `#prepareInventory()`. Elle devrait utiliser le pattern de lecture du prix source, identifier au market engine d'appliquer les modificateurs appropriés, plutôt que de lire une valeur déjà modifiée par la rareté de l'item.

---

## Tâches implémentation

### 1. Corriger `validateSale()` pour lire le prix source

**Fichier** : `module/lib/market/sell-validation.mjs`

**Contenu** :

À la ligne 82, remplacer :

```javascript
const basePrice = item.system?.price ?? 0
```

Par :

```javascript
const basePrice = item.system?._source?.price ?? item.system?.price ?? 0
```

**Raison** :

- Garantit que `validateSale()` et `#prepareInventory()` lisent la même source de prix (le prix avant dérivation)
- Évite que la rareté de l'item soit appliquée deux fois (une dans `prepareDerivedData()`, une dans le price engine du Market)
- Aligne avec le pattern déjà utilisé dans `module/models/character.mjs` pour `_prepareCredits()`

**Expected Outcome** :

- `validation.basePrice` retourne 250 (prix source), pas 6750 (prix dérivé)

---

### 2. Ajouter test de régression dans `sell-validation.test.mjs`

**Fichier** : `tests/lib/market/sell-validation.test.mjs`

**Contenu** :

Ajouter un test dans la suite "includeResolvedBasePrice" ou une nouvelle suite "source price precedence" :

```javascript
it('reads item.system._source.price when available (prefers source over derived)', () => {
  // Simulates an item with rarity-adjusted derived price
  const item = {
    id: 'item-1',
    uuid: 'Item.item-1',
    type: 'gear',
    system: {
      price: 6750, // derived price (250 * 27 from rarity 2)
      _source: {
        price: 250, // original source price
      },
    },
  }
  const actor = makeActorWithItem(item)
  const result = validateSale({ actor, item })
  expect(result.canSell).toBe(true)
  expect(result.basePrice).toBe(250) // must read from _source, not derived
})

it('falls back to system.price if _source.price is absent', () => {
  const item = makeItem({ price: 100 })
  const actor = makeActorWithItem(item)
  const result = validateSale({ actor, item })
  expect(result.basePrice).toBe(100)
})
```

**Raison** :

- Valide que le fix fonctionne correctement
- Détecte les régressions si le patch est retiré accidentellement
- Documente le contrat attendu: \_source > system.price

**Expected Outcome** :

- Test "reads item.system.\_source.price when available" passe
- Test "falls back to system.price if \_source.price is absent" passe

---

### 3. Vérifier la cohérence dans `#onSellItem()`

**Fichier** : `module/applications/market/market-application.mjs`

**Vérification** (pas de changement nécessaire) :

La méthode `#onSellItem()` utilise déjà `validation.basePrice` retourné par `validateSale()`. Une fois que `validateSale()` est corrigée, le prix dans la confirmation dialog et l'audit log reflétera automatiquement la bonne valeur.

Vérifier que :

```javascript
const baseValuation = computeResalePrice({ basePrice: validation.basePrice, negotiationOutcome: 'failure' })
```

Cette ligne reçoit automatiquement le bon `validation.basePrice` (250, pas 6750) une fois que `validateSale()` est corrigée.

---

## Considérations supplémentaires

### 1. Cohérence avec d'autres composants

- `#prepareInventory()` (ligne 795) utilise déjà `item.system?._source?.price ?? item.system?.price ?? 0` — ce fix aligne `validateSale()` sur ce pattern existant
- `module/models/character.mjs` dans `_prepareCredits()` utilise le même pattern pour éviter les prix dérivés lors du calcul des crédits dépensés
- Pattern cohérent à travers la codebase : le Market engine et les validations lisent la **source**, pas la dérivation

### 2. Interaction avec le price engine

- Le `market-application.mjs` appelle `calculateItemPrice(itemData, marketContext)` qui applique LUI-MÊME les modificateurs de rareté une deuxième fois si nécessaire
- Lire le prix source évite une "double application" de la rareté

### 3. Impact sur les item types

Ce bug affecte **tous les items physiques** (weapon, armor, gear) puisqu'ils implémentent tous :

```javascript
prepareDerivedData() {
  // ...
  this.price = this._preparePrice() // overwrites system.price
}
```

La rareté de l'item amplifie l'erreur. Par exemple, un item avec rareté 2 voit son prix multiplié par 27, ce qui augmente exponentiellement l'erreur de calcul du prix de revente.

### 4. Aucun changement à `sell-valuation.mjs`

La fonction `computeResalePrice()` ne change pas. Elle est pure et reçoit le bon `basePrice` une fois que `validateSale()` est corrigée.

---

## Critères de succès

- [x] Le dialogue de confirmation affiche "Sell for 62 credits" (pas 1687) pour l'item Hydrospanner
- [x] Le test de régression dans `sell-validation.test.mjs` passe
- [x] Les autres tests du Market (inventory, pricing) continuent à passer
- [x] Les logs d'audit enregistrent le bon prix de base (250, pas 6750)
- [x] Aucune régression sur les autres item types (weapon, armor)

---

## Notes d'implémentation

- **Dépendance** : Aucune. Le fix est un changement de _où_ lire la source de données, pas une nouvelle dépendance.
- **Breaking changes** : Non. Les APIs `validateSale()` et `computeResalePrice()` ne changent pas.
- **Performance** : Aucun impact (ajout d'un fallback, pas de boucle/calcul supplémentaire).
- **Localisation** : N/A (données pures).

---

## Fichiers affectés

1. `module/lib/market/sell-validation.mjs` — 1 ligne modifiée (ligne ~82)
2. `tests/lib/market/sell-validation.test.mjs` — 2 tests ajoutés (vérification source price)
3. Aucun autre fichier modifié (validateSale est appelée par #onSellItem qui utilise déjà le résultat)
