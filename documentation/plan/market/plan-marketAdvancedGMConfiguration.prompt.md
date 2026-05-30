# Plan d'Implémentation — Phase 9 — Configuration avancée & panneau de contrôle MJ du Market

**Statut**: Planned  
**Version**: 1.0  
**Date de création**: 2026-05-30  
**Responsable**: SWERPG Dev Team  
**Portée**: Fournir aux MJ une interface complète pour configurer les sources, types achetables, exclusions manuelles, et modificateurs de prix du Market  
**Lié à**: Issue #481 (Phase 8 rareté contextuelle par lieu)

---

## 1. Executive Summary

L'issue #482 vise à **donner aux MJ le contrôle total sur la configuration du Market** via une interface dédiée intégrée aux settings du monde Foundry.

### État actuel

- Phases 0–8 ✅ complètes (catalogue, filtres, pricing, achat, marchés contextualisés, négociation, conséquences, rareté locale)
- Configuration backend ✅ existe (`market-settings.mjs`, registres `PURCHASABLE_ITEM_TYPES`, `SOURCE_TYPES`, `MARKET_TYPES`)
- **Gap identifié** : Aucune UI d'administration MJ — configuration doit être faite via console ou JSON
- Impact : MJ ne peut pas facilement gérer les sources, types visibles, ou exclusions manuelles en table

### Objectif principal

Créer un **Market Settings Panel** permettant au MJ de :

1. **Gérer les sources** : configurer quels packs/sources sont scrutés par le Market
2. **Gérer les types achetables** : autoriser/refuser weapon, armor, gear sélectivement
3. **Exclure des items manuellement** : marquer items spécifiques comme « non achetables »
4. **Appliquer des modificateurs globaux** : modifier le prix de base de toutes les armes, armures, etc.
5. **Configurer les marchés locaux** : définir les rareté-modifiers par planète/lieu
6. **Tester le catalogue** : aperçu en temps réel des items visibles après filtres appliqués

### Bénéfices

- ✅ MJ en contrôle sans technicité
- ✅ Prévention d'items non-désirés dans le catalogue
- ✅ Flexibilité narrative (marché local pauvre vs riche)
- ✅ Débogage et diagnostic facile du Market
- ✅ Meilleure expérience de jeu immersive via configuration contextuelle

---

## 2. Vision et Principes Métier — Phase 9

### 2.1 Principes directeurs (du cadrage métier, section 4.4)

1. **Le MJ doit garder le contrôle** : jamais d'automatisation obligatoire ou invisible
2. **Configuration = propositions système, pas ordres** : le MJ voit ce qui est proposé, valide ou ajuste
3. **Configurations persistantes** : enregistrées en settings monde, pas en session
4. **Pas de couplage à une seule vue** : la configuration doit affecter le Market où qu'il soit ouvert
5. **Diagnostic et auditabilité** : l'UI montre ce qui a été filtré et pourquoi

### 2.2 Modèle de configuration cible

```javascript
// Existing: module/config/market.mjs → DEFAULT_MARKET_CONFIG
// + new: Market Settings Panel UI stores per-world

MarketWorldConfig = {
  enabledSources: ['compendium', 'world'], // Source types actifs
  allowedItemTypes: ['weapon', 'armor', 'gear'], // Types achetables
  dedupStrategy: 'prefer-compendium', // Résolution des doublons

  // NEW in Phase 9:
  excludedItemIds: ['item-uuid-1', 'item-uuid-2'], // Items explicitement exclus
  typeModifiers: {
    // Modifiers globaux par type
    weapon: { priceModifier: 0.1 }, // +10% armes
    armor: { priceModifier: -0.05 }, // -5% armures
  },

  locationConfigs: {
    // Rareté par lieu
    'Mos Eisley': {
      planetId: 'Tatooine',
      preferredMarketType: 'standard',
      rarityModifiers: { weapon: +1, armor: 0 },
    },
    'Core Worlds': {
      regionId: 'Noyau',
      preferredMarketType: 'standard',
      rarityModifiers: { weapon: -1 },
    },
  },

  lastUpdated: '2026-05-30T12:00:00Z',
}
```

### 2.3 Architecture UI cible

**Location** : Foundry World Settings → System → Market

**Pages/Sections** :

1. **Sources & Types** (tab)
   - Checkboxes : enabledSources (compendium, world)
   - Checkboxes : allowedItemTypes (weapon, armor, gear)
   - Select : dedupStrategy (prefer-compendium, prefer-newest, keep-all)

2. **Prix & Modificateurs** (tab)
   - Table : type → priceModifier (% or + value)
   - Global price modifier input

3. **Exclusions manuelles** (tab)
   - Search/filter itemIds
   - Button "Add excluded item" → open item searcher
   - List of excluded items with delete button

4. **Lieux & Rareté contextuelle** (tab)
   - List of configured locations
   - Edit location : name, planetId, regionId, rarityModifiers per type
   - Add/delete location buttons

5. **Aperçu & Diagnostic** (tab)
   - Button "Scan Market" → shows current visible items count
   - Button "Export config as JSON"
   - Button "Reset to defaults"

---

## 3. Architecture Technique — Phase 9

### 3.1 Fichiers existants

```javascript
module/lib/market/market-settings.mjs
  ← readMarketConfig()         ✅ Lis settings
  ← registerMarketSettings()   ✅ Enregistre settings
  ← Doit être étendu pour nouvelles clés

module/config/market.mjs
  ← PURCHASABLE_ITEM_TYPES     ✅
  ← SOURCE_TYPES               ✅
  ← DEFAULT_MARKET_CONFIG      ✅
  ← Doit exposer constantes pour panel
```

### 3.2 Fichiers à créer

```javascript
// NEW:
module/applications/settings/market-settings-panel.mjs
  ← ApplicationV2 pour l'UI
  ← Onglets : sources, prix, exclusions, lieux, diagnostic

module/lib/market/location-config.mjs
  ← Logique métier pour gérer locations & rareté contextuelle
  ← Validation, defaults, persistence

tests/applications/settings/market-settings-panel.test.mjs
  ← Tests UI save/load
  ← Tests validation config

tests/lib/market/location-config.test.mjs
  ← Tests métier lieux
```

### 3.3 Settings nouvelles

```javascript
// module/lib/market/market-settings.mjs → Ajouter:

export const SETTING_MARKET_EXCLUDED_ITEMS = 'marketExcludedItems'
export const SETTING_MARKET_TYPE_MODIFIERS = 'marketTypeModifiers'
export const SETTING_MARKET_LOCATION_CONFIGS = 'marketLocationConfigs'
export const SETTING_MARKET_GLOBAL_PRICE_MOD = 'marketGlobalPriceModifier'

export function registerMarketSettingsPhase9() {
  game.settings.register(systemId, SETTING_MARKET_EXCLUDED_ITEMS, {
    name: 'SWERPG.SETTINGS.MARKET_EXCLUDED_ITEMS_NAME',
    hint: 'SWERPG.SETTINGS.MARKET_EXCLUDED_ITEMS_HINT',
    scope: 'world',
    config: false, // ← Config via panel, not checkboxes
    type: String,
    default: JSON.stringify([]),
  })
  // ... register other settings
}

export function readMarketExcludedItems(systemId) {
  const raw = game.settings.get(systemId, SETTING_MARKET_EXCLUDED_ITEMS)
  return JSON.parse(raw ?? '[]')
}

export async function writeMarketExcludedItems(systemId, items) {
  return game.settings.set(systemId, SETTING_MARKET_EXCLUDED_ITEMS, JSON.stringify(items))
}
```

### 3.4 Integration existante

```javascript
// module/applications/market/market-application.mjs
// Utilise readMarketConfig() → ajouter readMarketExcludedItems() check

// module/lib/market/catalog-loader.mjs
// Ajouter filtre exclusions:

function loadMarketCatalog({ worldItems, compendiumItems, config, marketContext, excludedIds }) {
  const allRawItems = [
    ...worldItems.map((item) => ({ ...item, _sourceType: 'world' })),
    ...compendiumItems.map((item) => ({ ...item, _sourceType: 'compendium' })),
  ].filter((item) => !excludedIds.includes(item.uuid))
  // ... rest of logic
}
```

---

## 4. Étapes d'implémentation

### Phase 9.1 — Scaffold Settings Panel + Sources & Types

**Objectif** : Créer la classe ApplicationV2 du panel settings avec les deux premiers onglets (sources, types).

| Task   | Description                                             | Priority |
| ------ | ------------------------------------------------------- | -------- |
| TASK-1 | Créer `market-settings-panel.mjs` class ApplicationV2   | High     |
| TASK-2 | Implémenter onglet "Sources & Types" (checkboxes)       | High     |
| TASK-3 | Implémenter onglet "Diagnostic" (scan + export)         | High     |
| TASK-4 | Ajouter bouton settings depuis Market ou system startup | High     |
| TASK-5 | Tests unitaires ApplicationV2 basic rendering           | Medium   |

**Success Criteria** :

- ✅ Panel ouvre depuis Foundry settings without error
- ✅ Checkboxes reflect `readMarketConfig()`
- ✅ Click save → stores to settings via `game.settings.set()`
- ✅ Scan button shows current catalogue count

---

### Phase 9.2 — Exclusions manuelles

**Objectif** : Ajouter onglet exclusions + mettre à jour `catalog-loader.mjs` pour les filtrer.

| Task    | Description                                                | Priority |
| ------- | ---------------------------------------------------------- | -------- |
| TASK-6  | Créer `location-config.mjs` domain logic                   | High     |
| TASK-7  | Implémenter onglet "Exclusions manuelles"                  | High     |
| TASK-8  | Ajouter item searcher dialog pour ajouter exclusion        | Medium   |
| TASK-9  | Mettre à jour `catalog-loader.mjs` pour filtrer exclusions | High     |
| TASK-10 | Tests exclusions filtering                                 | High     |

**Success Criteria** :

- ✅ Excluded items ne s'affichent pas dans le Market
- ✅ Add/delete buttons fonctionnent
- ✅ Exclusions persistent après reload

---

### Phase 9.3 — Prix & Modificateurs

**Objectif** : Ajouter onglet modificateurs de prix par type + global.

| Task    | Description                                      | Priority |
| ------- | ------------------------------------------------ | -------- |
| TASK-11 | Implémenter onglet "Prix & Modificateurs"        | High     |
| TASK-12 | Ajouter table type → priceModifier               | High     |
| TASK-13 | Intégrer global modifier dans `price-engine.mjs` | High     |
| TASK-14 | Tests prix engine avec modifiers                 | High     |

**Success Criteria** :

- ✅ +10% armor modifier applique d'augmentation à tous les prix armorure
- ✅ Global -5% applique à tous les items
- ✅ Market affiche prix final correct avec explication

---

### Phase 9.4 — Configuration lieux & rareté contextuelle

**Objectif** : Onglet complet pour gérer rareté par lieu (intégration Phase 8).

| Task    | Description                                        | Priority |
| ------- | -------------------------------------------------- | -------- |
| TASK-15 | Implémenter onglet "Lieux & Rareté"                | High     |
| TASK-16 | Ajouter UI add/edit/delete location                | High     |
| TASK-17 | Intégrer dans Market pour filtre location actuelle | Medium   |
| TASK-18 | Tests location-based rarity filtering              | Medium   |

**Success Criteria** :

- ✅ MJ crée « Mos Eisley » avec weapon +2 rarity
- ✅ Market filtre items selon location active

---

### Phase 9.5 — Tests E2E + Documentation

**Objectif** : Tests complets panel + docs utilisateur.

| Task    | Description                                           | Priority |
| ------- | ----------------------------------------------------- | -------- |
| TASK-19 | E2E tests : open panel → modify config → check Market | High     |
| TASK-20 | Documentation utilisateur (comment configurer Market) | High     |
| TASK-21 | i18n keys pour tous onglets panel                     | High     |
| TASK-22 | Audit et stabilisation                                | Medium   |

---

## 5. Integration Points

### 5.1 ApplicationV2 pattern

```javascript
export default class MarketSettingsPanel extends api.HandlebarsApplicationMixin(api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'market-settings-panel',
    classes: ['swerpg', 'application', 'market-settings-panel'],
    window: {
      title: 'MARKET.Settings.Title',
      minimizable: true,
      resizable: true,
    },
    position: { width: 700, height: 600 },
    form: { submitOnChange: true },
    actions: {
      addExcludedItem: MarketSettingsPanel.#onAddExcludedItem,
      removeExcludedItem: MarketSettingsPanel.#onRemoveExcludedItem,
      scanCatalog: MarketSettingsPanel.#onScanCatalog,
      resetDefaults: MarketSettingsPanel.#onResetDefaults,
    },
  }

  static PARTS = {
    header: { template: 'systems/swerpg/templates/settings/market-header.hbs' },
    tabs: { template: 'systems/swerpg/templates/settings/market-tabs.hbs' },
    sources: { template: 'systems/swerpg/templates/settings/market-sources.hbs' },
    exclusions: { template: 'systems/swerpg/templates/settings/market-exclusions.hbs' },
    prices: { template: 'systems/swerpg/templates/settings/market-prices.hbs' },
    locations: { template: 'systems/swerpg/templates/settings/market-locations.hbs' },
    diagnostic: { template: 'systems/swerpg/templates/settings/market-diagnostic.hbs' },
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    context.config = readMarketConfig(game.system.id)
    context.excludedItems = readMarketExcludedItems(game.system.id)
    context.typeModifiers = readMarketTypeModifiers(game.system.id)
    context.locationConfigs = readMarketLocationConfigs(game.system.id)
    context.purchasableTypes = PURCHASABLE_ITEM_TYPES
    context.sourcesTypes = SOURCE_TYPES
    return context
  }

  async _onSubmitForm(event, form, formData) {
    const pureData = this._processFormData(event, form, formData)
    // Save to settings
    await writeMarketConfig(game.system.id, pureData.config)
    await writeMarketExcludedItems(game.system.id, pureData.excludedItems)
    await writeMarketTypeModifiers(game.system.id, pureData.typeModifiers)
    ui.notifications.info('Market settings saved')
    // Trigger Market refresh if open
    const market = Object.values(ui.windows).find((w) => w.constructor.name === 'MarketApplicationV2')
    if (market) await market.render()
  }

  static async #onAddExcludedItem(event, target) {
    // Open item searcher, then add UUID to excluded list
  }

  static async #onScanCatalog(event, target) {
    // Load catalog with current config, show count
  }
}
```

### 5.2 i18n keys

```json
{
  "MARKET.Settings.Title": "Market Configuration",
  "MARKET.Settings.Tabs.Sources": "Sources & Types",
  "MARKET.Settings.Tabs.Exclusions": "Exclusions",
  "MARKET.Settings.Tabs.Prices": "Price Modifiers",
  "MARKET.Settings.Tabs.Locations": "Locations & Rarity",
  "MARKET.Settings.Tabs.Diagnostic": "Diagnostic",
  "MARKET.Settings.Sources.EnabledSources": "Enabled Sources",
  "MARKET.Settings.Sources.AllowedTypes": "Allowed Item Types",
  "MARKET.Settings.Exclusions.ManuallyExcluded": "Manually Excluded Items",
  "MARKET.Settings.Exclusions.AddItem": "Add Excluded Item",
  "MARKET.Settings.Prices.TypeModifiers": "Price Modifiers by Type",
  "MARKET.Settings.Prices.Global": "Global Price Modifier (%)",
  "MARKET.Settings.Locations.ConfiguredLocations": "Configured Market Locations",
  "MARKET.Settings.Locations.AddLocation": "Add Location",
  "MARKET.Settings.Diagnostic.ScanCatalog": "Scan Current Catalog",
  "MARKET.Settings.Diagnostic.Export": "Export Configuration",
  "MARKET.Settings.Diagnostic.ResetDefaults": "Reset to Defaults"
}
```

---

## 6. Dependencies

- `module/applications/market/market-application.mjs` — existing, will be updated
- `module/lib/market/catalog-loader.mjs` — update to filter exclusions
- `module/lib/market/price-engine.mjs` — update to apply type modifiers
- `module/lib/market/market-settings.mjs` — extend with new settings keys
- Foundry v14 API : `game.settings`, ApplicationV2, Handlebars templates

---

## 7. Files & Artifacts

### New Files

| File                                                         | Purpose                              |
| ------------------------------------------------------------ | ------------------------------------ |
| `module/applications/settings/market-settings-panel.mjs`     | Main ApplicationV2 panel             |
| `module/lib/market/location-config.mjs`                      | Domain logic for location management |
| `templates/settings/market-header.hbs`                       | Header template                      |
| `templates/settings/market-tabs.hbs`                         | Tabs container                       |
| `templates/settings/market-sources.hbs`                      | Sources & types tab                  |
| `templates/settings/market-exclusions.hbs`                   | Exclusions tab                       |
| `templates/settings/market-prices.hbs`                       | Price modifiers tab                  |
| `templates/settings/market-locations.hbs`                    | Locations & rarity tab               |
| `templates/settings/market-diagnostic.hbs`                   | Diagnostic tab                       |
| `tests/applications/settings/market-settings-panel.test.mjs` | UI tests                             |
| `tests/lib/market/location-config.test.mjs`                  | Domain logic tests                   |

### Modified Files

| File                                                | Changes                                       |
| --------------------------------------------------- | --------------------------------------------- |
| `module/lib/market/market-settings.mjs`             | Add new setting keys + getters/setters        |
| `module/lib/market/catalog-loader.mjs`              | Add excludedIds filter                        |
| `module/lib/market/price-engine.mjs`                | Add type modifiers + global modifier          |
| `module/applications/market/market-application.mjs` | Read excluded items, refresh on config change |
| `module/applications/_module.mjs`                   | Export new MarketSettingsPanel class          |
| `styles/applications.less`                          | Add styles for panel                          |

---

## 8. Testing Strategy

### Unit Tests (Vitest)

- `location-config.test.mjs` : validation, defaults, merging
- `market-settings-panel.test.mjs` : basic ApplicationV2 rendering, data binding

### Integration Tests (Vitest + mock Foundry)

- Settings save/load cycle
- Exclusions filtering in catalog-loader
- Price modifiers applied correctly

### E2E Tests (Playwright)

- Open panel from Market → modify sources → check re-render
- Add excluded item → verify disappears from catalog
- Apply price modifier → verify price changes

---

## 9. Risks & Assumptions

| Risk                                                | Mitigation                                                  |
| --------------------------------------------------- | ----------------------------------------------------------- |
| Configuration complexity overwhelms MJ              | UX-first design with explanatory text and sensible defaults |
| Performance : scanning large catalog for diagnostic | Async scan, progress bar, cache results                     |
| Settings data structure changes                     | Version migrations + fallback to defaults                   |
| Accidentally breaking existing config (Phase 8+)    | Backward-compatibility checks, defaults                     |

---

## 10. Success Criteria

✅ **Functional Requirements** :

- MJ can open Market Settings Panel from Foundry settings
- MJ can enable/disable sources, item types
- MJ can manually exclude specific items (items disappear from Market)
- MJ can apply global & per-type price modifiers (prices reflect changes)
- MJ can configure locations with rarity modifiers (filtered per location)
- MJ can scan catalog and see count of visible items

✅ **Non-Functional Requirements** :

- No console errors or warnings
- Settings persist across reload
- Changes reflect in Market immediately
- Full i18n for all UI strings
- Tests cover 80%+ code paths
- E2E basic workflows passing

✅ **Documentation** :

- User tutorial : how to configure
- Developer API : extending location configs

---

## 11. Related Specifications

- [`feature-market-cadrage-metier.md`](../../cadrage/market/feature-market-cadrage-metier.md) — Section 4.4 « Le MJ doit garder le contrôle »
- [`feature-market-cadrage-metier.md`](../../cadrage/market/feature-market-cadrage-metier.md) — Section 7.2 « Sources configurables »
- [`plan-marketAdvancedRarityContextualization.prompt.md`](./plan-marketAdvancedRarityContextualization.prompt.md) — Phase 8 location configs
- Foundry VTT v14 Settings API : https://foundryvtt.com/api/
- ApplicationV2 reference : https://foundryvtt.com/api/classes/client.applications.ApplicationV2.html

---

## 12. Suggestions de raffinement (optional)

1. **Settings synchronisation multi-joueurs** : considérer `updateWorldTime` hook pour refesh Market si config change par autre MJ client
2. **Presets configurés** : « Standard Galactic », « Coruscant Core », « Outer Rim Low Tech »
3. **Audit trail** : log des modifications de config (qui, quand, quoi changé)
4. **Templated location configs** : templates maritimes/désertiques/urbains avec presets
5. **Market locale override** : allow player à surcharger via flag « current location » pendant session
