# Plan d'Implémentation — Issue #481 : Intégration avancée des règles FFG de rareté contextuelle par lieu

**Statut**: Planned  
**Version**: 1.0  
**Date de création**: 2026-05-30  
**Responsable**: SWERPG Dev Team  
**Portée**: Intégration des règles Star Wars FFG pour la rareté contextuelle par lieu, amélioration du calcul de disponibilité dynamique, et optimalisation de l'affordance UX du Market  
**Lié à**: Issue #479 (Market complete phases 0–7), Issue #480 (Phase 7 completion)

---

## 1. Executive Summary

L'issue #481 vise à **appliquer les règles canoniques Star Wars: Edge of the Empire concernant la rareté contextuelle par lieu**, en enrichissant le moteur de prix et d'accessibilité du Market avec une logique métier plus fine et immersive.

**État actuel**:

- Phases 0–7 ✅ complètes (catalogue de base, filtres, prix engine, achat, marchés contextualisés, négociation, conséquences)
- Rareté basique intégrée (AVAILABILITY_STATUS: available, common, rare, veryRare, restricted, blackMarket, unavailable)
- Marchés types définis (standard, local, specialized, black-market)
- **Gap identifié** : Pas de lien entre localisation du personnage (lieu/planète) et rareté relative des items

**Objectif principal** : Introduire un **moteur de rareté contextuelle par lieu** permettant au système de moduler dynamiquement :

1. La **visibilité** des items selon le type de marché local
2. L'**accessibilité** (obtainability probability) basée sur le lieu
3. Le **prix final** selon les combinaisons rareté-lieu-marché-type
4. L'**affordance UX** avec badges "Rare ici", "Introuvable localement", messages contextuels immersifs

**Bénéfices**:

- Intégration authentique des règles FFG (cf. cadrage: section 3-4, Tatooine vs Noyau vs Bordure Extérieure)
- Expérience Star Wars plus crédible et immersive
- Possibilité pour le MJ de configurer des rareté-locale par planète/région
- Préparation pour des futures phases de commerce/cargaison (vente, transport, spéculation)

---

## 2. Vision et Principes Métier — Phase 8

### 2.1 Principes directeurs (FFG-aligned)

1. **Rareté = Difficulté à trouver, pas seulement prix** : La rareté base (0–10 FFG) détermine d'abord la facilité à localiser un vendeur, secondairement le prix.

2. **Rareté relative au lieu** : Un objet courant sur Coruscant peut être rare sur Tatooine. Un blaster commun peut être très rare sous contrôle impérial strict.

3. **Trois composantes indépendantes** :
   - Rareté de base de l'item (FFG 0–10 ou abstrait: common/rare/veryRare)
   - Type de marché local (standard/local/specialized/black-market)
   - Modificateur planétaire/régional (Noyau = -1 rareté, Bordure Ext = +2, Espace Sauvage = +3)

4. **Affordance UX immersive** : L'interface doit expliquer pourquoi un item est cher/rare ici, sans surcharger le joueur.

5. **MJ en contrôle** : Possibilité de configurer des modèles de rareté par lieu (world/planète), pas de calcul magique obligatoire.

### 2.2 Modèle de données cible

#### Market Location Context

```javascript
{
  locationId: 'Mos Eisley',
  planetId: 'Tatooine',
  regionId: 'Outer Rim',

  // Modifiers applied to rarity for ALL items in this market
  rarityModifiers: {
    technology: -1,        // Tech is common here (spaceport)
    weaponry: 0,           // Blasters are normal
    'military-grade': +2,  // Hard to find
    'restricted': +1,      // Still risky
  },

  // Market type may vary by location
  preferredMarketType: 'standard',
  allowedMarketTypes: ['standard', 'local', 'black-market'],

  // Allowed availability statuses for this location
  allowedAvailability: ['available', 'common', 'rare'],

  // Optional: override price modifier for location
  priceModifier: 0,
}
```

#### Item Rarity Mapping

Update item data to store categorical or numeric rarity alongside price.

```javascript
// In item's system data:
{
  price: 500,
  rarity: 'rare',              // or: numeric 0-10

  // Optional: rarity context hints
  rarityCategory: 'military-grade',  // maps to location rarityModifiers

  // Optional: availability in specific markets
  marketAvailability: {
    'Mos Eisley': 'common',
    'Imperial Controlled World': 'very-rare',
    'black-market': 'available',
  },
}
```

### 2.3 Calcul de disponibilité contextuelle

**Formula**:

```
finalRarity = itemBaseRarity
            + locationRarityModifier[itemCategory]
            + marketTypeModifier
            + gmOverride

finalAvailability = mapRarityToAvailability(finalRarity)
finalPrice = basePriceEngine(item, market, context)
           + rarityPriceModifier(finalRarity)
```

**Mapping rarity → availability** (FFG-inspired but abstracted):

- 0–2: `available`
- 3–4: `common`
- 5–6: `rare`
- 7–8: `veryRare`, `restricted`
- 9–10: `blackMarket`, `unavailable`

---

## 3. Scope & Phases

### Phase 8a — Data Model & Config (Task 1–2)

**Objective**: Define and test the location context model, item rarity attributes, and location settings storage.

**Tasks**:

1. **Define MarketLocationContext schema**
   - Add location config document type or extend World/Actors with location flags
   - Store rarityModifiers per category, allowed availability, market type preferences
   - Add UI for MJ to configure location via settings dialog or scene properties

2. **Extend Item data model for rarity**
   - Add `system.rarity` field (categorical: 'common', 'rare', 'veryRare', or numeric 0–10)
   - Add `system.rarityCategory` for location modifier lookup (e.g., 'military-grade', 'technology')
   - Backward compatibility: items without rarity default to 'common'

3. **Write validators and tests**
   - Validate location context schema
   - Test rarity calculation formula
   - Test mapping of rarity → availability

### Phase 8b — Rarity Engine Integration (Task 3–4)

**Objective**: Integrate location-aware rarity into the existing price engine and catalog loader.

**Tasks**:

3. **Create rarityContextualizer.mjs**
   - Function to load current location context (from actor's location flag, scene, or MJ config)
   - Function to apply location modifiers to item rarity
   - Function to map final rarity to availability status
   - Exported for use in price engine, catalog loader, and UI

4. **Update price-engine.mjs & catalog-loader.mjs**
   - Accept `locationContext` parameter
   - Apply location-aware rarity when calculating item prices and filters
   - Update catalog loader to mark items with location-specific availability

5. **Write integration tests**
   - Test price calculation with location modifiers
   - Test availability filtering by location
   - Test edge cases (rarity +10 → clamping, negative rarity → minimum)

### Phase 8c — Market Application UX (Task 5–6)

**Objective**: Update MarketApplicationV2 UI to display location context, rarity explanations, and affordance.

**Tasks**:

5. **Update \_prepareContext() in MarketApplicationV2**
   - Load current location context (actor's world location or MJ override)
   - Pass to catalog preparation
   - Update view state to include `currentLocation`, `locationRarityModifiers`

6. **Enhance market.hbs template**
   - Display current market location ("Mos Eisley Market" or "Standard Spaceport")
   - For each item, show rarity badge with explanation:
     - "Common here" (green)
     - "Rare on this world" (yellow)
     - "Hard to find locally" (orange)
     - "Unavailable here" / "Black market only" (red)
   - On hover/click, display breakdown: "Base rarity: Rare | Tatooine: +1 | Local discount: -1 | Final: Common"
   - Add optional narrator-style micro-copy: _"Blasters are common in Mos Eisley — any spaceport merchant carries them."_

7. **Add location selector (MJ-only)**
   - Control to switch market location from dropdown (e.g., select "Telos IV Hypermarket" vs. "Outer Rim Outpost")
   - Updates view state and refreshes catalog in real time
   - Persist to actor or market session flag

8. **Write E2E tests (Playwright)**
   - Test that market displays correct location
   - Test that rarity badges update when changing location
   - Test that explanation tooltip appears

### Phase 8d — Settings & Configuration UI (Task 7)

**Objective**: Provide MJ interface to configure location rarity profiles.

**Tasks**:

7. **Create location config form (settings dialog)**
   - UI to create / edit / delete location profiles
   - Fields: location name, planet, region, category modifiers (slider -3 to +3 per category)
   - Allowed availability checkboxes
   - Preferred market type selector
   - Save to game settings or world data

8. **Add location presets**
   - Bundled presets for common locations: Tatooine (Outer Rim), Coruscant (Core), Imperial World, Mos Shuuta, etc.
   - MJ can fork/customize presets

9. **Write unit tests for config**
   - Test form validation
   - Test preset loading

### Phase 8e — Documentation & i18n (Task 8)

**Objective**: Document feature for users, add all i18n keys.

**Tasks**:

8. **Add i18n keys for**:
   - Location names and descriptions
   - Rarity badge labels ("Common here", "Rare here", etc.)
   - Rarity explanation popover text
   - Category names ("Military-grade", "Technology", etc.)
   - Market location header UI

9. **Write MJ guide**:
   - Document how to configure location rarity profiles
   - Explain rarity calculation formulas
   - Provide example setups (Tatooine, Core Worlds, Black Markets)

10. **Update Market feature documentation**:
    - Add rarity contextuality as part of Phase 8
    - Highlight FFG alignment

---

## 4. Implementation Details

### 4.1 File Structure

```
module/
  lib/
    market/
      rarity-contextualizer.mjs          (NEW)

      pricing.mjs                        (MODIFY: add locationContext param)
      price-engine.mjs                   (MODIFY: integrate contextualizer)
      catalog-loader.mjs                 (MODIFY: apply location-aware rarity)

  applications/
    market/
      market-application.mjs             (MODIFY: integrate location UI)

  config/
    market.mjs                           (MODIFY: add location presets)

tests/
  lib/
    market/
      rarity-contextualizer.test.mjs     (NEW)
      pricing.test.mjs                   (MODIFY: add location tests)
      price-engine.test.mjs              (MODIFY: add location tests)
      catalog-loader.test.mjs            (MODIFY: add location tests)

e2e/
  regression/
    market-rarity-context.spec.ts        (NEW: E2E tests for location UI)

templates/
  market/
    market.hbs                           (MODIFY: add rarity badges, location header)

lang/
  en.json                                (MODIFY: add i18n keys)
  fr.json                                (MODIFY: add i18n keys)
```

### 4.2 Key Functions (Pseudo-code)

#### rarityContextualizer.mjs

```javascript
/**
 * Load the active market location context for an actor or MJ selection.
 * @param {Actor} actor - The buyer/viewer actor
 * @param {boolean} useActorLocation - Whether to use actor's location flag or MJ override
 * @returns {Promise<MarketLocationContext>}
 */
export async function loadMarketLocationContext(actor, useActorLocation = true) {
  // defaults to DEFAULT_MARKET_LOCATION if not set
}

/**
 * Apply location-specific rarity modifiers to an item rarity.
 * @param {Item}                    item
 * @param {MarketLocationContext}  locationContext
 * @returns {number} finalRarity (clamped 0-10 or mapped to status key)
 */
export function applyLocationRarityModifiers(item, locationContext) {
  const baseRarity = parseItemRarity(item)
  const category = item.system.rarityCategory ?? 'general'
  const categoryModifier = locationContext.rarityModifiers[category] ?? 0
  return Math.min(10, Math.max(0, baseRarity + categoryModifier))
}

/**
 * Map final rarity value to an availability status key.
 * @param {number} finalRarity - 0–10
 * @returns {string} key of AVAILABILITY_STATUS
 */
export function rarityToAvailability(finalRarity) {
  if (finalRarity <= 2) return 'available'
  if (finalRarity <= 4) return 'common'
  // …
}

/**
 * Generate human-readable explanation of rarity breakdown.
 * @param {Item} item
 * @param {MarketLocationContext} locationContext
 * @returns {{ baseRarity, modifiers: {}, finalRarity, finalAvailability, explanation: string }}
 */
export function explainRarityCalculation(item, locationContext) {
  // returns structured data for UI display
}
```

#### pricing.mjs (modified signature)

```javascript
// Before:
export function calculateItemPrice(item, marketContext)

// After:
export function calculateItemPrice(item, marketContext, locationContext) {
  const rarityAdjustment = applyLocationRarityModifiers(item, locationContext)
  // …apply to price calculation…
}
```

#### market-application.mjs (modified)

```javascript
#prepareContext() {
  const locationContext = loadMarketLocationContext(this.buyerActor)
  const catalog = prepareCatalog(this.buyerActor, locationContext)

  return {
    locationContext,
    catalog,
    // …existing…
  }
}

_preparePartContext(partId, context) {
  if (partId === 'catalog') {
    // Enrich each item with rarity explanation
    context.items.forEach(item => {
      item.rarityExplanation = explainRarityCalculation(item.source, context.locationContext)
    })
  }
}
```

### 4.3 FFG Rules Applied

**From cadrage métier (section 3–9)**:

- **Rareté base (0–10)** maps to item system data
- **Dépend du lieu** → locationRarityModifiers by region/planet
- **Affect availability** → not just price (via rarityToAvailability)
- **Tatooine rule**: objects civil de base trouvables facilement, objets militaires/specialisés → scène ou modification de prix
- **Impérial vs Outer Rim**: same object has diff availability/price

---

## 5. Success Criteria

- ✅ Item price calculation incorporates location-aware rarity
- ✅ Catalog dynamically filters/reorders items based on location
- ✅ Market UI displays current location with rarity badges per item
- ✅ Rarity explanation (breakdown) available on hover/click
- ✅ MJ can configure location rarity profiles via settings
- ✅ Location context persists for a market session or actor flag
- ✅ FFG rules (common/rare/very-rare, region modifiers) authentically applied
- ✅ All i18n keys present for EN and FR
- ✅ Unit tests cover rarity calculation, availability mapping, location loading
- ✅ E2E tests cover UI interaction (location switch, badge display, tooltip)
- ✅ Backward compatibility: items without rarity default gracefully

---

## 6. Testing Strategy

### Unit Tests (vitest)

**rarity-contextualizer.test.mjs**:

- `loadMarketLocationContext` returns defaults if not set
- `applyLocationRarityModifiers` clamps rarity to 0–10
- `rarityToAvailability` maps correctly (discrete → continuous)
- `explainRarityCalculation` produces correct breakdown

**pricing.test.mjs** (additions):

- Price calculation with location modifier
- Price with location + market type combo

**catalog-loader.test.mjs** (additions):

- Catalog filters items by location-aware availability
- Deduplication still works with location context

### Integration Tests

- Load location context + apply to price engine
- Render market app with location context
- Switch location in UI, verify catalog updates

### E2E Tests (Playwright)

**market-rarity-context.spec.ts**:

- Open market, verify location header displayed
- Verify rarity badges shown for items
- Click badge, verify explanation tooltip
- MJ switches location dropdown, verify UI re-renders
- Verify prices update when location changes

---

## 7. Risks & Mitigations

| Risk                                      | Mitigation                                                            |
| ----------------------------------------- | --------------------------------------------------------------------- |
| Complex rarity calculation confuses users | Clear UI explanation + micro-copy; optional advanced mode for MJ      |
| Performance lag with many locations       | Memoize location context, lazy-load location config                   |
| Backward compatibility (old items)        | Default rarity = 'common' if missing; graceful degradation            |
| Inconsistent rarity across items          | Provide migration script + audit report for items missing rarity data |
| MJ misconfigures location modifiers       | Validation + presets + in-UI hints (e.g., "Max modifier is +5")       |
| FFG rules misinterpreted                  | Reference cadrage métier section in docstring + MJ guide              |

---

## 8. Dependencies & External Refs

- **FFG Core Rules**: Rarity scale 0–10, context-dependent availability
- **Cadrage métier** (feature-market-cadrage-metier.md): Sections 3–4, 8–10 (rareté, contexte local, impact du type de marché)
- **Existing Market phases**: Phases 0–7 (price engine, catalog, market types, locations)
- **i18n**: `lang/en.json`, `lang/fr.json`
- **Config**: `module/config/market.mjs` (MARKET_TYPES, AVAILABILITY_STATUS)

---

## 9. Next Steps & Future Phases

**Post-Phase 8**:

- **Phase 9** (future): Vente d'objets par PJs (buy-back prices, resale negotiation)
- **Phase 10** (future): Commerce & transport de cargaison (bulk trading, profit margins, supply chains)
- **Phase 11** (future): Dynamic stock management by location (restocking timers, vendor reputation)

---

## 10. Estimated Effort

| Phase       | Tasks | Est. Days | Notes                                |
| ----------- | ----- | --------- | ------------------------------------ |
| 8a (Data)   | 1–2   | 2–3       | Schema design, validation tests      |
| 8b (Engine) | 3–4   | 4–5       | Integration, edge cases              |
| 8c (UX)     | 5–6   | 3–4       | Template updates, E2E tests          |
| 8d (Config) | 7     | 2–3       | Settings UI, presets                 |
| 8e (Docs)   | 8     | 1–2       | i18n, MJ guide, feature doc          |
| **Total**   | 8     | **12–17** | ~2–3 weeks with reviews & refinement |

---

## 11. Comparison with Cadrage & Alignment

**Cadrage phases**:

- Phases 0–7: ✅ Implemented (issues #479, #480)
- Phase 6: Market contextualization ✅ (market types exist)
- **Phase 8 (new)**: Location-aware rarity contextuality (FFG-aligned)

**Why Phase 8 now?**:

1. Phases 0–7 provide solid foundation (catalog, achat, marchés types, négociation)
2. Gap: No connection between item rareté and localisation du personnage
3. FFG cadrage explicitly mentions rareté dépend du lieu (section 3–4, 33–46, Tatooine vs Noyau)
4. Prepares for future phases (vente, commerce, stocks dynamiques)

---

## 12. Checklist for Completion

- [ ] MarketLocationContext schema designed & tested
- [ ] Item rarity field added to models + backward compatibility verified
- [ ] rarityContextualizer.mjs written & tested
- [ ] price-engine.mjs, pricing.mjs integrated with locationContext
- [ ] catalog-loader.mjs respects location-aware availability filters
- [ ] MarketApplicationV2 loads location context & passes to renderers
- [ ] market.hbs updated with rarity badges & explanation UI
- [ ] Location selector (MJ) added & tested
- [ ] Location config form created with presets
- [ ] All i18n keys added (EN, FR)
- [ ] MJ guide written
- [ ] Unit tests pass (vitest)
- [ ] E2E tests pass (Playwright)
- [ ] Feature documentation updated
- [ ] Backward compatibility verified (old items, no location set)
- [ ] Code review completed
- [ ] Merged to `develop` branch
