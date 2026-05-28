# Plan : Modèle métier du Market — éligibilité, types autorisés, sources

## TL;DR

Créer un modèle métier solide et extensible pour le Market dans `module/config/market.mjs` (constantes canoniques) et `module/lib/market/` (logique pure). Le contrat définit les types achetables, les sources autorisées, les statuts d'éligibilité et les règles de prix — tout en restant indépendant de Foundry (`module/lib/`) pour la testabilité. Les consommateurs (UI, adaptateurs) ne reconstruisent jamais les règles eux-mêmes.

---

## Architecture proposée

```
module/config/market.mjs          ← constantes canoniques (ADR-0018)
module/lib/market/
  eligibility.mjs                 ← logique pure: un item est-il éligible ?
  pricing.mjs                     ← logique pure: calcul prix final
  source-resolver.mjs             ← résolution des items depuis les sources
  market-entry.mjs                ← value object MarketEntry (item normalisé)
  index.mjs                       ← barrel export
tests/config/market.test.mjs      ← tests contractuels des constantes
tests/lib/market/
  eligibility.test.mjs
  pricing.test.mjs
  source-resolver.test.mjs
  market-entry.test.mjs
```

---

## Steps

### 1. Créer `module/config/market.mjs` — registre canonique des constantes Market

Définir toutes les constantes métier du Market en suivant le pattern ADR-0018 (comme `armor.mjs`, `items.mjs`, `weapon.mjs`) :

**Types autorisés** (`PURCHASABLE_ITEM_TYPES`) :

```js
export const PURCHASABLE_ITEM_TYPES = Object.freeze({
  weapon: { id: 'weapon', label: 'MARKET.ItemType.Weapon', icon: 'fa-solid fa-gun' },
  armor: { id: 'armor', label: 'MARKET.ItemType.Armor', icon: 'fa-solid fa-shield' },
  gear: { id: 'gear', label: 'MARKET.ItemType.Gear', icon: 'fa-solid fa-toolbox' },
})
```

**Types explicitement exclus** (`EXCLUDED_ITEM_TYPES`) — pour documentation/traçabilité :

```js
export const EXCLUDED_ITEM_TYPES = Object.freeze({
  talent: { id: 'talent', reason: 'progression-only' },
  career: { id: 'career', reason: 'character-creation-only' },
  species: { id: 'species', reason: 'character-creation-only' },
  specialization: { id: 'specialization', reason: 'progression-only' },
  'specialization-tree': { id: 'specialization-tree', reason: 'meta-structure' },
  obligation: { id: 'obligation', reason: 'narrative-only' },
  duty: { id: 'duty', reason: 'narrative-only' },
  motivation: { id: 'motivation', reason: 'narrative-only' },
  'motivation-category': { id: 'motivation-category', reason: 'meta-structure' },
})
```

**Statuts de disponibilité** (`AVAILABILITY_STATUS`) :

```js
export const AVAILABILITY_STATUS = Object.freeze({
  available: { id: 'available', label: 'MARKET.Availability.Available', purchasable: true, priceModifier: 0 },
  common: { id: 'common', label: 'MARKET.Availability.Common', purchasable: true, priceModifier: 0 },
  rare: { id: 'rare', label: 'MARKET.Availability.Rare', purchasable: true, priceModifier: 0.25 },
  veryRare: { id: 'veryRare', label: 'MARKET.Availability.VeryRare', purchasable: false, priceModifier: 0.5 },
  restricted: { id: 'restricted', label: 'MARKET.Availability.Restricted', purchasable: false, priceModifier: 1.0 },
  blackMarket: { id: 'blackMarket', label: 'MARKET.Availability.BlackMarket', purchasable: false, priceModifier: 1.5 },
  unavailable: { id: 'unavailable', label: 'MARKET.Availability.Unavailable', purchasable: false, priceModifier: null },
})
```

**Types de sources** (`SOURCE_TYPES`) :

```js
export const SOURCE_TYPES = Object.freeze({
  compendium: { id: 'compendium', label: 'MARKET.Source.Compendium', trusted: true },
  world: { id: 'world', label: 'MARKET.Source.World', trusted: true },
  import: { id: 'import', label: 'MARKET.Source.Import', trusted: false },
})
```

**Defaults** :

```js
export const DEFAULT_AVAILABILITY = 'available'
export const DEFAULT_SOURCE_TYPE = 'compendium'
export const MIN_PRICE_FOR_ELIGIBILITY = 0
```

Exposer le tout dans `SYSTEM.MARKET` via `system.mjs`.

---

### 2. Créer `module/lib/market/market-entry.mjs` — value object normalisé

Un **MarketEntry** est la représentation canonique d'un item dans le Market. Toute donnée entrante (compendium, monde, import) est normalisée vers cette structure avant d'être consommée.

```js
/**
 * @typedef {Object} MarketEntry
 * @property {string} uuid         Foundry UUID or generated unique ID
 * @property {string} name         Display name
 * @property {string} img          Icon path
 * @property {string} itemType     Canonical item type (key of PURCHASABLE_ITEM_TYPES)
 * @property {string} sourceType   Key of SOURCE_TYPES
 * @property {string} sourceId     Pack/folder/collection identifier
 * @property {number} basePrice    Original price from the item data
 * @property {number} rarity       Rarity score (0–10)
 * @property {string} quality      Quality tier key
 * @property {string} restrictionLevel  Restriction level key
 * @property {string} availability Computed availability status key
 * @property {boolean} eligible    Whether this entry passes all eligibility rules
 * @property {string|null} ineligibilityReason  Machine-readable reason if not eligible
 */

export function createMarketEntry(rawItem, sourceInfo) { ... }
```

Invariants du MarketEntry :

- `name` est toujours un string non vide
- `itemType` est toujours une clé de `PURCHASABLE_ITEM_TYPES`
- `basePrice` est toujours un nombre ≥ 0
- `eligible` est déterministe pour les mêmes inputs

---

### 3. Créer `module/lib/market/eligibility.mjs` — règles d'éligibilité pures

Fonction principale : `evaluateEligibility(item, config)` → `{ eligible, reason }`.

Matrice de décision implémentée :

| Condition                       | eligible | reason                   |
| ------------------------------- | -------- | ------------------------ |
| type non autorisé               | `false`  | `'type-not-purchasable'` |
| nom absent/vide                 | `false`  | `'missing-name'`         |
| prix absent (NaN/null)          | `false`  | `'missing-price'`        |
| source non fiable sans override | `false`  | `'untrusted-source'`     |
| item marqué `nonPurchasable`    | `false`  | `'explicitly-excluded'`  |
| item cassé (`broken: true`)     | `false`  | `'item-broken'`          |
| **Toutes conditions passent**   | `true`   | `null`                   |

La config passée en paramètre contient les `PURCHASABLE_ITEM_TYPES`, `SOURCE_TYPES` et les overrides éventuels. Aucune dépendance Foundry.

---

### 4. Créer `module/lib/market/pricing.mjs` — moteur de prix pur

```js
/**
 * @typedef {Object} PriceContext
 * @property {number} basePrice
 * @property {number} rarity            0–10
 * @property {string} availability      Key of AVAILABILITY_STATUS
 * @property {number} [gmModifier]      Manual override (-100 to +100, percentage)
 * @property {string} [marketType]      Future: 'standard' | 'blackMarket' | 'imperial'
 */

/**
 * @typedef {Object} PriceResult
 * @property {number} finalPrice         Computed final price (integer, ≥ 0)
 * @property {number} basePrice          Original base price
 * @property {Array<{label: string, modifier: number}>} breakdown  Steps
 */

export function computeMarketPrice(context) { ... }
```

Règles V1 :

- `finalPrice = basePrice * (1 + availabilityModifier + rarityModifier + gmModifier/100)`
- `rarityModifier = rarity * 0.1` (10% par point de rareté au-dessus de 0)
- Prix plancher = 0 (pas de prix négatif)
- Arrondi à l'entier inférieur
- Breakdown traçable pour chaque étape

---

### 5. Créer `module/lib/market/source-resolver.mjs` — résolution des sources

```js
/**
 * @typedef {Object} MarketSourceConfig
 * @property {string} id              Unique source identifier
 * @property {string} sourceType      Key of SOURCE_TYPES
 * @property {string} label           Display label
 * @property {boolean} enabled        Whether this source is active
 * @property {string[]} allowedTypes  Which item types this source provides (or '*' for all)
 */

export function resolveMarketSources(sourceConfigs, allSources) { ... }
export function filterDuplicates(entries, strategy = 'prefer-compendium') { ... }
```

Stratégies de déduplication :

- `'prefer-compendium'` — si doublon nom+type, garder la version compendium
- `'prefer-newest'` — garder la plus récente
- `'keep-all'` — pas de déduplication

---

### 6. Exposer dans `SYSTEM.MARKET` et écrire tests contractuels

Dans `module/config/system.mjs` :

- Importer `* as MARKET from './market.mjs'`
- Ajouter `MARKET` dans l'objet `SYSTEM`

Dans `tests/config/market.test.mjs` (pattern ADR-0018 comme `armor.test.mjs`) :

- Vérifier que `PURCHASABLE_ITEM_TYPES` contient au moins `weapon`, `armor`, `gear`
- Vérifier que chaque type exclu a un `reason`
- Vérifier `DEFAULT_AVAILABILITY` est une clé de `AVAILABILITY_STATUS`
- Vérifier freeze/immutabilité
- Vérifier exposition sur `SYSTEM.MARKET.*`

Dans `tests/lib/market/*.test.mjs` :

- Tests d'éligibilité (chaque raison de la matrice)
- Tests de pricing (cas nominal, rareté, GM override, plancher à 0)
- Tests de déduplication

---

## Diagramme de dépendances

```
SYSTEM.MARKET (config/market.mjs)
       │
       ▼
┌──────────────────────────────┐
│  module/lib/market/          │  ← pure domain, no Foundry deps
│  ├── eligibility.mjs         │
│  ├── pricing.mjs             │
│  ├── market-entry.mjs        │
│  └── source-resolver.mjs     │
└──────────────────────────────┘
       │
       ▼ (consumed by)
┌──────────────────────────────┐
│  Foundry adapter layer       │  ← future, hors scope issue #452
│  ├── applications/market/    │
│  └── documents/ (Actor)      │
└──────────────────────────────┘
```

---

## Extensibilité garantie

| Évolution future                           | Impact                                                             |
| ------------------------------------------ | ------------------------------------------------------------------ |
| Ajouter un type achetable (ex: `vehicle`)  | 1 entrée dans `PURCHASABLE_ITEM_TYPES` + retirer de `EXCLUDED`     |
| Ajouter une source (ex: `module-external`) | 1 entrée dans `SOURCE_TYPES`                                       |
| Ajouter un statut (ex: `onOrder`)          | 1 entrée dans `AVAILABILITY_STATUS`                                |
| Marché contextualisé (Phase 6)             | Nouveau param `marketType` dans `PriceContext`                     |
| Négociation (Phase 7)                      | Nouveau modifier dans `computeMarketPrice` breakdown               |
| Règle MJ override par item                 | Flag `nonPurchasable` sur l'item vérifié par `evaluateEligibility` |

---

## Further Considerations

1. **Le modèle `SwerpgPhysicalItem` a déjà `price`, `rarity`, `quality`, `restrictionLevel`** — le Market Entry les lit directement sans duplication. Faut-il ajouter un champ `purchasable` (boolean) au DataModel ou garder un flag séparé sur le document ?

2. **Sources configurées vs scannées** — Le cadrage recommande des sources configurées. L'implémentation prévoit un `MarketSourceConfig` explicite. Veux-tu que la configuration soit un Setting Foundry (géré par le MJ via UI) ou un fichier config statique en V1 ?

3. **Rareté FFG (0–10) vs rareté actuelle** — Le modèle `SwerpgPhysicalItem` a déjà `rarity` (entier ≥ 0). Est-ce la rareté FFG canonique ou une valeur custom ? Ça impacte le coefficient dans `pricing.mjs`.
