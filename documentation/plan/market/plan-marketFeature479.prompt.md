# Plan d'Implémentation — Market Feature Issue #479

**Statut**: Draft  
**Version**: 1.0  
**Date de création**: 2026-05-30  
**Responsable**: SWERPG Dev Team  
**Portée**: Implémentation complète de la fonctionnalité Market pour Star Wars Edge RPG (Foundry VTT v14+)

---

## 1. Executive Summary

L'issue #479 vise à implémenter une **fonctionnalité de marché galactique** permettant aux joueurs et MJs de consulter, filtrer, valoriser, et acheter des items dans un contexte immersif et contrôlable.

**Objectif principal**: Fournir une interface centralisée de commerce qui respecte les règles métier de Star Wars Edge RPG (crédits, disponibilité, rareté, contextes légaux/illégaux, prix dynamiques).

**Bénéfices**:

- Accès rapide au catalogue d'items achetables en table
- Control MJ sur la disponibilité et les prix
- Économie galactique cohérente et crédible
- Immersion narrative renforcée par les marchés contextualisés

---

## 2. Vision et Principes Métier

### 2.1 Principes directeurs

1. **Le marché n'affiche pas tous les items** : Seuls les items "achetables" (type et données adéquates) sont visibles.
2. **Le prix final dépend du contexte** : Rareté + disponibilité + type de marché + modificateurs MJ.
3. **Le MJ garde le contrôle** : Masquage, restriction, surclassement d'availability/prix par le MJ.
4. **Expérience immersive** : Terminal marchand galactique, badges narratifs, statuts légaux, marché noir.
5. **Découpage par phases** : Livrer progressivement (catalogue → filtres → prix → achat → marchés contextualisés → négociation).

### 2.2 Types d'items achetables (Phase initiale)

- `weapon` (armes)
- `armor` (armures)
- `gear` (équipement général)

_À traiter ultérieurement_: véhicules, droïdes, services, modification, réparation.

### 2.3 Sources de données

- **World**: Items du monde Foundry (`game.items`)
- **Compendium**: Items issus des packs compilés (`game.packs`)

---

## 3. Architecture Technique

### 3.1 Structure code existante

```
module/
  lib/market/
    eligibility.mjs              ← Règles d'éligibilité (pur)
    pricing.mjs                  ← Calcul prix (pur)
    price-engine.mjs             ← Moteur prix avancé
    source-resolver.mjs          ← Résolution sources
    market-entry.mjs             ← Value object MarketEntry
    catalog-loader.mjs           ← Chargement catalogue complet
    purchase.mjs                 ← Validation achat (pur)
    negotiation.mjs              ← Pricing négociation
    rarity-engine.mjs            ← Calcul rareté/obtentabilité
    consequences.mjs             ← Conséquences narratives
    market-settings.mjs          ← Config système

  applications/market/
    market-application.mjs       ← UI ApplicationV2
    compendium-source-adapter.mjs ← Adapter sources Foundry → domaine
    negotiation-dialog.mjs       ← Dialog négociation
    consequences-dialog.mjs      ← Dialog conséquences

  config/market.mjs              ← Constantes (ADR-0018): PURCHASABLE_ITEM_TYPES, AVAILABILITY_STATUS, MARKET_TYPES, etc.

tests/
  lib/market/                    ← Tests unitaires domaine
  config/market.test.mjs         ← Tests contractuels constants

templates/market/
  market.hbs                     ← Template UI principal
  negotiation-dialog.hbs         ← Dialog négociation
  consequences-dialog.hbs        ← Dialog conséquences
```

### 3.2 Patterns architecturaux

- **Domaine pur** (`module/lib/market/`): Zéro dépendance Foundry, tous les calculs sont déterministes et testables.
- **Adapter layer** (`module/applications/market/`): Charge les données Foundry, les convertit en formes métier, appelle le domaine, applique les résultats à l'UI.
- **Value objects**: `MarketEntry` encapsule un item normalisé + prix calculé + éligibilité.
- **Configuration centraliée**: `module/config/market.mjs` = source unique de vérité pour les énumérations (ADR-0018).

### 3.3 Flux de données (Simplified)

```
Foundry (world items + packs)
        ↓
compendium-source-adapter.mjs (extraction)
        ↓
loadMarketCatalog() (domaine)
        ├─ createMarketEntry() per item
        ├─ evaluateEligibility()
        ├─ calculateItemPrice()
        └─ filterDuplicates()
        ↓
MarketEntry[] (eligible, priced, deduplicated)
        ↓
MarketApplicationV2._prepareContext()
        ├─ applique filtres UI (search, type, source, restriction)
        ├─ trie (name/price/rarity)
        ├─ calcule disponibilité immédiate
        └─ construit contexte template
        ↓
market.hbs rendu
        ↓
Actions utilisateur (buy/negotiate/etc) → handlers statiques
```

---

## 4. Découpage par Phases et Issues

### Phase 0 — Modèle métier ✅ (Complété)

**Fichiers**:

- `module/config/market.mjs` ✅
- `module/lib/market/eligibility.mjs` ✅
- `module/lib/market/pricing.mjs` ✅

**Ce qui est fait**:

- Définition des types achetables, statuts d'availability, types de marché.
- Règles d'éligibilité (type, nom, prix, source, nonPurchasable, broken).
- Calcul prix de base.

**Critères de succès** ✅:

- Constantes canoniques disponibles.
- Tests contractuels pour éligibilité et pricing.

---

### Phase 1 — Catalogue consultable ✅ (Complété)

**Fichiers**:

- `module/applications/market/market-application.mjs` ✅
- `module/applications/market/compendium-source-adapter.mjs` ✅
- `module/lib/market/catalog-loader.mjs` ✅
- `templates/market/market.hbs` ✅

**Ce qui est fait**:

- Fenêtre Market indépendante (ApplicationV2).
- Chargement items depuis world + compendiums.
- Affichage tableau simple (nom, type, prix, rareté, restriction).
- Intégration depuis feuille personnage (bouton Inventory).

**Critères de succès** ✅:

- Fenêtre ouvrable depuis CharacterSheet.inventory.
- Catalogue chargé sans erreur.
- Items affichés avec format cohérent.

---

### Phase 2 — Recherche et filtres ✅ (Complété)

**Fichiers**:

- `module/applications/market/market-application.mjs` ✅ (filtres UI + handlers)
- `templates/market/market.hbs` ✅

**Ce qui est fait**:

- Recherche par nom (input texte).
- Filtres: type, source, restriction level.
- Tris: nom, prix, rareté.
- Direction tri (asc/desc).
- Filtre "affordable only" (si buyer actif).
- Bouton reset.

**Critères de succès** ✅:

- Tous les filtres réduisent le catalogue correctement.
- Tri fonctionne selon l'ordre choisi.
- UX rapide en table.

---

### Phase 3 — Éligibilité et sources configurables ✅ (Complété)

**Fichiers**:

- `module/lib/market/source-resolver.mjs` ✅
- `module/lib/market/market-settings.mjs` ✅
- `module/config/market.mjs` ✅

**Ce qui est fait**:

- Éligibilité stricte (type ∈ PURCHASABLE, nom non vide, prix fini, source fiable ou override MJ).
- Sources configurables (world, compendium, trusted/untrusted).
- Déduplication par stratégie (prefer-compendium, prefer-world).
- Exclusions manuelles via item.nonPurchasable flag.

**Critères de succès** ✅:

- Catalogue affiche **seulement** les items éligibles.
- MJ peut exclure un item via flag.
- Pas de doublons si item existe en world ET compendium.

---

### Phase 4 — Calcul métier du prix ✅ (Complété)

**Fichiers**:

- `module/lib/market/price-engine.mjs` ✅
- `module/lib/market/rarity-engine.mjs` ✅
- `tests/lib/market/price-engine.test.mjs` ✅

**Ce qui est fait**:

- Prix de base (de item.system.price).
- Modificateurs:
  - Rareté (10% par point, 0–10).
  - Availability (varies par status: available=0%, rare=+20%, etc).
  - Market type (standard=0%, local=-10%, specialized=+25%, black-market=+50%).
  - Modificateur MJ manuel (-100% à +100%).
- Breakdown explicite du calcul (affichage tooltip).
- Calcul déterministe et testé.

**Critères de succès** ✅:

- Prix final = basePrice × (1 + sum(modifiers)).
- Breakdown visible au survol du prix en UI.
- Tous les calculs couverts par tests vitest.

---

### Phase 5 — Achat simple ✅ (Complété)

**Fichiers**:

- `module/lib/market/purchase.mjs` ✅
- `module/applications/market/market-application.mjs` ✅ (#onBuyItem handler)
- Tests unitaires ✅

**Ce qui est fait**:

- Validation pré-achat (buyer exist, crédits suffisants, item eligible).
- Retrait crédits depuis actor.system.creditBudget.availableCredits.
- Ajout item à actor.items (copie indépendante du catalogue).
- Messages success/error (ui.notifications + logger).
- Refresh UI et buyer credits display.

**Critères de succès** ✅:

- Achat impossible si crédits insuffisants (bouton disabled).
- Crédits retirés correctement après achat.
- Item acheté ajouté à l'inventaire du personnage.
- Affichage mis à jour immédiatement.

---

### Phase 6 — Marchés contextualisés ✅ (Complété)

**Fichiers**:

- `module/config/market.mjs` (MARKET_TYPES constant) ✅
- `module/applications/market/market-application.mjs` ✅ (market selector + handler)
- `templates/market/market.hbs` ✅

**Ce qui est fait**:

- 4 market types: `standard`, `local`, `specialized`, `black-market`.
- Chacun avec:
  - Allowed item types (all pour V1).
  - Allowed availability statuses (local=available+common, specialized=rare+veryRare, black-market=restricted+illegal).
  - Price modifier (-10% local, +25% specialized, +50% black-market).
  - UI variant CSS pour visual distinction.
  - Negotiation allowed flag.
- Selector dropdown pour changer market type (en haut de la fenêtre).
- Items filtrés/ré-affichés selon le market choisi.

**Critères de succès** ✅:

- Changement market type met à jour le catalogue instantanément.
- Items restreints cachés sur market standard.
- Prix adapté au market type.
- Ambiance visuelle différente par market (classe CSS).

---

### Phase 7 — Négociation et conséquences narratives ⚡ (Partiellement implémenté)

**Fichiers**:

- `module/lib/market/negotiation.mjs` ✅ Calculs purs
- `module/applications/market/negotiation-dialog.mjs` ✅ Dialog UI
- `module/lib/market/consequences.mjs` ✅ Conséquences pures
- `module/applications/market/consequences-dialog.mjs` ✅ Dialog conséquences
- `templates/market/negotiation-dialog.hbs` ✅
- `templates/market/consequences-dialog.hbs` ✅
- Tests unitaires ✅

**Ce qui est fait**:

- Bouton "Negotiate" affichable par item si negotiable.
- Dialog négociation: affiche skills disponibles, cible difficulté (function de rareté).
- Jet de dés intégré: Deception/Streetwise avec bonus/malus.
- Calcul remise négociée: succès → -10% par succès (max -50%), Disaster → +50% pénalité.
- Dialog conséquences: affiche outcomes (succès/échec), modifications prix, warnings narratifs.
- Conséquences narratives: risque signalement impérial, réputation vendeur, obligations.

**Critères de succès** ⚡:

- Négociation disponible seulement sur market types qui permettent (tous en V1).
- Calcul remise transparent et testé.
- Dialog montre breakdown des modificateurs.
- Conséquences affichées clairement (warning impérial, etc).
- Les conséquences peuvent être attachées au personnage (via flags ou obligations).

---

## 5. État actuel (5 de 7 phases complètes)

| Phase                          | Status      | Remarques                                               |
| ------------------------------ | ----------- | ------------------------------------------------------- |
| 0 — Modèle métier              | ✅ Complete | Constantes, éligibilité, pricing fondamentaux.          |
| 1 — Catalogue consultable      | ✅ Complete | ApplicationV2 full, chargement sources, rendu table.    |
| 2 — Recherche et filtres       | ✅ Complete | Tous les filtres UI + sortes, handlers réactifs.        |
| 3 — Éligibilité avancée        | ✅ Complete | Déduplication, exclusions manuelles, config sources.    |
| 4 — Calcul prix métier         | ✅ Complete | Rareté, availability, market type, MJ override.         |
| 5 — Achat simple               | ✅ Complete | Retrait crédits, ajout inventaire, validation.          |
| 6 — Marchés contextualisés     | ✅ Complete | 4 market types, selector, filtering, price modifier.    |
| 7 — Négociation + conséquences | ⚡ Partial  | Dialogs + calculs pure, manque intégration scènes/PNJs. |

**Travail restant pour issue #479**:

- Polissage et stabilisation Phase 7 (intégration conséquences narratives avancées).
- Ajouts possibles: marchés spécialisés par PNJ, marchés locaux dynamiques, évolution stock.
- Documentation complète (guide utilisateur MJ/joueur).
- Tests E2E Playwright pour workflows complets.

---

## 6. Fichiers cibles et responsabilités

### Couche domaine (module/lib/market/)

| Fichier               | Responsabilité                           | Status |
| --------------------- | ---------------------------------------- | ------ |
| `eligibility.mjs`     | Évaluer si un item est achetable         | ✅     |
| `pricing.mjs`         | Calcul prix final (rareté, availabilité) | ✅     |
| `price-engine.mjs`    | Moteur prix avancé + breakdown           | ✅     |
| `source-resolver.mjs` | Filtre sources, déduplication            | ✅     |
| `market-entry.mjs`    | Value object: item normalisé             | ✅     |
| `catalog-loader.mjs`  | Pipeline chargement complet              | ✅     |
| `market-settings.mjs` | Accès config système                     | ✅     |
| `purchase.mjs`        | Validation achat                         | ✅     |
| `negotiation.mjs`     | Calculs purs négociation                 | ✅     |
| `rarity-engine.mjs`   | Obtainability + supply delay             | ✅     |
| `consequences.mjs`    | Conséquences narratives                  | ✅     |

### Couche adaptateur (module/applications/market/)

| Fichier                         | Responsabilité                   | Status |
| ------------------------------- | -------------------------------- | ------ |
| `market-application.mjs`        | ApplicationV2 UI principale      | ✅     |
| `compendium-source-adapter.mjs` | Extraire items Foundry → RawItem | ✅     |
| `negotiation-dialog.mjs`        | Dialog UX négociation            | ✅     |
| `consequences-dialog.mjs`       | Dialog UX conséquences           | ✅     |

### Config (module/config/market.mjs)

| Partie                   | Status |
| ------------------------ | ------ |
| `PURCHASABLE_ITEM_TYPES` | ✅     |
| `EXCLUDED_ITEM_TYPES`    | ✅     |
| `AVAILABILITY_STATUS`    | ✅     |
| `MARKET_TYPES`           | ✅     |
| `DEFAULT_MARKET_*`       | ✅     |
| `MARKET_CONFIG`          | ✅     |

### UI Templates (templates/market/)

| Template                  | Status |
| ------------------------- | ------ |
| `market.hbs`              | ✅     |
| `negotiation-dialog.hbs`  | ✅     |
| `consequences-dialog.hbs` | ✅     |

### Tests

| Suite                                       | Status          |
| ------------------------------------------- | --------------- |
| `tests/config/market.test.mjs`              | ✅ Contractuels |
| `tests/lib/market/eligibility.test.mjs`     | ✅              |
| `tests/lib/market/pricing.test.mjs`         | ✅              |
| `tests/lib/market/price-engine.test.mjs`    | ✅              |
| `tests/lib/market/purchase.test.mjs`        | ✅              |
| `tests/lib/market/negotiation.test.mjs`     | ✅              |
| `tests/lib/market/consequences.test.mjs`    | ✅              |
| `tests/lib/market/market-entry.test.mjs`    | ✅              |
| `tests/lib/market/source-resolver.test.mjs` | ✅              |
| `tests/lib/market/market-settings.test.mjs` | ✅              |
| `tests/lib/market/catalog-loader.test.mjs`  | ✅              |
| `tests/lib/market/rarity-engine.test.mjs`   | ✅              |

---

## 7. Critères d'acceptation finaux (Issue #479)

### Critères fonctionnels

- [ ] Fenêtre Market ouvrable depuis feuille personnage (Inventory tab → "Open Market" button).
- [ ] Catalogue affiche items elegibles uniquement.
- [ ] Filtres (type, source, restriction, search) réduisent le catalogue correctement.
- [ ] Tris (nom, prix, rareté) appliqués en tableau.
- [ ] Prix final calculé correctement = basePrice × (1 + sum(modifiers)).
- [ ] Achat possible si buyer défini + crédits suffisants.
- [ ] Crédits retirés après achat.
- [ ] Item acheté ajouté à l'inventaire.
- [ ] Négociation disponible sur items negotiable.
- [ ] Négociation calcule remise correctement.
- [ ] Conséquences affichées (warning, risks, etc).
- [ ] Market types (standard/local/specialized/black-market) changent affichage/prix.

### Critères techniques

- [ ] Tous les tests unitaires domaine passent (vitest run).
- [ ] Aucune dépendance Foundry dans `module/lib/market/` (domaine pur).
- [ ] Code suit conventions de projet (logging centralisé, constantes namedées, JSDoc).
- [ ] Pas de magic numbers (ADR-0018).
- [ ] Pas de dépendances externes non autorisées.
- [ ] Performance acceptable + de 1000 items (< 500ms chargement + affichage).

### Critères UX/Immersion

- [ ] UI ressemble à un terminal marchand galactique.
- [ ] Badges narratifs clairs (marché noir, signalement impérial, délai livraison).
- [ ] Prix lisible, breakdown disponible (tooltip).
- [ ] Dialogs négociation/conséquences clairs et intuitifs.
- [ ] Micro-copy immersive (ex: "Marché noir", "Signalement impérial possible").

### Critères MJ

- [ ] MJ peut masquer un item via flag.
- [ ] MJ peut configurer sources actives.
- [ ] MJ peut modifier prix manuellement (override).
- [ ] MJ peut choisir market type pour affecter catalog + prices.

---

## 8. Dépendances et bloqueurs

### Dépendances internes

- ✅ `module/models/` (Item data models) — OK, utilisés par adapter.
- ✅ `module/config/system.mjs` (SYSTEM constants) — OK pour credits.
- ✅ `module/utils/logger.mjs` — OK, utilisé partout.
- ✅ `module/documents/` (Item, Actor documents) — OK, étendus custom.

### Dépendances externes

- ✅ Foundry VTT v14+ API (`ApplicationV2`, `HandlebarsApplicationMixin`, `game.items`, `game.packs`, `game.system.api`).
- ✅ Star Wars FFG rules (crédits, rareté, disponibilité, compétences négociation).

### Bloqueurs potentiels

- **Crédit budget model**: Si le personnage n'a pas `system.creditBudget.availableCredits`, chute à `system.credits` (backward compat OK).
- **Item compendium index**: Si un pack n'expose pas les champs attendus (price, rarity, etc), l'item est ignoré (graceful).
- **Performance large catalogues**: Si > 5000 items, le chargement initial peut être lent → à optimiser avec pagination/lazy loading si nécessaire.

---

## 9. Timeline de réalisation (Estimation)

| Phase                     | Estimation    | Status          |
| ------------------------- | ------------- | --------------- |
| Phase 0                   | ~3 jours      | ✅ Done         |
| Phase 1                   | ~5 jours      | ✅ Done         |
| Phase 2                   | ~3 jours      | ✅ Done         |
| Phase 3                   | ~4 jours      | ✅ Done         |
| Phase 4                   | ~4 jours      | ✅ Done         |
| Phase 5                   | ~3 jours      | ✅ Done         |
| Phase 6                   | ~5 jours      | ✅ Done         |
| Phase 7                   | ~6 jours      | ⚡ ~70%         |
| **Tests E2E + Polissage** | ~5 jours      | 🔄 Planned      |
| **Documentation**         | ~3 jours      | 🔄 Planned      |
| **Total**                 | **~41 jours** | **~80% approx** |

---

## 10. Prochaines étapes (Après issue #479)

### Post-V1 Enhancements

1. **Phase 8** — Marchés spécialisés par PNJ/vendeur (vendeur d'armes, récupérateur, etc).
2. **Phase 9** — Stocks dynamiques (quantité limitée, restock timer).
3. **Phase 10** — Commandes spéciales (délai, rare items, custom prices).
4. **Phase 11** — Intégration événement scène (vendeur au lieu, marché noir à rencontre).
5. **Phase 12** — Économie galactique avancée (prix évoluent selon offre/demande).
6. **Phase 13** — Vente/troc items au marché (vendre à prix inférieur).

---

## 11. Risques et mitigations

| Risque                                        | Probabilité | Sévérité | Mitigation                              |
| --------------------------------------------- | ----------- | -------- | --------------------------------------- |
| Performance avec large catalogue              | Moyen       | Moyen    | Pagination lazy-load si > 1000 items.   |
| Incohérence prix si MJ override multiple fois | Bas         | Bas      | Logger tous les overrides, audit trail. |
| Item non trouvé après achat (UUID cassé)      | Très bas    | Moyen    | Graceful fallback, log warning.         |
| Trop de négociations en parallel = lag        | Bas         | Bas      | Debounce dialog, request rate limiting. |
| Compendium index incomplet                    | Moyen       | Bas      | Default graceful aux champs manquants.  |

---

## 12. Success Metrics

### Metrics métier

- Temps moyen pour trouver + acheter un item: < 30 secondes en table.
- MJ satisfaction: Contrôle sur availability/prix/market types.
- Joueur immersion: Feedback positif sur ambiance market noir/légal/local.

### Metrics techniques

- Test coverage market domain: ≥ 90%.
- Load time catalogue: < 500ms (1000 items).
- No regressions in existing tests.
- No breaking changes in API public.

---

## 13. References et documentations

- **Cadrage métier**: `documentation/cadrage/market/feature-market-cadrage-metier.md`
- **ADR-0018** (No magic numbers): `documentation/architecture/adr/adr-0018-no-magic-numbers-named-constants.md`
- **ADR-0020** (Market eligibility): `documentation/architecture/adr/adr-0020-market-eligibility-static-type-only-no-purchasable-flag.md`
- **Foundry VTT API**: https://foundryvtt.com/api/
- **Star Wars FFG Rules**: Edge of the Empire Core Rulebook

---

## Appendix: Configuration System Settings

Les paramètres MJ configurables (une fois implémentés):

```javascript
// Game settings pour contrôle MJ
game.settings.register('swerpg', 'market-enabled-sources', {
  name: 'MARKET.Settings.EnabledSources.Name',
  hint: 'MARKET.Settings.EnabledSources.Hint',
  scope: 'world',
  config: true,
  type: Object,
  default: { world: true, compendium: true },
})

game.settings.register('swerpg', 'market-allowed-item-types', {
  name: 'MARKET.Settings.AllowedItemTypes.Name',
  hint: 'MARKET.Settings.AllowedItemTypes.Hint',
  scope: 'world',
  config: true,
  type: Object,
  default: { weapon: true, armor: true, gear: true },
})

game.settings.register('swerpg', 'market-dedup-strategy', {
  name: 'MARKET.Settings.DedupStrategy.Name',
  hint: 'MARKET.Settings.DedupStrategy.Hint',
  scope: 'world',
  config: true,
  type: String,
  choices: {
    'prefer-compendium': 'MARKET.Settings.DedupStrategy.PreferCompendium',
    'prefer-world': 'MARKET.Settings.DedupStrategy.PreferWorld',
  },
  default: 'prefer-compendium',
})
```

---

## Appendix: Localization Keys

Clés i18n requises (dans `lang/en.json` et `lang/fr.json`):

```json
{
  "MARKET": {
    "Title": "Galactic Marketplace",
    "ItemType": {
      "Weapon": "Weapon",
      "Armor": "Armor",
      "Gear": "Gear"
    },
    "Availability": {
      "Available": "Available",
      "Common": "Common",
      "Rare": "Rare",
      "VeryRare": "Very Rare",
      "Restricted": "Restricted",
      "BlackMarket": "Black Market"
    },
    "MarketType": {
      "Standard": { "Label": "Standard Market", "Description": "Legal goods, standard availability" },
      "Local": { "Label": "Local Market", "Description": "Common items, local suppliers (-10% price)" },
      "Specialized": { "Label": "Specialized Dealer", "Description": "Rare items, premium price (+25%)" },
      "BlackMarket": { "Label": "Black Market", "Description": "Restricted items, high risk (+50%)" }
    },
    "Catalog": {
      "Empty": "No items available in this market.",
      "EmptySearch": "No items match your search.",
      "Column": {
        "Name": "Item",
        "Type": "Type",
        "Price": "Price",
        "Rarity": "Rarity",
        "Restriction": "Restriction",
        "Buy": "Actions"
      },
      "OpenSheet": "Click to view item details"
    },
    "Toolbar": {
      "Search": { "Label": "Search", "Placeholder": "Search items..." },
      "Filter": {
        "TypeLabel": "Type",
        "SourceLabel": "Source",
        "RestrictionLabel": "Restriction",
        "AffordableOnly": "Affordable only",
        "AffordableOnlyLabel": "Show only items you can afford",
        "AffordableOnlyTooltip": "Filter to items within your credits budget"
      },
      "Sort": {
        "Label": "Sort by",
        "DirectionLabel": "Order",
        "Asc": "Ascending",
        "Desc": "Descending"
      },
      "Reset": { "Label": "Reset", "Tooltip": "Clear all filters and searches" }
    },
    "Price": {
      "BaseLabel": "Base price",
      "FinalLabel": "Final price"
    },
    "Purchase": {
      "BuyButton": "Buy",
      "NegotiateButton": "Negotiate",
      "Success": "Item purchased successfully",
      "Insufficient": "Insufficient credits",
      "Error": "Purchase failed"
    },
    "Badge": {
      "AriaLabel": "Item status badges",
      "ImperialSuspicion": { "Tooltip": "Imperial scrutiny likely" },
      "BlackMarket": { "Tooltip": "Black market item" },
      "ImmediateAccess": { "Tooltip": "Immediate availability" },
      "SupplyDelay": { "Tooltip": "Supply delay", "Days": "days" },
      "Negotiable": { "Tooltip": "Price can be negotiated" }
    }
  }
}
```

---

**Fin du document**
