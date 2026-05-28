# Plan : Fix Bug NaN Credits (totalSpent & availableCredits)

## Bug symptôme

UI affiche `−NaN` pour "Spent on Items" et `NaN` pour "Available Balance" :

```html
<div class="line total-spent">
  <span>Spent on Items:</span>
  <span class="value">−NaN</span>
</div>
<div class="line available">
  <span>Available Balance:</span>
  <span class="value">NaN</span>
</div>
```

Les autres champs sont corrects (Starting: 500, Total Budget: 500).

## Cause racine

### Problème 1 — `credit-calculator.mjs` ligne 43

L'opérateur `??` (nullish coalescing) ne protège que contre `null`/`undefined`, **pas contre `NaN`** :

```javascript
const totalSpent = ownedItems.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1), 0)
```

Si un item a `item.price = NaN` (ce qui peut arriver lors de la préparation des données si `_preparePrice()` échoue), le calcul devient :

```
NaN ?? 0 = NaN   // ← ?? ne filtre pas NaN
NaN * 1 = NaN    // ← multiplication par NaN
0 + NaN = NaN    // ← sum devient NaN
totalBudget - NaN = NaN  // ← availableCredits devient NaN
```

### Problème 2 — `character.mjs` ligne 374–379

La méthode `_prepareCredits()` lit `item.system.price` **après** que `prepareDerivedData()` de l'item ait été exécuté. Dans `prepareDerivedData()` des items physiques (weapon, armor, gear) :

```javascript
prepareDerivedData() {
  // ...
  this.price = this._preparePrice()  // ← écrase item.system.price avec une valeur dérivée
}
```

Si `_preparePrice()` rencontre une rareté `undefined` :

```javascript
_preparePrice() {
  const rarity = this.rarity
  if (rarity < 0) return Math.floor(this.price / Math.abs(rarity - 1))
  else return this.price * Math.pow(rarity + 1, 3)  // ← si rarity=undefined : * Math.pow(NaN, 3) = NaN
}
```

Résultat : `item.system.price = NaN` est transmis à `computeCreditBudget()`.

## Steps

### 1. Fortifier `module/lib/credits/credit-calculator.mjs`

Remplacer la fonction entière par une version défensive.

**Nouveau helper `toSafeNumber(value, fallback = 0)`** :

- Coerce value en nombre
- Retourne value si `Number.isFinite(value) && value >= 0`
- Retourne fallback sinon
- Protège contre NaN, Infinity, négatifs, null, undefined, non-nombres

**Modifications dans `computeCreditBudget()`** :

- Sanitiser `startingCredits` via `toSafeNumber()`
- Sanitiser `obligationBonusCredits` via `toSafeNumber()`
- Sanitiser `manualAdjustment` avec `Number.isFinite()` (accepte les négatifs)
- Dans le reduce itemSpent : sanitiser chaque `item.price` et `item.quantity` via `toSafeNumber()`
- Ajouter typage et garantie : **aucun champ du résultat ne doit être NaN**

**Retours garantis** :

```javascript
{
  startingCredits,      // always finite >= 0
  obligationBonus,      // always finite >= 0
  manualAdjustment,     // always finite (peut être <0)
  totalBudget,          // always finite
  totalSpent,           // always finite >= 0
  availableCredits,     // always finite
  isOverBudget,         // always boolean
}
```

### 2. Améliorer `module/models/character.mjs` ligne 374–379

Lire le **prix source schema** (avant transformation) au lieu du prix derived.

Remplacer :

```javascript
const ownedItems = this.parent.items
  .filter((item) => ['weapon', 'armor', 'gear'].includes(item.type))
  .map((item) => ({
    price: item.system.price ?? 0,
    quantity: item.system.quantity ?? 1,
  }))
```

Par :

```javascript
const ownedItems = this.parent.items
  .filter((item) => ['weapon', 'armor', 'gear'].includes(item.type))
  .map((item) => ({
    price: item.system._source?.price ?? item.system.price ?? 0,
    quantity: item.system._source?.quantity ?? item.system.quantity ?? 1,
  }))
```

**Rationale** :

- `_source` = données schema brutes (non transformées par `prepareDerivedData()`)
- Si `_source` n'existe pas, fallback sur `system.price` (qui sera sanitisé par le calculator)
- Cela lit le **prix d'achat original**, pas le prix scaled par rareté

### 3. Ajouter tests robustes dans `tests/lib/credits/credit-calculator.test.mjs`

Ajouter 7 nouveaux tests **avant** la fermeture du `describe` :

**Test 1 — NaN price** :

- Input : `ownedItems: [{ price: NaN, quantity: 1 }, { price: 100, quantity: 1 }]`
- Expect : `totalSpent = 100`, `availableCredits = 400` (NaN est traité comme 0)
- Vérifie : `Number.isFinite(availableCredits)` = true

**Test 2 — NaN quantity** :

- Input : `ownedItems: [{ price: 200, quantity: NaN }]`
- Expect : `totalSpent = 200`, `availableCredits = 300` (NaN qty → fallback 1)

**Test 3 — undefined price and quantity** :

- Input : `ownedItems: [{ price: undefined, quantity: undefined }]`
- Expect : `totalSpent = 0`, `availableCredits = 500`

**Test 4 — negative price** :

- Input : `ownedItems: [{ price: -100, quantity: 1 }]`
- Expect : `totalSpent = 0`, `availableCredits = 500` (négatif → 0)

**Test 5 — null/undefined items in array** :

- Input : `ownedItems: [null, undefined, { price: 100, quantity: 1 }]`
- Expect : `totalSpent = 100`, `availableCredits = 400`

**Test 6 — Infinity price** :

- Input : `ownedItems: [{ price: Infinity, quantity: 1 }]`
- Expect : `totalSpent = 0`, `availableCredits = 500` (Infinity → 0)

**Test 7 — Never returns NaN** (comprehensive fuzz) :

- Input : Multiple bad-input combinations (NaN all fields, undefined all fields, string values, empty objects)
- Expect : **All** result fields must be `Number.isFinite()` = true
- Loop tests avec assertions strictes sur chaque champ

### 4. Ajouter validation dans `_prepareCredits()` (optionnel mais recommandé)

Ajouter un guard check en début de `_prepareCredits()` pour log des warnings si NaN détecté :

```javascript
logger.warn(
  `[SwerpgCharacter] _prepareCredits - item with NaN price detected for ${this.parent.name}`,
  ownedItems.filter((i) => !Number.isFinite(i.price)),
)
```

Cela aide au debug des items mal formés qui auraient des prix NaN.

## Validation strategy

### Suite de tests existantes

- `pnpm test tests/lib/credits/credit-calculator.test.mjs` → tous les tests passent (existants + 7 nouveaux)
- `pnpm test tests/models/character-thresholds.test.mjs` → vérifier que le fix ne casse rien
- `pnpm test` complet → zéro régression

### Inspection manuelle UI

1. Créer un nouveau personnage (ou en ouvrir un existant)
2. Vérifier la sheet : credits summary affiche des nombres finites (pas NaN)
3. Ajouter un item avec prix au personnage via drag & drop
4. Vérifier que "Spent on Items" décroît correctement
5. Vérifier que "Available Balance" = Total Budget − Spent

## Success Criteria

- [ ] `credit-calculator.mjs` a une function `toSafeNumber()` protégeant contre NaN/Infinity/négatifs
- [ ] `computeCreditBudget()` sanitise tous les inputs numériques
- [ ] **Invariant** : aucun champ du résultat n'est NaN, Infinity, ou NaN
- [ ] `character.mjs` lit `_source?.price` au lieu du prix derived
- [ ] 7 nouveaux tests couvrent NaN, Infinity, undefined, null, négatifs
- [ ] Test 7 (fuzz) garantit zéro NaN en sortie
- [ ] `pnpm test` : tous les tests passent
- [ ] UI affiche des nombres corrects (pas NaN)

## Edge cases handled

| Input                   | Before                        | After                |
| ----------------------- | ----------------------------- | -------------------- |
| `price: NaN`            | totalSpent → NaN              | totalSpent → 0       |
| `price: Infinity`       | totalSpent → NaN              | totalSpent → 0       |
| `price: -100`           | totalSpent → -100 (incorrect) | totalSpent → 0       |
| `price: undefined`      | totalSpent → NaN              | totalSpent → 0       |
| `quantity: NaN`         | calc error                    | qty fallback to 1    |
| `manualAdjustment: NaN` | budget → NaN                  | manualAdjustment → 0 |

## Technical debt notes

- **Future** : Ajouter validation schema pour `SwerpgPhysicalItem.price` et `.quantity` afin de garantir que `_source` ne contient jamais NaN
- **Future** : Renforcer `_preparePrice()` pour être défensif contre rarity undefined
- **Consider** : Ajouter un linter rule : "PAS DE NaN/Infinity EN SCHEMA" (static analysis)

## Files modified

1. `module/lib/credits/credit-calculator.mjs` — Helper + sanitisation
2. `module/models/character.mjs` — Read \_source.price
3. `tests/lib/credits/credit-calculator.test.mjs` — 7 nouveaux tests
