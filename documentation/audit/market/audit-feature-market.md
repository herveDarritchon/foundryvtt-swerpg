# Audit technique — Feature Market

> **Périmètre** : système d'achat/vente (Market) du système Foundry VTT `swerpg`.
> **Date** : 2026-06-01
> **Auteur** : Tech Lead (revue de code)
> **Branche revue** : `521-market-valider-les-tests-li18n-et-le-mode-vente-du-negotiationdialog`
> **Objectif** : qualifier l'état de la feature et alimenter la backlog pour les prochaines étapes.

---

## 1. Synthèse exécutive

La feature Market est **mature, bien architecturée et fortement testée** (≈ 4 500 LOC de production, ≈ 7 200 LOC de tests, **696 tests unitaires verts**). La séparation domaine pur / couche adaptateur Foundry prescrite par `CLAUDE.md` est **respectée avec rigueur** : toute la logique métier (pricing, éligibilité, négociation, conséquences, rareté) vit dans `module/lib/market/` sans aucune dépendance Foundry, directement testable.

Cependant, la revue identifie **plusieurs défauts bloquants côté économie de jeu**, dont un **bug critique de calcul de crédits en mode vente** qui casse l'équilibre économique, et **deux contournements de règles** (négociation auto-déclarée, bypass du jet d'achat via le bouton « négocier »). À cela s'ajoute une **déconnexion entre le modèle de données des items et le moteur de disponibilité** qui rend inerte une partie significative de la configuration.

| Axe                  | Note     | Commentaire                                                                  |
| -------------------- | -------- | ---------------------------------------------------------------------------- |
| Fonctionnalité       | 🟠 Moyen | Riche, mais bugs économie + features de config inertes                       |
| Architecture         | 🟢 Bon   | Séparation domaine/adaptateur exemplaire, modules cohérents                  |
| Sécurité / intégrité | 🟠 Moyen | Tout client-side ; jets auto-déclarés ; bypass de contrôle                   |
| Performance          | 🟠 Moyen | Rebuild complet du catalogue à chaque frappe clavier, sans debounce ni cache |
| Qualité de code      | 🟢 Bon   | Lisible, documenté (JSDoc), constantes nommées (ADR-0018) ; quelques smells  |

---

## 2. Cartographie de la feature

### Couche domaine pure — `module/lib/market/` (sans Foundry)

| Module                                             | Rôle                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------------ |
| `pricing.mjs` / `price-engine.mjs`                 | Calcul du prix final (rareté, disponibilité, modificateurs MJ, type de marché) |
| `eligibility.mjs`                                  | Règles d'éligibilité d'un item au marché                                       |
| `market-entry.mjs`                                 | Factory `MarketEntry` + visibilité catalogue                                   |
| `catalog-loader.mjs`                               | Pipeline catalogue (merge sources → éligibilité → dedup)                       |
| `source-resolver.mjs`                              | Filtrage par config active + déduplication                                     |
| `market-visibility.mjs`                            | Visibilité combinée disponibilité × restriction                                |
| `rarity-engine.mjs`                                | Probabilité d'obtention / délai d'approvisionnement                            |
| `negotiation.mjs`                                  | Calcul du prix négocié (achat)                                                 |
| `sell-valuation.mjs` / `sell-validation.mjs`       | Prix et validation de revente                                                  |
| `availability-check.mjs`                           | Spécification du jet de disponibilité obligatoire                              |
| `commerce-outcomes.mjs`                            | Conséquences narratives des dés (avantage/menace/triomphe/désastre)            |
| `consequences.mjs` / `consequence-persistence.mjs` | Conséquences narratives + persistance en flags                                 |
| `market-settings.mjs`                              | Lecture/écriture des settings Foundry (adaptateur fin)                         |
| `location-config.mjs`                              | Configuration par lieu (modificateurs de rareté)                               |

### Couche adaptateur Foundry — `module/applications/market/`

| Module                               | Rôle                                                        |
| ------------------------------------ | ----------------------------------------------------------- |
| `market-application.mjs` (1 142 LOC) | ApplicationV2 principale : catalogue, achat, vente, filtres |
| `negotiation-dialog.mjs`             | Dialogue de négociation (achat et vente)                    |
| `availability-check-dialog.mjs`      | Dialogue + jet `StandardCheck` réel                         |
| `consequences-dialog.mjs`            | Validation des conséquences narratives                      |
| `compendium-source-adapter.mjs`      | Chargement des items de compendium                          |

### Config & UI

- `module/config/market.mjs` — registres figés (types d'items, statuts de disponibilité, types de marché, modificateurs).
- `templates/market/*.hbs` — gabarits.
- `module/applications/settings/market-settings-panel.mjs` — panneau MJ.

---

## 3. Constats détaillés

### 🔴 Critiques (bloquants — à traiter en priorité)

#### C1. Calcul de crédits erroné en mode vente — économie cassée

**Fichier** : `module/applications/market/market-application.mjs:958-1015`

Le modèle de crédits (`character.mjs::_prepareCredits`) est **dérivé** :

```
availableCredits = totalBudget − totalSpent
totalBudget      = startingCredits + obligationBonus + manualAdjustment(system.credits)
totalSpent       = Σ (prix source × quantité) des items physiques possédés
```

L'**achat** ne touche jamais `system.credits` : ajouter l'item augmente `totalSpent`, donc `availableCredits` baisse automatiquement. ✅ Cohérent.

La **vente** fait l'inverse, et incorrectement :

```js
const currentCredits = seller.system.creditBudget.availableCredits // valeur DÉRIVÉE
await seller.deleteEmbeddedDocuments('Item', [item.id]) // → totalSpent baisse → +basePrice auto
const newCredits = currentCredits + finalValuation.resalePrice
await seller.update({ 'system.credits': newCredits }) // écrit DÉRIVÉ dans le champ PERSISTÉ
```

Double faute :

1. La suppression de l'item **rembourse déjà l'intégralité du prix de base** via la baisse de `totalSpent`.
2. On réinjecte `availableCredits` (dérivé) dans `system.credits` (`manualAdjustment`), gonflant `totalBudget`.

**Exemple chiffré** : départ 500, item à 100 acheté → `availableCredits = 400`. Vente à 25 % (resale = 25) :

- `currentCredits = 400` ; suppression → `totalSpent = 0` ; `system.credits = 400 + 25 = 425`.
- Recalcul : `totalBudget = 500 + 425 = 925`, `totalSpent = 0` → **`availableCredits = 925`**.

Vendre un item de 100 (revente 25) fait passer le solde de 400 à **925** (+525 attendu : +25). **Exploit/économie cassée.**

**Correctif** : écrire `system.credits = manualAdjustment_persisté + resalePrice − basePrice` (le `− basePrice` neutralise le remboursement automatique de la suppression), en lisant `seller.system._source?.credits` (valeur persistée) et **non** `availableCredits`. Ajouter un test unitaire sur l'invariant `available_après = available_avant + resalePrice`.

---

#### C2. Le bouton « Négocier » contourne le jet de disponibilité obligatoire

**Fichier** : `market-application.mjs:537-601` vs `613-708`

`#onBuyItem` impose `resolveAvailabilityCheck()` → `AvailabilityCheckDialog` (jet **Streetwise/Negotiation réel** obligatoire pour les items restreints/rares avant achat).
`#onNegotiateItem` **n'exécute aucun jet de disponibilité** : il ouvre directement la négociation puis `#executePurchase`. Comme `negotiationAllowed = true` sur **tous** les types de marché, le bouton « négocier » s'affiche sur **chaque** item, y compris restreints/illégaux. Un joueur évite le jet obligatoire en cliquant « négocier » au lieu de « acheter ».

**Correctif** : appliquer le même `resolveAvailabilityCheck()` dans `#onNegotiateItem`, ou factoriser le contrôle dans `#executePurchase`.

---

#### C3. La négociation est auto-déclarée (pas de jet de dés réel)

**Fichier** : `negotiation-dialog.mjs:225-242`

Le `AvailabilityCheckDialog` lance un vrai `StandardCheck`. À l'inverse, `NegotiationDialog` propose **des champs de saisie manuels** : `successRanks` (input number) et `isDisaster` (checkbox). Le joueur **saisit lui-même son résultat** → il suffit de taper `successRanks = 6` pour obtenir la remise maximale (30 %), ou en mode vente d'atteindre le triomphe (75 %).

Incohérence de conception (un dialogue avec dés réels, l'autre auto-déclaré) **et** faille d'intégrité économique.

**Correctif** : brancher `NegotiationDialog` sur `StandardCheck` (compétence Negotiation/Persuasion/Deception, difficulté déjà dérivée via `rarityToDifficulty`) et dériver `successRanks`/`isDisaster` du résultat réel.

---

### 🟠 Majeurs

#### M1. Le statut de disponibilité (`availability`) n'existe pas dans le modèle de données

**Fichiers** : `module/models/physical.mjs:9-28` vs `config/market.mjs:70-148`

Le schéma `physical` expose : `category, quantity, price, quality, restrictionLevel, encumbrance, rarity, broken, …`. **Aucun champ `availability`.** Or `itemToRawItem` lit `system.availability` (toujours `undefined`) → toutes les entrées retombent sur `DEFAULT_AVAILABILITY = 'available'`.

Conséquences : tout le registre `AVAILABILITY_STATUS` (modificateurs de prix `rare/veryRare/restricted/blackMarket`), le filtrage `allowedAvailability` par type de marché (`standard` est censé masquer `rare`/`veryRare`…) et la détection black-market par disponibilité sont **inertes en pratique**. Seul le **nombre** `rarity` pilote réellement prix/négociation/obtention.

**Décision à acter** : soit ajouter un champ `availability` au schéma item et le mapper, soit dériver l'`availability` depuis `rarity`/`restrictionLevel` dans `itemToRawItem`, soit retirer la dimension `availability` du moteur. Tant que ce n'est pas tranché, une partie de la config est du code mort fonctionnel.

#### M2. La vente détruit la pile entière mais ne crédite qu'une unité

**Fichier** : `market-application.mjs:1013` + `sell-valuation.mjs`

`deleteEmbeddedDocuments('Item', [item.id])` supprime **tout le document** (ex. `quantity = 10`), alors que `computeResalePrice` ne multiplie **pas** par la quantité. Vendre une pile de 10 stimpacks → perte de 9 unités, crédit d'une seule revente. L'achat est aussi mono-unité (`createEmbeddedDocuments` × 1).

**Correctif** : gérer la quantité (décrément + crédit `resale × n`, ou sélecteur de quantité). Idem côté achat.

#### M3. Reconstruction complète du catalogue à chaque frappe clavier

**Fichier** : `market-application.mjs:1082-1088` (+ `#prepareCatalog`)

L'input de recherche appelle `this.render()` à **chaque `input`**. Chaque render relance `#prepareCatalog` : `Array.from(game.items)`, `await loadCompendiumItems()` (parcours de **tous** les packs + `getIndex` par pack), puis éligibilité + dedup + pricing + `validatePurchase` par item. Aucun **debounce**, aucun **cache** du catalogue chargé.

Sur un monde volumineux (beaucoup d'items/compendiums), saisie saccadée. `getIndex` est caché par Foundry après le 1er appel, mais le recalcul domaine complet par frappe reste coûteux.

**Correctif** : charger/mettre en cache le catalogue brut une fois (invalidation sur changement de type de marché ou hooks d'items), debouncer la recherche (~200 ms), ne re-filtrer/re-trier que la vue.

#### M4. Le mode « vente » paie le coût de chargement du catalogue d'achat (et inversement)

**Fichier** : `market-application.mjs:245-253`

`_preparePartContext` calcule **toujours** `#prepareCatalog` (coûteux) **et** `#prepareInventory`, quel que soit `mode`. En mode `sell`, le catalogue d'achat (world + compendiums) est entièrement construit alors que le gabarit ne l'affiche pas.

**Correctif** : ne calculer `catalog` qu'en mode `buy` et `inventory` qu'en mode `sell`.

---

### 🟡 Mineurs

#### m1. Action `changeMarket` morte

`actions.changeMarket` + `#onChangeMarket` sont déclarés (`:177`, `:517`) mais **aucun** `data-action="changeMarket"` dans les gabarits ; le `<select>` est câblé manuellement dans `_onRender`. Code mort → supprimer.

#### m2. Deux paradigmes de câblage d'événements cohabitent

Boutons via la map `actions` (idiomatique AppV2) **vs** filtres/recherche/tri via `addEventListener` manuels dans `_onRender` (`:1063-1141`). Mélange peu maintenable, et chaque listener déclenche un re-render complet. Uniformiser (form/`change` AppV2 ou `data-action`).

#### m3. Source de `rarity` incohérente world vs compendium

`itemToRawItem` lit `system.rarity` (**dérivé**, post-`prepareDerivedData`) pour les items du monde, tandis que `loadCompendiumItems` lit `system.rarity` de l'**index** (valeur **source**). Pour le prix, `_source.price` est correctement utilisé des deux côtés — mais pas pour la rareté. Risque d'écart de prix entre un même item monde/compendium.

#### m4. Numérotation de commentaires erronée dans `#prepareCatalog`

Les étapes sont numérotées `1,2,3,4,3,4,5,6` (`:377-445`) — doublons « 3 » et « 4 ». Cosmétique, nuit à la lecture.

#### m5. `validateSale` n'interdit pas la vente d'items `broken`

`eligibility.mjs` exclut les items `broken` à l'achat, mais `sell-validation.mjs` ne vérifie pas `broken`. Un item cassé se revend à 25 % plein. Cohérence de règle à trancher (revente décotée ? interdite ?).

#### m6. Perte de focus probable du champ recherche

Le re-render complet par frappe recrée l'input `#market-search`. Selon la préservation de focus d'AppV2, le curseur peut sauter. À vérifier (lié à M3 : le debounce/cache atténuerait le risque).

#### m7. Settings avancés non câblés au pricing runtime

`readMarketTypeModifiers` / `readMarketGlobalPriceModifier` existent et `calculateItemPrice` accepte `options.typeModifiers`/`globalModifier`, mais `#prepareCatalog` ne les passe pas. Les modificateurs MJ globaux/par type sont donc ignorés à l'affichage. À brancher ou documenter comme non-implémenté.

---

## 4. Points forts à préserver

- **Séparation domaine/adaptateur exemplaire** : `module/lib/market/` est 100 % pur, sans `game`/`CONFIG`/`Hooks`, testable sans mock.
- **Constantes nommées partout** (conforme ADR-0018) : aucun magic number/string métier dans la logique.
- **Robustesse défensive** : `try/catch` systématiques, fallbacks permissifs, validations de types (`Number.isFinite`), logger centralisé (jamais de `console.*`).
- **Couverture de tests forte** : 696 tests verts, dont l'intégration achat/conséquences côté application.
- **Pricing traçable** : `breakdown`/`modifiers` documentent chaque étape de calcul.
- **i18n** : clés `MARKET.*` cohérentes, pas de chaînes en dur, attributs ARIA présents dans les gabarits.

---

## 5. Backlog proposée

> Priorisation : **P0** = bloquant économie/intégrité, **P1** = important, **P2** = amélioration.

| ID     | Titre                                                                                                                           | Prio   | Type       | Effort | Réf. |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- | ------ | ---- |
| MKT-01 | Corriger le calcul de crédits en vente (lire `manualAdjustment` persisté, neutraliser le remboursement auto) + test d'invariant | **P0** | bug        | M      | C1   |
| MKT-02 | Appliquer le jet de disponibilité dans le flux « négocier » (anti-bypass)                                                       | **P0** | bug        | S      | C2   |
| MKT-03 | Brancher `NegotiationDialog` sur un vrai `StandardCheck` (supprimer la saisie manuelle)                                         | **P0** | bug/sécu   | M      | C3   |
| MKT-04 | Trancher la dimension `availability` : champ schéma vs dérivation vs retrait                                                    | **P1** | conception | M      | M1   |
| MKT-05 | Gérer la quantité en achat **et** vente (crédit `resale × n`, décrément de pile)                                                | **P1** | bug        | M      | M2   |
| MKT-06 | Cache + debounce du catalogue (ne recharger world/compendiums qu'au besoin)                                                     | **P1** | perf       | M      | M3   |
| MKT-07 | Ne préparer `catalog`/`inventory` que selon le `mode` actif                                                                     | **P1** | perf       | S      | M4   |
| MKT-08 | Brancher les modificateurs MJ globaux/par type au pricing d'affichage                                                           | **P1** | feature    | S      | m7   |
| MKT-09 | Supprimer l'action morte `changeMarket`                                                                                         | **P2** | nettoyage  | XS     | m1   |
| MKT-10 | Uniformiser le câblage d'événements (AppV2 form/`data-action`)                                                                  | **P2** | refactor   | M      | m2   |
| MKT-11 | Aligner la source de `rarity` (source vs dérivé) world/compendium                                                               | **P2** | bug        | S      | m3   |
| MKT-12 | Trancher la revente d'items `broken` dans `validateSale`                                                                        | **P2** | conception | S      | m5   |
| MKT-13 | Corriger la numérotation des commentaires de `#prepareCatalog`                                                                  | **P2** | cosmétique | XS     | m4   |
| MKT-14 | Vérifier/garantir la préservation du focus de la recherche                                                                      | **P2** | UX         | S      | m6   |

---

## 6. Recommandation

Avant toute **nouvelle** fonctionnalité Market, traiter le lot **P0 (MKT-01 à 03)** : ce sont des défauts d'intégrité économique exploitables, indépendants du contenu narratif déjà livré. Les **P1** (en particulier M1 — `availability`) conditionnent la cohérence du moteur de prix/visibilité et devraient être arbitrés avant d'étendre les types de marché ou les lieux. L'architecture sous-jacente est saine et n'exige **aucune refonte** : les correctifs sont localisés.
</content>
</invoke>
