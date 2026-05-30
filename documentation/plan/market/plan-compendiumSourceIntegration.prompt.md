# Plan : Intégration des sources Compendium dans le Market

## Objectif

Le Market ne charge actuellement que les items du monde (`game.items`). Ce plan étend le pipeline de données pour résoudre les items depuis les **compendiums Foundry** (`game.packs`) en plus des items du monde, en respectant la configuration des sources activées (`readMarketConfig`) et la stratégie de déduplication existante. Le but est de réaliser la **Phase 3 du cadrage métier** (sources configurables) et rendre le Market exploitable avec des données importées via OggDude.

## Contexte & motivation

### État actuel

- `MarketApplicationV2.#prepareCatalog()` itère uniquement `game.items` (items du monde)
- Les items des compendiums Foundry ne sont pas visibles dans le catalogue marchand
- Le système de configuration (enabledSources, allowedItemTypes, dedupStrategy) existe mais n'est appliqué qu'aux items du monde
- Les importations OggDude créent souvent des items dans des compendiums, qui restent invisibles au Market

### Blocages et risques

1. **Incompletude du catalogue** : Le Market parle uniquement des items du monde personnalisés, pas du contenu officiel/importé
2. **Mélange de deux data flows** : Monde vs. Packs, sans normalisation commune ni déduplication
3. **Configuration partielle** : `readMarketConfig()` n'a aucun effet si aucune source compendium n'est scannée
4. **Performance** : Charger tous les documents compendium peut être coûteux — optimisation requise

### Approche recommandée

Créer un **adapter Foundry** qui résout les items depuis les packs selon la configuration, puis lever les items monde et compendium dans une **fonction domaine pure** qui applique les règles métier (éligibilité, déduplication, contexte de prix). Cette approche respecte la séparation pure domaine / adapter Foundry.

## Étapes d'implémentation

### 1. Créer [`module/lib/market/catalog-loader.mjs`](module/lib/market/catalog-loader.mjs)

**Responsabilité** : Fonction pure domaine qui agrège les items du monde et des compendiums, applique les règles de normalisation et déduplication.

**Signature** :

```javascript
/**
 * Load the complete Market catalogue from world and compendium sources.
 *
 * Deep domain function: pure logic, no Foundry dependencies.
 * Handles eligibility, deduplication, and price calculation.
 *
 * @param {Object} options
 * @param {Array<RawItem>} options.worldItems         Raw items from game.items or fallback
 * @param {Array<RawItem>} options.compendiumItems    Raw items from game.packs, with sourceType/sourceId
 * @param {import('../../config/market.mjs').MarketConfig} options.config  Market runtime config
 * @param {Partial<import('../../config/market.mjs').MarketContext>} options.marketContext  Price context
 * @returns {import('./market-entry.mjs').MarketEntry[]}  Eligible, deduplicated, priced entries
 */
export function loadMarketCatalog({ worldItems, compendiumItems, config, marketContext }) {
  // 1. Merge sources with proper source type tagging
  const allRawItems = [
    ...worldItems.map((item) => ({ ...item, _sourceType: 'world' })),
    ...compendiumItems.map((item) => ({ ...item, _sourceType: 'compendium' })),
  ]

  // 2. Create market entries
  const entries = allRawItems
    .map((rawItem) => {
      try {
        return createMarketEntry(rawItem, { sourceType: rawItem._sourceType, sourceId: rawItem._sourceId ?? '' }, marketContext)
      } catch (err) {
        // Non-purchasable type: skip
        return null
      }
    })
    .filter(Boolean)

  // 3. Filter by active config (enabledSources, allowedItemTypes)
  const filtered = filterByActiveConfig(entries, config.enabledSources, config.allowedItemTypes)

  // 4. Deduplicate per strategy
  const deduplicated = filterDuplicates(filtered, config.dedupStrategy)

  return deduplicated
}
```

**Points clés** :

- Accepte `worldItems` et `compendiumItems` comme arrays de `RawItem[]`
- Chaque item est étiqueté avec `_sourceType` et `_sourceId` avant normalisation
- Applique `createMarketEntry` → `filterByActiveConfig` → `filterDuplicates` dans l'ordre
- N'a aucune dépendance Foundry — 100% testable avec des mocks d'objet

### 2. Créer [`module/applications/market/compendium-source-adapter.mjs`](module/applications/market/compendium-source-adapter.mjs)

**Responsabilité** : Adapter Foundry qui itère les packs, charge les items achetables, les normalise en `RawItem[]` avec métadonnées source.

**Signature** :

```javascript
import { PURCHASABLE_ITEM_TYPES } from '../../config/market.mjs'
import { logger } from '../../utils/logger.mjs'

/**
 * Load all purchasable items from Foundry compendium packs.
 *
 * Iterates game.packs, filters Item-type packs, loads index or documents,
 * and converts each to a RawItem with sourceType='compendium' and sourceId=<pack-collection>.
 *
 * No eligibility checks here — that is done by the domain layer.
 *
 * @returns {Promise<Array<RawItem>>} Array of raw items from packs, ready for domain processing
 */
export async function loadCompendiumItems() {
  const compendiumItems = []
  const purchasableTypes = Object.keys(PURCHASABLE_ITEM_TYPES)

  for (const pack of game.packs) {
    // 1. Filter to Item packs only
    if (pack.documentName !== 'Item') continue

    // 2. Try to load via index first (cheaper than getDocuments)
    let documents = []
    try {
      // Foundry v14+ supports getIndex with fields option
      const index = await pack.getIndex({
        fields: ['name', 'img', 'type', 'system.price', 'system.rarity', 'system.restrictionLevel', 'system.quality', 'system.availability'],
      })
      documents = Array.from(index.values())
    } catch (err) {
      logger.warn(`[Market] Could not load index from pack "${pack.collection}": ${err.message}`)
      continue
    }

    // 3. Filter by purchasable type and normalize
    for (const doc of documents) {
      if (!purchasableTypes.includes(doc.type)) continue

      compendiumItems.push({
        uuid: doc.uuid ?? '',
        name: doc.name ?? '',
        img: doc.img ?? '',
        type: doc.type,
        basePrice: doc.system?.price ?? 0,
        rarity: doc.system?.rarity ?? 0,
        quality: doc.system?.quality ?? '',
        restrictionLevel: doc.system?.restrictionLevel ?? '',
        availability: doc.system?.availability ?? undefined,
        nonPurchasable: false, // Packs don't expose item flags easily; use eligibility rules instead
        broken: false,
        _sourceId: pack.collection, // Pack collection ID for dedup + UI reference
      })
    }
  }

  logger.debug('[Market] Loaded compendium items', { count: compendiumItems.length })
  return compendiumItems
}
```

**Points clés** :

- Utilise `pack.getIndex()` avec champs limités (optimisation pour les gros packs)
- Filtre uniquement par type achetable ; les règles d'éligibilité seront appliquées côté domaine
- Chaque item reçoit un `_sourceId` (collection pack) pour identification
- Gestion d'erreur gracieuse : skip le pack sur erreur, continue
- Logs de débogage pour instrumentation

### 3. Modifier [`module/applications/market/market-application.mjs`](module/applications/market/market-application.mjs) — `#prepareCatalog`

**Changement clé** : Remplacer la boucle `game.items` manuelle par un chemin qui charge world + compendium et passe à la fonction domaine.

**Avant** :

```javascript
#prepareCatalog(buyer = null, buyerCredits = null) {
  const activeMarketType = this._viewState.activeMarketType ?? DEFAULT_MARKET_TYPE

  // 1. Build all eligible entries from game.items, using active market type for price calculation
  const allEntries = []
  const marketContext = { ...DEFAULT_MARKET_CONTEXT, marketType: activeMarketType }
  for (const item of game.items) {
    try {
      const rawItem = itemToRawItem(item)
      const entry = createMarketEntry(rawItem, { sourceType: 'world', sourceId: item.uuid ?? '' }, marketContext)
      if (!entry.eligible) continue
      allEntries.push(entry)
    } catch (err) {
      logger.debug(`[Market] Skipping item "${item.name}" (type="${item.type}"): ${err.message}`)
    }
  }
  // ... rest of pipeline ...
}
```

**Après** :

```javascript
async #prepareCatalog(buyer = null, buyerCredits = null) {
  const activeMarketType = this._viewState.activeMarketType ?? DEFAULT_MARKET_TYPE
  const marketContext = { ...DEFAULT_MARKET_CONTEXT, marketType: activeMarketType }
  const marketConfig = readMarketConfig('swerpg')

  // 1. Load world items
  const worldItems = Array.from(game.items).map(item => itemToRawItem(item))

  // 2. Load compendium items (async)
  let compendiumItems = []
  try {
    compendiumItems = await loadCompendiumItems()
  } catch (err) {
    logger.warn('[Market] Could not load compendium items', err)
  }

  // 3. Delegate to domain loader (handles eligibility, dedup, config)
  let allEntries
  try {
    allEntries = loadMarketCatalog({
      worldItems,
      compendiumItems,
      config: marketConfig,
      marketContext,
    })
  } catch (err) {
    logger.error('[Market] Catalog loading failed', err)
    allEntries = []
  }

  // 4. Apply market-type visibility rules (hide items whose availability is not allowed in this market)
  const visibleEntries = allEntries.filter((entry) => {
    const { visible } = resolveMarketCatalogVisibility(entry, activeMarketType)
    return visible
  })

  // ... rest of pipeline unchanged (search, filters, sort, annotate, etc.) ...
}
```

**Points clés** :

- Make `#prepareCatalog` async pour supporter `loadCompendiumItems()`
- Normaliser world items via `itemToRawItem` (existant)
- Appeler `loadCompendiumItems()` (nouveau) pour packs
- Passer les deux arrays au domaine via `loadMarketCatalog` (nouveau)
- Gestion d'erreur non-bloquante pour chaque étape

### 4. Ajouter le filtre par `restrictionLevel` dans le template [`templates/market/market.hbs`](templates/market/market.hbs)

**Contexte** : Le `viewState` et les filtres métier existent déjà, mais le template manque le sélecteur `filterRestriction` dans la toolbar.

**Ajouter dans la section `<div class="market-toolbar__filters">` (après filterSource)** :

```handlebars
<label for="market-filter-restriction" class="sr-only">{{localize "MARKET.Toolbar.Filter.RestrictionLabel"}}</label>
<select id="market-filter-restriction" class="market-toolbar__filter market-toolbar__filter--restriction" aria-label="{{localize 'MARKET.Toolbar.Filter.RestrictionLabel'}}">
  {{#each restrictionFilterOptions as |opt|}}
    <option value="{{opt.value}}" {{#if (eq opt.value ../viewState.filterRestriction)}}selected{{/if}}>
      {{localize opt.label}}
    </option>
  {{/each}}
</select>
```

**Dans `market-application.mjs` — ajouter la fonction builder** :

```javascript
/**
 * Build the list of restriction filter options.
 * First entry is the "all restrictions" placeholder.
 * @returns {Array<{value: string, label: string}>}
 */
#buildRestrictionFilterOptions() {
  const allOption = { value: '', label: 'MARKET.Toolbar.Filter.AllRestrictions' }
  // Hardcoded restrictions or scanned from catalogue data
  const restrictionOptions = [
    { value: 'restricted', label: 'MARKET.Restriction.Restricted' },
    { value: 'illegal', label: 'MARKET.Restriction.Illegal' },
    { value: 'licensed', label: 'MARKET.Restriction.Licensed' },
  ]
  return [allOption, ...restrictionOptions]
}
```

**Exposer dans `_preparePartContext`** :

```javascript
context.restrictionFilterOptions = this.#buildRestrictionFilterOptions()
```

### 5. Écrire les tests unitaires

#### 5a. [`tests/lib/market/catalog-loader.test.mjs`](tests/lib/market/catalog-loader.test.mjs)

Tester la fonction domaine en isolation avec des mocks d'objet (pas de Foundry).

```javascript
import { describe, test, expect } from 'vitest'
import { loadMarketCatalog } from '../../../module/lib/market/catalog-loader.mjs'
import { DEFAULT_MARKET_CONFIG, DEFAULT_MARKET_CONTEXT } from '../../../module/config/market.mjs'

describe('loadMarketCatalog', () => {
  test('merges world and compendium items into a single catalogue', () => {
    const worldItems = [{ uuid: 'world.1', name: 'Blaster', type: 'weapon', basePrice: 500, rarity: 0 }]
    const compendiumItems = [{ uuid: 'pack.1', name: 'Rifle', type: 'weapon', basePrice: 1000, rarity: 1, _sourceId: 'swerpg.weapons' }]

    const result = loadMarketCatalog({
      worldItems,
      compendiumItems,
      config: DEFAULT_MARKET_CONFIG,
      marketContext: DEFAULT_MARKET_CONTEXT,
    })

    expect(result).toHaveLength(2)
    expect(result.map((e) => e.name)).toEqual(['Blaster', 'Rifle'])
  })

  test('filters by enabledSources config', () => {
    // Config that only allows compendium, not world
    const config = { ...DEFAULT_MARKET_CONFIG, enabledSources: ['compendium'] }
    const worldItems = [{ uuid: 'world.1', name: 'Blaster', type: 'weapon', basePrice: 500 }]
    const compendiumItems = [{ uuid: 'pack.1', name: 'Rifle', type: 'weapon', basePrice: 1000, _sourceId: 'swerpg.weapons' }]

    const result = loadMarketCatalog({
      worldItems,
      compendiumItems,
      config,
      marketContext: DEFAULT_MARKET_CONTEXT,
    })

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Rifle')
  })

  test('deduplicates by prefer-compendium strategy', () => {
    // Same weapon exists in world and compendium
    const worldItems = [{ uuid: 'world.1', name: 'Blaster', type: 'weapon', basePrice: 500 }]
    const compendiumItems = [{ uuid: 'pack.1', name: 'Blaster', type: 'weapon', basePrice: 500, _sourceId: 'swerpg.weapons' }]

    const result = loadMarketCatalog({
      worldItems,
      compendiumItems,
      config: DEFAULT_MARKET_CONFIG,
      marketContext: DEFAULT_MARKET_CONTEXT,
    })

    expect(result).toHaveLength(1)
    expect(result[0].sourceType).toBe('compendium') // Prefer compendium
  })

  test('skips ineligible items', () => {
    const worldItems = [{ uuid: 'world.1', name: 'Broken Blaster', type: 'weapon', basePrice: 100, broken: true }]

    const result = loadMarketCatalog({
      worldItems,
      compendiumItems: [],
      config: DEFAULT_MARKET_CONFIG,
      marketContext: DEFAULT_MARKET_CONTEXT,
    })

    expect(result).toHaveLength(0)
  })
})
```

#### 5b. [`tests/applications/market/compendium-source-adapter.test.mjs`](tests/applications/market/compendium-source-adapter.test.mjs)

Tester l'adapter Foundry avec un mock de `game.packs`.

```javascript
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { setupFoundryMock, teardownFoundryMock, addPacksMock } from '../../helpers/mock-foundry.mjs'
import { loadCompendiumItems } from '../../../module/applications/market/compendium-source-adapter.mjs'

describe('loadCompendiumItems', () => {
  beforeEach(() => setupFoundryMock())
  afterEach(() => teardownFoundryMock())

  test('loads items from Item-type packs', async () => {
    addPacksMock({
      'swerpg.weapons': {
        documentName: 'Item',
        collection: 'swerpg.weapons',
        documents: [
          { id: 'w1', name: 'Blaster', type: 'weapon', system: { price: 500, rarity: 0 } },
          { id: 'w2', name: 'Rifle', type: 'weapon', system: { price: 1000, rarity: 1 } },
        ],
      },
    })

    const result = await loadCompendiumItems()

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Blaster')
    expect(result[1]._sourceId).toBe('swerpg.weapons')
  })

  test('filters by purchasable item types', async () => {
    addPacksMock({
      'swerpg.weapons': {
        documentName: 'Item',
        documents: [
          { id: 'w1', name: 'Blaster', type: 'weapon' },
          { id: 't1', name: 'Talent', type: 'talent' }, // Should be skipped
        ],
      },
    })

    const result = await loadCompendiumItems()

    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('weapon')
  })

  test('skips non-Item packs', async () => {
    addPacksMock({
      'swerpg.weapons': {
        documentName: 'Item',
        documents: [{ id: 'w1', name: 'Blaster', type: 'weapon' }],
      },
      'swerpg.actors': {
        documentName: 'Actor',
        documents: [{ id: 'a1', name: 'NPC', type: 'character' }],
      },
    })

    const result = await loadCompendiumItems()

    expect(result).toHaveLength(1)
  })

  test('handles pack load errors gracefully', async () => {
    addPacksMock({
      'swerpg.weapons': {
        documentName: 'Item',
        documents: [{ id: 'w1', name: 'Blaster', type: 'weapon' }],
      },
    })

    // Simulate pack.getIndex() error
    vi.spyOn(game.packs._values[0], 'getIndex').mockRejectedValueOnce(new Error('Mock error'))

    const result = await loadCompendiumItems()

    expect(result).toHaveLength(0) // Skip the failing pack, continue
  })
})
```

### 6. Mettre à jour les clés i18n

#### En [`lang/en.json`](lang/en.json)

```json
{
  "MARKET.Toolbar.Filter.RestrictionLabel": "Restriction Level",
  "MARKET.Toolbar.Filter.AllRestrictions": "All Restrictions",
  "MARKET.Restriction.Restricted": "Restricted",
  "MARKET.Restriction.Illegal": "Illegal",
  "MARKET.Restriction.Licensed": "Licensed"
}
```

#### En [`lang/fr.json`](lang/fr.json)

```json
{
  "MARKET.Toolbar.Filter.RestrictionLabel": "Restriction",
  "MARKET.Toolbar.Filter.AllRestrictions": "Tous",
  "MARKET.Restriction.Restricted": "Restreint",
  "MARKET.Restriction.Illegal": "Illégal",
  "MARKET.Restriction.Licensed": "Licencié"
}
```

## Considérations avancées

### 1. Optimisation du chargement des compendiums

**Problème** : Charger tous les documents compendium peut être coûteux pour les gros packs.

**Solution V1 (recommandée pour cette issue)** :

- Utiliser `pack.getIndex()` avec champs limités (`fields: [...]`)
- **Limitation** : Foundry v14+ doit supporter `getIndex({ fields: [...] })`. Si non supporté, passer à `pack.getIndex()` sans options, puis mapper les champs.
- Fallback : charger via `pack.getDocuments()` seulement si nécessaire pour les packs non-indexés.

**Solution V2 (future)** :

- Ajouter un setting "Packs à scanner pour le Market" → seulement charger les packs explicitement activés
- Utiliser un cache invalidé via hook `updateCompendium`

### 2. Gestion des items avec des UUIDs brisés

**Problème** : Si un item compendium est supprimé après indexation, son UUID est mort.

**Solution** :

- Les items non résolus ne peuvent pas être achetés (pas d'UUID valide)
- Le filtre optionnel "missing-uuid" pourrait être exposé plus tard
- Pour V1 : accepter les UUIDs tels quels, les achats en lire les erreurs

### 3. Comportement de déduplication

La déduplication `prefer-compendium` est la stratégie par défaut et logique :

- Un item compendium "officiel" supplante un item world "maison" du même nom/type
- Permet la mise à jour centralisée via re-import OggDude

**Cas limites** :

- Item compendium nommé "Blaster", item world aussi nommé "Blaster" → compendium gagne
- Deux compendiums différents avec "Blaster" → dépend de l'ordre d'itération `game.packs` (deterministic mais non garanti)

### 4. Asynchronicité de `#prepareCatalog`

**Changement clé** : `#prepareCatalog` devient async (attendait le chargement compendium).

**Impact** :

- `_prepareContext` appelle déjà `#prepareCatalog` via `await`
- Tous les usages doivent attendre la Promise
- Les tests doivent être async

## Définition de « done »

Cette issue est complète quand :

1. ✅ `module/lib/market/catalog-loader.mjs` existe, charge world+compendium, applique config/dedup
2. ✅ `module/applications/market/compendium-source-adapter.mjs` existe, charge items packs efficacement
3. ✅ `MarketApplicationV2.#prepareCatalog()` utilise les deux sources, respecte config
4. ✅ Template `market.hbs` inclut sélecteur `filterRestriction` qui fonctionne
5. ✅ Tests unitaires passent pour catalog-loader + source-adapter
6. ✅ Clés i18n ajoutées (en.json + fr.json)
7. ✅ Le Market affiche les items du monde ET les items compendium côte à côte
8. ✅ Déduplication fonctionne (prefer-compendium par défaut)
9. ✅ Logs + debug info actifs ([Market] logs visibles en debug mode)

## Dépendances & références

- [`feature-market-cadrage-metier.md`](../../cadrage/market/feature-market-cadrage-metier.md) — Vision métier Phase 3
- [`module/config/market.mjs`](../../module/config/market.mjs) — Config, enums
- [`module/lib/market/eligibility.mjs`](../../module/lib/market/eligibility.mjs) — Eligibility rules
- [`module/lib/market/market-entry.mjs`](../../module/lib/market/market-entry.mjs) — MarketEntry factory
- [`module/lib/market/source-resolver.mjs`](../../module/lib/market/source-resolver.mjs) — Dedup strategies
- [`module/applications/market/market-application.mjs`](../../module/applications/market/market-application.mjs) — Main app (to modify)
- Foundry VTT v14 API : `game.packs`, `pack.getIndex()`, `pack.getDocuments()`
